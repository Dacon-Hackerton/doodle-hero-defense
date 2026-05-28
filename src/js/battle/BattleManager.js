import { BATTLE_STATE, TEAM } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";
import { createBattleBases } from "./Base.js";
import { BattleRenderer } from "./BattleRenderer.js";
import { createBattleUnit } from "./UnitFactory.js";
import { updateUnit } from "./Unit.js";

export class BattleManager {
  constructor(canvasId = "battleCanvas") {
    this.canvas = document.getElementById(canvasId);

    if (!this.canvas) {
      throw new Error(`Canvas element not found: ${canvasId}`);
    }

    this.canvas.width = BATTLE_CONFIG.canvasWidth;
    this.canvas.height = BATTLE_CONFIG.canvasHeight;

    this.renderer = new BattleRenderer(this.canvas);
    this.battleState = BATTLE_STATE.READY;
    this.bases = createBattleBases();
    this.units = [];
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    this.loop = this.loop.bind(this);
  }

  start() {
    this.createDummyBattleUnits();
    this.battleState = BATTLE_STATE.PLAYING;
    this.renderer.render(this.getRenderState());
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  createDummyBattleUnits() {
    const allyCharacter = {
      id: "char_dummy_ally",
      name: "Ally Doodle",
      originalName: "Doodle Sword",
      imageData: "",
      grade: "A",
      source: "default",
      stats: {
        attack: 50,
        hp: 300,
        speed: 1.6,
        attackSpeed: 1.0,
        range: 120,
        cost: 240,
        power: 9187,
      },
      meta: {
        createdAt: Date.now(),
        createdStage: 1,
        corruptedAtStage: null,
        ownerName: "playerA",
      },
    };

    const enemyCharacter = {
      id: "char_dummy_enemy",
      name: "Enemy Sketch",
      originalName: "Sketch Guard",
      imageData: "",
      grade: "B",
      source: "default",
      stats: {
        attack: 38,
        hp: 260,
        speed: 1.2,
        attackSpeed: 0.9,
        range: 100,
        cost: 200,
        power: 7420,
      },
      meta: {
        createdAt: Date.now(),
        createdStage: 1,
        corruptedAtStage: null,
        ownerName: "enemy",
      },
    };

    this.units = [
      createBattleUnit(
        allyCharacter,
        TEAM.ALLY,
        BATTLE_CONFIG.allySpawnX,
        BATTLE_CONFIG.unitY,
      ),
      createBattleUnit(
        enemyCharacter,
        TEAM.ENEMY,
        BATTLE_CONFIG.enemySpawnX,
        BATTLE_CONFIG.unitY,
      ),
    ];
  }

  loop(timestamp) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    if (this.battleState === BATTLE_STATE.PLAYING) {
      this.update(deltaTime);
      this.renderer.render(this.getRenderState());
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  update(deltaTime) {
    this.units.forEach((unit) => updateUnit(unit, deltaTime));
  }

  getRenderState() {
    return {
      battleState: this.battleState,
      bases: this.bases,
      units: this.units,
    };
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
