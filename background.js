/* ===== Quick Screenshot & Annotate - Background Service Worker ===== */

// Store pending capture data
let pendingCapture = null;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'captureVisibleTab':
      handleCaptureVisibleTab(message, sender, sendResponse);
      return true; // Keep channel open for async response

    case 'areaSelected':
      handleAreaSelected(message, sender, sendResponse);
      return true;

    case 'openEditor':
      handleOpenEditor(message, sender, sendResponse);
      return true;

    case 'getPendingCapture':
      sendResponse({ dataUrl: pendingCapture });
      return false;

    case 'clearPendingCapture':
      pendingCapture = null;
      sendResponse({ success: true });
      return false;

    default:
      sendResponse({ error: 'Unknown action: ' + message.action });
      return false;
  }
});

/**
 * Capture the visible tab using chrome.tabs.captureVisibleTab.
 * Sends the data URL back to the caller.
 */
function handleCaptureVisibleTab(message, sender, sendResponse) {
  const format = message.format || 'png';
  const quality = message.quality !== undefined ? message.quality : 90;

  chrome.tabs.captureVisibleTab(null, { format, quality }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse({ dataUrl });
  });
}

/**
 * Called by content script after user selects an area.
 * Reads the full capture from storage, crops to the selected region, and stores result.
 */
function handleAreaSelected(message, sender, sendResponse) {
  const { region } = message;

  // Read the full capture that the popup stored
  chrome.storage.local.get('fullCapture', (result) => {
    if (!result.fullCapture) {
      sendResponse({ error: 'No full capture found in storage' });
      return;
    }

    // Crop the image to the selected region
    cropImage(result.fullCapture, region, (croppedDataUrl) => {
      pendingCapture = croppedDataUrl;
      // Also store for the editor to pick up
      chrome.storage.local.set({ editorImage: croppedDataUrl }, () => {
        sendResponse({ success: true, dataUrl: croppedDataUrl });
      });
    });
  });
}

/**
 * Open the annotation editor in a new tab with the captured screenshot.
 */
function handleOpenEditor(message, sender, sendResponse) {
  const editorUrl = chrome.runtime.getURL('editor.html');
  chrome.tabs.create({ url: editorUrl }, (tab) => {
    sendResponse({ tabId: tab.id });
  });
}

/**
 * Crop a data URL image to a specified region using an offscreen canvas.
 */
function cropImage(dataUrl, region, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    callback(canvas.toDataURL('image/png'));
  };
  img.src = dataUrl;
}
