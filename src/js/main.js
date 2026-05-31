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

  let currentCharacter = null;
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

  bindClick(battleStartButton, "battleStartButton", () => {
    if (!drawingCanvas || !judgeManager) {
      return;
    }

    if (!currentCharacter) {
      currentCharacter = createCharacterFromCurrentDrawing({
        drawingCanvas,
        judgeManager,
        characterNameInput,
      });
    }

    showScreen("battleScreen");

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");
    }

    battleManager.setStatusElement(battleStatusText);
    battleManager.startBattle([currentCharacter]);
  });

  bindClick(summonAllyButton, "summonAllyButton", () => {
    if (!battleManager || !currentCharacter) {
      return;
    }

    battleManager.summonAlly(currentCharacter);
  });

  bindClick(restartBattleButton, "restartBattleButton", () => {
    if (!battleManager || !currentCharacter) {
      return;
    }

    battleManager.startBattle([currentCharacter]);
  });

  bindClick(backDrawButton, "backDrawButton", () => {
    currentCharacter = null;
    showScreen("drawScreen");
  });

  bindClick(backDrawFromBattleButton, "backDrawFromBattleButton", () => {
    battleManager?.stop();
    currentCharacter = null;
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

function bindClick(button, id, handler) {
  if (!button) {
    console.warn(`${id} not found`);
    return;
  }

  button.addEventListener("click", handler);
}
