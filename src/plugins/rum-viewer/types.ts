export interface RumSessionData {
  sessionId?: string;
  userId?: string;
  userInfo?: any;
  sessionReplayLink?: string;
  isActive: boolean;
  error?: string;
  lastUpdated?: number;
  url?: string;
  applicationId?: string;
}

export interface RumExtractionSettings {
  autoRefresh: boolean;
  showUserInfo: boolean;
  showSessionReplay: boolean;
}

export interface RumExtractionResult {
  success: boolean;
  data?: RumSessionData;
  error?: string;
} 