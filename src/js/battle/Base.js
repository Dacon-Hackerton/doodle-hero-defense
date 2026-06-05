import { TEAM } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";

export function createBase(team) {
  const isEnemy = team === TEAM.ENEMY;

  return {
    baseId: isEnemy ? "base_enemy" : "base_ally",
    team,
    x: isEnemy ? BATTLE_CONFIG.enemyBaseX : BATTLE_CONFIG.allyBaseX,
    y: BATTLE_CONFIG.baseY,
    width: BATTLE_CONFIG.baseWidth,
    height: BATTLE_CONFIG.baseHeight,
    maxHp: BATTLE_CONFIG.baseHp,
    hp: BATTLE_CONFIG.baseHp,
    currentHp: BATTLE_CONFIG.baseHp,
    isDestroyed: false,
  };
}

export function createBattleBases() {
  return [createBase(TEAM.ALLY), createBase(TEAM.ENEMY)];
}

export function applyBaseDamage(base, damage) {
  const currentHp = base.currentHp ?? base.hp ?? base.maxHp;
  const nextHp = Math.max(0, currentHp - damage);

  base.hp = nextHp;
  base.currentHp = nextHp;
  base.isDestroyed = nextHp <= 0;
}
