# Lichess Arrow Draw - Development Progress

## Overview
This document tracks the development progress of the Lichess userscript for drawing arrows and auto-playing moves.

---

## Current Status

| Feature | Game Page | Puzzle Page |
|---------|-----------|-------------|
| Stockfish Loading | ✅ Works | ✅ Works |
| Arrow Drawing | ✅ Works | 🔄 PR #4 in progress |
| Auto-play Moves | ✅ Works (WebSocket) | N/A (DOM-based) |
| Board Position | Via Chess.js | Via DOM parsing (PR #4) |

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
- **SVG element selectors**:  Changed from generic `$('g')[0]` to `$('svg. cg-shapes g')[0]`
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
- Auto-play used deprecated `lichess. socket.send()` API which no longer exists

#### Changes
- **WebSocket interception**: Proxy `window.WebSocket` to capture connection
- **Track currentAck**: Extract ply number from incoming move messages
- **Arrow drawing on game page**: Added `getArrowCoords()` and SVG rendering
- **Move transmission**: Replace broken API with direct WebSocket send: 
```javascript
webSocketWrapper.send(JSON. stringify({
    t: "move",
    d: { u: bestMove, a: currentAck, b: 0, l: realisticLag }
}));
```

---

### PR #4: Fix puzzle page by parsing board position from DOM (In Progress)
**Status:** 🔄 In Progress  
**URL:** https://github.com/reductionfear/lichdrawarrow/pull/4

#### Problem
- Chess.js fails to load from `@require` on puzzle pages (`Chess:  undefined`)
- Puzzle code crashes at `new Chess()` before defining the `puzzle` function
- Stockfish works fine, but can't get board position without Chess. js

#### Solution
- **Add `boardToFEN()` function**: Parse piece positions directly from DOM
- **Remove Chess.js dependency for puzzles**: Read `<piece>` elements from `<cg-board>`
- **Convert pixel positions to FEN**:  Each square is 69px

```javascript
// DOM piece element: 
<piece class="white rook" style="transform: translate(0px, 483px);">

// Conversion:
// x:  0px ÷ 69 = file 0 = 'a'
// y: 483px ÷ 69 = 7, then 7-7 = rank 1
// class: "white rook" → 'R'
// Result: Ra1
```

---

## Technical Notes

### Lichess Board DOM Structure
```html
<svg class="cg-shapes" viewBox="-4 -4 8 8">
    <defs>... </defs>
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

### WebSocket Move Payload (Game Pages Only)
```json
{
    "t": "move",
    "d": {
        "u":  "e2e4",
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

### DOM Board Parsing (Puzzle Pages)
```javascript
// Piece positions from transform style:
// translate(Xpx, Ypx) where each square = 69px

// File:  X ÷ 69 → 0=a, 1=b, 2=c, 3=d, 4=e, 5=f, 6=g, 7=h
// Rank: 8 - (Y ÷ 69) → 0=8, 69=7, 138=6, 207=5, 276=4, 345=3, 414=2, 483=1

// Piece types from classes:
// "white king" → K, "black queen" → q, etc.
```
