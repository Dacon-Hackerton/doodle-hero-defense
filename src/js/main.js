import { BattleManager } from "./battle/BattleManager.js";
import { DrawingCanvas } from "./drawing/DrawingCanvas.js";
import { JudgeManager } from "./drawing/JudgeManager.js";
import { StatCalculator } from "./drawing/StatCalculator.js";
import { PlayerRunStorage } from "./storage/PlayerRunStorage.js";

document.addEventListener("DOMContentLoaded", async () => {
  const drawingCanvas = createDrawingCanvas();
  const currentJudgeManager = createCurrentJudgeManager();
  const selectedJudgeManager = createSelectedJudgeManager();

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

  const hasSavedSlotData = await loadSavedRunData();

  if (hasSavedSlotData) {
    showScreen("judgeScreen");
  } else {
    showScreen("startScreen");
  }

  bindClick(startButton, "startButton", () => {
    showScreen("drawScreen");
  });

  bindClick(judgeButton, "judgeButton", () => {
    if (!drawingCanvas || !currentJudgeManager) {
      return;
    }

    currentCharacter = createCharacterFromCurrentDrawing({
      drawingCanvas,
      judgeManager: currentJudgeManager,
      characterNameInput,
    });

    currentJudgeManager.renderResult(currentCharacter);
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
    selectedJudgeManager.renderResult(selectedCharacter);

    saveCurrentRunData();
  });

  slotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotIndex = Number(button.dataset.slotIndex);
      const character = characterSlots[slotIndex];

      selectedSlotIndex = slotIndex;

      if (!character) {
        selectedCharacter = null;
        renderCharacterSlots(characterSlots, selectedSlotIndex);
        saveCurrentRunData();
        return;
      }

      selectedCharacter = character;

      renderCharacterSlots(characterSlots, selectedSlotIndex);
      selectedJudgeManager.renderResult(selectedCharacter);

      saveCurrentRunData();
    });
  });

  bindClick(battleStartButton, "battleStartButton", () => {
    if (!areAllSlotsFilled(characterSlots)) {
      console.warn("캐릭터 슬롯 3개를 모두 채워야 전투를 시작할 수 있습니다.");
      return;
    }

    if (!selectedCharacter) {
      console.warn("전투에 사용할 캐릭터 슬롯을 선택하세요.");
      return;
    }

    showScreen("battleScreen");

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");
    }

    battleManager.setStatusElement(battleStatusText);
    battleManager.startBattle([selectedCharacter]);
  });

  bindClick(summonAllyButton, "summonAllyButton", () => {
    if (!battleManager || !selectedCharacter) {
      return;
    }

    battleManager.summonAlly(selectedCharacter);
  });

  bindClick(restartBattleButton, "restartBattleButton", () => {
    if (!battleManager || !selectedCharacter) {
      return;
    }

    battleManager.startBattle([selectedCharacter]);
  });

  bindClick(backDrawButton, "backDrawButton", () => {
    currentCharacter = null;
    showScreen("drawScreen");
  });

  bindClick(backDrawFromBattleButton, "backDrawFromBattleButton", () => {
    battleManager?.stop();
    showScreen("drawScreen");
  });

  async function loadSavedRunData() {
    try {
      const savedRunData = await PlayerRunStorage.loadRunData();

      if (!savedRunData) {
        console.log("저장된 슬롯 데이터가 없습니다.");
        return false;
      }

      characterSlots = savedRunData.characterSlots ?? [null, null, null];
      selectedSlotIndex = savedRunData.selectedSlotIndex ?? null;

      const hasSlotCharacter = characterSlots.some(
        (character) => character !== null,
      );

      if (!hasSlotCharacter) {
        console.log("저장된 슬롯 캐릭터가 없습니다.");
        return false;
      }

      if (selectedSlotIndex === null || !characterSlots[selectedSlotIndex]) {
        selectedSlotIndex = characterSlots.findIndex(
          (character) => character !== null,
        );
      }

      selectedCharacter = characterSlots[selectedSlotIndex] ?? null;

      renderCharacterSlots(characterSlots, selectedSlotIndex);

      if (selectedCharacter && selectedJudgeManager) {
        selectedJudgeManager.renderResult(selectedCharacter);
      }

      console.log("저장된 슬롯 데이터 불러오기 완료");
      return true;
    } catch (error) {
      console.warn("저장된 슬롯 데이터를 불러오지 못했습니다.", error);
      return false;
    }
  }

  async function saveCurrentRunData() {
    try {
      await PlayerRunStorage.saveRunData({
        characterSlots,
        selectedSlotIndex,
        savedAt: Date.now(),
      });

      console.log("슬롯 데이터 저장 완료");
    } catch (error) {
      console.warn("슬롯 데이터를 저장하지 못했습니다.", error);
    }
  }
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

function createCurrentJudgeManager() {
  return new JudgeManager({
    previewImage: document.getElementById("currentPreviewImage"),
    resultName: document.getElementById("currentResultName"),
    resultGrade: document.getElementById("currentResultGrade"),
    resultPower: document.getElementById("currentResultPower"),
    resultComment: document.getElementById("currentResultComment"),
    statAttack: document.getElementById("currentStatAttack"),
    statHp: document.getElementById("currentStatHp"),
    statSpeed: document.getElementById("currentStatSpeed"),
    statAttackSpeed: document.getElementById("currentStatAttackSpeed"),
    statRange: document.getElementById("currentStatRange"),
    statCost: document.getElementById("currentStatCost"),
  });
}

function createSelectedJudgeManager() {
  return new JudgeManager({
    previewImage: document.getElementById("selectedPreviewImage"),
    resultName: document.getElementById("selectedResultName"),
    resultGrade: document.getElementById("selectedResultGrade"),
    resultPower: document.getElementById("selectedResultPower"),
    resultComment: document.getElementById("selectedResultComment"),
    statAttack: document.getElementById("selectedStatAttack"),
    statHp: document.getElementById("selectedStatHp"),
    statSpeed: document.getElementById("selectedStatSpeed"),
    statAttackSpeed: document.getElementById("selectedStatAttackSpeed"),
    statRange: document.getElementById("selectedStatRange"),
    statCost: document.getElementById("selectedStatCost"),
  });
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