/* ===== Quick Screenshot & Annotate - Content Script (Selection Overlay) ===== */

(function () {
  'use strict';

  // Only run when explicitly injected by the popup
  if (document.getElementById('qs-selection-overlay')) {
    return; // Already active
  }

  let overlay = null;
  let selectionBox = null;
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  /**
   * Create the semi-transparent overlay and selection box elements.
   */
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'qs-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 2147483647;
      cursor: crosshair;
    `;

    selectionBox = document.createElement('div');
    selectionBox.id = 'qs-selection-box';
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #6c5ce7;
      background: rgba(108, 92, 231, 0.1);
      display: none;
      pointer-events: none;
    `;

    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);

    // Instructions tooltip
    const instructions = document.createElement('div');
    instructions.id = 'qs-instructions';
    instructions.textContent = 'Click and drag to select an area. Press Esc to cancel.';
    instructions.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      color: #e0e0e0;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    document.body.appendChild(instructions);
  }

  /**
   * Handle mouse down - start selection.
   */
  function onMouseDown(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }

  /**
   * Handle mouse move - update selection box dimensions.
   */
  function onMouseMove(e) {
    if (!isDragging) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }

  /**
   * Handle mouse up - finalize selection and send coordinates.
   */
  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Ignore tiny selections (accidental clicks)
    if (width < 5 && height < 5) {
      cleanup();
      return;
    }

    // Account for devicePixelRatio for accurate cropping
    const dpr = window.devicePixelRatio || 1;

    const region = {
      x: Math.round(x * dpr),
      y: Math.round(y * dpr),
      width: Math.round(width * dpr),
      height: Math.round(height * dpr)
    };

    // Send region back to background script
    chrome.runtime.sendMessage({
      action: 'areaSelected',
      region: region
    }, (response) => {
      if (response && response.success) {
        // Open the editor
        chrome.runtime.sendMessage({ action: 'openEditor' });
      }
      cleanup();
    });
  }

  /**
   * Handle keyboard - Esc to cancel.
   */
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  /**
   * Remove overlay and event listeners.
   */
  function cleanup() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    const instructions = document.getElementById('qs-instructions');
    if (instructions && instructions.parentNode) {
      instructions.parentNode.removeChild(instructions);
    }
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
  }

  // Attach event listeners
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);

  // Create the overlay
  createOverlay();
})();
