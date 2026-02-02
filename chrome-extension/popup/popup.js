// Aesthetiq Chrome Extension - Popup Script

// DOM Elements
const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const loadingSection = document.getElementById('loadingSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const openWardrobeBtn = document.getElementById('openWardrobeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const userInfo = document.getElementById('userInfo');
const recentItems = document.getElementById('recentItems');

// State
let isAuthenticated = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
});

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
openWardrobeBtn.addEventListener('click', handleOpenWardrobe);
settingsBtn.addEventListener('click', handleOpenSettings);

// Check authentication status
async function checkAuthStatus() {
  showSection('loading');
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    isAuthenticated = response.isAuthenticated;
    
    if (isAuthenticated) {
      await loadUserData();
      showSection('main');
    } else {
      showSection('auth');
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    showSection('auth');
  }
}

// Load user data
async function loadUserData() {
  try {
    // Get user info from storage
    const data = await chrome.storage.sync.get(['userEmail', 'userName']);
    
    if (data.userEmail) {
      const emailSpan = userInfo.querySelector('.user-email');
      emailSpan.textContent = data.userEmail;
    }
    
    // Load recent items
    await loadRecentItems();
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

// Load recent items
async function loadRecentItems() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RECENT_ITEMS' });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    const items = Array.isArray(response) ? response : (response.items || []);
    
    if (items.length === 0) {
      recentItems.innerHTML = '<p class="empty-state">No items added yet</p>';
      return;
    }
    
    recentItems.innerHTML = items.slice(0, 5).map(item => `
      <div class="recent-item">
        <img src="${escapeHtml(item.processedImageUrl || item.imageUrl)}" alt="${item.category}" class="recent-item-image" />
        <div class="recent-item-info">
          <div class="recent-item-category">${formatCategory(item.category)}</div>
          <div class="recent-item-date">${formatDate(item.createdAt)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load recent items:', error);
    recentItems.innerHTML = '<p class="empty-state">Failed to load items</p>';
  }
}

// Handle login
async function handleLogin() {
  // Get the frontend URL from settings
  const settings = await chrome.storage.sync.get(['frontendUrl']);
  const frontendUrl = settings.frontendUrl || 'http://localhost:3000';
  
  // Open the extension-auth page which will capture and send the token
  chrome.tabs.create({
    url: `${frontendUrl}/extension-auth`,
  });
  
  // Close popup
  window.close();
}

// Handle logout
async function handleLogout() {
  try {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    await chrome.storage.sync.remove(['userEmail', 'userName', 'authToken']);
    isAuthenticated = false;
    showSection('auth');
  } catch (error) {
    console.error('Failed to logout:', error);
  }
}

// Handle open wardrobe
async function handleOpenWardrobe() {
  await chrome.runtime.sendMessage({ type: 'OPEN_WARDROBE' });
  window.close();
}

// Handle open settings
function handleOpenSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

// Show specific section
function showSection(section) {
  authSection.classList.add('hidden');
  mainSection.classList.add('hidden');
  loadingSection.classList.add('hidden');
  
  switch (section) {
    case 'auth':
      authSection.classList.remove('hidden');
      break;
    case 'main':
      mainSection.classList.remove('hidden');
      break;
    case 'loading':
      loadingSection.classList.remove('hidden');
      break;
  }
}

// Utility functions
function formatCategory(category) {
  const categories = {
    TOP: 'Top',
    BOTTOM: 'Bottom',
    SHOE: 'Shoe',
    ACCESSORY: 'Accessory',
  };
  return categories[category] || category;
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
