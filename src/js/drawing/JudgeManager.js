const DEFAULT_STATS = Object.freeze({
  attack: 50,
  hp: 300,
  speed: 1.6,
  attackSpeed: 1.0,
  range: 120,
  cost: 240,
  power: 9187,
});

const NAME_PREFIXES = [
  "불꽃",
  "심연의",
  "무근본",
  "시공간을 뒤흔드는",
  "어딘가 이상한",
  "대충 그린",
];

export class JudgeManager {
  constructor({
    previewImage,
    resultName,
    resultGrade,
    resultPower,
    resultComment,
    statAttack,
    statHp,
    statSpeed,
    statAttackSpeed,
    statRange,
    statCost,
  }) {
    this.previewImage = previewImage;
    this.resultName = resultName;
    this.resultGrade = resultGrade;
    this.resultPower = resultPower;
    this.resultComment = resultComment;
    this.statAttack = statAttack;
    this.statHp = statHp;
    this.statSpeed = statSpeed;
    this.statAttackSpeed = statAttackSpeed;
    this.statRange = statRange;
    this.statCost = statCost;
  }

  createCharacter({ originalName, imageData }) {
    const safeOriginalName = String(originalName ?? "").trim() || "말랑 검사";
    const prefix =
      NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];

    return {
      id: `char_${Date.now()}`,
      name: `${prefix} ${safeOriginalName}`,
      originalName: safeOriginalName,
      imageData,
      grade: "A",

      source: "local",

      stats: { ...DEFAULT_STATS },

      meta: {
        createdAt: Date.now(),
        createdStage: 1,
        corruptedAtStage: null,
        ownerName: "playerA",
      },
    };
  }

  renderResult(character) {
    this.previewImage.src = character.imageData;
    this.resultName.textContent = character.name;
    this.resultGrade.textContent = `등급: ${character.grade}`;
    this.resultPower.textContent = `전투력: ${character.stats.power}`;
    this.resultComment.textContent =
      "AI 감정 결과: 낙서의 기세가 좋아 전투 투입이 가능합니다.";

    this.statAttack.textContent = `공격력: ${character.stats.attack}`;
    this.statHp.textContent = `체력: ${character.stats.hp}`;
    this.statSpeed.textContent = `이동 속도: ${character.stats.speed}`;
    this.statAttackSpeed.textContent = `공격 속도: ${character.stats.attackSpeed}`;
    this.statRange.textContent = `사거리: ${character.stats.range}`;
    this.statCost.textContent = `소환 비용: ${character.stats.cost}`;
  }
}
