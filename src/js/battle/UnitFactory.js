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

export function createBattleUnit(
  character,
  team,
  spawnX = getSpawnX(team),
  spawnY = BATTLE_CONFIG.unitY,
) {
  const stats = character?.stats ?? {};
  const maxHp = stats.hp ?? 1;

  return {
    unitId: createUnitId(),
    characterId: character?.id ?? "unknown_character",

    team,

    name: character?.name ?? "Unknown Unit",
    imageData: character?.imageData ?? "",

    x: spawnX,
    y: spawnY,
    width: BATTLE_CONFIG.unitWidth,
    height: BATTLE_CONFIG.unitHeight,

    attack: stats.attack ?? 0,
    maxHp,
    currentHp: maxHp,
    speed: stats.speed ?? 1,
    attackSpeed: stats.attackSpeed ?? 1,
    range: stats.range ?? 0,

    attackCooldown: 0,
    targetUnitId: null,

    state: UNIT_STATE.MOVE,
    isDead: false,
  };
}
