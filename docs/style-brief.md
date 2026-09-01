# Branding Brief

> This file is populated during Phase 2 (Theming) based on user preferences.

## Color Scheme

**Primary**: Pure black and white — ink on newsprint aesthetic
**Accent options (user-selectable themes)**:
- B&W (default): white background, black ink — classic broadsheet
- Purple & White: Farcaster-native purple (#4c1d95) on white
- Inverted: black background, white text — dramatic night edition
- Aged Cream: warm cream (#f5f0e8) with dark brown (#2c1a0e) ink — vintage newspaper

## Visual Style

Classic broadsheet newspaper — serious, editorial, dramatic. Traditional newspaper masthead with:
- Double-rule borders and column dividers
- Serif typography (Georgia / Times New Roman) for all editorial content
- Arial sans-serif for metadata, labels, and UI chrome
- Diamond corner ornaments on the SVG masthead logo
- User-selectable aesthetic via 🎨 picker in the nameplate

**User's Words**: "classic broadsheet", "traditional newspaper logo", "dramatic and classic", "pure black and white by default"

## Additional Notes

- All 4 themes share the same layout — only colors shift
- Theme state lives at the root `MiniApp` level via React Context
- Theme picker (🎨 emoji button) sits in the nameplate's bottom row, visible to all readers
- SVG logo adapts to theme (bg/fg colors passed as props)
- Paywall, locked rows, editor dashboard, archive, and settings all respect the active theme
