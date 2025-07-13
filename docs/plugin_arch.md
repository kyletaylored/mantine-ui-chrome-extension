Plugin-Based Chrome Extension Architecture

---

## Overview

This guide helps you and your team build a modular Chrome extension that supports plugins with toggles, UI, and runtime injection. Each plugin is completely self-contained, auto-discovered, and can declare its own logic and permissions.

---

## Project Structure

```
/src
  /plugins
    /plugin-foo
      index.ts           # main plugin export
      content.ts         # (optional) content script logic
      background.ts      # (optional) background logic
      settings.tsx       # (optional) React component for modal UI
      render.tsx         # (optional) UI component to be rendered somewhere
  plugin-types.ts
  plugin-loader.ts
  extension-settings.tsx
  background.ts
  content.ts
```

---

## Plugin Contract

```ts
// plugin-types.ts
export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions?: string[];
  matches?: string[]; // URLs for programmatic content injection
  core?: boolean;     // if true, plugin is always enabled
  defaultEnabled: boolean;
}

export interface PluginModule {
  manifest: PluginManifest;

  // Optional: logic to run in background context
  initialize?: () => void;

  // Optional: logic to inject into webpage context
  runContentScript?: () => void;

  // Optional: UI to display in settings modal
  settingsComponent?: () => React.ReactElement;

  // Optional: UI to render inside the extension's DOM (e.g. badge, panel)
  renderComponent?: () => React.ReactElement;
}
```

---

## Plugin Example

```ts
// src/plugins/plugin-logger/index.ts
import type { PluginModule } from "../../plugin-types";
import { MyPluginUI } from "./render";
import { LoggerSettings } from "./settings";
import { runLoggerScript } from "./content";
import { initLogger } from "./background";

const plugin: PluginModule = {
  manifest: {
    id: "plugin-logger",
    name: "Logger",
    description: "Logs activity to the console",
    version: "1.0.0",
    permissions: ["storage", "tabs"],
    matches: ["*://*.example.com/*"],
    defaultEnabled: true,
    core: false,
  },
  initialize: initLogger,
  runContentScript: runLoggerScript,
  settingsComponent: LoggerSettings,
  renderComponent: MyPluginUI,
};

export default plugin;
```

---

## Loading Plugins

```ts
// plugin-loader.ts
import type { PluginModule } from "./plugin-types";

const modules = import.meta.glob("./plugins/**/index.ts", { eager: true }) as Record<
  string,
  { default: PluginModule }
>;

export const loadedPlugins: PluginModule[] = Object.values(modules).map((m) => m.default);
```

---

## Runtime Initialization

```ts
// background.ts (entrypoint)
import { loadedPlugins } from "./plugin-loader";
import { isPluginEnabled } from "./storage";

for (const plugin of loadedPlugins) {
  const enabled = plugin.manifest.core || (await isPluginEnabled(plugin.manifest.id));
  if (enabled && plugin.initialize) {
    plugin.initialize();
  }
}
```

---

## Programmatic Content Script Injection

Use [`chrome.scripting.executeScript`](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#programmatic):

```ts
// content.ts
import { loadedPlugins } from "./plugin-loader";
import { isPluginEnabled } from "./storage";

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, async (tabs) => {
    for (const plugin of loadedPlugins) {
      const enabled = plugin.manifest.core || (await isPluginEnabled(plugin.manifest.id));
      if (!enabled || !plugin.manifest.matches) continue;

      for (const tab of tabs) {
        if (tab.id && tab.url && plugin.manifest.matches.some((pattern) => tab.url?.match(pattern))) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: plugin.runContentScript,
            world: "MAIN",
          });
        }
      }
    }
  });
});
```

---

## Settings Modal UI

```tsx
// extension-settings.tsx
import { loadedPlugins } from "./plugin-loader";
import { isPluginEnabled, setPluginEnabled } from "./storage";

export const PluginSettings = () => {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const results: Record<string, boolean> = {};
      for (const plugin of loadedPlugins) {
        results[plugin.manifest.id] = plugin.manifest.core
          ? true
          : await isPluginEnabled(plugin.manifest.id);
      }
      setEnabled(results);
    })();
  }, []);

  return (
    <div>
      {loadedPlugins.map((plugin) => (
        <div key={plugin.manifest.id}>
          <label>
            <input
              type="checkbox"
              disabled={plugin.manifest.core}
              checked={enabled[plugin.manifest.id]}
              onChange={(e) => {
                setPluginEnabled(plugin.manifest.id, e.target.checked);
                setEnabled({ ...enabled, [plugin.manifest.id]: e.target.checked });
              }}
            />
            {plugin.manifest.name}
          </label>
          {plugin.settingsComponent && plugin.settingsComponent()}
        </div>
      ))}
    </div>
  );
};
```

---

## Storage Helpers

```ts
export async function isPluginEnabled(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([id], (res) => {
      resolve(res[id] ?? true);
    });
  });
}

export async function setPluginEnabled(id: string, enabled: boolean) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [id]: enabled }, resolve);
  });
}
```

---

## Plugin Permissions

Each plugin can define its required permissions in `manifest.permissions`.

You’ll need to generate your `manifest.json` by merging plugin permissions:

```ts
// manifest-generator.ts (pseudo code)
const manifest = { ...baseManifest };

for (const plugin of loadedPlugins) {
  if (plugin.manifest.permissions) {
    manifest.permissions.push(...plugin.manifest.permissions);
  }
}

fs.writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2));
```

---

## Plugin Feature Matrix

| Feature              | How It's Supported                        |
| -------------------- | ----------------------------------------- |
| Background Logic     | `plugin.initialize()`                     |
| Content Script Logic | `plugin.runContentScript()` + `matches[]` |
| Runtime UI Rendering | `plugin.renderComponent()`                |
| Settings UI          | `plugin.settingsComponent()`              |
| Required Permissions | `plugin.manifest.permissions[]`           |
| Mandatory Plugin     | `plugin.manifest.core = true`             |
| Toggling Support     | `chrome.storage.sync`                     |
