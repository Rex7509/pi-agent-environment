# Installation details

`pi install git:github.com/Rex7509/pi-agent-environment@v2.0.0` 可直接安裝這個 package 的 extensions 與 skills。根目錄的 `scripts/install.sh` 會額外安裝 [packages.json](../packages.json) 中已釘選的支援 packages。

此公開套件與安裝器不會讀取、寫入或複製：

- `~/.pi/agent/settings.json`、`auth.json`、provider OAuth 或 token
- `~/.pi/agent/sessions/`
- `~/.agent-memory/`、使用者 profile、state 或 subagent profiles
- Obsidian vault 內容

目標機器必須自行執行 Pi 的 provider login。安裝完成後，確認 `/model` 能選到你授權的 provider。
