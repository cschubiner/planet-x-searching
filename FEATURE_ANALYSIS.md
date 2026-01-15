# Planet X - Complete Game Feature Analysis

## Goal
Play the **complete** Planet X board game using only:
1. This web app (for note-taking, tracking, and game management)
2. The iOS/Android companion app (for sector lookups, research results, etc.)

**No physical game board required.**

---

## Current Implementation Status

### What's Already Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Game Setup (mode/difficulty) | Complete | Standard (12) and Expert (18) sectors |
| Hints/Deduction Table | Complete | Yes/No toggles with validation |
| Move Tracking | Complete | Survey, Target, Research, Locate actions |
| Research Notes | Complete | Tracks A-F research areas |
| Conference Notes | Complete | X1 (Standard), X1+X2 (Expert) |
| Starting Information | Complete | Based on difficulty level |
| Logic Rules Display | Complete | Dynamic per mode |
| Final Score Calculator | Partial | Missing theory scoring |
| Player Validation | Complete | Research consecutive, Target limits |
| URL Sharing | Complete | Game setup only |

### What's Missing (Critical for Full Game)

---

## MISSING FEATURES - DETAILED ANALYSIS

### 1. Time Track System (HIGH PRIORITY)

The time track is **central** to Planet X gameplay - it determines turn order and triggers conferences.

**What it needs:**
- **Visual time track display** showing all players' positions (0 to ~40+ spaces)
- **Automatic time advancement** when actions are logged
- **Turn order indicator** - player furthest behind goes next
- **Current turn highlighting** - who should act now

**Implementation:**
```
Time costs (already in code):
- Survey: 1-4 (based on sector range)
- Target: 4
- Research: 1
- Locate Planet X: 5
```

**UI Suggestion:** Horizontal track with player markers, showing positions 0-40+

---

### 2. Conference Triggers (HIGH PRIORITY)

Conferences reveal information at specific time track positions.

**What it needs:**
- **Conference threshold markers** on time track
  - Standard mode: Position for X1 conference
  - Expert mode: Positions for X1 and X2 conferences
- **Conference trigger detection** - when a player crosses the threshold
- **Conference notification** - alert that conference is happening
- **Conference action tracking** - each player must do conference action before next turn

**Conference Rules:**
- When ANY player reaches/passes conference marker, conference triggers
- ALL players (regardless of position) participate
- Players use the iOS app to get conference info
- Conference happens BEFORE the player who triggered it takes their action

---

### 3. Theory Token System (HIGH PRIORITY - Major Missing Mechanic)

This is the **competitive scoring mechanic** that's completely missing.

**What it needs:**

#### Theory Submission
- **Theory submission UI** per player
  - Select sector number
  - Select object type (Asteroid, Comet, Dwarf Planet, Gas Cloud)
  - Submit theory (uses iOS app to verify immediately - player keeps result secret)
- **Theory tracking table** showing all submitted theories
  - Player, Sector, Object, Status (pending/revealed), Correct/Incorrect

#### Theory Token Track
- **4-space token track per player** (or shared visual)
- **Automatic advancement** - tokens move down 1 space each turn
- **Reveal trigger** - when token reaches bottom of track, theory is revealed to ALL players

#### Peer Review Mechanic
- **Option to "peer review"** another player's pending theory
- **Reveal timing** - player can strategically reveal early

#### Theory Scoring
- **Points for correct theories:**
  - 1st correct theory for an object: bonus points
  - Subsequent correct theories: fewer points
- **Integration with Final Score Calculator**

**Scoring (approximate - verify with rulebook):**
- First correct theory: 2-4 points (varies by object type)
- Later correct theories: 1-2 points

---

### 4. Solo Mode Support (MEDIUM PRIORITY)

Currently blocked by `if (value.length < 2) invalid = true;` at script.js:1501

**What it needs:**

#### Allow Single Player
- Remove/modify minimum player validation
- Single player game mode option

#### Bot Player Management
- **Bot player** (managed by app, not this web tool)
- Bot always submits correct theories (per iOS app)
- **Extra theory tokens** - solo requires 12 + 12 = 24 tokens for verifying bot theories
- **Bot turn tracking** - indicate when bot acts

#### Solo-Specific Rules
- Different end-game conditions
- Different scoring

**Note:** Much of solo mode is handled by the iOS app. This web tool mainly needs to:
1. Allow 1 player to start
2. Track bot's theories (entered manually from iOS app)
3. Handle solo scoring

---

### 5. Game State Persistence (MEDIUM PRIORITY)

Currently all data is lost on page refresh.

**What it needs:**
- **Local Storage save/load** - persist full game state
- **Auto-save** on every change
- **Manual save/load** with timestamps
- **Export/Import** game state as JSON (for sharing/backup)

**Data to persist:**
- Game settings (mode, players, difficulty)
- All hint table states
- All move history
- All research notes
- Time track positions
- Theory submissions
- Score calculator values

---

### 6. Enhanced Score Calculator (LOW PRIORITY)

Current calculator is missing theory points.

**What it needs:**
- **Theory points section:**
  - First correct theory bonus
  - Per-object theory points
  - Total theory points
- **Auto-calculate from tracked theories** (if theory system implemented)

---

### 7. Sector Visualization (NICE TO HAVE)

Not strictly required since iOS app shows the "board."

**What it could have:**
- **Circular sector display** matching game board layout
- **Visual markers** for confirmed objects
- **Adjacent sector highlighting** for rule verification

---

## IMPLEMENTATION PRIORITY

### Phase 1 - Core Multiplayer (Essential)
1. **Time Track Display** - Required for turn order
2. **Conference Triggers** - Required for game flow
3. **Theory Token System** - Core competitive mechanic

### Phase 2 - Quality of Life
4. **Game State Persistence** - Prevents frustrating data loss
5. **Enhanced Score Calculator** - Complete scoring

### Phase 3 - Solo Mode
6. **Single Player Support** - Different player base
7. **Bot Integration** - Solo-specific mechanics

### Phase 4 - Polish
8. **Sector Visualization** - Nice visual aid
9. **Advanced Deduction Helpers** - Auto-logic suggestions

---

## DETAILED FEATURE SPECIFICATIONS

### Time Track Implementation

```javascript
// Suggested data structure
const playerTimePositions = {
  blue: 0,
  purple: 0,
  red: 0,
  yellow: 0
};

// Conference positions (verify exact values)
const CONFERENCE_POSITIONS = {
  standard: { X1: 12 },  // approximate
  expert: { X1: 10, X2: 20 }  // approximate
};

// Determine whose turn it is
function getNextPlayer(positions, playerColors) {
  // Player furthest behind goes next
  // Ties broken by turn order (playerColors array order)
  return playerColors.reduce((lowest, color) =>
    positions[color] <= positions[lowest] ? color : lowest
  );
}
```

### Theory Token Track Implementation

```javascript
// Suggested data structure
const theoryTokens = [
  {
    id: 1,
    player: 'blue',
    sector: 5,
    object: 'asteroid',
    trackPosition: 4,  // 4=top, 0=revealed
    isCorrect: null,   // set by player after iOS app check
    isRevealed: false,
    revealedByPeerReview: false
  }
];

// Move all tokens down each turn
function advanceTheoryTokens() {
  theoryTokens.forEach(token => {
    if (!token.isRevealed && token.trackPosition > 0) {
      token.trackPosition--;
      if (token.trackPosition === 0) {
        token.isRevealed = true;
        // Trigger reveal notification
      }
    }
  });
}
```

### UI Mockup - Time Track

```
Time Track
==========
Position: 0----5----10---15---20---25---30---35---40
                    |         |
                   X1        X2 (expert only)

Blue:    =========> [12]
Purple:  =====> [8]         <- CURRENT TURN
Red:     ==========> [14]
Yellow:  ======> [9]
```

### UI Mockup - Theory Tokens

```
Theory Tokens                    Track Position
=============                    [4] [3] [2] [1] [Revealed]
Blue:   Sector 5 - Asteroid       *
        Sector 8 - Comet                  *
Purple: Sector 3 - Gas Cloud                      (Correct!)
Red:    Sector 11 - Dwarf Planet         *
```

---

## iOS APP INTEGRATION POINTS

The web app should prompt users to use the iOS app for:

1. **Survey Results** - "Enter survey results from app"
2. **Target Results** - "Enter target results from app"
3. **Research Results** - "Enter research results from app"
4. **Conference Info** - "Check app for conference revelations"
5. **Theory Verification** - "Use app to verify if theory is correct"
6. **Locate Planet X** - "Use app to attempt location"

---

## QUESTIONS TO VERIFY WITH RULEBOOK

1. Exact time track positions for conference triggers
2. Exact scoring values for theories (first vs. subsequent)
3. Exact rules for peer review timing and costs
4. Solo mode specific rules and token counts
5. End game trigger conditions

---

## SUMMARY

**To play the full game without the board, you need:**

| Feature | Why It's Needed |
|---------|----------------|
| Time Track | Determines turn order and game pacing |
| Conference System | Major revelation mechanic |
| Theory Tokens | Core competitive scoring mechanic |
| Game Persistence | Practical necessity for longer games |

The current app is an excellent **note-taking tool** but is missing the **game flow mechanics** (time track, conferences) and **competitive mechanics** (theories) that make Planet X a game rather than a puzzle.

With these additions, you could play the complete game using just your phone (iOS app) and this web tool.
