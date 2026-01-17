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
        rule: "not adjacent to <dwarf-planet>; appears empty",
      },
      {
        object: "truly-empty",
        count: 2,
        label: "Truly Empty Sectors",
        rule: "(remember: <planet-x> appears empty)",
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
        rule: "not adjacent to <dwarf-planet>; appears empty",
      },
      {
        object: "truly-empty",
        count: 2,
        label: "Truly Empty Sectors",
        rule: "(remember: <planet-x> appears empty)",
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
    const $actionSelect = $row.find(`#${moveId}-action`);
    const action = $actionSelect.val();

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
    const revealed = $row.find(`#${theoryId}-revealed`).prop("checked");
    const correct = $row.find(`#${theoryId}-correct`).prop("checked");

    if (player || sector || object || revealed || correct) {
      state.theories.push({ player, sector, object, revealed, correct });
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
  undoStack.length = 0;
  redoStack.length = 0;
  updateUndoRedoButtons();
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
    $row.find("input[type='radio']").prop("checked", false);
    $row.find("input[type='checkbox']").prop("checked", false);
    $row.find("select").val("");
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
      $row.find(`#${moveId}-action`).val(move.action).trigger("change");

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
      if (theory.revealed) {
        $row.find(`#${theoryId}-revealed`).prop("checked", true);
      }
      if (theory.correct) {
        $row.find(`#${theoryId}-correct`).prop("checked", true);
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
    $div.on("input focusout", (event) => {
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
      $select.one("change", (event) => {
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

function createObjectImage(object, attrs = {}) {
  attrs.src = `images/${object}.png`;
  attrs.alt = object.toTitleCase();
  return $("<img>", attrs);
}

function toggleImageWhiteVariant(selector) {
  $(selector).on("change", (event) => {
    const name = $(event.target).attr("name");
    $(`${selector}[name="${name}"]`).forEach(($input) => {
      let variant = "";
      if ($input.prop("checked")) {
        // set image to white variant
        variant = "-white";
      }
      const object = $input.val();
      const labelId = $input.getId() + "-label";
      $(`#${labelId} img`).attr("src", `images/${object}${variant}.png`);
    });
  });
}

let theoriesCounter = 0;

/** Initializes the theories tracking table */
function initializeTheoriesTable(playerColors, numSectors) {
  // Add initial empty row
  addTheoryRow(playerColors, numSectors);
}

/** Adds a row to the theories table */
function addTheoryRow(playerColors, numSectors) {
  const theoryNum = theoriesCounter++;
  const theoryId = `theory${theoryNum}`;

  const theoryObjects = ["asteroid", "comet", "dwarf-planet", "gas-cloud"];

  $("#theories-body").append(
    $("<tr>", { id: theoryId, class: "theory-row", new: "true" }).append(
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
      // Revealed column
      $("<td>", { class: "text-center" }).append(
        $("<input>", {
          type: "checkbox",
          id: `${theoryId}-revealed`,
          class: "form-check-input theory-checkbox",
          theory: theoryId,
        })
      ),
      // Correct column
      $("<td>", { class: "text-center" }).append(
        $("<input>", {
          type: "checkbox",
          id: `${theoryId}-correct`,
          class: "form-check-input theory-checkbox",
          theory: theoryId,
        })
      )
    )
  );

  // Toggle white image variant for object selection
  toggleImageWhiteVariant(`input[name="${theoryId}-object"]`);

  // Add new row when this one is changed
  $(`[theory="${theoryId}"]`).on("change", (event) => {
    const $row = $(`#${theoryId}`);
    if ($row.attr("new")) {
      $row.attr("new", null);
      addTheoryRow(playerColors, numSectors);
    }
    triggerAutoSave();
  });
}

/** Starts the game by initializing the page with the given game settings. */
function startGame(gameSettings) {
  const { mode, playerColors, difficulty } = gameSettings;

  const $gameSettings = $("#game-settings");
  if ($gameSettings.length === 0) return;

  const settings = MODE_SETTINGS[mode];
  if (settings == null) return;
  const numSectors = settings.numSectors;
  const objectSettings = settings.objects;

  // delete game selection buttons
  $gameSettings.remove();

  // show reset buttons
  $("#reset-buttons").removeClass("d-none");
  // show board
  $("#board").removeClass("d-none");
  $("#difficulty").text(difficulty.toTitleCase());
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
    $head.append($("<th>").text(`Sector ${sector}`));
    // add the opposite sector number
    const opposite = ((i + numSectors / 2) % numSectors) + 1;
    $oppositeRow.append($("<td>").text(`Sector ${opposite}`));
    // add hint button groups for each object row
    $objectRows.forEach(($row) => {
      const object = $row.attr("object");
      if (object === "comet") {
        // special case: only put hints in prime number sectors
        if (!isPrime(sector)) {
          $row.append($("<td>"));
          return;
        }
      }
      const hintName = `${object}-sector${sector}`;
      const extraAttrs = { hintName, object, sector };
      $row.append(
        $("<td>", { id: `${hintName}-cell`, class: "hint-cell" }).append(
          BootstrapHtml.buttonGroup(
            [
              { hint: "no", accent: "danger", icon: "x-lg" },
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
      $("<td>").append(BootstrapHtml.editable({ placeholder: "Notes" }))
    );
  }
  // freeze the second column
  const col1Width = $("#sectors-head-filler").get(0).offsetWidth;
  $("#hints-table .freeze-col.col2").attr("style", `left: ${col1Width}px`);

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
        if (!(object in objectSettings)) {
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

  // initialize starting info table
  const numStartingHints = DIFFICULTY_START_HINTS[difficulty] ?? 0;
  if (numStartingHints === 0) {
    $("#starting-info-section").remove();
  } else {
    $("#starting-info-list").append(
      Array.fromRange(numStartingHints, (index) => {
        const hintRadioName = `starting-info-${index}-object`;
        return $("<li>", { class: "mb-1" }).append(
          $("<div>", { class: "row gx-2 flex-nowrap text-nowrap" }).append(
            $("<div>", { class: "col-auto col-form-label" }).text("Sector"),
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown(
                Array.fromRange(numSectors, (index) => index + 1),
                { onlyLabels: true }
              )
            ),
            $("<div>", { class: "col-auto col-form-label" }).text("is not a"),
            BootstrapHtml.radioButtonGroup(
              hintRadioName,
              ["asteroid", "comet", "dwarf-planet", "gas-cloud"].map(
                (object) => {
                  const objectId = `${hintRadioName}-${object}`;
                  return {
                    id: objectId,
                    value: object,
                    content: [
                      createObjectImage(object),
                      " ",
                      object.unhyphenated().toTitleCase(),
                    ],
                  };
                }
              ),
              {
                divClass: "col-auto",
                elementClass: "starting-info-object-hint",
                elementAccent: "secondary",
              }
            )
          )
        );
      })
    );
    toggleImageWhiteVariant(".starting-info-object-hint");
  }

  // initialize research table
  const topicOptions = ["Asteroids", "Comets", "Dwarf Planets", "Gas Clouds"];
  $("#research-body").append(
    settings.research.map((letter) =>
      $("<tr>").append(
        $("<th>", { scope: "row" }).text(letter),
        $("<td>").append(
          $("<div>", { class: "row gx-2 align-items-center" }).append(
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown(topicOptions, { onlyLabels: true })
            ),
            $("<div>", { class: "col-auto" }).text("&"),
            $("<div>", { class: "col-auto" }).append(
              BootstrapHtml.dropdown(topicOptions, {
                // let the user go back to a blank on the second one, since the
                // topic might only be about one object
                disableDefault: false,
                onlyLabels: true,
              })
            )
          )
        ),
        $("<td>").append(BootstrapHtml.editable({ placeholder: "Notes" }))
      )
    ),
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

  // initialize player move filters
  $("#player-move-filters").append(
    BootstrapHtml.buttonGroup(
      playerColors.map((color) =>
        BootstrapHtml.toggleButton(
          `outline-${PLAYER_COLORS[color]}`,
          color.charAt(0).toUpperCase(),
          { btnClass: "player-move-filters", color }
        )
      )
    )
  );

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
            BootstrapHtml.dropdown(
              [
                { value: "survey", label: "Survey" },
                { value: "target", label: "Target" },
                { value: "research", label: "Research" },
                { value: "locate", label: "Locate Planet X" },
              ],
              { id: actionSelectId, move: moveId }
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

  function getSelected($select) {
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
      start = getSelected($(`#${surveySectorStartSelectId}`));
    }
    if (end === undefined) {
      end = getSelected($(`#${surveySectorEndSelectId}`));
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

    // Update display
    const $display = $("#time-track-display");
    $display.empty();

    for (const color of currentGameSettings.playerColors) {
      const time = playerTimes[color];
      const isNext = color === nextPlayer;
      const accent = PLAYER_COLORS[color];
      const $badge = $("<span>", {
        class: `badge bg-${accent} me-2 ${isNext ? "border border-dark border-2" : ""}`,
      }).text(`${color.charAt(0).toUpperCase()}: ${time}`);
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
      const { earthSector, theorySectorTriggered } = updateCircularBoardPlayers(playerTimes, nextPlayer, minTime);

      // Check for theory phase triggers
      if (theorySectorTriggered) {
        const theoryKey = `theory-sector-${theorySectorTriggered}-shown`;
        if (!sessionStorage.getItem(theoryKey)) {
          sessionStorage.setItem(theoryKey, 'true');
          showTheoryPhaseAlert(theorySectorTriggered);
        }
      }
    }

    // Auto-save on move changes
    triggerAutoSave();
  }

  // only includes the player and action selections (not notes)
  $(`[move="${moveId}"]`).on("change", (event) => {
    // if this is a new row, add another row since this one is now changed
    const $row = $(`#${moveId}`);
    if ($row.attr("new")) {
      $row.attr("new", null);
      // add a new row after this one
      addMoveRow();
    }

    // calculate the time cost for this action
    const currAction = getSelected($row.find(`#${actionSelectId}`));
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
      const $actionSelect = $row.find(`#${moveId}-action`);
      const actionId = $actionSelect.getId();
      const $actionFeedback = $(`#${actionId}-feedback`);
      const action = getSelected($actionSelect);
      // save this player's move
      if (!(player in playerMoves)) {
        playerMoves[player] = [];
      }
      playerMoves[player].push({
        moveNum,
        $actionSelect,
        $actionFeedback,
        action,
      });
    });
    for (const [player, moves] of Object.entries(playerMoves)) {
      const playerTitle = player.toTitleCase();
      const ordered = moves.sort((a, b) => a.moveNum - b.moveNum);
      let numTargets = 0;
      let lastAction = null;
      for (const { $actionSelect, $actionFeedback, action } of ordered) {
        $actionSelect.removeClass("is-invalid");
        $actionSelect.find("option:not([default])").prop("disabled", false);
        if (lastAction === "research") {
          // cannot research two times in a row
          if (action === "research") {
            $actionSelect.addClass("is-invalid");
            $actionFeedback.text(
              `Player ${playerTitle}: Cannot research two times in a row`
            );
          }
          // disable
          $actionSelect.find('option[value="research"]').prop("disabled", true);
        }
        if (numTargets >= 2) {
          if (action === "target") {
            // cannot target more than two times
            $actionSelect.addClass("is-invalid");
            $actionFeedback.text(
              `Player ${playerTitle}: Cannot target more than two times`
            );
          }
          // disable
          $actionSelect.find('option[value="target"]').prop("disabled", true);
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
  $(`#${actionSelectId}`).on("change", (event) => {
    const action = $(`#${actionSelectId}`).val();
    // hide all the other args
    $(`.${actionArgsClass}`).forEach(($args) => {
      $args.toggleClass("d-none", $args.attr("action") !== action);
    });
  });

  // survey args
  const surveyObjectRadioSelector = `input[name="${surveyObjectRadioName}"]`;
  toggleImageWhiteVariant(surveyObjectRadioSelector);
  $(surveyObjectRadioSelector).on("change", (event) => {
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

    if (getSelected($startSelect) != null) {
      // if nothing was selected yet, just leave it
      // otherwise, trigger a change to update the end sector select
      $startSelect.trigger("change");
    }
  });
  $(`#${surveySectorStartSelectId}`).on("change", (event) => {
    const isComet = $(`${surveyObjectRadioSelector}[value="comet"]`).prop(
      "checked"
    );

    const $startSelect = $(`#${surveySectorStartSelectId}`);
    const startValue = getSelected($startSelect);
    const $endSelect = $(`#${surveySectorEndSelectId}`);

    const sectors = [];
    let invalidIsSelected = false;
    if (startValue != null) {
      const startSector = Number(startValue);
      const endValue = getSelected($endSelect);
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

    const $newEndSelect = $(`#${surveySectorEndSelectId}`);
    $newEndSelect.toggleClass("is-invalid", invalidIsSelected);
    $newEndSelect.on("change", (event) => {
      const isComet = $(`${surveyObjectRadioSelector}[value="comet"]`).prop(
        "checked"
      );

      const $endSelect = $(`#${surveySectorEndSelectId}`);
      const endValue = getSelected($endSelect);
      if (endValue == null) return;
      const endSector = Number(endValue);

      calcSurveyCost({ end: endSector, setText: true });

      // mark as invalid if not a prime number
      $endSelect.toggleClass("is-invalid", isComet && !isPrime(endSector));
    });
  });

  // research args
  $(`input[name="${moveId}-action-research-area"]`).on("input", (event) => {
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
    $("#new-game-btn").on("click", (event) => {
      if (!confirm("Are you sure you want to start a new game?")) return;
      clearGameState();
      location.href = getUrl();
    });
    // reset button
    $("#reset-btn").on("click", (event) => {
      if (!confirm("Are you sure you want to reset the game?")) return;
      clearGameState();
      location.href = getUrl(currentGameSettings);
    });

    // update hints table whenever a hint is changed
    function isActive($button) {
      return $button.hasClass("active");
    }

    function getHintValue(hintName) {
      if (isActive($(`#${hintName}-yes`))) return true;
      if (isActive($(`#${hintName}-no`))) return false;
      return null;
    }

    function getHintValues(attrs = {}) {
      const attrsFilterStr = Object.entries(attrs)
        .map(([key, value]) => `[${key}="${value}"]`)
        .join("");
      let numHints = 0;
      const hintsValues = {};
      const hintsByValue = { yes: [], no: [], blank: [] };
      $(`.hint-btn-group${attrsFilterStr}`).forEach(($element) => {
        const hintName = $element.attr("hintName");
        if (hintName in hintsValues) return;
        const value = getHintValue(hintName);
        let addToKey;
        if (value === true) addToKey = "yes";
        else if (value === false) addToKey = "no";
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
      disabled: "table-secondary",
    };
    const TEXT_COLOR_CLASSES = {
      success: "text-success",
      danger: "text-danger",
    };
    $(".hint-btn").on({
      activate: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.addClass("active");
        // deactivate the other one
        const hintName = $hintBtn.attr("hintName");
        const hint = $hintBtn.attr("hint");
        $(`.hint-btn[hintName="${hintName}"]:not([hint="${hint}"])`).trigger(
          "deactivate"
        );
      },
      deactivate: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.removeClass("active");
      },
      toggleActive: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.trigger(isActive($hintBtn) ? "deactivate" : "activate");
      },
      click: (event) => {
        const $hintBtn = $(event.currentTarget);
        $hintBtn.trigger("toggleActive");

        // update the hint cell colors for this object (must be within a limit)
        const object = $hintBtn.attr("object");
        const objectHints = getHintValues({ object });
        const numYesObjects = objectHints.yes.length;
        const numBlankObjects = objectHints.blank.length;
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
        } else if (numYesObjects + numBlankObjects === limit) {
          // exactly enough buttons left to fulfill the limit
          cellClass = "success";
        } else if (numYesObjects + numBlankObjects < limit) {
          // not enough buttons left to fulfill the limit
          cellClass = "danger";
        }
        $(`#${object}-count-cell`).chooseClass(BG_COLOR_CLASSES, cellClass);
        $(`#${object}-count`)
          .text(numYesObjects)
          .chooseClass(TEXT_COLOR_CLASSES, countClass);

        // update the hint cell colors for this sector (must be exactly one
        // object per sector)
        const sector = $hintBtn.attr("sector");
        const sectorHints = getHintValues({ sector });
        const numYesSectors = sectorHints.yes.length;
        const numBlankSectors = sectorHints.blank.length;
        if (numYesSectors + numBlankSectors === 0) {
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
    $(document).on("input", "[contenteditable]", autoSave);

    // Auto-save on select changes (research topics)
    $("#research-body select").on("change", autoSave);

    // final score calculator
    $("#score-table input").on("change", (event) => {
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
      "starting-info",
      "theories",
      "research-notes",
    ]) {
      $(`#${name}-header`).on("click", (event) => {
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

    // add functionality to player move filter
    $(".player-move-filters").on("click", (event) => {
      const $playerBtn = $(event.target);
      $playerBtn.toggleClass("active", !isActive($playerBtn));

      // find selected
      const filterPlayers = new Set();
      $(".player-move-filters").forEach(($btn) => {
        if (isActive($btn)) {
          filterPlayers.add($btn.attr("color"));
        }
      });

      if (filterPlayers.size === 0) {
        // no filters; show all rows
        $(`.${MOVE_ROW_CLASS}`).removeClass("d-none");
        return;
      }

      $(`.${MOVE_ROW_CLASS}`).forEach(($row) => {
        const moveId = $row.getId();
        const player = $row
          .find(`input[name="${moveId}-player"]:checked`)
          .attr("value");
        const showRow = player != null && filterPlayers.has(player);
        $row.toggleClass("d-none", !showRow);
      });
    });
  });

  function checkStartButton() {
    const [invalid, settings] = getGameSettings();
    $("#start-game-btn").prop("disabled", invalid);
    return !invalid;
  }

  $("#game-settings input").on("change", (event) => {
    checkStartButton();
  });
  $("[draggable]").on("dragend", (event) => {
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
    new bootstrap.Tooltip(tooltipTriggerEl);
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
  showVisibleSky: true,
  selectedSector: null,
};

/** Initialize the circular board */
function initializeCircularBoard(numSectors) {
  circularBoardState.numSectors = numSectors;
  circularBoardState.rotation = 0;
  circularBoardState.visibleSkyStart = 1;
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
  const visibleCount = numSectors / 2;
  const start = circularBoardState.visibleSkyStart;

  $(".sector").each(function () {
    const sector = parseInt($(this).data("sector"));
    let isVisible = false;

    // Check if sector is in visible range
    for (let i = 0; i < visibleCount; i++) {
      const visibleSector = ((start - 1 + i) % numSectors) + 1;
      if (sector === visibleSector) {
        isVisible = true;
        break;
      }
    }

    if (circularBoardState.showVisibleSky) {
      $(this).toggleClass("in-visible-sky", isVisible);
      $(this).toggleClass("not-in-visible-sky", !isVisible);
    } else {
      $(this).removeClass("in-visible-sky not-in-visible-sky");
    }
  });
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
  const maxTimeOnBoard = numSectors <= 12 ? 24 : 36; // Standard mode max ~24, Expert mode max ~36

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
    const angle = (time / maxTimeOnBoard) * 2 * Math.PI - Math.PI / 2;
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
  const timeToSectorRatio = numSectors / maxTimeOnBoard;
  const earthSector = Math.floor(minTime * timeToSectorRatio) + 1;

  // Update visible sky to start at this sector
  const newVisibleSkyStart = ((earthSector - 1) % numSectors) + 1;
  const previousVisibleSkyStart = circularBoardState.visibleSkyStart;
  let theorySectorTriggered = null;

  if (circularBoardState.visibleSkyStart !== newVisibleSkyStart) {
    circularBoardState.visibleSkyStart = newVisibleSkyStart;
    updateVisibleSky();

    // Check if we crossed a theory sector
    const mode = currentGameSettings.mode;
    const theorySectors = MODE_SETTINGS[mode]?.theorySectors || [];

    for (const theorySector of theorySectors) {
      // Check if we just reached or passed this theory sector
      if (newVisibleSkyStart >= theorySector && previousVisibleSkyStart < theorySector) {
        theorySectorTriggered = theorySector;
        break;
      }
      // Handle wrap-around (e.g., going from sector 12 to 1)
      if (newVisibleSkyStart < previousVisibleSkyStart && theorySector <= newVisibleSkyStart) {
        theorySectorTriggered = theorySector;
        break;
      }
    }
  }

  return { earthSector, theorySectorTriggered };
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
          <li>Record the logic rule in the Research Notes section under <strong>${conferenceName}</strong></li>
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
          <li>Submit your theory in the official app</li>
          <li>Record theories in the <strong>Theory Tracking</strong> section below</li>
          <li>Wait for <strong>Peer Review</strong> to see if your theory is correct!</li>
        </ol>
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
              Got it!
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

  // Clean up after modal is hidden
  $("#theory-phase-alert-modal").on("hidden.bs.modal", function () {
    $(this).remove();
  });
}
