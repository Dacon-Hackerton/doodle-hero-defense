// =========================
// 화면 전환
// =========================

const screens = {
  title: document.getElementById("titleScreen"),
  draw: document.getElementById("drawScreen"),
  judge: document.getElementById("judgeScreen"),
  battle: document.getElementById("battleScreen")
};

function showScreen(screenName) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });

  screens[screenName].classList.add("active");
}

// =========================
// DOM 요소
// =========================

const startBtn = document.getElementById("startBtn");
const judgeBtn = document.getElementById("judgeBtn");
const goBattleBtn = document.getElementById("goBattleBtn");
const backDrawBtn = document.getElementById("backDrawBtn");
const backDrawFromBattleBtn = document.getElementById("backDrawFromBattleBtn");

const nameInput = document.getElementById("nameInput");
const colorButtons = document.querySelectorAll(".color-btn");
const brushSizeInput = document.getElementById("brushSize");
const eraserBtn = document.getElementById("eraserBtn");
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");

const previewImage = document.getElementById("previewImage");
const resultName = document.getElementById("resultName");
const resultGrade = document.getElementById("resultGrade");
const resultPower = document.getElementById("resultPower");
const resultComment = document.getElementById("resultComment");

const statAttack = document.getElementById("statAttack");
const statHp = document.getElementById("statHp");
const statSpeed = document.getElementById("statSpeed");
const statAttackSpeed = document.getElementById("statAttackSpeed");
const statRange = document.getElementById("statRange");
const statCost = document.getElementById("statCost");

// =========================
// 그림판 Canvas
// =========================

const drawCanvas = document.getElementById("drawCanvas");
const drawCtx = drawCanvas.getContext("2d");

let isDrawing = false;
let selectedColor = "#000000";
let brushSize = 5;
let isEraser = false;

let currentCharacter = null;
let undoStack = [];

function initDrawCanvas() {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";

  saveCanvasState();
}

function saveCanvasState() {
  const imageData = drawCtx.getImageData(
    0,
    0,
    drawCanvas.width,
    drawCanvas.height
  );

  undoStack.push(imageData);

  if (undoStack.length > 20) {
    undoStack.shift();
  }
}

function undoCanvas() {
  if (undoStack.length <= 1) {
    return;
  }

  undoStack.pop();

  const previousState = undoStack[undoStack.length - 1];
  drawCtx.putImageData(previousState, 0, 0);
}

function clearCanvas() {
  saveCanvasState();

  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function getMousePos(canvas, event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startDrawing(event) {
  isDrawing = true;

  saveCanvasState();

  const pos = getMousePos(drawCanvas, event);

  drawCtx.beginPath();
  drawCtx.moveTo(pos.x, pos.y);
}

function draw(event) {
  if (!isDrawing) {
    return;
  }

  const pos = getMousePos(drawCanvas, event);

  drawCtx.lineWidth = brushSize;

  if (isEraser) {
    drawCtx.globalCompositeOperation = "destination-out";
  } else {
    drawCtx.globalCompositeOperation = "source-over";
    drawCtx.strokeStyle = selectedColor;
  }

  drawCtx.lineTo(pos.x, pos.y);
  drawCtx.stroke();

  drawCtx.globalCompositeOperation = "source-over";
}

function stopDrawing() {
  if (!isDrawing) {
    return;
  }

  isDrawing = false;
  drawCtx.closePath();
}

// =========================
// 이미지 데이터 생성
// =========================

function getCanvasImageData() {
  return drawCanvas.toDataURL("image/png");
}

// =========================
// 임시 스탯 생성
// 29일차에 픽셀 분석 기반으로 교체 예정
// =========================

function createDummyStats() {
  return {
    attack: 10,
    hp: 100,
    speed: 1.0,
    attackSpeed: 1.0,
    range: 80,
    cost: 50,
    power: 1000
  };
}

// =========================
// 임시 character 생성
// =========================

function createCharacterFromCanvas() {
  const originalName = nameInput.value.trim() || "용사";
  const imageData = getCanvasImageData();

  const titles = [
    "불꽃",
    "심연의",
    "무근본",
    "시공간을 뒤흔드는",
    "어딘가 이상한",
    "대충 그린"
  ];

  const randomTitle = titles[Math.floor(Math.random() * titles.length)];
  const finalName = `${randomTitle} ${originalName}`;

  return {
    id: "char_" + Date.now(),
    name: finalName,
    originalName: originalName,
    imageData: imageData,
    grade: "C",

    source: "local",

    stats: createDummyStats(),

    meta: {
      createdAt: Date.now(),
      createdStage: 1,
      corruptedAtStage: null,
      ownerName: "playerA"
    }
  };
}

// =========================
// AI 감정 화면 표시
// =========================

function showJudgeResult(character) {
  previewImage.src = character.imageData;

  resultName.textContent = character.name;
  resultGrade.textContent = `등급: ${character.grade}`;
  resultPower.textContent = `전투력: ${character.stats.power}`;
  resultComment.textContent =
    "AI 분석 결과: 뭔가 약해 보이지만 일단 용사라고 우기고 있습니다.";

  statAttack.textContent = `공격력: ${character.stats.attack}`;
  statHp.textContent = `체력: ${character.stats.hp}`;
  statSpeed.textContent = `이동 속도: ${character.stats.speed}`;
  statAttackSpeed.textContent = `공격 속도: ${character.stats.attackSpeed}`;
  statRange.textContent = `사거리: ${character.stats.range}`;
  statCost.textContent = `소환 비용: ${character.stats.cost}`;
}

// =========================
// 전투 Canvas 테스트
// =========================

const battleCanvas = document.getElementById("battleCanvas");
const battleCtx = battleCanvas.getContext("2d");

function drawBattleBase() {
  battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);

  battleCtx.fillStyle = "#d7ecff";
  battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);

  battleCtx.fillStyle = "#555";
  battleCtx.fillRect(0, 340, battleCanvas.width, 10);

  battleCtx.fillStyle = "#4caf50";
  battleCtx.fillRect(30, 230, 80, 110);

  battleCtx.fillStyle = "#f44336";
  battleCtx.fillRect(690, 230, 80, 110);

  battleCtx.fillStyle = "#000";
  battleCtx.font = "18px Arial";
  battleCtx.fillText("Battle Canvas Test", 310, 60);
}

function drawCharacterOnBattleCanvas(character) {
  drawBattleBase();

  const unitImage = new Image();
  unitImage.src = character.imageData;

  unitImage.onload = () => {
    battleCtx.drawImage(unitImage, 150, 250, 80, 80);

    battleCtx.fillStyle = "#000";
    battleCtx.font = "16px Arial";
    battleCtx.fillText(character.name, 120, 235);
  };
}

// =========================
// 이벤트 연결
// =========================

startBtn.addEventListener("click", () => {
  showScreen("draw");
});

judgeBtn.addEventListener("click", () => {
  currentCharacter = createCharacterFromCanvas();

  showJudgeResult(currentCharacter);
  showScreen("judge");
});

goBattleBtn.addEventListener("click", () => {
  if (!currentCharacter) {
    currentCharacter = createCharacterFromCanvas();
  }

  showScreen("battle");
  drawCharacterOnBattleCanvas(currentCharacter);
});

backDrawBtn.addEventListener("click", () => {
  showScreen("draw");
});

backDrawFromBattleBtn.addEventListener("click", () => {
  showScreen("draw");
});

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    isEraser = false;
    eraserBtn.textContent = "지우개";

    colorButtons.forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
  });
});

brushSizeInput.addEventListener("input", (event) => {
  brushSize = Number(event.target.value);
});

eraserBtn.addEventListener("click", () => {
  isEraser = !isEraser;

  eraserBtn.textContent = isEraser ? "브러시로 전환" : "지우개";

  if (isEraser) {
    colorButtons.forEach((btn) => {
      btn.classList.remove("active");
    });
  } else {
    const blackButton = document.querySelector('.color-btn[data-color="#000000"]');

    if (blackButton) {
      selectedColor = "#000000";
      blackButton.classList.add("active");
    }
  }
});

undoBtn.addEventListener("click", () => {
  undoCanvas();
});

clearBtn.addEventListener("click", () => {
  clearCanvas();
});

drawCanvas.addEventListener("mousedown", startDrawing);
drawCanvas.addEventListener("mousemove", draw);
drawCanvas.addEventListener("mouseup", stopDrawing);
drawCanvas.addEventListener("mouseleave", stopDrawing);

// 초기 실행
initDrawCanvas();