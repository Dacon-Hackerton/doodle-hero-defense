import { BATTLE_STATE, TEAM, UNIT_STATE } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";

export class BattleRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.imageCache = new Map();
  }

  render({
    bases = [],
    units = [],
    currentCost = 0,
    maxCost = BATTLE_CONFIG.maxCost,
    primaryAllyCost = 0,
    battleState = BATTLE_STATE.READY,
    noticeMessage = "",
    resultMessage = "",
  }) {
    this.clear();
    this.renderBackground();
    this.renderLane();
    bases.forEach((base) => this.renderBase(base));
    units
      .filter((unit) => !unit.isDead)
      .forEach((unit) => this.renderUnit(unit));
    this.renderHud({
      currentCost,
      maxCost,
      primaryAllyCost,
      noticeMessage,
    });
    this.renderResultMessage(battleState, resultMessage);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderBackground() {
    const { ctx } = this;

    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(0, 0, BATTLE_CONFIG.canvasWidth, BATTLE_CONFIG.canvasHeight);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, BATTLE_CONFIG.canvasWidth, 150);

    ctx.fillStyle = "#7c9885";
    ctx.fillRect(0, BATTLE_CONFIG.laneY, BATTLE_CONFIG.canvasWidth, 86);

    ctx.fillStyle = "#b7a57a";
    ctx.fillRect(0, BATTLE_CONFIG.laneY - 34, BATTLE_CONFIG.canvasWidth, 52);
  }

  renderLane() {
    const { ctx } = this;

    ctx.strokeStyle = "#f4e7c5";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(0, BATTLE_CONFIG.laneY - 8);
    ctx.lineTo(BATTLE_CONFIG.canvasWidth, BATTLE_CONFIG.laneY - 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  renderBase(base) {
    const { ctx } = this;
    const isEnemy = base.team === TEAM.ENEMY;
    const currentHp = this.getBaseHp(base);
    const hpRatio = this.clampRatio(currentHp / base.maxHp);

    ctx.fillStyle = isEnemy ? "#7f1d1d" : "#1d4ed8";
    ctx.fillRect(base.x, base.y, base.width, base.height);

    ctx.fillStyle = isEnemy ? "#ef4444" : "#60a5fa";
    ctx.fillRect(base.x + 8, base.y + 18, base.width - 16, base.height - 36);

    ctx.fillStyle = "#111827";
    ctx.fillRect(base.x - 5, base.y - 24, base.width + 10, 10);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(base.x - 5, base.y - 24, (base.width + 10) * hpRatio, 10);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 16px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      `${Math.ceil(currentHp)}/${base.maxHp}`,
      base.x + base.width / 2,
      base.y - 30,
    );

    ctx.fillStyle = "#111827";
    ctx.font = "bold 14px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      isEnemy ? "Enemy Base" : "Ally Base",
      base.x + base.width / 2,
      base.y + base.height + 8,
    );
  }

  renderUnit(unit) {
    const { ctx } = this;
    const centerX = unit.x + unit.width / 2;
    const isEnemy = unit.team === TEAM.ENEMY;

    this.renderUnitName(unit, centerX);
    this.renderUnitHpBar(unit);
    this.renderUnitShadow(unit, centerX);

    if (unit.state === UNIT_STATE.ATTACK) {
      ctx.strokeStyle = isEnemy ? "#f97316" : "#22c55e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, unit.y + unit.height / 2, unit.width / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (unit.imageData) {
      const image = this.getUnitImage(unit.imageData);
      if (image.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, unit.x, unit.y, unit.width, unit.height);
        return;
      }
    }

    this.renderFallbackUnit(unit, centerX, isEnemy);
  }

  renderUnitShadow(unit, centerX) {
    const { ctx } = this;

    ctx.fillStyle = "rgba(17, 24, 39, 0.22)";
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      unit.y + unit.height + 8,
      unit.width * 0.42,
      9,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  renderFallbackUnit(unit, centerX, isEnemy) {
    const { ctx } = this;

    ctx.fillStyle = isEnemy ? "#dc2626" : "#2563eb";
    ctx.beginPath();
    ctx.arc(centerX, unit.y + unit.height / 2, unit.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isEnemy ? "#fecaca" : "#bfdbfe";
    ctx.beginPath();
    ctx.arc(centerX - 10, unit.y + 24, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 10, unit.y + 24, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  renderUnitName(unit, centerX) {
    const { ctx } = this;

    ctx.fillStyle = "#111827";
    ctx.font = "bold 13px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(this.truncateText(unit.name, 14), centerX, unit.y - 17);
  }

  renderUnitHpBar(unit) {
    const { ctx } = this;
    const barWidth = unit.width;
    const barHeight = 7;
    const hpRatio = this.clampRatio(unit.currentHp / unit.maxHp);

    ctx.fillStyle = "#111827";
    ctx.fillRect(unit.x, unit.y - 13, barWidth, barHeight);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(unit.x, unit.y - 13, barWidth * hpRatio, barHeight);
  }

  renderHud({ currentCost, maxCost, primaryAllyCost, noticeMessage }) {
    const { ctx } = this;

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillRect(16, 16, 280, 86);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 280, 86);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 18px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Cost ${Math.floor(currentCost)} / ${maxCost}`, 30, 28);

    ctx.font = "14px Arial, Helvetica, sans-serif";
    ctx.fillText(`Summon cost ${primaryAllyCost}`, 30, 54);

    if (noticeMessage) {
      ctx.fillText(this.truncateText(noticeMessage, 26), 30, 78);
    }
  }

  renderResultMessage(battleState, resultMessage) {
    if (battleState !== BATTLE_STATE.WIN && battleState !== BATTLE_STATE.LOSE) {
      return;
    }

    const { ctx } = this;
    const message = resultMessage || battleState.toUpperCase();

    ctx.fillStyle = "rgba(17, 24, 39, 0.72)";
    ctx.fillRect(0, 0, BATTLE_CONFIG.canvasWidth, BATTLE_CONFIG.canvasHeight);

    ctx.fillStyle = battleState === BATTLE_STATE.WIN ? "#bbf7d0" : "#fecaca";
    ctx.font = "bold 72px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, BATTLE_CONFIG.canvasWidth / 2, BATTLE_CONFIG.canvasHeight / 2);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 20px Arial, Helvetica, sans-serif";
    ctx.fillText(
      "Use restart or return to drawing",
      BATTLE_CONFIG.canvasWidth / 2,
      BATTLE_CONFIG.canvasHeight / 2 + 64,
    );
  }

  getUnitImage(imageData) {
    if (!this.imageCache.has(imageData)) {
      const image = new Image();
      image.src = imageData;
      this.imageCache.set(imageData, image);
    }

    return this.imageCache.get(imageData);
  }

  getBaseHp(base) {
    return base?.currentHp ?? base?.hp ?? 0;
  }

  clampRatio(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(1, value));
  }

  truncateText(text, maxLength) {
    const normalizedText = String(text ?? "");

    if (normalizedText.length <= maxLength) {
      return normalizedText;
    }

    return `${normalizedText.slice(0, maxLength - 1)}...`;
  }
}
