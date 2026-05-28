import { TEAM } from "../constants/BattleConstants.js";
import { BATTLE_CONFIG } from "./BattleConfig.js";

export class BattleRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.imageCache = new Map();
  }

  render({ bases, units }) {
    this.clear();
    this.renderBackground();
    this.renderLane();
    bases.forEach((base) => this.renderBase(base));
    units.forEach((unit) => this.renderUnit(unit));
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
    const hpRatio = base.currentHp / base.maxHp;

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
      `${base.currentHp}/${base.maxHp}`,
      base.x + base.width / 2,
      base.y - 30,
    );
  }

  renderUnit(unit) {
    const { ctx } = this;
    const centerX = unit.x + unit.width / 2;
    const isEnemy = unit.team === TEAM.ENEMY;

    this.renderUnitName(unit, centerX);
    this.renderUnitHpBar(unit);

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

    if (unit.imageData) {
      const image = this.getUnitImage(unit.imageData);
      if (image.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, unit.x, unit.y, unit.width, unit.height);
        return;
      }
    }

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
    ctx.fillText(unit.name, centerX, unit.y - 17);
  }

  renderUnitHpBar(unit) {
    const { ctx } = this;
    const barWidth = unit.width;
    const barHeight = 7;
    const hpRatio = unit.currentHp / unit.maxHp;

    ctx.fillStyle = "#111827";
    ctx.fillRect(unit.x, unit.y - 13, barWidth, barHeight);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(unit.x, unit.y - 13, barWidth * hpRatio, barHeight);
  }

  getUnitImage(imageData) {
    if (!this.imageCache.has(imageData)) {
      const image = new Image();
      image.src = imageData;
      this.imageCache.set(imageData, image);
    }

    return this.imageCache.get(imageData);
  }
}
