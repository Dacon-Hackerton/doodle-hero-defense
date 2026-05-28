import { BattleManager } from "./battle/BattleManager.js";
import { DrawingCanvas } from "./drawing/DrawingCanvas.js";
import { JudgeManager } from "./drawing/JudgeManager.js";

document.addEventListener("DOMContentLoaded", () => {
  const screens = {
    draw: getRequiredElement("drawScreen"),
    judge: getRequiredElement("judgeScreen"),
    battle: getRequiredElement("battleScreen"),
  };

  const drawingCanvas = new DrawingCanvas({
    canvas: getRequiredElement("drawCanvas"),
    colorButtons: document.querySelectorAll(".color-btn"),
    brushSizeInput: getRequiredElement("brushSize"),
    eraserButton: getRequiredElement("eraserBtn"),
    undoButton: getRequiredElement("undoBtn"),
    clearButton: getRequiredElement("clearBtn"),
  });

  const judgeManager = new JudgeManager({
    previewImage: getRequiredElement("previewImage"),
    resultName: getRequiredElement("resultName"),
    resultGrade: getRequiredElement("resultGrade"),
    resultPower: getRequiredElement("resultPower"),
    resultComment: getRequiredElement("resultComment"),
    statAttack: getRequiredElement("statAttack"),
    statHp: getRequiredElement("statHp"),
    statSpeed: getRequiredElement("statSpeed"),
    statAttackSpeed: getRequiredElement("statAttackSpeed"),
    statRange: getRequiredElement("statRange"),
    statCost: getRequiredElement("statCost"),
  });

  const nameInput = getRequiredElement("nameInput");
  const judgeButton = getRequiredElement("judgeBtn");
  const goBattleButton = getRequiredElement("goBattleBtn");
  const backDrawButton = getRequiredElement("backDrawBtn");
  const backDrawFromBattleButton = getRequiredElement("backDrawFromBattleBtn");

  let currentCharacter = null;
  let battleManager = null;

  drawingCanvas.init();
  showScreen(screens, "draw");

  judgeButton.addEventListener("click", () => {
    currentCharacter = judgeManager.createCharacter({
      originalName: nameInput.value,
      imageData: drawingCanvas.toImageData(),
    });

    judgeManager.renderResult(currentCharacter);
    showScreen(screens, "judge");
  });

  goBattleButton.addEventListener("click", () => {
    if (!currentCharacter) {
      currentCharacter = judgeManager.createCharacter({
        originalName: nameInput.value,
        imageData: drawingCanvas.toImageData(),
      });
    }

    showScreen(screens, "battle");

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");
    }

    battleManager.start(currentCharacter);
  });

  backDrawButton.addEventListener("click", () => {
    showScreen(screens, "draw");
  });

  backDrawFromBattleButton.addEventListener("click", () => {
    battleManager?.stop();
    showScreen(screens, "draw");
  });
});

function showScreen(screens, screenName) {
  Object.entries(screens).forEach(([name, screen]) => {
    const isActive = name === screenName;
    screen.hidden = !isActive;
    screen.classList.toggle("active", isActive);
  });
}

function getRequiredElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Required element not found: ${id}`);
  }

  return element;
}
