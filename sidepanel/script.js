/**
 * Main side panel script for QA Capture extension
 */

// Import utilities
import { createSession, addScreenshot, updateSessionStatus, getActiveSession } from '../utils/session.js';
import { loadAllSessions, deleteSession, clearAllSessions, loadSession } from '../utils/storage.js';
import { exportToPDF, exportToHTML, exportToMarkdown } from '../utils/export.js';

// State
let currentSession = null;
let timerInterval = null;
let startTime = null;

// DOM Elements
const elements = {
  // Tabs
  currentTab: document.getElementById('currentTab'),
  historyTab: document.getElementById('historyTab'),
  sessionDetailsView: document.getElementById('sessionDetailsView'),
  tabs: document.querySelectorAll('.tab'),
  
  // Status
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.querySelector('.status-text'),
  
  // Session controls
  startSessionBtn: document.getElementById('startSessionBtn'),
  stopSessionBtn: document.getElementById('stopSessionBtn'),
  timer: document.getElementById('timer'),
  timerText: document.querySelector('.timer-text'),
  
  // Capture controls
  captureVisibleBtn: document.getElementById('captureVisibleBtn'),
  captureFullPageBtn: document.getElementById('captureFullPageBtn'),
  captureRegionBtn: document.getElementById('captureRegionBtn'),
  
  // Export controls
  currentExportSection: document.getElementById('currentExportSection'),
  exportCurrentPDF: document.getElementById('exportCurrentPDF'),
  exportCurrentMD: document.getElementById('exportCurrentMD'),
  exportCurrentHTML: document.getElementById('exportCurrentHTML'),
  
  // Screenshots
  screenshotsTitle: document.getElementById('screenshotsTitle'),
  screenshotsContainer: document.getElementById('screenshotsContainer'),
  
  // History
  sessionsList: document.getElementById('sessionsList'),
  clearStorageBtn: document.getElementById('clearStorageBtn'),
  
  // Session details
  backBtn: document.getElementById('backBtn'),
  detailSessionTitle: document.getElementById('detailSessionTitle'),
  detailSessionUrl: document.getElementById('detailSessionUrl'),
  detailSessionDate: document.getElementById('detailSessionDate'),
  detailSessionDuration: document.getElementById('detailSessionDuration'),
  logsContainer: document.getElementById('logsContainer'),
  detailScreenshotsTitle: document.getElementById('detailScreenshotsTitle'),
  detailScreenshotsGrid: document.getElementById('detailScreenshotsGrid'),
  detailExportMD: document.getElementById('detailExportMD'),
  detailExportPDF: document.getElementById('detailExportPDF'),
  detailExportHTML: document.getElementById('detailExportHTML'),
  
  // Modal
  titleModal: document.getElementById('titleModal'),
  modalPreviewImage: document.getElementById('modalPreviewImage'),
  modalTitleInput: document.getElementById('modalTitleInput'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalSaveBtn: document.getElementById('modalSaveBtn'),
  
  // Theme
  themeToggle: document.getElementById('themeToggle')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializeTheme();
  await loadActiveSession();
  setupEventListeners();
  await loadHistory();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Session controls
  elements.startSessionBtn.addEventListener('click', startSession);
  elements.stopSessionBtn.addEventListener('click', stopSession);
  
  // Capture controls
  elements.captureVisibleBtn.addEventListener('click', () => captureScreenshot('visible'));
  
  // Export controls (current session)
  elements.exportCurrentPDF.addEventListener('click', () => exportCurrentSession('pdf'));
  elements.exportCurrentMD.addEventListener('click', () => exportCurrentSession('md'));
  elements.exportCurrentHTML.addEventListener('click', () => exportCurrentSession('html'));
  
  // History
  elements.clearStorageBtn.addEventListener('click', clearStorage);
  
  // Session details
  elements.backBtn.addEventListener('click', () => switchTab('history'));
  
  // Modal
  elements.modalCancelBtn.addEventListener('click', closeTitleModal);
  elements.modalSaveBtn.addEventListener('click', saveScreenshotTitle);
  elements.titleModal.addEventListener('click', (e) => {
    if (e.target === elements.titleModal) {
      closeTitleModal();
    }
  });
  
  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Keyboard shortcuts
  elements.modalTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveScreenshotTitle();
    } else if (e.key === 'Escape') {
      closeTitleModal();
    }
  });
}

/**
 * Initialize theme from storage
 */
async function initializeTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['theme'], (result) => {
      const theme = result.theme || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      resolve();
    });
  });
}

/**
 * Toggle dark/light theme
 */
async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  chrome.storage.local.set({ theme: newTheme });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  elements.tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show/hide tab content
  elements.currentTab.classList.toggle('active', tabName === 'current');
  elements.historyTab.classList.toggle('active', tabName === 'history');
  elements.sessionDetailsView.style.display = 'none';
  
  if (tabName === 'history') {
    loadHistory();
  }
}

/**
 * Show session details view
 */
async function showSessionDetails(sessionId) {
  const session = await loadSession(sessionId);
  if (!session) return;
  
  // Hide other views
  elements.currentTab.classList.remove('active');
  elements.historyTab.classList.remove('active');
  elements.sessionDetailsView.style.display = 'block';
  
  // Populate details
  const url = session.url.length > 50 ? session.url.substring(0, 50) + '...' : session.url;
  elements.detailSessionTitle.textContent = `Session on ${url}`;
  elements.detailSessionUrl.textContent = session.url;
  
  const startDate = new Date(session.startTime);
  elements.detailSessionDate.textContent = startDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  elements.detailSessionDuration.textContent = `${formatDuration(session.duration)} duration`;
  
  // Load logs
  loadSessionLogs(session.logs);
  
  // Load screenshots
  loadSessionScreenshots(session.screenshots);
  
  // Setup export buttons
  elements.detailExportMD.onclick = () => exportSession(session, 'md');
  elements.detailExportPDF.onclick = () => exportSession(session, 'pdf');
  elements.detailExportHTML.onclick = () => exportSession(session, 'html');
}

/**
 * Load session logs
 */
function loadSessionLogs(logs) {
  elements.logsContainer.innerHTML = '';
  logs.forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    const time = new Date(log.timestamp);
    logEntry.textContent = `${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ${log.message}`;
    elements.logsContainer.appendChild(logEntry);
  });
}

/**
 * Load session screenshots
 */
function loadSessionScreenshots(screenshots) {
  elements.detailScreenshotsTitle.textContent = `SCREENSHOTS (${screenshots.length})`;
  elements.detailScreenshotsGrid.innerHTML = '';
  
  screenshots.forEach(screenshot => {
    const img = document.createElement('img');
    img.src = screenshot.imageData;
    img.className = 'screenshot-thumbnail-large';
    img.alt = screenshot.title;
    img.title = screenshot.title;
    elements.detailScreenshotsGrid.appendChild(img);
  });
}

/**
 * Load active session if exists
 */
async function loadActiveSession() {
  try {
    currentSession = await getActiveSession();
    if (currentSession) {
      updateUIForActiveSession();
      startTimer();
    } else {
      updateUIForInactiveSession();
    }
  } catch (error) {
    console.error('Error loading active session:', error);
  }
}

/**
 * Start a new session
 */
async function startSession() {
  try {
    // Get current tab
    const response = await chrome.runtime.sendMessage({ action: 'getCurrentTab' });
    if (!response.success) {
      alert('Error: Could not get current tab');
      return;
    }
    
    const tab = response.tab;
    currentSession = await createSession(tab.url);
    startTime = new Date();
    
    updateUIForActiveSession();
    startTimer();
    
    // Switch to current tab if not already
    if (!elements.currentTab.classList.contains('active')) {
      switchTab('current');
    }
  } catch (error) {
    console.error('Error starting session:', error);
    alert('Error starting session: ' + error.message);
  }
}

/**
 * Stop current session
 */
async function stopSession() {
  if (!currentSession) return;
  
  try {
    await updateSessionStatus(currentSession.id, 'stopped');
    stopTimer();
    currentSession = null;
    updateUIForInactiveSession();
    await loadHistory();
  } catch (error) {
    console.error('Error stopping session:', error);
    alert('Error stopping session: ' + error.message);
  }
}

/**
 * Start timer
 */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  if (!currentSession || !currentSession.startTime) return;
  
  startTime = new Date(currentSession.startTime);
  
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    elements.timerText.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

/**
 * Stop timer
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  elements.timer.style.display = 'none';
}

/**
 * Update UI for active session
 */
function updateUIForActiveSession() {
  elements.startSessionBtn.disabled = true;
  elements.stopSessionBtn.disabled = false;
  elements.captureVisibleBtn.disabled = false;
  elements.statusIndicator.classList.add('recording');
  elements.statusText.textContent = 'Recording';
  elements.timer.style.display = 'flex';
  elements.currentExportSection.style.display = 'block';
  updateScreenshotsList();
}

/**
 * Update UI for inactive session
 */
function updateUIForInactiveSession() {
  elements.startSessionBtn.disabled = false;
  elements.stopSessionBtn.disabled = true;
  elements.captureVisibleBtn.disabled = true;
  elements.statusIndicator.classList.remove('recording');
  elements.statusText.textContent = 'Idle';
  elements.timer.style.display = 'none';
  elements.currentExportSection.style.display = 'none';
  elements.screenshotsContainer.innerHTML = '<div class="empty-state"><p>No screenshots captured yet.</p></div>';
  elements.screenshotsTitle.textContent = 'SCREENSHOTS (0)';
}

/**
 * Capture screenshot
 */
async function captureScreenshot(type) {
  if (!currentSession) {
    alert('Please start a session first');
    return;
  }
  
  try {
    // Get current tab
    const tabResponse = await chrome.runtime.sendMessage({ action: 'getCurrentTab' });
    if (!tabResponse || !tabResponse.success) {
      alert('Error: Could not get current tab');
      return;
    }
    
    const tab = tabResponse.tab;
    
    // Capture screenshot
    const captureResponse = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    if (!captureResponse || !captureResponse.success) {
      const errorMsg = captureResponse?.error || 'Unknown error occurred';
      alert('Error capturing screenshot: ' + errorMsg);
      return;
    }
    
    // Show title modal
    showTitleModal(captureResponse.imageData, tab.url, tab.width + 'x' + tab.height);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    alert('Error capturing screenshot: ' + error.message);
  }
}

let pendingScreenshot = null;
let pendingUrl = '';
let pendingDeviceSize = '';

/**
 * Show title modal
 */
function showTitleModal(imageData, url, deviceSize) {
  pendingScreenshot = imageData;
  pendingUrl = url;
  pendingDeviceSize = deviceSize;
  elements.modalPreviewImage.src = imageData;
  elements.modalTitleInput.value = '';
  elements.titleModal.style.display = 'flex';
  elements.modalTitleInput.focus();
}

/**
 * Close title modal
 */
function closeTitleModal() {
  elements.titleModal.style.display = 'none';
  // Keep screenshot but use default title
  if (pendingScreenshot) {
    saveScreenshotWithTitle(null);
  }
  pendingScreenshot = null;
  pendingUrl = '';
  pendingDeviceSize = '';
}

/**
 * Save screenshot with title
 */
async function saveScreenshotWithTitle(title) {
  if (!pendingScreenshot || !currentSession) return;
  
  try {
    const defaultTitle = title || `Screenshot ${currentSession.screenshots.length + 1}`;
    await addScreenshot(
      currentSession.id,
      pendingScreenshot,
      defaultTitle,
      'visible',
      pendingUrl,
      pendingDeviceSize
    );
    
    // Reload session
    currentSession = await getActiveSession();
    
    updateScreenshotsList();
    
    pendingScreenshot = null;
    pendingUrl = '';
    pendingDeviceSize = '';
  } catch (error) {
    console.error('Error saving screenshot:', error);
    alert('Error saving screenshot: ' + error.message);
  }
}

/**
 * Save screenshot title from modal
 */
async function saveScreenshotTitle() {
  const title = elements.modalTitleInput.value.trim();
  elements.titleModal.style.display = 'none';
  await saveScreenshotWithTitle(title || null);
}

/**
 * Update screenshots list
 */
function updateScreenshotsList() {
  if (!currentSession || !currentSession.screenshots) {
    elements.screenshotsContainer.innerHTML = '<div class="empty-state"><p>No screenshots captured yet.</p></div>';
    elements.screenshotsTitle.textContent = 'SCREENSHOTS (0)';
    return;
  }
  
  const screenshots = currentSession.screenshots;
  elements.screenshotsTitle.textContent = `SCREENSHOTS (${screenshots.length})`;
  
  if (screenshots.length === 0) {
    elements.screenshotsContainer.innerHTML = '<div class="empty-state"><p>No screenshots captured yet.</p></div>';
    return;
  }
  
  elements.screenshotsContainer.innerHTML = '';
  screenshots.forEach(screenshot => {
    const item = document.createElement('div');
    item.className = 'screenshot-item';
    
    const thumbnail = document.createElement('img');
    thumbnail.src = screenshot.imageData;
    thumbnail.className = 'screenshot-thumbnail';
    thumbnail.alt = screenshot.title;
    
    const info = document.createElement('div');
    info.className = 'screenshot-info';
    
    const name = document.createElement('div');
    name.className = 'screenshot-name';
    name.textContent = screenshot.title;
    
    const meta = document.createElement('div');
    meta.className = 'screenshot-meta';
    meta.textContent = `Step ${screenshot.stepNumber} - Captured ${screenshot.type}`;
    
    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(thumbnail);
    item.appendChild(info);
    elements.screenshotsContainer.appendChild(item);
  });
}

/**
 * Load history
 */
async function loadHistory() {
  try {
    const sessions = await loadAllSessions();
    const sessionsArray = Object.values(sessions).sort((a, b) => {
      return new Date(b.startTime) - new Date(a.startTime);
    });
    
    if (sessionsArray.length === 0) {
      elements.sessionsList.innerHTML = '<div class="empty-state"><p>No sessions recorded yet.</p></div>';
      return;
    }
    
    elements.sessionsList.innerHTML = '';
    sessionsArray.forEach(session => {
      const card = createSessionCard(session);
      elements.sessionsList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

/**
 * Create session card element
 */
function createSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';
  
  const title = document.createElement('div');
  title.className = 'session-card-title';
  const url = session.url.length > 60 ? session.url.substring(0, 60) + '...' : session.url;
  title.textContent = `Session on ${url}`;
  
  const urlText = document.createElement('div');
  urlText.className = 'session-card-url';
  urlText.textContent = session.url;
  
  const meta = document.createElement('div');
  meta.className = 'session-card-meta';
  
  const date = new Date(session.startTime);
  const dateText = date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  meta.innerHTML = `
    <span>📅 ${dateText}</span>
    <span>⏱️ ${formatDuration(session.duration)}</span>
  `;
  
  const actions = document.createElement('div');
  actions.className = 'session-card-actions';
  
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn-action';
  viewBtn.textContent = 'View Details';
  viewBtn.onclick = () => showSessionDetails(session.id);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-action';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = async () => {
    if (confirm('Are you sure you want to delete this session?')) {
      await deleteSession(session.id);
      await loadHistory();
    }
  };
  
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-action';
  exportBtn.textContent = 'Export';
  exportBtn.onclick = () => {
    // Show export options
    const format = prompt('Export format (pdf, html, md):', 'pdf');
    if (format && ['pdf', 'html', 'md'].includes(format.toLowerCase())) {
      exportSession(session, format.toLowerCase());
    }
  };
  
  actions.appendChild(viewBtn);
  actions.appendChild(exportBtn);
  actions.appendChild(deleteBtn);
  
  card.appendChild(title);
  card.appendChild(urlText);
  card.appendChild(meta);
  card.appendChild(actions);
  
  return card;
}

/**
 * Export current session
 */
async function exportCurrentSession(format) {
  if (!currentSession) {
    alert('No active session to export');
    return;
  }
  
  // Reload session to get latest data
  const session = await getActiveSession();
  if (!session) {
    alert('Session not found');
    return;
  }
  
  await exportSession(session, format);
}

/**
 * Export session
 */
async function exportSession(session, format) {
  try {
    if (format === 'pdf') {
      await exportToPDF(session);
    } else if (format === 'html') {
      await exportToHTML(session);
    } else if (format === 'md') {
      await exportToMarkdown(session);
    }
  } catch (error) {
    console.error('Error exporting session:', error);
    alert('Error exporting session: ' + error.message);
  }
}

/**
 * Clear all storage
 */
async function clearStorage() {
  if (!confirm('Are you sure you want to clear all sessions? This cannot be undone.')) {
    return;
  }
  
  try {
    await clearAllSessions();
    await loadHistory();
    alert('All sessions cleared');
  } catch (error) {
    console.error('Error clearing storage:', error);
    alert('Error clearing storage: ' + error.message);
  }
}

/**
 * Format duration
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

