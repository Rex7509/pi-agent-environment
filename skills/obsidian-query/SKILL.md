---
name: obsidian-query
description: Search, read, or reference notes in the user's Obsidian vault (Notes). Use when the user asks to check, search, read, or quote from their Obsidian notes, paper logs, study notes, or research documents.
---

# Obsidian Query Skill

Use this skill when the user wants to reference, inspect, search, or create notes in their default Obsidian vault (`Notes`).

## Vault Information

- **Vault path:** use `$OBSIDIAN_VAULT_PATH`; if it is unset, use the macOS default `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian`.
- Before passing a vault path to a file tool, resolve it with `echo "${OBSIDIAN_VAULT_PATH:-$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian}"`.

## Best Practices & Workflows

1. **Listing available notes or folder structure:**
   ```bash
   obsidian-cli list
   obsidian-cli list "PI Logs"
   obsidian-cli list "論文"
   ```

2. **Reading a specific note:**
   ```bash
   obsidian-cli print "<note-name-or-path>"
   ```
   Or read directly via the `read` tool:
   ```text
   ${OBSIDIAN_VAULT_PATH:-$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian}/<note-name>.md
   ```

3. **Searching keywords across the entire vault:**
   Use bounded grep for instant, accurate full-text retrieval:
   ```bash
   grep -rn -i -C 2 "關鍵字" "${OBSIDIAN_VAULT_PATH:-$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian}"
   ```

4. **Opening a note in the Obsidian app:**
   ```bash
   obsidian-cli open "<note-name>"
   ```
