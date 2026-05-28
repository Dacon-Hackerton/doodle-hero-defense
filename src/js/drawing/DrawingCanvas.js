export class DrawingCanvas {
  constructor({
    canvas,
    colorButtons,
    colorPicker,
    brushSizeInput,
    eraserButton,
    undoButton,
    clearButton,
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.colorButtons = Array.from(colorButtons);
    this.colorPicker = colorPicker;
    this.brushSizeInput = brushSizeInput;
    this.eraserButton = eraserButton;
    this.undoButton = undoButton;
    this.clearButton = clearButton;

    this.isDrawing = false;
    this.selectedColor = "#000000";
    this.brushSize = Number(brushSizeInput.value) || 5;
    this.isEraser = false;
    this.undoStack = [];

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
    this.isDrawing = true;
    this.saveCanvasState();

    const position = this.getCanvasPoint(event);
    this.ctx.beginPath();
    this.ctx.moveTo(position.x, position.y);

    if (event.pointerId !== undefined) {
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  draw(event) {
    if (!this.isDrawing) {
      return;
    }

    event.preventDefault();
    const position = this.getCanvasPoint(event);

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
  }

  stopDrawing(event) {
    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;
    this.ctx.closePath();

    if (
      event?.pointerId !== undefined
      && this.canvas.hasPointerCapture(event.pointerId)
    ) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }

  clearCanvas() {
    this.saveCanvasState();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  undoCanvas() {
    if (this.undoStack.length <= 1) {
      return;
    }

    this.undoStack.pop();
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(previousState, 0, 0);
  }

  saveCanvasState() {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    this.undoStack.push(imageData);

    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
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
}
