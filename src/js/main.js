import { BattleManager } from "./battle/BattleManager.js";
import { DrawingCanvas } from "./drawing/DrawingCanvas.js";
import { JudgeManager } from "./drawing/JudgeManager.js";
import { StatCalculator } from "./drawing/StatCalculator.js";
import { createCorruptedCharacter } from "./models/CharacterSchema.js";
import {
  loadCurrentStage,
  saveCurrentStage,
} from "./storage/LocalStorageManager.js";
import { PlayerRunStorage } from "./storage/PlayerRunStorage.js";

const DEFAULT_CARD_COOLDOWN = 3.0;
const STAGE_CLEAR_REWARD = 5000;
const INVASION_SAVE_CHANCE = 1;
const PLAYER_STAGE_GROWTH_RATE = 1.04;
let firebaseManagerPromise = null;

const INK_TANK_CONFIG = {
  1: {
    ratio: 0.5,
    nextPrice: 2000,
  },
  2: {
    ratio: 0.65,
    nextPrice: 4000,
  },
  3: {
    ratio: 0.8,
    nextPrice: null,
  },
};

const MAX_INK_TANK_LEVEL = 3;


const CANVAS_CONFIG = {
  1: {
    width: 400,
    height: 400,
    nextPrice: 3000,
  },
  2: {
    width: 500,
    height: 500,
    nextPrice: 6000,
  },
  3: {
    width: 600,
    height: 600,
    nextPrice: null,
  },
};

const MAX_CANVAS_LEVEL = 3;


document.addEventListener("DOMContentLoaded", async () => {
  const drawingCanvas = createDrawingCanvas();
  const currentJudgeManager = createCurrentJudgeManager();
  const selectedJudgeManager = createSelectedJudgeManager();

  const characterNameInput = document.getElementById("characterNameInput");
  const startButton = document.getElementById("startButton");
  const continueButton = document.getElementById("continueButton");
  const newGameButton = document.getElementById("newGameButton");
  const playerNameInput = document.getElementById("playerNameInput");
  const refreshRankingButton = document.getElementById("refreshRankingButton");
  const judgeButton = document.getElementById("judgeButton");
  const battleStartButton = document.getElementById("battleStartButton");
  const restartBattleButton = document.getElementById("restartBattleButton");
  const battleStatusText = document.getElementById("battleStatusText");
  const returnTitleButton = document.getElementById("returnTitleButton");
  const goDrawButton = document.getElementById("goDrawButton");
  const backDrawButton = document.getElementById("backDrawButton");
  const backDrawFromBattleButton = document.getElementById(
    "backDrawFromBattleButton",
  );

  const saveSlotButton = document.getElementById("saveSlotButton");
  const slotButtons = document.querySelectorAll(".character-slot");
  const battleSlotButtons = document.querySelectorAll(".battle-slot-card");
  const shopColorButtons = document.querySelectorAll(".shop-color-item");
  const inkTankUpgradeButton = document.getElementById("inkTankUpgradeButton");
  const canvasUpgradeButton = document.getElementById("canvasUpgradeButton");

  const panelTabButtons = document.querySelectorAll(".panel-tab");
  const panelContents = document.querySelectorAll(".panel-content");

  panelTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.panelTab;

      panelTabButtons.forEach((tabButton) => {
        tabButton.classList.toggle("active", tabButton === button);
      });

      panelContents.forEach((panel) => {
        panel.classList.toggle("active", panel.id === `${targetTab}Panel`);
      });
    });
  });

  battleSlotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotIndex = Number(button.dataset.battleSlotIndex);
      const character = characterSlots[slotIndex];

      handleBattleCardClick(character, button);
    });
  });

  let currentCharacter = null;
  let selectedCharacter = null;
  let selectedSlotIndex = null;
  let characterSlots = [null, null, null];
  let battleManager = null;
  let invasionCharacters = [];
  const cardCooldowns = new Map();
  let cardCooldownFrameId = null;
  let lastCardCooldownTime = 0;
  let toastTimeoutId = null;
  let currentStage = loadCurrentStage();
  let isStageClearReplacementMode = false;
  let isHandlingStageClear = false;
  let fallenCharacter = null;
  let money = 10000;
  let unlockedColors = ["#000000"];
  let inkTankLevel = 1;
  let canvasLevel = 1;
  let playerName = "";

  const hasSavedSlotData = await loadSavedRunData();

  applyCanvasLevelToDrawingCanvas(drawingCanvas, canvasLevel, inkTankLevel);

  renderShopState({
    money,
    unlockedColors,
    inkTankLevel,
    canvasLevel,
  });

  renderDrawingUpgradeInfo({
    canvasLevel,
    inkTankLevel,
  });

  if (!hasSavedSlotData) {
    currentStage = 1;
    saveCurrentStage(currentStage);
  }

  updateStartActions(hasSavedSlotData);
  updateBattleStartButtonState();
  showScreen("startScreen");

  loadAndRenderRankings();

  bindClick(startButton, "startButton", async () => {
    const nextPlayerName = playerNameInput?.value.trim() ?? "";

    if (!nextPlayerName) {
      showToast("닉네임을 입력해주세요.");
      playerNameInput?.focus();
      return;
    }

    playerName = nextPlayerName;
    await saveCurrentRunData();

    showScreen("drawScreen");
  });

  bindClick(continueButton, "continueButton", async () => {
    const nextPlayerName = playerNameInput?.value.trim() ?? playerName;

    if (nextPlayerName) {
      playerName = nextPlayerName;
      await saveCurrentRunData();
    }

    showScreen("judgeScreen");
  });

  bindClick(refreshRankingButton, "refreshRankingButton", () => {
    loadAndRenderRankings();
  });

  bindClick(newGameButton, "newGameButton", async () => {
    await startNewGame();
    updateStartActions(false);
    updateBattleStartButtonState();
    showScreen("drawScreen");
  });

  bindClick(returnTitleButton, "returnTitleButton", async () => {
    hideBattleResult();
    battleManager?.stop();
    stopCardCooldownLoop();

    const hasSavedData = await loadSavedRunData();
    updateStartActions(hasSavedData);
    updateBattleStartButtonState();
    showScreen("startScreen");
  });

  bindClick(goDrawButton, "goDrawButton", () => {
    hideBattleResult();
    battleManager?.stop();
    stopCardCooldownLoop();

    currentCharacter = null;
    clearCurrentResult();
    drawingCanvas?.clearCanvas();
    updateBattleStartButtonState();
    showScreen("drawScreen");
  });

  bindClick(judgeButton, "judgeButton", async () => {
    if (!drawingCanvas || !currentJudgeManager) {
      return;
    }

    currentCharacter = createCharacterFromCurrentDrawing({
      drawingCanvas,
      judgeManager: currentJudgeManager,
      characterNameInput,
      canvasLevel,
      currentStage,
    });

    currentJudgeManager.renderResult(currentCharacter);
    updateComparisonVisibility();
    showScreen("judgeScreen");

    await trySaveAsInvasionCharacter(currentCharacter);
  });

  shopColorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const color = button.dataset.shopColor;
      const price = Number(button.dataset.price);

      if (unlockedColors.includes(color)) {
          return;
      }

      if (money < price) {
        showToast("돈이 부족합니다.");
        return;
      }

      money -= price;
      unlockedColors.push(color);

      renderShopState({ money, unlockedColors, inkTankLevel, canvasLevel });
      saveCurrentRunData();
    });
  });

  bindClick(inkTankUpgradeButton, "inkTankUpgradeButton", () => {
    const currentConfig = INK_TANK_CONFIG[inkTankLevel];
    const nextPrice = currentConfig.nextPrice;

    if (inkTankLevel >= MAX_INK_TANK_LEVEL || nextPrice === null) {
      showToast("이미 잉크통이 최대 레벨입니다.");
      return;
    }

    if (money < nextPrice) {
      showToast("돈이 부족합니다.");
      return;
    }

    money -= nextPrice;
    inkTankLevel += 1;

    if (drawingCanvas) {
      drawingCanvas.setMaxInk(
        getMaxInkByInkTankLevel(drawingCanvas.canvas, inkTankLevel),
      );
    }

    renderShopState({ money, unlockedColors, inkTankLevel, canvasLevel });

    renderDrawingUpgradeInfo({
      canvasLevel,
      inkTankLevel,
    });

    saveCurrentRunData();
  });

  bindClick(canvasUpgradeButton, "canvasUpgradeButton", () => {
    const currentConfig = getCanvasConfig(canvasLevel);
    const nextPrice = currentConfig.nextPrice;

    if (canvasLevel >= MAX_CANVAS_LEVEL || nextPrice === null) {
      showToast("이미 캔버스가 최대 레벨입니다.");
      return;
    }

    if (money < nextPrice) {
      showToast("돈이 부족합니다.");
      return;
    }
    showModal({
      title: "캔버스 확장",
      message: "캔버스를 확장하면 현재 그리던 그림이 초기화됩니다. 그래도 확장할까요?",
      actions: [
        {
          label: "취소",
          onClick: hideModal,
        },
        {
          label: "확장하기",
          primary: true,
          onClick: () => {
            hideModal();
            upgradeCanvas(nextPrice);
          },
        },
      ],
    });
  });


  function upgradeCanvas(price) {
    money -= price;
    canvasLevel += 1;
    currentCharacter = null;
    clearCurrentResult();

    applyCanvasLevelToDrawingCanvas(drawingCanvas, canvasLevel, inkTankLevel);

    renderShopState({
      money,
      unlockedColors,
      inkTankLevel,
      canvasLevel,
    });

    renderDrawingUpgradeInfo({
      canvasLevel,
      inkTankLevel,
    });

    saveCurrentRunData();
  }

  bindClick(saveSlotButton, "saveSlotButton", () => {
    if (!currentCharacter) {
      showToast("먼저 캐릭터를 그리고 감정해주세요.");
      return;
    }

    const emptySlotIndex = characterSlots.findIndex((slot) => slot === null);

    if (emptySlotIndex !== -1) {
      registerCharacterToSlot(currentCharacter, emptySlotIndex);
      return;
    }

    if (selectedSlotIndex === null) {
      showModal({
        title: "교체할 슬롯 선택",
        message: "슬롯이 모두 찼습니다. 교체할 슬롯을 먼저 선택해주세요.",
      });
      return;
    }

    replaceCharacterInSlot(currentCharacter, selectedSlotIndex);
  });

  function registerCharacterToSlot(character, targetIndex) {
    characterSlots[targetIndex] = character;
    selectedSlotIndex = targetIndex;
    selectedCharacter = character;
    currentCharacter = null;
    clearCurrentResult();

    renderCharacterSlots(characterSlots, selectedSlotIndex);
    selectedJudgeManager.renderResult(selectedCharacter);
    updateBattleStartButtonState();
    updateComparisonVisibility();
    saveCurrentRunData();

    const filledCount = getFilledSlotCount();

    if (filledCount < 3) {
      showToast(`캐릭터 등록 완료 (${filledCount}/3). 다음 캐릭터를 그려주세요.`);
      drawingCanvas?.clearCanvas();
      showScreen("drawScreen");
      return;
    }

    showToast("캐릭터 3명이 모두 등록되었습니다. 전투를 시작할 수 있습니다.");
    showScreen("judgeScreen");
  }

  function replaceCharacterInSlot(character, targetIndex) {
    const replacedCharacter = characterSlots[targetIndex] ?? null;

    if (isStageClearReplacementMode && replacedCharacter) {
      fallenCharacter = markCharacterAsCorrupted(replacedCharacter, currentStage);
    }

    characterSlots[targetIndex] = character;
    selectedSlotIndex = targetIndex;
    selectedCharacter = character;
    currentCharacter = null;
    clearCurrentResult();
    isStageClearReplacementMode = false;
    isHandlingStageClear = false;

    renderCharacterSlots(characterSlots, selectedSlotIndex);
    selectedJudgeManager.renderResult(selectedCharacter);
    updateBattleStartButtonState();
    updateComparisonVisibility();
    saveCurrentRunData();
    showToast("캐릭터를 교체했습니다. 전투를 시작할 수 있습니다.");
  }

  slotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const slotIndex = Number(button.dataset.slotIndex);
      const character = characterSlots[slotIndex];

      selectedSlotIndex = slotIndex;

      if (!character) {
        selectedCharacter = null;
        renderCharacterSlots(characterSlots, selectedSlotIndex);
        updateBattleStartButtonState();
        updateComparisonVisibility();
        saveCurrentRunData();
        return;
      }

      selectedCharacter = character;

      renderCharacterSlots(characterSlots, selectedSlotIndex);
      selectedJudgeManager.renderResult(selectedCharacter);
      updateBattleStartButtonState();
      updateComparisonVisibility();

      saveCurrentRunData();
    });
  });

  bindClick(battleStartButton, "battleStartButton", async () => {
    if (!areAllSlotsFilled(characterSlots)) {
      showToast("캐릭터 3명을 모두 등록해야 전투를 시작할 수 있습니다.");
      return;
    }
    if (isStageClearReplacementMode) {
      showToast("스테이지 클리어 후에는 새 캐릭터를 만들고 기존 슬롯 하나와 교체해야 합니다.");
      return;
    }

    showScreen("battleScreen");
    hideBattleResult();

    invasionCharacters = await loadAndStoreInvasionCharacters();

    if (!battleManager) {
      battleManager = new BattleManager("battleCanvas");

      battleManager.setBattleEndHandler(async (battleResult) => {
        stopCardCooldownLoop();

        if (battleResult.result === "WIN") {
          await handleStageClear();
        }

        if (battleResult.result === "LOSE") {
          await handleGameOver();
        }

        showBattleResult(battleResult.state);
      });
    }

    battleManager.setStatusElement(battleStatusText);
    battleManager.setStage(currentStage);
    battleManager.setFallenCharacter(fallenCharacter);
    battleManager.setInvasionCharacters(invasionCharacters);
    battleManager.startBattle(characterSlots);
    resetCardCooldowns(characterSlots);
    renderBattleSlotCards(characterSlots, {
      battleManager,
      cardCooldowns,
    });
    startCardCooldownLoop();
  });

  bindClick(restartBattleButton, "restartBattleButton", () => {
    if (!battleManager || !areAllSlotsFilled(characterSlots)) {
      return;
    }

    battleManager.setStage(currentStage);
    battleManager.setFallenCharacter(fallenCharacter);
    battleManager.setInvasionCharacters(invasionCharacters);
    hideBattleResult();
    battleManager.startBattle(characterSlots);
    resetCardCooldowns(characterSlots);
    renderBattleSlotCards(characterSlots, {
      battleManager,
      cardCooldowns,
    });
    startCardCooldownLoop();
  });

  bindClick(backDrawButton, "backDrawButton", () => {
    currentCharacter = null;
    clearCurrentResult();
    showScreen("drawScreen");
  });

  bindClick(backDrawFromBattleButton, "backDrawFromBattleButton", () => {
    battleManager?.stop();
    stopCardCooldownLoop();
    showScreen("drawScreen");
  });

  function handleBattleCardClick(character, cardElement) {
    if (!battleManager || !character || !cardElement) {
      return;
    }

    if (isCardCoolingDown(character.id)) {
      return;
    }

    const success = battleManager.summonAlly(character);

    if (!success) {
      renderBattleSlotCards(characterSlots, {
        battleManager,
        cardCooldowns,
      });
      return;
    }

    startCardCooldown(character.id);
    renderBattleSlotCards(characterSlots, {
      battleManager,
      cardCooldowns,
    });
  }

  function resetCardCooldowns(characters) {
    cardCooldowns.clear();

    characters.filter(Boolean).forEach((character) => {
      cardCooldowns.set(character.id, {
        remaining: 0,
        duration: getCardCooldownDuration(character),
      });
    });
  }

  function startCardCooldown(characterId) {
    const cooldown = cardCooldowns.get(characterId);

    if (!cooldown) {
      return;
    }

    cooldown.remaining = cooldown.duration;
    cardCooldowns.set(characterId, cooldown);
  }

  function isCardCoolingDown(characterId) {
    return (cardCooldowns.get(characterId)?.remaining ?? 0) > 0;
  }

  function getCardCooldownDuration(character) {
    const cooldown = Number(character?.cooldown);

    return Number.isFinite(cooldown) && cooldown > 0
      ? cooldown
      : DEFAULT_CARD_COOLDOWN;
  }

  function startCardCooldownLoop() {
    stopCardCooldownLoop();
    lastCardCooldownTime = performance.now();
    cardCooldownFrameId = requestAnimationFrame(updateCardCooldowns);
  }

  function stopCardCooldownLoop() {
    if (!cardCooldownFrameId) {
      return;
    }

    cancelAnimationFrame(cardCooldownFrameId);
    cardCooldownFrameId = null;
    lastCardCooldownTime = 0;
  }

  function updateCardCooldowns(timestamp) {
    const deltaTime = Math.min((timestamp - lastCardCooldownTime) / 1000, 0.1);
    lastCardCooldownTime = timestamp;

    cardCooldowns.forEach((cooldown, characterId) => {
      if (cooldown.remaining <= 0) {
        return;
      }

      cooldown.remaining = Math.max(0, cooldown.remaining - deltaTime);
      cardCooldowns.set(characterId, cooldown);
    });

    renderBattleSlotCards(characterSlots, {
      battleManager,
      cardCooldowns,
    });
    cardCooldownFrameId = requestAnimationFrame(updateCardCooldowns);
  }

  async function loadSavedRunData() {
    try {
      const savedRunData = await PlayerRunStorage.loadRunData();

      if (!savedRunData) {
        console.log("저장된 슬롯 데이터가 없습니다.");
        return false;
      }

      const savedCharacterSlots = savedRunData.characterSlots ?? [null, null, null];

      const hasSlotCharacter = savedCharacterSlots.some(
        (character) => character !== null,
      );

      if (!hasSlotCharacter) {
        console.log("저장된 슬롯 캐릭터가 없습니다. 저장 데이터를 초기화합니다.");

        await PlayerRunStorage.clearRunData();

        currentStage = 1;
        characterSlots = [null, null, null];
        selectedSlotIndex = null;
        selectedCharacter = null;
        fallenCharacter = null;
        isStageClearReplacementMode = false;
        isHandlingStageClear = false;

        money = 10000;
        unlockedColors = ["#000000"];
        inkTankLevel = 1;
        canvasLevel = 1;

        return false;
      }

      currentStage = savedRunData.currentStage ?? loadCurrentStage();
      isStageClearReplacementMode = savedRunData.isStageClearReplacementMode ?? false;
      characterSlots = savedCharacterSlots;
      selectedSlotIndex = savedRunData.selectedSlotIndex ?? null;
      money = savedRunData.money ?? 10000;
      unlockedColors = savedRunData.unlockedColors ?? ["#000000"];
      inkTankLevel = savedRunData.inkTankLevel ?? 1;
      canvasLevel = savedRunData.canvasLevel ?? 1;
      playerName = savedRunData.playerName ?? "";

      if (playerNameInput) {
        playerNameInput.value = playerName;
      }

      if (selectedSlotIndex === null || !characterSlots[selectedSlotIndex]) {
        selectedSlotIndex = characterSlots.findIndex(
          (character) => character !== null,
        );
      }

      selectedCharacter = characterSlots[selectedSlotIndex] ?? null;
      fallenCharacter = savedRunData.fallenCharacter ?? null;

      renderCharacterSlots(characterSlots, selectedSlotIndex);

      if (selectedCharacter && selectedJudgeManager) {
        selectedJudgeManager.renderResult(selectedCharacter);
      }

      updateBattleStartButtonState();
      updateComparisonVisibility();

      console.log("저장된 슬롯 데이터 불러오기 완료");
      return true;
    } catch (error) {
      console.warn("저장된 플레이 데이터를 불러오지 못했습니다.", error);
      showToast("저장된 데이터를 불러오지 못했습니다.");
      return false;
    }
  }

  async function saveCurrentRunData() {
    try {
      await PlayerRunStorage.saveRunData({
        currentStage,
        characterSlots,
        selectedSlotIndex,
        fallenCharacter,
        isStageClearReplacementMode,
        money,
        unlockedColors,
        inkTankLevel,
        canvasLevel,
        playerName,
        savedAt: Date.now(),
      });
      saveCurrentStage(currentStage);

      console.log("슬롯 데이터 저장 완료");
    } catch (error) {
      console.warn("슬롯 데이터를 저장하지 못했습니다.", error);
    }
  }

  async function loadAndStoreInvasionCharacters() {
    const firebaseManager = await getFirebaseManager();

    if (!firebaseManager?.loadInvasionCharactersFromFirebase) {
      invasionCharacters = [];
      return invasionCharacters;
    }

    try {
      const loadedCharacters = await firebaseManager.loadInvasionCharactersFromFirebase();
      invasionCharacters = Array.isArray(loadedCharacters) ? loadedCharacters : [];
    } catch (error) {
      console.warn("Failed to load Firebase invasion candidates", error);
      invasionCharacters = [];
    }

    return invasionCharacters;
  }

  async function trySaveAsInvasionCharacter(character) {
    if (!character) {
      return;
    }

    if (Math.random() > INVASION_SAVE_CHANCE) {
      console.log("난입 캐릭터 저장 미당첨");
      return;
    }

    const firebaseManager = await getFirebaseManager();

    if (!firebaseManager?.saveInvasionCharacterToFirebase) {
      return;
    }

    const firebaseId = await firebaseManager.saveInvasionCharacterToFirebase(character);

    if (firebaseId) {
      character.invasionFirebaseId = firebaseId;
      console.log("난입 캐릭터 저장 완료:", firebaseId);
    }
  }

  async function startNewGame() {
    battleManager?.stop();
    stopCardCooldownLoop();

    currentCharacter = null;
    selectedCharacter = null;
    selectedSlotIndex = null;
    characterSlots = [null, null, null];
    currentStage = 1;
    isStageClearReplacementMode = false;
    isHandlingStageClear = false;
    fallenCharacter = null;
    invasionCharacters = [];
    cardCooldowns.clear();
    clearCurrentResult();

    money = 10000;
    unlockedColors = ["#000000"];
    inkTankLevel = 1;
    canvasLevel = 1;

    applyCanvasLevelToDrawingCanvas(drawingCanvas, canvasLevel, inkTankLevel);

    renderShopState({
      money,
      unlockedColors,
      inkTankLevel,
      canvasLevel,
    });

    drawingCanvas?.clearCanvas();

    await PlayerRunStorage.clearRunData();
    saveCurrentStage(currentStage);
    renderCharacterSlots(characterSlots, selectedSlotIndex);
    updateBattleStartButtonState();
    updateComparisonVisibility();
  }

  async function handleStageClear() {
    if (isHandlingStageClear || isStageClearReplacementMode) {
      return;
    }

    isHandlingStageClear = true;
    money += STAGE_CLEAR_REWARD;
    currentStage += 1;
    saveCurrentStage(currentStage);
    currentCharacter = null;
    clearCurrentResult();
    selectedCharacter = null;
    selectedSlotIndex = null;
    isStageClearReplacementMode = true;

    renderShopState({
      money,
      unlockedColors,
      inkTankLevel,
      canvasLevel,
    });

    renderCharacterSlots(characterSlots, selectedSlotIndex);

    await saveCurrentRunData();
    updateBattleStartButtonState();
    updateComparisonVisibility();
    isHandlingStageClear = false;
  }

  async function handleGameOver() {
    const rankings = await loadCurrentRankingsOnly();

    if (shouldRegisterRanking(rankings, currentStage)) {
      await savePlayerRanking();
    }

    const nextRankings = await loadCurrentRankingsOnly();

    renderRankingList(nextRankings, "battleResultRanking");
    renderRankingList(nextRankings, "rankingList");

    await resetRunAfterGameOver();
  }

  async function resetRunAfterGameOver() {
    battleManager?.stop();
    stopCardCooldownLoop();

    const savedPlayerName = playerName || playerNameInput?.value.trim() || "";

    currentCharacter = null;
    selectedCharacter = null;
    selectedSlotIndex = null;
    characterSlots = [null, null, null];
    currentStage = 1;
    isStageClearReplacementMode = false;
    isHandlingStageClear = false;
    fallenCharacter = null;
    invasionCharacters = [];
    cardCooldowns.clear();

    money = 10000;
    unlockedColors = ["#000000"];
    inkTankLevel = 1;
    canvasLevel = 1;
    playerName = savedPlayerName;

    clearCurrentResult();
    drawingCanvas?.clearCanvas();

    applyCanvasLevelToDrawingCanvas(drawingCanvas, canvasLevel, inkTankLevel);

    renderShopState({
      money,
      unlockedColors,
      inkTankLevel,
      canvasLevel,
    });

    renderDrawingUpgradeInfo({
      canvasLevel,
      inkTankLevel,
    });

    renderCharacterSlots(characterSlots, selectedSlotIndex);
    updateBattleStartButtonState();
    updateComparisonVisibility();

    await PlayerRunStorage.clearRunData();
    saveCurrentStage(currentStage);

    if (playerNameInput) {
      playerNameInput.value = playerName;
    }

    updateStartActions(false);
  }

  async function savePlayerRanking() {
    const firebaseManager = await getFirebaseManager();

    if (!firebaseManager?.saveRankingToFirebase) {
      return null;
    }

    const nextPlayerName = playerName || playerNameInput?.value.trim() || "익명";

    const rankingData = {
      playerName: nextPlayerName,
      reachedStage: currentStage,
      characterSlots: characterSlots.map((character) => {
        if (!character) {
          return null;
        }

        return {
          name: character.name ?? "낙서",
          grade: character.grade ?? "C",
          power: character.stats?.power ?? 0,
          imageData: character.imageData ?? "",
          stats: {
            attack: character.stats?.attack ?? 0,
            hp: character.stats?.hp ?? 0,
            speed: character.stats?.speed ?? 0,
            attackSpeed: character.stats?.attackSpeed ?? 0,
            range: character.stats?.range ?? 0,
            cost: character.stats?.cost ?? 0,
          },
        };
      }),
    };

    return await firebaseManager.saveRankingToFirebase(rankingData);
  }

  async function loadCurrentRankingsOnly() {
    const firebaseManager = await getFirebaseManager();

    if (!firebaseManager?.loadRankingsFromFirebase) {
      return [];
    }

    return await firebaseManager.loadRankingsFromFirebase();
  }

  function shouldRegisterRanking(rankings, reachedStage) {
    if (!Array.isArray(rankings)) {
      return true;
    }

    if (rankings.length < 10) {
      return true;
    }

    const lastRanking = rankings[rankings.length - 1];
    const lastStage = Number(lastRanking?.reachedStage) || 0;

    return reachedStage > lastStage;
  }

  function showBattleResult(result) {
    const overlay = document.getElementById("battleResultOverlay");
    const title = document.getElementById("battleResultTitle");
    const message = document.getElementById("battleResultMessage");

    if (!overlay || !title || !message) {
      return;
    }

    const isWin = result === "win";

    title.textContent = isWin ? "승리!" : "패배...";
    message.textContent = isWin
      ? "적 기지를 파괴했습니다. 새로운 낙서를 그려 다음 전투를 준비하세요."
      : "아군 기지가 파괴되었습니다. 기록을 랭킹에 반영하고 처음부터 다시 시작합니다.";

    overlay.hidden = false;
    overlay.classList.remove("hidden");
  }

  function hideBattleResult() {
    const overlay = document.getElementById("battleResultOverlay");

    if (!overlay) {
      return;
    }

    overlay.hidden = true;
    overlay.classList.add("hidden");
  }

  function showToast(message) {
    const toast = document.getElementById("toastMessage");
    if (!toast) {
      return;
    }

    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("hidden");

    toastTimeoutId = setTimeout(() => {
      hideToast();
    }, 2200);
  }

  function hideToast() {
    const toast = document.getElementById("toastMessage");

    if (!toast) {
      return;
    }

    toast.hidden = true;
    toast.classList.add("hidden");
    toastTimeoutId = null;
  }

  function showModal({ title, message, actions = [] }) {
    const modal = document.getElementById("appModal");
    const modalTitle = document.getElementById("appModalTitle");
    const modalMessage = document.getElementById("appModalMessage");
    const modalActions = document.getElementById("appModalActions");

    if (!modal || !modalTitle || !modalMessage || !modalActions) {
      return;
    }

    modalTitle.textContent = title ?? "";
    modalMessage.textContent = message ?? "";
    modalActions.innerHTML = "";

    const nextActions = actions.length > 0
      ? actions
      : [{ label: "확인", primary: true, onClick: hideModal }];

    nextActions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;

      if (action.primary) {
        button.classList.add("primary-btn");
      }

      button.addEventListener("click", () => {
        action.onClick?.();
      });

      modalActions.appendChild(button);
    });

    modal.hidden = false;
    modal.classList.remove("hidden");
  }

  function hideModal() {
    const modal = document.getElementById("appModal");

    if (!modal) {
      return;
    }

    modal.hidden = true;
    modal.classList.add("hidden");
  }

  function updateBattleStartButtonState() {
    if (!battleStartButton) {
      return;
    }

    battleStartButton.disabled = getFilledSlotCount() < 3;
  }

  function updateComparisonVisibility() {
    const selectedPreviewImage = document.getElementById("selectedPreviewImage");
    const selectedResultCard = selectedPreviewImage?.closest(".result-card");

    if (!selectedResultCard) {
      return;
    }

    const shouldShowComparison = getFilledSlotCount() >= 3;
    selectedResultCard.hidden = !shouldShowComparison;
    selectedResultCard.classList.toggle("hidden", !shouldShowComparison);
  }

  function clearCurrentResult() {
    currentJudgeManager?.renderResult(null);
  }

  function getFilledSlotCount() {
    return characterSlots.filter(Boolean).length;
  }

  function markCharacterAsCorrupted(character, stage) {
    return createCorruptedCharacter(character, stage);
  }

  window.__debugAddCorruptedCharacter = (character) => {
    const corruptedCharacter = markCharacterAsCorrupted(
      character,
      currentStage,
    );

    saveCurrentRunData();
    return corruptedCharacter;
  };

  window.__debugLoadRandomInvasionCharacter = async () => {
    const firebaseManager = await getFirebaseManager();

    if (!firebaseManager?.loadRandomInvasionCharacterFromFirebase) {
      return null;
    }

    const character = await firebaseManager.loadRandomInvasionCharacterFromFirebase();

    if (!character) {
      console.log("불러온 난입 캐릭터 없음");
      return null;
    }

    console.log("테스트용 랜덤 난입 캐릭터:", character);
    return character;
  };
});

async function getFirebaseManager(timeoutMs = 2000) {
  if (!firebaseManagerPromise) {
    firebaseManagerPromise = import("./storage/firebaseManager.js").catch((error) => {
      console.warn("Firebase manager is unavailable", error);
      return null;
    });
  }

  return Promise.race([
    firebaseManagerPromise,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

async function loadAndRenderRankings(targetElementId = "rankingList") {
  const firebaseManager = await getFirebaseManager();

  if (!firebaseManager?.loadRankingsFromFirebase) {
    renderRankingList([], targetElementId);
    return [];
  }

  const rankings = await firebaseManager.loadRankingsFromFirebase();
  renderRankingList(rankings, targetElementId);

  return rankings;
}

function updateStartActions(hasSavedSlotData) {
  setElementHidden(document.getElementById("startButton"), hasSavedSlotData);
  setElementHidden(document.getElementById("continueButton"), !hasSavedSlotData);
  setElementHidden(document.getElementById("newGameButton"), !hasSavedSlotData);
}

function setElementHidden(element, hidden) {
  if (!element) {
    return;
  }

  element.hidden = hidden;
  element.classList.toggle("hidden", hidden);
}

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

  const maxInk = getMaxInkByInkTankLevel(canvas, 1);

  const drawingCanvas = new DrawingCanvas({
    canvas,
    colorButtons: document.querySelectorAll(".color-btn"),
    colorPicker: null,
    brushSizeInput,
    eraserButton,
    undoButton,
    clearButton,
    inkText,
    maxInk,
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
  canvasLevel = 1,
  currentStage = 1,
}) {
  const drawCanvas = document.getElementById("drawCanvas");

  const { stats, grade } = StatCalculator.createStatsAndGrade(drawCanvas, {
    canvasLevel,
  });

  const grownStats = applyPlayerStageGrowth(stats, currentStage);

  return judgeManager.createCharacter({
    originalName: characterNameInput?.value ?? "",
    imageData: drawingCanvas.toImageData(),
    stats: grownStats,
    grade,
  });
}

function applyPlayerStageGrowth(stats, currentStage = 1) {
  const safeStage = Math.max(1, Math.floor(Number(currentStage) || 1));
  const multiplier = Math.pow(PLAYER_STAGE_GROWTH_RATE, safeStage - 1);

  const grownStats = { ...stats };

  const scaleIntegerStats = [
    "attack",
    "hp",
    "range",
    "defense",
    "hpRegen",
    "power",
  ];

  scaleIntegerStats.forEach((key) => {
    if (Number.isFinite(Number(grownStats[key]))) {
      grownStats[key] = Math.max(0, Math.round(Number(grownStats[key]) * multiplier));
    }
  });

  const scaleDecimalStats = [
    "speed",
    "attackSpeed",
  ];

  scaleDecimalStats.forEach((key) => {
    if (Number.isFinite(Number(grownStats[key]))) {
      grownStats[key] = Math.max(
        0,
        Math.round(Number(grownStats[key]) * multiplier * 100) / 100,
      );
    }
  });

  // 소환 비용은 강화 배수로 올리지 않는 게 좋음
  grownStats.cost = stats.cost;

  return grownStats;
}

function renderBattleSlotCards(characterSlots, { battleManager, cardCooldowns } = {}) {
  const battleSlotButtons = document.querySelectorAll(".battle-slot-card");
  const currentCost = battleManager?.currentCost ?? 0;

  battleSlotButtons.forEach((button, index) => {
    const character = characterSlots[index];

    button.classList.remove(
      "grade-SS",
      "grade-S",
      "grade-A",
      "grade-B",
      "grade-C",
      "cooldown",
      "cost-blocked",
    );
    button.disabled = false;

    if (!character) {
      button.disabled = true;
      button.innerHTML = `
        <div class="battle-slot-name">빈 슬롯</div>
        <div class="battle-slot-cooldown"></div>
      `;
      return;
    }

    const grade = character.grade ?? "C";
    const cost = Number(character.stats?.cost) || 0;
    const cooldown = cardCooldowns?.get(character.id);
    const remaining = cooldown?.remaining ?? 0;
    const isCoolingDown = remaining > 0;
    const isCostBlocked = currentCost < cost;

    button.classList.add(`grade-${grade}`);
    button.disabled = isCoolingDown;

    if (isCoolingDown) {
      button.classList.add("cooldown");
    }

    if (isCostBlocked) {
      button.classList.add("cost-blocked");
    }

    button.innerHTML = `
      <img class="battle-slot-image" src="${character.imageData}" alt="${character.name}" />
      <div class="battle-slot-name">${character.name}</div>
      <div class="battle-slot-grade">Grade ${grade}</div>
      <div class="battle-slot-power">전투력 ${character.stats.power}</div>
      <div class="battle-slot-cost">Cost ${cost}</div>
      <div class="battle-slot-cooldown">${Math.ceil(remaining)}</div>
    `;
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

function renderShopState({ money, unlockedColors, inkTankLevel = 1, canvasLevel = 1, }) {
  const moneyText = document.getElementById("moneyText");
  const shopColorButtons = document.querySelectorAll(".shop-color-item");
  const colorButtons = document.querySelectorAll(".color-btn");
  const inkTankUpgradeButton = document.getElementById("inkTankUpgradeButton");
  const canvasUpgradeButton = document.getElementById("canvasUpgradeButton");

  if (moneyText) {
    moneyText.textContent = `보유 돈: ${money}원`;
  }

  colorButtons.forEach((button) => {
    const color = button.dataset.color;
    const isUnlocked = unlockedColors.includes(color);

    button.classList.toggle("locked", !isUnlocked);
    button.disabled = !isUnlocked;
  });

  shopColorButtons.forEach((button) => {
    const color = button.dataset.shopColor;
    const price = Number(button.dataset.price);
    const isPurchased = unlockedColors.includes(color);

    if (isPurchased) {
      button.textContent = "구매 완료";
      button.classList.add("purchased");
      button.disabled = true;
      return;
    }

    button.classList.remove("purchased");
    button.disabled = money < price;
  });

  if (!canvasUpgradeButton) {
    return;
  }

  const canvasConfig = getCanvasConfig(canvasLevel);
  const nextCanvasLevel = canvasLevel + 1;
  const nextCanvasPrice = canvasConfig.nextPrice;

  canvasUpgradeButton.classList.remove("max-level");

  if (canvasLevel >= MAX_CANVAS_LEVEL || nextCanvasPrice === null) {
    canvasUpgradeButton.textContent = `캔버스 Lv.${canvasLevel} / 최대 레벨`;
    canvasUpgradeButton.classList.add("max-level");
    canvasUpgradeButton.disabled = true;
  } else {
    canvasUpgradeButton.textContent =
      `캔버스 확장 Lv.${nextCanvasLevel} - ${nextCanvasPrice}원`;
    canvasUpgradeButton.disabled = money < nextCanvasPrice;
  }


  if (!inkTankUpgradeButton) {
    return;
  }

  const inkTankConfig = INK_TANK_CONFIG[inkTankLevel] ?? INK_TANK_CONFIG[1];
  const nextInkTankLevel = inkTankLevel + 1;
  const nextInkTankPrice = inkTankConfig.nextPrice;

  inkTankUpgradeButton.classList.remove("max-level");

  if (inkTankLevel >= MAX_INK_TANK_LEVEL || nextInkTankPrice === null) {
    inkTankUpgradeButton.textContent = `잉크통 Lv.${inkTankLevel} / 최대 레벨`;
    inkTankUpgradeButton.classList.add("max-level");
    inkTankUpgradeButton.disabled = true;
    return;
  }

  inkTankUpgradeButton.textContent =
    `잉크통 업그레이드 Lv.${nextInkTankLevel} - ${nextInkTankPrice}원`;
  inkTankUpgradeButton.disabled = money < nextInkTankPrice;
}

function getMaxInkBySize(width, height, inkTankLevel) {
  const config = INK_TANK_CONFIG[inkTankLevel] ?? INK_TANK_CONFIG[1];

  return Math.floor(width * height * config.ratio);
}

function getCanvasConfig(canvasLevel) {
  return CANVAS_CONFIG[canvasLevel] ?? CANVAS_CONFIG[1];
}

function applyCanvasLevelToDrawingCanvas(drawingCanvas, canvasLevel, inkTankLevel) {
  if (!drawingCanvas) {
    return;
  }

  const canvasConfig = getCanvasConfig(canvasLevel);
  const maxInk = getMaxInkBySize(
    canvasConfig.width,
    canvasConfig.height,
    inkTankLevel,
  );

  drawingCanvas.setCanvasSize(
    canvasConfig.width,
    canvasConfig.height,
    maxInk,
  );
}

function getMaxInkByInkTankLevel(canvas, inkTankLevel) {
  const config = INK_TANK_CONFIG[inkTankLevel] ?? INK_TANK_CONFIG[1];

  return Math.floor(canvas.width * canvas.height * config.ratio);
}

function renderDrawingUpgradeInfo({ canvasLevel, inkTankLevel }) {
  const canvasLevelText = document.getElementById("canvasLevelText");
  const inkTankLevelText = document.getElementById("inkTankLevelText");

  const canvasConfig = getCanvasConfig(canvasLevel);

  if (canvasLevelText) {
    canvasLevelText.textContent =
      `캔버스 Lv.${canvasLevel} / ${canvasConfig.width}×${canvasConfig.height}`;
  }

  if (inkTankLevelText) {
    inkTankLevelText.textContent = `잉크통 Lv.${inkTankLevel}`;
  }
}

function renderRankingList(rankings, targetElementId = "rankingList") {
  const rankingList = document.getElementById(targetElementId);

  if (!rankingList) {
    return;
  }

  if (!Array.isArray(rankings) || rankings.length === 0) {
    rankingList.innerHTML = `<p class="ranking-empty">아직 등록된 랭킹이 없습니다.</p>`;
    return;
  }

  const topRankings = rankings.slice(0, 10);

  rankingList.innerHTML = topRankings
    .map((ranking, index) => {
      const slots = Array.isArray(ranking.characterSlots)
        ? ranking.characterSlots
        : [];

      const slotHtml = slots
        .map((slot) => {
          if (!slot) {
            return `<span class="ranking-character empty">빈 슬롯</span>`;
          }

          const stats = slot.stats ?? {};
          const slotName = slot.name ?? "낙서";
          const slotGrade = slot.grade ?? "C";
          const slotPower = slot.power ?? 0;

          const statTitle =
            `이름: ${slotName}\n` +
            `등급: ${slotGrade}\n` +
            `전투력: ${slotPower}\n` +
            `공격력: ${stats.attack ?? 0}\n` +
            `체력: ${stats.hp ?? 0}\n` +
            `이동속도: ${stats.speed ?? 0}\n` +
            `공격속도: ${stats.attackSpeed ?? 0}\n` +
            `사거리: ${stats.range ?? 0}\n` +
            `소환비용: ${stats.cost ?? 0}`;

          const imageHtml = slot.imageData
            ? `<img src="${slot.imageData}" alt="${slotName}" />`
            : "";

          return `
            <span class="ranking-character" title="${statTitle}">
              ${imageHtml}
              <span>${slotName}</span>
              <small>${slotGrade} / ${slotPower}</small>
            </span>
          `;
        })
        .join("");

      return `
        <div class="ranking-item">
          <strong class="ranking-rank">${index + 1}</strong>

          <div class="ranking-main">
            <div class="ranking-player">
              <b>${ranking.playerName ?? "익명"}</b>
              <span>${ranking.reachedStage ?? 1} 스테이지</span>
            </div>

            <div class="ranking-characters">
              ${slotHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}