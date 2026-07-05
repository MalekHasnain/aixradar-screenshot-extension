/* ===== Quick Screenshot & Annotate - Editor Script ===== */

(function () {
  'use strict';

  // ===== DOM References =====
  const canvas = document.getElementById('editorCanvas');
  const ctx = canvas.getContext('2d');

  const toolArrow = document.getElementById('toolArrow');
  const toolRect = document.getElementById('toolRect');
  const toolText = document.getElementById('toolText');
  const colorPicker = document.getElementById('colorPicker');
  const lineWidthSelect = document.getElementById('lineWidth');
  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusText = document.getElementById('statusText');

  // ===== State =====
  let currentTool = 'arrow';
  let currentColor = '#6c5ce7';
  let currentLineWidth = 3;
  let image = null;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;

  // Undo stack: each entry is a full canvas state (ImageData)
  const undoStack = [];
  const MAX_UNDO = 50;

  // Stored annotations for text tool
  let textAnnotations = [];

  // ===== Initialization =====

  /**
   * Load the screenshot from storage and render it on the canvas.
   */
  function loadImage() {
    chrome.storage.local.get('editorImage', (result) => {
      if (!result.editorImage) {
        statusText.textContent = 'Error: No screenshot found. Please capture first.';
        return;
      }

      const img = new Image();
      img.onload = () => {
        image = img;
        canvas.width = img.width;
        canvas.height = img.height;
        drawImage();
        saveUndoState();
        statusText.textContent = `Loaded ${img.width}×${img.height} — Select a tool to annotate`;
      };
      img.onerror = () => {
        statusText.textContent = 'Error: Failed to load screenshot image.';
      };
      img.src = result.editorImage;
    });
  }

  /**
   * Draw the base image on the canvas.
   */
  function drawImage() {
    if (!image) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
  }

  /**
   * Redraw the full canvas: image + all annotations from the undo stack.
   */
  function redraw() {
    if (!image) return;
    if (undoStack.length === 0) {
      drawImage();
      return;
    }
    // Restore the latest undo state
    const lastState = undoStack[undoStack.length - 1];
    ctx.putImageData(lastState, 0, 0);
  }

  // ===== Undo System =====

  /**
   * Save the current canvas state to the undo stack.
   */
  function saveUndoState() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.push(imageData);
    if (undoStack.length > MAX_UNDO) {
      undoStack.shift();
    }
    updateUndoButton();
  }

  /**
   * Undo the last drawing action.
   */
  function undo() {
    if (undoStack.length <= 1) return; // Keep at least the initial state
    undoStack.pop();
    const previousState = undoStack[undoStack.length - 1];
    ctx.putImageData(previousState, 0, 0);
    updateUndoButton();
    statusText.textContent = 'Undo — Last annotation removed';
  }

  function updateUndoButton() {
    undoBtn.style.opacity = undoStack.length > 1 ? '1' : '0.4';
  }

  // ===== Drawing Tools =====

  /**
   * Get the mouse position relative to the canvas.
   */
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Draw an arrow from (x1,y1) to (x2,y2).
   */
  function drawArrow(x1, y1, x2, y2, color, width) {
    const headLen = Math.min(20, Math.hypot(x2 - x1, y2 - y1) * 0.3);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw the arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw a rectangle outline from (x1,y1) to (x2,y2).
   */
  function drawRect(x1, y1, x2, y2, color, width) {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  /**
   * Draw text at a given position.
   */
  function drawText(x, y, text, color, width) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${Math.max(16, width * 6)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Draw text shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Split multi-line text
    const lines = text.split('\n');
    const lineHeight = parseInt(ctx.font, 10) * 1.3;
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight);
    });

    ctx.restore();
  }

  // ===== Mouse Event Handlers =====

  function onMouseDown(e) {
    const pos = getMousePos(e);
    isDrawing = true;
    startX = pos.x;
    startY = pos.y;

    if (currentTool === 'text') {
      // For text tool, show an input field on click
      showTextInput(pos.x, pos.y);
      isDrawing = false; // Text is placed on submit, not on drag
    }
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    // Redraw to the last saved state, then draw the preview
    redraw();

    switch (currentTool) {
      case 'arrow':
        drawArrow(startX, startY, pos.x, pos.y, currentColor, currentLineWidth);
        break;
      case 'rect':
        drawRect(startX, startY, pos.x, pos.y, currentColor, currentLineWidth);
        break;
    }
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    const pos = getMousePos(e);

    // Finalize the drawing
    redraw();

    switch (currentTool) {
      case 'arrow':
        drawArrow(startX, startY, pos.x, pos.y, currentColor, currentLineWidth);
        break;
      case 'rect':
        drawRect(startX, startY, pos.x, pos.y, currentColor, currentLineWidth);
        break;
    }

    saveUndoState();
    statusText.textContent = `Added ${currentTool} annotation`;
  }

  // ===== Text Input Overlay =====

  function showTextInput(x, y) {
    // Remove any existing text input
    const existing = document.querySelector('.text-input-overlay');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'text-input-overlay';
    wrapper.style.cssText = `
      position: fixed;
      z-index: 1000;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type text and press Enter';
    input.style.cssText = `
      background: transparent;
      border: none;
      border-bottom: 2px solid ${currentColor};
      color: ${currentColor};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${Math.max(16, currentLineWidth * 6)}px;
      outline: none;
      min-width: 150px;
      padding: 2px 4px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
    `;

    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    // Position the input relative to canvas
    const canvasRect = canvas.getBoundingClientRect();
    wrapper.style.left = (canvasRect.left + x) + 'px';
    wrapper.style.top = (canvasRect.top + y) + 'px';

    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) {
          // Draw the text on canvas
          drawText(x, y, text, currentColor, currentLineWidth);
          saveUndoState();
          statusText.textContent = `Added text: "${text}"`;
        }
        wrapper.remove();
      } else if (e.key === 'Escape') {
        wrapper.remove();
      }
    });

    // Remove on blur (click elsewhere)
    input.addEventListener('blur', () => {
      // Small delay to allow click events to process
      setTimeout(() => {
        if (wrapper.parentNode) wrapper.remove();
      }, 200);
    });
  }

  // ===== Tool Selection =====

  function setTool(tool) {
    currentTool = tool;
    [toolArrow, toolRect, toolText].forEach((btn) => btn.classList.remove('active'));
    switch (tool) {
      case 'arrow':
        toolArrow.classList.add('active');
        canvas.style.cursor = 'crosshair';
        statusText.textContent = 'Arrow tool — Click and drag to draw an arrow';
        break;
      case 'rect':
        toolRect.classList.add('active');
        canvas.style.cursor = 'crosshair';
        statusText.textContent = 'Rectangle tool — Click and drag to draw a rectangle';
        break;
      case 'text':
        toolText.classList.add('active');
        canvas.style.cursor = 'text';
        statusText.textContent = 'Text tool — Click to place text';
        break;
    }
  }

  toolArrow.addEventListener('click', () => setTool('arrow'));
  toolRect.addEventListener('click', () => setTool('rect'));
  toolText.addEventListener('click', () => setTool('text'));

  // ===== Color & Line Width =====

  colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
  });

  lineWidthSelect.addEventListener('change', () => {
    currentLineWidth = parseInt(lineWidthSelect.value, 10);
  });

  // ===== Undo & Clear =====

  undoBtn.addEventListener('click', undo);

  clearBtn.addEventListener('click', () => {
    if (undoStack.length <= 1) return;
    // Clear all annotations by restoring the initial state
    while (undoStack.length > 1) {
      undoStack.shift();
    }
    const initial = undoStack[0];
    ctx.putImageData(initial, 0, 0);
    updateUndoButton();
    statusText.textContent = 'Cleared all annotations';
  });

  // ===== Download =====

  downloadBtn.addEventListener('click', downloadPNG);

  function downloadPNG() {
    // Generate a timestamp-based filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const filename = `screenshot-${dateStr}_${timeStr}.png`;

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        statusText.textContent = 'Error: Failed to generate image';
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusText.textContent = `Downloaded as ${filename}`;
    }, 'image/png');
  }

  // ===== Keyboard Shortcuts =====

  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in text input
    if (e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
      case 'a':
        e.preventDefault();
        setTool('arrow');
        break;
      case 'r':
        e.preventDefault();
        setTool('rect');
        break;
      case 't':
        e.preventDefault();
        setTool('text');
        break;
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          undo();
        }
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          downloadPNG();
        }
        break;
    }
  });

  // ===== Canvas Event Binding =====

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', () => {
    if (isDrawing) {
      isDrawing = false;
      redraw();
    }
  });

  // ===== Init =====

  loadImage();
})();
