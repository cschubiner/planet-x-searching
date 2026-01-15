# Planet X - Feature Analysis

## Design Philosophy

This app is a **note-taking and tracking companion** to the iOS/Android app. It is NOT:
- A game engine
- A replacement for the iOS app
- An automated deduction solver

The iOS app handles all game logic (survey results, research info, theory verification, etc.). This web tool helps players **record and organize** information they receive from the app.

---

## Implemented Features

### 1. Time Track Display (IMPLEMENTED)

Shows cumulative time for each player, derived from logged moves.

**Features:**
- Badge display showing each player's current time position
- "Next turn" indicator highlighting player furthest behind
- Automatic updates when moves are logged

**Location:** Above the Move Notes section

---

### 2. Conference Trigger Alerts (IMPLEMENTED)

Alerts when players reach conference thresholds.

**Features:**
- Conference thresholds configured per mode:
  - Standard: X1 at time 12
  - Expert: X1 at time 10, X2 at time 22
- Visual highlight (yellow) when conference triggered
- "TRIGGERED" badge appears on conference row
- Threshold info shown before trigger: "(at time X)"

**Note:** Threshold values can be adjusted in `MODE_SETTINGS.conferences`

---

### 3. Game State Persistence (IMPLEMENTED)

Auto-saves game state to localStorage.

**Features:**
- Debounced auto-save (500ms delay) on any change
- Saves: hints, moves, research notes, sector notes, score calculator, theories
- "Resume Game" prompt when returning with saved state
- "Start Fresh" option to discard saved state
- Displays time since last save

**Storage key:** `planetXGameState`

---

### 4. Theory Tracking Table (IMPLEMENTED)

Simple table to track player theories.

**Features:**
- Player selection (color-coded)
- Sector selection (dropdown)
- Object selection (asteroid, comet, dwarf planet, gas cloud)
- "Revealed" checkbox
- "Correct" checkbox
- Auto-adds new row when current row is edited
- Integrated with save/restore system

**Usage:** Use iOS app to verify theories, then mark as revealed/correct

---

### 5. Solo Mode (IMPLEMENTED)

Single player games are now allowed.

**Change:** Player count validation changed from `< 2` to `< 1`

---

## What's Out of Scope

| Feature | Why It Doesn't Fit |
|---------|-------------------|
| Sector visualization | iOS app already shows the board |
| Automated deduction | This is a note-taking tool, not a solver |
| Full theory token mechanics | Simple table is sufficient; players track 4-turn reveal mentally |
| Bot AI | iOS app handles solo bot logic |

---

## Configuration

### Conference Thresholds

Edit `MODE_SETTINGS` in `script.js` to adjust conference timing:

```javascript
// Standard mode
conferences: [{ name: "X1", threshold: 12 }],

// Expert mode
conferences: [
  { name: "X1", threshold: 10 },
  { name: "X2", threshold: 22 },
],
```

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Solo mode | Implemented | Allow 1+ players |
| Time track display | Implemented | Shows player positions |
| Conference alerts | Implemented | Threshold-based triggers |
| Game persistence | Implemented | localStorage auto-save |
| Theory table | Implemented | Manual tracking |

The app now supports the complete game flow when used alongside the iOS companion app.
