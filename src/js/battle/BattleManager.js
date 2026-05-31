import { BATTLE_STATE, TEAM, UNIT_STATE } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";
import { applyBaseDamage, createBattleBases } from "./Base.js";
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
    this.allyCharacters = [];
    this.allyUnits = [];
    this.enemyUnits = [];
    this.currentCost = BATTLE_CONFIG.startCost;
    this.enemySpawnTimer = BATTLE_CONFIG.enemySpawnInterval;
    this.stage = 1;
    this.resultMessage = "";
    this.noticeMessage = "";
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    this.statusElement = null;

    this.loop = this.loop.bind(this);
  }

  setStatusElement(statusElement) {
    this.statusElement = statusElement;
    this.updateStatusText();
  }

  start(allyCharacterOrCharacters) {
    const characters = Array.isArray(allyCharacterOrCharacters)
      ? allyCharacterOrCharacters
      : [allyCharacterOrCharacters];

    this.startBattle(characters);
  }

  startBattle(allyCharacters = []) {
    this.stop();

    this.bases = createBattleBases();
    this.allyCharacters = this.normalizeAllyCharacters(allyCharacters);
    this.allyUnits = [];
    this.enemyUnits = [];
    this.currentCost = BATTLE_CONFIG.startCost;
    this.enemySpawnTimer = BATTLE_CONFIG.enemySpawnInterval;
    this.resultMessage = "";
    this.noticeMessage = "Battle started";
    this.lastFrameTime = 0;
    this.battleState = BATTLE_STATE.PLAYING;

    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  normalizeAllyCharacters(allyCharacters) {
    const characters = Array.isArray(allyCharacters)
      ? allyCharacters.filter(Boolean)
      : [];

    return characters.length > 0 ? characters : [this.createDummyAllyCharacter()];
  }

  summonAlly(character = this.allyCharacters[0]) {
    if (this.battleState !== BATTLE_STATE.PLAYING) {
      this.noticeMessage = "Battle is not playing";
      this.render();
      return false;
    }

    const allyCharacter = character ?? this.allyCharacters[0];

    if (!allyCharacter) {
      this.noticeMessage = "No ally character";
      this.render();
      return false;
    }

    const summonCost = this.getCharacterCost(allyCharacter);

    if (this.currentCost < summonCost) {
      this.noticeMessage = `Need ${summonCost} cost`;
      this.render();
      return false;
    }

    this.currentCost = Math.max(0, this.currentCost - summonCost);
    this.allyUnits.push(
      createBattleUnit(
        allyCharacter,
        TEAM.ALLY,
        BATTLE_CONFIG.allySpawnX,
        BATTLE_CONFIG.unitY,
      ),
    );
    this.noticeMessage = `${allyCharacter.name} summoned`;
    this.render();
    return true;
  }

  spawnEnemy() {
    const enemyCharacter = this.createDefaultEnemyCharacter(this.stage);

    this.enemyUnits.push(
      createBattleUnit(
        enemyCharacter,
        TEAM.ENEMY,
        BATTLE_CONFIG.enemySpawnX,
        BATTLE_CONFIG.unitY,
      ),
    );
  }

  loop(timestamp) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    if (this.battleState !== BATTLE_STATE.PLAYING) {
      this.animationFrameId = null;
      return;
    }

    this.update(deltaTime);
    this.render();

    if (this.battleState === BATTLE_STATE.PLAYING) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      this.animationFrameId = null;
    }
  }

  update(deltaTime) {
    this.regenerateCost(deltaTime);
    this.updateEnemySpawning(deltaTime);
    this.updateUnits(deltaTime);
    this.cleanupDeadUnits();
    this.checkWinLose();
    this.updateStatusText();
  }

  regenerateCost(deltaTime) {
    this.currentCost = Math.min(
      BATTLE_CONFIG.maxCost,
      this.currentCost + BATTLE_CONFIG.costRegenPerSecond * deltaTime,
    );
  }

  updateEnemySpawning(deltaTime) {
    this.enemySpawnTimer -= deltaTime;

    while (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer += BATTLE_CONFIG.enemySpawnInterval;
    }
  }

  updateUnits(deltaTime) {
    this.getUnits().forEach((unit) => {
      if (this.battleState !== BATTLE_STATE.PLAYING) {
        return;
      }

      if (unit.isDead || unit.state === UNIT_STATE.DEAD) {
        return;
      }

      unit.attackCooldown = Math.max(0, unit.attackCooldown - deltaTime);

      const targetUnit = this.findClosestUnitTargetInRange(unit);

      if (targetUnit) {
        this.attackTarget(unit, {
          type: "unit",
          unit: targetUnit,
        });
        return;
      }

      const targetBase = this.findEnemyBaseTargetInRange(unit);

      if (targetBase) {
        this.attackTarget(unit, {
          type: "base",
          base: targetBase,
        });
        return;
      }

      unit.state = UNIT_STATE.MOVE;
      unit.targetUnitId = null;
      unit.target = null;
      updateUnit(unit, deltaTime);
    });
  }

  findClosestUnitTargetInRange(unit) {
    const candidates =
      unit.team === TEAM.ALLY ? this.enemyUnits : this.allyUnits;

    return candidates
      .filter((candidate) => !candidate.isDead && this.isUnitInRange(unit, candidate))
      .reduce((closest, candidate) => {
        const distance = this.getUnitDistance(unit, candidate);

        if (!closest || distance < closest.distance) {
          return { unit: candidate, distance };
        }

        return closest;
      }, null)?.unit ?? null;
  }

  findEnemyBaseTargetInRange(unit) {
    const targetBase =
      unit.team === TEAM.ALLY
        ? this.getBase(TEAM.ENEMY)
        : this.getBase(TEAM.ALLY);

    if (!targetBase || this.getBaseHp(targetBase) <= 0) {
      return null;
    }

    return this.isBaseInRange(unit, targetBase) ? targetBase : null;
  }

  isUnitInRange(unit, target) {
    return this.getUnitDistance(unit, target) <= unit.range;
  }

  isBaseInRange(unit, base) {
    return this.getBaseDistance(unit, base) <= unit.range;
  }

  attackTarget(unit, target) {
    unit.state = UNIT_STATE.ATTACK;

    if (target.type === "unit") {
      unit.targetUnitId = target.unit.unitId;
      unit.target = {
        type: "unit",
        id: target.unit.unitId,
      };
    } else {
      unit.targetUnitId = null;
      unit.target = {
        type: "base",
        team: target.base.team,
      };
    }

    if (unit.attackCooldown > 0) {
      return;
    }

    if (target.type === "unit") {
      target.unit.currentHp = Math.max(0, target.unit.currentHp - unit.attack);
    } else {
      applyBaseDamage(target.base, unit.attack);
    }

    unit.attackCooldown = 1 / unit.attackSpeed;

    if (target.type === "unit" && target.unit.currentHp <= 0) {
      this.markUnitDead(target.unit);
      return;
    }

    if (target.type === "base" && this.getBaseHp(target.base) <= 0) {
      this.checkWinLose();
    }
  }

  cleanupDeadUnits() {
    this.allyUnits = this.allyUnits.filter((unit) => !unit.isDead);
    this.enemyUnits = this.enemyUnits.filter((unit) => !unit.isDead);

    const liveUnitIds = new Set(this.getUnits().map((unit) => unit.unitId));

    this.getUnits().forEach((unit) => {
      if (unit.targetUnitId && !liveUnitIds.has(unit.targetUnitId)) {
        unit.targetUnitId = null;
        unit.target = null;
        unit.state = UNIT_STATE.MOVE;
      }

      if (unit.target?.type === "base") {
        const targetBase = this.getBase(unit.target.team);

        if (!targetBase || this.getBaseHp(targetBase) <= 0) {
          unit.target = null;
          unit.state = UNIT_STATE.MOVE;
        }
      }
    });
  }

  checkWinLose() {
    const allyBase = this.getBase(TEAM.ALLY);
    const enemyBase = this.getBase(TEAM.ENEMY);

    if (enemyBase && this.getBaseHp(enemyBase) <= 0) {
      this.finishBattle(BATTLE_STATE.WIN, "WIN");
      return;
    }

    if (allyBase && this.getBaseHp(allyBase) <= 0) {
      this.finishBattle(BATTLE_STATE.LOSE, "LOSE");
    }
  }

  finishBattle(nextState, resultMessage) {
    this.battleState = nextState;
    this.resultMessage = resultMessage;
    this.noticeMessage = resultMessage;
    this.updateStatusText();
  }

  markUnitDead(unit) {
    unit.currentHp = 0;
    unit.isDead = true;
    unit.state = UNIT_STATE.DEAD;
    unit.targetUnitId = null;
    unit.target = null;
  }

  getUnitDistance(unitA, unitB) {
    return Math.abs(this.getUnitCenterX(unitA) - this.getUnitCenterX(unitB));
  }

  getUnitCenterX(unit) {
    return unit.x + unit.width / 2;
  }

  getBaseDistance(unit, base) {
    if (unit.team === TEAM.ALLY) {
      return Math.max(0, base.x - (unit.x + unit.width));
    }

    return Math.max(0, unit.x - (base.x + base.width));
  }

  getBaseHp(base) {
    return base?.currentHp ?? base?.hp ?? 0;
  }

  getBase(team) {
    return this.bases.find((base) => base.team === team) ?? null;
  }

  getUnits() {
    return [...this.allyUnits, ...this.enemyUnits];
  }

  getCharacterCost(character) {
    const cost = Number(character?.stats?.cost);
    return Number.isFinite(cost) ? Math.max(0, cost) : 0;
  }

  getPrimaryAllyCost() {
    return this.getCharacterCost(this.allyCharacters[0]);
  }

  getRenderState() {
    return {
      battleState: this.battleState,
      bases: this.bases,
      units: this.getUnits(),
      allyUnits: this.allyUnits,
      enemyUnits: this.enemyUnits,
      currentCost: this.currentCost,
      maxCost: BATTLE_CONFIG.maxCost,
      primaryAllyCost: this.getPrimaryAllyCost(),
      noticeMessage: this.noticeMessage,
      resultMessage: this.resultMessage,
    };
  }

  render() {
    this.renderer.render(this.getRenderState());
    this.updateStatusText();
  }

  updateStatusText() {
    if (!this.statusElement) {
      return;
    }

    const stateText = this.battleState.toUpperCase();
    const costText = `${Math.floor(this.currentCost)} / ${BATTLE_CONFIG.maxCost}`;
    const unitText = `Ally ${this.allyUnits.length} | Enemy ${this.enemyUnits.length}`;
    const noticeText = this.noticeMessage ? ` | ${this.noticeMessage}` : "";

    this.statusElement.textContent = `${stateText} | Cost ${costText} | ${unitText}${noticeText}`;
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.battleState = BATTLE_STATE.READY;
    this.updateStatusText();
  }

  createDummyAllyCharacter() {
    return {
      id: "char_dummy_ally",
      name: "Ally Doodle",
      originalName: "Doodle Sword",
      imageData: null,
      grade: "A",
      source: "default",
      stats: {
        attack: 50,
        hp: 300,
        speed: 1.6,
        attackSpeed: 1.0,
        range: 120,
        cost: 120,
        power: 9187,
      },
      meta: {
        createdAt: Date.now(),
        createdStage: 1,
        corruptedAtStage: null,
        ownerName: "playerA",
      },
    };
  }

  createDefaultEnemyCharacter(stage = 1) {
    const stageBonus = Math.max(0, stage - 1);

    return {
      id: `default_enemy_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: "Default Doodle Enemy",
      originalName: "default enemy",
      imageData: null,
      grade: "C",
      source: "default",
      stats: {
        attack: 15 + stageBonus * 3,
        hp: 120 + stageBonus * 20,
        speed: 1.0 + stageBonus * 0.05,
        attackSpeed: 0.8,
        range: 60,
        cost: 0,
        power: 500 + stageBonus * 120,
      },
      meta: {
        createdAt: Date.now(),
        createdStage: stage,
        corruptedAtStage: null,
        ownerName: "system",
      },
    };
  }
}
