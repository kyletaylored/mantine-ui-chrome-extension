import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  NavLink,
  Title,
  Group,
  Button,
  Text,
  Box,
  Badge,
  Stack,
  Divider,
  ActionIcon,
  ThemeIcon,
} from '@mantine/core';
import {
  IconDashboard,
  IconKey,
  IconLink,
  IconPuzzle,
  IconSettings,
  IconBrandTabler,
  IconExternalLink,
  IconRefresh,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import { getStorage } from '@/shared/storage';
import { createLogger } from '@/shared/logger';

const debugLog = createLogger('OptionsApp');

// Import page components
import { DashboardPage } from '@/options/pages/DashboardPage';
import { CredentialsPage } from '@/options/pages/CredentialsPage';
import { HelpfulLinksPage } from '@/options/pages/HelpfulLinksPage';
import { PluginsPage } from '@/options/pages/PluginsPage';
import { SettingsPage } from '@/options/pages/SettingsPage';

export function OptionsApp() {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const loadData = async () => {
    debugLog.debug('START', 'LOAD_DATA', {});
    try {
      const data = await getStorage();
      debugLog.debug('RAW_DATA', 'LOAD_DATA', { data, hasCredentials: !!data?.credentials, hasPlugins: !!data?.plugins });
      
      // Ensure data has the proper structure with defaults
      const normalizedData = {
        credentials: data?.credentials || {
          apiKey: '',
          appKey: '',
          site: 'us1',
          isValid: false
        },
        helpfulLinks: data?.helpfulLinks || [],
        plugins: data?.plugins || [],
        settings: data?.settings || {
          theme: 'light',
          defaultPage: 'dashboard',
          enableNotifications: true,
          autoValidateCredentials: true
        }
      };
      
      setStorageData(normalizedData);
      debugLog.debug('SUCCESS', 'LOAD_DATA', { normalizedData });
    } catch (error) {
      debugLog.debug('ERROR', 'LOAD_DATA', error);
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshCredentials = async () => {
    if (!storageData?.credentials?.apiKey || !storageData?.credentials?.appKey) {
      debugLog.debug('ERROR', 'REFRESH_CREDENTIALS', 'Missing credentials');
      notifications.show({
        title: 'No Credentials',
        message: 'Please enter your API credentials first.',
        color: 'yellow'
      });
      return;
    }

    debugLog.debug('START', 'REFRESH_CREDENTIALS', { 
      apiKeyLength: storageData.credentials.apiKey.length,
      appKeyLength: storageData.credentials.appKey.length 
    });
    
    try {
      // Use Chrome messaging to validate credentials
      debugLog.debug('SENDING', 'REFRESH_CREDENTIALS', 'About to send message to background');
      chrome.runtime.sendMessage({
        type: 'VALIDATE_CREDENTIALS',
        credentials: storageData.credentials
      });
      debugLog.debug('SENT', 'REFRESH_CREDENTIALS', 'Message sent');
      
      // Wait a moment for validation to complete, then refresh data
      setTimeout(async () => {
        debugLog.debug('CHECKING', 'REFRESH_CREDENTIALS', 'Checking storage for validation result');
        await loadData();
        const updatedData = await getStorage();
        
        debugLog.debug('RESULT', 'REFRESH_CREDENTIALS', { 
          isValid: updatedData.credentials?.isValid,
          site: updatedData.credentials?.site 
        });
        
        if (updatedData.credentials?.isValid) {
          notifications.show({
            title: 'Credentials Validated',
            message: `Successfully connected to Datadog ${updatedData.credentials.site?.toUpperCase()}`,
            color: 'green',
            icon: <IconCheck size={16} />
          });
        } else {
          notifications.show({
            title: 'Validation Failed',
            message: 'Unable to validate your Datadog credentials',
            color: 'red',
            icon: <IconX size={16} />
          });
        }
      }, 2000);
      
    } catch (error) {
      debugLog.debug('ERROR', 'REFRESH_CREDENTIALS', error);
      notifications.show({
        title: 'Validation Error',
        message: 'Failed to validate credentials',
        color: 'red',
        icon: <IconX size={16} />
      });
    }
  };

  if (loading) {
    return (
      <Box p="xl" style={{ textAlign: 'center' }}>
        <Text>Loading Datadog Sales Engineering Toolkit...</Text>
      </Box>
    );
  }

  return (
    <AppShell
      navbar={{ 
        width: { base: 300 }, 
        breakpoint: 'sm' 
      }}
      padding="md"
    >
      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {/* Header */}
          <Group>
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconBrandTabler size={20} />
            </ThemeIcon>
            <div>
              <Title order={3} size="h4">Datadog Toolkit</Title>
              <Text size="xs" c="dimmed">Sales Engineering</Text>
            </div>
          </Group>

          <Divider />

          {/* Status Badge */}
          <Group justify="space-between">
            <Text size="sm" fw={500}>Connection Status</Text>
            <Badge
              color={storageData?.credentials?.isValid ? 'green' : 'red'}
              variant="light"
              size="sm"
              leftSection={storageData?.credentials?.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
            >
              {storageData?.credentials?.isValid ? 'Connected' : 'Disconnected'}
            </Badge>
          </Group>

          {storageData?.credentials?.isValid && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Region: {storageData.credentials.site?.toUpperCase()}</Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={refreshCredentials}
                title="Refresh credentials"
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Group>
          )}

          <Divider />

          {/* Navigation */}
          <Stack gap="xs">
            <NavLink
              href="#"
              label="Dashboard"
              leftSection={<IconDashboard size={16} />}
              active={location.pathname === '/'}
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            />
            <NavLink
              href="#"
              label="Credentials"
              leftSection={<IconKey size={16} />}
              active={location.pathname === '/credentials'}
              onClick={(e) => {
                e.preventDefault();
                navigate('/credentials');
              }}
            />
            <NavLink
              href="#"
              label="Helpful Links"
              leftSection={<IconLink size={16} />}
              active={location.pathname === '/links'}
              onClick={(e) => {
                e.preventDefault();
                navigate('/links');
              }}
            />
            <NavLink
              href="#"
              label="Plugins"
              leftSection={<IconPuzzle size={16} />}
              active={location.pathname === '/plugins'}
              onClick={(e) => {
                e.preventDefault();
                navigate('/plugins');
              }}
            />
            <NavLink
              href="#"
              label="Settings"
              leftSection={<IconSettings size={16} />}
              active={location.pathname === '/settings'}
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
            />
          </Stack>

          <Divider />

          {/* External Links */}
          <Stack gap="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
              component="a"
              href="https://docs.datadoghq.com"
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              justify="flex-start"
            >
              Datadog Docs
            </Button>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
              component="a"
              href="https://app.datadoghq.com"
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              justify="flex-start"
            >
              Datadog App
            </Button>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<DashboardPage storageData={storageData} onRefresh={loadData} />} />
          <Route path="/credentials" element={<CredentialsPage storageData={storageData} onRefresh={loadData} />} />
          <Route path="/links" element={<HelpfulLinksPage storageData={storageData} onRefresh={loadData} />} />
          <Route path="/plugins" element={<PluginsPage storageData={storageData} onRefresh={loadData} />} />
          <Route path="/settings" element={<SettingsPage storageData={storageData} onRefresh={loadData} />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}