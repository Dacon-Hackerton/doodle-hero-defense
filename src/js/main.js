import { BattleManager } from "./battle/BattleManager.js";
import { DrawingCanvas } from "./drawing/DrawingCanvas.js";
import { JudgeManager } from "./drawing/JudgeManager.js";

document.addEventListener("DOMContentLoaded", () => {
  const drawingCanvas = createDrawingCanvas();
  const judgeManager = createJudgeManager();

  const characterNameInput = document.getElementById("characterNameInput");
  const startButton = document.getElementById("startButton");
  const judgeButton = document.getElementById("judgeButton");
  const battleStartButton = document.getElementById("battleStartButton");
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

    currentCharacter = judgeManager.createCharacter({
      originalName: characterNameInput?.value ?? "",
      imageData: drawingCanvas.toImageData(),
    });

    judgeManager.renderResult(currentCharacter);
    showScreen("judgeScreen");
  });

  bindClick(battleStartButton, "battleStartButton", () => {
    if (!drawingCanvas || !judgeManager) {
      return;
    }

    if (!currentCharacter) {
      currentCharacter = judgeManager.createCharacter({
        originalName: characterNameInput?.value ?? "",
        imageData: drawingCanvas.toImageData(),
      });
    }

    showScreen("battleScreen");

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");
    }

    battleManager.start(currentCharacter);
  });

  bindClick(backDrawButton, "backDrawButton", () => {
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

  if (!canvas || !brushSizeInput || !eraserButton || !undoButton || !clearButton) {
    console.warn("Drawing controls are incomplete");
    return null;
  }

  const drawingCanvas = new DrawingCanvas({
    canvas,
    colorButtons: document.querySelectorAll(".color-btn"),
    colorPicker: document.getElementById("colorPicker"),
    brushSizeInput,
    eraserButton,
    undoButton,
    clearButton,
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

function bindClick(button, id, handler) {
  if (!button) {
    console.warn(`${id} not found`);
    return;
  }

  button.addEventListener("click", handler);
}
