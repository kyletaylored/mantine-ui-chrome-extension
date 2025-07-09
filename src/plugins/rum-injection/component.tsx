import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Button,
  TextInput,
  Select,
  Switch,
  Group,
  Stack,
  Alert,
  Badge,
  ActionIcon,
  Tooltip,
  LoadingOverlay,
  Tabs,
  Code,
  Paper,
  Container,
  Title,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlaylist,
  IconPlayerStop,
  IconRefresh,
  IconSettings,
  IconEye,
  IconCheck,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import { PluginContext } from '../../types';
import { RumInjectionSettings, DEFAULT_RUM_SETTINGS } from './config';
import { createRumInjector, RumInjectionResult } from './rum-injector';

interface RumInjectionComponentProps {
  context: PluginContext;
}

export const RumInjectionComponent: React.FC<RumInjectionComponentProps> = ({ context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rumStatus, setRumStatus] = useState<{
    isInjected: boolean;
    hasRumGlobal: boolean;
    currentUrl?: string;
  }>({ isInjected: false, hasRumGlobal: false });
  const [lastResult, setLastResult] = useState<RumInjectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('inject');

  // Get current plugin settings
  const currentPlugin = context.storage.plugins.find(p => p.id === 'rum-injection');
  const pluginSettings = (currentPlugin?.settings as RumInjectionSettings) || DEFAULT_RUM_SETTINGS;

  // Form for RUM configuration
  const form = useForm<RumInjectionSettings>({
    initialValues: pluginSettings,
    validate: {
      applicationId: (value) => {
        if (!value) return 'Application ID is required';
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
          return 'Invalid Application ID format';
        }
        return null;
      },
      clientToken: (value) => {
        if (!value) return 'Client Token is required';
        if (!value.startsWith('pub')) return 'Client Token should start with "pub"';
        return null;
      },
      service: (value) => (!value ? 'Service name is required' : null),
      version: (value) => (!value ? 'Version is required' : null),
    },
  });

  // Create RUM injector instance
  const rumInjector = createRumInjector(form.values, context.credentials.site);

  // Load RUM status on component mount
  useEffect(() => {
    loadRumStatus();
  }, []);

  // Load current RUM status
  const loadRumStatus = async () => {
    try {
      const status = await rumInjector.getRumStatus();
      setRumStatus(status);
    } catch (error) {
      console.error('Failed to load RUM status:', error);
    }
  };

  // Handle form submission (save settings)
  const handleSaveSettings = async (values: RumInjectionSettings) => {
    try {
      setIsLoading(true);
      
      // Update plugin settings
      const updatedPlugins = context.storage.plugins.map(plugin => 
        plugin.id === 'rum-injection' 
          ? { ...plugin, settings: values, updatedAt: Date.now() }
          : plugin
      );

      await context.updateStorage({ plugins: updatedPlugins });

      notifications.show({
        title: 'Settings Saved',
        message: 'RUM injection settings have been saved successfully',
        color: 'green',
        icon: <IconCheck />,
      });

    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
        icon: <IconX />,
      });
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle RUM injection
  const handleInjectRum = async () => {
    try {
      setIsLoading(true);
      const result = await rumInjector.injectRum();
      setLastResult(result);
      
      if (result.success) {
        notifications.show({
          title: 'RUM Injected',
          message: result.message,
          color: 'green',
          icon: <IconCheck />,
        });
        await loadRumStatus();
      } else {
        notifications.show({
          title: 'Injection Failed',
          message: result.message,
          color: 'red',
          icon: <IconX />,
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'An unexpected error occurred',
        color: 'red',
        icon: <IconX />,
      });
      console.error('RUM injection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle RUM removal
  const handleRemoveRum = async () => {
    try {
      setIsLoading(true);
      const result = await rumInjector.removeRum();
      setLastResult(result);
      
      if (result.success) {
        notifications.show({
          title: 'RUM Removed',
          message: result.message,
          color: 'blue',
          icon: <IconCheck />,
        });
        await loadRumStatus();
      } else {
        notifications.show({
          title: 'Removal Failed',
          message: result.message,
          color: 'red',
          icon: <IconX />,
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'An unexpected error occurred',
        color: 'red',
        icon: <IconX />,
      });
      console.error('RUM removal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="lg" px={0}>
      <LoadingOverlay visible={isLoading} />
      
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={3}>📊 RUM Injection</Title>
            <Text size="sm" c="dimmed">
              Inject Datadog Real User Monitoring into web pages for demonstrations
            </Text>
          </div>
          <Group gap="xs">
            <Badge 
              color={rumStatus.hasRumGlobal ? 'green' : 'gray'} 
              variant="outline"
              size="sm"
            >
              {rumStatus.hasRumGlobal ? 'Active' : 'Inactive'}
            </Badge>
            <Tooltip label="Refresh Status">
              <ActionIcon variant="subtle" onClick={loadRumStatus}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Current Status */}
        <Card withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={500}>Current Status</Text>
              <Badge color={rumStatus.hasRumGlobal ? 'green' : 'gray'}>
                {rumStatus.hasRumGlobal ? 'RUM Active' : 'RUM Inactive'}
              </Badge>
            </Group>
            
            {rumStatus.currentUrl && (
              <Text size="sm" c="dimmed">
                Current page: {rumStatus.currentUrl}
              </Text>
            )}

            <Group gap="xs">
              <Button
                leftSection={<IconPlaylist size={16} />}
                color="violet"
                size="sm"
                onClick={handleInjectRum}
                disabled={rumStatus.hasRumGlobal || !form.isValid()}
              >
                Inject RUM
              </Button>
              
              <Button
                leftSection={<IconPlayerStop size={16} />}
                color="orange"
                variant="outline"
                size="sm"
                onClick={handleRemoveRum}
                disabled={!rumStatus.hasRumGlobal}
              >
                Remove RUM
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Last Result */}
        {lastResult && (
          <Alert 
            color={lastResult.success ? 'green' : 'red'}
            title={lastResult.success ? 'Success' : 'Error'}
            icon={lastResult.success ? <IconCheck /> : <IconX />}
          >
            {lastResult.message}
            {lastResult.url && (
              <Text size="sm" mt="xs">
                URL: {lastResult.url}
              </Text>
            )}
          </Alert>
        )}

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="inject" leftSection={<IconEye size={16} />}>
              Injection
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="inject" pt="md">
            <Card withBorder>
              <Stack gap="md">
                <Text fw={500}>Quick Actions</Text>
                
                {/* Quick info */}
                <Paper p="sm" withBorder bg="gray.0">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Configuration Status</Text>
                    <Group gap="xs">
                      <Badge size="xs" color={form.values.applicationId ? 'green' : 'red'}>
                        App ID: {form.values.applicationId ? 'Set' : 'Missing'}
                      </Badge>
                      <Badge size="xs" color={form.values.clientToken ? 'green' : 'red'}>
                        Token: {form.values.clientToken ? 'Set' : 'Missing'}
                      </Badge>
                      <Badge size="xs" color="blue">
                        Site: {context.credentials.site}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>

                {!form.isValid() && (
                  <Alert color="yellow" icon={<IconInfoCircle />}>
                    Please configure your RUM Application ID and Client Token in the Settings tab before injecting RUM.
                  </Alert>
                )}

                {/* Injection preview */}
                <Box>
                  <Text size="sm" fw={500} mb="xs">What will be injected:</Text>
                  <Code block>
                    {`RUM Application ID: ${form.values.applicationId || 'Not set'}\nService: ${form.values.service}\nEnvironment: ${form.values.env}\nVersion: ${form.values.version}`}
                  </Code>
                </Box>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <form onSubmit={form.onSubmit(handleSaveSettings)}>
              <Stack gap="md">
                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Required Configuration</Text>
                    
                    <TextInput
                      label="RUM Application ID"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      required
                      {...form.getInputProps('applicationId')}
                    />
                    
                    <TextInput
                      label="Client Token"
                      placeholder="pub********************************"
                      required
                      {...form.getInputProps('clientToken')}
                    />

                    <Alert color="blue" icon={<IconInfoCircle />}>
                      You can find these values in your Datadog account under:
                      <br />
                      <Text component="span" fw={500}>
                        UX Monitoring → RUM Applications → [Your App] → Application Details
                      </Text>
                    </Alert>
                  </Stack>
                </Card>

                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Application Settings</Text>
                    
                    <TextInput
                      label="Service Name"
                      placeholder="my-demo-app"
                      required
                      {...form.getInputProps('service')}
                    />
                    
                    <TextInput
                      label="Version"
                      placeholder="1.0.0"
                      required
                      {...form.getInputProps('version')}
                    />
                    
                    <Select
                      label="Environment"
                      data={[
                        { value: 'demo', label: 'Demo' },
                        { value: 'staging', label: 'Staging' },
                        { value: 'production', label: 'Production' },
                        { value: 'development', label: 'Development' },
                      ]}
                      {...form.getInputProps('env')}
                    />
                  </Stack>
                </Card>

                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Tracking Options</Text>
                    
                    <Switch
                      label="Track User Interactions"
                      description="Monitor clicks, form submissions, and page views"
                      {...form.getInputProps('trackUserInteractions', { type: 'checkbox' })}
                    />
                    
                    <Switch
                      label="Track Resources"
                      description="Monitor resource loading times (images, scripts, etc.)"
                      {...form.getInputProps('trackResources', { type: 'checkbox' })}
                    />
                    
                    <Switch
                      label="Track Long Tasks"
                      description="Monitor long-running tasks that block the main thread"
                      {...form.getInputProps('trackLongTasks', { type: 'checkbox' })}
                    />
                  </Stack>
                </Card>

                <Group justify="flex-end">
                  <Button type="submit" loading={isLoading}>
                    Save Settings
                  </Button>
                </Group>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}; 