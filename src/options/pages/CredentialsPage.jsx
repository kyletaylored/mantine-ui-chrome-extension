import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  PasswordInput,
  Badge
} from '@mantine/core';
import {
  IconKey,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { getCredentials, setCredentials, clearCredentials } from '@/shared/storage';

export function CredentialsPage({ storageData, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const hasLoadedRef = useRef(false);

  const form = useForm({
    initialValues: {
      apiKey: '',
      appKey: ''
    },
    validate: {
      apiKey: (value) => !value ? 'API Key is required' : null,
      appKey: (value) => !value ? 'App Key is required' : null
    }
  });

  // Load credentials when component mounts
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    const loadCredentials = async () => {
      try {
        const credentials = await getCredentials();
        form.setValues({
          apiKey: credentials.apiKey || '',
          appKey: credentials.appKey || ''
        });
        hasLoadedRef.current = true;
      } catch (error) {
        // Silently fail on load - this is expected when no credentials exist
        hasLoadedRef.current = true;
      }
    };

    loadCredentials();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      // Save credentials without assuming region
      await setCredentials({
        apiKey: values.apiKey,
        appKey: values.appKey,
        site: '', // Let validation discover the region
        isValid: false
      });

      // Validate credentials - let it discover the region
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'VALIDATE_CREDENTIALS',
          credentials: {
            apiKey: values.apiKey,
            appKey: values.appKey
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response?.success && response?.isValid) {
        notifications.show({
          title: 'Success',
          message: 'Credentials saved and validated successfully!',
          color: 'green',
          icon: <IconCheck size={16} />
        });
        await onRefresh();
      } else {
        notifications.show({
          title: 'Invalid Credentials',
          message: 'Credentials saved but validation failed. Please check your API keys.',
          color: 'orange',
          icon: <IconX size={16} />
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to save credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFormCredentials = async () => {
    setLoading(true);
    
    try {
      await clearCredentials();
      
      form.setValues({
        apiKey: '',
        appKey: ''
      });
      
      await onRefresh();
      
      notifications.show({
        title: 'Cleared',
        message: 'Credentials have been cleared.',
        color: 'blue'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to clear credentials.',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">Datadog Credentials</Title>
          <Text c="dimmed">
            Enter your Datadog API credentials. They will be validated when saved.
          </Text>
        </div>

        {/* Current Status */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <IconKey size={20} />
              <Text fw={500}>Current Status</Text>
            </Group>
            <Badge
              color={storageData?.credentials.isValid ? 'green' : 'red'}
              variant="light"
              leftSection={storageData?.credentials.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
            >
              {storageData?.credentials.isValid ? 'Valid' : 'Invalid'}
            </Badge>
          </Group>
          
          <Text size="sm" c="dimmed">
            Region: {storageData?.credentials.site?.toUpperCase() || 'Not detected'}
          </Text>
        </Card>

        {/* Configuration Form */}
        <Card withBorder>
          <Title order={4} mb="md">Configuration</Title>
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>API Key</Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={showKeys ? <IconEyeOff size={12} /> : <IconEye size={12} />}
                    onClick={() => setShowKeys(!showKeys)}
                  >
                    {showKeys ? 'Hide' : 'Show'}
                  </Button>
                </Group>
                
                {showKeys ? (
                  <TextInput
                    placeholder="Enter your Datadog API key"
                    required
                    {...form.getInputProps('apiKey')}
                  />
                ) : (
                  <PasswordInput
                    placeholder="Enter your Datadog API key"
                    required
                    {...form.getInputProps('apiKey')}
                  />
                )}
              </Stack>

              <Stack gap="xs">
                <Text size="sm" fw={500}>Application Key</Text>
                {showKeys ? (
                  <TextInput
                    placeholder="Enter your Datadog application key"
                    required
                    {...form.getInputProps('appKey')}
                  />
                ) : (
                  <PasswordInput
                    placeholder="Enter your Datadog application key"
                    required
                    {...form.getInputProps('appKey')}
                  />
                )}
              </Stack>

              <Group justify="flex-end">
                <Button
                  variant="light"
                  color="red"
                  onClick={clearFormCredentials}
                  disabled={loading}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  leftSection={<IconCheck size={16} />}
                  loading={loading}
                >
                  Save & Validate
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Container>
  );
}