# Lichess Arrow Draw - Development Progress

## Overview
This document tracks the development progress of the Lichess userscript for drawing arrows and auto-playing moves.

---

## Merged Pull Requests

### PR #1: Fix arrow coordinates and page load timing
**Merged:** 2025-12-08  
**URL:** https://github.com/reductionfear/lichdrawarrow/pull/1

#### Problem
- Unreliable page load detection using `setTimeout(run, 500)`
- Arrow coordinates didn't match Lichess's SVG viewBox system

#### Changes
- Added `waitForElement()` helper using MutationObserver
  - Waits for `div.puzzle__side__metas` on puzzle pages
  - Waits for `rm6` on game pages
- Fixed `getArrowCoords()` coordinate mapping for viewBox="0 0 8 8" (later corrected in PR #2)

---

### PR #2: Fix arrow drawing - correct viewBox coordinates and SVG element selectors
**Merged:** 2025-12-08  
**URL:** https://github.com/reductionfear/lichdrawarrow/pull/2

#### Problem
- Arrows weren't rendering due to wrong SVG element selectors
- Coordinate system was incorrect (viewBox is actually `-4 -4 8 8`, not `0 0 8 8`)

#### Changes
- **SVG element selectors**: Changed from generic `$('g')[0]` to `$('svg.cg-shapes g')[0]`
- **Coordinate system**: Updated to match viewBox="-4 -4 8 8"
  - Files: a=-3.5, b=-2.5, c=-1.5, d=-0.5, e=0.5, f=1.5, g=2.5, h=3.5
  - Ranks (white): 1=3.5, 2=2.5, 3=1.5, 4=0.5, 5=-0.5, 6=-1.5, 7=-2.5, 8=-3.5
  - Black orientation: invert by negating x and y

---

### PR #3: Fix game page arrow drawing and WebSocket-based move sending
**Merged:** 2025-12-08  
**URL:** https://github.com/reductionfear/lichdrawarrow/pull/3

#### Problem
- Game page had no arrow drawing (only puzzles did)
- Auto-play used deprecated `lichess.socket.send()` API which no longer exists

#### Changes
- **WebSocket interception**: Proxy `window.WebSocket` to capture connection
- **Track currentAck**: Extract ply number from incoming move messages
- **Arrow drawing on game page**: Added `getArrowCoords()` and SVG rendering
- **Move transmission**: Replace broken API with direct WebSocket send:
```javascript
webSocketWrapper.send(JSON.stringify({
    t: "move",
    d: { u: bestMove, a: currentAck, b: 0, l: realisticLag }
}));
```

---

## Known Issues

### 🔴 CRITICAL: Stockfish not loading
**Status:** Unresolved  
**Error:** `Stockfish: undefined` in console

The Stockfish engine fails to load from the `@require` URL:
```javascript
// @require https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/stockfish.js
```

**Root Cause:** 
- External script may not load correctly via userscript `@require`
- Stockfish needs to be loaded as a Web Worker, not directly injected

**Proposed Solution:**
Update to use the working Stockfish loader from `lichess_auto_color.js`:
```javascript
// @require https://raw.githubusercontent.com/reductionfear/lichessb/refs/heads/main/stockfish8.asm.js

// Initialize properly:
const stockfish = window.STOCKFISH();
stockfish.postMessage("uci");
stockfish.postMessage("setoption name Skill Level value 20");
stockfish.postMessage("ucinewgame");
```

---

## Next Steps

1. **Fix Stockfish loading** - Update `@require` URL and initialization code
2. **Test arrow drawing** - Verify arrows render after Stockfish fix
3. **Test auto-play** - Confirm WebSocket move sending works

---

## Technical Notes

### Lichess Board DOM Structure
```html
<svg class="cg-shapes" viewBox="-4 -4 8 8">
    <defs>...</defs>
    <g></g>  <!-- Arrows go here -->
</svg>
```

### Coordinate System (viewBox="-4 -4 8 8")
| File | X Coord | Rank | Y Coord (White) |
|------|---------|------|-----------------|
| a    | -3.5    | 1    | 3.5             |
| b    | -2.5    | 2    | 2.5             |
| c    | -1.5    | 3    | 1.5             |
| d    | -0.5    | 4    | 0.5             |
| e    | 0.5     | 5    | -0.5            |
| f    | 1.5     | 6    | -1.5            |
| g    | 2.5     | 7    | -2.5            |
| h    | 3.5     | 8    | -3.5            |

For black orientation: negate both x and y values.

### WebSocket Move Payload
```json
{
    "t": "move",
    "d": {
        "u": "e2e4",
        "a": 8,
        "b": 0,
        "l": 150
    }
}
```
- `u`: UCI move string
- `a`: Acknowledgment (ply number from last server message)
- `b`: Unknown (always 0)
- `l`: Simulated lag in milliseconds
