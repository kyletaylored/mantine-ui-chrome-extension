import React, { useState, useEffect } from 'react';
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

import { storage } from '@/shared/storage';
import { sendValidateCredentials } from '@/shared/messages';
import { ExtensionStorage } from '@/types';

// Debug logging helper
const debugLog = (operation: string, messageType: string, data?: any) => {
  console.log(`[OptionsApp Debug] ${operation} - ${messageType}`, data);
};

// Import page components
import { DashboardPage } from '@/options/pages/DashboardPage';
import { CredentialsPage } from '@/options/pages/CredentialsPage';
import { HelpfulLinksPage } from '@/options/pages/HelpfulLinksPage';
import { PluginsPage } from '@/options/pages/PluginsPage';
import { SettingsPage } from '@/options/pages/SettingsPage';

export function OptionsApp() {
  const [storageData, setStorageData] = useState<ExtensionStorage | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const loadData = async () => {
    debugLog('START', 'LOAD_DATA', {});
    try {
      const data = await storage.get();
      setStorageData(data);
      debugLog('SUCCESS', 'LOAD_DATA', { 
        hasCredentials: !!data.credentials.apiKey,
        isValid: data.credentials.isValid,
        pluginCount: data.plugins.length 
      });
    } catch (error) {
      debugLog('ERROR', 'LOAD_DATA', error);
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCredentials = async () => {
    if (!storageData?.credentials.apiKey || !storageData?.credentials.appKey) {
      debugLog('ERROR', 'REFRESH_CREDENTIALS', 'Missing credentials');
      notifications.show({
        title: 'No Credentials',
        message: 'Please enter your API credentials first.',
        color: 'yellow'
      });
      return;
    }

    debugLog('START', 'REFRESH_CREDENTIALS', { 
      apiKeyLength: storageData.credentials.apiKey.length,
      appKeyLength: storageData.credentials.appKey.length 
    });
    
    try {
      // Use the new message system to validate credentials
      debugLog('SENDING', 'REFRESH_CREDENTIALS', 'About to send message to background');
      const result = sendValidateCredentials({ credentials: storageData.credentials });
      debugLog('SENT', 'REFRESH_CREDENTIALS', { result });
      
      // Wait a moment for validation to complete, then refresh data
      setTimeout(async () => {
        debugLog('CHECKING', 'REFRESH_CREDENTIALS', 'Checking storage for validation result');
        await loadData();
        const updatedData = await storage.get();
        
        debugLog('RESULT', 'REFRESH_CREDENTIALS', { 
          isValid: updatedData.credentials.isValid,
          site: updatedData.credentials.site 
        });
        
        if (updatedData.credentials.isValid) {
          notifications.show({
            title: 'Credentials Refreshed',
            message: 'Your Datadog credentials have been validated successfully.',
            color: 'green',
            icon: <IconCheck size={16} />
          });
        } else {
          notifications.show({
            title: 'Validation Failed',
            message: 'Unable to validate your credentials. Please check your API keys.',
            color: 'red',
            icon: <IconX size={16} />
          });
        }
      }, 3000);
      
    } catch (error) {
      debugLog('ERROR', 'REFRESH_CREDENTIALS', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to refresh credentials. Please try again.',
        color: 'red',
        icon: <IconX size={16} />
      });
    }
  };

  const openDatadogApp = () => {
    const site = storageData?.credentials.site || 'us1';
    const url = `https://app.datadoghq.${site === 'us1' ? 'com' : site}`;
    debugLog('EXTERNAL', 'OPEN_DATADOG', { site, url });
    chrome.tabs.create({ url });
  };

  useEffect(() => {
    debugLog('LIFECYCLE', 'OPTIONS_MOUNTED', {});
    loadData();
  }, []);

  if (loading) {
    return (
      <Box p="xl">
        <Text>Loading...</Text>
      </Box>
    );
  }

  const navigation = [
    { 
      label: 'Dashboard', 
      icon: IconDashboard, 
      path: '/',
      active: location.pathname === '/'
    },
    { 
      label: 'Credentials', 
      icon: IconKey, 
      path: '/credentials',
      active: location.pathname === '/credentials',
      rightSection: storageData?.credentials.isValid ? (
        <ThemeIcon size="xs" color="green" variant="light">
          <IconRefresh size={10} />
        </ThemeIcon>
      ) : (
        <ThemeIcon size="xs" color="red" variant="light">
          <IconRefresh size={10} />
        </ThemeIcon>
      )
    },
    { 
      label: 'Helpful Links', 
      icon: IconLink, 
      path: '/links',
      active: location.pathname === '/links',
      rightSection: storageData?.helpfulLinks.length ? (
        <Badge size="xs" color="blue">
          {storageData.helpfulLinks.length}
        </Badge>
      ) : null
    },
    { 
      label: 'Plugins', 
      icon: IconPuzzle, 
      path: '/plugins',
      active: location.pathname === '/plugins',
      rightSection: storageData?.plugins.filter(p => p.enabled).length ? (
        <Badge size="xs" color="green">
          {storageData.plugins.filter(p => p.enabled).length}
        </Badge>
      ) : null
    },
    { 
      label: 'Settings', 
      icon: IconSettings, 
      path: '/settings',
      active: location.pathname === '/settings'
    }
  ];

  return (
    <AppShell
      navbar={{
        width: 260,
        breakpoint: 'sm'
      }}
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'violet', to: 'blue' }}>
              <IconBrandTabler size={20} />
            </ThemeIcon>
            <Title order={3}>Datadog Sales Engineering Toolkit</Title>
          </Group>
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={refreshCredentials}
              disabled={!storageData?.credentials.apiKey}
            >
              <IconRefresh size={16} />
            </ActionIcon>
            <Button
              variant="light"
              leftSection={<IconExternalLink size={16} />}
              onClick={openDatadogApp}
              size="sm"
            >
              Open Datadog
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={16} />}
              rightSection={item.rightSection}
              active={item.active}
              onClick={() => navigate(item.path)}
              style={{
                borderRadius: '4px',
                padding: '8px 12px'
              }}
            />
          ))}
        </Stack>
        
        <Divider my="md" />
        
        <Stack gap="xs">
          <Text size="sm" fw={500} c="dimmed">
            Status
          </Text>
          <Group gap="xs">
            <Badge
              color={storageData?.credentials.isValid ? 'green' : 'red'}
              variant="light"
              size="sm"
            >
              {storageData?.credentials.isValid ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="light" size="sm">
              {storageData?.credentials.site?.toUpperCase() || 'No Site'}
            </Badge>
          </Group>
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