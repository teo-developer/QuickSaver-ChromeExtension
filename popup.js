// DOM Elements
const urlDisplay = document.getElementById('url-display');
const saveBtn = document.getElementById('save-btn');
const bookmarkList = document.getElementById('bookmark-list');
const searchInput = document.getElementById('search-input');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const sitesVisitedEl = document.getElementById('sites-visited');
const bookmarksAddedEl = document.getElementById('bookmarks-added');
const topSitesEl = document.getElementById('top-sites');
const timelineEl = document.getElementById('timeline');

// Global variables
let currentUrl = '';
let currentTitle = '';
let currentFavicon = '';
let bookmarks = [];
let visitedSites = [];

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  // Get current tab information
  getCurrentTabInfo();
  
  // Load saved data
  loadData();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update insights
  updateInsights();
});

// Get current tab information
function getCurrentTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      currentUrl = activeTab.url;
      currentTitle = activeTab.title || 'Unknown';
      currentFavicon = activeTab.favIconUrl || 'images/default-favicon.png';
      
      // Display current URL
      urlDisplay.textContent = formatUrl(currentUrl);
      
      // Record this visit
      recordVisit(currentUrl, currentTitle, currentFavicon);
    }
  });
}

// Format URL for display (remove protocol and trailing slash)
function formatUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Record a site visit
function recordVisit(url, title, favicon) {
  const now = new Date();
  const visit = {
    url,
    title,
    favicon,
    timestamp: now.getTime(),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  // Check if we already have visits for today
  const today = new Date().toLocaleDateString();
  let todayVisits = visitedSites.filter(site => site.date === today);
  
  // Add the new visit
  visitedSites.push(visit);
  
  // Save the updated visits
  chrome.storage.local.set({ visitedSites });
}

// Load saved data from storage
function loadData() {
  chrome.storage.local.get(['bookmarks', 'visitedSites'], (result) => {
    bookmarks = result.bookmarks || [];
    visitedSites = result.visitedSites || [];
    
    // Render bookmarks
    renderBookmarks();
  });
}

// Set up event listeners
function setupEventListeners() {
  // Save button
  saveBtn.addEventListener('click', saveCurrentSite);
  
  // Search input
  searchInput.addEventListener('input', filterBookmarks);
  
  // Tab navigation
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update active tab pane
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabId) {
          pane.classList.add('active');
        }
      });
      
      // Update insights if insights tab is selected
      if (tabId === 'insights') {
        updateInsights();
      }
    });
  });
}

// Save current site as bookmark
function saveCurrentSite() {
  // Check if URL is already bookmarked
  const isAlreadyBookmarked = bookmarks.some(bookmark => bookmark.url === currentUrl);
  
  if (!isAlreadyBookmarked && currentUrl) {
    const newBookmark = {
      id: Date.now(),
      url: currentUrl,
      title: currentTitle || 'Unknown',
      favicon: currentFavicon || 'images/default-favicon.png',
      dateAdded: new Date().toLocaleDateString()
    };
    
    // Add to bookmarks array
    bookmarks.unshift(newBookmark);
    
    // Save to storage
    chrome.storage.local.set({ bookmarks });
    
    // Render updated bookmarks
    renderBookmarks();
    
    // Show success animation on save button
    saveBtn.classList.add('success');
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    
    setTimeout(() => {
      saveBtn.classList.remove('success');
      saveBtn.innerHTML = '<i class="fas fa-plus"></i> Save Current Site';
    }, 2000);
  } else if (isAlreadyBookmarked) {
    // Show already bookmarked message
    saveBtn.classList.add('warning');
    saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Already Saved';
    
    setTimeout(() => {
      saveBtn.classList.remove('warning');
      saveBtn.innerHTML = '<i class="fas fa-plus"></i> Save Current Site';
    }, 2000);
  }
}

// Render bookmarks in the list
function renderBookmarks(filteredBookmarks = null) {
  const bookmarksToRender = filteredBookmarks || bookmarks;
  
  if (bookmarksToRender.length === 0) {
    bookmarkList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <p>No bookmarks yet. Save your first site!</p>
      </div>
    `;
    return;
  }
  
  bookmarkList.innerHTML = '';
  
  bookmarksToRender.forEach(bookmark => {
    const bookmarkEl = document.createElement('div');
    bookmarkEl.className = 'bookmark-item';
    bookmarkEl.innerHTML = `
      <img class="bookmark-icon" src="${bookmark.favicon}" alt="Favicon" onerror="this.src='images/default-favicon.png'">
      <div class="bookmark-info">
        <div class="bookmark-title">${bookmark.title}</div>
        <div class="bookmark-url">${formatUrl(bookmark.url)}</div>
      </div>
      <div class="bookmark-actions">
        <button class="visit-btn" title="Visit Site"><i class="fas fa-external-link-alt"></i></button>
        <button class="delete-btn" title="Delete Bookmark"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Visit button
    const visitBtn = bookmarkEl.querySelector('.visit-btn');
    visitBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: bookmark.url });
    });
    
    // Delete button
    const deleteBtn = bookmarkEl.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
      deleteBookmark(bookmark.id);
    });
    
    bookmarkList.appendChild(bookmarkEl);
  });
}

// Delete a bookmark
function deleteBookmark(id) {
  bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
  chrome.storage.local.set({ bookmarks });
  renderBookmarks();
}

// Filter bookmarks based on search input
function filterBookmarks() {
  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    renderBookmarks();
    return;
  }
  
  const filtered = bookmarks.filter(bookmark => {
    return bookmark.title.toLowerCase().includes(searchTerm) || 
           bookmark.url.toLowerCase().includes(searchTerm);
  });
  
  renderBookmarks(filtered);
}

// Update insights tab with data
function updateInsights() {
  const today = new Date().toLocaleDateString();
  const todayVisits = visitedSites.filter(site => site.date === today);
  const todayBookmarks = bookmarks.filter(bookmark => bookmark.dateAdded === today);
  
  // Update stats
  sitesVisitedEl.textContent = todayVisits.length;
  bookmarksAddedEl.textContent = todayBookmarks.length;
  
  // Update most visited sites
  updateTopSites(todayVisits);
  
  // Update timeline
  updateTimeline(todayVisits);
}

// Update top sites section
function updateTopSites(todayVisits) {
  // Count visits per site
  const siteCounts = {};
  todayVisits.forEach(visit => {
    const domain = new URL(visit.url).hostname;
    siteCounts[domain] = (siteCounts[domain] || 0) + 1;
    // Store the most recent title and favicon for this domain
    if (!siteCounts[`${domain}_title`] || visit.timestamp > siteCounts[`${domain}_timestamp`]) {
      siteCounts[`${domain}_title`] = visit.title;
      siteCounts[`${domain}_favicon`] = visit.favicon;
      siteCounts[`${domain}_timestamp`] = visit.timestamp;
    }
  });
  
  // Convert to array and sort
  const topSites = Object.keys(siteCounts)
    .filter(key => !key.includes('_'))
    .map(domain => ({
      domain,
      visits: siteCounts[domain],
      title: siteCounts[`${domain}_title`],
      favicon: siteCounts[`${domain}_favicon`]
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
  
  // Render top sites
  if (topSites.length === 0) {
    topSitesEl.innerHTML = `<li class="empty-state">No data available yet</li>`;
    return;
  }
  
  topSitesEl.innerHTML = '';
  topSites.forEach((site, index) => {
    const siteEl = document.createElement('li');
    siteEl.innerHTML = `
      <div class="site-rank">${index + 1}</div>
      <img class="bookmark-icon" src="${site.favicon}" alt="Favicon" onerror="this.src='images/default-favicon.png'">
      <div class="site-info">
        <div class="site-title">${site.domain}</div>
        <div class="site-visits">${site.visits} visit${site.visits > 1 ? 's' : ''}</div>
      </div>
    `;
    topSitesEl.appendChild(siteEl);
  });
}

// Update timeline section
function updateTimeline(todayVisits) {
  // Sort visits by time (newest first)
  const sortedVisits = [...todayVisits].sort((a, b) => b.timestamp - a.timestamp);
  
  // Render timeline
  if (sortedVisits.length === 0) {
    timelineEl.innerHTML = `<div class="empty-state">No activity recorded yet</div>`;
    return;
  }
  
  timelineEl.innerHTML = '';
  sortedVisits.slice(0, 10).forEach(visit => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    timelineItem.innerHTML = `
      <div class="timeline-time">${visit.time}</div>
      <div class="timeline-content">
        <div class="timeline-title">${visit.title}</div>
      </div>
    `;
    timelineEl.appendChild(timelineItem);
  });
} 