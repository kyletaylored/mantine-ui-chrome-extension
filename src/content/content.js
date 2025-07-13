// Content script for Datadog Sales Engineering Toolkit
// This script runs in the context of web pages

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleContentMessage(request, sender, sendResponse);
  return true;
});

async function handleContentMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'INJECT_DATADOG_SCRIPT': {
        injectDatadogScript(request.script);
        sendResponse({ success: true });
        break;
      }
        
      case 'GET_PAGE_INFO': {
        const pageInfo = getPageInfo();
        sendResponse({ success: true, data: pageInfo });
        break;
      }
        
      case 'HIGHLIGHT_ELEMENTS': {
        highlightElements(request.selector);
        sendResponse({ success: true });
        break;
      }
        
      case 'COLLECT_PERFORMANCE_DATA': {
        const perfData = collectPerformanceData();
        sendResponse({ success: true, data: perfData });
        break;
      }
        
      case 'GET_RUM_SESSION_DATA': {
        const rumData = getRumSessionData();
        sendResponse(rumData);
        break;
      }
        
      case 'SHOW_IN_PAGE_NOTIFICATION': {
        showInPageNotification(request.payload);
        sendResponse({ success: true });
        break;
      }
        
      default:
        sendResponse({ success: false, error: 'Unknown content message type' });
    }
  } catch (error) {
    console.error('Content script error:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Inject Datadog scripts into the page
function injectDatadogScript(script) {
  const scriptElement = document.createElement('script');
  scriptElement.textContent = script;
  scriptElement.setAttribute('data-injected-by', 'datadog-toolkit');
  document.head.appendChild(scriptElement);
}

// Get page information
function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    hasDatadog: {
      rum: typeof window.DD_RUM !== 'undefined',
      logs: typeof window.DD_LOGS !== 'undefined'
    }
  };
}

// Highlight elements on page
function highlightElements(selector) {
  // Remove existing highlights
  const existingHighlights = document.querySelectorAll('[data-datadog-highlight]');
  existingHighlights.forEach(el => {
    el.removeAttribute('data-datadog-highlight');
    el.style.outline = '';
  });
  
  // Add new highlights
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.setAttribute('data-datadog-highlight', 'true');
    el.style.outline = '2px solid #632CA6';
  });
  
  // Auto-remove highlights after 5 seconds
  setTimeout(() => {
    elements.forEach(el => {
      el.removeAttribute('data-datadog-highlight');
      el.style.outline = '';
    });
  }, 5000);
}

// Collect performance data
function collectPerformanceData() {
  const performance = window.performance;
  const navigation = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource');
  
  return {
    navigation: {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      totalTime: navigation.loadEventEnd - navigation.fetchStart,
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      dom: navigation.domComplete - navigation.domContentLoadedEventStart
    },
    resources: resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize || 0,
      type: resource.initiatorType || 'unknown'
    })),
    memory: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null,
    timing: performance.now()
  };
}

// Get RUM session data
function getRumSessionData() {
  try {
    const DD_RUM = window.DD_RUM;
    
    if (!DD_RUM) {
      return {
        isActive: false,
        error: 'RUM not initialized on this page'
      };
    }
    
    // Get session and user information
    const sessionData = {
      isActive: true,
      sessionId: DD_RUM.getSessionId?.() || undefined,
      userId: DD_RUM.getUser?.()?.id || undefined,
      userInfo: DD_RUM.getUser?.() || undefined,
      sessionReplayLink: undefined
    };
    
    // Try to get session replay link
    try {
      if (DD_RUM.getSessionReplayLink) {
        sessionData.sessionReplayLink = DD_RUM.getSessionReplayLink();
      }
    } catch (error) {
      console.warn('Failed to get session replay link:', error);
    }
    
    return sessionData;
  } catch (error) {
    return {
      isActive: false,
      error: error instanceof Error ? error.message : 'Failed to get RUM session data'
    };
  }
}

// Show in-page notification
function showInPageNotification(config) {
  // Remove existing notification if present
  const existingNotification = document.getElementById(config.id);
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification container
  const notification = document.createElement('div');
  notification.id = config.id;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    max-width: 400px;
    min-width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border-left: 4px solid ${getNotificationColor(config.type)};
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    transition: all 0.3s ease;
    animation: slideInFromRight 0.3s ease-out;
    border: 1px solid #e1e5e9;
  `;

  // Add animation keyframes
  if (!document.getElementById('datadog-notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'datadog-notification-styles';
    styles.textContent = `
      @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutToRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(styles);
  }

  // Create notification content
  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${getNotificationIcon(config.type)}
        <strong style="color: #1a202c; font-weight: 600;">${config.title}</strong>
      </div>
      ${config.dismissible ? `
        <button id="dismiss-btn" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #9aa5b1;
          padding: 0;
          line-height: 1;
        ">×</button>
      ` : ''}
    </div>
    <div style="color: #4a5568; margin-bottom: ${config.actionButton ? '12px' : '0'};">
      ${config.message}
    </div>
    ${config.actionButton ? `
      <button id="action-btn" style="
        background: #632CA6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      ">${config.actionButton.text}</button>
    ` : ''}
  `;

  // Add event listeners
  if (config.dismissible) {
    const dismissBtn = notification.querySelector('#dismiss-btn');
    dismissBtn?.addEventListener('click', () => {
      notification.style.animation = 'slideOutToRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    });
  }

  if (config.actionButton) {
    const actionBtn = notification.querySelector('#action-btn');
    actionBtn?.addEventListener('click', () => {
      if (config.actionButton.action === 'view-datadog') {
        // This will be handled by the notification manager
        chrome.runtime.sendMessage({
          type: 'NOTIFICATION_ACTION',
          payload: { action: config.actionButton.action, eventId: config.id }
        });
      }
      notification.style.animation = 'slideOutToRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    });
  }

  // Append to document
  document.body.appendChild(notification);

  // Auto-dismiss if duration is set
  if (config.duration && config.duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
      }
    }, config.duration);
  }

  // Play sound if enabled
  if (config.sound) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }
}

// Get notification color based on type
function getNotificationColor(type) {
  switch (type) {
    case 'error': return '#e53e3e';
    case 'warning': return '#ffd700';
    case 'success': return '#38a169';
    case 'info':
    default: return '#3182ce';
  }
}

// Get notification icon based on type
function getNotificationIcon(type) {
  switch (type) {
    case 'error': return '🚨';
    case 'warning': return '⚠️';
    case 'success': return '✅';
    case 'info':
    default: return 'ℹ️';
  }
}

// Initialize content script
console.log('Datadog Sales Engineering Toolkit content script loaded');

// Notify background script that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href
});