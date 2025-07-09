import { RumExtractionSettings, RumSessionData, RumExtractionResult } from './types';

export const RUM_EXTRACTION_PLUGIN_CONFIG = {
  id: 'rum-extraction',
  name: 'RUM Session Extraction',
  description: 'Extract and display Real User Monitoring (RUM) session data from active pages',
  version: '1.0.0',
  icon: '👤',
  permissions: ['activeTab'],
};

export const DEFAULT_RUM_EXTRACTION_SETTINGS: RumExtractionSettings = {
  autoRefresh: true,
  showUserInfo: true,
  showSessionReplay: true,
};

/**
 * Extract RUM session data from the current page
 */
export const extractRumSessionData = (): RumSessionData => {
  try {
    const DD_RUM = (window as any).DD_RUM;
    
    if (!DD_RUM) {
      return {
        isActive: false,
        error: 'RUM not initialized on this page',
        lastUpdated: Date.now(),
        url: window.location.href
      };
    }
    
    // Get session and user information
    const sessionData: RumSessionData = {
      isActive: true,
      sessionId: DD_RUM.getSessionId?.() || undefined,
      userId: DD_RUM.getUser?.()?.id || undefined,
      userInfo: DD_RUM.getUser?.() || undefined,
      sessionReplayLink: undefined,
      lastUpdated: Date.now(),
      url: window.location.href
    };
    
    // Try to get session replay link
    try {
      if (DD_RUM.getSessionReplayLink) {
        sessionData.sessionReplayLink = DD_RUM.getSessionReplayLink();
      }
    } catch (error) {
      console.warn('Failed to get session replay link:', error);
    }

    // Try to get application ID from RUM configuration
    try {
      if ((window as any).DD_RUM && (window as any).DD_RUM._dd) {
        sessionData.applicationId = (window as any).DD_RUM._dd.configuration?.applicationId;
      }
    } catch (error) {
      // Silently ignore - application ID is optional
    }
    
    return sessionData;
  } catch (error) {
    return {
      isActive: false,
      error: error instanceof Error ? error.message : 'Failed to get RUM session data',
      lastUpdated: Date.now(),
      url: window.location.href
    };
  }
};

/**
 * Check if RUM is active on the current page
 */
export const isRumActive = (): boolean => {
  return typeof (window as any).DD_RUM !== 'undefined';
};

/**
 * Get RUM global object safely
 */
export const getRumGlobal = (): any | null => {
  return (window as any).DD_RUM || null;
};

/**
 * Format session data for display
 */
export const formatSessionData = (data: RumSessionData): string => {
  if (!data.isActive) {
    return 'No active RUM session';
  }

  const parts = [];
  if (data.sessionId) parts.push(`Session: ${data.sessionId}`);
  if (data.userId) parts.push(`User: ${data.userId}`);
  if (data.applicationId) parts.push(`App: ${data.applicationId}`);
  
  return parts.join(' | ') || 'Active RUM session';
};

/**
 * Validate RUM session data
 */
export const validateSessionData = (data: RumSessionData): RumExtractionResult => {
  if (!data.isActive) {
    return {
      success: false,
      error: data.error || 'RUM is not active on this page'
    };
  }

  if (!data.sessionId && !data.userId) {
    return {
      success: false,
      error: 'No session or user data available'
    };
  }

  return {
    success: true,
    data
  };
}; 