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
