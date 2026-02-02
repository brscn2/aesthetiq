// Aesthetiq Chrome Extension - Background Service Worker
// Handles context menus, authentication, and API communication

// ============== API Class (embedded) ==============
const DEFAULT_API_URL = 'http://localhost:3001/api';

class AesthetiqAPI {
  constructor() {
    this.token = null;
    this.apiUrl = DEFAULT_API_URL;
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const data = await chrome.storage.sync.get(['apiUrl', 'authToken']);
      if (data.apiUrl) {
        this.apiUrl = data.apiUrl;
      }
      if (data.authToken) {
        this.token = data.authToken;
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async checkAuth() {
    if (!this.token) {
      console.log('checkAuth: No token available');
      return false;
    }

    try {
      console.log('checkAuth: Verifying token with API...', this.apiUrl);
      const response = await fetch(`${this.apiUrl}/users/me`, {
        headers: this.getHeaders(),
      });
      console.log('checkAuth: API response status:', response.status);
      
      if (response.status === 401) {
        // Token expired - clear it
        console.log('checkAuth: Token expired, clearing...');
        this.token = null;
        await chrome.storage.sync.remove(['authToken']);
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  async addItem(data) {
    const response = await fetch(`${this.apiUrl}/wardrobe`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        imageUrl: data.imageUrl,
        category: data.category,
        subCategory: data.subCategory,
        brand: data.brand,
        colors: data.colors || ['#000000'],
        notes: data.notes,
        isFavorite: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to add item: ${response.status}`);
    }

    return response.json();
  }

  async addItemWithAI(imageUrl, sourceUrl, categoryOverride = null, itemName = null) {
    // First, analyze the clothing with AI
    try {
      console.log('Analyzing image with AI:', imageUrl);
      const analysisResponse = await fetch(`${this.apiUrl}/ai/analyze-clothing`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ imageUrl }),
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        console.log('AI analysis result:', analysis);
        
        // Create wardrobe item with AI-detected values
        // Use category override if provided, otherwise use AI detected category
        // Use itemName as brand if provided
        return this.addItem({
          imageUrl,
          category: categoryOverride || analysis.data?.category || 'TOP',
          subCategory: analysis.data?.subCategory,
          brand: itemName || analysis.data?.brand,
          colors: analysis.data?.colors || ['#000000'],
          notes: analysis.data?.styleNotes || `Added from: ${sourceUrl}`,
        });
      } else {
        console.warn('AI analysis failed with status:', analysisResponse.status);
      }
    } catch (e) {
      console.warn('AI analysis failed, using default values:', e);
    }
    
    // Fallback to manual add with category override or default
    return this.addItem({
      imageUrl,
      category: categoryOverride || 'TOP',
      brand: itemName,
      notes: `Added from: ${sourceUrl}`,
    });
  }

  async getRecentItems(limit = 5) {
    const response = await fetch(`${this.apiUrl}/wardrobe?limit=${limit}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recent items');
    }

    return response.json();
  }
}

// ============== Initialize API ==============
const api = new AesthetiqAPI();

// ============== Context Menu Setup ==============
chrome.runtime.onInstalled.addListener(() => {
  console.log('Aesthetiq extension installed, creating context menus...');
  
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create single context menu item for images
    chrome.contextMenus.create({
      id: 'add-to-wardrobe',
      title: 'Add to Aesthetiq Wardrobe',
      contexts: ['image'],
    });

    console.log('Context menus created successfully');
  });
});

// ============== Context Menu Click Handler ==============
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, info.srcUrl);
  
  const imageUrl = info.srcUrl;
  
  if (!imageUrl) {
    showNotification('Error', 'Could not get image URL');
    return;
  }

  // Check authentication - reload settings first
  await api.loadSettings();
  console.log('Token loaded:', api.token ? 'yes (length: ' + api.token.length + ')' : 'no');
  
  const isAuthenticated = await api.checkAuth();
  console.log('Is authenticated:', isAuthenticated);
  
  if (!isAuthenticated) {
    console.log('User not authenticated - token:', api.token ? 'exists but expired' : 'missing');
    
    // Get frontend URL and open auth page directly
    const settings = await chrome.storage.sync.get(['frontendUrl']);
    const frontendUrl = settings.frontendUrl || 'http://localhost:3000';
    
    // Open auth page in new tab
    chrome.tabs.create({ url: `${frontendUrl}/extension-auth` });
    
    showNotification('Login Required', 'Please connect the extension on the opened page.');
    return;
  }

  // Show loading notification
  showNotification('Adding Item', 'Analyzing with AI...');
  
  // Directly add with AI analysis
  try {
    const result = await api.addItemWithAI(imageUrl, tab.url);
    console.log('Item added successfully:', result);
    showNotification('Success!', 'Item added to your wardrobe');
  } catch (e) {
    console.error('Failed to add item:', e);
    showNotification('Error', e.message || 'Failed to add item');
  }
});

// ============== Message Handler ==============
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);
  
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });
  
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_AUTH_STATUS':
      await api.loadSettings();
      const isAuth = await api.checkAuth();
      console.log('GET_AUTH_STATUS - token exists:', !!api.token, 'isAuth:', isAuth);
      return { isAuthenticated: isAuth };

    case 'LOGIN':
      console.log('LOGIN message received, saving token...');
      await chrome.storage.sync.set({ 
        authToken: message.token,
        userEmail: message.userEmail || '',
        userName: message.userName || ''
      });
      api.setToken(message.token);
      console.log('Token saved successfully');
      return { success: true };

    case 'LOGOUT':
      await chrome.storage.sync.remove(['authToken', 'userEmail', 'userName']);
      api.clearToken();
      return { success: true };

    case 'ADD_ITEM':
      await api.loadSettings();
      return await api.addItem(message.data);

    case 'ADD_ITEM_WITH_AI':
      console.log('ADD_ITEM_WITH_AI received:', message);
      await api.loadSettings();
      try {
        const result = await api.addItemWithAI(message.imageUrl, message.sourceUrl, null, message.itemName);
        console.log('ADD_ITEM_WITH_AI result:', result);
        return result;
      } catch (e) {
        console.error('ADD_ITEM_WITH_AI error:', e);
        throw e;
      }

    case 'GET_CATEGORIES':
      return { categories: ['TOP', 'BOTTOM', 'SHOE', 'ACCESSORY'] };

    case 'GET_RECENT_ITEMS':
      await api.loadSettings();
      return await api.getRecentItems();

    case 'OPEN_WARDROBE':
      const settings = await chrome.storage.sync.get(['frontendUrl']);
      const frontendUrl = settings.frontendUrl || 'http://localhost:3000';
      chrome.tabs.create({ url: `${frontendUrl}/virtual-wardrobe` });
      return { success: true };

    case 'SETTINGS_UPDATED':
      await api.loadSettings();
      return { success: true };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// ============== External Message Handler (from web pages) ==============
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message.type);
  
  if (message.type === 'AUTH_CALLBACK') {
    handleAuthCallback(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

async function handleAuthCallback(message) {
  if (message.token) {
    await chrome.storage.sync.set({
      authToken: message.token,
      userEmail: message.userEmail,
      userName: message.userName,
    });
    api.setToken(message.token);
    console.log('Auth token saved from callback');
    return { success: true };
  }
  throw new Error('No token provided');
}

// ============== Notification Helper ==============
function showNotification(title, message) {
  // Try to show notification, gracefully handle missing icon
  try {
    chrome.notifications.create(
      'aesthetiq-' + Date.now(),
      {
        type: 'basic',
        title: title,
        message: message,
        iconUrl: 'https://via.placeholder.com/128/1a1a1a/ffffff?text=A'
      },
      () => {
        // Ignore any errors (like missing icon)
        if (chrome.runtime.lastError) {
          console.log('Notification note:', chrome.runtime.lastError.message);
        }
      }
    );
  } catch (e) {
    console.log('Notification error:', e);
  }
}

// ============== Startup ==============
chrome.runtime.onStartup.addListener(async () => {
  console.log('Aesthetiq extension starting up...');
  await api.loadSettings();
});

// Initial load
api.loadSettings().then(() => {
  console.log('Aesthetiq extension loaded');
});
