import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Button,
  Text,
  Card,
  Badge,
  ActionIcon,
  Box,
  Alert,
  Tabs,
  Code,
  ScrollArea,
  TextInput,
  Paper,
  Tooltip,
  LoadingOverlay,
  Divider
} from '@mantine/core';
import {
  IconSettings,
  IconExternalLink,
  IconRefresh,
  IconAlertCircle,
  IconX,
  IconEye,
  IconActivity,
  IconUser,
  IconSearch,
  IconLink,
  IconClock,
  IconGlobe,
  IconPlayerPlay,
  IconBell
} from '@tabler/icons-react';
import { getStorage } from '../shared/storage';
import { generateTraceUrl, formatTimestamp, getStatusColor, truncateUrl } from '../plugins/apm-tracing/config';

/**
 * @typedef {Object} RumSessionData
 * @property {string} [sessionId]
 * @property {string} [userId]
 * @property {any} [userInfo]
 * @property {string} [sessionReplayLink]
 * @property {boolean} isActive
 * @property {string} [error]
 */

export function TabbedPopupApp() {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rum');
  const [rumSessionData, setRumSessionData] = useState({ isActive: false });
  const [apmTraces, setApmTraces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingRum, setRefreshingRum] = useState(false);
  const [refreshingApm, setRefreshingApm] = useState(false);

  useEffect(() => {
    loadStorageData();
    loadRumSessionData();
    loadApmTraces();
  }, []);

  const loadStorageData = async () => {
    try {
      const data = await getStorage();
      setStorageData(data);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRumSessionData = async () => {
    try {
      setRefreshingRum(true);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RUM_SESSION_DATA'
      });
      
      if (response.success) {
        setRumSessionData(response.data);
      } else {
        setRumSessionData({ isActive: false, error: response.error });
      }
    } catch (error) {
      setRumSessionData({ isActive: false, error: 'Failed to load RUM session data' });
    } finally {
      setRefreshingRum(false);
    }
  };

  const loadApmTraces = async () => {
    try {
      setRefreshingApm(true);
      const response = await chrome.runtime.sendMessage({
        type: 'GET_APM_TRACES',
        filter: 'all'
      });
      
      if (response.success) {
        setApmTraces(response.traces || []);
      }
    } catch (error) {
      console.error('Failed to load APM traces:', error);
    } finally {
      setRefreshingApm(false);
    }
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const openTraceInDatadog = (traceId) => {
    const site = storageData?.credentials.site || 'us1';
    const traceUrl = generateTraceUrl(traceId, site);
    chrome.tabs.create({ url: traceUrl });
  };

  const openSessionReplay = () => {
    if (rumSessionData.sessionReplayLink) {
      chrome.tabs.create({ url: rumSessionData.sessionReplayLink });
    }
  };

  const filteredLinks = storageData?.helpfulLinks?.filter(link =>
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Box p="md" w={400} h={500}>
        <LoadingOverlay visible />
      </Box>
    );
  }

  return (
    <Box w={400} h={500}>
      {/* Header */}
      <Paper p="sm" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Box w={20} h={20} style={{ backgroundColor: '#632ca6', borderRadius: '4px' }}>
              <Text c="white" ta="center" size="xs" fw={700}>DD</Text>
            </Box>
            <Text fw={600} size="sm">Sales Engineer Toolkit</Text>
          </Group>
          <Tooltip label="Settings">
            <ActionIcon variant="subtle" onClick={openOptionsPage}>
              <IconSettings size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="default">
        <Tabs.List>
          <Tabs.Tab value="rum" leftSection={<IconUser size={16} />} flex={1}>
            RUM Session
          </Tabs.Tab>
          <Tabs.Tab value="apm" leftSection={<IconActivity size={16} />} flex={1}>
            APM Traces
          </Tabs.Tab>
          <Tabs.Tab value="events" leftSection={<IconBell size={16} />} flex={1}>
            Event Alerts
          </Tabs.Tab>
          <Tabs.Tab value="utilities" leftSection={<IconLink size={16} />} flex={1}>
            Utilities
          </Tabs.Tab>
        </Tabs.List>

        {/* RUM Session Tab */}
        <Tabs.Panel value="rum" pt="sm">
          <ScrollArea h={400} p="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>RUM Session Data</Text>
                <ActionIcon 
                  variant="subtle" 
                  onClick={loadRumSessionData}
                  loading={refreshingRum}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>

              {rumSessionData.error ? (
                <Alert color="red" icon={<IconX />}>
                  {rumSessionData.error}
                </Alert>
              ) : !rumSessionData.isActive ? (
                <Alert color="gray" icon={<IconAlertCircle />}>
                  No active RUM session found. RUM must be active on the current page.
                </Alert>
              ) : (
                <Stack gap="sm">
                  <Card withBorder p="sm">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={500} size="sm">Session Status</Text>
                        <Badge color="green" size="sm">Active</Badge>
                      </Group>
                      
                      {rumSessionData.sessionId && (
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">Session ID:</Text>
                          <Code>{rumSessionData.sessionId}</Code>
                        </Group>
                      )}
                      
                      {rumSessionData.userId && (
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">User ID:</Text>
                          <Code>{rumSessionData.userId}</Code>
                        </Group>
                      )}
                    </Stack>
                  </Card>

                  {rumSessionData.userInfo && (
                    <Card withBorder p="sm">
                      <Stack gap="xs">
                        <Text fw={500} size="sm">User Information</Text>
                        <Code block>
                          {JSON.stringify(rumSessionData.userInfo, null, 2)}
                        </Code>
                      </Stack>
                    </Card>
                  )}

                  {rumSessionData.sessionReplayLink && (
                    <Button
                      leftSection={<IconPlayerPlay size={16} />}
                      onClick={openSessionReplay}
                      color="violet"
                      fullWidth
                    >
                      Open Session Replay
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        {/* APM Traces Tab */}
        <Tabs.Panel value="apm" pt="sm">
          <ScrollArea h={400} p="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Recent APM Traces</Text>
                <Group gap="xs">
                  <Badge variant="outline" size="sm">
                    {apmTraces.length} traces
                  </Badge>
                  <ActionIcon 
                    variant="subtle" 
                    onClick={loadApmTraces}
                    loading={refreshingApm}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              {apmTraces.length === 0 ? (
                <Alert color="gray" icon={<IconAlertCircle />}>
                  No APM traces found. Network requests with Datadog trace headers will appear here.
                </Alert>
              ) : (
                <Stack gap="xs">
                  {apmTraces.slice(0, 10).map((trace) => (
                    <Card key={trace.id} withBorder p="xs">
                      <Stack gap="xs">
                        <Group justify="space-between" align="flex-start">
                          <Stack gap={2} flex={1}>
                            <Group gap="xs">
                              <Badge
                                color={getStatusColor(trace.status)}
                                size="xs"
                                variant="light"
                              >
                                {trace.method} {trace.status}
                              </Badge>
                              <Text size="xs" fw={500}>
                                {truncateUrl(trace.url, 30)}
                              </Text>
                            </Group>
                            
                            <Group gap="xs" c="dimmed">
                              <IconGlobe size={12} />
                              <Text size="xs">{trace.domain}</Text>
                              <IconClock size={12} />
                              <Text size="xs">{formatTimestamp(trace.timestamp)}</Text>
                            </Group>
                          </Stack>
                          
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => openTraceInDatadog(trace.traceId)}
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        {/* Event Alerts Tab */}
        <Tabs.Panel value="events" pt="sm">
          <ScrollArea h={400} p="sm">
            <Stack gap="md">
              <Alert color="blue" icon={<IconBell />}>
                Event Alerts functionality requires configuration in the Options page. Monitor Datadog events and receive real-time notifications.
              </Alert>
              
              <Button
                variant="light"
                leftSection={<IconSettings size={16} />}
                onClick={openOptionsPage}
                fullWidth
              >
                Configure Event Alerts
              </Button>
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        {/* Utilities Tab */}
        <Tabs.Panel value="utilities" pt="sm">
          <ScrollArea h={400} p="sm">
            <Stack gap="md">
              <Stack gap="sm">
                <Text fw={500}>Quick Search</Text>
                <TextInput
                  placeholder="Search helpful links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                />
              </Stack>

              <Stack gap="sm">
                <Text fw={500}>Helpful Links</Text>
                {filteredLinks.length === 0 ? (
                  <Alert color="gray" icon={<IconAlertCircle />}>
                    {searchQuery ? 'No links match your search.' : 'No helpful links configured.'}
                  </Alert>
                ) : (
                  <Stack gap="xs">
                    {filteredLinks.slice(0, 8).map((link) => (
                      <Card key={link.id} withBorder p="xs">
                        <Group justify="space-between" align="center">
                          <Stack gap={2} flex={1}>
                            <Text size="sm" fw={500}>{link.title}</Text>
                            {link.description && (
                              <Text size="xs" c="dimmed">{link.description}</Text>
                            )}
                          </Stack>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={() => chrome.tabs.create({ url: link.url })}
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Divider />

              <Stack gap="sm">
                <Text fw={500}>Quick Actions</Text>
                <Button
                  variant="light"
                  leftSection={<IconEye size={16} />}
                  onClick={() => chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' })}
                  size="sm"
                  fullWidth
                >
                  Inspect Current Page
                </Button>
                
                <Button
                  variant="light"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => {
                    const site = storageData?.credentials.site || 'us1';
                    const url = site === 'us1' ? 'https://app.datadoghq.com' : `https://app.datadoghq.${site}`;
                    chrome.tabs.create({ url });
                  }}
                  size="sm"
                  fullWidth
                >
                  Open Datadog App
                </Button>
              </Stack>
            </Stack>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}