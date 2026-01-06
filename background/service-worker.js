/**
 * Background service worker for QA Capture extension
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from side panel and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    captureScreenshot()
      .then(imageData => {
        sendResponse({ success: true, imageData: imageData });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else if (tabs[0]) {
        sendResponse({ success: true, tab: tabs[0] });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep channel open for async response
  }
  
  return false; // Not handling this message
});

/**
 * Capture screenshot of visible tab
 * @param {number} windowId - Optional window ID (defaults to current window)
 * @returns {Promise<string>} Base64 image data
 */
async function captureScreenshot(windowId = null) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl);
      }
    });
  });
}

/**
 * Get current tab information
 * @returns {Promise<Object>} Tab object
 */
async function getCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (tabs[0]) {
        resolve(tabs[0]);
      } else {
        reject(new Error('No active tab found'));
      }
    });
  });
}

