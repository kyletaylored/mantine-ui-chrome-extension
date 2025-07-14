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
  ScrollArea,
  NumberInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconRefresh,
  IconSettings,
  IconEye,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconExternalLink,
  IconClearAll,
  IconClock,
  IconGlobe,
  IconActivity,
} from '@tabler/icons-react';
import { DEFAULT_APM_SETTINGS } from './config';
import { 
  generateTraceUrl, 
  filterTracesByStatus, 
  formatDuration, 
  formatTimestamp, 
  getStatusColor, 
  truncateUrl 
} from './config';

/**
 * @typedef {Object} APMTracingComponentProps
 * @property {Object} context - Plugin context
 */

export const APMTracingComponent = ({ context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [traces, setTraces] = useState([]);
  const [activeTab, setActiveTab] = useState('traces');
  const [refreshing, setRefreshing] = useState(false);

  // Get current plugin settings
  const currentPlugin = context.storage.plugins.find(p => p.id === 'apm-tracing');
  const pluginSettings = currentPlugin?.settings || DEFAULT_APM_SETTINGS;

  // Form for APM configuration
  const form = useForm({
    initialValues: pluginSettings,
    validate: {
      maxTraces: (value) => {
        if (value < 10 || value > 500) return 'Must be between 10 and 500';
        return null;
      },
      traceRetentionHours: (value) => {
        if (value < 1 || value > 168) return 'Must be between 1 and 168 hours';
        return null;
      },
    },
  });

  // Load traces on component mount
  useEffect(() => {
    loadTraces();
  }, []);

  // Load traces from background script
  const loadTraces = async () => {
    try {
      setRefreshing(true);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_APM_TRACES',
        filter: form.values.filterByStatus,
      });

      if (response.success) {
        setTraces(response.traces || []);
      }
    } catch (error) {
      console.error('Failed to load traces:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle form submission (save settings)
  const handleSaveSettings = async (values) => {
    try {
      setIsLoading(true);
      
      // Update plugin settings
      const updatedPlugins = context.storage.plugins.map(plugin => 
        plugin.id === 'apm-tracing' 
          ? { ...plugin, settings: values, updatedAt: Date.now() }
          : plugin
      );

      await context.updateStorage({ plugins: updatedPlugins });

      // Update monitoring settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_APM_SETTINGS',
        settings: values,
      });

      notifications.show({
        title: 'Settings Saved',
        message: 'APM tracing settings have been saved successfully',
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

  // Clear all traces
  const handleClearTraces = async () => {
    try {
      setIsLoading(true);
      await chrome.runtime.sendMessage({ type: 'CLEAR_APM_TRACES' });
      setTraces([]);
      
      notifications.show({
        title: 'Traces Cleared',
        message: 'All APM traces have been cleared',
        color: 'blue',
        icon: <IconCheck />,
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to clear traces',
        color: 'red',
        icon: <IconX />,
      });
      console.error('Failed to clear traces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open trace in Datadog
  const handleOpenTrace = (traceId) => {
    const traceUrl = generateTraceUrl(traceId, context.credentials.site);
    
    if (form.values.autoOpenTraces) {
      chrome.tabs.create({ url: traceUrl });
    } else {
      window.open(traceUrl, '_blank');
    }
  };

  // Filter traces based on current filter setting
  const filteredTraces = filterTracesByStatus(traces, form.values.filterByStatus);

  return (
    <Container size="lg" px={0}>
      <LoadingOverlay visible={isLoading} />
      
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={3}>🔍 APM Tracing</Title>
            <Text size="sm" c="dimmed">
              Monitor and track Datadog APM traces from network requests
            </Text>
          </div>
          <Group gap="xs">
            <Badge variant="outline" size="sm">
              {filteredTraces.length} traces
            </Badge>
            <Tooltip label="Refresh Traces">
              <ActionIcon variant="subtle" onClick={loadTraces} loading={refreshing}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Quick Stats */}
        <Group>
          <Paper p="sm" withBorder>
            <Group gap="xs">
              <IconActivity size={16} />
              <Text size="sm">
                Total: <Text span fw={500}>{traces.length}</Text>
              </Text>
            </Group>
          </Paper>
          <Paper p="sm" withBorder>
            <Group gap="xs">
              <IconClock size={16} />
              <Text size="sm">
                Recent: <Text span fw={500}>{traces.filter(t => Date.now() - t.timestamp < 3600000).length}</Text>
              </Text>
            </Group>
          </Paper>
        </Group>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="traces" leftSection={<IconEye size={16} />}>
              Traces
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="traces" pt="md">
            <Stack gap="md">
              {/* Filter Controls */}
              <Group justify="space-between">
                <Select
                  label="Filter by Status"
                  value={form.values.filterByStatus}
                  onChange={(value) => form.setFieldValue('filterByStatus', value)}
                  data={[
                    { value: 'all', label: 'All Status Codes' },
                    { value: '2xx', label: 'Success (2xx)' },
                    { value: '4xx', label: 'Client Errors (4xx)' },
                    { value: '5xx', label: 'Server Errors (5xx)' },
                  ]}
                  size="sm"
                />
                
                <Button
                  variant="outline"
                  color="red"
                  size="sm"
                  leftSection={<IconClearAll size={16} />}
                  onClick={handleClearTraces}
                  disabled={traces.length === 0}
                >
                  Clear All
                </Button>
              </Group>

              {/* Traces List */}
              <ScrollArea h={400}>
                <Stack gap="xs">
                  {filteredTraces.length === 0 ? (
                    <Card withBorder>
                      <Text c="dimmed" ta="center" py="xl">
                        No traces found. Network requests with Datadog trace headers will appear here.
                      </Text>
                    </Card>
                  ) : (
                    filteredTraces.map((trace) => (
                      <Card key={trace.id} withBorder padding="sm">
                        <Group justify="space-between" align="flex-start">
                          <Stack gap="xs" flex={1}>
                            <Group gap="xs">
                              <Badge
                                color={getStatusColor(trace.status)}
                                size="sm"
                                variant="light"
                              >
                                {trace.method} {trace.status}
                              </Badge>
                              <Text size="sm" fw={500}>
                                {truncateUrl(trace.url)}
                              </Text>
                            </Group>
                            
                            <Group gap="xs" c="dimmed">
                              <IconGlobe size={14} />
                              <Text size="xs">{trace.domain}</Text>
                              <IconClock size={14} />
                              <Text size="xs">{formatTimestamp(trace.timestamp)}</Text>
                              {trace.duration && (
                                <>
                                  <Text size="xs">•</Text>
                                  <Text size="xs">{formatDuration(trace.duration)}</Text>
                                </>
                              )}
                            </Group>

                            {form.values.showRequestDetails && (
                              <Code block p="xs">
                                Trace ID: {trace.traceId}
                                {trace.spanId && `\nSpan ID: ${trace.spanId}`}
                                {trace.parentId && `\nParent ID: ${trace.parentId}`}
                              </Code>
                            )}
                          </Stack>
                          
                          <Tooltip label="Open in Datadog">
                            <ActionIcon
                              variant="subtle"
                              color="violet"
                              onClick={() => handleOpenTrace(trace.traceId)}
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Card>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <form onSubmit={form.onSubmit(handleSaveSettings)}>
              <Stack gap="md">
                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Storage Settings</Text>
                    
                    <NumberInput
                      label="Maximum Traces to Store"
                      description="Maximum number of traces to keep in storage"
                      min={10}
                      max={500}
                      {...form.getInputProps('maxTraces')}
                    />
                    
                    <NumberInput
                      label="Trace Retention (Hours)"
                      description="How long to keep traces in storage"
                      min={1}
                      max={168}
                      {...form.getInputProps('traceRetentionHours')}
                    />
                  </Stack>
                </Card>

                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Monitoring Settings</Text>
                    
                    <TextInput
                      label="Monitor Domains"
                      description="Comma-separated list of domains to monitor (leave empty for all)"
                      placeholder="example.com,api.example.com"
                      {...form.getInputProps('monitorDomains')}
                    />
                    
                    <Select
                      label="Default Filter"
                      description="Default status filter for traces"
                      data={[
                        { value: 'all', label: 'All Status Codes' },
                        { value: '2xx', label: 'Success (2xx)' },
                        { value: '4xx', label: 'Client Errors (4xx)' },
                        { value: '5xx', label: 'Server Errors (5xx)' },
                      ]}
                      {...form.getInputProps('filterByStatus')}
                    />
                  </Stack>
                </Card>

                <Card withBorder>
                  <Stack gap="md">
                    <Text fw={500}>Display Settings</Text>
                    
                    <Switch
                      label="Auto-open Traces in New Tab"
                      description="Automatically open traces in new tabs when clicked"
                      {...form.getInputProps('autoOpenTraces', { type: 'checkbox' })}
                    />
                    
                    <Switch
                      label="Show Request Details"
                      description="Display detailed request information in the popup"
                      {...form.getInputProps('showRequestDetails', { type: 'checkbox' })}
                    />
                  </Stack>
                </Card>

                <Alert color="blue" icon={<IconInfoCircle />}>
                  APM tracing monitors network requests for Datadog trace headers. Only requests with valid trace headers will be captured and displayed.
                </Alert>

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