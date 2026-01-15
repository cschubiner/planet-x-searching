# Planet X - Feature Analysis

## Design Philosophy

This app is a **note-taking and tracking companion** to the iOS/Android app. It is NOT:
- A game engine
- A replacement for the iOS app
- An automated deduction solver

The iOS app handles all game logic (survey results, research info, theory verification, etc.). This web tool helps players **record and organize** information they receive from the app.

---

## What Fits Naturally (IN SCOPE)

These features extend the existing note-taking pattern:

### 1. Time Track Display (RECOMMENDED)

**Why it fits:** The move tracker already calculates time costs. Displaying cumulative time is just summing existing data.

**What to add:**
- Running time total per player (derived from logged moves)
- Visual display showing relative positions
- "Current turn" indicator (player furthest behind)

**Implementation:** Simple - aggregate time costs from existing move rows.

```
Current Time Positions:
Blue: 12 | Purple: 8 (next) | Red: 14 | Yellow: 9
```

**Effort:** Low - data already exists, just needs display

---

### 2. Conference Trigger Alerts (RECOMMENDED)

**Why it fits:** Conference notes section already exists. This just adds a notification when the time track crosses a threshold.

**What to add:**
- Conference threshold configuration (e.g., X1 at position 12)
- Alert/highlight when a player's time crosses the threshold
- Checkbox to mark "conference completed"

**Implementation:** Check threshold after each move is logged.

**Effort:** Low - simple threshold check

---

### 3. Game State Persistence (RECOMMENDED)

**Why it fits:** This is standard web app functionality. Users shouldn't lose an hour of note-taking because they refreshed.

**What to add:**
- Auto-save to localStorage on any change
- "Resume Game" option on page load if saved state exists
- "Clear Saved Game" button

**What to save:**
- All hint table states (yes/no/blank)
- All move rows
- All notes (research, sector notes)
- Score calculator values

**Effort:** Medium - need to serialize/deserialize all form state

---

### 4. Theory Tracking Table (RECOMMENDED)

**Why it fits:** It's just another tracking table, similar to the moves table.

**What to add:**
- "Theories" section with a simple table:
  - Player | Sector | Object | Turn Submitted | Revealed? | Correct?
- Manual entry (user enters from iOS app results)
- Integration with score calculator

**What NOT to add:**
- Automatic 4-turn countdown (adds complexity, players can track mentally)
- Peer review mechanics (handled by iOS app + player agreement)

**Effort:** Low-Medium - similar pattern to moves table

---

### 5. Solo Mode (DONE)

**Change made:** Allow 1 player to start game (line 1501: `< 1` instead of `< 2`)

The iOS app handles all solo bot logic. This tool just needs to allow single-player games.

---

## What Doesn't Fit (OUT OF SCOPE)

### Sector Visualization / Board Display
**Why:** The iOS app already shows the board. Duplicating it adds maintenance burden with no benefit.

### Automated Deduction Logic
**Why:** This is a note-taking tool, not a solver. Players enjoy the deduction process.

### Bot AI / Automated Bot Turns
**Why:** The iOS app manages the bot in solo mode. We just record what it does.

### Full Theory Token Mechanics (4-space track, automatic advancement)
**Why:** Over-engineered for a note-taking tool. A simple "theories submitted" table is sufficient. Players can mentally track the 4-turn reveal rule.

### Real-time Multiplayer / Sync
**Why:** Way out of scope. Players sit together or share a screen.

---

## Recommended Implementation Order

### Phase 1: Quick Wins
1. **Solo mode** - Done
2. **Time track display** - Sum existing time costs, show who's next
3. **Conference alerts** - Threshold check on time track

### Phase 2: Persistence
4. **localStorage save/load** - Don't lose game state on refresh

### Phase 3: Theory Support
5. **Theory tracking table** - Simple table for recording theories
6. **Score calculator update** - Add theory points section

---

## Summary

| Feature | Fits? | Effort | Value |
|---------|-------|--------|-------|
| Solo mode | Yes | Done | High |
| Time track display | Yes | Low | High |
| Conference alerts | Yes | Low | Medium |
| Game persistence | Yes | Medium | High |
| Theory table | Yes | Low-Med | Medium |
| Score calc update | Yes | Low | Low |
| Sector visualization | No | High | Low |
| Auto deduction | No | High | Low |
| Bot AI | No | N/A | N/A |

The goal is to **enhance the note-taking experience**, not to rebuild the iOS app's functionality.
