import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Button,
  Alert,
  SimpleGrid,
  Progress,
  ActionIcon,
  Box,
  Divider,
  List,
  ThemeIcon
} from '@mantine/core';
import {
  IconDashboard,
  IconKey,
  IconLink,
  IconPuzzle,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconExternalLink,
  IconRefresh,
  IconEye,
  IconUsers,
  IconActivity
} from '@tabler/icons-react';
import { ExtensionStorage } from '@/types';

interface DashboardPageProps {
  storageData: ExtensionStorage | null;
  onRefresh: () => Promise<void>;
}

export function DashboardPage({ storageData, onRefresh }: DashboardPageProps) {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [pageInfo, setPageInfo] = useState<any>(null);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
        if (response.success) {
          setCurrentTab(response.data);
          // Get page info if available
          getPageInfo(response.data.id);
        }
      } catch (error) {
        console.error('Failed to get current tab:', error);
      }
    };

    getCurrentTab();
  }, []);

  const getPageInfo = async (tabId: number) => {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' });
      if (response.success) {
        setPageInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to get page info:', error);
    }
  };

  const inspectCurrentPage = async () => {
    if (!currentTab) return;
    
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id!, { type: 'COLLECT_PERFORMANCE_DATA' });
      if (response.success) {
        console.log('Performance data:', response.data);
      }
    } catch (error) {
      console.error('Failed to collect performance data:', error);
    }
  };

  const { credentials, plugins = [], helpfulLinks = [], settings } = storageData || {};
  const enabledPlugins = plugins.filter(p => p.enabled);
  const completionPercentage = [
    credentials?.apiKey ? 25 : 0,
    credentials?.appKey ? 25 : 0,
    credentials?.isValid ? 25 : 0,
    plugins.length > 0 ? 25 : 0
  ].reduce((sum, val) => sum + val, 0);

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} mb="xs">Dashboard</Title>
            <Text c="dimmed">
              Welcome to your Datadog Sales Engineering Toolkit
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </Group>

        {/* Setup Progress */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Setup Progress</Title>
            <Badge variant="light" color={completionPercentage === 100 ? 'green' : 'blue'}>
              {completionPercentage}% Complete
            </Badge>
          </Group>
          <Progress value={completionPercentage} size="lg" mb="md" />
          <SimpleGrid cols={2} spacing="xs">
            <Group gap="xs">
              <ThemeIcon size="sm" color={credentials?.apiKey ? 'green' : 'gray'} variant="light">
                {credentials?.apiKey ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
              <Text size="sm">API Key</Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" color={credentials?.appKey ? 'green' : 'gray'} variant="light">
                {credentials?.appKey ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
              <Text size="sm">App Key</Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" color={credentials?.isValid ? 'green' : 'gray'} variant="light">
                {credentials?.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
              <Text size="sm">Validation</Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" color={plugins.length > 0 ? 'green' : 'gray'} variant="light">
                {plugins.length > 0 ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
              <Text size="sm">Plugins</Text>
            </Group>
          </SimpleGrid>
        </Card>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {/* Credentials Status */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon variant="light" color="blue">
                  <IconKey size={18} />
                </ThemeIcon>
                <Text fw={500}>Credentials</Text>
              </Group>
              <Badge
                color={credentials?.isValid ? 'green' : 'red'}
                variant="light"
              >
                {credentials?.isValid ? 'Valid' : 'Invalid'}
              </Badge>
            </Group>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Site: {credentials?.site?.toUpperCase() || 'Not configured'}
              </Text>
              <Text size="sm" c="dimmed">
                Last validated: {credentials?.validatedAt ? 
                  new Date(credentials.validatedAt).toLocaleString() : 'Never'}
              </Text>
            </Stack>
          </Card>

          {/* Plugins Status */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon variant="light" color="green">
                  <IconPuzzle size={18} />
                </ThemeIcon>
                <Text fw={500}>Plugins</Text>
              </Group>
              <Badge variant="light">
                {enabledPlugins.length} / {plugins.length} Active
              </Badge>
            </Group>
            <Stack gap="xs">
              {enabledPlugins.slice(0, 3).map(plugin => (
                <Group key={plugin.id} gap="xs">
                  <ThemeIcon size="xs" color="green" variant="light">
                    <IconCheck size={10} />
                  </ThemeIcon>
                  <Text size="sm">{plugin.name}</Text>
                </Group>
              ))}
              {enabledPlugins.length === 0 && (
                <Text size="sm" c="dimmed">No active plugins</Text>
              )}
            </Stack>
          </Card>

          {/* Helpful Links */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon variant="light" color="violet">
                  <IconLink size={18} />
                </ThemeIcon>
                <Text fw={500}>Quick Links</Text>
              </Group>
              <Badge variant="light">
                {helpfulLinks.length} Links
              </Badge>
            </Group>
            <Stack gap="xs">
              {helpfulLinks.slice(0, 3).map(link => (
                <Group key={link.id} gap="xs">
                  <ActionIcon size="xs" variant="subtle" component="a" href={link.url} target="_blank">
                    <IconExternalLink size={10} />
                  </ActionIcon>
                  <Text size="sm" truncate>{link.title}</Text>
                </Group>
              ))}
              {helpfulLinks.length === 0 && (
                <Text size="sm" c="dimmed">No links configured</Text>
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Current Page Information */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon variant="light" color="orange">
                <IconEye size={18} />
              </ThemeIcon>
              <Text fw={500}>Current Page</Text>
            </Group>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconActivity size={14} />}
              onClick={inspectCurrentPage}
            >
              Inspect
            </Button>
          </Group>
          {currentTab ? (
            <Stack gap="xs">
              <Text size="sm" fw={500} truncate>{currentTab.title}</Text>
              <Text size="sm" c="dimmed" truncate>{currentTab.url}</Text>
              {pageInfo && (
                <Group gap="md">
                  <Badge variant="light" color={pageInfo.hasDatadog.rum ? 'green' : 'gray'}>
                    RUM: {pageInfo.hasDatadog.rum ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant="light" color={pageInfo.hasDatadog.logs ? 'green' : 'gray'}>
                    Logs: {pageInfo.hasDatadog.logs ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant="light" color={pageInfo.hasDatadog.apm ? 'green' : 'gray'}>
                    APM: {pageInfo.hasDatadog.apm ? 'Yes' : 'No'}
                  </Badge>
                </Group>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">No active tab</Text>
          )}
        </Card>

        {/* Configuration Warning */}
        {!credentials?.isValid && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Configuration Required"
            color="yellow"
            variant="light"
          >
            <Text size="sm">
              Please configure your Datadog API credentials in the Credentials section to enable full functionality.
            </Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
} 