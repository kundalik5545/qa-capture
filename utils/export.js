/**
 * Export functions for QA Capture sessions
 */

/**
 * Export session to PDF using browser print API
 * Note: This creates a print-friendly HTML that can be saved as PDF
 * @param {Object} sessionData - Session data object
 * @returns {Promise<void>}
 */
async function exportToPDF(sessionData) {
  // Create a print-friendly HTML document
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Capture - ${sessionData.id}</title>
  <style>
    @media print {
      @page { margin: 1cm; }
      body { margin: 0; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background-color: white;
    }
    .header {
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #1a1a1a;
      font-size: 24px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .screenshot {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .screenshot-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .screenshot-meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .screenshot img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>QA Capture Session Report</h1>
    <div class="meta">
      <p><strong>URL:</strong> ${escapeHtml(sessionData.url)}</p>
      <p><strong>Date:</strong> ${formatDate(sessionData.startTime)}</p>
      <p><strong>Duration:</strong> ${formatDuration(sessionData.duration)}</p>
    </div>
  </div>
`;

  // Add screenshots
  for (let i = 0; i < sessionData.screenshots.length; i++) {
    const screenshot = sessionData.screenshots[i];
    html += `
  <div class="screenshot ${i > 0 ? "page-break" : ""}">
    <div class="screenshot-title">Step ${screenshot.stepNumber}: ${escapeHtml(
      screenshot.title
    )}</div>
    <div class="screenshot-meta">Captured: ${formatTime(
      screenshot.timestamp
    )}</div>
    <img src="${screenshot.imageData}" alt="${escapeHtml(screenshot.title)}">
  </div>
`;
  }

  html += `
</body>
</html>`;

  // Open in new window and trigger print
  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for images to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Note: User can save as PDF from print dialog
    }, 500);
  };
}

/**
 * Export session to HTML
 * @param {Object} sessionData - Session data object
 * @returns {Promise<void>}
 */
async function exportToHTML(sessionData) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Capture - ${sessionData.id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    .meta {
      color: #666;
      font-size: 14px;
    }
    .screenshot {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .screenshot-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .screenshot-meta {
      color: #666;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .screenshot img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>QA Capture Session Report</h1>
    <div class="meta">
      <p><strong>URL:</strong> ${escapeHtml(sessionData.url)}</p>
      <p><strong>Date:</strong> ${formatDate(sessionData.startTime)}</p>
      <p><strong>Duration:</strong> ${formatDuration(sessionData.duration)}</p>
    </div>
  </div>
`;

  // Add screenshots
  for (const screenshot of sessionData.screenshots) {
    html += `
  <div class="screenshot">
    <div class="screenshot-title">Step ${screenshot.stepNumber}: ${escapeHtml(
      screenshot.title
    )}</div>
    <div class="screenshot-meta">Captured: ${formatTime(
      screenshot.timestamp
    )}</div>
    <img src="${screenshot.imageData}" alt="${escapeHtml(screenshot.title)}">
  </div>
`;
  }

  html += `
</body>
</html>`;

  // Download HTML file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-capture-${sessionData.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export session to Markdown
 * @param {Object} sessionData - Session data object
 * @returns {Promise<void>}
 */
async function exportToMarkdown(sessionData) {
  let markdown = `# QA Capture Session Report\n\n`;
  markdown += `**URL:** ${sessionData.url}\n\n`;
  markdown += `**Date:** ${formatDate(sessionData.startTime)}\n\n`;
  markdown += `**Duration:** ${formatDuration(sessionData.duration)}\n\n`;
  markdown += `---\n\n`;

  // Add screenshots
  for (const screenshot of sessionData.screenshots) {
    markdown += `## Step ${screenshot.stepNumber}: ${screenshot.title}\n\n`;
    markdown += `**Captured:** ${formatTime(screenshot.timestamp)}\n\n`;

    // For markdown, we'll save images separately and reference them
    // For now, we'll embed as base64 data URI (some markdown renderers support this)
    markdown += `![${screenshot.title}](${screenshot.imageData})\n\n`;
    markdown += `---\n\n`;
  }

  // Download Markdown file
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-capture-${sessionData.id}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format date for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format time for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted time
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format duration in seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
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

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
export { exportToPDF, exportToHTML, exportToMarkdown };
