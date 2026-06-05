export const CHARACTER_SOURCE = {
  LOCAL: "local",
  FIREBASE: "firebase",
  DEFAULT: "default",
};

export const CHARACTER_GRADE = {
  C: "C",
  B: "B",
  A: "A",
  S: "S",
  SS: "SS",
};

export const DEFAULT_CHARACTER_STATS = {
  attack: 30,
  hp: 200,
  speed: 1.0,
  attackSpeed: 1.0,
  range: 80,
  cost: 100,
  power: 1000,
};

export function createCharacter({
  id = createCharacterId(),
  name = "이름 없는 낙서",
  originalName = "낙서",
  imageData = null,
  grade = CHARACTER_GRADE.C,
  source = CHARACTER_SOURCE.LOCAL,
  stats = {},
  meta = {},
} = {}) {
  return {
    id,
    name,
    originalName,
    imageData,
    grade,

    source,

    stats: {
      attack: toNumber(stats.attack, DEFAULT_CHARACTER_STATS.attack),
      hp: toNumber(stats.hp, DEFAULT_CHARACTER_STATS.hp),
      speed: toNumber(stats.speed, DEFAULT_CHARACTER_STATS.speed),
      attackSpeed: toNumber(
        stats.attackSpeed,
        DEFAULT_CHARACTER_STATS.attackSpeed
      ),
      range: toNumber(stats.range, DEFAULT_CHARACTER_STATS.range),
      cost: toNumber(stats.cost, DEFAULT_CHARACTER_STATS.cost),
      power: toNumber(stats.power, DEFAULT_CHARACTER_STATS.power),
    },

    meta: {
      createdAt: meta.createdAt ?? Date.now(),
      createdStage: meta.createdStage ?? 1,
      corruptedAtStage: meta.corruptedAtStage ?? null,
      ownerName: meta.ownerName ?? "player",
    },
  };
}

export function createDefaultEnemyCharacter(stage = 1) {
  const stageMultiplier = 1 + (stage - 1) * 0.15;

  return createCharacter({
    id: `default_enemy_${stage}_${Date.now()}`,
    name: "기본 낙서 적",
    originalName: "default enemy",
    imageData: null,
    grade: CHARACTER_GRADE.C,
    source: CHARACTER_SOURCE.DEFAULT,

    stats: {
      attack: Math.round(15 * stageMultiplier),
      hp: Math.round(120 * stageMultiplier),
      speed: 1.0,
      attackSpeed: 0.8,
      range: 60,
      cost: 0,
      power: Math.round(500 * stageMultiplier),
    },

    meta: {
      createdAt: Date.now(),
      createdStage: stage,
      corruptedAtStage: null,
      ownerName: "system",
    },
  });
}

export function createCorruptedCharacter(character, currentStage) {
  return createCharacter({
    ...character,
    source: character.source ?? CHARACTER_SOURCE.LOCAL,

    stats: {
      ...character.stats,
    },

    meta: {
      ...character.meta,
      corruptedAtStage: currentStage,
    },
  });
}

export function isCorruptedCharacter(character) {
  return Number.isFinite(Number(character?.meta?.corruptedAtStage));
}

export function isValidCharacter(character) {
  if (!character) return false;

  if (typeof character.id !== "string") return false;
  if (typeof character.name !== "string") return false;
  if (!character.stats) return false;

  const requiredStats = [
    "attack",
    "hp",
    "speed",
    "attackSpeed",
    "range",
    "cost",
    "power",
  ];

  return requiredStats.every((key) => Number.isFinite(character.stats[key]));
}

export function normalizeCharacter(character) {
  return createCharacter(character);
}

function createCharacterId() {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toNumber(value, fallback) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}
