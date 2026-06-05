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
    resultCard,
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
    this.resultCard = resultCard ?? previewImage?.closest(".result-card") ?? null;
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

  createCharacter({ originalName, imageData, stats, grade }) {
    const safeOriginalName = String(originalName ?? "").trim() || "용사";
    const prefix =
      NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];

    return {
      id: `char_${Date.now()}`,
      name: `${prefix} ${safeOriginalName}`,
      originalName: safeOriginalName,
      imageData,
      grade,

      source: "local",

      stats,

      meta: {
        createdAt: Date.now(),
        createdStage: 1,
        corruptedAtStage: null,
        ownerName: "playerA",
      },
    };
  }

  renderResult(character) {
    if (!character) {
      if (this.resultCard) {
        this.resultCard.hidden = true;
        this.resultCard.classList.add("hidden");
      }
      return;
    }

    if (this.resultCard) {
      this.resultCard.hidden = false;
      this.resultCard.classList.remove("hidden");
    }

    this.previewImage.src = character.imageData;
    this.resultName.textContent = character.name;
    this.resultGrade.textContent = `등급: ${character.grade}`;
    this.resultPower.textContent = `전투력: ${character.stats.power}`;
    this.resultComment.textContent =
      "AI 감정 결과: 낙서의 기세가 좋아 전투 투입이 가능합니다.";

    this.statAttack.textContent = character.stats.attack;
    this.statHp.textContent = character.stats.hp;
    this.statSpeed.textContent = character.stats.speed;
    this.statAttackSpeed.textContent = character.stats.attackSpeed;
    this.statRange.textContent = character.stats.range;
    this.statCost.textContent = character.stats.cost;
  }
}
