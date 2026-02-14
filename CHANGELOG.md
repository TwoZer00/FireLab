# [1.1.0](https://github.com/TwoZer00/FireLab/compare/v1.0.0...v1.1.0) (2026-02-14)


### Features

* add backend connection status and process cleanup ([306df9f](https://github.com/TwoZer00/FireLab/commit/306df9f32694d75fc8be4113baade0ecddc0b509))

# 1.0.0 (2026-02-14)


### Bug Fixes

* add permissions to GitHub Actions workflow ([a88cb77](https://github.com/TwoZer00/FireLab/commit/a88cb77e07ea8f6c7ef3e7fb579995e9fe608889))
* update GitHub Actions to use master branch ([fc344e2](https://github.com/TwoZer00/FireLab/commit/fc344e2faccaceb6efabc0d31cd4afcac85e71bd))


### Features

* add automatic semantic versioning ([5c1d016](https://github.com/TwoZer00/FireLab/commit/5c1d016c755ad9c5f43be1c13dd902ca5ab180b9))

# Changelog

All notable changes to FireLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initialize and manage Firebase projects
- Start/stop Firebase emulators with web UI
- Configure emulator ports (Auth, Firestore, Database, Hosting, Storage)
- Real-time log streaming with color coding
- Edit Firebase rules files (Firestore, Storage, Database)
- Inline validation for rules files
- Deploy rules to production
- Export/import emulator data between sessions
- Remote access support (run emulators on different machine)
- Persistent state (project selection, logs, config)
- Line numbers in rules editor
- Auto-detect existing Firebase projects

### Features
- Express backend with Socket.io for real-time communication
- React + Vite frontend with modern UI
- Support for both `.rules` and `.rule` file extensions
- Database rules in JSON format support
- Network-accessible emulators (0.0.0.0 binding)

## [Unreleased]

### Planned
- Multiple emulator instances
- Project management (delete/rename)
- Emulator data viewer
- Log filtering and search
- Environment variables management
