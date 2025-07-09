import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Alert,
  TextInput,
  PasswordInput,
  Badge,
  LoadingOverlay,
  List,
  Code,
  Notification
} from '@mantine/core';
import {
  IconKey,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconRefresh,
  IconEye,
  IconEyeOff,
  IconInfoCircle
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ExtensionStorage } from '@/types';
import { storage } from '@/shared/storage';

// Debug logging helper
const debugLog = (operation: string, messageType: string, data?: any) => {
  console.log(`[CredentialsPage Debug] ${operation} - ${messageType}`, data);
};

interface CredentialsPageProps {
  storageData: ExtensionStorage | null;
  onRefresh: () => Promise<void>;
}

export function CredentialsPage({ storageData, onRefresh }: CredentialsPageProps) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [notification, setNotification] = useState<{ message: string; color: string } | null>(null);

  const form = useForm({
    initialValues: {
      apiKey: storageData?.credentials.apiKey || '',
      appKey: storageData?.credentials.appKey || ''
    },
    validate: {
      apiKey: (value) => {
        if (!value) return 'API Key is required';
        if (!/^[a-f0-9]{32}$/.test(value)) return 'API Key must be 32 hex characters';
        return null;
      },
      appKey: (value) => {
        if (!value) return 'App Key is required';
        if (!/^[a-f0-9]{40}$/.test(value)) return 'App Key must be 40 hex characters';
        return null;
      }
    }
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const storageData = await storage.get();
      
      if (storageData.credentials.apiKey) {
        form.setValues({
          apiKey: storageData.credentials.apiKey,
          appKey: storageData.credentials.appKey || ''
        });
        setNotification({ message: 'Credentials loaded successfully', color: 'green' });
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
      setNotification({ message: 'Failed to load credentials', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    debugLog('SUBMIT', 'SAVE_CREDENTIALS', { apiKeyLength: values.apiKey.length, appKeyLength: values.appKey.length });
    
    try {
      const credentials = {
        apiKey: values.apiKey,
        appKey: values.appKey,
        site: storageData?.credentials.site || 'us1', // Keep existing site or default
        isValid: false
      };

      await storage.setCredentials(credentials);
      await onRefresh();
      
      debugLog('SUCCESS', 'SAVE_CREDENTIALS', { success: true });
      notifications.show({
        title: 'Credentials Saved',
        message: 'Your Datadog credentials have been saved successfully.',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error) {
      debugLog('ERROR', 'SAVE_CREDENTIALS', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save credentials. Please try again.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setLoading(false);
    }
  };

  const validateCredentials = async () => {
    if (!form.values.apiKey || !form.values.appKey) {
      debugLog('ERROR', 'VALIDATE_CREDENTIALS', 'Missing credentials');
      notifications.show({
        title: 'Missing Credentials',
        message: 'Please enter both API Key and App Key before validating.',
        color: 'yellow',
        icon: <IconAlertCircle size={16} />
      });
      return;
    }

    setValidating(true);
    debugLog('START', 'VALIDATE_CREDENTIALS', { 
      apiKeyLength: form.values.apiKey.length, 
      appKeyLength: form.values.appKey.length 
    });
    
    try {
      const credentials = {
        apiKey: form.values.apiKey,
        appKey: form.values.appKey,
        site: storageData?.credentials.site || 'us1', // Keep existing site or default
        isValid: false
      };

      // Save first, then validate
      await storage.setCredentials(credentials);
      debugLog('SAVED', 'VALIDATE_CREDENTIALS', 'Credentials saved to storage');
      
      // Use standard Chrome messaging
      debugLog('SENDING', 'VALIDATE_CREDENTIALS', 'About to send message to background');
      
      const response = await new Promise<{ success: boolean; isValid: boolean; error?: string }>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'VALIDATE_CREDENTIALS',
            credentials
          },
          (response) => {
            if (chrome.runtime.lastError) {
              debugLog('ERROR', 'VALIDATE_CREDENTIALS', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              debugLog('RESPONSE', 'VALIDATE_CREDENTIALS', response);
              resolve(response);
            }
          }
        );
      });

      if (response.success && response.isValid) {
        // Reload credentials to get the detected site
        await onRefresh();
        const updatedData = await storage.get();
        
        debugLog('SUCCESS', 'VALIDATE_CREDENTIALS', { 
          isValid: true, 
          site: updatedData.credentials.site 
        });
        
        notifications.show({
          title: 'Validation Successful',
          message: `Your Datadog credentials are valid! Connected to ${updatedData.credentials.site?.toUpperCase()} region.`,
          color: 'green',
          icon: <IconCheck size={16} />
        });
      } else {
        debugLog('FAILED', 'VALIDATE_CREDENTIALS', { isValid: false });
        notifications.show({
          title: 'Validation Failed',
          message: 'Unable to validate credentials. Please check your API keys.',
          color: 'red',
          icon: <IconX size={16} />
        });
      }
      
    } catch (error) {
      debugLog('ERROR', 'VALIDATE_CREDENTIALS', error);
      notifications.show({
        title: 'Validation Error',
        message: `An error occurred while validating credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setValidating(false);
    }
  };

  const clearCredentials = async () => {
    setLoading(true);
    debugLog('START', 'CLEAR_CREDENTIALS', {});
    
    try {
      await storage.setCredentials({
        apiKey: '',
        appKey: '',
        site: 'us1',
        isValid: false
      });
      
      form.setValues({
        apiKey: '',
        appKey: ''
      });
      
      await onRefresh();
      
      debugLog('SUCCESS', 'CLEAR_CREDENTIALS', {});
      notifications.show({
        title: 'Credentials Cleared',
        message: 'Your Datadog credentials have been cleared.',
        color: 'blue',
        icon: <IconInfoCircle size={16} />
      });
    } catch (error) {
      debugLog('ERROR', 'CLEAR_CREDENTIALS', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to clear credentials.',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible />
      </div>
    );
  }

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">Datadog Credentials</Title>
          <Text c="dimmed">
            Enter your Datadog API credentials. The region will be auto-detected during validation.
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
          
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm">Region:</Text>
              <Code>{storageData?.credentials.site?.toUpperCase() || 'Not detected'}</Code>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Last validated:</Text>
              <Text size="sm" c="dimmed">
                {storageData?.credentials.validatedAt 
                  ? new Date(storageData.credentials.validatedAt).toLocaleString()
                  : 'Never'
                }
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Configuration Form */}
        <Card withBorder>
          <LoadingOverlay visible={loading} />
          
          <Title order={4} mb="md">Configuration</Title>
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Alert icon={<IconInfoCircle size={16} />} variant="light">
                <Text size="sm">
                  The Datadog region will be automatically detected when you validate your credentials.
                  We'll test all regions to find the correct one for your API keys.
                </Text>
              </Alert>

              <Stack gap="xs">
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>API Key</Text>
                    <Text size="xs" c="dimmed">32-character hexadecimal key</Text>
                  </div>
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
                <div>
                  <Text size="sm" fw={500}>Application Key</Text>
                  <Text size="xs" c="dimmed">40-character hexadecimal key</Text>
                </div>
                
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
                  onClick={clearCredentials}
                  disabled={loading}
                >
                  Clear
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={validateCredentials}
                  loading={validating}
                  disabled={!form.values.apiKey || !form.values.appKey}
                >
                  Validate
                </Button>
                <Button
                  type="submit"
                  leftSection={<IconCheck size={16} />}
                  loading={loading}
                >
                  Save
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        {/* Instructions */}
        <Card withBorder>
          <Title order={4} mb="md">How to Get Your API Keys</Title>
          <Stack gap="sm">
            <Text size="sm">
              To use this extension, you'll need to create API keys in your Datadog account:
            </Text>
            <List size="sm" spacing="xs">
              <List.Item>
                Log in to your Datadog account
              </List.Item>
              <List.Item>
                Go to <strong>Organization Settings</strong> → <strong>API Keys</strong>
              </List.Item>
              <List.Item>
                Create a new API key or copy an existing one
              </List.Item>
              <List.Item>
                Go to <strong>Organization Settings</strong> → <strong>Application Keys</strong>
              </List.Item>
              <List.Item>
                Create a new application key or copy an existing one
              </List.Item>
              <List.Item>
                Enter both keys in the form above and click <strong>Validate</strong>
              </List.Item>
              <List.Item>
                The extension will automatically detect your Datadog region
              </List.Item>
            </List>
          </Stack>
        </Card>

        {notification && (
          <Notification
            color={notification.color}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Notification>
        )}
      </Stack>
    </Container>
  );
} 