// Type definitions for Datadog RUM
declare global {
  interface Window {
    DD_RUM?: {
      init: (config: RumConfig) => void;
      addAction: (name: string, context?: Record<string, any>) => void;
      addError: (error: Error, context?: Record<string, any>) => void;
      addTiming: (name: string, time?: number) => void;
      setUser: (user: Record<string, any>) => void;
      setUserProperty: (key: string, value: any) => void;
      setGlobalContext: (context: Record<string, any>) => void;
      setGlobalContextProperty: (key: string, value: any) => void;
      removeGlobalContextProperty: (key: string) => void;
      clearGlobalContext: () => void;
      getGlobalContext: () => Record<string, any>;
      startView: (name?: string) => void;
      stopView: () => void;
    };
  }
}

export interface RumConfig {
  applicationId: string;
  clientToken: string;
  site: string;
  service: string;
  version: string;
  env: string;
  sessionSampleRate: number;
  sessionReplaySampleRate: number;
  trackUserInteractions: boolean;
  trackResources: boolean;
  trackLongTasks: boolean;
  defaultPrivacyLevel: string;
  enableExperimentalFeatures?: string[];
}

export {}; 