// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-20 surface. $RWACu exposes a real burn, which is the
///         whole point — the paper destroys tokens rather than parking them in
///         a dead address that still counts toward supply.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/// @notice Uniswap v3 SwapRouter02, the exact-output entry points only.
interface ISwapRouter02 {
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        returns (uint256 amountIn);

    function exactOutput(ExactOutputParams calldata params)
        external
        payable
        returns (uint256 amountIn);
}

/// @notice Chainlink price feed, the reading half only.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/**
 * @title Newsstand
 * @author mj41, LLC
 * @notice Sells a copy of The Daily Miscellany and burns $RWACu on every sale.
 *
 * @dev The design resolves an awkward fact. 41 $RWACu is the paper's signature
 *      number, but at roughly $0.00000030 a token it is worth about $0.000012 —
 *      far less than the gas required to move it. Pricing the paper in $RWACu
 *      would make it free; pricing it in dollars would abandon the number.
 *
 *      So the two are separated. The reader pays a real price in ETH or an
 *      accepted token, set by the editor. The contract then buys *exactly*
 *      `burnAmount` $RWACu with a sliver of that payment and destroys it. The
 *      remainder goes to the treasury. Every sale burns the same 41 tokens no
 *      matter what was paid, and the burn is provable on-chain forever.
 *
 *      Exact-output swaps are deliberate: an exact-input swap of a few thousand
 *      wei would round to nothing in a thin pool. Asking for exactly 41 tokens
 *      out and letting the router decide the input is the only way to guarantee
 *      the burn is always precisely 41.
 */
contract Newsstand {
    // ─── Immutable wiring ────────────────────────────────────────────────────

    IERC20 public immutable rwacu;
    IWETH public immutable weth;
    ISwapRouter02 public immutable router;

    // ─── Editor-controlled state ─────────────────────────────────────────────

    address public owner;
    address public treasury;

    /// @notice $RWACu destroyed per purchase. 41e18 by default — the signature.
    uint256 public burnAmount;

    /**
     * @notice Cover price in whole US cents. 1 = $0.01.
     * @dev The editor thinks in money, not wei, so the price is stored in money.
     *      A wei price would have to be re-entered every time ETH moved, and the
     *      nameplate would quietly stop matching what readers were charged.
     */
    uint256 public priceUsdCents;

    /// @notice Chainlink ETH/USD. Zero falls back to `fixedPriceWei`.
    address public ethUsdFeed;

    /// @notice How stale a price may be before purchases stop. Default 24h.
    uint256 public maxPriceAge;

    /// @notice Used only when no feed is set. 0 with no feed closes the ETH door.
    uint256 public fixedPriceWei;

    /// @notice Ceiling on what a single burn may cost, so a manipulated pool
    ///         cannot drain a purchase. Denominated in the paid asset.
    uint256 public maxSwapWei;

    /// @notice Fee tier of the WETH/$RWACu pool. 10000 (1%) on Base today.
    uint24 public ethPoolFee;

    struct TokenTerms {
        bool accepted;
        /// @dev Price of one issue in this token's own units.
        uint256 price;
        /// @dev Most of this token spendable on one burn.
        uint256 maxSwapIn;
        /// @dev Uniswap v3 exact-output path, encoded backwards: it starts at
        ///      $RWACu and ends at this token. Storing it per token is what lets
        ///      the editor add a currency without a redeploy — any token with a
        ///      v3 route to $RWACu can be accepted.
        bytes swapPath;
    }

    mapping(address => TokenTerms) public terms;
    address[] private _acceptedTokens;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @dev The readership record. Indexed so the paper can count its own sales
    ///      from chain data rather than trusting a database.
    event Purchased(
        address indexed reader,
        uint256 indexed issueId,
        address indexed paidIn,
        uint256 amountPaid,
        uint256 rwacuBurned,
        uint256 spentOnBurn
    );

    event TokenAccepted(address indexed token, uint256 price);
    event TokenRemoved(address indexed token);
    event PriceChanged(uint256 usdCents, uint256 fixedWei);
    event FeedChanged(address indexed feed);
    event BurnAmountChanged(uint256 burnAmount);
    event TreasuryChanged(address indexed treasury);
    event OwnerChanged(address indexed owner);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error NotOwner();
    error Underpaid(uint256 sent, uint256 required);
    error TokenNotAccepted(address token);
    error ZeroAddress();
    error EthDoorClosed();
    error TreasuryTransferFailed();
    error BurnBudgetTooHigh();
    error StalePrice(uint256 updatedAt);
    error BadPrice();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address _rwacu,
        address _weth,
        address _router,
        address _treasury,
        uint256 _priceWei,
        uint24 _ethPoolFee
    ) {
        if (_rwacu == address(0) || _weth == address(0) || _router == address(0)) {
            revert ZeroAddress();
        }
        if (_treasury == address(0)) revert ZeroAddress();

        rwacu = IERC20(_rwacu);
        weth = IWETH(_weth);
        router = ISwapRouter02(_router);

        owner = msg.sender;
        treasury = _treasury;
        fixedPriceWei = _priceWei;
        ethPoolFee = _ethPoolFee;
        maxPriceAge = 24 hours;

        burnAmount = 41e18;
        // Generous relative to the ~5e9 wei a burn costs today, tight enough
        // that a manipulated pool cannot consume a whole payment.
        maxSwapWei = 1e15;
    }

    // ─── Pricing ─────────────────────────────────────────────────────────────

    /**
     * @notice What one issue costs right now, in wei.
     * @dev With a feed configured the cent price is converted at the live rate,
     *      so "one cent" stays one cent. Reverts rather than guessing if the
     *      oracle has gone stale — charging the wrong price is worse than
     *      briefly refusing to sell.
     */
    function priceWei() public view returns (uint256) {
        if (ethUsdFeed == address(0) || priceUsdCents == 0) return fixedPriceWei;

        (, int256 answer, , uint256 updatedAt, ) = IAggregatorV3(ethUsdFeed).latestRoundData();
        if (answer <= 0) revert BadPrice();
        if (block.timestamp > updatedAt + maxPriceAge) revert StalePrice(updatedAt);

        // cents / 100 dollars, at answer/1e8 dollars per ETH, scaled to wei:
        //   wei = cents * 1e24 / answer
        return (priceUsdCents * 1e24) / uint256(answer);
    }

    // ─── Buying ──────────────────────────────────────────────────────────────

    /**
     * @notice Buy an issue with ETH. Burns `burnAmount` $RWACu, forwards the rest.
     * @param issueId The issue being bought. Recorded in the event, not enforced.
     */
    function buyWithETH(uint256 issueId) external payable {
        uint256 price = priceWei();
        if (price == 0) revert EthDoorClosed();
        if (msg.value < price) revert Underpaid(msg.value, price);

        uint256 budget = maxSwapWei;
        if (budget > msg.value) budget = msg.value;

        // Wrap only the swap budget; the rest never leaves as ETH.
        weth.deposit{value: budget}();
        weth.approve(address(router), budget);

        uint256 spent = router.exactOutputSingle(
            ISwapRouter02.ExactOutputSingleParams({
                tokenIn: address(weth),
                tokenOut: address(rwacu),
                fee: ethPoolFee,
                recipient: address(this),
                amountOut: burnAmount,
                amountInMaximum: budget,
                sqrtPriceLimitX96: 0
            })
        );

        // Clear the allowance and reclaim anything the router did not need.
        weth.approve(address(router), 0);
        if (spent < budget) weth.withdraw(budget - spent);

        rwacu.burn(burnAmount);
        _sweepETH();

        emit Purchased(msg.sender, issueId, address(0), msg.value, burnAmount, spent);
    }

    /**
     * @notice Buy an issue with an accepted ERC-20, such as USDC.
     * @dev The reader must approve this contract for `terms[token].price` first.
     */
    function buyWithToken(address token, uint256 issueId) external {
        TokenTerms memory t = terms[token];
        if (!t.accepted) revert TokenNotAccepted(token);

        IERC20 paid = IERC20(token);
        paid.transferFrom(msg.sender, address(this), t.price);

        uint256 budget = t.maxSwapIn;
        if (budget > t.price) budget = t.price;

        paid.approve(address(router), budget);
        uint256 spent = router.exactOutput(
            ISwapRouter02.ExactOutputParams({
                path: t.swapPath,
                recipient: address(this),
                amountOut: burnAmount,
                amountInMaximum: budget
            })
        );
        paid.approve(address(router), 0);

        rwacu.burn(burnAmount);

        uint256 remainder = paid.balanceOf(address(this));
        if (remainder > 0) paid.transfer(treasury, remainder);

        emit Purchased(msg.sender, issueId, token, t.price, burnAmount, spent);
    }

    // ─── Editor controls ─────────────────────────────────────────────────────

    /// @notice Set the cover price in whole US cents. 1 = $0.01.
    function setPriceUsdCents(uint256 _cents) external onlyOwner {
        priceUsdCents = _cents;
        emit PriceChanged(_cents, fixedPriceWei);
    }

    /// @notice Fallback price used only when no feed is configured.
    function setFixedPriceWei(uint256 _priceWei) external onlyOwner {
        fixedPriceWei = _priceWei;
        emit PriceChanged(priceUsdCents, _priceWei);
    }

    /// @notice Point at a Chainlink ETH/USD feed. Zero reverts to fixed pricing.
    function setEthUsdFeed(address _feed) external onlyOwner {
        ethUsdFeed = _feed;
        emit FeedChanged(_feed);
    }

    function setMaxPriceAge(uint256 _seconds) external onlyOwner {
        maxPriceAge = _seconds;
    }

    function setBurnAmount(uint256 _burnAmount) external onlyOwner {
        burnAmount = _burnAmount;
        emit BurnAmountChanged(_burnAmount);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryChanged(_treasury);
    }

    function setOwner(address _owner) external onlyOwner {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        emit OwnerChanged(_owner);
    }

    function setEthPoolFee(uint24 _fee) external onlyOwner {
        ethPoolFee = _fee;
    }

    /// @dev Guards against setting a budget so large that one burn could eat a
    ///      whole payment if the pool were manipulated.
    function setMaxSwapWei(uint256 _maxSwapWei) external onlyOwner {
        uint256 price = priceWei();
        if (price != 0 && _maxSwapWei > price) revert BurnBudgetTooHigh();
        maxSwapWei = _maxSwapWei;
    }

    /**
     * @notice Accept a token as payment.
     * @param swapPath Uniswap v3 exact-output path, encoded backwards from
     *        $RWACu to this token. For USDC that is
     *        abi.encodePacked(RWACU, uint24(10000), WETH, uint24(500), USDC).
     */
    function acceptToken(
        address token,
        uint256 price,
        uint256 maxSwapIn,
        bytes calldata swapPath
    ) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!terms[token].accepted) _acceptedTokens.push(token);
        terms[token] = TokenTerms({
            accepted: true,
            price: price,
            maxSwapIn: maxSwapIn,
            swapPath: swapPath
        });
        emit TokenAccepted(token, price);
    }

    function removeToken(address token) external onlyOwner {
        delete terms[token];
        uint256 n = _acceptedTokens.length;
        for (uint256 i = 0; i < n; i++) {
            if (_acceptedTokens[i] == token) {
                _acceptedTokens[i] = _acceptedTokens[n - 1];
                _acceptedTokens.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function acceptedTokens() external view returns (address[] memory) {
        return _acceptedTokens;
    }

    // ─── Housekeeping ────────────────────────────────────────────────────────

    /// @dev Nothing should strand here, but a rounding dust sweep costs nothing.
    function sweep(address token) external onlyOwner {
        if (token == address(0)) {
            _sweepETH();
        } else {
            IERC20 t = IERC20(token);
            t.transfer(treasury, t.balanceOf(address(this)));
        }
    }

    function _sweepETH() private {
        uint256 balance = address(this).balance;
        if (balance == 0) return;
        (bool ok, ) = treasury.call{value: balance}("");
        if (!ok) revert TreasuryTransferFailed();
    }

    /// @dev Only for WETH unwrapping. Direct donations are swept to treasury.
    receive() external payable {}
}
