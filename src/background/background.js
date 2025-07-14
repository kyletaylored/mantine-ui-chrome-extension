import { getCredentials, setCredentials, isPluginEnabled, getPlugins, addPlugin, getStorage, getSettings } from '@/shared/storage';
import { DATADOG_SITES } from '@/shared/values';
import { createLogger } from '@/shared/logger';
import { pluginLoader } from '@/shared/plugin-loader';
import { contentScriptManager } from '@/shared/content-script-manager';
import { messageStreams } from '@/shared/messages';
import { validateDatadogCredentials } from '@/shared/credential-validator';

const logger = createLogger('Background');

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Datadog Sales Engineering Toolkit installed');
  logger.debug('LIFECYCLE', 'EXTENSION_INSTALLED', {});
  
  // Initialize storage with default values
  await getStorage();
  
  // Initialize plugin system
  await initializePluginSystem();
  
  logger.debug('LIFECYCLE', 'EXTENSION_READY', {});
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Datadog Sales Engineering Toolkit started');
  logger.debug('LIFECYCLE', 'EXTENSION_STARTUP', {});
  
  // Auto-validate credentials if enabled
  const credentials = await getCredentials();
  const settings = await getSettings();
  if (settings.autoValidateCredentials && credentials.apiKey) {
    const validated = await validateDatadogCredentials(credentials);
    if (validated) {
      await setCredentials(validated);
    }
  }
});

// Set up message stream handlers using @extend-chrome/messages
logger.info('Setting up Chrome message handlers');


// Active tab
messageStreams.getActiveTab.subscribe(async () => {
  logger.debug('PROCESSING', 'GET_ACTIVE_TAB', {});
  const tab = await getActiveTab();
  return { success: true, data: tab };
});

// RUM session data
messageStreams.getRumSessionData.subscribe(async () => {
  logger.debug('PROCESSING', 'GET_RUM_SESSION_DATA', {});
  const tab = await getActiveTab();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Extract RUM session data from page
      return {
        sessionId: window.DD_RUM?.getSessionId?.() || null,
        isActive: !!window.DD_RUM,
        url: window.location.href
      };
    }
  });
  return { success: true, data: results[0]?.result };
});

// APM traces
messageStreams.getApmTraces.subscribe(async ([payload]) => {
  logger.debug('PROCESSING', 'GET_APM_TRACES', { filter: payload.filter });
  // Return empty traces for now - simplified for JavaScript conversion
  return { success: true, traces: [] };
});

messageStreams.clearApmTraces.subscribe(async () => {
  logger.debug('PROCESSING', 'CLEAR_APM_TRACES', {});
  // Clear traces placeholder - simplified for JavaScript conversion
  return { success: true };
});

// Content script messages
messageStreams.getPageInfo.subscribe(async ([payload]) => {
  logger.debug('PROCESSING', 'GET_PAGE_INFO', {});
  const tab = await getActiveTab();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        hasDatadog: {
          rum: !!window.DD_RUM,
          logs: !!window.DD_LOGS,
          apm: !!window.DD_TRACE
        },
        performance: performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null
      };
    }
  });
  return { success: true, data: results[0]?.result };
});

messageStreams.collectPerformanceData.subscribe(async ([payload]) => {
  logger.debug('PROCESSING', 'COLLECT_PERFORMANCE_DATA', {});
  const tab = await getActiveTab();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        timing: performance.timing || null,
        navigation: performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null,
        resources: performance.getEntriesByType ? performance.getEntriesByType('resource') : []
      };
    }
  });
  return { success: true, data: results[0]?.result };
});

messageStreams.injectScript.subscribe(async ([payload]) => {
  logger.debug('PROCESSING', 'INJECT_SCRIPT', { scriptLength: payload.script.length });
  const tab = await getActiveTab();
  await injectScript(tab.id, payload.script);
  return { success: true };
});

// Notification events
messageStreams.notificationButtonClicked.subscribe(async ([payload]) => {
  logger.debug('PROCESSING', 'NOTIFICATION_BUTTON_CLICKED', payload);
  // Handle notification button actions
  return { success: true };
});


logger.info('Chrome message handler configured');


// Inject script into active tab
async function injectScript(tabId, script) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (code) => {
      const scriptElement = document.createElement('script');
      scriptElement.textContent = code;
      document.documentElement.appendChild(scriptElement);
      scriptElement.remove();
    },
    args: [script]
  });
}

// Get active tab
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Handle plugin messages
async function handlePluginMessage(pluginId, action, payload) {
  logger.debug('PLUGIN_MESSAGE', pluginId, { action, payload });
  
  switch (action) {
    case 'INJECT_RUM':
      await injectRumScript(payload);
      break;
      
    case 'INJECT_APM':
      await injectApmScript(payload);
      break;
      
    case 'SEND_EVENT':
      await sendDatadogEvent(payload);
      break;
      
    default:
      logger.warn('Unknown plugin action:', action);
  }
}

// Plugin-specific functions
async function injectRumScript(config) {
  const tab = await getActiveTab();
  const rumScript = `
    (function() {
      if (window.DD_RUM) {
        console.log('Datadog RUM already initialized');
        return;
      }
      
      // Initialize RUM with config
      window.DD_RUM?.init?.(${JSON.stringify(config)});
      console.log('Datadog RUM initialized with config:', ${JSON.stringify(config)});
    })();
  `;
  
  await injectScript(tab.id, rumScript);
}

async function injectApmScript(config) {
  const tab = await getActiveTab();
  const apmScript = `
    (function() {
      // APM tracing injection code
      console.log('APM tracing injected with config:', ${JSON.stringify(config)});
    })();
  `;
  
  await injectScript(tab.id, apmScript);
}

async function sendDatadogEvent(eventData) {
  const credentials = await getCredentials();
  if (!credentials.isValid) {
    throw new Error('Invalid credentials');
  }
  
  const site = DATADOG_SITES.find(s => s.region === credentials.site);
  if (!site) {
    throw new Error('Invalid Datadog site');
  }
  
  const response = await fetch(`${site.apiUrl}/api/v1/events`, {
    method: 'POST',
    headers: {
      'DD-API-KEY': credentials.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send event: ${response.status}`);
  }
  
  return await response.json();
}

// Initialize plugin system
async function initializePluginSystem() {
  try {
    logger.info('Initializing plugin system...');
    
    // Initialize plugin loader
    await pluginLoader.initialize();
    
    // Get all loaded plugins
    const plugins = pluginLoader.getPlugins();
    logger.info(`Found ${plugins.length} plugins`);
    
    // Initialize core plugins first
    for (const plugin of plugins) {
      if (plugin.manifest.core) {
        try {
          logger.info(`Initializing core plugin: ${plugin.manifest.name}`);
          await pluginLoader.initializePlugin(plugin.manifest.id);
          
          // Ensure core plugin is in storage and enabled
          const existingPlugin = await getPlugins().then(p => p.find(p => p.id === plugin.manifest.id));
          if (!existingPlugin) {
            // Add new plugin to storage
            await addPlugin({
              id: plugin.manifest.id,
              name: plugin.manifest.name,
              description: plugin.manifest.description,
              version: plugin.manifest.version,
              enabled: true,
              isCore: true,
              icon: plugin.manifest.icon,
              component: plugin.renderComponent,
              settings: {},
              permissions: plugin.manifest.permissions || [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        } catch (error) {
          logger.error(`Failed to initialize core plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
    
    // Initialize enabled optional plugins
    for (const plugin of plugins) {
      if (!plugin.manifest.core) {
        try {
          const enabled = await isPluginEnabled(plugin.manifest.id);
          if (enabled) {
            logger.info(`Initializing optional plugin: ${plugin.manifest.name}`);
            await pluginLoader.initializePlugin(plugin.manifest.id);
          }
        } catch (error) {
          logger.error(`Failed to initialize optional plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
    
    // Initialize content script manager
    await contentScriptManager.initialize();
    
    logger.info('Plugin system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize plugin system:', error);
  }
}