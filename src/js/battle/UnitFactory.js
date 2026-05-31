import { TEAM, UNIT_STATE } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";

let nextUnitSequence = 1;

const createUnitId = () => {
  const sequence = String(nextUnitSequence).padStart(3, "0");
  nextUnitSequence += 1;
  return `unit_${sequence}`;
};

const getSpawnX = (team) => {
  return team === TEAM.ENEMY
    ? BATTLE_CONFIG.enemySpawnX
    : BATTLE_CONFIG.allySpawnX;
};

const toNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function createBattleUnit(
  character,
  team,
  spawnX = getSpawnX(team),
  spawnY = BATTLE_CONFIG.unitY,
) {
  const stats = character?.stats ?? {};
  const maxHp = Math.max(1, toNumber(stats.hp, 1));

  return {
    unitId: createUnitId(),
    characterId: character?.id ?? "unknown_character",

    team,

    name: character?.name ?? "Unknown Unit",
    imageData: character?.imageData || null,

    x: spawnX,
    y: spawnY,
    width: BATTLE_CONFIG.unitWidth,
    height: BATTLE_CONFIG.unitHeight,

    attack: Math.max(0, toNumber(stats.attack, 0)),
    maxHp,
    currentHp: maxHp,
    speed: Math.max(0, toNumber(stats.speed, 1)),
    attackSpeed: Math.max(0.1, toNumber(stats.attackSpeed, 1)),
    range: Math.max(0, toNumber(stats.range, 0)),

    attackCooldown: 0,
    targetUnitId: null,

    state: UNIT_STATE.MOVE,
    isDead: false,
  };
}
