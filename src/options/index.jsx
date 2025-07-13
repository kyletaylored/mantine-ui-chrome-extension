import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { OptionsApp } from './OptionsApp';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <MantineProvider>
      <Notifications />
      <HashRouter>
        <OptionsApp />
      </HashRouter>
    </MantineProvider>
  </StrictMode>
);