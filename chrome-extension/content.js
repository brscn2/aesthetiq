// Aesthetiq Chrome Extension - Content Script
// Handles UI overlay and user interactions on web pages

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__aesthetiqInjected) return;
  window.__aesthetiqInjected = true;

  // State
  let currentToast = null;

  // ============== Auth token is captured via the extension-auth page ==============
  // When users click "Login" in the popup, they go to /extension-auth which sends the token via postMessage
  
  console.log('Aesthetiq Extension: Content script loaded on', window.location.href);

  // Listen for auth token from extension-auth page
  window.addEventListener('message', async (event) => {
    console.log('Aesthetiq Extension: Received message event', event.data?.type);
    
    if (event.data && event.data.type === 'AESTHETIQ_AUTH_TOKEN' && event.data.token) {
      console.log('Aesthetiq Extension: Received auth token from page!');
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'LOGIN',
          token: event.data.token,
          userEmail: event.data.userEmail || '',
          userName: event.data.userName || '',
        });
        console.log('Aesthetiq Extension: Token saved, response:', response);
        showToast('Extension authenticated! ✓', 'success');
      } catch (e) {
        console.error('Aesthetiq Extension: Failed to save token:', e);
      }
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'SHOW_LOADING':
        showToast(message.message, 'loading');
        break;
      case 'SHOW_SUCCESS':
        hideToast();
        showToast(message.message, 'success');
        break;
      case 'SHOW_ERROR':
        hideToast();
        showToast(message.message, 'error');
        break;
    }
    sendResponse({ received: true });
  });



  // Toast Notifications
  function showToast(message, type = 'info') {
    hideToast();

    const toast = document.createElement('div');
    toast.className = `aesthetiq-toast aesthetiq-toast-${type}`;
    
    let icon = '';
    switch (type) {
      case 'success':
        icon = '✓';
        break;
      case 'error':
        icon = '✕';
        break;
      case 'loading':
        icon = '<span class="aesthetiq-spinner"></span>';
        break;
      default:
        icon = 'ℹ';
    }

    toast.innerHTML = `
      <span class="aesthetiq-toast-icon">${icon}</span>
      <span class="aesthetiq-toast-message">${escapeHtml(message)}</span>
    `;

    document.body.appendChild(toast);
    currentToast = toast;

    // Auto-hide after 3 seconds (except for loading)
    if (type !== 'loading') {
      setTimeout(hideToast, 3000);
    }
  }

  function hideToast() {
    if (currentToast) {
      currentToast.classList.add('aesthetiq-fade-out');
      setTimeout(() => {
        if (currentToast) {
          currentToast.remove();
          currentToast = null;
        }
      }, 200);
    }
  }

  // Utility: Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Add keyboard listener for Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideToast();
    }
  });

})();
