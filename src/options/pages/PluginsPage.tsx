import React from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Switch,
  Alert,
  SimpleGrid,
  ThemeIcon,
  Divider
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconInfoCircle,
  IconEye,
  IconCode,
  IconBell
} from '@tabler/icons-react';
import { ExtensionStorage } from '@/types';
import { storage } from '@/shared/storage';

interface PluginsPageProps {
  storageData: ExtensionStorage | null;
  onRefresh: () => Promise<void>;
}

export function PluginsPage({ storageData, onRefresh }: PluginsPageProps) {
  const { plugins = [] } = storageData || {};

  const togglePlugin = async (pluginId: string) => {
    try {
      const plugin = plugins.find(p => p.id === pluginId);
      if (plugin) {
        // Prevent disabling core plugins
        if (plugin.isCore) {
          console.warn('Cannot disable core plugin:', pluginId);
          return;
        }
        
        await storage.updatePlugin(pluginId, { enabled: !plugin.enabled });
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  // Initial plugins that should be available
  const initialPlugins = [
    {
      id: 'rum-extraction',
      name: 'RUM Session Extraction',
      description: 'Extract and display RUM session data from active pages for the popup RUM tab.',
      icon: <IconEye size={20} />,
      enabled: true,
      isCore: true
    },
    {
      id: 'apm-tracing',
      name: 'APM Tracing',
      description: 'Monitor and display APM traces for the popup APM tab.',
      icon: <IconCode size={20} />,
      enabled: true,
      isCore: true
    },
    {
      id: 'rum-injection',
      name: 'RUM Injection',
      description: 'Inject Datadog RUM (Real User Monitoring) into web pages for demonstration purposes.',
      icon: <IconEye size={20} />,
      enabled: false,
      isCore: false
    },
    {
      id: 'event-alerts',
      name: 'Event Alerts',
      description: 'Monitor Datadog events and generate real-time notifications.',
      icon: <IconBell size={20} />,
      enabled: false,
      isCore: false
    }
  ];

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">Plugins</Title>
          <Text c="dimmed">
            Manage pluggable features for enhanced demonstrations
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={16} />} variant="light">
          <Text size="sm">
            Plugin system is currently in development. The following plugins will be available in the next version.
          </Text>
        </Alert>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {initialPlugins.map((plugin) => {
            const existingPlugin = plugins.find(p => p.id === plugin.id);
            const isEnabled = existingPlugin?.enabled ?? plugin.enabled;
            const isCore = existingPlugin?.isCore ?? plugin.isCore;

            return (
              <Card key={plugin.id} withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon variant="light" color={isCore ? 'violet' : 'blue'}>
                        {plugin.icon}
                      </ThemeIcon>
                      <div>
                        <Text fw={500}>{plugin.name}</Text>
                        <Text size="sm" c="dimmed">v1.0.0</Text>
                      </div>
                    </Group>
                    <Switch
                      checked={isEnabled}
                      onChange={() => togglePlugin(plugin.id)}
                      disabled={isCore} // Core plugins cannot be toggled
                    />
                  </Group>
                  
                  <Text size="sm">
                    {plugin.description}
                  </Text>
                  
                  <Group gap="xs">
                    <Badge
                      variant="light"
                      color={isEnabled ? 'green' : 'gray'}
                      leftSection={isEnabled ? <IconCheck size={12} /> : <IconX size={12} />}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {isCore && (
                      <Badge variant="light" color="violet" size="sm">
                        Core Plugin
                      </Badge>
                    )}
                  </Group>
                  
                  {isCore && (
                    <Alert color="violet" variant="light">
                      <Text size="xs">
                        This plugin is required for core functionality and cannot be disabled.
                      </Text>
                    </Alert>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>

        <Divider my="xl" />

        <Card withBorder>
          <Title order={4} mb="md">Plugin Development</Title>
          <Text size="sm" mb="md">
            The plugin system is designed to be extensible and will support:
          </Text>
          <Stack gap="xs">
            <Text size="sm">• Dynamic loading and unloading of plugins</Text>
            <Text size="sm">• Custom plugin configuration interfaces</Text>
            <Text size="sm">• Plugin-specific message passing</Text>
            <Text size="sm">• Secure plugin sandboxing</Text>
            <Text size="sm">• Plugin marketplace integration</Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
} 