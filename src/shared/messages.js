/**
 * Message handlers using @extend-chrome/messages
 * Creates typed message functions for Chrome extension communication
 */

import { getMessage } from '@extend-chrome/messages';

// Core extension messages
export const [sendGetActiveTab, getActiveTabStream, waitForGetActiveTab] = getMessage('GET_ACTIVE_TAB');
export const [sendGetRumSessionData, getRumSessionDataStream, waitForGetRumSessionData] = getMessage('GET_RUM_SESSION_DATA');
export const [sendGetApmTraces, getApmTracesStream, waitForGetApmTraces] = getMessage('GET_APM_TRACES');
export const [sendClearApmTraces, clearApmTracesStream, waitForClearApmTraces] = getMessage('CLEAR_APM_TRACES');

// Content script messages
export const [sendInjectScript, injectScriptStream, waitForInjectScript] = getMessage('INJECT_SCRIPT');

// Notification messages
export const [sendNotificationButtonClicked, notificationButtonClickedStream, waitForNotificationButtonClicked] = getMessage('NOTIFICATION_BUTTON_CLICKED');

/**
 * Generic sendMessage function for backward compatibility
 * Maps message types to their corresponding @extend-chrome/messages functions
 */
export async function sendMessage(type, payload = {}, tabId = null) {
  const messageFunctions = {
    'GET_ACTIVE_TAB': () => sendGetActiveTab(payload),
    'GET_RUM_SESSION_DATA': () => sendGetRumSessionData(payload),
    'GET_APM_TRACES': () => sendGetApmTraces(payload),
    'CLEAR_APM_TRACES': () => sendClearApmTraces(payload),
    'INJECT_SCRIPT': () => sendInjectScript(payload),
    'NOTIFICATION_BUTTON_CLICKED': () => sendNotificationButtonClicked(payload)
  };

  const messageFunction = messageFunctions[type];
  if (!messageFunction) {
    throw new Error(`Unknown message type: ${type}`);
  }

  // For content script messages (with tabId), we need to handle differently
  if (tabId) {
    // Use chrome.tabs.sendMessage directly for content script messages
    return await chrome.tabs.sendMessage(tabId, { type, ...payload });
  }

  return await messageFunction();
}
