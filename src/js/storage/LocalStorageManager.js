import { STORAGE_KEYS } from "../constants/StorageKeys.js";

export function loadCorruptedCharacters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CORRUPTED);
    const characters = raw ? JSON.parse(raw) : [];

    return Array.isArray(characters) ? characters : [];
  } catch (error) {
    console.warn("Failed to load corrupted characters", error);
    return [];
  }
}

export function saveCorruptedCharacters(characters) {
  const safeCharacters = Array.isArray(characters) ? characters : [];
  localStorage.setItem(STORAGE_KEYS.CORRUPTED, JSON.stringify(safeCharacters));
}

export function addCorruptedCharacter(character) {
  if (!character?.id) {
    return;
  }

  const corruptedCharacters = loadCorruptedCharacters();
  const nextCharacters = corruptedCharacters.filter(
    (item) => item?.id !== character.id,
  );

  nextCharacters.push(character);
  saveCorruptedCharacters(nextCharacters);
}

export function loadCurrentStage() {
  const stage = Number(localStorage.getItem(STORAGE_KEYS.STAGE));
  return Number.isFinite(stage) && stage > 0 ? Math.floor(stage) : 1;
}

export function saveCurrentStage(stage) {
  const nextStage = Number(stage);
  localStorage.setItem(
    STORAGE_KEYS.STAGE,
    String(
      Number.isFinite(nextStage) && nextStage > 0
        ? Math.floor(nextStage)
        : 1,
    ),
  );
}
