/**
 * Storage utilities for managing QA Capture sessions
 */

/**
 * Get the next session number based on existing sessions
 * @returns {Promise<number>} Next session number
 */
async function getNextSessionNumber() {
  const allSessions = await loadAllSessions();
  if (Object.keys(allSessions).length === 0) {
    return 1;
  }
  
  const sessionNumbers = Object.keys(allSessions)
    .map(key => {
      const match = key.match(/session_(\d+)_/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num > 0);
  
  return sessionNumbers.length > 0 ? Math.max(...sessionNumbers) + 1 : 1;
}

/**
 * Generate session ID with format: session_XX_YYYYMMDD
 * @param {number} sessionNumber - Session number
 * @param {Date} date - Date object
 * @returns {string} Session ID
 */
function generateSessionId(sessionNumber, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sessionNum = String(sessionNumber).padStart(2, '0');
  return `session_${sessionNum}_${year}${month}${day}`;
}

/**
 * Save a session to Chrome storage
 * @param {Object} sessionData - Session data object
 * @returns {Promise<void>}
 */
async function saveSession(sessionData) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [sessionData.id]: sessionData }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Load a specific session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session data or null if not found
 */
async function loadSession(sessionId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([sessionId], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[sessionId] || null);
      }
    });
  });
}

/**
 * Load all sessions from storage
 * @returns {Promise<Object>} Object with all sessions keyed by session ID
 */
async function loadAllSessions() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        // Filter to only return session objects (those starting with "session_")
        const sessions = {};
        for (const key in result) {
          if (key.startsWith('session_') && typeof result[key] === 'object') {
            sessions[key] = result[key];
          }
        }
        resolve(sessions);
      }
    });
  });
}

/**
 * Delete a specific session
 * @param {string} sessionId - Session ID to delete
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([sessionId], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear all sessions from storage
 * @returns {Promise<void>}
 */
async function clearAllSessions() {
  return new Promise(async (resolve, reject) => {
    try {
      const allSessions = await loadAllSessions();
      const sessionIds = Object.keys(allSessions);
      
      if (sessionIds.length === 0) {
        resolve();
        return;
      }
      
      chrome.storage.local.remove(sessionIds, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get or create a new session ID
 * @returns {Promise<string>} New session ID
 */
async function getNewSessionId() {
  const sessionNumber = await getNextSessionNumber();
  return generateSessionId(sessionNumber);
}

// Export functions for use in other modules
export {
  saveSession,
  loadSession,
  loadAllSessions,
  deleteSession,
  clearAllSessions,
  getNewSessionId,
  generateSessionId
};

