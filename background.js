// Listen for tab updates to track visited sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process if the URL has changed and it's a complete load
  if (changeInfo.status === 'complete' && tab.url) {
    // Ignore chrome:// and edge:// and about:// URLs
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('edge://') || 
        tab.url.startsWith('about://') ||
        tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Record this visit
    recordVisit(tab.url, tab.title, tab.favIconUrl);
  }
});

// Update badge with bookmark count
function updateBadge() {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    const count = bookmarks.length.toString();
    chrome.action.setBadgeText({ text: count });
    chrome.action.setBadgeBackgroundColor({ color: '#4a6cf7' });
  });
}

// Initialize badge when extension starts
updateBadge();

// Listen for changes in storage to update badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.bookmarks) {
    updateBadge();
  }
});

// Record a site visit
function recordVisit(url, title, favicon) {
  // Get current date and time
  const now = new Date();
  const visit = {
    url,
    title: title || 'Unknown',
    favicon: favicon || 'images/sample.png',
    timestamp: now.getTime(),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  // Get existing visits from storage
  chrome.storage.local.get(['visitedSites'], (result) => {
    let visitedSites = result.visitedSites || [];
    
    // Add the new visit
    visitedSites.push(visit);
    
    // Limit the number of stored visits (keep last 1000)
    if (visitedSites.length > 1000) {
      visitedSites = visitedSites.slice(-1000);
    }
    
    // Save the updated visits
    chrome.storage.local.set({ visitedSites });
  });
}

// Clean up old data (older than 30 days) once a day
chrome.alarms.create('cleanupData', { periodInMinutes: 1440 }); // 1440 minutes = 24 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupData') {
    cleanupOldData();
  }
});

function cleanupOldData() {
  chrome.storage.local.get(['visitedSites'], (result) => {
    if (!result.visitedSites) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTime = thirtyDaysAgo.getTime();
    
    // Filter out visits older than 30 days
    const filteredVisits = result.visitedSites.filter(visit => 
      visit.timestamp >= cutoffTime
    );
    
    // Save the filtered visits
    chrome.storage.local.set({ visitedSites: filteredVisits });
  });
} 