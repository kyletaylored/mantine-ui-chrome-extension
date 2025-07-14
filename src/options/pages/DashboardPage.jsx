import React from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Button,
  Alert,
  SimpleGrid,
  ActionIcon,
  ThemeIcon
} from '@mantine/core';
import {
  IconKey,
  IconLink,
  IconPuzzle,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
  IconRefresh,
} from '@tabler/icons-react';

export function DashboardPage({ storageData, onRefresh }) {

  const { credentials, plugins = [], links = [] } = storageData || {};
  const enabledPlugins = plugins.filter(p => p.enabled);

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
                Last validated: {credentials?.lastValidatedAt ? 
                  new Date(credentials.lastValidatedAt).toLocaleString() : 'Never'}
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

          {/* Links */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon variant="light" color="violet">
                  <IconLink size={18} />
                </ThemeIcon>
                <Text fw={500}>Quick Links</Text>
              </Group>
              <Badge variant="light">
                {links.length} Links
              </Badge>
            </Group>
            <Stack gap="xs">
              {links.slice(0, 3).map(link => (
                <Group key={link.id} gap="xs">
                  <ActionIcon size="xs" variant="subtle" component="a" href={link.url} target="_blank">
                    <IconExternalLink size={10} />
                  </ActionIcon>
                  <Text size="sm" truncate>{link.title}</Text>
                </Group>
              ))}
              {links.length === 0 && (
                <Text size="sm" c="dimmed">No links configured</Text>
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
} 