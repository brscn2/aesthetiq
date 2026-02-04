// Aesthetiq Chrome Extension - Options Page Script

// Default settings
const defaultSettings = {
  apiUrl: 'http://localhost:3001/api',
  frontendUrl: 'http://localhost:3000',
  defaultCategory: '',
  useAIByDefault: false,
  showNotifications: true,
  theme: 'system',
};

// DOM Elements
const apiUrlInput = document.getElementById('apiUrl');
const frontendUrlInput = document.getElementById('frontendUrl');
const defaultCategorySelect = document.getElementById('defaultCategory');
const useAIByDefaultCheckbox = document.getElementById('useAIByDefault');
const showNotificationsCheckbox = document.getElementById('showNotifications');
const authTokenInput = document.getElementById('authToken');
const authStatus = document.getElementById('authStatus');
const testConnectionBtn = document.getElementById('testConnection');
const connectionStatus = document.getElementById('connectionStatus');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const openWardrobeLink = document.getElementById('openWardrobeLink');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const themeSelect = document.getElementById('themeSelect');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeTheme();
  await loadSettings();
  await checkAuthStatus();
});

// Event Listeners
testConnectionBtn.addEventListener('click', testConnection);
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);
openWardrobeLink.addEventListener('click', openWardrobe);
themeSelect.addEventListener('change', handleThemeChange);

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.sync.get(Object.keys(defaultSettings).concat(['authToken']));
  
  apiUrlInput.value = data.apiUrl || defaultSettings.apiUrl;
  frontendUrlInput.value = data.frontendUrl || defaultSettings.frontendUrl;
  defaultCategorySelect.value = data.defaultCategory || defaultSettings.defaultCategory;
  useAIByDefaultCheckbox.checked = data.useAIByDefault ?? defaultSettings.useAIByDefault;
  showNotificationsCheckbox.checked = data.showNotifications ?? defaultSettings.showNotifications;
  themeSelect.value = data.theme || defaultSettings.theme;
  
  if (data.authToken) {
    authTokenInput.value = data.authToken;
  }
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    apiUrl: apiUrlInput.value.trim() || defaultSettings.apiUrl,
    frontendUrl: frontendUrlInput.value.trim() || defaultSettings.frontendUrl,
    defaultCategory: defaultCategorySelect.value,
    useAIByDefault: useAIByDefaultCheckbox.checked,
    showNotifications: showNotificationsCheckbox.checked,
    authToken: authTokenInput.value.trim(),
  };
  
  try {
    // Save sync settings
    const syncData = {
      apiUrl: apiUrlInput.value || defaultSettings.apiUrl,
      frontendUrl: frontendUrlInput.value || defaultSettings.frontendUrl,
      defaultCategory: defaultCategorySelect.value || defaultSettings.defaultCategory,
      useAIByDefault: useAIByDefaultCheckbox.checked,
      showNotifications: showNotificationsCheckbox.checked,
    };
    await chrome.storage.sync.set(syncData);
    
    // Save theme to local storage
    const localData = {
      theme: themeSelect.value || defaultSettings.theme,
    };
    await chrome.storage.local.set(localData);
    
    // Notify background script of settings change
    await chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: syncData });
    
    showToast('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  try {
    await chrome.storage.sync.set(defaultSettings);
    await loadSettings();
    showToast('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showToast('Failed to reset settings', 'error');
  }
}

// Test connection to backend
async function testConnection() {
  const apiUrl = apiUrlInput.value.trim() || defaultSettings.apiUrl;
  
  connectionStatus.textContent = 'Testing...';
  connectionStatus.className = 'status-badge loading';
  testConnectionBtn.disabled = true;
  
  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (response.ok) {
      connectionStatus.textContent = '✓ Connected';
      connectionStatus.className = 'status-badge success';
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    connectionStatus.textContent = '✕ Failed';
    connectionStatus.className = 'status-badge error';
  } finally {
    testConnectionBtn.disabled = false;
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    
    if (response.isAuthenticated) {
      authStatus.innerHTML = '<span class="auth-icon">✓</span><span>You are logged in</span>';
      authStatus.className = 'auth-status authenticated';
    } else {
      authStatus.innerHTML = '<span class="auth-icon">⚠</span><span>Not logged in</span>';
      authStatus.className = 'auth-status not-authenticated';
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    authStatus.innerHTML = '<span class="auth-icon">❌</span><span>Error checking status</span>';
  }
}

// Open wardrobe
async function openWardrobe(e) {
  e.preventDefault();
  await chrome.runtime.sendMessage({ type: 'OPEN_WARDROBE' });
}

// Show toast notification
function showToast(message, type = 'info') {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3000);
}

// Theme Management
function initializeTheme() {
  chrome.storage.local.get(['theme'], (result) => {
    const theme = result.theme || 'system';
    applyTheme(theme);
  });
}

function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    // System theme
    html.removeAttribute('data-theme');
  }
}

function handleThemeChange() {
  const newTheme = themeSelect.value;
  chrome.storage.local.set({ theme: newTheme }, () => {
    applyTheme(newTheme);
  });
}

