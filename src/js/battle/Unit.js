import { TEAM, UNIT_STATE } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";

export function updateUnit(unit, deltaTime) {
  if (unit.isDead || unit.state === UNIT_STATE.DEAD) {
    return;
  }

  if (unit.state !== UNIT_STATE.MOVE) {
    return;
  }

  const direction = unit.team === TEAM.ALLY ? 1 : -1;
  const actualMoveSpeed = BATTLE_CONFIG.baseMoveSpeed * unit.speed;
  unit.x += direction * actualMoveSpeed * deltaTime;
}
