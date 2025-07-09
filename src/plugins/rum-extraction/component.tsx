import React, { useState, useEffect } from 'react';
import {
  Stack,
  Card,
  Text,
  Group,
  Button,
  Alert,
  Code,
  Switch,
  ActionIcon,
  Paper,
  LoadingOverlay,
  Tabs,
  Box,
  ScrollArea
} from '@mantine/core';
import {
  IconRefresh,
  IconUser,
  IconPlayerPlay,
  IconSettings,
  IconInfoCircle,
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';
import { PluginContext } from '../../types';
import { 
  RumSessionData, 
  RumExtractionSettings
} from './types';
import { 
  DEFAULT_RUM_EXTRACTION_SETTINGS,
  formatSessionData,
  validateSessionData
} from './config';

interface RumExtractionComponentProps {
  context: PluginContext;
}

export const RumExtractionComponent: React.FC<RumExtractionComponentProps> = ({ context }) => {
  const [sessionData, setSessionData] = useState<RumSessionData>({ isActive: false });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('session');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<any>(null);

  // Get current plugin settings
  const currentPlugin = context.storage.plugins.find(p => p.id === 'rum-extraction');
  const settings = (currentPlugin?.settings as RumExtractionSettings) || DEFAULT_RUM_EXTRACTION_SETTINGS;

  useEffect(() => {
    loadSessionData();
    
    // Set up auto-refresh if enabled
    if (settings.autoRefresh) {
      const interval = setInterval(loadSessionData, 30000); // 30 seconds
      setAutoRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
    
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [settings.autoRefresh]);

  const loadSessionData = async () => {
    try {
      setIsLoading(true);
      
      // Send message to background to get RUM session data
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RUM_SESSION_DATA'
      });
      
      if (response.success) {
        setSessionData(response.data);
        setLastRefresh(new Date());
      } else {
        setSessionData({ 
          isActive: false, 
          error: response.error || 'Failed to load RUM session data',
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      setSessionData({ 
        isActive: false, 
        error: 'Failed to communicate with background script',
        lastUpdated: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<RumExtractionSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    const updatedPlugins = context.storage.plugins.map(plugin =>
      plugin.id === 'rum-extraction' 
        ? { ...plugin, settings: updatedSettings, updatedAt: Date.now() }
        : plugin
    );
    
    await context.updateStorage({ plugins: updatedPlugins });
  };

  const openSessionReplay = () => {
    if (sessionData.sessionReplayLink) {
      chrome.tabs.create({ url: sessionData.sessionReplayLink });
    }
  };

  return (
    <Box>
      <LoadingOverlay visible={isLoading} />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="session" leftSection={<IconUser size={16} />}>
            Session Data
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        {/* Session Data Tab */}
        <Tabs.Panel value="session" pt="md">
          <Stack gap="md">
            {/* Header with refresh */}
            <Group justify="space-between">
              <Text fw={500}>RUM Session Information</Text>
              <Group gap="xs">
                {lastRefresh && (
                  <Text size="xs" c="dimmed">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </Text>
                )}
                <ActionIcon 
                  variant="subtle" 
                  onClick={loadSessionData}
                  loading={isLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {/* Status Alert */}
            {sessionData.error ? (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                <Text size="sm">{sessionData.error}</Text>
              </Alert>
            ) : !sessionData.isActive ? (
              <Alert color="gray" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  No active RUM session found. RUM must be initialized on the current page to extract session data.
                </Text>
              </Alert>
            ) : (
              <Alert color="green" icon={<IconCheck size={16} />}>
                <Text size="sm">
                  {formatSessionData(sessionData)}
                </Text>
              </Alert>
            )}

            {/* Session Details */}
            {sessionData.isActive && (
              <Card withBorder>
                <Stack gap="md">
                  <Text fw={500} size="sm">Session Details</Text>
                  
                  <Stack gap="xs">
                    {sessionData.sessionId && (
                      <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>Session ID:</Text>
                        <Code size="xs">{sessionData.sessionId}</Code>
                      </Group>
                    )}
                    
                    {sessionData.userId && (
                      <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>User ID:</Text>
                        <Code size="xs">{sessionData.userId}</Code>
                      </Group>
                    )}
                    
                    {sessionData.applicationId && (
                      <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>App ID:</Text>
                        <Code size="xs">{sessionData.applicationId}</Code>
                      </Group>
                    )}
                    
                    {sessionData.url && (
                      <Group gap="xs">
                        <Text size="xs" c="dimmed" style={{ minWidth: 80 }}>Page URL:</Text>
                        <Code size="xs" style={{ wordBreak: 'break-all' }}>
                          {sessionData.url}
                        </Code>
                      </Group>
                    )}
                  </Stack>
                </Stack>
              </Card>
            )}

            {/* User Information */}
            {sessionData.isActive && sessionData.userInfo && settings.showUserInfo && (
              <Card withBorder>
                <Stack gap="md">
                  <Text fw={500} size="sm">User Information</Text>
                  <ScrollArea.Autosize maxHeight={200}>
                    <Code block size="xs">
                      {JSON.stringify(sessionData.userInfo, null, 2)}
                    </Code>
                  </ScrollArea.Autosize>
                </Stack>
              </Card>
            )}

            {/* Session Replay */}
            {sessionData.isActive && sessionData.sessionReplayLink && settings.showSessionReplay && (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={openSessionReplay}
                color="violet"
                variant="light"
                fullWidth
              >
                Open Session Replay
              </Button>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Settings Tab */}
        <Tabs.Panel value="settings" pt="md">
          <Stack gap="md">
            <Text fw={500}>Plugin Settings</Text>
            
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Switch
                  label="Auto Refresh Session Data"
                  description="Automatically refresh RUM session data every 30 seconds"
                  checked={settings.autoRefresh}
                  onChange={(event) => updateSettings({ autoRefresh: event.currentTarget.checked })}
                />
                
                <Switch
                  label="Show User Information"
                  description="Display detailed user information when available in RUM sessions"
                  checked={settings.showUserInfo}
                  onChange={(event) => updateSettings({ showUserInfo: event.currentTarget.checked })}
                />
                
                <Switch
                  label="Show Session Replay Links"
                  description="Display session replay links when available"
                  checked={settings.showSessionReplay}
                  onChange={(event) => updateSettings({ showSessionReplay: event.currentTarget.checked })}
                />
              </Stack>
            </Paper>

            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                This plugin extracts RUM session data from pages that already have Datadog RUM initialized. 
                It does not inject RUM - use the RUM Injection plugin for that purpose.
              </Text>
            </Alert>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}; 