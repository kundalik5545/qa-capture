/**
 * Session management utilities for QA Capture
 */

// Storage utilities will be loaded dynamically
let storageUtils = null;

async function getStorageUtils() {
  if (!storageUtils) {
    storageUtils = await import('./storage.js');
  }
  return storageUtils;
}

/**
 * Create a new session
 * @param {string} url - Current page URL
 * @returns {Promise<Object>} New session object
 */
async function createSession(url) {
  const utils = await getStorageUtils();
  const sessionId = await utils.getNewSessionId();
  const now = new Date();
  
  const session = {
    id: sessionId,
    url: url,
    startTime: now.toISOString(),
    endTime: null,
    duration: 0,
    status: 'active',
    screenshots: [],
    logs: []
  };
  
  // Add initial log directly to session object (don't call addLog which tries to load from storage)
  session.logs.push({
    timestamp: now.toISOString(),
    message: 'Session Started'
  });
  
  // Save session
  await utils.saveSession(session);
  
  return session;
}

/**
 * Add a screenshot to a session
 * @param {string} sessionId - Session ID
 * @param {string} imageData - Base64 image data
 * @param {string} title - Screenshot title
 * @param {string} type - Screenshot type (visible, fullpage, region)
 * @param {string} url - URL where screenshot was taken
 * @param {string} deviceSize - Device/viewport size
 * @returns {Promise<Object>} Updated session
 */
async function addScreenshot(sessionId, imageData, title, type = 'visible', url = '', deviceSize = '') {
  const utils = await getStorageUtils();
  const session = await utils.loadSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  const stepNumber = String(session.screenshots.length + 1).padStart(2, '0');
  const screenshot = {
    id: `screenshot_${stepNumber}`,
    stepNumber: stepNumber,
    title: title || `Screenshot ${session.screenshots.length + 1}`,
    timestamp: new Date().toISOString(),
    imageData: imageData,
    type: type,
    url: url,
    deviceSize: deviceSize
  };
  
  session.screenshots.push(screenshot);
  
  // Add log entry
  await addLog(sessionId, `Screenshot Captured - ${screenshot.title}`);
  
  // Save updated session
  await utils.saveSession(session);
  
  return session;
}

/**
 * Add a log entry to a session
 * @param {string} sessionId - Session ID
 * @param {string} message - Log message
 * @returns {Promise<void>}
 */
async function addLog(sessionId, message) {
  const utils = await getStorageUtils();
  const session = await utils.loadSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message
  };
  
  session.logs.push(logEntry);
  await utils.saveSession(session);
}

/**
 * Update session status
 * @param {string} sessionId - Session ID
 * @param {string} status - New status (active, stopped, paused)
 * @returns {Promise<Object>} Updated session
 */
async function updateSessionStatus(sessionId, status) {
  const utils = await getStorageUtils();
  const session = await utils.loadSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  session.status = status;
  
  if (status === 'stopped') {
    session.endTime = new Date().toISOString();
    session.duration = calculateDuration(session.startTime, session.endTime);
    await addLog(sessionId, 'Session Stopped');
  }
  
  await utils.saveSession(session);
  return session;
}

/**
 * Calculate duration between two timestamps in seconds
 * @param {string} startTime - ISO timestamp string
 * @param {string} endTime - ISO timestamp string
 * @returns {number} Duration in seconds
 */
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end - start) / 1000);
}

/**
 * Get current active session
 * @returns {Promise<Object|null>} Active session or null
 */
async function getActiveSession() {
  return new Promise(async (resolve, reject) => {
    try {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        // Find active session
        for (const key in result) {
          if (key.startsWith('session_') && result[key].status === 'active') {
            resolve(result[key]);
            return;
          }
        }
        
        resolve(null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Export functions
export {
  createSession,
  addScreenshot,
  addLog,
  updateSessionStatus,
  calculateDuration,
  getActiveSession
};

