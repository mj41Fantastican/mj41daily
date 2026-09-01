import { NextResponse } from 'next/server';

/**
 * GET /api/copper-prices
 *
 * Reads live copper prices from three on-chain oracles on Base Mainnet.
 *
 * Oracle | Class | Contract
 * -------|-------|----------
 * A      | Spot (COMEX)     | 0x02a0FeE571E63e9a81AE944469deA7207ac56D8f
 * B      | Scrap            | 0x4D54f30dBa2e28c1096aE72745b6f5a29139bb58
 * C      | Industrial       | 0x1d4E108bE284d73fDC0704457D4A4c2A36aC1D4a
 *
 * Encoding discovered by inspecting on-chain bytecode:
 * - Class A: selector 0xa035b1fe → uint256, divide by 1e8 → USD/lb
 * - Class B: selector 0x98d5fdca → (uint256, uint256, uint256), first word / 100 → USD/lb
 * - Class C: selector 0x98d5fdca → (uint256, uint256, uint256), first word / 1e8 → USD/lb
 */

const BASE_RPC = 'https://mainnet.base.org';

const ORACLES = {
  A: { address: '0x02a0FeE571E63e9a81AE944469deA7207ac56D8f', selector: '0xa035b1fe', decimals: 1e8, label: 'Spot (COMEX)', unit: 'USD/lb' },
  B: { address: '0x4D54f30dBa2e28c1096aE72745b6f5a29139bb58', selector: '0x98d5fdca', decimals: 1e2,  label: 'Scrap',       unit: 'USD/lb' },
  C: { address: '0x1d4E108bE284d73fDC0704457D4A4c2A36aC1D4a', selector: '0x98d5fdca', decimals: 1e8, label: 'Industrial',  unit: 'USD/lb' },
} as const;

async function readOracle(address: string, selector: string, decimals: number): Promise<{ price: number; raw: string; timestamp?: number }> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: address, data: selector }, 'latest'],
      id: 1,
    }),
    next: { revalidate: 60 }, // cache for 60s
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const raw: string = json.result;
  // First 32-byte word = first uint256 (big-endian hex)
  const firstWord = raw.slice(2, 66); // strip 0x, take first 64 hex chars
  const value = BigInt('0x' + firstWord);
  // Third word may be timestamp (for 3-return oracles)
  let timestamp: number | undefined;
  if (raw.length >= 2 + 64 * 3) {
    const thirdWord = raw.slice(2 + 64 * 2, 2 + 64 * 3);
    const ts = Number(BigInt('0x' + thirdWord));
    if (ts > 1_000_000_000 && ts < 9_999_999_999) timestamp = ts;
  }
  const price = Number(value) / decimals;
  return { price, raw, timestamp };
}

export async function GET() {
  try {
    const [a, b, c] = await Promise.all([
      readOracle(ORACLES.A.address, ORACLES.A.selector, ORACLES.A.decimals),
      readOracle(ORACLES.B.address, ORACLES.B.selector, ORACLES.B.decimals),
      readOracle(ORACLES.C.address, ORACLES.C.selector, ORACLES.C.decimals),
    ]);

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      prices: {
        A: { label: ORACLES.A.label, price: a.price, unit: ORACLES.A.unit, timestamp: a.timestamp, contract: ORACLES.A.address },
        B: { label: ORACLES.B.label, price: b.price, unit: ORACLES.B.unit, timestamp: b.timestamp, contract: ORACLES.B.address },
        C: { label: ORACLES.C.label, price: c.price, unit: ORACLES.C.unit, timestamp: c.timestamp, contract: ORACLES.C.address },
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('copper-prices error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
