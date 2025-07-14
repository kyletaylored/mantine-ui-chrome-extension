import React, { useState } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Switch,
  Select,
  Divider,
  Alert,
  LoadingOverlay
} from '@mantine/core';
import {
  IconSettings,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconInfoCircle,
  IconSun,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getStorage, updateStorage, clearStorage } from '@/shared/storage';

export function SettingsPage({ storageData, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { settings } = storageData || {};

  const updateSetting = async (key, value) => {
    if (!settings) return;
    
    try {
      const newSettings = { ...settings, [key]: value };
      await updateStorage({ settings: newSettings });
      await onRefresh();
      
      notifications.show({
        title: 'Settings Updated',
        message: 'Your settings have been saved.',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update settings.',
        color: 'red'
      });
    }
  };

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }
    
    setResetting(true);
    try {
      const defaultSettings = {
        theme: 'light',
        defaultPage: 'dashboard',
        enableNotifications: true,
        autoValidateCredentials: true
      };
      
      await updateStorage({ settings: defaultSettings });
      await onRefresh();
      
      notifications.show({
        title: 'Settings Reset',
        message: 'All settings have been reset to default values.',
        color: 'blue',
        icon: <IconRefresh size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to reset settings.',
        color: 'red'
      });
    } finally {
      setResetting(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear ALL extension data? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('This will delete all your credentials, links, and settings. Are you absolutely sure?')) {
      return;
    }
    
    setLoading(true);
    try {
      await clearStorage();
      await onRefresh();
      
      notifications.show({
        title: 'Data Cleared',
        message: 'All extension data has been cleared.',
        color: 'red',
        icon: <IconTrash size={16} />
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to clear data.',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto (System)' }
  ];

  const defaultPageOptions = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'credentials', label: 'Credentials' },
    { value: 'links', label: 'Links' },
    { value: 'plugins', label: 'Plugins' }
  ];

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">Settings</Title>
          <Text c="dimmed">
            Configure extension preferences and behavior
          </Text>
        </div>

        {/* Appearance Settings */}
        <Card withBorder>
          <LoadingOverlay visible={loading} />
          
          <Group justify="space-between" mb="md">
            <Group>
              <IconSun size={20} />
              <Text fw={500}>Appearance</Text>
            </Group>
          </Group>

          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Theme</Text>
                <Text size="xs" c="dimmed">Choose the extension theme</Text>
              </div>
              <Select
                value={settings?.theme || 'light'}
                onChange={(value) => updateSetting('theme', value)}
                data={themeOptions}
                w={150}
              />
            </Group>

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Default Page</Text>
                <Text size="xs" c="dimmed">Page to open when accessing options</Text>
              </div>
              <Select
                value={settings?.defaultPage || 'dashboard'}
                onChange={(value) => updateSetting('defaultPage', value)}
                data={defaultPageOptions}
                w={150}
              />
            </Group>
          </Stack>
        </Card>

        {/* Behavior Settings */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <IconSettings size={20} />
              <Text fw={500}>Behavior</Text>
            </Group>
          </Group>

          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Enable Notifications</Text>
                <Text size="xs" c="dimmed">Show notifications for actions and updates</Text>
              </div>
              <Switch
                checked={settings?.enableNotifications ?? true}
                onChange={(event) => updateSetting('enableNotifications', event.currentTarget.checked)}
              />
            </Group>

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Auto-validate Credentials</Text>
                <Text size="xs" c="dimmed">Automatically validate API credentials on startup</Text>
              </div>
              <Switch
                checked={settings?.autoValidateCredentials ?? true}
                onChange={(event) => updateSetting('autoValidateCredentials', event.currentTarget.checked)}
              />
            </Group>
          </Stack>
        </Card>

        {/* Extension Information */}
        <Card withBorder>
          <Title order={4} mb="md">Extension Information</Title>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm">Version:</Text>
              <Text size="sm" c="dimmed">1.0.0</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Manifest Version:</Text>
              <Text size="sm" c="dimmed">3</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Developer:</Text>
              <Text size="sm" c="dimmed">Datadog Sales Engineering Team</Text>
            </Group>
          </Stack>
        </Card>

        {/* Advanced Settings */}
        <Card withBorder>
          <Title order={4} mb="md">Advanced</Title>
          <Stack gap="md">
            <Alert icon={<IconInfoCircle size={16} />} variant="light" color="yellow">
              <Text size="sm">
                These actions are permanent and cannot be undone. Use with caution.
              </Text>
            </Alert>

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Reset Settings</Text>
                <Text size="xs" c="dimmed">Reset all settings to default values</Text>
              </div>
              <Button
                variant="light"
                color="blue"
                size="sm"
                leftSection={<IconRefresh size={14} />}
                onClick={resetSettings}
                loading={resetting}
              >
                Reset
              </Button>
            </Group>

            <Divider />

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Clear All Data</Text>
                <Text size="xs" c="dimmed">Delete all extension data including credentials</Text>
              </div>
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={14} />}
                onClick={clearAllData}
                loading={loading}
              >
                Clear Data
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
} 