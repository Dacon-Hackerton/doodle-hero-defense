import { BATTLE_STATE, TEAM, UNIT_STATE } from "../constants/BattleConstants.js";
import {
  CHARACTER_SOURCE,
  createDefaultEnemyCharacter,
  normalizeCharacter,
} from "../models/CharacterSchema.js";
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
    this.allyBase = this.getBase(TEAM.ALLY);
    this.enemyBase = this.getBase(TEAM.ENEMY);
    this.allyCharacters = [];
    this.partyCharacters = [];
    this.fallenCharacter = null;
    this.invasionCharacters = [];
    this.allyUnits = [];
    this.enemyUnits = [];
    this.currentCost = BATTLE_CONFIG.startCost;
    this.maxCost = BATTLE_CONFIG.maxCost;
    this.costRegenPerSecond = BATTLE_CONFIG.costRegenPerSecond;
    this.lastSummonedCost = null;
    this.enemySpawnTimer = BATTLE_CONFIG.enemySpawnInterval;
    this.enemySpawnInterval = BATTLE_CONFIG.enemySpawnInterval;
    this.stage = 1;
    this.currentStage = 1;
    this.resultMessage = "";
    this.noticeMessage = "";
    this.lastTime = 0;
    this.animationFrameId = null;
    this.statusElement = null;
    this.battleEndHandler = null;

    this.loop = this.loop.bind(this);
  }

  setStage(stage) {
    const nextStage = Number(stage);
    this.currentStage = Number.isFinite(nextStage) && nextStage > 0
      ? Math.floor(nextStage)
      : 1;
    this.stage = this.currentStage;
  }

  setStatusElement(statusElement) {
    this.statusElement = statusElement;
    this.updateStatusText();
  }

  setBattleEndHandler(handler) {
    this.battleEndHandler = handler;
  }

  setInvasionCharacters(characters = []) {
    this.invasionCharacters = Array.isArray(characters)
      ? characters
        .filter((character) => this.isEnemyCandidateCharacter(character))
        .map((character) => ({
          ...character,
          source: CHARACTER_SOURCE.FIREBASE,
        }))
      : [];
  }

  setFallenCharacter(character = null) {
    this.fallenCharacter = this.isEnemyCandidateCharacter(character)
      ? {
          ...character,
          source: CHARACTER_SOURCE.LOCAL,
        }
      : null;
  }

  start(allyCharacterOrCharacters) {
    const characters = Array.isArray(allyCharacterOrCharacters)
      ? allyCharacterOrCharacters
      : [allyCharacterOrCharacters];

    this.startBattle(characters);
  }

  startBattle(allyCharacters = [], options = {}) {
    this.stopBattle();

    if (options.currentStage !== undefined) {
      this.setStage(options.currentStage);
    }

    if (options.invasionCharacters !== undefined) {
      this.setInvasionCharacters(options.invasionCharacters);
    }

    this.resetBattle(allyCharacters);

    this.battleState = BATTLE_STATE.PLAYING;
    this.lastTime = performance.now();
    this.noticeMessage = "Battle started";
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  resetBattle(allyCharacters = []) {
    this.allyCharacters = this.normalizeAllyCharacters(allyCharacters);
    this.partyCharacters = this.allyCharacters;
    this.bases = createBattleBases();
    this.allyBase = this.getBase(TEAM.ALLY);
    this.enemyBase = this.getBase(TEAM.ENEMY);
    this.allyUnits = [];
    this.enemyUnits = [];
    this.currentCost = BATTLE_CONFIG.startCost;
    this.maxCost = BATTLE_CONFIG.maxCost;
    this.costRegenPerSecond = BATTLE_CONFIG.costRegenPerSecond;
    this.lastSummonedCost = null;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = BATTLE_CONFIG.enemySpawnInterval;
    this.resultMessage = "";
    this.noticeMessage = "";
    this.lastTime = 0;
    this.battleState = BATTLE_STATE.READY;
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
    this.lastSummonedCost = summonCost;
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
    if (
      this.battleState !== BATTLE_STATE.PLAYING ||
      this.enemyUnits.length >= BATTLE_CONFIG.maxEnemyUnits
    ) {
      return;
    }

    const enemyCharacter = this.pickEnemyCharacter();

    this.enemyUnits.push(
      createBattleUnit(
        enemyCharacter,
        TEAM.ENEMY,
        BATTLE_CONFIG.enemySpawnX,
        BATTLE_CONFIG.unitY,
      ),
    );
  }

  pickEnemyCharacter() {
    if (this.currentStage <= 1) {
      return this.pickStageOneEnemyCharacter();
    }

    return this.pickStageTwoOrMoreEnemyCharacter();
  }

  pickStageOneEnemyCharacter() {
    return this.createFallbackEnemyCharacter();
  }

  pickStageTwoOrMoreEnemyCharacter() {
    return this.pickCorruptedEnemyCharacter()
    ?? this.pickInvasionEnemyCharacter()
    ?? this.createFallbackEnemyCharacter();
  }

  pickCorruptedEnemyCharacter() {
    if (this.currentStage <= 1) {
      return null;
    }

    if (!this.fallenCharacter) {
      return null;
    }

    if (!this.isEnemyCandidateCharacter(this.fallenCharacter)) {
      return null;
    }

    if (Math.random() >= BATTLE_CONFIG.corruptedEnemyChance) {
      return null;
    }

    return this.scaleCorruptedEnemyCharacter(this.fallenCharacter);
  }

  pickInvasionEnemyCharacter() {
    const availableCharacters = this.invasionCharacters.filter((character) => (
      this.isEnemyCandidateCharacter(character)
    ));

    if (availableCharacters.length === 0) {
      return null;
    }

    if (Math.random() >= BATTLE_CONFIG.invasionEnemyChance) {
      return null;
    }

    const selectedCharacter =
      availableCharacters[Math.floor(Math.random() * availableCharacters.length)];

    return this.scaleInvasionEnemyCharacter(selectedCharacter, {
      namePrefix: "난입한",
      source: CHARACTER_SOURCE.FIREBASE,
    });
  }

  calculateAveragePartyPower() {
    const characters = Array.isArray(this.partyCharacters)
      ? this.partyCharacters
      : this.allyCharacters;

    const powers = characters
      .map((character) => Number(character?.stats?.power))
      .filter((power) => Number.isFinite(power) && power > 0);

    if (powers.length === 0) {
      return 0;
    }

    return powers.reduce((sum, power) => sum + power, 0) / powers.length;
  }

  scaleCorruptedEnemyCharacter(character) {
    const normalizedCharacter = normalizeCharacter({
      ...character,
      stats: {
        ...character?.stats,
        power: character?.stats?.power ?? character?.power,
      },
    });

    return normalizeCharacter({
      ...normalizedCharacter,
      id: this.createEnemyCharacterId(normalizedCharacter.id, "corrupted"),
      name: this.withEnemyNamePrefix("타락한", normalizedCharacter.name),
      stats: {
        ...normalizedCharacter.stats,
        cost: 0,
      },
      meta: {
        ...normalizedCharacter.meta,
        createdStage: this.currentStage,
      },
    });
  }

  scaleInvasionEnemyCharacter(character) {
    const normalizedCharacter = normalizeCharacter({
      ...character,
      source: CHARACTER_SOURCE.FIREBASE,
      stats: {
        ...character?.stats,
        power: character?.stats?.power ?? character?.power,
      },
    });
    const invasionPower = Number(character?.stats?.power ?? character?.power);
    const averagePartyPower = this.calculateAveragePartyPower();
    const targetMultiplier =
      Number.isFinite(invasionPower) &&
      invasionPower > 0 &&
      Number.isFinite(averagePartyPower) &&
      averagePartyPower > 0
        ? averagePartyPower / invasionPower
        : 1;
    const invasionGrowthMultiplier = Math.pow(1.06, this.currentStage - 1);
    const finalMultiplier = this.clamp(
      targetMultiplier * invasionGrowthMultiplier,
      0.7,
      2.5,
    );

    return normalizeCharacter({
      ...normalizedCharacter,
      id: this.createEnemyCharacterId(normalizedCharacter.id, "invasion"),
      name: this.withEnemyNamePrefix("난입한", normalizedCharacter.name),
      source: CHARACTER_SOURCE.FIREBASE,
      stats: {
        ...normalizedCharacter.stats,
        attack: Math.max(
          1,
          Math.round(normalizedCharacter.stats.attack * finalMultiplier),
        ),
        hp: Math.max(1, Math.round(normalizedCharacter.stats.hp * finalMultiplier)),
        speed: normalizedCharacter.stats.speed,
        attackSpeed: normalizedCharacter.stats.attackSpeed,
        range: normalizedCharacter.stats.range,
        cost: 0,
        power: Math.max(
          0,
          Math.round(normalizedCharacter.stats.power * finalMultiplier),
        ),
      },
      meta: {
        ...normalizedCharacter.meta,
        createdStage: this.currentStage,
      },
    });
  }

  createFallbackEnemyCharacter() {
    try {
      return createDefaultEnemyCharacter(this.currentStage);
    } catch (error) {
      console.warn("Failed to create default enemy character", error);
      return this.createEmergencyEnemyCharacter();
    }
  }

  createEmergencyEnemyCharacter() {
    return normalizeCharacter({
      id: this.createEnemyCharacterId("default_enemy", "fallback"),
      name: "기본 낙서 적",
      originalName: "default enemy",
      imageData: null,
      grade: "C",
      source: CHARACTER_SOURCE.DEFAULT,
      stats: {
        attack: 15,
        hp: 120,
        speed: 1,
        attackSpeed: 0.8,
        range: 60,
        cost: 0,
        power: 500,
      },
      meta: {
        createdAt: Date.now(),
        createdStage: this.currentStage,
        corruptedAtStage: null,
        ownerName: "system",
      },
    });
  }

  scaleEnemyCharacterForStage(character, stage = 1, options = {}) {
    const normalizedCharacter = normalizeCharacter({
      ...character,
      source: options.source ?? character?.source,
      stats: {
        ...character?.stats,
        power: character?.stats?.power ?? character?.power,
      },
    });
    const nextStage = Number(stage);
    const safeStage = Number.isFinite(nextStage) && nextStage > 0
      ? Math.floor(nextStage)
      : 1;
    const stageMultiplier = 1 + (safeStage - 1) * 0.12;
    const namePrefix = options.namePrefix ? `${options.namePrefix} ` : "";

    return normalizeCharacter({
      ...normalizedCharacter,
      id: `${normalizedCharacter.id}_enemy_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}`,
      name: `${namePrefix}${normalizedCharacter.name}`,
      source: options.source ?? normalizedCharacter.source,
      stats: {
        ...normalizedCharacter.stats,
        attack: Math.round(normalizedCharacter.stats.attack * stageMultiplier),
        hp: Math.round(normalizedCharacter.stats.hp * stageMultiplier),
        speed: normalizedCharacter.stats.speed,
        attackSpeed: normalizedCharacter.stats.attackSpeed,
        range: normalizedCharacter.stats.range,
        cost: 0,
        power: Math.round(normalizedCharacter.stats.power * stageMultiplier),
      },
      meta: {
        ...normalizedCharacter.meta,
        createdStage: safeStage,
      },
    });
  }

  isEnemyCandidateCharacter(character) {
    const stats = character?.stats ?? {};
    const requiredStats = ["hp", "attack", "speed", "attackSpeed", "range"];

    return requiredStats.every((key) => Number.isFinite(Number(stats[key])));
  }

  scaleEnemyCharacter(character, stage) {
    return this.scaleCorruptedEnemyCharacter(character, {
      namePrefix: "타락한",
    });
  }

  createEnemyCharacterId(baseId = "enemy", variant = "enemy") {
    return `${baseId}_${variant}_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  withEnemyNamePrefix(prefix, name) {
    const safeName = String(name || "Enemy");

    return safeName.startsWith(`${prefix} `) ? safeName : `${prefix} ${safeName}`;
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  loop(timestamp) {
    if (this.battleState !== BATTLE_STATE.PLAYING) {
      this.animationFrameId = null;
      return;
    }

    if (!this.lastTime) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    if (this.battleState === BATTLE_STATE.PLAYING) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      this.animationFrameId = null;
    }
  }

  update(deltaTime) {
    if (this.battleState !== BATTLE_STATE.PLAYING) {
      return;
    }

    this.updateCost(deltaTime);
    this.updateEnemySpawn(deltaTime);
    this.updateUnits(deltaTime);
    this.updateCombat(deltaTime);
    this.removeDeadUnits();
    this.checkWinLose();
    this.updateStatusText();
  }

  updateCost(deltaTime) {
    this.currentCost = Math.min(
      this.maxCost,
      this.currentCost + this.costRegenPerSecond * deltaTime,
    );
  }

  regenerateCost(deltaTime) {
    this.updateCost(deltaTime);
  }

  updateEnemySpawn(deltaTime) {
    if (this.battleState !== BATTLE_STATE.PLAYING) {
      return;
    }

    this.enemySpawnTimer += deltaTime;

    if (this.enemyUnits.length >= BATTLE_CONFIG.maxEnemyUnits) {
      this.enemySpawnTimer = Math.min(
        this.enemySpawnTimer,
        this.enemySpawnInterval,
      );
      return;
    }

    while (
      this.enemySpawnTimer >= this.enemySpawnInterval &&
      this.enemyUnits.length < BATTLE_CONFIG.maxEnemyUnits
    ) {
      this.spawnEnemy();
      this.enemySpawnTimer -= this.enemySpawnInterval;
    }
  }

  updateEnemySpawning(deltaTime) {
    this.updateEnemySpawn(deltaTime);
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
        unit.state = UNIT_STATE.ATTACK;
        unit.targetUnitId = targetUnit.unitId;
        unit.target = {
          type: "unit",
          id: targetUnit.unitId,
        };
        return;
      }

      const targetBase = this.findEnemyBaseTargetInRange(unit);

      if (targetBase) {
        unit.state = UNIT_STATE.ATTACK;
        unit.targetUnitId = null;
        unit.target = {
          type: "base",
          team: targetBase.team,
        };
        return;
      }

      unit.state = UNIT_STATE.MOVE;
      unit.targetUnitId = null;
      unit.target = null;
      updateUnit(unit, deltaTime);
    });
  }

  updateCombat() {
    this.getUnits().forEach((unit) => {
      if (this.battleState !== BATTLE_STATE.PLAYING) {
        return;
      }

      if (unit.isDead || unit.state === UNIT_STATE.DEAD) {
        return;
      }

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
      }
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

  removeDeadUnits() {
    this.cleanupDeadUnits();
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
    if (
      this.battleState === BATTLE_STATE.WIN ||
      this.battleState === BATTLE_STATE.LOSE
    ) {
      return;
    }

    this.battleState = nextState;
    this.resultMessage = resultMessage;
    this.noticeMessage = resultMessage;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.updateStatusText();

    if (this.battleEndHandler) {
      this.battleEndHandler({
        state: nextState,
        result: resultMessage,
        stage: this.currentStage,
      });
    }
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

  getRenderState() {
    return {
      battleState: this.battleState,
      bases: this.bases,
      units: this.getUnits(),
      allyUnits: this.allyUnits,
      enemyUnits: this.enemyUnits,
      currentCost: this.currentCost,
      maxCost: this.maxCost,
      lastSummonedCost: this.lastSummonedCost,
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
    const costText = `${Math.floor(this.currentCost)} / ${this.maxCost}`;
    const unitText = `Ally ${this.allyUnits.length} | Enemy ${this.enemyUnits.length}`;
    const noticeText = this.noticeMessage ? ` | ${this.noticeMessage}` : "";

    this.statusElement.textContent = `${stateText} | Cost ${costText} | ${unitText}${noticeText}`;
  }

  stop() {
    this.stopBattle();
  }

  stopBattle() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.battleState = BATTLE_STATE.READY;
    this.lastTime = 0;
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
}
