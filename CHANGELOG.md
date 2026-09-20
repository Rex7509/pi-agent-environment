# Changelog

本專案採用 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [2.0.0] - 2026-09-20

### Added
- 公開可分享的 Pi extensions、可重用 skills、支援 package pins，以及安裝與驗證工具。

### Removed
- 所有個人／環境層設定：global instructions、使用者 profile、subagent profiles、harness 規範、模型與 theme 偏好、agent overrides。
- 安裝器對 `settings.json`、agent profiles、個人 state 的所有寫入與合併。

### Changed
- 套件只發佈 capabilities；接收者使用自己的登入、memory、設定、vault 與專案 context。
- 支援 package 清單獨立為 `packages.json`。
