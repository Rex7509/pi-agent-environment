# Pi Agent Extensions & Skills

公開、可安裝的 Pi capabilities 套件：自訂 extensions、skills，以及支援這些能力的已釘選 Pi packages。

> 不包含也不安裝 OAuth、API keys、cookies、auth/session、使用者 memory、個人 profile、subagent profiles、模型／theme 偏好、Obsidian vault 或 caches。

## 內容

- `extensions/`：網頁與影片擷取、問答／測驗、唯讀模式、視覺化、session log 等自訂功能。
- `skills/`：寫作、教學、PDF、圖表、Obsidian 查詢與其他可重用的工作方法。
- `packages.json`：支援 Pi packages 的已釘選版本；包含 web access、observational memory、open TUI 等能力。
- `scripts/`：安裝、更新、驗證與敏感資料掃描工具。

第三方授權與來源見 [NOTICE.md](NOTICE.md)。

## 安裝

前提：已安裝 `pi`、Git、Node.js 及 Python 3。目標機器需要自行完成 provider 登入。

```bash
git clone --depth 1 --branch v2.0.0 https://github.com/Rex7509/pi-agent-environment.git
cd pi-agent-environment
./scripts/install.sh --ref v2.0.0
```

安裝器只會執行 `pi install` 安裝本套件與 `packages.json` 的支援 packages；**不會**寫入或合併你的 `settings.json`，也不會新增 agent profile、全域 instructions 或個人 state。

```bash
# 僅安裝 extensions 與 skills，跳過支援 packages
./scripts/install.sh --ref v2.0.0 --skip-support-packages

# 更新到另一個發行版本
./scripts/update.sh v2.0.0
```

完成後重開 Pi 或執行 `/reload`。

## 本機開發／驗證

```bash
npm ci --ignore-scripts
./scripts/validate-package.sh
```

發布前必跑 `./scripts/audit-secrets.sh`。它是防呆，不可取代人工 code review。

## 本機設定

extensions 可能使用你的本機慣例，但不攜帶你的資料：

- Obsidian vault：設定 `OBSIDIAN_VAULT_PATH`；未設定時 `obsidian-query` 使用 macOS iCloud Obsidian 的預設路徑。
- `md-log` 預設寫到 `~/Documents/Pi agent/PiLog`；可自行調整 `extensions/md-log.ts`。
- Mermaid／SVG 會將 PNG 發布到執行中專案的 `viz/`。

## 版本規則

採用 Semantic Versioning：

- `vMAJOR.0.0`：不相容的工作流或設定變更。
- `v2.MINOR.0`：新增 skills、extensions 或可選能力。
- `v2.0.PATCH`：修正、依賴更新或安裝問題。

每次 release 應建立 Git tag、GitHub Release，並更新 [CHANGELOG.md](CHANGELOG.md)。
