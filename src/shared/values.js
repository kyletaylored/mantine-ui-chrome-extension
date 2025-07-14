/**
 * Datadog Sites Configuration and Core Values
 * Clean JavaScript implementation without TypeScript bloat
 */

// Datadog sites configuration 
export const DATADOG_SITES = [
  {
    name: 'US1',
    url: 'https://app.datadoghq.com',
    apiUrl: 'https://api.datadoghq.com',
    region: 'us1'
  },
  {
    name: 'US3', 
    url: 'https://us3.datadoghq.com',
    apiUrl: 'https://api.us3.datadoghq.com',
    region: 'us3'
  },
  {
    name: 'US5',
    url: 'https://us5.datadoghq.com', 
    apiUrl: 'https://api.us5.datadoghq.com',
    region: 'us5'
  },
  {
    name: 'EU1',
    url: 'https://app.datadoghq.eu',
    apiUrl: 'https://api.datadoghq.eu', 
    region: 'eu1'
  },
  {
    name: 'AP1',
    url: 'https://ap1.datadoghq.com',
    apiUrl: 'https://api.ap1.datadoghq.com',
    region: 'ap1'
  },
  {
    name: 'GOV',
    url: 'https://app.ddog-gov.com',
    apiUrl: 'https://api.ddog-gov.com',
    region: 'gov'
  }
];

/**
 * Get site configuration by region
 * @param {string} region - Site region (us1, eu1, etc.)
 * @returns {Object|null} Site configuration object
 */
export function getSiteConfig(region) {
  return DATADOG_SITES.find(site => site.region === region) || null;
}

/**
 * Get API URL for a region
 * @param {string} region - Site region
 * @returns {string} API URL
 */
export function getApiUrl(region = 'us1') {
  const site = getSiteConfig(region);
  return site?.apiUrl || 'https://api.datadoghq.com';
}

/**
 * Get app URL for a region
 * @param {string} region - Site region
 * @returns {string} App URL
 */
export function getAppUrl(region = 'us1') {
  const site = getSiteConfig(region);
  return site?.url || 'https://app.datadoghq.com';
}

// Default settings
export const DEFAULT_SETTINGS = {
  theme: 'light',
  defaultPage: 'dashboard',
  enableNotifications: true,
  autoValidateCredentials: true
};

// Default documents - formatted as link objects
export const DEFAULT_DOCUMENTS = [
    { 
        id: 'us1-tmap', 
        title: 'US1 (TMAP)', 
        url: 'https://docs.google.com/spreadsheets/d/1UOuazAYBYkvBf278inqHjgHm54SMLFjhe9K9jjA_dag/copy',
        description: 'Technical Mutual Action Plan for US1 region',
        category: 'core'
    },
    { 
        id: 'us3-tmap', 
        title: 'US3 (TMAP)', 
        url: 'https://docs.google.com/spreadsheets/d/1zOJWMAnhjvgeZbHbrsWSzVKLDZeMlzLGoWAsWxsfzME/copy',
        description: 'Technical Mutual Action Plan for US3 region',
        category: 'core'
    },
    { 
        id: 'us5-tmap', 
        title: 'US5 (TMAP)', 
        url: 'https://docs.google.com/spreadsheets/d/1VF4DVHVD0x_Vbre1SvpB99BH_OMZyVkJilLHV7i-HYY/copy',
        description: 'Technical Mutual Action Plan for US5 region',
        category: 'core'
    },
    { 
        id: 'eu-tmap', 
        title: 'EU (TMAP)', 
        url: 'https://docs.google.com/spreadsheets/d/1pNB0oixI0vkCLxHtCQmW3YnjexDNvitY_oMJyxXD8uU/copy',
        description: 'Technical Mutual Action Plan for EU region',
        category: 'core'
    },
    { 
        id: 'us1-tmap-spanish', 
        title: 'US1 (TMAP, Spanish)', 
        url: 'https://docs.google.com/spreadsheets/d/1ReahW0ie--FhzhUVZHvPTK7mVPid6QszgdAplMoUTJ4/copy',
        description: 'Technical Mutual Action Plan for US1 region in Spanish',
        category: 'core'
    },
    { 
        id: 'us1-tmap-portuguese', 
        title: 'US1 (TMAP, Portuguese)', 
        url: 'https://docs.google.com/spreadsheets/d/1J7XbWNf7ijx7zeW48RFU-kxVwyriSwxutjhlP0zecY8/copy',
        description: 'Technical Mutual Action Plan for US1 region in Portuguese',
        category: 'core'
    },
    { 
        id: 'security-tmap', 
        title: 'Security (TMAP)', 
        url: 'https://docs.google.com/spreadsheets/d/1dgxpe3-jc08bHkInLtKJKj2AB0I2AP6z9OOyXxcSW_c/copy',
        description: 'Technical Mutual Action Plan focused on security',
        category: 'core'
    },
    { 
        id: 'evaluation-plan', 
        title: 'Evaluation Plan', 
        url: 'https://docs.google.com/spreadsheets/d/1l6Eok9rbihVa3vaEFL40XOW7szDvcLq-iFUyg2vB8uw/copy',
        description: 'Template for customer evaluation planning',
        category: 'core'
    }
];