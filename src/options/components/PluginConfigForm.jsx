import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Checkbox,
  Select,
  MultiSelect,
  Text,
  Alert,
  ActionIcon,
  Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconInfoCircle } from '@tabler/icons-react';
import { createLogger } from '@/shared/logger';

const logger = createLogger('PluginConfigForm');

/**
 * Dynamic form component for plugin configuration
 * Supports: string, number, boolean, array (single values or key-value pairs)
 */
export function PluginConfigForm({ configSchema, initialValues = {}, onSave, onCancel }) {
  const [arrayInputs, setArrayInputs] = useState({});

  // Initialize form with default values from schema
  const getDefaultValues = () => {
    const defaults = {};
    
    if (configSchema?.properties) {
      Object.entries(configSchema.properties).forEach(([key, property]) => {
        if (initialValues[key] !== undefined) {
          defaults[key] = initialValues[key];
        } else if (property.default !== undefined) {
          defaults[key] = property.default;
        } else {
          // Set sensible defaults based on type
          switch (property.type) {
            case 'string':
              defaults[key] = '';
              break;
            case 'number':
              defaults[key] = property.minimum || 0;
              break;
            case 'boolean':
              defaults[key] = false;
              break;
            case 'array':
              defaults[key] = [];
              break;
            default:
              defaults[key] = '';
          }
        }
      });
    }
    
    return defaults;
  };

  const form = useForm({
    initialValues: getDefaultValues(),
    validate: (values) => {
      const errors = {};
      
      if (configSchema?.properties) {
        Object.entries(configSchema.properties).forEach(([key, property]) => {
          const value = values[key];
          
          // Check required fields
          if (configSchema.required?.includes(key) && (!value || value === '')) {
            errors[key] = `${property.title || key} is required`;
          }
          
          // Type-specific validation
          if (value !== '' && value !== null && value !== undefined) {
            switch (property.type) {
              case 'string':
                if (property.minLength && value.length < property.minLength) {
                  errors[key] = `Minimum length is ${property.minLength}`;
                }
                if (property.maxLength && value.length > property.maxLength) {
                  errors[key] = `Maximum length is ${property.maxLength}`;
                }
                if (property.pattern && !new RegExp(property.pattern).test(value)) {
                  errors[key] = 'Invalid format';
                }
                break;
              case 'number':
                if (property.minimum !== undefined && value < property.minimum) {
                  errors[key] = `Minimum value is ${property.minimum}`;
                }
                if (property.maximum !== undefined && value > property.maximum) {
                  errors[key] = `Maximum value is ${property.maximum}`;
                }
                break;
            }
          }
        });
      }
      
      return errors;
    }
  });

  // Initialize array inputs for managing key-value pairs
  useEffect(() => {
    const arrayInputsState = {};
    
    if (configSchema?.properties) {
      Object.entries(configSchema.properties).forEach(([key, property]) => {
        if (property.type === 'array' && property.items?.type === 'object') {
          const currentValue = form.values[key] || [];
          arrayInputsState[key] = currentValue.length > 0 
            ? currentValue.map(item => ({ key: item.value || '', value: item.label || '' }))
            : [{ key: '', value: '' }];
        }
      });
    }
    
    setArrayInputs(arrayInputsState);
  }, [configSchema, form.values]);

  const handleSubmit = (values) => {
    // Process array fields with key-value pairs
    const processedValues = { ...values };
    
    Object.entries(arrayInputs).forEach(([fieldKey, pairs]) => {
      if (pairs && pairs.length > 0) {
        const property = configSchema.properties[fieldKey];
        if (property?.items?.type === 'object') {
          // Convert key-value pairs to {value, label} format
          processedValues[fieldKey] = pairs
            .filter(pair => pair.key.trim() !== '' || pair.value.trim() !== '')
            .map(pair => ({ value: pair.key, label: pair.value }));
        }
      }
    });
    
    logger.info('Submitting plugin configuration:', processedValues);
    onSave(processedValues);
  };

  const addArrayItem = (fieldKey) => {
    setArrayInputs(prev => ({
      ...prev,
      [fieldKey]: [...(prev[fieldKey] || []), { key: '', value: '' }]
    }));
  };

  const removeArrayItem = (fieldKey, index) => {
    setArrayInputs(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (fieldKey, index, field, value) => {
    setArrayInputs(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const renderField = (key, property) => {
    const commonProps = {
      label: property.title || key,
      description: property.description,
      required: configSchema.required?.includes(key),
      ...form.getInputProps(key)
    };

    switch (property.type) {
      case 'string': {
        // Determine if we should use TextInput or Textarea
        const isLongText = property.maxLength > 100 || property.description?.includes('long') || property.description?.includes('multiline');
        
        if (property.enum) {
          // Render as Select for enum values
          return (
            <Select
              key={key}
              {...commonProps}
              data={property.enum.map((value, index) => ({
                value: value,
                label: property.enumNames?.[index] || value
              }))}
              clearable
              searchable
            />
          );
        }
        
        if (isLongText) {
          return (
            <Textarea
              key={key}
              {...commonProps}
              minRows={3}
              maxRows={6}
              autosize
            />
          );
        }
        
        return (
          <TextInput
            key={key}
            {...commonProps}
            placeholder={property.default || ''}
          />
        );
      }

      case 'number':
        return (
          <NumberInput
            key={key}
            {...commonProps}
            min={property.minimum}
            max={property.maximum}
            step={property.multipleOf || 1}
            placeholder={property.default?.toString() || '0'}
          />
        );

      case 'boolean':
        return (
          <Checkbox
            key={key}
            {...form.getInputProps(key, { type: 'checkbox' })}
            label={property.title || key}
            description={property.description}
          />
        );

      case 'array': {
        if (property.items?.type === 'object') {
          // Key-value pairs array
          const pairs = arrayInputs[key] || [];
          
          return (
            <Box key={key}>
              <Text size="sm" fw={500} mb="xs">
                {property.title || key}
                {configSchema.required?.includes(key) && <Text span c="red"> *</Text>}
              </Text>
              {property.description && (
                <Text size="xs" c="dimmed" mb="sm">{property.description}</Text>
              )}
              
              <Stack gap="xs">
                {pairs.map((pair, index) => (
                  <Group key={index} gap="xs">
                    <TextInput
                      placeholder="Key"
                      value={pair.key}
                      onChange={(e) => updateArrayItem(key, index, 'key', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <TextInput
                      placeholder="Value"
                      value={pair.value}
                      onChange={(e) => updateArrayItem(key, index, 'value', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => removeArrayItem(key, index)}
                      disabled={pairs.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addArrayItem(key)}
                >
                  Add Item
                </Button>
              </Stack>
            </Box>
          );
        } else {
          // Simple array (single values)
          const enumOptions = property.items?.enum || [];
          
          if (enumOptions.length > 0) {
            return (
              <MultiSelect
                key={key}
                {...commonProps}
                data={enumOptions.map((value, index) => ({
                  value: value,
                  label: property.items?.enumNames?.[index] || value
                }))}
                clearable
                searchable
              />
            );
          }
          
          return (
            <MultiSelect
              key={key}
              {...commonProps}
              data={form.values[key] || []}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create ${query}`}
              onCreate={(query) => {
                const newData = [...(form.values[key] || []), query];
                form.setFieldValue(key, newData);
                return { value: query, label: query };
              }}
              clearable
            />
          );
        }
      }

      default:
        logger.warn(`Unsupported field type: ${property.type} for field: ${key}`);
        return (
          <Alert key={key} color="yellow" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              Unsupported field type "{property.type}" for field "{key}". 
              Supported types: string, number, boolean, array
            </Text>
          </Alert>
        );
    }
  };

  if (!configSchema?.properties) {
    return (
      <Alert color="blue" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          This plugin does not have any configuration options.
        </Text>
      </Alert>
    );
  }

  const fieldEntries = Object.entries(configSchema.properties);

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {fieldEntries.map(([key, property]) => (
          <div key={key}>
            {renderField(key, property)}
          </div>
        ))}

        {fieldEntries.length === 0 && (
          <Alert color="gray" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              No configuration fields defined for this plugin.
            </Text>
          </Alert>
        )}

        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Configuration
          </Button>
        </Group>
      </Stack>
    </form>
  );
}