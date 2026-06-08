export class DrawingCanvas {
  constructor({
    canvas,
    colorButtons,
    colorPicker,
    brushSizeInput,
    eraserButton,
    undoButton,
    clearButton,
    inkText,
    maxInk = 128000,
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.colorButtons = Array.from(colorButtons);
    this.colorPicker = colorPicker;
    this.brushSizeInput = brushSizeInput;
    this.eraserButton = eraserButton;
    this.undoButton = undoButton;
    this.clearButton = clearButton;
    this.inkText = inkText;

    this.isDrawing = false;
    this.selectedColor = "#000000";
    this.brushSize = Number(brushSizeInput.value) || 5;
    this.isEraser = false;

    this.undoStack = [];

    this.maxInk = maxInk;
    this.inkUsed = 0;
    this.inkRemain = maxInk;

    this.lastPoint = null;
    this.hasStrokeChanged = false;

    this.startDrawing = this.startDrawing.bind(this);
    this.draw = this.draw.bind(this);
    this.stopDrawing = this.stopDrawing.bind(this);
  }

  init() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.canvas.style.touchAction = "none";

    this.saveCanvasState();
    this.updateInkUI();
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener("pointerdown", this.startDrawing);
    this.canvas.addEventListener("pointermove", this.draw);
    this.canvas.addEventListener("pointerup", this.stopDrawing);
    this.canvas.addEventListener("pointercancel", this.stopDrawing);
    this.canvas.addEventListener("pointerleave", this.stopDrawing);

    this.colorButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectColor(button);
      });
    });

    if (this.colorPicker) {
      this.colorPicker.addEventListener("input", (event) => {
        this.selectCustomColor(event.target.value);
      });
    }

    this.brushSizeInput.addEventListener("input", (event) => {
      this.brushSize = Number(event.target.value) || 1;
    });

    this.eraserButton.addEventListener("click", () => {
      this.toggleEraser();
    });

    this.undoButton.addEventListener("click", () => {
      this.undoCanvas();
    });

    this.clearButton.addEventListener("click", () => {
      this.clearCanvas();
    });
  }

  selectColor(button) {
    this.selectedColor = button.dataset.color || "#000000";
    this.isEraser = false;
    this.eraserButton.textContent = "지우개";

    if (this.colorPicker) {
      this.colorPicker.value = this.selectedColor;
    }

    this.colorButtons.forEach((colorButton) => {
      colorButton.classList.toggle("active", colorButton === button);
    });
  }

  selectCustomColor(color) {
    this.selectedColor = color || "#000000";
    this.isEraser = false;
    this.eraserButton.textContent = "지우개";
    this.colorButtons.forEach((button) => button.classList.remove("active"));
  }

  toggleEraser() {
    this.isEraser = !this.isEraser;
    this.eraserButton.textContent = this.isEraser ? "브러시로 전환" : "지우개";

    if (this.isEraser) {
      this.colorButtons.forEach((button) => button.classList.remove("active"));
      return;
    }

    const blackButton = this.colorButtons.find(
      (button) => button.dataset.color === "#000000",
    );

    if (blackButton) {
      this.selectColor(blackButton);
    }
  }

  startDrawing(event) {
    event.preventDefault();

    if (!this.isPointInsideCanvas(event)) {
      return;
    }

    if (!this.isEraser && this.inkRemain <= 0) {
      return;
    }

    this.isDrawing = true;
    this.hasStrokeChanged = false;

    const position = this.getCanvasPoint(event);
    this.lastPoint = position;

    this.ctx.beginPath();
    this.ctx.moveTo(position.x, position.y);
  }

  draw(event) {
    if (!this.isDrawing) {
      return;
    }

    event.preventDefault();

    if (!this.isPointInsideCanvas(event)) {
      this.stopDrawing(event);
      return;
    }

    const position = this.getCanvasPoint(event);

    if (!this.lastPoint) {
      this.lastPoint = position;
      return;
    }

    const distance = this.calculateDistance(this.lastPoint, position);

    if (distance <= 0) {
      return;
    }

    const inkCost = this.calculateInkCost(distance);

    if (!this.isEraser) {
      if (this.inkRemain <= 0) {
        this.stopDrawing(event);
        return;
      }

      if (inkCost > this.inkRemain) {
        this.stopDrawing(event);
        return;
      }

      this.useInk(inkCost);
    }

    this.ctx.lineWidth = this.brushSize;

    if (this.isEraser) {
      this.ctx.globalCompositeOperation = "destination-out";
    } else {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.strokeStyle = this.selectedColor;
    }

    this.ctx.lineTo(position.x, position.y);
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = "source-over";

    this.lastPoint = position;
    this.hasStrokeChanged = true;
  }

  stopDrawing(event) {
    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;
    this.lastPoint = null;
    this.ctx.closePath();

    if (this.hasStrokeChanged) {
      this.saveCanvasState();
    }

    this.hasStrokeChanged = false;
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.inkUsed = 0;
    this.inkRemain = this.maxInk;

    this.saveCanvasState();
    this.updateInkUI();
  }

  undoCanvas() {
    if (this.undoStack.length <= 1) {
      return;
    }

    this.undoStack.pop();

    const previousState = this.undoStack[this.undoStack.length - 1];

    this.ctx.putImageData(previousState.imageData, 0, 0);

    this.inkUsed = previousState.inkUsed;
    this.inkRemain = previousState.inkRemain;

    this.updateInkUI();
  }

  saveCanvasState() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    this.undoStack.push({
      imageData,
      inkUsed: this.inkUsed,
      inkRemain: this.inkRemain,
    });

    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }

  calculateDistance(pointA, pointB) {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  calculateInkCost(distance) {
    return distance * this.brushSize;
  }

  useInk(amount) {
    this.inkUsed += amount;
    this.inkRemain = Math.max(0, this.maxInk - this.inkUsed);
    this.updateInkUI();
  }

  updateInkUI() {
    if (!this.inkText) {
      return;
    }

    const remainPercent = Math.max(
      0,
      Math.floor((this.inkRemain / this.maxInk) * 100),
    );

    this.inkText.textContent = `잉크: ${remainPercent}%`;
  }

  getInkInfo() {
    return {
      maxInk: this.maxInk,
      inkUsed: Math.floor(this.inkUsed),
      inkRemain: Math.floor(this.inkRemain),
      inkRemainPercent: Math.max(
        0,
        Math.floor((this.inkRemain / this.maxInk) * 100),
      ),
    };
  }

  setMaxInk(maxInk) {
    this.maxInk = maxInk;
    this.inkUsed = 0;
    this.inkRemain = maxInk;
    this.undoStack = [];

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveCanvasState();
    this.updateInkUI();
  }

  isPointInsideCanvas(event) {
    const rect = this.canvas.getBoundingClientRect();

    return (
      event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom
    );
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  toImageData() {
    return this.canvas.toDataURL("image/png");
  }

  setCanvasSize(width, height, maxInk) {
    if (!this.canvas) {
      return;
    }

    this.canvas.width = width;
    this.canvas.height = height;

    this.maxInk = maxInk;
    this.usedInk = 0;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (Array.isArray(this.history)) {
      this.history = [];
    }

    if (typeof this.updateInkText === "function") {
      this.updateInkText();
    }
  }
}
