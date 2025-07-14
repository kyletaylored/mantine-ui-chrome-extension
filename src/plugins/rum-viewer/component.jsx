/**
 * RUM Viewer Plugin - React Component
 * Displays RUM data in the popup interface
 */

import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  Badge,
  Button,
  Alert,
  Loader,
  Divider,
  Code,
  Collapse,
  ActionIcon,
  Tooltip,
  CopyButton
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconEye,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconUser,
  IconExternalLink,
  IconCopy
} from '@tabler/icons-react';

export function RumViewerComponent() {
  const [rumData, setRumData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [detailsOpened, { toggle: toggleDetails }] = useDisclosure(false);

  // Load RUM data on component mount
  useEffect(() => {
    loadRumData();
  }, []);

  /**
   * Load RUM data from background script
   */
  const loadRumData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PLUGIN_MESSAGE',
        pluginId: 'rum-viewer',
        context: 'background',
        action: 'GET_RUM_DATA'
      });

      if (response && response.success) {
        setRumData(response.data);
        setLastUpdate(new Date());
      } else {
        setError(response?.error || 'Failed to get RUM data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh RUM data
   */
  const refreshRumData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PLUGIN_MESSAGE',
        pluginId: 'rum-viewer',
        context: 'background',
        action: 'REFRESH_RUM_DATA'
      });

      if (response && response.success) {
        setRumData(response.data);
        setLastUpdate(new Date());
      } else {
        setError(response?.error || 'Failed to refresh RUM data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render session replay link
   */
  const renderSessionReplay = () => {
    if (!rumData?.sessionReplayLink) {
      return (
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          <Text size="sm">No session replay available</Text>
        </Alert>
      );
    }

    return (
      <Card withBorder>
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">Session Replay</Text>
            <Text size="xs" c="dimmed">View user session recording</Text>
          </div>
          <Group gap="xs">
            <CopyButton value={rumData.sessionReplayLink}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                  <ActionIcon
                    color={copied ? 'green' : 'blue'}
                    variant="light"
                    onClick={copy}
                    size="sm"
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
            <Button
              size="sm"
              variant="light"
              leftSection={<IconExternalLink size={16} />}
              onClick={() => window.open(rumData.sessionReplayLink, '_blank')}
            >
              Open
            </Button>
          </Group>
        </Group>
      </Card>
    );
  };

  /**
   * Render user information
   */
  const renderUserInfo = () => {
    if (!rumData?.user) {
      return (
        <Alert color="gray" icon={<IconUser size={16} />}>
          <Text size="sm">No user information available</Text>
        </Alert>
      );
    }

    const user = rumData.user;
    
    return (
      <Card withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={500} size="sm">User Information</Text>
            <IconUser size={16} />
          </Group>
          
          {user.id && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">User ID:</Text>
              <Group gap="xs">
                <Code size="xs">{user.id}</Code>
                <CopyButton value={user.id}>
                  {({ copied, copy }) => (
                    <ActionIcon size="xs" variant="subtle" onClick={copy}>
                      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Group>
          )}
          
          {user.name && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Name:</Text>
              <Text size="xs">{user.name}</Text>
            </Group>
          )}
          
          {user.email && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Email:</Text>
              <Text size="xs">{user.email}</Text>
            </Group>
          )}
          
          {user.role && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Role:</Text>
              <Badge size="xs" variant="light">{user.role}</Badge>
            </Group>
          )}
          
          {/* Display any additional user attributes */}
          {Object.keys(user).filter(key => !['id', 'name', 'email', 'role'].includes(key)).map(key => (
            <Group key={key} justify="space-between">
              <Text size="xs" c="dimmed">{key}:</Text>
              <Text size="xs">{String(user[key])}</Text>
            </Group>
          ))}
        </Stack>
      </Card>
    );
  };

  /**
   * Render page information
   */
  const renderPageInfo = () => {
    if (!rumData) return null;

    return (
      <Card withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={500} size="sm">Page Information</Text>
            <Badge color={rumData.available ? 'green' : 'red'} size="sm">
              {rumData.available ? 'RUM Active' : 'RUM Inactive'}
            </Badge>
          </Group>
          
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Domain:</Text>
            <Text size="xs">{rumData.domain}</Text>
          </Group>
          
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Collection Time:</Text>
            <Text size="xs">{rumData.waitTime ? `${rumData.waitTime}ms` : 'N/A'}</Text>
          </Group>
          
          {rumData.source && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Data Source:</Text>
              <Badge size="xs" variant="light" color={rumData.source === 'cache' ? 'blue' : 'green'}>
                {rumData.source}
              </Badge>
            </Group>
          )}
        </Stack>
      </Card>
    );
  };

  /**
   * Render detailed information
   */
  const renderDetails = () => {
    if (!rumData) return null;

    return (
      <Card withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={500} size="sm">Technical Details</Text>
            <ActionIcon variant="subtle" size="sm" onClick={toggleDetails}>
              {detailsOpened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
          
          <Collapse in={detailsOpened}>
            <Stack gap="xs">
              <Divider />
              
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Timestamp:</Text>
                <Text size="xs">{new Date(rumData.timestamp).toLocaleString()}</Text>
              </Group>
              
              <Group justify="space-between">
                <Text size="xs" c="dimmed">URL:</Text>
                <Tooltip label={rumData.url}>
                  <Text size="xs" style={{ maxWidth: 200 }} truncate>
                    {rumData.url}
                  </Text>
                </Tooltip>
              </Group>
              
              {rumData.error && (
                <Alert color="red" size="sm">
                  <Text size="xs">{rumData.error}</Text>
                </Alert>
              )}
              
              {rumData.context && (
                <div>
                  <Text size="xs" c="dimmed" mb="xs">RUM Context:</Text>
                  <Code block size="xs" style={{ fontSize: '10px' }}>
                    {JSON.stringify(rumData.context, null, 2)}
                  </Code>
                </div>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card withBorder>
        <Stack align="center" gap="md" py="lg">
          <Loader size="md" />
          <Text size="sm" c="dimmed">Loading RUM data...</Text>
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card withBorder>
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          <Stack gap="xs">
            <Text size="sm" fw={500}>Failed to load RUM data</Text>
            <Text size="xs">{error}</Text>
            <Button size="xs" variant="light" onClick={loadRumData}>
              Try Again
            </Button>
          </Stack>
        </Alert>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="xs">
          <IconEye size={20} />
          <Text fw={500}>RUM Viewer</Text>
        </Group>
        <Group gap="xs">
          <Tooltip label="Refresh data">
            <ActionIcon variant="light" onClick={refreshRumData} disabled={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Status */}
      {rumData && (
        <Alert
          color={rumData.available ? 'green' : 'yellow'}
          icon={rumData.available ? <IconCheck size={16} /> : <IconX size={16} />}
        >
          <Text size="sm">
            {rumData.available 
              ? 'Datadog RUM is active on this page' 
              : 'Datadog RUM is not detected on this page'
            }
          </Text>
        </Alert>
      )}

      {/* Session Replay */}
      {renderSessionReplay()}

      {/* User Information */}
      {renderUserInfo()}

      {/* Page Information */}
      {renderPageInfo()}

      {/* Details */}
      {renderDetails()}

      {/* Last Update */}
      {lastUpdate && (
        <Text size="xs" c="dimmed" ta="center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      )}
    </Stack>
  );
}