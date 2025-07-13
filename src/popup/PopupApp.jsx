import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Button,
  Text,
  Card,
  Badge,
  ActionIcon,
  Divider,
  Box,
  Alert,
  Switch,
  Anchor
} from '@mantine/core';
import {
  IconSettings,
  IconExternalLink,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconEye,
  IconCode,
  IconBell
} from '@tabler/icons-react';
import { storage } from '@/shared/storage';

export function PopupApp() {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validatingCredentials, setValidatingCredentials] = useState(false);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const data = await storage.get();
      setStorageData(data);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCredentials = async () => {
    if (!storageData?.credentials.apiKey) return;
    
    setValidatingCredentials(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_CREDENTIALS',
        credentials: storageData.credentials
      });
      
      if (response.success) {
        await loadStorageData();
      }
    } catch (error) {
      console.error('Failed to validate credentials:', error);
    } finally {
      setValidatingCredentials(false);
    }
  };

  const togglePlugin = async (pluginId) => {
    if (!storageData) return;
    
    const plugins = storageData.plugins.map(plugin => 
      plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin
    );
    
    await storage.update({ plugins });
    await loadStorageData();
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const openDatadogApp = () => {
    const site = storageData?.credentials.site || 'us1';
    const url = `https://app.datadoghq.${site === 'us1' ? 'com' : site}`;
    chrome.tabs.create({ url });
  };

  if (loading) {
    return (
      <Box p="md">
        <Text>Loading...</Text>
      </Box>
    );
  }

  const { credentials, plugins = [], helpfulLinks = [] } = storageData || {};

  return (
    <Stack gap="sm" p="md">
      {/* Header */}
      <Group justify="space-between" mb="xs">
        <Text size="lg" fw={600}>Datadog Toolkit</Text>
        <ActionIcon variant="subtle" onClick={openOptionsPage}>
          <IconSettings size={16} />
        </ActionIcon>
      </Group>

      {/* Credentials Status */}
      <Card withBorder>
        <Group justify="space-between" align="center">
          <Group>
            <Badge
              color={credentials?.isValid ? 'green' : 'red'}
              variant="light"
              leftSection={credentials?.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
            >
              {credentials?.isValid ? 'Connected' : 'Disconnected'}
            </Badge>
            <Text size="sm" c="dimmed">
              {credentials?.site?.toUpperCase() || 'No site'}
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            onClick={validateCredentials}
            loading={validatingCredentials}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>
      </Card>

      {/* Quick Actions */}
      <Card withBorder>
        <Text size="sm" fw={500} mb="xs">Quick Actions</Text>
        <Stack gap="xs">
          <Button
            variant="light"
            leftSection={<IconExternalLink size={16} />}
            onClick={openDatadogApp}
            fullWidth
          >
            Open Datadog App
          </Button>
          <Button
            variant="light"
            leftSection={<IconEye size={16} />}
            onClick={() => chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' })}
            fullWidth
          >
            Inspect Current Page
          </Button>
        </Stack>
      </Card>

      {/* Plugin Status */}
      {plugins.length > 0 && (
        <Card withBorder>
          <Text size="sm" fw={500} mb="xs">Plugins</Text>
          <Stack gap="xs">
            {plugins.map(plugin => (
              <Group key={plugin.id} justify="space-between">
                <Group>
                  <Badge variant="light" size="sm">
                    {plugin.name}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {plugin.version}
                  </Text>
                </Group>
                <Switch
                  checked={plugin.enabled}
                  onChange={() => togglePlugin(plugin.id)}
                  size="sm"
                />
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {/* Helpful Links */}
      {helpfulLinks.length > 0 && (
        <Card withBorder>
          <Text size="sm" fw={500} mb="xs">Quick Links</Text>
          <Stack gap="xs">
            {helpfulLinks.slice(0, 3).map(link => (
              <Anchor
                key={link.id}
                href={link.url}
                target="_blank"
                size="sm"
                style={{ textDecoration: 'none' }}
              >
                {link.title}
              </Anchor>
            ))}
            {helpfulLinks.length > 3 && (
              <Text size="xs" c="dimmed">
                +{helpfulLinks.length - 3} more in options
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Warning if not configured */}
      {!credentials?.apiKey && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="yellow"
          variant="light"
        >
          <Text size="sm">
            Configure your Datadog credentials in{' '}
            <Anchor onClick={openOptionsPage} style={{ cursor: 'pointer' }}>
              settings
            </Anchor>
          </Text>
        </Alert>
      )}
    </Stack>
  );
}