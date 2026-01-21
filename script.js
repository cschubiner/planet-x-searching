const GAME_SETTINGS = {
  mode: "game-mode",
  playerColors: "player-colors",
  difficulty: "difficulty",
};
const PLAYER_COLORS = {
  blue: "primary",
  purple: "purple",
  red: "danger",
  yellow: "warning",
};

const MODE_SETTINGS = {
  standard: {
    rules: [
      {
        object: "comet",
        count: 2,
        label: "Comets",
        rule: "only in prime sectors (2, 3, 5, 7, 11)",
      },
      {
        object: "asteroid",
        count: 4,
        label: "Asteroids",
        rule: "adjacent to at least 1 other <asteroid>",
      },
      {
        object: "dwarf-planet",
        count: 1,
        label: "Dwarf Planet",
        rule: "not adjacent to <planet-x>",
      },
      {
        object: "gas-cloud",
        count: 2,
        label: "Gas Clouds",
        rule: "adjacent to at least 1 <truly-empty>",
      },
      {
        object: "planet-x",
        count: 1,
        label: "Planet X",
        rule: "not adjacent to <dwarf-planet>; appears <empty>",
      },
      {
        object: "truly-empty",
        count: 2,
        label: "Truly Empty Sectors",
        rule: "(remember: <planet-x> appears <empty>)",
      },
    ],
    objects: {
      "planet-x": { count: 1 },
      "truly-empty": { count: 2 },
      "gas-cloud": { count: 2, points: 4 },
      "dwarf-planet": { count: 1, points: 4 },
      "asteroid": { count: 4, points: 2 },
      "comet": { count: 2, points: 3 },
    },
    research: ["A", "B", "C", "D", "E", "F"],
    conferences: [{ name: "X1", threshold: 12 }],
    theorySectors: [3, 6, 9, 12], // Theory phases trigger when visible sky reaches these sectors
  },
  expert: {
    rules: [
      {
        object: "comet",
        count: 2,
        label: "Comets",
        rule: "only in prime sectors (2, 3, 5, 7, 11, 13, 17)",
      },
      {
        object: "asteroid",
        count: 4,
        label: "Asteroids",
        rule: "adjacent to at least 1 other <asteroid>",
      },
      {
        object: "dwarf-planet",
        count: 4,
        label: "Dwarf Planets",
        rule: "in a band of 6; not adjacent to <planet-x>",
      },
      {
        object: "gas-cloud",
        count: 2,
        label: "Gas Clouds",
        rule: "adjacent to at least 1 <truly-empty>",
      },
      {
        object: "planet-x",
        count: 1,
        label: "Planet X",
        rule: "not adjacent to <dwarf-planet>; appears <empty>",
      },
      {
        object: "truly-empty",
        count: 2,
        label: "Truly Empty Sectors",
        rule: "(remember: <planet-x> appears <empty>)",
      },
    ],
    objects: {
      "planet-x": { count: 1 },
      "truly-empty": { count: 5 },
      "gas-cloud": { count: 2, points: 4 },
      "dwarf-planet": { count: 4, points: 2 },
      "asteroid": { count: 4, points: 2 },
      "comet": { count: 2, points: 3 },
    },
    research: ["A", "B", "C", "D", "E", "F"],
    conferences: [
      { name: "X1", threshold: 10 },
      { name: "X2", threshold: 22 },
    ],
    theorySectors: [3, 6, 9, 12, 15, 18], // Theory phases trigger when visible sky reaches these sectors
  },
};

const THEME_STORAGE_KEY = "planet-x-theme";
const THEME_IMAGE_BASES = new Set([
  "asteroid",
  "comet",
  "dwarf-planet",
  "empty",
  "gas-cloud",
  "planet-x",
  "truly-empty",
]);

function getThemeObjectSrc(object, { forceWhite = false } = {}) {
  if (!object || !THEME_IMAGE_BASES.has(object)) {
    return object ? `images/${object}.png` : "";
  }
  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  const useWhite = forceWhite || isDark;
  return `images/${object}${useWhite ? "-white" : ""}.png`;
}

function shouldForceWhiteForImage($img) {
  const $label = $img.closest("label[for]");
  if ($label.length === 0) return false;
  const inputId = $label.attr("for");
  if (!inputId) return false;
  const input = document.getElementById(inputId);
  return Boolean(input?.checked);
}

function updateThemeImages(theme) {
  const isDark = theme === "dark";
  $("img").forEach(($img) => {
    const srcAttr = $img.attr("src");
    if (!srcAttr || !srcAttr.includes("images/")) return;
    const match = srcAttr.match(/images\/([a-z-]+)(-white)?\.png$/i);
    if (!match) return;
    const base = match[1];
    if (!THEME_IMAGE_BASES.has(base)) return;
    const forceWhite = isDark || shouldForceWhiteForImage($img);
    const nextSrc = `images/${base}${forceWhite ? "-white" : ""}.png`;
    if (srcAttr !== nextSrc) {
      $img.attr("src", nextSrc);
    }
  });
}

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme, { persist = true } = {}) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", normalized);
  const isDark = normalized === "dark";
  const $toggle = $("#theme-toggle");
  $toggle
    .attr("aria-pressed", isDark ? "true" : "false")
    .toggleClass("btn-outline-light", isDark)
    .toggleClass("btn-outline-dark", !isDark);
  $("#theme-toggle-icon")
    .toggleClass("bi-moon-stars", !isDark)
    .toggleClass("bi-sun", isDark);
  $("#theme-toggle-label").text(isDark ? "Light Mode" : "Dark Mode");
  updateThemeImages(normalized);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

const DIFFICULTY_START_HINTS = {
  youth: 12,
  beginner: 8,
  experienced: 4,
  genius: 0,
};

const currentGameSettings = {};

const STORAGE_KEY = "planetXGameState";

// Undo/Redo history stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY_SIZE = 100; // Limit history to prevent memory issues

// Global auto-save function (debounced)
let autoSaveTimeout = null;
let isRestoringState = false; // Flag to prevent undo/redo from creating new history entries
function triggerAutoSave() {
  if (!currentGameSettings.mode) return; // Game not started
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    saveGameState();
  }, 500);
}

/** Captures the current game state */
function getCurrentState() {
  if (!currentGameSettings.mode) return null; // Game not started yet

  const state = {
    settings: { ...currentGameSettings },
    timestamp: Date.now(),
    hints: {},
    moves: [],
    researchNotes: {},
    sectorNotes: {},
    scoreCalc: {},
  };

  // Save hint states
  $(".hint-btn").forEach(($btn) => {
    const hintName = $btn.attr("hintName");
    if (hintName && $btn.hasClass("active")) {
      state.hints[hintName] = $btn.attr("hint"); // "yes" or "no"
    }
  });

  // Save move data
  $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
    const moveId = $row.getId();
    const moveNum = Number($row.attr("moveNum"));

    // Get player
    const player = $row.find(`input[name="${moveId}-player"]:checked`).attr("value");

    // Get action
    const action = getSelectedRadio(`${moveId}-action`, $row);

    // Get action args based on action type
    let actionArgs = {};
    if (action === "survey") {
      actionArgs.object = $row.find(`input[name="${moveId}-action-survey-object"]:checked`).attr("value");
      actionArgs.startSector = $row.find(`#${moveId}-action-survey-sector-start`).val();
      actionArgs.endSector = $row.find(`#${moveId}-action-survey-sector-end`).val();
    } else if (action === "target") {
      actionArgs.sector = $row.find(`[action="target"] select`).val();
    } else if (action === "research") {
      actionArgs.area = $row.find(`input[name="${moveId}-action-research-area"]:checked`).attr("value");
    }

    // Get notes
    const notes = $row.find("[contenteditable]").text();

    if (player || action || notes) {
      state.moves.push({ moveNum, player, action, actionArgs, notes });
    }
  });

  // Save research/conference notes
  $("#research-body tr").forEach(($row) => {
    const rowId = $row.attr("id") || $row.find("th").text();
    const $selects = $row.find("select");
    const notes = $row.find("[contenteditable]").text();
    if ($selects.length > 0 || notes) {
      state.researchNotes[rowId] = {
        selects: $selects.map((i, el) => $(el).val()).get(),
        notes,
      };
    }
  });

  // Save sector notes
  $("#hints-notes-row [contenteditable]").forEach(($note, index) => {
    const text = $note.text();
    if (text) {
      state.sectorNotes[index + 1] = text;
    }
  });

  // Save score calculator values
  $("#score-table input").forEach(($input) => {
    const id = $input.attr("id");
    const val = $input.val();
    if (val) {
      state.scoreCalc[id] = val;
    }
  });

  // Save theories
  state.theories = [];
  $(".theory-row").forEach(($row) => {
    const theoryId = $row.getId();
    const player = $row.find(`input[name="${theoryId}-player"]:checked`).attr("value");
    const sector = $row.find(`#${theoryId}-sector`).val();
    const object = $row.find(`input[name="${theoryId}-object"]:checked`).attr("value");
    const progress = parseInt($row.attr("data-progress") || "0");
    const result = $row.find(`input[name="${theoryId}-result"]:checked`).val() || "pending";

    if (player || sector || object || progress > 0 || result !== "pending") {
      state.theories.push({ player, sector, object, progress, result });
    }
  });

  return state;
}

/** Saves the current game state to localStorage and history */
function saveGameState() {
  const state = getCurrentState();
  if (!state) return;

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Add to undo history (but not when we're restoring from undo/redo)
  if (!isRestoringState) {
    // Only add to history if the state is different from the last one
    const lastState = undoStack[undoStack.length - 1];
    const stateJson = JSON.stringify(state);
    const lastStateJson = lastState ? JSON.stringify(lastState) : null;

    if (stateJson !== lastStateJson) {
      undoStack.push(JSON.parse(stateJson)); // Deep clone

      // Limit history size
      if (undoStack.length > MAX_HISTORY_SIZE) {
        undoStack.shift();
      }

      // Clear redo stack when new action is taken
      redoStack.length = 0;

      // Update undo/redo button states
      updateUndoRedoButtons();
    }
  }
}

/** Loads game state from localStorage */
function loadGameState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse saved game state:", e);
    return null;
  }
}

/** Clears saved game state */
function clearGameState() {
  localStorage.removeItem(STORAGE_KEY);
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (key.startsWith("conference-") || key.startsWith("theory-sector-")) {
      sessionStorage.removeItem(key);
    }
  }
  undoStack.length = 0;
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function resetGameSettingsForm() {
  $("#game-settings input[type='radio']").prop("checked", false);
  $("#start-game-btn").prop("disabled", true);
  const $notInPlay = $("#player-color-not-in-play");
  if ($notInPlay.length) {
    Object.keys(PLAYER_COLORS).forEach((color) => {
      $notInPlay.append($(`#${color}-player`));
    });
  }
  $(`.${GAME_SETTINGS.playerColors}`).empty();
}

function resetCircularBoardState() {
  circularBoardState.numSectors = 12;
  circularBoardState.rotation = 0;
  circularBoardState.visibleSkyStart = 1;
  circularBoardState.lastEarthSector = 1;
  circularBoardState.showVisibleSky = true;
  circularBoardState.selectedSector = null;
  pendingTheorySectors = [];
  isTheoryModalActive = false;
  skyMapInputMode = null;
  skyMapSurveyStart = null;
  skyMapLockedRowId = null;

  $("#circular-board .sector, #circular-board .player-pawn").remove();
  $("#center-sector-num").text("");
  $("#center-object-name").text("");
  $("#visible-sky-indicator").removeClass("active").attr("style", "");
  $("#circular-board").css("transform", "rotate(0deg)");
  $("#toggle-visible-sky").addClass("active");
  $("#sky-map-input-status").text("Sky map input: Off");
}

function resetGameUI({ showSettings = true } = {}) {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
  }

  $("#logic-rules-body").empty();
  $("#research-body").empty();
  $("#moves-body").empty();
  $("#theories-body").empty();
  movesCounter = 0;
  theoriesCounter = 0;
  pendingTheorySectors = [];
  isTheoryModalActive = false;

  $("#sectors-head").children().not("#sectors-head-filler").remove();
  $("#opposite-row").children().not(":first").remove();
  $(".object-row").forEach(($row) => {
    $row.children().not(":first").remove();
  });
  $("#hints-notes-row").children().not(":first").remove();

  $("#score-table input").val("");
  $("#score-total").text("0");

  $("#time-track-display").empty();
  $("#visible-sky-summary").text("");
  $("#visible-sky-details").text("");
  $("#current-turn-display").text("");

  $("#board").addClass("d-none");
  $("#circular-board-section").addClass("d-none");
  $("#reset-buttons").addClass("d-none");

  resetCircularBoardState();

  if (showSettings) {
    $("#game-settings").removeClass("d-none");
    resetGameSettingsForm();
    $("#resume-game-prompt").remove();
    Object.keys(currentGameSettings).forEach((key) => delete currentGameSettings[key]);
    history.replaceState(null, "", getUrl());
  }
}

/** Clears the current UI state before restoring */
function clearCurrentState() {
  // Clear all hint buttons
  $(".hint-btn").removeClass("active");

  // Clear all move rows (except keep at least one)
  $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
    $row.find("input[type='radio']").prop("checked", false);
    $row.find("select").val("");
    $row.find("[contenteditable]").text("");
  });

  // Clear research notes
  $("#research-body tr").forEach(($row) => {
    $row.find("select").val("");
    $row.find("[contenteditable]").text("");
  });

  // Clear sector notes
  $("#hints-notes-row [contenteditable]").text("");

  // Clear score calculator
  $("#score-table input").val("");

  // Clear theories
  $(".theory-row").forEach(($row) => {
    const theoryId = $row.getId();
    $row.find("input[type='radio']").prop("checked", false);
    $row.find("input[type='checkbox']").prop("checked", false);
    $row.find("select").val("");
    // Reset progress to NOT_SUBMITTED
    $row.attr("data-progress", "0");
    $row.removeClass("table-success table-danger");
    // Reset the result to pending
    $row.find(`input[name="${theoryId}-result"][value="pending"]`).prop("checked", true);
    // Reset the progress indicator
    const $progressCell = $row.find(`#${theoryId}-progress`);
    if ($progressCell.length > 0 && typeof createTheoryProgressIndicator === "function") {
      $progressCell.empty().append(createTheoryProgressIndicator(theoryId, 0));
    }
  });
}

/** Undo the last action */
function undo() {
  if (undoStack.length === 0) return;

  // Save current state to redo stack
  const currentState = getCurrentState();
  if (currentState) {
    redoStack.push(currentState);
  }

  // Pop the last state from undo stack
  const previousState = undoStack.pop();

  // Restore that state
  isRestoringState = true;
  clearCurrentState();
  restoreGameState(previousState);

  // Also save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(previousState));

  // Update button states
  updateUndoRedoButtons();

  // Sync circular board with the restored state
  setTimeout(() => {
    if (typeof syncCircularBoardWithHints === "function") {
      syncCircularBoardWithHints();
    }
    isRestoringState = false;
  }, 200);
}

/** Redo the last undone action */
function redo() {
  if (redoStack.length === 0) return;

  // Save current state to undo stack
  const currentState = getCurrentState();
  if (currentState) {
    undoStack.push(currentState);
  }

  // Pop the last state from redo stack
  const nextState = redoStack.pop();

  // Restore that state
  isRestoringState = true;
  clearCurrentState();
  restoreGameState(nextState);

  // Also save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));

  // Update button states
  updateUndoRedoButtons();

  // Sync circular board with the restored state
  setTimeout(() => {
    if (typeof syncCircularBoardWithHints === "function") {
      syncCircularBoardWithHints();
    }
    isRestoringState = false;
  }, 200);
}

/** Updates the undo/redo button states */
function updateUndoRedoButtons() {
  const $undoBtn = $("#undo-btn");
  const $redoBtn = $("#redo-btn");

  if ($undoBtn.length) {
    $undoBtn.prop("disabled", undoStack.length === 0);
  }

  if ($redoBtn.length) {
    $redoBtn.prop("disabled", redoStack.length === 0);
  }
}

/** Restores game state after game has started */
function restoreGameState(state) {
  if (!state) return;

  // Restore hints
  for (const [hintName, hint] of Object.entries(state.hints || {})) {
    const $btn = $(`#${hintName}-${hint}`);
    if ($btn.length) {
      $btn.trigger("activate");
    }
  }

  // Restore moves
  for (const move of state.moves || []) {
    // Make sure we have enough rows
    while (movesCounter <= move.moveNum) {
      addMoveRow();
    }

    const moveId = `move${move.moveNum}`;
    const $row = $(`#${moveId}`);

    if (move.player) {
      $row.find(`input[name="${moveId}-player"][value="${move.player}"]`).prop("checked", true).trigger("change");
    }

    if (move.action) {
      $row
        .find(`input[name="${moveId}-action"][value="${move.action}"]`)
        .prop("checked", true)
        .trigger("change");

      // Restore action args
      if (move.action === "survey" && move.actionArgs) {
        if (move.actionArgs.object) {
          $row.find(`input[name="${moveId}-action-survey-object"][value="${move.actionArgs.object}"]`).prop("checked", true).trigger("change");
        }
        if (move.actionArgs.startSector) {
          $row.find(`#${moveId}-action-survey-sector-start`).val(move.actionArgs.startSector).trigger("change");
        }
        // End sector needs to be set after start sector change handler runs
        setTimeout(() => {
          if (move.actionArgs.endSector) {
            $row.find(`#${moveId}-action-survey-sector-end`).val(move.actionArgs.endSector).trigger("change");
          }
        }, 50);
      } else if (move.action === "target" && move.actionArgs?.sector) {
        $row.find(`[action="target"] select`).val(move.actionArgs.sector);
      } else if (move.action === "research" && move.actionArgs?.area) {
        $row.find(`input[name="${moveId}-action-research-area"][value="${move.actionArgs.area}"]`).prop("checked", true).trigger("input");
      }
    }

    if (move.notes) {
      $row.find("[contenteditable]").text(move.notes);
    }
  }

  // Restore research notes
  setTimeout(() => {
    for (const [rowId, data] of Object.entries(state.researchNotes || {})) {
      let $row = $(`#${rowId}`);
      if (!$row.length) {
        // Try finding by header text
        $row = $(`#research-body tr`).filter((i, el) => $(el).find("th").text().trim() === rowId);
      }
      if ($row.length) {
        const $selects = $row.find("select");
        (data.selects || []).forEach((val, i) => {
          if ($selects.eq(i).length && val) {
            $selects.eq(i).val(val);
          }
        });
        if (data.notes) {
          $row.find("[contenteditable]").text(data.notes);
        }
      }
    }

    // Restore sector notes
    for (const [sector, text] of Object.entries(state.sectorNotes || {})) {
      const $notes = $("#hints-notes-row [contenteditable]");
      const index = parseInt(sector) - 1;
      if ($notes.eq(index).length) {
        $notes.eq(index).text(text);
      }
    }

    // Restore score calculator
    for (const [id, val] of Object.entries(state.scoreCalc || {})) {
      $(`#${id}`).val(val).trigger("change");
    }

    // Restore theories
    const theories = state.theories || [];
    for (let i = 0; i < theories.length; i++) {
      const theory = theories[i];
      // Make sure we have enough theory rows
      while (theoriesCounter <= i) {
        const playerColors = state.settings.playerColors;
        const numSectors = MODE_SETTINGS[state.settings.mode].numSectors;
        addTheoryRow(playerColors, numSectors);
      }

      const theoryId = `theory${i}`;
      const $row = $(`#${theoryId}`);

      if (theory.player) {
        $row.find(`input[name="${theoryId}-player"][value="${theory.player}"]`).prop("checked", true);
      }
      if (theory.sector) {
        $row.find(`#${theoryId}-sector`).val(theory.sector);
      }
      if (theory.object) {
        $row.find(`input[name="${theoryId}-object"][value="${theory.object}"]`).prop("checked", true).trigger("change");
      }

      // Restore progress (new format)
      if (theory.progress !== undefined && theory.progress > 0) {
        updateTheoryProgress(theoryId, theory.progress);
      }

      // Restore result (new format)
      if (theory.result && theory.result !== "pending") {
        $row.find(`input[name="${theoryId}-result"][value="${theory.result}"]`).prop("checked", true);
        // Apply row styling
        if (theory.result === "correct") {
          $row.addClass("table-success");
        } else if (theory.result === "incorrect") {
          $row.addClass("table-danger");
        }
      }

      // Backwards compatibility: convert old revealed/correct to new format
      if (theory.revealed !== undefined || theory.correct !== undefined) {
        if (theory.correct) {
          $row.find(`input[name="${theoryId}-result"][value="correct"]`).prop("checked", true);
          $row.addClass("table-success");
        } else if (theory.revealed) {
          $row.find(`input[name="${theoryId}-result"][value="incorrect"]`).prop("checked", true);
          $row.addClass("table-danger");
        }
        // Set progress to peer review if it was revealed
        if (theory.revealed && (!theory.progress || theory.progress < 4)) {
          updateTheoryProgress(theoryId, 4);
        }
      }
    }

    // Update time track after restoration
    if (typeof updateTimeTrack === "function") {
      // updateTimeTrack is defined inside addMoveRow scope, so we need to trigger a change
      $(`.${MOVE_ROW_CLASS}`).first().find("select, input").first().trigger("change");
    }
  }, 100);
}

String.prototype.toTitleCase = function () {
  return this.split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

String.prototype.hyphenated = function () {
  return this.replace(/ /g, "-");
};
String.prototype.unhyphenated = function () {
  return this.replace(/-/g, " ");
};

Array.fromRange = (length, func = null) =>
  new Array(length)
    .fill(null)
    .map((value, index, array) => (func ? func(index, array) : index));

$.fn.getId = function () {
  return this.get(0)?.id;
};

$.fn.forEach = function (func) {
  return this.each((index, element) => func($(element), index));
};

$.fn.chooseClass = function (classes, key) {
  if (classes) {
    this.removeClass(Object.values(classes));
    if (key != null && key in classes) {
      this.addClass(classes[key]);
    }
  }
  return this;
};

function getSelectedRadio(name, $scope = $(document)) {
  const $input = $scope.find(`input[name="${name}"]:checked`);
  return $input.attr("value") ?? null;
}

/**
 * Helper functions for creating Bootstrap elements.
 * @namespace
 */
const BootstrapHtml = {
  icon: function (icon) {
    return $("<i>", { class: `bi bi-${icon}` });
  },
  input: function ({ inputClass = null, ...attrs } = {}) {
    attrs.type = "text";
    const classes = ["form-control"];
    if (inputClass != null) {
      classes.push(inputClass);
    }
    attrs.class = classes.join(" ");
    return $("<input>", attrs);
  },
  editable: function ({ editableClass = null, ...attrs } = {}) {
    const classes = ["form-control"];
    if (editableClass != null) {
      classes.push(editableClass);
    }
    attrs.class = classes.join(" ");
    attrs.contenteditable = true;
    const $div = $("<div>", attrs);
    $div.on("input focusout", (_event) => {
      if (["<br>", "<div><br></div>"].includes($div.html())) {
        $div.empty();
      }
    });
    return $div;
  },
  toggleButton: function (
    accent,
    content,
    { id = null, btnClass = null, checked = false, ...attrs } = {}
  ) {
    attrs.type = "button";
    if (id != null) {
      attrs.id = id;
    }
    const classes = ["btn", `btn-${accent}`];
    if (btnClass != null) {
      classes.push(btnClass);
    }
    if (checked) {
      classes.push("active");
    }
    attrs.class = classes.join(" ");
    // attrs["data-bs-toggle"] = "button";
    if (checked) {
      attrs["aria-pressed"] = true;
    }
    return $("<button>", attrs).append(content);
  },
  buttonGroup: function (
    $elements,
    {
      id = null,
      divClass = null,
      small = false,
      vertical = false,
      ...attrs
    } = {}
  ) {
    // group div attrs
    if (id != null) {
      attrs.id = id;
    }
    const classes = [];
    if (vertical) {
      classes.push("btn-group-vertical");
    } else {
      classes.push("btn-group");
    }
    if (small) {
      classes.push("btn-group-sm");
    }
    if (divClass != null) {
      classes.push(divClass);
    }
    if (classes.length > 0) {
      attrs.class = classes.join(" ");
    }
    attrs.role = "group";

    return $("<div>", attrs).append($elements);
  },
  _inputButtonGroup: function (
    inputType,
    name,
    elements,
    {
      onlyValues = false,
      elementClass = null,
      elementAccent = null,
      ...groupDivAttrs
    } = {}
  ) {
    // classes for each input
    const elementClasses = ["btn-check"];
    if (elementClass != null) {
      elementClasses.push(elementClass);
    }
    const inputClass = elementClasses.join(" ");

    function addButton(
      {
        id = null,
        value = null,
        attrs = null,
        checked = false,
        accent = null,
        content = null,
      },
      index
    ) {
      let elementId;
      if (id != null) {
        elementId = id;
      } else if (value != null) {
        elementId = `${name}-${String(value).hyphenated()}`;
      } else {
        elementId = `${name}-${index}`;
      }
      return [
        $("<input>", {
          type: inputType,
          id: elementId,
          name: name,
          class: inputClass,
          value: value,
          autocomplete: "off",
          checked: checked,
          ...attrs,
        }),
        $("<label>", {
          id: `${elementId}-label`,
          for: elementId,
          class: `btn btn-outline-${accent ?? elementAccent}`,
        }).append(content ?? value),
      ];
    }

    return this.buttonGroup(
      elements.flatMap((options, index) =>
        addButton(onlyValues ? { value: options } : options, index)
      ),
      groupDivAttrs
    );
  },
  radioButtonGroup: function () {
    return this._inputButtonGroup("radio", ...arguments);
  },
  checkboxButtonGroup: function () {
    return this._inputButtonGroup("checkbox", ...arguments);
  },
  dropdown: function (
    elements,
    {
      id = null,
      dropdownClass = null,
      defaultBlank = true,
      disableDefault = true,
      deleteDefault = true,
      onlyLabels = false,
      ...attrs
    } = {}
  ) {
    if (!disableDefault) deleteDefault = false;

    // select attrs
    if (id != null) {
      attrs.id = id;
    }
    const classes = ["form-select"];
    if (dropdownClass != null) {
      classes.push(dropdownClass);
    }
    attrs.class = classes.join(" ");

    // select the first element with `selected = true`
    let hasSelected = false;
    for (const option of elements) {
      if (option.isGroup) {
        for (const suboption of option.elements ?? []) {
          if (suboption.selected) {
            if (hasSelected) {
              suboption.selected = false;
            } else {
              hasSelected = true;
            }
          }
        }
        continue;
      }
      if (option.selected) {
        if (hasSelected) {
          option.selected = false;
        } else {
          hasSelected = true;
        }
      }
    }

    function addOption({
      value = null,
      label,
      selected = false,
      disabled = false,
    }) {
      return $("<option>", { value: value ?? label, selected, disabled }).text(
        label
      );
    }

    const defaultOption =
      defaultBlank && !hasSelected
        ? $("<option>", {
            value: "",
            disabled: disableDefault,
            selected: true,
            default: true,
          }).text("-")
        : null;

    const $select = $("<select>", attrs);
    let groupIndex = 0;
    $select.append(
      defaultOption,
      elements.map((options) => {
        if (onlyLabels) {
          return addOption({ label: options });
        }
        if (options.isGroup) {
          const groupOptions = options;
          const groupOnlyLabels = groupOptions.onlyLabels ?? false;
          groupIndex++;
          return $("<optgroup>", {
            label: groupOptions.label ?? `Group ${groupIndex}`,
          }).append(
            (groupOptions.elements ?? []).map((options) =>
              addOption(groupOnlyLabels ? { label: options } : options)
            )
          );
        }
        return addOption(onlyLabels ? { label: options } : options);
      })
    );

    if (defaultBlank && deleteDefault) {
      $select.one("change", (_event) => {
        // delete the first default option the first time an option is selected
        $select.children("[default]:disabled").forEach(($option) => {
          if ($option.text().trim() === "-") {
            $option.remove();
            return false;
          }
        });
      });
    }

    return $select;
  },
};

function isPrime(num) {
  if (num <= 1) return false;
  // first few primes
  if ([2, 3, 5, 7].includes(num)) return true;
  if (num % 2 === 0) return false;
  const sqrt = Math.floor(Math.sqrt(num));
  if (sqrt * sqrt === num) return false;
  for (let x = 3; x <= sqrt; x += 2) {
    if (num % x === 0) return false;
  }
  return true;
}

/**
 * Calculate the wrapped position on the time track (1-based)
 * @param {number} totalTime - Cumulative time total
 * @param {number} trackSize - Size of the track (12 for standard, 18 for expert)
 * @returns {number} Position on track (1 to trackSize)
 *
 * The track wraps around like a clock face. Players start at position 1 and
 * advance clockwise. After spending time, position = (time % trackSize) + 1.
 *
 * Examples:
 * - getTrackPosition(0, 12) => 1   (start at position 1)
 * - getTrackPosition(3, 12) => 4   (after 3 time, at position 4)
 * - getTrackPosition(11, 12) => 12 (at position 12)
 * - getTrackPosition(12, 12) => 1  (wrapped back to position 1)
 * - getTrackPosition(13, 12) => 2  (wrapped to position 2)
 */
function getTrackPosition(totalTime, trackSize) {
  // Players start at position 1 and advance clockwise
  // After N time units, position = (N % trackSize) + 1
  // This naturally wraps: 0->1, 1->2, ..., 11->12, 12->1
  const position = (totalTime % trackSize) + 1;
  return position > trackSize ? 1 : position;
}

function getUrl(settings = {}) {
  const questionMarkIndex = document.URL.indexOf("?");
  let url =
    questionMarkIndex === -1
      ? document.URL
      : document.URL.slice(0, questionMarkIndex);
  const args = [];
  for (const key of Object.keys(GAME_SETTINGS)) {
    let value = settings[key];
    if (value == null) continue;
    if (key === "playerColors") {
      value = value.map((color) => color.charAt(0).toUpperCase()).join("");
    }
    args.push(`${key}=${value}`);
  }
  if (args.length > 0) {
    url += "?" + args.join("&");
  }
  return url;
}

function updateHintsStickyColumns() {
  const $firstColCells = $("#hints-table .freeze-col").not(".col2");
  if ($firstColCells.length === 0) return;
  let maxWidth = 0;
  $firstColCells.forEach(($cell) => {
    const width = $cell.outerWidth();
    if (width > maxWidth) maxWidth = width;
  });
  if (!maxWidth) return;
  $firstColCells.css("min-width", `${maxWidth}px`);
  $("#hints-table .freeze-col.col2").css("left", `${maxWidth}px`);
}

function shiftHintsTableToCenter(targetSector) {
  const numSectors = MODE_SETTINGS[currentGameSettings.mode]?.numSectors;
  if (!numSectors || !Number.isFinite(targetSector)) return;

  const centerIndex = Math.floor(numSectors / 2);
  let start = targetSector - centerIndex;
  while (start <= 0) start += numSectors;

  const order = Array.fromRange(numSectors, (index) => {
    return ((start - 1 + index) % numSectors) + 1;
  });

  $("#hints-table tr").forEach(($row) => {
    const cellsBySector = {};
    $row.children("[data-sector]").forEach(($cell) => {
      const sector = Number($cell.attr("data-sector"));
      if (Number.isFinite(sector)) {
        cellsBySector[sector] = $cell;
      }
    });
    order.forEach((sector) => {
      const $cell = cellsBySector[sector];
      if ($cell) {
        $row.append($cell);
      }
    });
  });
}

function createObjectImage(object, attrs = {}) {
  if (!object) {
    console.warn("createObjectImage called with invalid object:", object);
    return $("<span>").text("?");
  }
  attrs.src = getThemeObjectSrc(object);
  if (object === "empty") {
    attrs.alt = "Empty (appearance)";
  } else {
    attrs.alt = object.toTitleCase();
  }
  return $("<img>", attrs);
}

function toggleImageWhiteVariant(selector) {
  $(selector).on("change", (event) => {
    const name = $(event.target).attr("name");
    $(`input[name="${name}"]`).forEach(($input) => {
      const object = $input.val();
      if (!THEME_IMAGE_BASES.has(object)) return;
      const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
      const shouldWhite = isDark || $input.prop("checked");
      const variant = shouldWhite ? "-white" : "";
      const labelId = $input.getId() + "-label";
      // Only update if we have a valid object value and label
      if (object && labelId) {
        const $img = $(`#${labelId} img`);
        if ($img.length > 0) {
          $img.attr("src", `images/${object}${variant}.png`);
        }
      }
    });
  });
}

let theoriesCounter = 0;

// Theory progress states: 0 = Not submitted, 1 = Placed, 2 = Advanced, 3 = Approaching, 4 = Peer Review
const THEORY_PROGRESS = {
  NOT_SUBMITTED: 0,
  PLACED: 1,
  ADVANCED: 2,
  APPROACHING: 3,
  PEER_REVIEW: 4,
};

const THEORY_PROGRESS_LABELS = {
  [THEORY_PROGRESS.NOT_SUBMITTED]: { label: "Not Submitted", class: "secondary", icon: "dash" },
  [THEORY_PROGRESS.PLACED]: { label: "Placed", class: "info", icon: "1-circle-fill" },
  [THEORY_PROGRESS.ADVANCED]: { label: "Advanced", class: "warning", icon: "2-circle-fill" },
  [THEORY_PROGRESS.APPROACHING]: { label: "Approaching", class: "warning", icon: "3-circle-fill" },
  [THEORY_PROGRESS.PEER_REVIEW]: { label: "Peer Review!", class: "danger", icon: "exclamation-triangle-fill" },
};

/** Creates the progress indicator element for a theory */
function createTheoryProgressIndicator(theoryId, progress = THEORY_PROGRESS.NOT_SUBMITTED) {
  const progressInfo = THEORY_PROGRESS_LABELS[progress];

  // Create the visual progress track
  const $container = $("<div>", { class: "theory-progress-container" });

  // Progress dots
  const $track = $("<div>", { class: "theory-progress-track d-flex align-items-center justify-content-center gap-1" });

  for (let i = 1; i <= 4; i++) {
    const isActive = progress >= i;
    const isCurrent = progress === i;
    let dotClass = "theory-progress-dot";

    if (i === 4) {
      // Peer review dot is special
      dotClass += isActive ? " bg-danger" : " bg-secondary opacity-25";
    } else if (i === 2 || i === 3) {
      dotClass += isActive ? " bg-warning" : " bg-secondary opacity-25";
    } else {
      dotClass += isActive ? " bg-info" : " bg-secondary opacity-25";
    }

    if (isCurrent) {
      dotClass += " current";
    }

    $track.append($("<span>", { class: dotClass }));

    if (i < 3) {
      // Add connector line between dots
      const connectorClass = progress > i ? "theory-progress-connector active" : "theory-progress-connector";
      $track.append($("<span>", { class: connectorClass }));
    }
  }

  $container.append($track);

  // Status badge
  const $badge = $("<div>", {
    class: `badge bg-${progressInfo.class} mt-1 theory-progress-badge`,
    id: `${theoryId}-progress-badge`
  }).append(
    $("<i>", { class: `bi bi-${progressInfo.icon} me-1` }),
    progressInfo.label
  );

  $container.append($badge);

  return $container;
}

/** Updates the progress indicator for a theory */
function updateTheoryProgress(theoryId, progress) {
  const $cell = $(`#${theoryId}-progress`);
  $cell.empty().append(createTheoryProgressIndicator(theoryId, progress));
  $(`#${theoryId}`).attr("data-progress", progress);
}

/** Initializes the theories tracking table */
function initializeTheoriesTable(playerColors, numSectors) {
  // Add initial empty row
  addTheoryRow(playerColors, numSectors);

  // Set up advance theories button
  $("#advance-theories-btn").on("click", () => {
    advanceAllTheories();
  });
}

/** Advances all submitted theories one step toward peer review */
function advanceAllTheories() {
  let theoriesAdvanced = 0;

  $(".theory-row").each(function() {
    const $row = $(this);
    const theoryId = $row.attr("id");
    const currentProgress = parseInt($row.attr("data-progress") || "0");

    // Skip if not submitted or already at peer review
    if (currentProgress === THEORY_PROGRESS.NOT_SUBMITTED || currentProgress >= THEORY_PROGRESS.PEER_REVIEW) {
      return;
    }

    // Check if theory has required fields filled
    const hasPlayer = $row.find(`input[name="${theoryId}-player"]:checked`).length > 0;
    const hasSector = $(`#${theoryId}-sector`).val() !== "";
    const hasObject = $row.find(`input[name="${theoryId}-object"]:checked`).length > 0;

    if (!hasPlayer || !hasSector || !hasObject) {
      return; // Skip incomplete theories
    }

    // Advance the theory
    const newProgress = currentProgress + 1;
    updateTheoryProgress(theoryId, newProgress);
    theoriesAdvanced++;

    if (newProgress === THEORY_PROGRESS.PEER_REVIEW) {
      // Highlight the row
      $row.addClass("table-danger");
    }
  });

  // Remove the theory-phase-pending highlight since user clicked the button
  const $btn = $("#advance-theories-btn");
  $btn.removeClass("theory-phase-pending");

  // Show feedback
  if (theoriesAdvanced > 0) {
    // Brief visual feedback
    $btn.addClass("btn-success").removeClass("btn-primary");
    setTimeout(() => {
      $btn.addClass("btn-primary").removeClass("btn-success");
    }, 1000);
  }

  triggerAutoSave();
}

/** Adds a row to the theories table */
function addTheoryRow(playerColors, numSectors) {
  const theoryNum = theoriesCounter++;
  const theoryId = `theory${theoryNum}`;

  const theoryObjects = ["asteroid", "comet", "dwarf-planet", "gas-cloud"];

  $("#theories-body").append(
    $("<tr>", { id: theoryId, class: "theory-row", new: "true", "data-progress": "0" }).append(
      // Player column
      $("<td>").append(
        BootstrapHtml.radioButtonGroup(
          `${theoryId}-player`,
          playerColors.map((color) => ({
            value: color,
            attrs: { theory: theoryId },
            accent: PLAYER_COLORS[color],
            content: color.charAt(0).toUpperCase(),
          }))
        )
      ),
      // Sector column
      $("<td>").append(
        BootstrapHtml.dropdown(
          Array.fromRange(numSectors, (i) => i + 1),
          { id: `${theoryId}-sector`, onlyLabels: true, theory: theoryId }
        )
      ),
      // Object column
      $("<td>").append(
        BootstrapHtml.radioButtonGroup(
          `${theoryId}-object`,
          theoryObjects.map((obj) => ({
            value: obj,
            attrs: { theory: theoryId },
            content: createObjectImage(obj),
          })),
          { elementAccent: "secondary" }
        )
      ),
      // Progress column
      $("<td>", { id: `${theoryId}-progress`, class: "text-center" }).append(
        createTheoryProgressIndicator(theoryId, THEORY_PROGRESS.NOT_SUBMITTED)
      ),
      // Correct column (combined revealed + correct)
      $("<td>", { class: "text-center" }).append(
        $("<div>", { class: "btn-group btn-group-sm", role: "group" }).append(
          $("<input>", {
            type: "radio",
            class: "btn-check",
            name: `${theoryId}-result`,
            id: `${theoryId}-pending`,
            value: "pending",
            autocomplete: "off",
            checked: true,
            theory: theoryId,
          }),
          $("<label>", {
            class: "btn btn-outline-secondary",
            for: `${theoryId}-pending`,
            title: "Pending verification",
          }).append($("<i>", { class: "bi bi-hourglass-split" })),
          $("<input>", {
            type: "radio",
            class: "btn-check",
            name: `${theoryId}-result`,
            id: `${theoryId}-correct`,
            value: "correct",
            autocomplete: "off",
            theory: theoryId,
          }),
          $("<label>", {
            class: "btn btn-outline-success",
            for: `${theoryId}-correct`,
            title: "Correct!",
          }).append($("<i>", { class: "bi bi-check-lg" })),
          $("<input>", {
            type: "radio",
            class: "btn-check",
            name: `${theoryId}-result`,
            id: `${theoryId}-incorrect`,
            value: "incorrect",
            autocomplete: "off",
            theory: theoryId,
          }),
          $("<label>", {
            class: "btn btn-outline-danger",
            for: `${theoryId}-incorrect`,
            title: "Incorrect",
          }).append($("<i>", { class: "bi bi-x-lg" }))
        )
      )
    )
  );

  // Toggle white image variant for object selection
  toggleImageWhiteVariant(`input[name="${theoryId}-object"]`);

  // When theory details are filled in, auto-set progress to PLACED if still NOT_SUBMITTED
  $(`[theory="${theoryId}"]`).on("change", (_event) => {
    const $row = $(`#${theoryId}`);

    // Auto-add new row
    if ($row.attr("new")) {
      $row.attr("new", null);
      addTheoryRow(playerColors, numSectors);
    }

    // Auto-set progress to PLACED when all fields are filled
    const currentProgress = parseInt($row.attr("data-progress") || "0");
    if (currentProgress === THEORY_PROGRESS.NOT_SUBMITTED) {
      const hasPlayer = $row.find(`input[name="${theoryId}-player"]:checked`).length > 0;
      const hasSector = $(`#${theoryId}-sector`).val() !== "";
      const hasObject = $row.find(`input[name="${theoryId}-object"]:checked`).length > 0;

      if (hasPlayer && hasSector && hasObject) {
        updateTheoryProgress(theoryId, THEORY_PROGRESS.PLACED);
      }
    }

    // Update row styling based on result
    const result = $(`input[name="${theoryId}-result"]:checked`).val();
    $row.removeClass("table-success table-danger");
    if (result === "correct") {
      $row.addClass("table-success");
    } else if (result === "incorrect") {
      $row.addClass("table-danger");
    }

    triggerAutoSave();
  });
}

/** Starts the game by initializing the page with the given game settings. */
function startGame(gameSettings) {
  const { mode, playerColors } = gameSettings;

  const $gameSettings = $("#game-settings");
  if ($gameSettings.length === 0) return;

  const settings = MODE_SETTINGS[mode];
  if (settings == null) return;
  const numSectors = settings.numSectors;
  const objectSettings = settings.objects;

  // hide game selection buttons
  $gameSettings.addClass("d-none");

  // show reset buttons
  $("#reset-buttons").removeClass("d-none");
  // show board
  $("#board").removeClass("d-none");
  // add settings to url
  history.replaceState(null, "", getUrl(gameSettings));

  // initialize hints table
  const $head = $("#sectors-head");
  const $oppositeRow = $("#opposite-row");
  const $objectRows = $(".object-row");
  const $notesRow = $("#hints-notes-row");
  // number of objects
  $head.append($("<th>", { class: "small-col freeze-col col2" }).text("Count"));
  // opposite sector
  $oppositeRow.append($("<td>", { class: "freeze-col col2" }));
  // object counts
  $objectRows.forEach(($row) => {
    const object = $row.attr("object");
    const info = objectSettings[object];
    $row.append(
      $("<td>", {
        id: `${object}-count-cell`,
        class: "freeze-col col2",
      }).append(
        $("<span>", { id: `${object}-count` }).text("0"),
        ` / ${info.count}`
      )
    );
  });
  // notes for each sector
  $notesRow.append($("<td>", { class: "freeze-col col2" }));
  for (let i = 0; i < numSectors; i++) {
    const sector = i + 1;
    $head.append(
      $("<th>", { "data-sector": sector, class: "sector-head" }).text(
        `Sector ${sector}`
      )
    );
    // add the opposite sector number
    const opposite = ((i + numSectors / 2) % numSectors) + 1;
    $oppositeRow.append(
      $("<td>", { "data-sector": sector }).text(`Sector ${opposite}`)
    );
    // add hint button groups for each object row
    $objectRows.forEach(($row) => {
      const object = $row.attr("object");
      if (object === "comet") {
        // special case: only put hints in prime number sectors
        if (!isPrime(sector)) {
          $row.append($("<td>", { "data-sector": sector }));
          return;
        }
      }
      const hintName = `${object}-sector${sector}`;
      const extraAttrs = { hintName, object, sector };
      $row.append(
        $("<td>", {
          id: `${hintName}-cell`,
          class: "hint-cell",
          "data-sector": sector,
        }).append(
          BootstrapHtml.buttonGroup(
            [
              { hint: "no", accent: "danger", icon: "x-lg" },
              { hint: "suspect", accent: "info", icon: "exclamation-lg" },
              { hint: "yes", accent: "success", icon: "check-lg" },
            ].map(({ hint, accent, icon }) =>
              BootstrapHtml.toggleButton(
                `outline-${accent}`,
                BootstrapHtml.icon(icon),
                {
                  id: `${hintName}-${hint}`,
                  btnClass: "hint-btn",
                  ...extraAttrs,
                  hint,
                }
              )
            ),
            { divClass: "hint-btn-group", small: true, ...extraAttrs }
          )
        )
      );
    });
    // add notes textbox
    $notesRow.append(
      $("<td>", { "data-sector": sector }).append(
        BootstrapHtml.editable({ placeholder: "Notes" })
      )
    );
  }
  // freeze the second column
  updateHintsStickyColumns();
  // ensure correct widths after images/styles settle
  setTimeout(updateHintsStickyColumns, 0);
  $(window)
    .off("resize.hintsSticky")
    .on("resize.hintsSticky", updateHintsStickyColumns);

  // allow recentering the sectors by clicking a header
  // Track mousedown position to distinguish clicks from scroll drags
  let mouseDownPos = null;
  const DRAG_THRESHOLD = 5; // pixels of movement to consider it a drag

  $("#sectors-head")
    .off("mousedown.sectorShift")
    .on("mousedown.sectorShift", "th[data-sector]", (event) => {
      mouseDownPos = { x: event.clientX, y: event.clientY };
    });

  $("#sectors-head")
    .off("click.sectorShift", "th[data-sector]")
    .on("click.sectorShift", "th[data-sector]", (event) => {
      // Check if this was a drag (scroll) rather than a click
      if (mouseDownPos) {
        const dx = Math.abs(event.clientX - mouseDownPos.x);
        const dy = Math.abs(event.clientY - mouseDownPos.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          // This was a drag/scroll, not a click
          mouseDownPos = null;
          return;
        }
      }
      mouseDownPos = null;

      const sector = Number($(event.currentTarget).attr("data-sector"));
      if (Number.isFinite(sector)) {
        shiftHintsTableToCenter(sector);
      }
    });

  // logic rules
  $("#logic-rules-body").append(
    settings.rules.map(({ object, count, label, rule }) => {
      // parse rule in case it includes other object images
      const ruleCell = [];
      let prevIndex = 0;
      while (true) {
        const startIndex = rule.indexOf("<", prevIndex);
        if (startIndex === -1) {
          // no more tags
          ruleCell.push($("<span>").text(rule.slice(prevIndex)));
          break;
        }
        const endIndex = rule.indexOf(">", startIndex + 1);
        if (endIndex === -1) {
          // no end tag; assume the rest of the string is invalid
          ruleCell.push($("<span>").text(rule.slice(prevIndex)));
          break;
        }
        const object = rule.slice(startIndex + 1, endIndex);
        const isRuleIcon = object in objectSettings || object === "empty";
        if (!isRuleIcon) {
          // invalid object; leave as-is
          ruleCell.push($("<span>").text(rule.slice(startIndex, endIndex + 1)));
        } else {
          if (startIndex > prevIndex) {
            ruleCell.push($("<span>").text(rule.slice(prevIndex, startIndex)));
          }
          ruleCell.push(createObjectImage(object, { class: "small-object" }));
        }
        prevIndex = endIndex + 1;
      }

      return $("<tr>").append(
        $("<td>").append(createObjectImage(object)),
        $("<td>").text(count),
        $("<td>").text(label),
        $("<td>").append(ruleCell)
      );
    })
  );

  // populate points for each object (in final score calculator)
  for (const [object, { points }] of Object.entries(objectSettings)) {
    if (points == null) continue;
    $(`#${object}-per-points`).text(points);
  }

  // initialize conference notes table
  const topicOptions = ["Asteroids", "Comets", "Dwarf Planets", "Gas Clouds"];
  $("#research-body").append(
    settings.conferences.map((conf) =>
      $("<tr>", { id: `conference-${conf.name}-row`, "data-threshold": conf.threshold }).append(
        $("<th>", { scope: "row" }).html(`${conf.name} <span class="text-muted small">(at time ${conf.threshold})</span>`),
        $("<td>").append(
          $("<div>", { class: "row gx-2" }).append(
            $("<div>", { class: "col-auto col-form-label" }).text("Planet X &"),
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown(topicOptions, { onlyLabels: true })
            )
          )
        ),
        $("<td>").append(BootstrapHtml.editable({ placeholder: "Notes" }))
      )
    )
  );

  // initialize theories table
  initializeTheoriesTable(playerColors, numSectors);

  // set the global settings
  Object.assign(currentGameSettings, gameSettings);

  // initialize moves table
  addMoveRow();

  // initialize circular board
  // Use a small timeout to ensure the board container has proper dimensions
  setTimeout(() => {
    initializeCircularBoard(numSectors);
    hookCircularBoardToHints();
  }, 100);
}

const MOVE_ROW_CLASS = "move-row";

let movesCounter = 0;
/** Adds a row to the moves table. */
function addMoveRow() {
  const numSectors = MODE_SETTINGS[currentGameSettings.mode].numSectors;

  const RESEARCH_DEFAULT_ACCENT = "primary";
  const RESEARCH_OUTLINE_CLASSES = {
    seen: "btn-outline-secondary",
    notSeen: `btn-outline-${RESEARCH_DEFAULT_ACCENT}`,
  };

  const moveNum = movesCounter++;
  const moveId = `move${moveNum}`;
  const timeCostId = `${moveId}-time`;
  const playerRadioName = `${moveId}-player`;
  const actionSelectId = `${moveId}-action`;
  const actionGroupId = `${actionSelectId}-group`;
  const actionArgsClass = `${actionSelectId}-args`;
  const surveyObjectRadioName = `${actionSelectId}-survey-object`;
  const surveySectorStartSelectId = `${actionSelectId}-survey-sector-start`;
  const surveySectorEndSelectId = `${actionSelectId}-survey-sector-end`;
  $("#moves-body").append(
    $("<tr>", {
      id: moveId,
      class: MOVE_ROW_CLASS,
      moveNum: moveNum,
      new: "true",
    }).append(
      $("<td>").append(
        $("<div>", { class: "col-form-label" }).text(moveNum + 1)
      ),
      // player column
      $("<td>").append(
        BootstrapHtml.radioButtonGroup(
          playerRadioName,
          currentGameSettings.playerColors.map((color) => {
            return {
              value: color,
              attrs: { move: moveId },
              accent: PLAYER_COLORS[color],
              content: color.charAt(0).toUpperCase(),
            };
          })
        )
      ),
      // action column
      $("<td>").append(
        // do "mt-2" on the args divs so that there is no bottom space if they
        // are hidden (doing "mb-2" here will cause a space)
        $("<div>", { class: "row gx-2" }).append(
          $("<div>", { class: "col" }).append(
            BootstrapHtml.radioButtonGroup(
              actionSelectId,
              [
                { value: "survey", content: "Survey" },
                { value: "target", content: "Target" },
                { value: "research", content: "Research" },
                { value: "locate", content: "Locate Planet X" },
              ].map((action) => ({ ...action, attrs: { move: moveId } })),
              {
                id: actionGroupId,
                divClass: "action-btn-row",
                elementAccent: "secondary",
              }
            ),
            $("<div>", {
              id: `${actionSelectId}-feedback`,
              class: "invalid-feedback",
            })
          ),
          $("<div>", {
            id: timeCostId,
            class: "col-auto col-form-label d-none",
          }).append(
            "+",
            $("<span>", { id: `${timeCostId}-num`, class: "me-1" }),
            createObjectImage("time", { class: "time" })
          )
        ),
        // survey args
        $("<div>", {
          class: `${actionArgsClass} mt-2 d-none`,
          action: "survey",
        }).append(
          $("<div>", { class: "mb-2" }).append(
            BootstrapHtml.radioButtonGroup(
              surveyObjectRadioName,
              [
                "asteroid",
                "dwarf-planet",
                "comet",
                "gas-cloud",
                "truly-empty",
              ].map((object) => {
                return {
                  value: object,
                  content: createObjectImage(object),
                };
              }),
              { elementAccent: "secondary", elementClass: "" }
            )
          ),
          $("<div>", { class: "row gx-2 align-items-center" }).append(
            $("<div>", { class: "col-auto" }).text("Sector"),
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown(
                Array.fromRange(numSectors, (index) => index + 1),
                { id: surveySectorStartSelectId, onlyLabels: true }
              )
            ),
            $("<div>", { class: "col-auto" }).text("to"),
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown([], { id: surveySectorEndSelectId })
            )
          )
        ),
        // target args
        $("<div>", {
          class: `${actionArgsClass} row gx-2 align-items-center mt-2 d-none`,
          action: "target",
        }).append(
          $("<div>", { class: "col-auto" }).text("Sector"),
          $("<div>", { class: "col-auto" }).append(
            BootstrapHtml.dropdown(
              Array.fromRange(numSectors, (index) => index + 1),
              { onlyLabels: true }
            )
          )
        ),
        // research args
        $("<div>", {
          class: `${actionArgsClass} mt-2 d-none`,
          action: "research",
        }).append(
          BootstrapHtml.radioButtonGroup(
            `${actionSelectId}-research-area`,
            MODE_SETTINGS[currentGameSettings.mode].research,
            { onlyValues: true, elementAccent: RESEARCH_DEFAULT_ACCENT }
          )
        )
      ),
      // notes column
      $("<td>").append(
        // would be nice to make this "height: 100%" so that it expanded if any
        // action args came up, but it doesn't work for some reason
        BootstrapHtml.editable({ placeholder: "Notes" })
      )
    )
  );

  function getSelectedOption($select) {
    // `$select.val()` doesn't work with disabled options, so loop manually
    let selected = null;
    // use `.find()` in case the select is using groups
    $select.find("option").forEach(($option) => {
      if ($option.attr("default")) return;
      if ($option.prop("selected")) {
        selected = $option.attr("value");
        return false;
      }
    });
    return selected;
  }

  function getSelectedAction($scope = $(`#${moveId}`), name = actionSelectId) {
    return getSelectedRadio(name, $scope);
  }

  function setTimeCost(cost = null) {
    const $cost = $(`#${timeCostId}`);
    if (!cost) {
      $cost.addClass("d-none");
    } else {
      $cost.removeClass("d-none");
      $(`#${timeCostId}-num`).text(cost);
    }
  }

  function surveyCostFormula(numSectorsSurveyed) {
    return 4 - Math.floor((numSectorsSurveyed - 1) / 3);
  }

  function calcSurveyCost({
    start = undefined,
    end = undefined,
    setText = false,
  } = {}) {
    if (start === undefined) {
      start = getSelectedOption($(`#${surveySectorStartSelectId}`));
    }
    if (end === undefined) {
      end = getSelectedOption($(`#${surveySectorEndSelectId}`));
    }
    if (start == null || end == null) {
      if (setText) setTimeCost();
      return null;
    }
    start = Number(start);
    end = Number(end);
    if (end < start) {
      // wrap-around
      end += numSectors;
    }
    const numSectorsSurveyed = end - start + 1;
    const cost = surveyCostFormula(numSectorsSurveyed);
    if (setText) setTimeCost(cost);
    return cost;
  }

  function updatePlayerResearches() {
    const moveRows = [];
    $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
      const moveId = $row.getId();
      const moveNum = Number($row.attr("moveNum"));
      // find selected player
      const player = $row
        .find(`input[name="${moveId}-player"]:checked`)
        .attr("value");
      if (player == null) return;
      const $researchAreas = $row.find(
        `input[name="${moveId}-action-research-area"]`
      );
      moveRows.push({
        moveNum,
        $row,
        player,
        $researchAreas,
      });
    });

    moveRows.sort((a, b) => a.moveNum - b.moveNum);

    const playerResearches = {};
    for (const { $row, player, $researchAreas } of moveRows) {
      if (!(player in playerResearches)) {
        playerResearches[player] = new Set();
      }
      const researched = playerResearches[player];
      let selectedResearch = null;
      $researchAreas.forEach(($input) => {
        const inputId = $input.getId();
        const area = $input.attr("value");
        const seen = researched.has(area);
        const $label = $row.find(`#${inputId}-label`);
        $label.text(
          seen ? $label.text().toLowerCase() : $label.text().toUpperCase()
        );
        $label.chooseClass(RESEARCH_OUTLINE_CLASSES, seen ? "seen" : "notSeen");
        if ($input.prop("checked")) {
          selectedResearch = area;
        }
      });
      if (selectedResearch != null) {
        playerResearches[player].add(selectedResearch);
      }
    }
  }

  function updateTimeTrack() {
    // Calculate cumulative time for each player from move rows
    const playerTimes = {};
    for (const color of currentGameSettings.playerColors) {
      playerTimes[color] = 0;
    }

    $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
      const moveId = $row.getId();
      // Find selected player
      const player = $row
        .find(`input[name="${moveId}-player"]:checked`)
        .attr("value");
      if (player == null) return;

      // Get the time cost for this move
      const $timeCostNum = $row.find(`#${moveId}-time-num`);
      const timeCost = parseInt($timeCostNum.text()) || 0;

      if (player in playerTimes) {
        playerTimes[player] += timeCost;
      }
    });

    // Find player furthest behind (lowest time = next turn)
    let minTime = Infinity;
    let nextPlayer = null;
    for (const color of currentGameSettings.playerColors) {
      if (playerTimes[color] < minTime) {
        minTime = playerTimes[color];
        nextPlayer = color;
      }
    }

    // Update display with both cumulative time and wrapped position
    const $display = $("#time-track-display");
    $display.empty();
    
    // Determine track size based on mode
    const mode = currentGameSettings.mode;
    const trackSize = mode === "standard" ? 12 : 18;

    for (const color of currentGameSettings.playerColors) {
      const time = playerTimes[color];
      const position = getTrackPosition(time, trackSize);
      const isNext = color === nextPlayer;
      const accent = PLAYER_COLORS[color];
      const $badge = $("<span>", {
        class: `badge bg-${accent} me-2 ${isNext ? "border border-dark border-2" : ""}`,
        title: `Track wraps at ${trackSize}. Current lap position: ${position}, Total time spent: ${time}`,
      }).text(`${color.charAt(0).toUpperCase()}: ${time} (pos ${position}/${trackSize})`);
      $display.append($badge);
    }

    // Update current turn indicator
    const $turnDisplay = $("#current-turn-display");
    if (nextPlayer) {
      $turnDisplay.html(
        `Next turn: <strong class="text-${PLAYER_COLORS[nextPlayer]}">${nextPlayer.toTitleCase()}</strong> (lowest time: ${minTime})`
      );
    } else {
      $turnDisplay.text("");
    }

    // Check for conference triggers
    const maxTime = Math.max(...Object.values(playerTimes));
    const conferences = MODE_SETTINGS[currentGameSettings.mode].conferences;
    for (const conf of conferences) {
      const $confRow = $(`#conference-${conf.name}-row`);
      const triggered = maxTime >= conf.threshold;
      // Highlight conference row if triggered
      $confRow.toggleClass("table-warning", triggered);
      // Update the header text to show threshold
      const $header = $confRow.find("th");
      if (triggered && !$header.text().includes("TRIGGERED")) {
        $header.html(`${conf.name} <span class="badge bg-warning text-dark">TRIGGERED @ ${conf.threshold}</span>`);

        // Show conference alert (only once per conference)
        const conferenceKey = `conference-${conf.name}-shown`;
        if (!sessionStorage.getItem(conferenceKey)) {
          sessionStorage.setItem(conferenceKey, 'true');
          showConferenceAlert(conf.name, conf.threshold);
        }
      } else if (!triggered) {
        $header.html(`${conf.name} <span class="text-muted small">(at time ${conf.threshold})</span>`);
      }
    }

    // Update circular board with player positions and auto-rotate visible sky
    if (typeof updateCircularBoardPlayers === "function") {
      const { theorySectorsTriggered } = updateCircularBoardPlayers(
        playerTimes,
        nextPlayer,
        minTime
      );

      // Check for theory phase triggers
      const newTheorySectors = [];
      (theorySectorsTriggered || []).forEach((sector) => {
        const theoryKey = `theory-sector-${sector}-shown`;
        if (!sessionStorage.getItem(theoryKey)) {
          sessionStorage.setItem(theoryKey, "true");
          newTheorySectors.push(sector);
        }
      });
      if (newTheorySectors.length > 0) {
        enqueueTheoryPhases(newTheorySectors);
      }
    }

    // Auto-save on move changes
    triggerAutoSave();
  }

  // only includes the player and action selections (not notes)
  $(`[move="${moveId}"]`).on("change", (_event) => {
    // if this is a new row, add another row since this one is now changed
    const $row = $(`#${moveId}`);
    if ($row.attr("new")) {
      if (skyMapLockedRowId === moveId) {
        // defer row creation until sky map selection completes
      } else {
        $row.attr("new", null);
        // add a new row after this one
        addMoveRow();
      }
    }

    // calculate the time cost for this action
    const currAction = getSelectedAction($row);
    if (currAction != null) {
      let cost = null;
      if (currAction === "survey") {
        cost = calcSurveyCost();
      } else if (currAction === "target") {
        cost = 4;
      } else if (currAction === "research") {
        cost = 1;
      } else if (currAction === "locate") {
        cost = 5;
      }
      setTimeCost(cost);
    }

    // validate all moves
    const playerMoves = {};
    $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
      if ($row.prop("new")) return;
      const moveId = $row.getId();
      const moveNum = Number($row.attr("moveNum"));
      // find selected player
      const player = $row
        .find(`input[name="${moveId}-player"]:checked`)
        .attr("value");
      if (player == null) return;
      // find selected action (can be null)
      const actionId = `${moveId}-action`;
      const $actionGroup = $row.find(`#${actionId}-group`);
      const $actionInputs = $row.find(`input[name="${actionId}"]`);
      const $actionFeedback = $(`#${actionId}-feedback`);
      const action = getSelectedAction($row, actionId);
      // save this player's move
      if (!(player in playerMoves)) {
        playerMoves[player] = [];
      }
      playerMoves[player].push({
        moveNum,
        $actionGroup,
        $actionInputs,
        $actionFeedback,
        action,
      });
    });
    for (const [player, moves] of Object.entries(playerMoves)) {
      const playerTitle = player.toTitleCase();
      const ordered = moves.sort((a, b) => a.moveNum - b.moveNum);
      let numTargets = 0;
      let lastAction = null;
      for (const { $actionGroup, $actionInputs, $actionFeedback, action } of ordered) {
        $actionGroup.removeClass("is-invalid");
        $actionFeedback.text("");
        $actionInputs.prop("disabled", false);
        if (lastAction === "research") {
          // cannot research two times in a row
          if (action === "research") {
            $actionGroup.addClass("is-invalid");
            $actionFeedback.text(
              `Player ${playerTitle}: Cannot research two times in a row`
            );
          }
          // disable
          $actionInputs
            .filter('[value="research"]')
            .prop("disabled", true);
        }
        if (numTargets >= 2) {
          if (action === "target") {
            // cannot target more than two times
            $actionGroup.addClass("is-invalid");
            $actionFeedback.text(
              `Player ${playerTitle}: Cannot target more than two times`
            );
          }
          // disable
          $actionInputs
            .filter('[value="target"]')
            .prop("disabled", true);
        }
        lastAction = action;
        if (action === "target") {
          numTargets++;
        }
      }
    }

    updatePlayerResearches();
    updateTimeTrack();
  });

  // when the action is changed, show its args
  $(`input[name="${actionSelectId}"]`).on("change", (_event) => {
    const action = getSelectedAction();
    // hide all the other args
    $(`.${actionArgsClass}`).forEach(($args) => {
      $args.toggleClass("d-none", $args.attr("action") !== action);
    });
  });

  // survey args
  const surveyObjectRadioSelector = `input[name="${surveyObjectRadioName}"]`;
  toggleImageWhiteVariant(surveyObjectRadioSelector);
  $(surveyObjectRadioSelector).on("change", (_event) => {
    const isComet = $(`${surveyObjectRadioSelector}[value="comet"]`).prop(
      "checked"
    );

    const $startSelect = $(`#${surveySectorStartSelectId}`);

    $startSelect.find("option").forEach(($option) => {
      if ($option.attr("default")) return;
      if (isComet) {
        // disable non-prime numbers
        if (!isPrime(Number($option.attr("value")))) {
          $option.prop("disabled", true);
        }
      } else {
        // un-disable everything
        $option.prop("disabled", false);
      }
    });

    if (getSelectedOption($startSelect) != null) {
      // if nothing was selected yet, just leave it
      // otherwise, trigger a change to update the end sector select
      $startSelect.trigger("change");
    }
  });
  $(`#${surveySectorStartSelectId}`).on("change", (_event) => {
    const isComet = $(`${surveyObjectRadioSelector}[value="comet"]`).prop(
      "checked"
    );

    const $startSelect = $(`#${surveySectorStartSelectId}`);
    const startValue = getSelectedOption($startSelect);
    const $endSelect = $(`#${surveySectorEndSelectId}`);

    const sectors = [];
    let invalidIsSelected = false;
    if (startValue != null) {
      const startSector = Number(startValue);
      const endValue = getSelectedOption($endSelect);
      const endSector = endValue != null ? Number(endValue) : null;

      // mark as invalid if not a prime number
      $startSelect.toggleClass("is-invalid", isComet && !isPrime(startSector));

      // can end in the same sector
      // limited by the visible sky (at most half of the sectors)
      for (let i = 0; i < numSectors / 2; i++) {
        const sectorNum = ((startSector - 1 + i) % numSectors) + 1;
        const selected = sectorNum === endSector;
        const sectorOption = {
          label: sectorNum,
          selected: selected,
        };
        if (isComet && !isPrime(sectorNum)) {
          // disable it
          sectorOption.disabled = true;
          if (selected) {
            invalidIsSelected = true;
          }
        }
        sectors.push(sectorOption);
      }
    }

    // recreate the end sector select
    const sectorGroups = [];
    for (let i = 0; i < sectors.length; i += 3) {
      const group = sectors.slice(i, i + 3);
      sectorGroups.push({
        isGroup: true,
        label: `+${surveyCostFormula(i + 1)} time`,
        elements: group,
      });
    }
    $endSelect.replaceWith(
      BootstrapHtml.dropdown(sectorGroups, { id: surveySectorEndSelectId })
    );

    calcSurveyCost({ start: startValue, setText: true });
    updateTimeTrack(); // Update position display immediately when sector changes

    const $newEndSelect = $(`#${surveySectorEndSelectId}`);
    $newEndSelect.toggleClass("is-invalid", invalidIsSelected);
    $newEndSelect.on("change", (_event) => {
      const isComet = $(`${surveyObjectRadioSelector}[value="comet"]`).prop(
        "checked"
      );

      const $endSelect = $(`#${surveySectorEndSelectId}`);
      const endValue = getSelectedOption($endSelect);
      if (endValue == null) return;
      const endSector = Number(endValue);

      calcSurveyCost({ end: endSector, setText: true });
      updateTimeTrack(); // Update position display immediately when sector changes

      // mark as invalid if not a prime number
      $endSelect.toggleClass("is-invalid", isComet && !isPrime(endSector));
    });
  });

  // research args
  $(`input[name="${moveId}-action-research-area"]`).on("input", (_event) => {
    updatePlayerResearches();
    updateTimeTrack();
  });
}

/** Parses the URL for the game settings. */
function parseUrl() {
  const urlArgs = new URLSearchParams(document.location.search);
  let allArgsValid = true;
  const settings = {};
  for (const [key, name] of Object.entries(GAME_SETTINGS)) {
    const value = urlArgs.get(key);
    if (value == null || value === "") {
      allArgsValid = false;
      continue;
    }
    if (key === "playerColors") {
      // special handling
      const colors = Object.fromEntries(
        Object.keys(PLAYER_COLORS).map((color) => [
          color.charAt(0).toLowerCase(),
          color,
        ])
      );
      const seenColors = [];
      let playerIndex = 1;
      for (let i = 0; i < value.length; i++) {
        const char = value.charAt(i).toLowerCase();
        const color = colors[char];
        if (color == null) continue;
        if (seenColors.includes(color)) continue;
        // add player color
        $(`#player-${playerIndex++}-color`).append($(`#${color}-player`));
        seenColors.push(color);
      }
      if (seenColors.length === 0) {
        // don't save the value
        allArgsValid = false;
      } else {
        // save the colors
        settings[key] = seenColors;
        if (seenColors.length < 2) {
          // don't have enough colors to be valid
          allArgsValid = false;
        }
      }
    } else {
      let valueFound = false;
      $(`input[name="${name}"]`).forEach(($input) => {
        // use weak inequality for numbers
        if ($input.val() == value) {
          $input.prop("checked", true);
          valueFound = true;
          return false;
        }
      });
      if (!valueFound) {
        // don't save the value
        allArgsValid = false;
      } else {
        settings[key] = value;
      }
    }
  }
  // set proper url args
  history.replaceState(null, "", getUrl(settings));
  return allArgsValid;
}

$(() => {
  // initialize mode choice
  const modeAccents = { standard: "primary", expert: "danger" };
  $("#game-mode-group").append(
    BootstrapHtml.radioButtonGroup(
      GAME_SETTINGS.mode,
      Object.entries(MODE_SETTINGS).map(([mode, settings]) => {
        const numSectors = Object.values(settings.objects).reduce(
          (total, { count }) => total + count,
          0
        );
        // cache this value
        MODE_SETTINGS[mode].numSectors = numSectors;
        return {
          id: `${mode}-mode`,
          value: mode,
          accent: modeAccents[mode],
          content: `${mode.toTitleCase()} (${numSectors} sectors)`,
        };
      }),
      { divClass: "dynamic-vertical-btn-group" }
    )
  );
  // initialize player colors choice
  const notInPlayId = "player-color-not-in-play";
  const dropzoneClass = "player-color-dropzone";
  const playerColorAccents = Object.entries(PLAYER_COLORS);
  $("#player-colors-group").append(
    $("<div>").text(
      "Drag the colors to each player. This order defines starting turn order."
    ),
    $("<div>", { class: "row" }).append(
      $("<div>", { class: "col-auto" }).text("Not in play"),
      $("<div>", {
        id: notInPlayId,
        class: `col ${dropzoneClass}`,
      }).append(
        playerColorAccents.map(([color, accent]) =>
          $("<span>", {
            id: `${color}-player`,
            class: `badge bg-${accent} me-1`,
            color,
            draggable: true,
          }).text(color.toTitleCase())
        )
      )
    ),
    Array.fromRange(playerColorAccents.length, (index) =>
      $("<div>", { class: "row" }).append(
        $("<div>", { class: "col-auto" }).text(`Player ${index + 1}`),
        $("<div>", {
          id: `player-${index + 1}-color`,
          class: `col ${dropzoneClass} ${GAME_SETTINGS.playerColors}`,
          player: index + 1,
        })
      )
    )
  );
  // allow dragging the colors
  $("[draggable]").on("dragstart", (event) => {
    const $badge = $(event.target);
    const dragEvent = event.originalEvent;
    dragEvent.dataTransfer.setData("text/plain", $badge.getId());
    dragEvent.effectAllowed = "move";
  });
  function allowDrop($zone) {
    return $zone.getId() === notInPlayId || $zone.children().length === 0;
  }
  $(`.${dropzoneClass}`).on({
    dragenter: (event) => {
      const $zone = $(event.currentTarget);
      if (!allowDrop($zone)) return;
      event.preventDefault();
      const dragEvent = event.originalEvent;
      dragEvent.dataTransfer.dropEffect = "move";
      $zone.addClass("bg-secondary-subtle");
    },
    dragover: (event) => {
      const $zone = $(event.currentTarget);
      if (allowDrop($zone)) {
        event.preventDefault();
      }
    },
    dragleave: (event) => {
      const $zone = $(event.currentTarget);
      $zone.removeClass("bg-secondary-subtle");
    },
    drop: (event) => {
      event.preventDefault();
      const $zone = $(event.currentTarget);
      const dragEvent = event.originalEvent;
      const badgeId = dragEvent.dataTransfer.getData("text/plain");
      $zone.removeClass("bg-secondary-subtle");
      $zone.append($(`#${badgeId}`));
    },
  });

  // Touch support for mobile devices
  let touchDragState = null;

  function getDropzoneAtPoint(x, y) {
    const dropzones = $(`.${dropzoneClass}`).toArray();
    for (const zone of dropzones) {
      const rect = zone.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return $(zone);
      }
    }
    return null;
  }

  $("[draggable]").on({
    touchstart: (event) => {
      const $badge = $(event.target).closest("[draggable]");
      if ($badge.length === 0) return;

      const touch = event.originalEvent.touches[0];
      const rect = $badge[0].getBoundingClientRect();

      // Create a clone for visual feedback
      const $clone = $badge.clone();
      $clone.attr("id", "touch-drag-clone");
      $clone.css({
        position: "fixed",
        left: rect.left,
        top: rect.top,
        zIndex: 1000,
        opacity: 0.8,
        pointerEvents: "none",
      });
      $("body").append($clone);

      touchDragState = {
        $badge,
        $clone,
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
        $currentZone: null,
      };

      $badge.css("opacity", 0.4);
      event.preventDefault();
    },
    touchmove: (event) => {
      if (!touchDragState) return;

      const touch = event.originalEvent.touches[0];
      const { $clone, offsetX, offsetY } = touchDragState;

      // Move clone with touch
      $clone.css({
        left: touch.clientX - offsetX,
        top: touch.clientY - offsetY,
      });

      // Highlight dropzone under touch
      const $zone = getDropzoneAtPoint(touch.clientX, touch.clientY);

      // Remove highlight from previous zone
      if (touchDragState.$currentZone && (!$zone || $zone[0] !== touchDragState.$currentZone[0])) {
        touchDragState.$currentZone.removeClass("bg-secondary-subtle");
      }

      // Add highlight to current zone if allowed
      if ($zone && allowDrop($zone)) {
        $zone.addClass("bg-secondary-subtle");
        touchDragState.$currentZone = $zone;
      } else {
        touchDragState.$currentZone = null;
      }

      event.preventDefault();
    },
    touchend: (event) => {
      if (!touchDragState) return;

      const { $badge, $clone, $currentZone } = touchDragState;

      // Remove clone
      $clone.remove();
      $badge.css("opacity", "");

      // Drop into zone if valid
      if ($currentZone && allowDrop($currentZone)) {
        $currentZone.removeClass("bg-secondary-subtle");
        $currentZone.append($badge);
      }

      touchDragState = null;
      event.preventDefault();
    },
  });

  // initialize difficulty choice
  $("#difficulty-group").append(
    BootstrapHtml.radioButtonGroup(
      GAME_SETTINGS.difficulty,
      Object.entries(DIFFICULTY_START_HINTS).map(([level, numFacts]) => {
        return {
          value: level,
          content: `${level.toTitleCase()} (${numFacts} facts)`,
        };
      }),
      { divClass: "dynamic-vertical-btn-group", elementAccent: "secondary" }
    )
  );

  // change button groups to vertical when the screen is small
  $(window)
    .on("resize", (event) => {
      const $btnGroups = $(".dynamic-vertical-btn-group");
      if ($btnGroups.length === 0) {
        // no longer choosing game settings
        $(window).off(event);
        return;
      }
      $btnGroups.chooseClass(
        { regular: "btn-group", vertical: "btn-group-vertical" },
        window.matchMedia("(min-width: 800px)").matches ? "regular" : "vertical"
      );
    })
    .trigger("resize");

  function getGameSettings() {
    let invalid = false;
    const settings = Object.fromEntries(
      Object.entries(GAME_SETTINGS).map(([key, name]) => {
        let value = null;
        if (key === "playerColors") {
          // special handling
          const players = [];
          $(`.${name}`).forEach(($player) => {
            const player = Number($player.attr("player"));
            const color = $player.find("span").attr("color");
            if (color != null) {
              players.push({ player, color });
            }
          });
          value = players
            .sort((a, b) => a.player - b.player)
            .map(({ color }) => color);
          if (value.length < 1) invalid = true;
        } else {
          $(`input[name="${name}"]`).forEach(($input) => {
            if ($input.prop("checked")) {
              value = $input.val();
              return false;
            }
          });
          if (value == null) invalid = true;
        }
        return [key, value];
      })
    );
    return [invalid, settings];
  }

  $("#start-game-btn").on("click", (event) => {
    const [invalid, settings] = getGameSettings();
    if (invalid) return;

    // Clear any existing saved state since we're starting fresh
    const isResume = event.isResume;
    if (!isResume) {
      clearGameState();
    }

    startGame(settings);

    // Initialize undo/redo buttons
    updateUndoRedoButtons();

    // Capture initial state for undo history after a short delay
    // (to ensure the game is fully initialized)
    if (!isResume) {
      setTimeout(() => {
        const initialState = getCurrentState();
        if (initialState) {
          undoStack.push(initialState);
          updateUndoRedoButtons();
        }
      }, 300);
    }

    // Use global auto-save
    const autoSave = triggerAutoSave;

    // new game button
    $("#new-game-btn")
      .off("click.newgame")
      .on("click.newgame", (_event) => {
      if (!confirm("Are you sure you want to start a new game?")) return;
      clearGameState();
      resetGameUI({ showSettings: true });
      });
    // reset button
    $("#reset-btn")
      .off("click.reset")
      .on("click.reset", (_event) => {
      if (!confirm("Are you sure you want to reset the game?")) return;
      const settings = {
        ...currentGameSettings,
        playerColors: [...currentGameSettings.playerColors],
      };
      clearGameState();
      resetGameUI({ showSettings: false });
      startGame(settings);
      });

    // update hints table whenever a hint is changed
    function isActive($button) {
      return $button.hasClass("active");
    }
    function setHintActive($button, active) {
      $button.toggleClass("active", active);
      $button.attr("aria-pressed", active ? "true" : "false");
    }

    // Returns: true (yes/confirmed), false (no/ruled out), "suspect" (suspected), null (blank)
    function getHintValue(hintName) {
      if (isActive($(`#${hintName}-yes`))) return true;
      if (isActive($(`#${hintName}-no`))) return false;
      if (isActive($(`#${hintName}-suspect`))) return "suspect";
      return null;
    }

    function getHintValues(attrs = {}) {
      const attrsFilterStr = Object.entries(attrs)
        .map(([key, value]) => `[${key}="${value}"]`)
        .join("");
      let numHints = 0;
      const hintsValues = {};
      const hintsByValue = { yes: [], no: [], suspect: [], blank: [] };
      $(`.hint-btn-group${attrsFilterStr}`).forEach(($element) => {
        const hintName = $element.attr("hintName");
        if (hintName in hintsValues) return;
        const value = getHintValue(hintName);
        let addToKey;
        if (value === true) addToKey = "yes";
        else if (value === false) addToKey = "no";
        else if (value === "suspect") addToKey = "suspect";
        else addToKey = "blank";
        numHints++;
        hintsValues[hintName] = value;
        hintsByValue[addToKey].push(hintName);
      });
      return { numHints, hints: hintsValues, ...hintsByValue };
    }

    const BG_COLOR_CLASSES = {
      success: "table-success",
      danger: "table-danger",
      warning: "table-warning",
      info: "table-info",
      disabled: "table-secondary",
    };
    const TEXT_COLOR_CLASSES = {
      success: "text-success",
      danger: "text-danger",
      warning: "text-warning",
      info: "text-info",
    };
    $(".hint-btn").on({
      activate: (event) => {
        const $hintBtn = $(event.currentTarget);
        setHintActive($hintBtn, true);
        // deactivate the other one
        const hintName = $hintBtn.attr("hintName");
        const hint = $hintBtn.attr("hint");
        $(`.hint-btn[hintName="${hintName}"]:not([hint="${hint}"])`).trigger(
          "deactivate"
        );
      },
      deactivate: (event) => {
        const $hintBtn = $(event.currentTarget);
        setHintActive($hintBtn, false);
      },
      toggleActive: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.trigger(isActive($hintBtn) ? "deactivate" : "activate");
      },
      click: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.trigger("toggleActive");

        const clickedHint = $hintBtn.attr("hint");
        const clickedHintName = $hintBtn.attr("hintName");
        const sector = $hintBtn.attr("sector");
        const isNowActive = isActive($hintBtn);

        // AUTO-MARK: When clicking "yes" (confirming an object), mark all
        // OTHER objects in that sector as "no" since only one thing can
        // be in each sector. This happens before autoSave so it's all
        // grouped into a single undo action.
        if (clickedHint === "yes" && isNowActive) {
          // Get all hint buttons in this sector and mark the non-confirmed ones as "no"
          $(`.hint-btn[sector="${sector}"]`).forEach(($btn) => {
            const btnHintName = $btn.attr("hintName");
            const btnHint = $btn.attr("hint");
            // Skip the button we just clicked (it's already set to "yes")
            if (btnHintName === clickedHintName) return;
            // Skip buttons that are already "no"
            if (btnHint === "no" && isActive($btn)) return;
            // Mark as "no" if not already
            if (btnHint === "no") {
              $btn.trigger("activate");
            } else if (isActive($btn)) {
              // Deactivate any "suspect" or other states
              $btn.trigger("deactivate");
              // Then activate the "no" button for this hint
              $(`#${btnHintName}-no`).trigger("activate");
            } else {
              // Not active, just activate the "no" button
              $(`#${btnHintName}-no`).trigger("activate");
            }
          });
        }

        // update the hint cell colors for this object (must be within a limit)
        const object = $hintBtn.attr("object");
        const objectHints = getHintValues({ object });
        const numYesObjects = objectHints.yes.length;
        // "suspect" and "blank" are both possibilities (not confirmed, not ruled out)
        const numPossibleObjects = objectHints.blank.length + objectHints.suspect.length;
        // update count text and cell color
        const limit =
          MODE_SETTINGS[currentGameSettings.mode].objects[object].count;
        let cellClass = null;
        let countClass = null;
        if (numYesObjects === limit) {
          cellClass = "success";
          countClass = "success";
        } else if (numYesObjects > limit) {
          cellClass = "danger";
          countClass = "danger";
          // TODO: highlight red because too many checked for this object
          //   would run into issue of not knowing how to reset cells in other
          //   columns: each column would have to be checked to understand its
          //   state, which would be checking the entire table. that's _okay_,
          //   but not ideal.
        } else if (numYesObjects + numPossibleObjects === limit) {
          // exactly enough buttons left to fulfill the limit
          cellClass = "success";
        } else if (numYesObjects + numPossibleObjects < limit) {
          // not enough buttons left to fulfill the limit
          cellClass = "danger";
        }
        $(`#${object}-count-cell`).chooseClass(BG_COLOR_CLASSES, cellClass);
        $(`#${object}-count`)
          .text(numYesObjects)
          .chooseClass(TEXT_COLOR_CLASSES, countClass);

        // If all instances of this object are confirmed, mark the rest as "no"
        if (numYesObjects === limit) {
          for (const [hintName, value] of Object.entries(objectHints.hints)) {
            if (value === true) continue;
            const $noBtn = $(`#${hintName}-no`);
            if ($noBtn.length && !isActive($noBtn)) {
              $noBtn.trigger("activate");
            }
          }
        }

        // update the hint cell colors for this sector (must be exactly one
        // object per sector)
        const sectorHints = getHintValues({ sector });
        const numYesSectors = sectorHints.yes.length;
        // "suspect" and "blank" are both possibilities
        const numPossibleSectors = sectorHints.blank.length + sectorHints.suspect.length;
        if (numYesSectors + numPossibleSectors === 0) {
          // entire sector is marked as "no", which is bad
          for (const hintName of Object.keys(sectorHints.hints)) {
            $(`#${hintName}-cell`).chooseClass(BG_COLOR_CLASSES, "danger");
          }
        } else {
          // either this is the only one that's checked (highlight green),
          // or multiple are checked (highlight red)
          const hintYesClassKey = numYesSectors === 1 ? "success" : "danger";
          // if a single object is selected and the user just selected a "no",
          // mark the rest of the sector as "no" as well
          const setRestNo =
            numYesSectors === 1 &&
            $hintBtn.attr("hint") === "no" &&
            isActive($hintBtn);
          for (const [hintName, value] of Object.entries(sectorHints.hints)) {
            let classKey;
            if (value === true) {
              classKey = hintYesClassKey;
            } else if (value === false) {
              classKey = "disabled";
            } else if (value === "suspect") {
              // suspected but not confirmed - show info/blue color
              classKey = "info";
            } else {
              // blank hint
              if (setRestNo) {
                // select "no"
                classKey = "disabled";
                $(`#${hintName}-no`).trigger("activate");
              } else {
                classKey = null;
              }
            }
            $(`#${hintName}-cell`).chooseClass(BG_COLOR_CLASSES, classKey);
          }
        }

        // Auto-save after hint changes
        autoSave();
      },
    });

    // Auto-save on contenteditable changes (notes)
    $(document)
      .off("input.autosave", "[contenteditable]")
      .on("input.autosave", "[contenteditable]", autoSave);

    // Auto-save on select changes (research topics)
    $("#research-body")
      .off("change.autosave", "select")
      .on("change.autosave", "select", autoSave);

    // final score calculator
    $("#score-table")
      .off("change.scorecalc", "input")
      .on("change.scorecalc", "input", (_event) => {
        let total = 0;
        // first theory points
        total += Number($("#first-theory-points").val());
        // object points
        for (const [key, { points }] of Object.entries(
          MODE_SETTINGS[currentGameSettings.mode].objects
        )) {
          if (points == null) continue;
          const count = Number($(`#${key}-points`).val());
          total += count * points;
        }
        // locating planet x points
        total += Number($("#locate-planet-x-points").val());
        $("#score-total").text(total);
        autoSave();
      });

    // buttons to show/hide sections
    for (const name of [
      "logic-rules",
      "score-calculator",
      "theories",
      "research-notes",
    ]) {
      $(`#${name}-header`).on("click", (event) => {
        if ($(event.target).closest("button").length > 0) {
          return;
        }
        const $btn = $(`#hide-${name}-btn`);
        const showing = $btn.text().trim() === "Show";
        // toggle section
        $(`#${name}`).toggleClass("d-none", !showing);
        // toggle button
        $btn
          .chooseClass(
            { success: "btn-outline-success", danger: "btn-outline-danger" },
            showing ? "danger" : "success"
          )
          .text(showing ? "Hide" : "Show");
      });
    }

    // hide the final score calculator by default
    $("#hide-score-calculator-btn").trigger("click");

  });

  function checkStartButton() {
    const [invalid] = getGameSettings();
    $("#start-game-btn").prop("disabled", invalid);
    return !invalid;
  }

  $("#game-settings input").on("change", (_event) => {
    checkStartButton();
  });
  $("[draggable]").on("dragend", (_event) => {
    checkStartButton();
  });

  // Check for saved game state
  const savedState = loadGameState();
  if (savedState && savedState.settings) {
    const savedDate = new Date(savedState.timestamp);
    const timeAgo = formatTimeAgo(savedDate);

    // Show resume game option
    const $resumeDiv = $("<div>", {
      id: "resume-game-prompt",
      class: "alert alert-info mb-3",
    }).append(
      $("<strong>").text("Saved game found! "),
      $("<span>").text(`(${savedState.settings.mode} mode, ${savedState.settings.playerColors.length} player(s), saved ${timeAgo})`),
      $("<br>"),
      $("<button>", {
        type: "button",
        class: "btn btn-primary btn-sm me-2 mt-2",
        id: "resume-game-btn",
      }).text("Resume Game"),
      $("<button>", {
        type: "button",
        class: "btn btn-outline-secondary btn-sm mt-2",
        id: "discard-save-btn",
      }).text("Start Fresh")
    );
    $("#game-settings").before($resumeDiv);

    $("#resume-game-btn").on("click", () => {
      // Set up game settings from saved state
      const settings = savedState.settings;

      // Set mode
      $(`input[name="${GAME_SETTINGS.mode}"][value="${settings.mode}"]`).prop("checked", true);

      // Set player colors
      for (let i = 0; i < settings.playerColors.length; i++) {
        const color = settings.playerColors[i];
        $(`#player-${i + 1}-color`).append($(`#${color}-player`));
      }

      // Set difficulty
      $(`input[name="${GAME_SETTINGS.difficulty}"][value="${settings.difficulty}"]`).prop("checked", true);

      // Remove prompt
      $("#resume-game-prompt").remove();

      // Start game with resume flag
      const event = $.Event("click");
      event.isResume = true;
      $("#start-game-btn").trigger(event);

      // Restore state after a short delay
      setTimeout(() => {
        restoreGameState(savedState);

        // Add the restored state to undo history
        setTimeout(() => {
          const restoredState = getCurrentState();
          if (restoredState) {
            undoStack.push(restoredState);
            updateUndoRedoButtons();
          }
        }, 200);
      }, 100);
    });

    $("#discard-save-btn").on("click", () => {
      clearGameState();
      $("#resume-game-prompt").remove();
    });
  }

  // initialize with the proper mode
  if (parseUrl()) {
    if (checkStartButton()) {
      // start the game
      $("#start-game-btn").trigger("click");
    }
  }
});

/** Format a date as "X minutes/hours/days ago" */
function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minute(s) ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour(s) ago`;
  return `${Math.floor(seconds / 86400)} day(s) ago`;
}

// ========== Tutorial Mode ==========
const TUTORIAL_STORAGE_KEY = "planetXTutorialSeen";

/** Initialize the tutorial modal functionality */
function initializeTutorial() {
  const $modal = $("#tutorial-modal");
  const $steps = $(".tutorial-step");
  const totalSteps = $steps.length;
  let currentStep = 1;

  // Update step total display
  $("#tutorial-step-total").text(totalSteps);

  function showStep(step) {
    currentStep = step;

    // Hide all steps, show current
    $steps.addClass("d-none");
    $(`.tutorial-step[data-step="${step}"]`).removeClass("d-none");

    // Update progress display
    $("#tutorial-step-current").text(step);

    // Update progress bar
    const progress = (step / totalSteps) * 100;
    $("#tutorial-progress-bar").css("width", `${progress}%`);

    // Update button states
    $("#tutorial-prev").prop("disabled", step === 1);

    // Change "Next" to "Finish" on last step
    const $nextBtn = $("#tutorial-next");
    if (step === totalSteps) {
      $nextBtn.html('<i class="bi bi-check-lg"></i> Finish');
      $nextBtn.removeClass("btn-info").addClass("btn-success");
    } else {
      $nextBtn.html('Next <i class="bi bi-arrow-right"></i>');
      $nextBtn.removeClass("btn-success").addClass("btn-info");
    }
  }

  // Navigation handlers
  $("#tutorial-prev").on("click", () => {
    if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  });

  $("#tutorial-next").on("click", () => {
    if (currentStep < totalSteps) {
      showStep(currentStep + 1);
    } else {
      // Finish button clicked - close modal
      bootstrap.Modal.getInstance($modal[0]).hide();
      // Mark tutorial as seen
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    }
  });

  // Reset to step 1 when modal opens
  $modal.on("show.bs.modal", () => {
    showStep(1);
  });

  // Initialize Bootstrap tooltips for section help icons
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach((tooltipTriggerEl) => {
    const tooltipText =
      tooltipTriggerEl.getAttribute("title") ||
      tooltipTriggerEl.getAttribute("data-bs-title") ||
      tooltipTriggerEl.getAttribute("aria-label") ||
      "";
    if (!tooltipText) {
      tooltipTriggerEl.setAttribute("title", "Help");
    } else {
      tooltipTriggerEl.setAttribute("data-bs-title", tooltipText);
    }
    tooltipTriggerEl.setAttribute("data-bs-trigger", "hover focus click");
    tooltipTriggerEl.setAttribute("data-bs-container", "body");
    tooltipTriggerEl.setAttribute("data-bs-boundary", "window");
    tooltipTriggerEl.setAttribute("role", "button");
    if (!tooltipTriggerEl.hasAttribute("tabindex")) {
      tooltipTriggerEl.setAttribute("tabindex", "0");
    }
    const tooltipInstance = bootstrap.Tooltip.getOrCreateInstance(tooltipTriggerEl, {
      trigger: "hover focus click",
      container: "body",
      boundary: "window",
    });
    tooltipTriggerEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      tooltipInstance.toggle();
    });
  });

  // Show tutorial automatically for first-time users
  if (!localStorage.getItem(TUTORIAL_STORAGE_KEY)) {
    // Add highlight to tutorial button
    $("#tutorial-btn").addClass("tutorial-highlight");

    // Remove highlight after first click or after 10 seconds
    $("#tutorial-btn").one("click", function () {
      $(this).removeClass("tutorial-highlight");
    });
    setTimeout(() => {
      $("#tutorial-btn").removeClass("tutorial-highlight");
    }, 10000);
  }
}

// Initialize tutorial when document is ready
$(document).ready(function () {
  applyTheme(getPreferredTheme(), { persist: false });
  $("#theme-toggle").on("click", toggleTheme);

  initializeTutorial();

  // Undo/Redo button event handlers
  $("#undo-btn").on("click", function () {
    undo();
  });

  $("#redo-btn").on("click", function () {
    redo();
  });

  // Keyboard shortcuts for undo/redo
  $(document).on("keydown", function (e) {
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
    else if (
      ((e.ctrlKey || e.metaKey) && e.key === "y") ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
    ) {
      e.preventDefault();
      redo();
    }
  });
});

// ========== Circular Board ==========
let circularBoardState = {
  numSectors: 12,
  rotation: 0,
  visibleSkyStart: 1,
  lastEarthSector: 1,
  showVisibleSky: true,
  selectedSector: null,
};
let pendingTheorySectors = [];
let isTheoryModalActive = false;
let skyMapInputMode = null;
let skyMapSurveyStart = null;
let skyMapLockedRowId = null;

function enqueueTheoryPhases(sectors) {
  const next = sectors.filter((sector) => !pendingTheorySectors.includes(sector));
  if (next.length === 0) return;
  pendingTheorySectors.push(...next);
  processTheoryQueue();
}

function processTheoryQueue() {
  if (isTheoryModalActive || pendingTheorySectors.length === 0) return;
  const sector = pendingTheorySectors.shift();
  isTheoryModalActive = true;
  showTheoryPhaseAlert(sector);
}

function getVisibleSkyRange(start, numSectors) {
  const visibleCount = Math.floor(numSectors / 2);
  const end = ((start - 1 + visibleCount - 1) % numSectors) + 1;
  return { start, end, visibleCount };
}

function isSectorVisible(sector, start, numSectors) {
  const visibleCount = Math.floor(numSectors / 2);
  const distance = (sector - start + numSectors) % numSectors;
  return distance >= 0 && distance < visibleCount;
}

function updateVisibleSkyIndicator() {
  const numSectors = circularBoardState.numSectors;
  const { start } = getVisibleSkyRange(circularBoardState.visibleSkyStart, numSectors);
  const indicator = $("#visible-sky-indicator");
  const visibleSpan = 180;
  const startAngle = ((start - 1) / numSectors) * 360 - 90;
  indicator
    .toggleClass("active", circularBoardState.showVisibleSky)
    .css(
      "background",
      `conic-gradient(from ${startAngle}deg, rgba(125, 211, 252, 0.15) 0deg, rgba(125, 211, 252, 0.25) ${visibleSpan}deg, transparent ${visibleSpan}deg 360deg)`
    );
}

function updateVisibleSkyDetails() {
  const numSectors = circularBoardState.numSectors;
  const { start, end, visibleCount } = getVisibleSkyRange(
    circularBoardState.visibleSkyStart,
    numSectors
  );
  const summary = `Visible sky starts at sector ${start} (Earth arrow / furthest-back player) and spans ${visibleCount} sectors clockwise to sector ${end}.`;
  $("#visible-sky-details").text(summary);
  $("#visible-sky-summary").text(summary);
  updateVisibleSkyIndicator();
}

function getEarthSectorFromTime(totalTime, numSectors) {
  return getTrackPosition(totalTime, numSectors);
}

function getSectorsPassedClockwise(previousSector, nextSector, numSectors) {
  const passed = [];
  if (previousSector == null || nextSector == null || previousSector === nextSector) {
    return passed;
  }
  let current = previousSector;
  while (true) {
    current = (current % numSectors) + 1;
    passed.push(current);
    if (current === nextSector) {
      break;
    }
  }
  return passed;
}

/** Initialize the circular board */
function initializeCircularBoard(numSectors) {
  circularBoardState.numSectors = numSectors;
  circularBoardState.rotation = 0;
  circularBoardState.visibleSkyStart = 1;
  circularBoardState.lastEarthSector = 1;
  circularBoardState.selectedSector = null;

  const $board = $("#circular-board");

  // Remove existing sectors
  $board.find(".sector").remove();

  // Calculate positioning
  const boardSize = $board.width();
  const radius = boardSize * 0.38; // Distance from center to sector centers
  const sectorSize = numSectors <= 12 ? 50 : 45; // Smaller sectors for expert mode

  // Generate sectors
  for (let i = 1; i <= numSectors; i++) {
    // Calculate position around the circle
    // Start from top (12 o'clock) and go clockwise
    const angle = ((i - 1) / numSectors) * 2 * Math.PI - Math.PI / 2;
    const x = Math.cos(angle) * radius + boardSize / 2 - sectorSize / 2;
    const y = Math.sin(angle) * radius + boardSize / 2 - sectorSize / 2;

    const $sector = $("<div>", {
      class: "sector unknown animate-in",
      "data-sector": i,
      css: {
        left: `${x}px`,
        top: `${y}px`,
        animationDelay: `${(i - 1) * 0.05}s`,
      },
    }).append(
      $("<span>", { class: "sector-number" }).text(i),
      $("<div>", { class: "sector-content" }).append(
        $("<i>", { class: "bi bi-question-lg" })
      )
    );

    // Mark prime sectors (for comets)
    if (isPrime(i)) {
      $sector.addClass("prime-sector");
    }

    $board.append($sector);
  }

  // Show the board section
  $("#circular-board-section").removeClass("d-none");

  // Set up event handlers
  setupCircularBoardEvents();

  // Initial visible sky update
  updateVisibleSky();

  // Sync with any existing hint data
  syncCircularBoardWithHints();
}

/** Set up event handlers for the circular board */
function setupCircularBoardEvents() {
  const $board = $("#circular-board");

  // Sector hover - highlight adjacent sectors
  $board.off("mouseenter", ".sector").on("mouseenter", ".sector", function () {
    const sector = parseInt($(this).data("sector"));
    const numSectors = circularBoardState.numSectors;

    // Calculate adjacent sectors (wrapping around)
    const prev = sector === 1 ? numSectors : sector - 1;
    const next = sector === numSectors ? 1 : sector + 1;

    // Highlight adjacent sectors
    $(`.sector[data-sector="${prev}"], .sector[data-sector="${next}"]`).addClass(
      "adjacent-highlight"
    );
  });

  $board.off("mouseleave", ".sector").on("mouseleave", ".sector", function () {
    $(".sector").removeClass("adjacent-highlight");
  });

  // Sector click - show info in center and select
  $board.off("click", ".sector").on("click", ".sector", function () {
    const sector = parseInt($(this).data("sector"));
    const $sector = $(this);

    // Toggle selection
    if (circularBoardState.selectedSector === sector) {
      // Deselect
      $(".sector").removeClass("selected");
      circularBoardState.selectedSector = null;
      $("#center-info").removeClass("active");
      $("#center-sun").show();
    } else {
      // Select this sector
      $(".sector").removeClass("selected");
      $sector.addClass("selected");
      circularBoardState.selectedSector = sector;

      // Update center info
      const objectName = getSectorObjectName(sector);
      $("#center-sector-num").text(`Sector ${sector}`);
      $("#center-object-name").text(objectName);
      $("#center-info").addClass("active");
      $("#center-sun").hide();
    }

    handleSkyMapSectorInput(sector);
  });

  // Rotation buttons
  $("#rotate-board-left")
    .off("click")
    .on("click", function () {
      circularBoardState.rotation -= 360 / circularBoardState.numSectors;
      circularBoardState.visibleSkyStart--;
      if (circularBoardState.visibleSkyStart < 1) {
        circularBoardState.visibleSkyStart = circularBoardState.numSectors;
      }
      applyBoardRotation();
      updateVisibleSky();
    });

  $("#rotate-board-right")
    .off("click")
    .on("click", function () {
      circularBoardState.rotation += 360 / circularBoardState.numSectors;
      circularBoardState.visibleSkyStart++;
      if (circularBoardState.visibleSkyStart > circularBoardState.numSectors) {
        circularBoardState.visibleSkyStart = 1;
      }
      applyBoardRotation();
      updateVisibleSky();
    });

  // Toggle visible sky
  $("#toggle-visible-sky")
    .off("click")
    .on("click", function () {
      $(this).toggleClass("active");
      circularBoardState.showVisibleSky = $(this).hasClass("active");
      updateVisibleSky();
    });

  setupSkyMapInputControls();
}

function setupSkyMapInputControls() {
  $("#sky-map-mode-survey")
    .off("click.skyMap")
    .on("click.skyMap", () => {
      setSkyMapInputMode("survey");
    });
  $("#sky-map-mode-target")
    .off("click.skyMap")
    .on("click.skyMap", () => {
      setSkyMapInputMode("target");
    });
}

function setSkyMapInputMode(mode) {
  skyMapInputMode = mode;
  $("#sky-map-mode-survey").toggleClass("active", mode === "survey");
  $("#sky-map-mode-target").toggleClass("active", mode === "target");
  $("#sky-map-mode-survey").toggleClass("btn-primary", mode === "survey");
  $("#sky-map-mode-survey").toggleClass("btn-outline-primary", mode !== "survey");
  $("#sky-map-mode-target").toggleClass("btn-primary", mode === "target");
  $("#sky-map-mode-target").toggleClass("btn-outline-primary", mode !== "target");
  skyMapSurveyStart = null;
  clearSkyMapHighlights();
  updateSkyMapInputStatus();
}

function updateSkyMapInputStatus() {
  const $status = $("#sky-map-input-status");
  if (!skyMapInputMode) {
    $status.text("Sky map input: Off");
    return;
  }
  if (skyMapInputMode === "target") {
    $status.text("Sky map input: Target (tap a sector)");
    return;
  }
  if (skyMapSurveyStart == null) {
    $status.text("Sky map input: Survey (tap start sector, then end)");
  } else {
    $status.text(`Sky map input: Survey (start ${skyMapSurveyStart}, tap end sector)`);
  }
}

function getActiveMoveRow() {
  // Find the last row that has at least one selection (player or action checked)
  const $rows = $("#moves-body tr");
  for (let i = $rows.length - 1; i >= 0; i--) {
    const $row = $rows.eq(i);
    // Check if any radio button is checked in this row
    if ($row.find('input[type="radio"]:checked').length > 0) {
      return $row;
    }
  }
  // Fallback to last row if no selections found
  return $rows.last();
}

function clearSkyMapHighlights() {
  $(".sector").removeClass(
    "sky-map-target sky-map-survey-start sky-map-survey-end"
  );
}

function lockSkyMapRow($row) {
  if (!skyMapLockedRowId && $row?.length) {
    skyMapLockedRowId = $row.getId();
  }
}

function finalizeSkyMapRow() {
  if (!skyMapLockedRowId) return;
  const $row = $(`#${skyMapLockedRowId}`);
  if ($row.length && $row.attr("new")) {
    $row.attr("new", null);
    addMoveRow();
  }
  skyMapLockedRowId = null;
}

function showSkyMapToast(message) {
  let $container = $("#sky-map-toast-container");
  if ($container.length === 0) {
    $container = $("<div>", {
      id: "sky-map-toast-container",
      class: "toast-container position-fixed bottom-0 end-0 p-3",
    });
    $("body").append($container);
  }
  const toastId = `sky-map-toast-${Date.now()}`;
  const $toast = $(`
    <div id="${toastId}" class="toast text-bg-warning border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `);
  $container.append($toast);
  const toast = new bootstrap.Toast($toast.get(0), { delay: 2500 });
  toast.show();
  $toast.on("hidden.bs.toast", () => $toast.remove());
}

function showSurveyObjectToast(sector) {
  const $row = getActiveMoveRow();
  if ($row.length === 0) return;
  const moveId = $row.getId();
  const objectOptions = [
    "asteroid",
    "dwarf-planet",
    "comet",
    "gas-cloud",
    "truly-empty",
  ];

  let $container = $("#sky-map-toast-container");
  if ($container.length === 0) {
    $container = $("<div>", {
      id: "sky-map-toast-container",
      class: "toast-container position-fixed bottom-0 end-0 p-3",
    });
    $("body").append($container);
  }

  $("#sky-map-survey-toast").remove();
  const $buttons = $("<div>", { class: "d-flex flex-wrap gap-2" }).append(
    objectOptions.map((object) =>
      $("<button>", {
        type: "button",
        class: "btn btn-outline-secondary btn-sm sky-map-object-btn",
        "data-object": object,
        title: object.toTitleCase(),
      }).append(createObjectImage(object))
    )
  );

  const $toast = $(`
    <div id="sky-map-survey-toast" class="toast text-bg-info border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <div class="fw-semibold mb-2">Choose survey object</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `);
  $toast.find(".toast-body").append($buttons);
  $container.append($toast);

  $toast.on("click", ".sky-map-object-btn", (event) => {
    const object = $(event.currentTarget).attr("data-object");
    if (!object) return;
    $row
      .find(`input[name="${moveId}-action-survey-object"][value="${object}"]`)
      .prop("checked", true)
      .trigger("change");
    bootstrap.Toast.getOrCreateInstance($toast.get(0)).hide();
    handleSkyMapSectorInput(sector);
  });

  const toast = new bootstrap.Toast($toast.get(0), { delay: 5000 });
  toast.show();
}

function showSkyMapModeModal(sector) {
  const modalHtml = `
    <div class="modal fade" id="sky-map-mode-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Choose Sky Map Action</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            Select whether this tap should record a Survey or Target.
          </div>
          <div class="modal-footer">
            <button type="button" id="sky-map-modal-survey" class="btn btn-primary">Survey</button>
            <button type="button" id="sky-map-modal-target" class="btn btn-outline-primary">Target</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $("#sky-map-mode-modal").remove();
  $("body").append(modalHtml);
  const modal = new bootstrap.Modal(document.getElementById("sky-map-mode-modal"));
  modal.show();

  $("#sky-map-modal-survey").on("click", () => {
    modal.hide();
    setSkyMapInputMode("survey");
    handleSkyMapSectorInput(sector);
  });
  $("#sky-map-modal-target").on("click", () => {
    modal.hide();
    setSkyMapInputMode("target");
    handleSkyMapSectorInput(sector);
  });

  $("#sky-map-mode-modal").on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

function handleSkyMapSectorInput(sector) {
  const mode = skyMapInputMode;
  if (!mode) {
    showSkyMapModeModal(sector);
    return;
  }

  const $row = getActiveMoveRow();
  if ($row.length === 0) return;
  lockSkyMapRow($row);
  const moveId = $row.getId();

  const $actionInput = $row.find(
    `input[name="${moveId}-action"][value="${mode}"]`
  );
  if ($actionInput.length && !$actionInput.prop("checked")) {
    $actionInput.prop("checked", true).trigger("change");
  }

  if (mode === "target") {
    const $targetSelect = $row.find('[action="target"] select');
    const $option = $targetSelect.find(`option[value="${sector}"]`);
    if ($option.length === 0 || $option.prop("disabled")) {
      showSkyMapToast("That sector cannot be targeted.");
      return;
    }
    $targetSelect.val(String(sector)).trigger("change");
    clearSkyMapHighlights();
    $(`.sector[data-sector="${sector}"]`).addClass("sky-map-target");
    updateSkyMapInputStatus();
    triggerAutoSave();
    finalizeSkyMapRow();
    return;
  }

  const $objectInput = $row.find(
    `input[name="${moveId}-action-survey-object"]:checked`
  );
  if ($objectInput.length === 0) {
    showSurveyObjectToast(sector);
    return;
  }

  const $startSelect = $row.find(
    `#${moveId}-action-survey-sector-start`
  );
  if (skyMapSurveyStart == null) {
    const $option = $startSelect.find(`option[value="${sector}"]`);
    if ($option.length === 0 || $option.prop("disabled")) {
      showSkyMapToast("That sector can't be a survey start for this object.");
      return;
    }
    $startSelect.val(String(sector)).trigger("change");
    skyMapSurveyStart = sector;
    clearSkyMapHighlights();
    $(`.sector[data-sector="${sector}"]`).addClass("sky-map-survey-start");
    updateSkyMapInputStatus();
    triggerAutoSave();
    return;
  }

  const $endSelect = $row.find(`#${moveId}-action-survey-sector-end`);
  const $option = $endSelect.find(`option[value="${sector}"]`);
  if ($option.length === 0 || $option.prop("disabled")) {
    showSkyMapToast("End sector must be within the visible sky range.");
    return;
  }
  $endSelect.val(String(sector)).trigger("change");
  clearSkyMapHighlights();
  $(`.sector[data-sector="${skyMapSurveyStart}"]`).addClass("sky-map-survey-start");
  $(`.sector[data-sector="${sector}"]`).addClass("sky-map-survey-end");
  skyMapSurveyStart = null;
  updateSkyMapInputStatus();
  triggerAutoSave();
  finalizeSkyMapRow();
}

/** Apply rotation to the board */
function applyBoardRotation() {
  $("#circular-board")
    .addClass("rotating")
    .css("transform", `rotate(${circularBoardState.rotation}deg)`);

  // Counter-rotate sector numbers so they stay upright
  $(".sector-number").css(
    "transform",
    `translateX(-50%) rotate(${-circularBoardState.rotation}deg)`
  );
  $(".sector-content").css(
    "transform",
    `rotate(${-circularBoardState.rotation}deg)`
  );
}

/** Update visible sky highlighting */
function updateVisibleSky() {
  const numSectors = circularBoardState.numSectors;
  const start = circularBoardState.visibleSkyStart;

  $(".sector").each(function () {
    const sector = parseInt($(this).data("sector"));
    const isVisible = isSectorVisible(sector, start, numSectors);

    if (circularBoardState.showVisibleSky) {
      $(this).toggleClass("in-visible-sky", isVisible);
      $(this).toggleClass("not-in-visible-sky", !isVisible);
    } else {
      $(this).removeClass("in-visible-sky not-in-visible-sky");
    }
  });

  updateVisibleSkyDetails();
}

/** Get the confirmed object name for a sector */
function getSectorObjectName(sector) {
  const objects = [
    "planet-x",
    "truly-empty",
    "gas-cloud",
    "dwarf-planet",
    "asteroid",
    "comet",
  ];

  for (const object of objects) {
    const hintName = `${object}-sector${sector}`;
    const $yesBtn = $(`#${hintName}-yes`);
    if ($yesBtn.length && $yesBtn.hasClass("active")) {
      return object.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  return "Unknown";
}

/** Sync the circular board with the hints table */
function syncCircularBoardWithHints() {
  const numSectors = circularBoardState.numSectors;
  const objects = [
    "planet-x",
    "truly-empty",
    "gas-cloud",
    "dwarf-planet",
    "asteroid",
    "comet",
  ];

  for (let sector = 1; sector <= numSectors; sector++) {
    const $sector = $(`.sector[data-sector="${sector}"]`);
    let confirmedObject = null;
    let allRuledOut = true;
    let hasAnyHint = false;

    // Check each object for this sector
    for (const object of objects) {
      const hintName = `${object}-sector${sector}`;
      const $yesBtn = $(`#${hintName}-yes`);
      const $noBtn = $(`#${hintName}-no`);

      if ($yesBtn.length && $yesBtn.hasClass("active")) {
        confirmedObject = object;
        hasAnyHint = true;
        break;
      }

      if ($noBtn.length && $noBtn.hasClass("active")) {
        hasAnyHint = true;
      } else if ($yesBtn.length) {
        // This object hasn't been ruled out
        allRuledOut = false;
      }
    }

    // Update sector appearance
    $sector.removeClass("unknown confirmed ruled-out planet-x-found");

    if (confirmedObject) {
      if (confirmedObject === "planet-x") {
        $sector.addClass("planet-x-found");
      } else {
        $sector.addClass("confirmed");
      }

      // Update sector content with object image
      $sector.find(".sector-content").html(
        $("<img>", {
          src: `images/${confirmedObject}.png`,
          alt: confirmedObject.replace(/-/g, " "),
        })
      );
    } else if (hasAnyHint && allRuledOut) {
      // All objects ruled out but nothing confirmed - should not happen in valid game
      $sector.addClass("ruled-out");
      $sector
        .find(".sector-content")
        .html($("<i>", { class: "bi bi-x-lg text-danger" }));
    } else {
      $sector.addClass("unknown");
      $sector
        .find(".sector-content")
        .html($("<i>", { class: "bi bi-question-lg" }));
    }
  }

  // Update center info if a sector is selected
  if (circularBoardState.selectedSector) {
    const objectName = getSectorObjectName(circularBoardState.selectedSector);
    $("#center-object-name").text(objectName);
  }
}

/** Hook into hint button clicks to sync the board */
function hookCircularBoardToHints() {
  // This will be called after hint buttons are set up
  $(document).on("click", ".hint-btn", function () {
    // Small delay to let the hint state update
    setTimeout(syncCircularBoardWithHints, 50);
  });
}

/** Update player positions on the circular board and auto-rotate visible sky */
function updateCircularBoardPlayers(playerTimes, nextPlayer, minTime) {
  const $board = $("#circular-board");
  const numSectors = circularBoardState.numSectors;
  const trackSize = numSectors; // Time track wraps once per sector count

  // Remove existing player pawns
  $board.find(".player-pawn").remove();

  // Calculate board size for positioning
  const boardSize = $board.width();
  const radius = boardSize * 0.48; // Position pawns slightly outside the sectors

  // Add player pawns
  for (const color of currentGameSettings.playerColors) {
    const time = playerTimes[color];
    const isNext = color === nextPlayer;

    // Calculate position based on time (like a clock, starting at 12 o'clock)
    // Time 0 = 12 o'clock (top), increasing clockwise
    const position = getTrackPosition(time, trackSize);
    const angle = ((position - 1) / trackSize) * 2 * Math.PI - Math.PI / 2;
    const x = Math.cos(angle) * radius + boardSize / 2;
    const y = Math.sin(angle) * radius + boardSize / 2;

    const accent = PLAYER_COLORS[color];
    const $pawn = $("<div>", {
      class: `player-pawn player-pawn-${color} ${isNext ? "player-pawn-active" : ""}`,
      "data-color": color,
      "data-time": time,
      css: {
        left: `${x}px`,
        top: `${y}px`,
      },
      title: `${color.toTitleCase()}: Time ${time}${isNext ? " (Next Turn)" : ""}`,
    }).append(
      $("<div>", {
        class: `player-pawn-inner bg-${accent}`,
      }).text(color.charAt(0).toUpperCase())
    );

    $board.append($pawn);
  }

  // Auto-rotate visible sky to align with the furthest back player (lowest time)
  // The visible sky should show where the "Earth" is in its orbit
  // In the physical game, the Earth disc rotates to align with the furthest back player
  const earthSector = Number.isFinite(minTime)
    ? getEarthSectorFromTime(minTime, numSectors)
    : 1;

  // Update visible sky to start at this sector
  const newVisibleSkyStart = ((earthSector - 1) % numSectors) + 1;
  const previousEarthSector = circularBoardState.lastEarthSector;
  const theorySectorsTriggered = [];

  if (circularBoardState.visibleSkyStart !== newVisibleSkyStart) {
    circularBoardState.visibleSkyStart = newVisibleSkyStart;
    updateVisibleSky();
  }

  // Check if we crossed a theory sector based on Earth marker movement
  const mode = currentGameSettings.mode;
  const theorySectors = MODE_SETTINGS[mode]?.theorySectors || [];
  const passedSectors = getSectorsPassedClockwise(
    previousEarthSector,
    earthSector,
    numSectors
  );
  for (const sector of passedSectors) {
    if (theorySectors.includes(sector)) {
      theorySectorsTriggered.push(sector);
    }
  }

  circularBoardState.lastEarthSector = earthSector;

  return { earthSector, theorySectorsTriggered };
}

/** Show conference alert modal */
function showConferenceAlert(conferenceName, threshold) {
  const message = `
    <div class="text-center">
      <i class="bi bi-megaphone fs-1 text-warning mb-3 d-block"></i>
      <h4>Planet X Conference: ${conferenceName}</h4>
      <p class="lead">A conference has been triggered at time <strong>${threshold}</strong>!</p>
      <div class="alert alert-info text-start mt-3">
        <strong>What to do:</strong>
        <ol class="mb-0">
          <li>Open the official app</li>
          <li>Press the "<strong>Planet X Conference</strong>" button</li>
          <li>Record the logic rule in the Conference Notes section under <strong>${conferenceName}</strong></li>
        </ol>
      </div>
      <p class="text-muted small">All players receive the same information about Planet X's location!</p>
    </div>
  `;

  // Create and show a Bootstrap modal
  const modalHtml = `
    <div class="modal fade" id="conference-alert-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle"></i> Conference Triggered!
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${message}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  $("#conference-alert-modal").remove();

  // Add modal to body
  $("body").append(modalHtml);

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById("conference-alert-modal"));
  modal.show();

  // Clean up after modal is hidden
  $("#conference-alert-modal").on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

/** Show theory phase alert modal */
function showTheoryPhaseAlert(sector) {
  const mode = currentGameSettings.mode;
  const maxTheories = mode === "expert" ? 2 : 1;

  const message = `
    <div class="text-center">
      <i class="bi bi-journal-text fs-1 text-primary mb-3 d-block"></i>
      <h4>Theory Phase at Sector ${sector}</h4>
      <p class="lead">The visible sky has reached sector <strong>${sector}</strong> - it's time to submit theories!</p>
      <div class="alert alert-info text-start mt-3">
        <strong>What to do:</strong>
        <ol class="mb-0">
          <li>Each player can submit <strong>${maxTheories} ${maxTheories === 1 ? 'theory' : 'theories'}</strong> this phase</li>
          <li>Choose a sector and object type you're confident about</li>
          <li>Submit your theory in the <strong>official Planet X app</strong></li>
          <li>Record your theory in the <strong>Theory Tracking</strong> section below</li>
          <li>Click <strong><i class="bi bi-fast-forward-fill"></i> Advance Theories</strong> to move all submitted theories one step closer to Peer Review!</li>
        </ol>
      </div>
      <div class="alert alert-success text-start">
        <i class="bi bi-arrow-right-circle"></i>
        <strong>Next Step:</strong> After recording your theories, click the
        <span class="badge bg-primary"><i class="bi bi-fast-forward-fill"></i> Advance Theories</span>
        button to progress them toward Peer Review.
      </div>
      <div class="alert alert-warning text-start">
        <i class="bi bi-exclamation-triangle"></i>
        <strong>Remember:</strong> You can submit theories for <em>any sector</em>, not just visible ones!
      </div>
    </div>
  `;

  // Create and show a Bootstrap modal
  const modalHtml = `
    <div class="modal fade" id="theory-phase-alert-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="bi bi-lightbulb"></i> Theory Phase Triggered!
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${message}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              Got it - I'll submit my theories!
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  $("#theory-phase-alert-modal").remove();

  // Add modal to body
  $("body").append(modalHtml);

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById("theory-phase-alert-modal"));
  modal.show();

  // Highlight the Advance Theories button when modal is dismissed
  $("#theory-phase-alert-modal").on("hidden.bs.modal", function () {
    $(this).remove();
    // Add pulsing highlight to the Advance Theories button
    const $advanceBtn = $("#advance-theories-btn");
    $advanceBtn.addClass("theory-phase-pending");
    // Scroll to the theories section
    document.getElementById("theories-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    isTheoryModalActive = false;
    processTheoryQueue();
  });
}
