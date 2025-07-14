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
export const [sendGetPageInfo, getPageInfoStream, waitForGetPageInfo] = getMessage('GET_PAGE_INFO');
export const [sendCollectPerformanceData, collectPerformanceDataStream, waitForCollectPerformanceData] = getMessage('COLLECT_PERFORMANCE_DATA');
export const [sendInjectScript, injectScriptStream, waitForInjectScript] = getMessage('INJECT_SCRIPT');

// Plugin messages
export const [sendInitApmMonitoring, initApmMonitoringStream, waitForInitApmMonitoring] = getMessage('INIT_APM_MONITORING');
export const [sendStopApmMonitoring, stopApmMonitoringStream, waitForStopApmMonitoring] = getMessage('STOP_APM_MONITORING');
export const [sendUpdateApmSettings, updateApmSettingsStream, waitForUpdateApmSettings] = getMessage('UPDATE_APM_SETTINGS');
export const [sendStartApmMonitoring, startApmMonitoringStream, waitForStartApmMonitoring] = getMessage('START_APM_MONITORING');

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
    'GET_PAGE_INFO': () => sendGetPageInfo(payload),
    'COLLECT_PERFORMANCE_DATA': () => sendCollectPerformanceData(payload),
    'INJECT_SCRIPT': () => sendInjectScript(payload),
    'INIT_APM_MONITORING': () => sendInitApmMonitoring(payload),
    'STOP_APM_MONITORING': () => sendStopApmMonitoring(payload),
    'UPDATE_APM_SETTINGS': () => sendUpdateApmSettings(payload),
    'START_APM_MONITORING': () => sendStartApmMonitoring(payload),
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

// Convenience functions to maintain backward compatibility
export const getActiveTab = () => sendGetActiveTab();
export const getRumSessionData = () => sendGetRumSessionData();
export const getApmTraces = (filter = 'all') => sendGetApmTraces({ filter });
export const clearApmTraces = () => sendClearApmTraces();
export const getPageInfo = () => sendGetPageInfo();
export const collectPerformanceData = () => sendCollectPerformanceData();
export const injectScript = (script) => sendInjectScript({ script });

// Streams for background script to listen to
export const messageStreams = {
  getActiveTab: getActiveTabStream,
  getRumSessionData: getRumSessionDataStream,
  getApmTraces: getApmTracesStream,
  clearApmTraces: clearApmTracesStream,
  getPageInfo: getPageInfoStream,
  collectPerformanceData: collectPerformanceDataStream,
  injectScript: injectScriptStream,
  initApmMonitoring: initApmMonitoringStream,
  stopApmMonitoring: stopApmMonitoringStream,
  updateApmSettings: updateApmSettingsStream,
  startApmMonitoring: startApmMonitoringStream,
  notificationButtonClicked: notificationButtonClickedStream
};