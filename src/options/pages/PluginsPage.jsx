import React, { useState, useEffect } from 'react';
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
  Loader,
  Button,
  Modal
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCheck,
  IconX,
  IconInfoCircle,
  IconSettings
} from '@tabler/icons-react';
import { updatePlugin, setPluginSettings } from '@/shared/storage';
import { pluginLoader } from '@/shared/plugin-loader';
import { getIcon } from '@/shared/icon-loader';
import { createLogger } from '@/shared/logger';
import { PluginConfigForm } from '@/options/components/PluginConfigForm';

const logger = createLogger('Plugins');

export function PluginsPage({ storageData, onRefresh }) {
  const [pluginManifests, setPluginManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [configModalOpened, { open: openConfigModal, close: closeConfigModal }] = useDisclosure(false);
  const { plugins: storagePlugins = [] } = storageData || {};

  // Load plugin manifests on component mount
  useEffect(() => {
    loadPluginManifests();
  }, []);

  const loadPluginManifests = async () => {
    try {
      setLoading(true);
      
      // Initialize plugin loader if not already done
      await pluginLoader.initialize();
      
      // Get all available plugin manifests
      const manifests = pluginLoader.getPlugins().map(plugin => plugin.manifest);
      setPluginManifests(manifests);
      
      logger.info(`Loaded ${manifests.length} plugin manifests`);
    } catch (error) {
      logger.error('Failed to load plugin manifests:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId) => {
    try {
      const manifest = pluginManifests.find(m => m.id === pluginId);
      if (!manifest) {
        logger.error('Plugin manifest not found:', pluginId);
        return;
      }

      // Prevent disabling core plugins
      if (manifest.core) {
        logger.warn('Cannot disable core plugin:', pluginId);
        return;
      }
      
      // Find current state from storage
      const storagePlugin = storagePlugins.find(p => p.id === pluginId);
      const currentEnabled = storagePlugin?.enabled ?? manifest.defaultEnabled ?? false;
      
      await updatePlugin(pluginId, { enabled: !currentEnabled });
      await onRefresh();
    } catch (error) {
      logger.error('Failed to toggle plugin:', error);
    }
  };

  // Dynamic icon loading based on manifest icon property
  const getPluginIcon = (manifest) => {
    const iconName = manifest.icon;
    return getIcon(iconName, 20);
  };

  const handleOpenConfig = (manifest) => {
    if (manifest.configSchema) {
      setSelectedPlugin(manifest);
      openConfigModal();
    }
  };

  const handleCloseConfig = () => {
    closeConfigModal();
    setSelectedPlugin(null);
  };

  const handleConfigSave = async (config) => {
    if (selectedPlugin) {
      try {
        await setPluginSettings(selectedPlugin.id, config);
        await onRefresh();
        handleCloseConfig();
        logger.info(`Configuration saved for plugin: ${selectedPlugin.id}`);
      } catch (error) {
        logger.error('Failed to save plugin configuration:', error);
      }
    }
  };

  // Merge plugin manifests with storage data to get final plugin state
  const getPluginDisplayData = () => {
    return pluginManifests.map(manifest => {
      const storagePlugin = storagePlugins.find(p => p.id === manifest.id);
      
      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        isCore: manifest.core,
        enabled: storagePlugin?.enabled ?? (manifest.core || manifest.defaultEnabled || false),
        icon: getPluginIcon(manifest),
        hasConfig: !!manifest.configSchema,
        manifest: manifest,
        settings: storagePlugin?.settings || {}
      };
    });
  };

  if (loading) {
    return (
      <Container size="lg">
        <Stack align="center" gap="lg" py="xl">
          <Loader size="lg" />
          <Text>Loading plugins...</Text>
        </Stack>
      </Container>
    );
  }

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
          {getPluginDisplayData().map((plugin) => {
            return (
              <Card key={plugin.id} withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group>
                      <ThemeIcon variant="light" color={plugin.isCore ? 'violet' : 'blue'}>
                        {plugin.icon}
                      </ThemeIcon>
                      <div>
                        <Text fw={500}>{plugin.name}</Text>
                        <Text size="sm" c="dimmed">{plugin.version || 'v1.0.0'}</Text>
                      </div>
                    </Group>
                    <Switch
                      checked={plugin.enabled}
                      onChange={() => togglePlugin(plugin.id)}
                      disabled={plugin.isCore} // Core plugins cannot be toggled
                    />
                  </Group>
                  
                  <Text size="sm">
                    {plugin.description}
                  </Text>
                  
                  <Group gap="xs">
                    <Badge
                      variant="light"
                      color={plugin.enabled ? 'green' : 'gray'}
                      leftSection={plugin.enabled ? <IconCheck size={12} /> : <IconX size={12} />}
                    >
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {plugin.isCore && (
                      <Badge variant="light" color="violet" size="sm">
                        Core Plugin
                      </Badge>
                    )}
                  </Group>

                  {plugin.hasConfig && (
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={<IconSettings size={16} />}
                      onClick={() => handleOpenConfig(plugin.manifest)}
                      disabled={!plugin.enabled}
                    >
                      Configure
                    </Button>
                  )}
                  
                  {plugin.isCore && (
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

      {/* Configuration Modal */}
      <Modal
        opened={configModalOpened}
        onClose={handleCloseConfig}
        title={selectedPlugin ? `Configure ${selectedPlugin.name}` : 'Plugin Configuration'}
        centered
        size="lg"
      >
        {selectedPlugin && (
          <PluginConfigForm
            configSchema={selectedPlugin.configSchema}
            initialValues={storagePlugins.find(p => p.id === selectedPlugin.id)?.settings || {}}
            onSave={handleConfigSave}
            onCancel={handleCloseConfig}
          />
        )}
      </Modal>
      </Stack>
    </Container>
  );
} 