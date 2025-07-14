import { DATADOG_SITES } from '@/shared/values';
import { createLogger } from '@/shared/logger';

const logger = createLogger('CredentialValidator');

/**
 * Validate Datadog credentials by auto-discovering the correct region
 * This function can be called directly without going through the messaging system
 * 
 * @param {Object} credentials - Raw credentials object
 * @param {string} credentials.apiKey - Datadog API key
 * @param {string} credentials.appKey - Datadog Application key
 * @returns {Promise<Object|null>} Validated credentials with site info, or null if invalid
 */
export async function validateDatadogCredentials(credentials) {
  logger.info('Auto-discovering Datadog region for credentials...');

  if (!credentials.apiKey || !credentials.appKey) {
    logger.error('Missing API key or Application key');
    return null;
  }

  for (const site of DATADOG_SITES) {
    try {
      logger.info(`Testing credentials for ${site.name} (${site.region})...`);

      const response = await fetch(`${site.apiUrl}/api/v2/validate_keys`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': credentials.apiKey,
          'DD-APPLICATION-KEY': credentials.appKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.info(`${site.name} returned HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      if (json?.status === 'ok') {
        const validated = {
          ...credentials,
          site: site.region,
          isValid: true,
          lastValidatedAt: Date.now(),
        };

        logger.info(`✓ Credentials validated for ${site.name}`);
        return validated;
      } else {
        logger.info(`${site.name} validation failed:`, json);
      }
    } catch (err) {
      logger.info(`Validation error for ${site.name}:`, err);
    }
  }

  logger.info('✗ All Datadog regions rejected credentials.');
  return null;
}