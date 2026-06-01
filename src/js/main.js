import { BattleManager } from "./battle/BattleManager.js";
import { DrawingCanvas } from "./drawing/DrawingCanvas.js";
import { JudgeManager } from "./drawing/JudgeManager.js";
import { StatCalculator } from "./drawing/StatCalculator.js";

document.addEventListener("DOMContentLoaded", () => {
  const drawingCanvas = createDrawingCanvas();
  const judgeManager = createJudgeManager();

  const characterNameInput = document.getElementById("characterNameInput");
  const startButton = document.getElementById("startButton");
  const judgeButton = document.getElementById("judgeButton");
  const battleStartButton = document.getElementById("battleStartButton");
  const summonAllyButton = document.getElementById("summonAllyButton");
  const restartBattleButton = document.getElementById("restartBattleButton");
  const battleStatusText = document.getElementById("battleStatusText");
  const backDrawButton = document.getElementById("backDrawButton");
  const backDrawFromBattleButton = document.getElementById(
    "backDrawFromBattleButton",
  );

  const saveSlotButton = document.getElementById("saveSlotButton");
  const slotButtons = document.querySelectorAll(".character-slot");

  let currentCharacter = null;
  let selectedCharacter = null;
  let selectedSlotIndex = null;
  let characterSlots = [null, null, null];
  let battleManager = null;

  showScreen("startScreen");

  bindClick(startButton, "startButton", () => {
    showScreen("drawScreen");
  });

  bindClick(judgeButton, "judgeButton", () => {
    if (!drawingCanvas || !judgeManager) {
      return;
    }

    currentCharacter = createCharacterFromCurrentDrawing({
      drawingCanvas,
      judgeManager,
      characterNameInput,
    });

    judgeManager.renderResult(currentCharacter);
    showScreen("judgeScreen");
  });

  bindClick(saveSlotButton, "saveSlotButton", () => {
    if (!currentCharacter) {
      console.warn("등록할 캐릭터가 없습니다.");
      return;
    }

    const emptySlotIndex = characterSlots.findIndex((slot) => slot === null);

    let targetIndex = null;

    if (emptySlotIndex !== -1) {
      targetIndex = emptySlotIndex;
    } else {
      if (selectedSlotIndex === null) {
        console.warn("교체할 슬롯을 먼저 선택하세요.");
        return;
      }

      targetIndex = selectedSlotIndex;
    }

    characterSlots[targetIndex] = currentCharacter;
    selectedSlotIndex = targetIndex;
    selectedCharacter = currentCharacter;

    renderCharacterSlots(characterSlots, selectedSlotIndex);
    judgeManager.renderResult(selectedCharacter);
  });

  slotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotIndex = Number(button.dataset.slotIndex);
      const character = characterSlots[slotIndex];

      selectedSlotIndex = slotIndex;

      if (!character) {
        selectedCharacter = null;
        renderCharacterSlots(characterSlots, selectedSlotIndex);
        return;
      }

      selectedCharacter = character;
      renderCharacterSlots(characterSlots, selectedSlotIndex);
      judgeManager.renderResult(selectedCharacter);
    });
  });

  bindClick(battleStartButton, "battleStartButton", () => {
    const battleCharacter = selectedCharacter ?? currentCharacter;

    if (!battleCharacter) {
      console.warn("전투에 사용할 캐릭터 슬롯을 선택하세요.");
      return;
    }

    showScreen("battleScreen");

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");
    }

    battleManager.setStatusElement(battleStatusText);
    battleManager.startBattle([battleCharacter]);
  });

  bindClick(summonAllyButton, "summonAllyButton", () => {
    const battleCharacter = selectedCharacter ?? currentCharacter;

    if (!battleManager || !battleCharacter) {
      return;
    }

    battleManager.summonAlly(battleCharacter);
  });

  bindClick(restartBattleButton, "restartBattleButton", () => {
    const battleCharacter = selectedCharacter ?? currentCharacter;

    if (!battleManager || !battleCharacter) {
      return;
    }

    battleManager.startBattle([battleCharacter]);
  });

  bindClick(backDrawButton, "backDrawButton", () => {
    currentCharacter = null;
    showScreen("drawScreen");
  });

  bindClick(backDrawFromBattleButton, "backDrawFromBattleButton", () => {
    battleManager?.stop();
    showScreen("drawScreen");
  });
});

function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach((screen) => {
    screen.classList.add("hidden");
    screen.classList.remove("active");
    screen.hidden = true;
  });

  const targetScreen = document.getElementById(screenId);

  if (!targetScreen) {
    console.warn(`${screenId} not found`);
    return;
  }

  targetScreen.hidden = false;
  targetScreen.classList.remove("hidden");
  targetScreen.classList.add("active");
}

function createDrawingCanvas() {
  const canvas = document.getElementById("drawCanvas");
  const brushSizeInput = document.getElementById("brushSizeInput");
  const eraserButton = document.getElementById("eraserButton");
  const undoButton = document.getElementById("undoButton");
  const clearButton = document.getElementById("clearButton");
  const inkText = document.getElementById("inkText");

  if (
    !canvas ||
    !brushSizeInput ||
    !eraserButton ||
    !undoButton ||
    !clearButton ||
    !inkText
  ) {
    console.warn("Drawing controls are incomplete");
    return null;
  }

  const drawingCanvas = new DrawingCanvas({
    canvas,
    colorButtons: document.querySelectorAll(".color-btn"),
    colorPicker: null,
    brushSizeInput,
    eraserButton,
    undoButton,
    clearButton,
    inkText,
    maxInk: 128000,
  });

  drawingCanvas.init();
  return drawingCanvas;
}

function createJudgeManager() {
  const requiredIds = [
    "previewImage",
    "resultName",
    "resultGrade",
    "resultPower",
    "resultComment",
    "statAttack",
    "statHp",
    "statSpeed",
    "statAttackSpeed",
    "statRange",
    "statCost",
  ];

  const elements = Object.fromEntries(
    requiredIds.map((id) => [id, document.getElementById(id)]),
  );

  if (Object.values(elements).some((element) => !element)) {
    console.warn("Judge result controls are incomplete");
    return null;
  }

  return new JudgeManager(elements);
}

function createCharacterFromCurrentDrawing({
  drawingCanvas,
  judgeManager,
  characterNameInput,
}) {
  const drawCanvas = document.getElementById("drawCanvas");

  const { stats, grade } = StatCalculator.createStatsAndGrade(drawCanvas, {
    canvasLevel: 1,
  });

  return judgeManager.createCharacter({
    originalName: characterNameInput?.value ?? "",
    imageData: drawingCanvas.toImageData(),
    stats,
    grade,
  });
}

function renderCharacterSlots(characterSlots, selectedSlotIndex) {
  const slotButtons = document.querySelectorAll(".character-slot");

  slotButtons.forEach((button, index) => {
    const character = characterSlots[index];

    button.classList.remove("filled");
    button.classList.remove("selected");

    if (index === selectedSlotIndex) {
      button.classList.add("selected");
    }

    if (!character) {
      button.innerHTML = `
        <div class="slot-info">
          <div class="slot-name">빈 슬롯</div>
        </div>
      `;
      return;
    }

    button.classList.add("filled");

    button.innerHTML = `
      <img class="slot-preview-image" src="${character.imageData}" alt="${character.name}" />
      <div class="slot-info">
        <div class="slot-name">${character.name}</div>
        <div class="slot-power">${character.grade} / 전투력 ${character.stats.power}</div>
      </div>
    `;
  });
}

function areAllSlotsFilled(characterSlots) {
  return characterSlots.every((character) => character !== null);
}

function bindClick(button, id, handler) {
  if (!button) {
    console.warn(`${id} not found`);
    return;
  }

  button.addEventListener("click", handler);
}
