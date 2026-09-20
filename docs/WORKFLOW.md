# Capability map

| Layer | Purpose |
| --- | --- |
| `extensions/` | Adds tools, UI behavior, web/video extraction, logging, visual rendering and safety controls. |
| `skills/` | Supplies task-specific methods for teaching, PDF work, writing polish, charts and Obsidian queries. |
| `packages.json` | Pins optional supporting Pi packages such as web access, observational memory and open TUI. |

The package deliberately distributes reusable capabilities only. Each receiving agent supplies its own OAuth login, credentials, memory, profile, settings, vault path and project context.
