/* ===== Quick Screenshot & Annotate - Popup Script ===== */

(function () {
  'use strict';

  const captureFullBtn = document.getElementById('captureFull');
  const captureAreaBtn = document.getElementById('captureArea');
  const formatSelect = document.getElementById('format');
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  const recentList = document.getElementById('recentList');
  const clearRecentBtn = document.getElementById('clearRecent');

  // ===== Settings =====

  // Load saved settings
  chrome.storage.local.get(['format', 'quality'], (result) => {
    if (result.format) formatSelect.value = result.format;
    if (result.quality !== undefined) {
      qualitySlider.value = result.quality;
      qualityValue.textContent = result.quality;
    }
  });

  // Save format on change
  formatSelect.addEventListener('change', () => {
    chrome.storage.local.set({ format: formatSelect.value });
  });

  // Save quality on change
  qualitySlider.addEventListener('input', () => {
    const val = qualitySlider.value;
    qualityValue.textContent = val;
    chrome.storage.local.set({ quality: parseInt(val, 10) });
  });

  // ===== Capture Full Page =====

  captureFullBtn.addEventListener('click', () => {
    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value, 10);

    chrome.runtime.sendMessage(
      { action: 'captureVisibleTab', format, quality },
      (response) => {
        if (chrome.runtime.lastError) {
          showError(chrome.runtime.lastError.message);
          return;
        }
        if (response && response.dataUrl) {
          saveToRecent(response.dataUrl);
          openEditorWithImage(response.dataUrl);
        } else if (response && response.error) {
          showError(response.error);
        }
      }
    );
  });

  // ===== Capture Selected Area =====

  captureAreaBtn.addEventListener('click', () => {
    // First capture the full visible tab
    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value, 10);

    chrome.runtime.sendMessage(
      { action: 'captureVisibleTab', format, quality },
      (response) => {
        if (chrome.runtime.lastError) {
          showError(chrome.runtime.lastError.message);
          return;
        }
        if (response && response.dataUrl) {
          // Store the full capture temporarily
          chrome.storage.local.set({ fullCapture: response.dataUrl }, () => {
            // Inject content script for area selection
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (!tabs || !tabs[0]) {
                showError('Could not access the current tab.');
                return;
              }
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
              }, () => {
                if (chrome.runtime.lastError) {
                  showError(chrome.runtime.lastError.message);
                  return;
                }
                // Close popup so user can see the overlay
                window.close();
              });
            });
          });
        } else if (response && response.error) {
          showError(response.error);
        }
      }
    );
  });

  // ===== Editor =====

  /**
   * Open the annotation editor in a new tab with the captured image.
   */
  function openEditorWithImage(dataUrl) {
    // Store the image data for the editor to pick up
    chrome.storage.local.set({ editorImage: dataUrl }, () => {
      chrome.runtime.sendMessage({ action: 'openEditor' });
    });
  }

  // ===== Recent Screenshots =====

  /**
   * Load and display recent screenshots from storage.
   */
  function loadRecent() {
    chrome.storage.local.get({ recent: [] }, (result) => {
      const recent = result.recent;
      recentList.innerHTML = '';

      if (recent.length === 0) {
        recentList.innerHTML = '<div class="recent-empty">No screenshots yet</div>';
        return;
      }

      recent.forEach((item, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'recent-item';
        thumb.title = new Date(item.timestamp).toLocaleString();

        const img = document.createElement('img');
        img.src = item.dataUrl;
        img.alt = 'Screenshot thumbnail';
        thumb.appendChild(img);

        // Click to re-open in editor
        thumb.addEventListener('click', () => {
          openEditorWithImage(item.dataUrl);
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-thumb';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          recent.splice(index, 1);
          chrome.storage.local.set({ recent }, () => loadRecent());
        });
        thumb.appendChild(delBtn);

        recentList.appendChild(thumb);
      });
    });
  }

  /**
   * Save a screenshot data URL to recent history.
   */
  function saveToRecent(dataUrl) {
    chrome.storage.local.get({ recent: [] }, (result) => {
      const recent = result.recent;
      recent.unshift({
        dataUrl,
        timestamp: Date.now()
      });
      // Keep max 12 recent screenshots
      if (recent.length > 12) {
        recent.length = 12;
      }
      chrome.storage.local.set({ recent }, () => loadRecent());
    });
  }

  // Clear recent history
  clearRecentBtn.addEventListener('click', () => {
    chrome.storage.local.set({ recent: [] }, () => loadRecent());
  });

  // ===== Error Display =====

  function showError(message) {
    const container = document.querySelector('.container');
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
      background: #ff4757;
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 10px;
      text-align: center;
    `;
    errorEl.textContent = 'Error: ' + message;
    container.insertBefore(errorEl, container.firstChild.nextSibling);
    setTimeout(() => {
      if (errorEl.parentNode) errorEl.parentNode.removeChild(errorEl);
    }, 4000);
  }

  // ===== Init =====

  // Listen for area selection completion (from content script via background)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'areaCaptured' && message.dataUrl) {
      saveToRecent(message.dataUrl);
    }
  });

  // Load recent screenshots on popup open
  loadRecent();
})();
