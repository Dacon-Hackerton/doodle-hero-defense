import { BattleManager } from "./battle/BattleManager.js";

document.addEventListener("DOMContentLoaded", () => {
  const battleManager = new BattleManager("battleCanvas");
  battleManager.start();
});
