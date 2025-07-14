// Dynamic icon loader for Tabler Icons
// Validates and loads icons from @tabler/icons-react with fallback

import React from 'react';
import { 
  IconPuzzle,
  IconEye,
  IconCode, 
  IconBell,
  IconSettings,
  IconDatabase,
  IconUpload,
  IconDownload,
  IconShield,
  IconWorld,
  IconChartLine,
  IconCloud,
  IconLock,
  IconRobot,
  IconSpeedboat,
  IconActivity,
  IconAlertCircle,
  IconArchive,
  IconArrowRight,
  IconChartBar,
  IconBook,
  IconBug,
  IconCamera,
  IconCheck,
  IconCircle,
  IconCopy,
  IconEdit,
  IconFile,
  IconFolder,
  IconGlobe,
  IconHash,
  IconHome,
  IconInfoCircle,
  IconMail,
  IconMenu,
  IconNotification,
  IconPackage,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconSend,
  IconServer,
  IconShare,
  IconTerminal,
  IconTrash,
  IconUsers,
  IconWifi,
  IconX
} from '@tabler/icons-react';
import { createLogger } from '@/shared/logger';

const logger = createLogger('IconLoader');

// Pre-imported icon map for better performance and smaller bundle
const ICON_MAP = {
  'Puzzle': IconPuzzle,
  'Eye': IconEye,
  'Code': IconCode,
  'Bell': IconBell,
  'Settings': IconSettings,
  'Database': IconDatabase,
  'Upload': IconUpload,
  'Download': IconDownload,
  'Shield': IconShield,
  'World': IconWorld,
  'Chart': IconChartLine,
  'Cloud': IconCloud,
  'Lock': IconLock,
  'Robot': IconRobot,
  'Speedboat': IconSpeedboat,
  'Activity': IconActivity,
  'AlertCircle': IconAlertCircle,
  'Archive': IconArchive,
  'ArrowRight': IconArrowRight,
  'BarChart': IconChartBar,
  'Book': IconBook,
  'Bug': IconBug,
  'Camera': IconCamera,
  'Check': IconCheck,
  'Circle': IconCircle,
  'Copy': IconCopy,
  'Edit': IconEdit,
  'File': IconFile,
  'Folder': IconFolder,
  'Globe': IconGlobe,
  'Hash': IconHash,
  'Home': IconHome,
  'Info': IconInfoCircle,
  'Mail': IconMail,
  'Menu': IconMenu,
  'Notification': IconNotification,
  'Package': IconPackage,
  'Phone': IconPhone,
  'Plus': IconPlus,
  'Refresh': IconRefresh,
  'Send': IconSend,
  'Server': IconServer,
  'Share': IconShare,
  'Terminal': IconTerminal,
  'Trash': IconTrash,
  'Users': IconUsers,
  'Wifi': IconWifi,
  'X': IconX
};

/**
 * Gets an icon component from the pre-imported map
 * @param {string} iconName - Icon name without 'Icon' prefix (e.g., 'Eye', 'Speedboat')
 * @param {number} size - Icon size (default: 20)
 * @returns {React.Component} Icon component or IconPuzzle as fallback
 */
export function getIcon(iconName, size = 20) {
  if (!iconName) {
    return React.createElement(IconPuzzle, { size });
  }

  const IconComponent = ICON_MAP[iconName];
  
  if (IconComponent) {
    logger.debug(`Successfully loaded icon: Icon${iconName}`);
    return React.createElement(IconComponent, { size });
  } else {
    logger.warn(`Icon not found: Icon${iconName}. Using IconPuzzle fallback.`);
    logger.info(`Available icons: ${Object.keys(ICON_MAP).join(', ')}`);
    logger.info(`Visit https://tabler.io/icons to find more icons (add to ICON_MAP to use).`);
    return React.createElement(IconPuzzle, { size });
  }
}

/**
 * Validates if an icon exists in our pre-imported map
 * @param {string} iconName - Icon name without 'Icon' prefix
 * @returns {boolean} Whether the icon exists in our map
 */
export function validateIcon(iconName) {
  return !!ICON_MAP[iconName];
}

/**
 * Gets a list of all available icons in our map
 * @returns {string[]} Array of icon names (without 'Icon' prefix)
 */
export function getAvailableIcons() {
  return Object.keys(ICON_MAP).sort();
}

/**
 * Adds instructions for developers on how to add new icons
 */
export function getIconInstructions() {
  return {
    message: 'To add new icons, import them in icon-loader.js and add to ICON_MAP',
    reference: 'https://tabler.io/icons',
    availableIcons: getAvailableIcons(),
    example: 'To add IconCalendar: 1) Import it, 2) Add "Calendar": IconCalendar to ICON_MAP'
  };
}