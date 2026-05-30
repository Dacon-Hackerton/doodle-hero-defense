const DRAWING_LEVEL_CONFIG = {
  1: {
    canvasSize: 400,
    maxInk: 128000,
    minPower: 2500,
    maxExpectedPower: 8500,
  },
  2: {
    canvasSize: 500,
    maxInk: 200000,
    minPower: 5000,
    maxExpectedPower: 13500,
  },
  3: {
    canvasSize: 600,
    maxInk: 288000,
    minPower: 8000,
    maxExpectedPower: 18500,
  },
};

const DEFAULT_CANVAS_LEVEL = 1;
const SOFT_CAP_POWER = 18500;
const ABSOLUTE_POWER_LIMIT = 19500;

export class StatCalculator {
  static createStatsAndGrade(canvas, options = {}) {
    const canvasLevel = options.canvasLevel || DEFAULT_CANVAS_LEVEL;
    const config = DRAWING_LEVEL_CONFIG[canvasLevel] || DRAWING_LEVEL_CONFIG[1];

    const analysisResult = this.analyzeCanvas(canvas);
    const stats = this.createStats(analysisResult, config);
    const grade = this.createGrade(stats.power);

    return {
      stats,
      grade,
      analysisResult,
    };
  }

  static analyzeCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let drawnPixelCount = 0;

    let redCount = 0;
    let blueCount = 0;
    let yellowCount = 0;
    let purpleCount = 0;
    let greenCount = 0;
    let blackCount = 0;
    let otherCount = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a === 0) {
        continue;
      }

      drawnPixelCount++;

      if (this.isRed(r, g, b)) {
        redCount++;
      } else if (this.isBlue(r, g, b)) {
        blueCount++;
      } else if (this.isYellow(r, g, b)) {
        yellowCount++;
      } else if (this.isPurple(r, g, b)) {
        purpleCount++;
      } else if (this.isGreen(r, g, b)) {
        greenCount++;
      } else if (this.isBlack(r, g, b)) {
        blackCount++;
      } else {
        otherCount++;
      }
    }

    const totalDrawnPixels = drawnPixelCount || 1;
    const totalCanvasPixels = canvas.width * canvas.height;

    return {
      pixelArea: drawnPixelCount,
      density: drawnPixelCount / totalCanvasPixels,

      colorRatio: {
        red: redCount / totalDrawnPixels,
        blue: blueCount / totalDrawnPixels,
        yellow: yellowCount / totalDrawnPixels,
        purple: purpleCount / totalDrawnPixels,
        green: greenCount / totalDrawnPixels,
        black: blackCount / totalDrawnPixels,
        other: otherCount / totalDrawnPixels,
      },
    };
  }

  static createStats(analysisResult, config) {
    const pixelArea = analysisResult.pixelArea;
    const colors = analysisResult.colorRatio;

    const fillRatio = Math.min(pixelArea / config.maxInk, 1);

    const colorBonus =
      colors.red * 0.18 +
      colors.blue * 0.14 +
      colors.yellow * 0.12 +
      colors.purple * 0.14 +
      colors.green * 0.08 +
      colors.black * 0.08;

    const powerRange = config.maxExpectedPower - config.minPower;

    let power = Math.floor(
      config.minPower +
        powerRange * fillRatio +
        powerRange * colorBonus,
    );

    power = this.applySoftPowerLimit(power);

    const attack = Math.floor(25 + power * 0.006 + colors.red * 90);

    const hp = Math.floor(120 + power * 0.035 + colors.blue * 240);

    const speed = Number(
      Math.min(3.0, 1.0 + colors.yellow * 1.4).toFixed(2),
    );

    const attackSpeed = Number(
      Math.min(
        2.5,
        1.0 + colors.black * 0.35 + colors.red * 0.2 + colors.yellow * 0.45,
      ).toFixed(2),
    );

    const range = Math.floor(70 + colors.purple * 190 + colors.black * 20);

    const baseCost = 40 + power * 0.035;

    const costReductionRate = Math.min(colors.green * 0.35, 0.3);
    const cost = Math.max(20, Math.floor(baseCost * (1 - costReductionRate)));

    return {
      attack,
      hp,
      speed,
      attackSpeed,
      range,
      cost,
      power,
    };
  }

  static applySoftPowerLimit(power) {
    if (power <= SOFT_CAP_POWER) {
      return power;
    }

    const extraPower = power - SOFT_CAP_POWER;
    const softenedPower = SOFT_CAP_POWER + extraPower * 0.25;

    return Math.min(Math.floor(softenedPower), ABSOLUTE_POWER_LIMIT);
  }

  static createGrade(power) {
    if (power >= 17500) {
      return "SS";
    }

    if (power >= 15000) {
      return "S";
    }

    if (power >= 10000) {
      return "A";
    }

    if (power >= 7500) {
      return "B";
    }

    return "C";
  }

  static isRed(r, g, b) {
    return r > 150 && g < 130 && b < 130;
  }

  static isBlue(r, g, b) {
    return b > 150 && r < 130 && g < 180;
  }

  static isYellow(r, g, b) {
    return r > 180 && g > 150 && b < 140;
  }

  static isPurple(r, g, b) {
    return r > 100 && b > 120 && g < 140;
  }

  static isGreen(r, g, b) {
    return g > 140 && r < 120 && b < 140;
  }

  static isBlack(r, g, b) {
    return r < 90 && g < 90 && b < 90;
  }
}