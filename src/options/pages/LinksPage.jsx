import React, { useState } from 'react';
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Badge,
  Select,
  Alert,
  Anchor
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconExternalLink,
  IconInfoCircle
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { addLink, updateLink, removeLink } from '@/shared/storage';

export function LinksPage({ storageData, onRefresh }) {
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      title: '',
      url: '',
      description: '',
      category: ''
    },
    validate: {
      title: (value) => !value ? 'Title is required' : null,
      url: (value) => {
        if (!value) return 'URL is required';
        try {
          new URL(value);
          return null;
        } catch {
          return 'Invalid URL format';
        }
      }
    }
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (editingLink) {
        await updateLink(editingLink.id, values);
        notifications.show({
          title: 'Link Updated',
          message: 'The link has been updated successfully.',
          color: 'green'
        });
      } else {
        await addLink(values);
        notifications.show({
          title: 'Link Added',
          message: 'The link has been added successfully.',
          color: 'green'
        });
      }
      
      await onRefresh();
      setModalOpened(false);
      setEditingLink(null);
      form.reset();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save the link. Please try again.',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    form.setValues({
      title: link.title,
      url: link.url,
      description: link.description || '',
      category: link.category || ''
    });
    setModalOpened(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    try {
      await removeLink(id);
      await onRefresh();
      notifications.show({
        title: 'Link Deleted',
        message: 'The link has been deleted.',
        color: 'blue'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete the link.',
        color: 'red'
      });
    }
  };

  const handleAdd = () => {
    setEditingLink(null);
    form.reset();
    setModalOpened(true);
  };

  const { links = [] } = storageData || {};
  const categories = [...new Set(links.map(link => link.category).filter(Boolean))];

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2} mb="xs">Links</Title>
            <Text c="dimmed">
              Manage quick access links to frequently used resources
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAdd}
          >
            Add Link
          </Button>
        </Group>

        {links.length === 0 ? (
          <Alert icon={<IconInfoCircle size={16} />} variant="light">
            <Text size="sm">
              No links configured yet. Click "Add Link" to create your first quick access link.
            </Text>
          </Alert>
        ) : (
          <Card withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>URL</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {links.map((link) => (
                  <Table.Tr key={link.id}>
                    <Table.Td>
                      <Stack gap="xs">
                        <Text fw={500}>{link.title}</Text>
                        {link.description && (
                          <Text size="sm" c="dimmed">
                            {link.description}
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Anchor
                        href={link.url}
                        target="_blank"
                        size="sm"
                        style={{ wordBreak: 'break-all' }}
                      >
                        {link.url}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      {link.category && (
                        <Badge variant="light" size="sm">
                          {link.category}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleEdit(link)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(link.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          component="a"
                          href={link.url}
                          target="_blank"
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        {/* Add/Edit Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title={editingLink ? 'Edit Link' : 'Add New Link'}
          size="md"
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Title"
                placeholder="Enter link title"
                required
                {...form.getInputProps('title')}
              />
              
              <TextInput
                label="URL"
                placeholder="https://example.com"
                required
                {...form.getInputProps('url')}
              />
              
              <Textarea
                label="Description"
                placeholder="Optional description"
                minRows={2}
                {...form.getInputProps('description')}
              />
              
              <Select
                label="Category"
                placeholder="Select category"
                data={categories}
                searchable
                {...form.getInputProps('category')}
              />
              
              <Group justify="flex-end">
                <Button
                  variant="light"
                  onClick={() => setModalOpened(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  leftSection={editingLink ? <IconEdit size={16} /> : <IconPlus size={16} />}
                >
                  {editingLink ? 'Update' : 'Add'} Link
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Stack>
    </Container>
  );
} 