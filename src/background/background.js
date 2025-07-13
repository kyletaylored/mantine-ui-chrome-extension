import { getCredentials, setCredentials, isPluginEnabled, getPlugins, addPlugin, getStorage, getSettings } from '@/shared/storage';
import { DATADOG_SITES } from '@/types';
import { getNetworkMonitor, stopNetworkMonitor } from '@/plugins/apm-tracing/network-monitor';
import { DEFAULT_APM_SETTINGS } from '@/plugins/apm-tracing/config';
import { createLogger } from '@/shared/logger';
import { pluginLoader } from '@/shared/plugin-loader';
import { contentScriptManager } from '@/shared/content-script-manager';

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

// Standard Chrome message handling with debug logging
logger.info('Setting up Chrome message handler');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('RECEIVED', request.type || 'UNKNOWN', { 
    request: { ...request, credentials: request.credentials ? '***' : undefined }, 
    sender: sender.id,
    tab: sender.tab?.id 
  });
  
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.type) {
      case 'VALIDATE_CREDENTIALS': {
        logger.debug('PROCESSING', 'VALIDATE_CREDENTIALS', 'Starting validation...');
        const validated = await validateDatadogCredentials(request.credentials);
        const response = { success: true, isValid: !!validated };
        logger.debug('COMPLETED', 'VALIDATE_CREDENTIALS', response);
        sendResponse(response);
        break;
      }
        
      case 'INJECT_SCRIPT':
        logger.debug('PROCESSING', 'INJECT_SCRIPT', { tabId: request.tabId, scriptLength: request.script.length });
        await injectScript(request.tabId, request.script);
        sendResponse({ success: true });
        break;
        
      case 'GET_ACTIVE_TAB': {
        logger.debug('PROCESSING', 'GET_ACTIVE_TAB', {});
        const tab = await getActiveTab();
        sendResponse({ success: true, data: tab });
        break;
      }
      
      case 'PLUGIN_MESSAGE': {
        logger.debug('PROCESSING', 'PLUGIN_MESSAGE', { pluginId: request.pluginId, action: request.action });
        await handlePluginMessage(request.pluginId, request.action, request.payload);
        sendResponse({ success: true });
        break;
      }
      
      case 'INIT_APM_MONITORING':
      case 'START_APM_MONITORING': {
        logger.debug('PROCESSING', request.type, { settings: request });
        const networkMonitor = getNetworkMonitor();
        await networkMonitor.start(request);
        sendResponse({ success: true });
        break;
      }
      
      case 'STOP_APM_MONITORING': {
        logger.debug('PROCESSING', 'STOP_APM_MONITORING', {});
        await stopNetworkMonitor();
        sendResponse({ success: true });
        break;
      }
      
      case 'UPDATE_APM_SETTINGS': {
        logger.debug('PROCESSING', 'UPDATE_APM_SETTINGS', { settings: request });
        // Update APM settings logic here
        sendResponse({ success: true });
        break;
      }
      
      case 'GET_APM_TRACES': {
        logger.debug('PROCESSING', 'GET_APM_TRACES', { filter: request.filter });
        const networkMonitor = getNetworkMonitor();
        const traces = await networkMonitor.getTraces(request.filter);
        sendResponse({ success: true, data: traces });
        break;
      }
      
      case 'CLEAR_APM_TRACES': {
        logger.debug('PROCESSING', 'CLEAR_APM_TRACES', {});
        const networkMonitor = getNetworkMonitor();
        await networkMonitor.clearTraces();
        sendResponse({ success: true });
        break;
      }
      
      case 'GET_RUM_SESSION_DATA': {
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
        sendResponse({ success: true, data: results[0]?.result });
        break;
      }
      
      case 'GET_PAGE_INFO': {
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
        sendResponse({ success: true, data: results[0]?.result });
        break;
      }
      
      case 'COLLECT_PERFORMANCE_DATA': {
        logger.debug('PROCESSING', 'COLLECT_PERFORMANCE_DATA', {});
        const tab = await getActiveTab();
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const perfData = {
              navigation: performance.getEntriesByType('navigation')[0],
              resources: performance.getEntriesByType('resource'),
              measures: performance.getEntriesByType('measure'),
              marks: performance.getEntriesByType('mark')
            };
            return perfData;
          }
        });
        sendResponse({ success: true, data: results[0]?.result });
        break;
      }
      
      default:
        logger.warn('Unknown message type:', request.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    logger.error('Background script error', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

logger.info('Chrome message handler configured');

// Validate Datadog credentials by auto-discovering the correct region
export async function validateDatadogCredentials(raw) {
  logger.info('Auto-discovering Datadog region for credentials...');

  for (const site of DATADOG_SITES) {
    try {
      logger.info(`Testing credentials for ${site.name} (${site.region})...`);

      const response = await fetch(`${site.apiUrl}/api/v2/validate_keys`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': raw.apiKey,
          'DD-APPLICATION-KEY': raw.appKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.info(`${site.name} returned HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      if (json?.status === 'ok') {
        const validated = {
          ...raw,
          site: site.region,
          isValid: true,
          lastValidatedAt: Date.now(),
        };

        await setCredentials(validated);

        logger.info(`✓ Credentials validated for ${site.name}`);
        return validated;
      } else {
        logger.info(`${site.name} validation failed:`, json);
      }
    } catch (err) {
      logger.info(`Validation error for ${site.name}:`, err);
    }
  }

  logger.info('✗ All Datadog regions rejected credentials.');
  return null;
}

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