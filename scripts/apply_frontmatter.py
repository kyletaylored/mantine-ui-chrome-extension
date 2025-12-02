#!/usr/bin/env python3
import os
from pathlib import Path
import textwrap

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_ROOT = REPO_ROOT / "docs"

def prepend_frontmatter(filepath: Path, frontmatter: dict):
    """Prepend front matter to a file if it doesn't already have some."""
    if not filepath.exists():
        print(f"[WARN] File does not exist, skipping: {filepath}")
        return

    content = filepath.read_text(encoding="utf-8")

    # If it already starts with '---', assume it has front matter
    if content.lstrip().startswith("---"):
        print(f"[SKIP] Front matter already present: {filepath}")
        return

    # Build YAML front matter
    lines = ["---"]
    for key, value in frontmatter.items():
        if isinstance(value, bool):
            value_str = "true" if value else "false"
        else:
            value_str = str(value)
        lines.append(f"{key}: {value_str}")
    lines.append("---")
    lines.append("")  # blank line

    new_content = "\n".join(lines) + content
    filepath.write_text(new_content, encoding="utf-8")
    print(f"[OK] Added front matter to: {filepath}")


def create_file_if_missing(filepath: Path, content: str):
    """Create a file with given content if it doesn't exist."""
    if filepath.exists():
        print(f"[SKIP] Parent file already exists: {filepath}")
        return
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(textwrap.dedent(content).lstrip("\n"), encoding="utf-8")
    print(f"[OK] Created parent file: {filepath}")


def main():
    # 1. Parent section pages (_index.md)
    parents = {
        DOCS_ROOT / "guides" / "_index.md": {
            "frontmatter": {
                "title": "Getting Started",
                "nav_order": 2,
                "has_children": True,
            },
            "body": """
                # Getting Started

                Pick a guide below to get up and running with the Datadog Sales Engineering Toolkit.
            """,
        },
        DOCS_ROOT / "plugins" / "_index.md": {
            "frontmatter": {
                "title": "Plugins",
                "nav_order": 3,
                "has_children": True,
            },
            "body": """
                # Plugins

                Everything you need to know about the plugin system and how to extend the toolkit.
            """,
        },
        DOCS_ROOT / "core-apis" / "_index.md": {
            "frontmatter": {
                "title": "Core APIs",
                "nav_order": 4,
                "has_children": True,
            },
            "body": """
                # Core APIs

                Core services available to all plugins.
            """,
        },
        DOCS_ROOT / "architecture" / "_index.md": {
            "frontmatter": {
                "title": "System Architecture",
                "nav_order": 5,
                "has_children": True,
            },
            "body": """
                # System Architecture

                Deep dives into the extension's internals.
            """,
        },
        DOCS_ROOT / "contributing" / "_index.md": {
            "frontmatter": {
                "title": "Contributing",
                "nav_order": 6,
                "has_children": True,
            },
            "body": """
                # Contributing

                Learn how to contribute to the Datadog Sales Engineering Toolkit and its plugin ecosystem.
            """,
        },
    }

    for path, data in parents.items():
        fm = data["frontmatter"]
        body = data["body"]
        if not path.exists():
            create_file_if_missing(path, f"---\n" +
                                         "\n".join(f"{k}: {('true' if v is True else 'false' if v is False else v)}"
                                                   for k, v in fm.items()) +
                                         "\n---\n\n" +
                                         textwrap.dedent(body).lstrip("\n"))
        else:
            print(f"[INFO] Parent {path} already exists, not overwriting.")

    # 2. Individual pages front matter
    files_frontmatter = {
        DOCS_ROOT / "index.md": {
            "title": "Datadog Sales Engineering Toolkit",
            "nav_order": 1,
        },

        # Guides
        DOCS_ROOT / "guides" / "QUICK_START.md": {
            "title": "Quick Start",
            "parent": "Getting Started",
            "nav_order": 1,
        },
        DOCS_ROOT / "guides" / "HELLO_WORLD.md": {
            "title": "Hello World Plugin",
            "parent": "Getting Started",
            "nav_order": 2,
        },
        DOCS_ROOT / "guides" / "PLUGIN_DEVELOPMENT_V2.md": {
            "title": "Plugin Development (v2)",
            "parent": "Getting Started",
            "nav_order": 3,
        },

        # Plugins
        DOCS_ROOT / "plugins" / "architecture.md": {
            "title": "Plugin Architecture",
            "parent": "Plugins",
            "nav_order": 1,
        },
        DOCS_ROOT / "plugins" / "generator.md": {
            "title": "Plugin Generator",
            "parent": "Plugins",
            "nav_order": 2,
        },

        # Core APIs
        DOCS_ROOT / "core-apis" / "messages.md": {
            "title": "Messaging",
            "parent": "Core APIs",
            "nav_order": 1,
        },
        DOCS_ROOT / "core-apis" / "notifications.md": {
            "title": "Notifications",
            "parent": "Core APIs",
            "nav_order": 2,
        },
        DOCS_ROOT / "core-apis" / "storage.md": {
            "title": "Storage",
            "parent": "Core APIs",
            "nav_order": 3,
        },
        DOCS_ROOT / "core-apis" / "shared-messaging.md": {
            "title": "Shared APIs",
            "parent": "Core APIs",
            "nav_order": 4,
        },

        # Architecture
        DOCS_ROOT / "architecture" / "SYSTEM_OVERVIEW.md": {
            "title": "System Overview",
            "parent": "System Architecture",
            "nav_order": 1,
        },
        DOCS_ROOT / "architecture" / "PLUGIN_LOADER_IMPLEMENTATION.md": {
            "title": "Plugin Loader",
            "parent": "System Architecture",
            "nav_order": 2,
        },

        # Contributing root page
        DOCS_ROOT / "contributing.md": {
            "title": "Contributing Overview",
            "parent": "Contributing",
            "nav_order": 1,
        },

        # Contributing subpages
        DOCS_ROOT / "contributing" / "CONTRIBUTING_OVERVIEW.md": {
            "title": "Contribution Workflow",
            "parent": "Contributing",
            "nav_order": 2,
        },
        DOCS_ROOT / "contributing" / "CONTRIBUTING.md": {
            "title": "Contributor Guide",
            "parent": "Contributing",
            "nav_order": 3,
        },
        DOCS_ROOT / "contributing" / "PLUGIN_STANDARDS.md": {
            "title": "Plugin Standards",
            "parent": "Contributing",
            "nav_order": 4,
        },
    }

    for path, fm in files_frontmatter.items():
        prepend_frontmatter(path, fm)


if __name__ == "__main__":
    main()
