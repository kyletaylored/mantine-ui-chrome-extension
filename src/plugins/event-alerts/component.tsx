import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Tabs,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Button,
  Group,
  Stack,
  Badge,
  Card,
  ScrollArea,
  Alert,
  ActionIcon,
  Progress,
  Grid,
  Title,
} from '@mantine/core';
import { IconBell, IconSettings, IconList, IconChartBar, IconTrash, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { EventAlertsSettings, ProcessedEvent, PollingStatus, EventStats } from './types';
import { formatTimeDuration, getSeverityColor } from './config';

interface EventAlertsComponentProps {
  settings: EventAlertsSettings;
  onSettingsChange: (settings: EventAlertsSettings) => void;
  onAction: (action: string, data?: any) => void;
}

export const EventAlertsComponent: React.FC<EventAlertsComponentProps> = ({
  settings,
  onSettingsChange,
  onAction,
}) => {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    isActive: false,
    lastPoll: 0,
    nextPoll: 0,
    pollCount: 0,
    errors: 0,
  });
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    newEventsToday: 0,
    criticalEvents: 0,
    warningEvents: 0,
    infoEvents: 0,
    dismissedEvents: 0,
    averageResponseTime: 0,
  });
  const [activeTab, setActiveTab] = useState<string>('config');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadEvents();
    loadPollingStatus();
    loadStats();
    
    const interval = setInterval(() => {
      loadPollingStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    const result = await onAction('GET_EVENTS');
    if (result) setEvents(result);
  };

  const loadPollingStatus = async () => {
    const result = await onAction('GET_POLLING_STATUS');
    if (result) setPollingStatus(result);
  };

  const loadStats = async () => {
    const result = await onAction('GET_STATS');
    if (result) setStats(result);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await onAction('TEST_CONNECTION');
    } finally {
      setTesting(false);
    }
  };

  const renderConfigTab = () => (
    <Stack gap="md">
      <TextInput
        label="Monitor IDs"
        description="Comma-separated list of Datadog monitor IDs to watch"
        placeholder="123456,789012,345678"
        value={settings.monitorIds}
        onChange={(e) => onSettingsChange({ ...settings, monitorIds: e.target.value })}
        required
      />

      <Grid>
        <Grid.Col span={6}>
          <NumberInput
            label="Polling Interval (seconds)"
            description="How often to check for new events"
            min={10}
            max={300}
            value={settings.pollingInterval}
            onChange={(value) => onSettingsChange({ ...settings, pollingInterval: value || 30 })}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Notification Type"
            data={[
              { value: 'chrome', label: 'Chrome Notifications' },
              { value: 'in-page', label: 'In-Page Notifications' },
              { value: 'both', label: 'Both Chrome and In-Page' },
            ]}
            value={settings.notificationType}
            onChange={(value) => onSettingsChange({ ...settings, notificationType: value as any })}
          />
        </Grid.Col>
      </Grid>

      <TextInput
        label="Target Domains"
        description="Domains for in-page notifications (comma-separated)"
        placeholder="shopist.io,demo.datadoghq.com"
        value={settings.targetDomains}
        onChange={(e) => onSettingsChange({ ...settings, targetDomains: e.target.value })}
      />

      <Grid>
        <Grid.Col span={6}>
          <Select
            label="Alert Priority Filter"
            data={[
              { value: 'low', label: 'Low and above' },
              { value: 'normal', label: 'Normal and above' },
              { value: 'high', label: 'High only' },
            ]}
            value={settings.alertPriority}
            onChange={(value) => onSettingsChange({ ...settings, alertPriority: value as any })}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Max Events History"
            min={10}
            max={500}
            value={settings.maxEventsHistory}
            onChange={(value) => onSettingsChange({ ...settings, maxEventsHistory: value || 100 })}
          />
        </Grid.Col>
      </Grid>

      <Group>
        <Switch
          label="Enable Sound"
          checked={settings.enableSound}
          onChange={(e) => onSettingsChange({ ...settings, enableSound: e.target.checked })}
        />
        <Switch
          label="Show Event Details"
          checked={settings.showEventDetails}
          onChange={(e) => onSettingsChange({ ...settings, showEventDetails: e.target.checked })}
        />
        <Switch
          label="Auto-open Dashboard"
          checked={settings.autoOpenDashboard}
          onChange={(e) => onSettingsChange({ ...settings, autoOpenDashboard: e.target.checked })}
        />
      </Group>

      <Group>
        <Button onClick={() => onAction('START_POLLING')} disabled={pollingStatus.isActive}>
          Start Monitoring
        </Button>
        <Button onClick={() => onAction('STOP_POLLING')} disabled={!pollingStatus.isActive}>
          Stop Monitoring
        </Button>
        <Button variant="outline" onClick={handleTestConnection} loading={testing}>
          Test Connection
        </Button>
      </Group>

      {pollingStatus.isActive && (
        <Alert icon={<IconBell size={16} />} title="Monitoring Active">
          Last poll: {pollingStatus.lastPoll ? formatTimeDuration(Date.now() - pollingStatus.lastPoll) : 'Never'}<br/>
          Poll count: {pollingStatus.pollCount}<br/>
          Errors: {pollingStatus.errors}
        </Alert>
      )}
    </Stack>
  );

  const renderEventsTab = () => (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Recent Events ({events.length})</Title>
        <Group>
          <ActionIcon onClick={loadEvents} variant="outline">
            <IconRefresh size={16} />
          </ActionIcon>
          <Button 
            leftSection={<IconTrash size={16} />} 
            variant="outline" 
            color="red"
            onClick={() => onAction('CLEAR_EVENTS')}
          >
            Clear All
          </Button>
        </Group>
      </Group>

      <ScrollArea h={400}>
        <Stack gap="xs">
          {events.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No events found</Text>
          ) : (
            events.map((event) => (
              <Card key={event.id} padding="sm" withBorder>
                <Group justify="space-between">
                  <Box flex={1}>
                    <Group gap="xs">
                      <Badge color={getSeverityColor(event.severity)} size="sm">
                        {event.severity.toUpperCase()}
                      </Badge>
                      <Text size="sm" fw={500}>{event.monitorName}</Text>
                      {event.dismissed && <Badge color="gray" size="xs">Dismissed</Badge>}
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {event.message}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatTimeDuration(Date.now() - event.timestamp)}
                    </Text>
                  </Box>
                  <Group gap="xs">
                    {event.dashboardUrl && (
                      <ActionIcon 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(event.dashboardUrl, '_blank')}
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    )}
                    <ActionIcon 
                      size="sm" 
                      variant="outline" 
                      color="red"
                      onClick={() => onAction('DISMISS_EVENT', event.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );

  const renderStatsTab = () => (
    <Stack gap="md">
      <Title order={4}>Event Statistics</Title>
      
      <Grid>
        <Grid.Col span={6}>
          <Card withBorder>
            <Text size="xs" c="dimmed" mb="xs">Total Events</Text>
            <Text size="xl" fw={700}>{stats.totalEvents}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card withBorder>
            <Text size="xs" c="dimmed" mb="xs">New Today</Text>
            <Text size="xl" fw={700}>{stats.newEventsToday}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card withBorder>
            <Text size="xs" c="dimmed" mb="xs">Critical Events</Text>
            <Text size="xl" fw={700} c="red">{stats.criticalEvents}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={6}>
          <Card withBorder>
            <Text size="xs" c="dimmed" mb="xs">Warning Events</Text>
            <Text size="xl" fw={700} c="yellow">{stats.warningEvents}</Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder>
        <Text size="sm" fw={500} mb="xs">Event Distribution</Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">Critical</Text>
            <Text size="sm">{stats.criticalEvents}</Text>
          </Group>
          <Progress 
            value={stats.totalEvents ? (stats.criticalEvents / stats.totalEvents) * 100 : 0}
            color="red"
            size="sm"
          />
          
          <Group justify="space-between">
            <Text size="sm">Warning</Text>
            <Text size="sm">{stats.warningEvents}</Text>
          </Group>
          <Progress 
            value={stats.totalEvents ? (stats.warningEvents / stats.totalEvents) * 100 : 0}
            color="yellow"
            size="sm"
          />
          
          <Group justify="space-between">
            <Text size="sm">Info</Text>
            <Text size="sm">{stats.infoEvents}</Text>
          </Group>
          <Progress 
            value={stats.totalEvents ? (stats.infoEvents / stats.totalEvents) * 100 : 0}
            color="blue"
            size="sm"
          />
        </Stack>
      </Card>

      <Group justify="space-between">
        <Text size="sm">Polling Status:</Text>
        <Badge color={pollingStatus.isActive ? 'green' : 'gray'}>
          {pollingStatus.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Group>
    </Stack>
  );

  return (
    <Box>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="config" leftSection={<IconSettings size={16} />}>
            Configuration
          </Tabs.Tab>
          <Tabs.Tab value="events" leftSection={<IconList size={16} />}>
            Events
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconChart size={16} />}>
            Statistics
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="config" pt="md">
          {renderConfigTab()}
        </Tabs.Panel>

        <Tabs.Panel value="events" pt="md">
          {renderEventsTab()}
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="md">
          {renderStatsTab()}
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}; 