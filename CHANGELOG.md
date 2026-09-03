## <small>1.20.2 (2026-09-03)</small>

* fix: use script pty wrapper for firebase login:ci in Docker/non-TTY ([56d2d44e53aa17cf78a3404744d059c7b7b3d97a](https://github.com/TwoZer00/FireLab/commit/56d2d44e53aa17cf78a3404744d059c7b7b3d97a))

## <small>1.20.1 (2026-09-03)</small>

* fix: use firebase login:ci for non-interactive environments ([eb4c44236d54ed09632cfe6d915d0229b9fb68ff](https://github.com/TwoZer00/FireLab/commit/eb4c44236d54ed09632cfe6d915d0229b9fb68ff))

## 1.20.0 (2026-09-03)

* feat: link local project to Firebase cloud project ID via dropdown ([77cb9f585ac7d19ef58d826d8af1105f4c2b8c2d](https://github.com/TwoZer00/FireLab/commit/77cb9f585ac7d19ef58d826d8af1105f4c2b8c2d))

## <small>1.19.4 (2026-08-11)</small>

* fix: create emulator-data dir before export to prevent ENOENT ([d7fa7fbdca903fb597226967c65d4d0d43553bd3](https://github.com/TwoZer00/FireLab/commit/d7fa7fbdca903fb597226967c65d4d0d43553bd3))

## <small>1.19.3 (2026-08-11)</small>

* fix: ensure hub in firebase.json for export and fix start endpoint indentation ([356894adf6c91ea491518d0d169c8c6a77ddfec6](https://github.com/TwoZer00/FireLab/commit/356894adf6c91ea491518d0d169c8c6a77ddfec6))
* fix: remove underline from ANSI SGR4 tags in log lines ([71333e4a6a2fdedc0b9c98fb61be204e6619c4a4](https://github.com/TwoZer00/FireLab/commit/71333e4a6a2fdedc0b9c98fb61be204e6619c4a4))

## <small>1.19.2 (2026-08-11)</small>

* fix: await export completion before killing emulator on stop ([aeb1dbc136a475671b93a172bfbe278b95631210](https://github.com/TwoZer00/FireLab/commit/aeb1dbc136a475671b93a172bfbe278b95631210))

## <small>1.19.1 (2026-08-11)</small>

* fix: strip OSC 8 hyperlink sequences to prevent entire log lines being underlined ([f5f271b77aba850f4a7cd278cc1650c5401cda6d](https://github.com/TwoZer00/FireLab/commit/f5f271b77aba850f4a7cd278cc1650c5401cda6d))
* chore: normalize FORCE_COLOR to 1, remove leftover COLORTERM ([e43d2e6201848afea8a40cfbe5b8d0db5e70dc0e](https://github.com/TwoZer00/FireLab/commit/e43d2e6201848afea8a40cfbe5b8d0db5e70dc0e))

## 1.19.0 (2026-08-10)

* feat: merge allow/deny debug filters into single Rules Eval filter ([63ebc4bd8316c8fb87aaa8fbcb6d0423dd029101](https://github.com/TwoZer00/FireLab/commit/63ebc4bd8316c8fb87aaa8fbcb6d0423dd029101))

## <small>1.18.6 (2026-08-10)</small>

* fix: remove --debug flag to restore Firebase CLI colored table output ([96109b62002fc37a97357445a66a231723e465ad](https://github.com/TwoZer00/FireLab/commit/96109b62002fc37a97357445a66a231723e465ad))

## <small>1.18.5 (2026-08-10)</small>

* fix: skip color classification for Firebase table lines with box-drawing chars ([b7b4ec809535e6c35ddc7c180072252eb3d56d47](https://github.com/TwoZer00/FireLab/commit/b7b4ec809535e6c35ddc7c180072252eb3d56d47))

## <small>1.18.4 (2026-08-10)</small>

* fix: add FIREBASE_EMULATOR_HUB to export commands and fix overly aggressive debug filter ([0c70071bdc4543488570f5a860802ee49b3559a2](https://github.com/TwoZer00/FireLab/commit/0c70071bdc4543488570f5a860802ee49b3559a2))

## <small>1.18.3 (2026-08-10)</small>

* fix: filter debug noise line-by-line to preserve emulator table styling ([2ccbb14b06f7abf2261b3d4b5ec500e340765ae9](https://github.com/TwoZer00/FireLab/commit/2ccbb14b06f7abf2261b3d4b5ec500e340765ae9))

## <small>1.18.2 (2026-08-10)</small>

* chore: add coverage/ to .gitignore ([f1ff7c137e6c52ce09aada7069e335ad968c8bf5](https://github.com/TwoZer00/FireLab/commit/f1ff7c137e6c52ce09aada7069e335ad968c8bf5))
* fix: filter debug noise from socket logs to restore emulator table styling ([5536e893947cec5d31f7ef2b7444d265ea54f749](https://github.com/TwoZer00/FireLab/commit/5536e893947cec5d31f7ef2b7444d265ea54f749))

## <small>1.18.1 (2026-08-10)</small>

* fix: changelog link pointing to master branch instead of main ([a577a459e0832b73dac01388e2dc0164c8e402ce](https://github.com/TwoZer00/FireLab/commit/a577a459e0832b73dac01388e2dc0164c8e402ce))
* docs: improve SEO - og:locale, image dimensions, alt texts, main element, nav aria-label, sitemap, robots.txt, enriched Schema.org ([18607a2112137c0804ae2a07323d6719d7a9229a](https://github.com/TwoZer00/FireLab/commit/18607a2112137c0804ae2a07323d6719d7a9229a))
* docs: version badge now fetched dynamically from GitHub releases API ([f9fa40644f8216251571d680431cfb84fa671db2](https://github.com/TwoZer00/FireLab/commit/f9fa40644f8216251571d680431cfb84fa671db2))

## 1.18.0 (2026-08-10)

* feat: add backend test suite, always-on debug logging, Firebase login flow, and auth improvements ([3157e97d8f39954be8f301e504a8543fa570ecda](https://github.com/TwoZer00/FireLab/commit/3157e97d8f39954be8f301e504a8543fa570ecda))
* docs: add interactive mode, update and exec instructions for Docker ([96b0e26fbd7b74bd9ebcc025a1f64250ab8b24e4](https://github.com/TwoZer00/FireLab/commit/96b0e26fbd7b74bd9ebcc025a1f64250ab8b24e4))
* docs: improve project description to reflect full-stack nature ([daf4d432cd674b2d3c5974ac35c83c6d60de4a85](https://github.com/TwoZer00/FireLab/commit/daf4d432cd674b2d3c5974ac35c83c6d60de4a85))

## 1.18.0 (2026-08-10)

* feat: add backend integration test suite with 62 tests and coverage reporting
* refactor: export app/httpServer from server.js and move listen() behind isMain guard to enable testing
* refactor: export tokensFile from auth.js for test isolation
* test: api.test.js — integration tests for all HTTP endpoints (auth, projects, config, rules, history, indexes, snapshots, emulator guards, export, debug-log, clear, services, connections)
* test: auth.test.js — unit tests for authMiddleware, generateToken, checkUsernameExists covering revocation, cache invalidation, and token lifecycle
* test: security.test.js — unit tests for safeJoin and validateSegment path traversal guards
* chore: add vitest + supertest devDependencies, vitest.config.js with sequential execution to prevent token file race conditions

* fix: docker entrypoint, port range, docs screenshots section and readme corrections ([9d2c82c6bded1c78c4ccf073fb6d120eb3ff69b9](https://github.com/TwoZer00/FireLab/commit/9d2c82c6bded1c78c4ccf073fb6d120eb3ff69b9))
* fix: patch path traversal and input validation in all API endpoints ([505418bfe0151fb356789483d2f33bf3154e76ea](https://github.com/TwoZer00/FireLab/commit/505418bfe0151fb356789483d2f33bf3154e76ea))
* feat: add manage services UI to ConfigEditor ([acd715a895820a7444b1bcde8ec0d8a6d854e89a](https://github.com/TwoZer00/FireLab/commit/acd715a895820a7444b1bcde8ec0d8a6d854e89a))
* docs: update README, Docker guide, backend setup, and landing page ([391873acbcdb31461c5c6220b441a254e08f374f](https://github.com/TwoZer00/FireLab/commit/391873acbcdb31461c5c6220b441a254e08f374f))
* refactor: improve UI styling and enable ANSI color output ([2da0a96b1cb13db65cac2164fff5d80e6fb46133](https://github.com/TwoZer00/FireLab/commit/2da0a96b1cb13db65cac2164fff5d80e6fb46133))

## <small>1.16.1 (2026-05-20)</small>

* revert: remove --host flag from emulator start command ([f71c8eafc5c76b9203709fbe292064f620353fb5](https://github.com/TwoZer00/FireLab/commit/f71c8eafc5c76b9203709fbe292064f620353fb5))
* fix: improve Docker container startup and CLI handling ([39c64430d3c077c186ca989dc06dc82c0dba0af9](https://github.com/TwoZer00/FireLab/commit/39c64430d3c077c186ca989dc06dc82c0dba0af9))

## 1.16.0 (2026-05-20)

* feat: add configurable emulator host binding ([2ad1367f7659bf0e63d0cf3b414103536aa4f589](https://github.com/TwoZer00/FireLab/commit/2ad1367f7659bf0e63d0cf3b414103536aa4f589))

## <small>1.15.4 (2026-05-20)</small>

* fix: persist auth tokens in volume and ensure projects dir exists ([c811687cdbc28af6806ce3e44c25c99f76970647](https://github.com/TwoZer00/FireLab/commit/c811687cdbc28af6806ce3e44c25c99f76970647))

## <small>1.15.3 (2026-05-20)</small>

* fix: add Java runtime and utilities to Docker images ([0d74ba1a9fa6f9a39ef16b0fe778164c8d40f4bd](https://github.com/TwoZer00/FireLab/commit/0d74ba1a9fa6f9a39ef16b0fe778164c8d40f4bd))
* fix: resolve projects directory path and sticky sidebar layout ([5983166a632fc3364bc0f0115b4d3cdd77b2c00a](https://github.com/TwoZer00/FireLab/commit/5983166a632fc3364bc0f0115b4d3cdd77b2c00a))
* fix: use node-based healthcheck and correct port ranges ([0aca94b7bba343513b7d48a91a29c7a269e756bb](https://github.com/TwoZer00/FireLab/commit/0aca94b7bba343513b7d48a91a29c7a269e756bb))

## <small>1.15.2 (2026-05-20)</small>

* fix: add unauthenticated health check endpoint for Docker healthcheck ([379ed83b1f81bc26bd7444e2e99f2bb6742f19f3](https://github.com/TwoZer00/FireLab/commit/379ed83b1f81bc26bd7444e2e99f2bb6742f19f3))
* docs: update backend setup, Docker guide, and landing page ([0b647fd57305c8cf3c0c3c031f20d1bcd2f85145](https://github.com/TwoZer00/FireLab/commit/0b647fd57305c8cf3c0c3c031f20d1bcd2f85145))

## <small>1.15.1 (2026-05-19)</small>

* fix: improve security and unified deployment compatibility ([c4a7ef9942f23eb2e12415b27895f265dd671f29](https://github.com/TwoZer00/FireLab/commit/c4a7ef9942f23eb2e12415b27895f265dd671f29))

## 1.15.0 (2026-05-19)

* feat: add Firestore indexes editor and fetch production rules/indexes ([78b791effc0a7011a2b83d7704ad5604e47c2ef8](https://github.com/TwoZer00/FireLab/commit/78b791effc0a7011a2b83d7704ad5604e47c2ef8))
* feat: add unified single-container Docker deployment ([58ad73ecb65a7709852d76f1e2e62a09f8e3f570](https://github.com/TwoZer00/FireLab/commit/58ad73ecb65a7709852d76f1e2e62a09f8e3f570))
* minor fix ([60bccbe875987e8ccf0e02c1fbfcf7a491d6bc25](https://github.com/TwoZer00/FireLab/commit/60bccbe875987e8ccf0e02c1fbfcf7a491d6bc25))
* docs: add comprehensive Docker documentation to README ([aa1aa888afb7ad84258496484a12231868ee203f](https://github.com/TwoZer00/FireLab/commit/aa1aa888afb7ad84258496484a12231868ee203f))
* docs: add Docker Hub image option to quick start ([e9e3faa5aa56046ecb51b8f1f11e62f8e5c72378](https://github.com/TwoZer00/FireLab/commit/e9e3faa5aa56046ecb51b8f1f11e62f8e5c72378))
* docs: add git clone step for Docker Compose in landing page ([520ad51490e066f72d4a8ed06730cc3d199acff3](https://github.com/TwoZer00/FireLab/commit/520ad51490e066f72d4a8ed06730cc3d199acff3))
* docs: add key features to landing page ([aed708192b1cb58e4bd2fa4ad240dc7843bcd387](https://github.com/TwoZer00/FireLab/commit/aed708192b1cb58e4bd2fa4ad240dc7843bcd387))
* docs: fix features section styling and positioning ([35d316c81566333d0b746217dcbbaa3b23bbace7](https://github.com/TwoZer00/FireLab/commit/35d316c81566333d0b746217dcbbaa3b23bbace7))
* docs: improve landing page SEO and add developer pain points section ([9e1bb5eac86ba2f891b60b0ff69689b1453a2840](https://github.com/TwoZer00/FireLab/commit/9e1bb5eac86ba2f891b60b0ff69689b1453a2840))
* docs: improve quick start section with separate code blocks ([398a7572f020cd7a98d013711c4ac6a33016cddf](https://github.com/TwoZer00/FireLab/commit/398a7572f020cd7a98d013711c4ac6a33016cddf))
* docs: simplify Docker Hub command - remove manual port mapping ([952c9548483b53ce26d63feeee562eb6f93cee69](https://github.com/TwoZer00/FireLab/commit/952c9548483b53ce26d63feeee562eb6f93cee69))
* docs: update Docker Hub username to leobardo21 ([577ee099eb0d84b8e7e28de29ca604e364f3fa65](https://github.com/TwoZer00/FireLab/commit/577ee099eb0d84b8e7e28de29ca604e364f3fa65))

## 1.14.0 (2026-02-15)

* feat: add auth headers to all components, fix Firebase login check, add emoji favicon ([c5d9494e00004bda5215d641bd202663d81d76f8](https://github.com/TwoZer00/FireLab/commit/c5d9494e00004bda5215d641bd202663d81d76f8))

## 1.13.0 (2026-02-15)

* feat: persist JWT_SECRET to file and fix socket authentication ([0222afdb957bc2c21bc7d03e0480892752c7b327](https://github.com/TwoZer00/FireLab/commit/0222afdb957bc2c21bc7d03e0480892752c7b327))

## <small>1.12.2 (2026-02-15)</small>

* fix: use same JWT_SECRET from auth.js for socket validation ([2595bdf57f1ef4d919aa2bfda0fb9de098cf24ae](https://github.com/TwoZer00/FireLab/commit/2595bdf57f1ef4d919aa2bfda0fb9de098cf24ae))

## <small>1.12.1 (2026-02-15)</small>

* fix: use static imports for jwt in socket connection ([6a515c0dec900b6b1712c4d592a80f85a5df207b](https://github.com/TwoZer00/FireLab/commit/6a515c0dec900b6b1712c4d592a80f85a5df207b))

## 1.12.0 (2026-02-15)

* feat: implement JWT authentication in frontend ([f44d8196db0d47e5d28ba5dc383ad83bce222b8f](https://github.com/TwoZer00/FireLab/commit/f44d8196db0d47e5d28ba5dc383ad83bce222b8f))

## <small>1.11.1 (2026-02-15)</small>

* fix: remove unused login import ([ef512777e5fb08603b893c4854e3be3eefdd3255](https://github.com/TwoZer00/FireLab/commit/ef512777e5fb08603b893c4854e3be3eefdd3255))

## 1.11.0 (2026-02-15)

* feat: add JWT access token authentication ([0b7efb35016e40db86bb8f3919e3222759552e4f](https://github.com/TwoZer00/FireLab/commit/0b7efb35016e40db86bb8f3919e3222759552e4f))
* docs: fix screenshot filenames in README and landing page ([5bb6dc761cf6c120d4a8b111e45cdd7b39da9b53](https://github.com/TwoZer00/FireLab/commit/5bb6dc761cf6c120d4a8b111e45cdd7b39da9b53))

## <small>1.10.1 (2026-02-15)</small>

* fix: move screenshots to correct docs/screenshots location ([a030bc388f5a6e977d32df62925b44ef94cf496c](https://github.com/TwoZer00/FireLab/commit/a030bc388f5a6e977d32df62925b44ef94cf496c))
* docs: add automated screenshot script ([9137751d972690feb65b26cf043c7c5327b9279e](https://github.com/TwoZer00/FireLab/commit/9137751d972690feb65b26cf043c7c5327b9279e))
* docs: add screenshots to README and landing page ([7433de3ebea3cc7a0bee4320716c4f377f6069af](https://github.com/TwoZer00/FireLab/commit/7433de3ebea3cc7a0bee4320716c4f377f6069af))
* docs: replace deprecated waitForTimeout with waitUntil ([7d6154155968201d8dc5cb0251abf80a8cbf7484](https://github.com/TwoZer00/FireLab/commit/7d6154155968201d8dc5cb0251abf80a8cbf7484))

## 1.10.0 (2026-02-15)

* feat: move landing page to docs/ folder for GitHub Pages ([07011494bc8aa4e2532e15adde7f5b55e25ac3c2](https://github.com/TwoZer00/FireLab/commit/07011494bc8aa4e2532e15adde7f5b55e25ac3c2))

## 1.9.0 (2026-02-15)

* feat: add landing page for GitHub Pages ([964e325e78b52e3161cd72a6b98174e14e35d5a6](https://github.com/TwoZer00/FireLab/commit/964e325e78b52e3161cd72a6b98174e14e35d5a6))

## 1.8.0 (2026-02-15)

* feat: add Firebase token authentication for Docker deployment ([bb388c0eb85947b5a79206e9f10fd0409e016acf](https://github.com/TwoZer00/FireLab/commit/bb388c0eb85947b5a79206e9f10fd0409e016acf))
* ci: enable Docker image builds on master branch ([10aa9860aebd270e1ab202b827393575c54f0de8](https://github.com/TwoZer00/FireLab/commit/10aa9860aebd270e1ab202b827393575c54f0de8))
* ci: optimize Docker workflow to skip builds for non-Docker changes ([4162e3fa9a800f0aba498a11688d7360a9b61c8e](https://github.com/TwoZer00/FireLab/commit/4162e3fa9a800f0aba498a11688d7360a9b61c8e))
* Update DOCKER.md ([e9fadfc3f5694b135addf66a02c1fd4d62f96f7f](https://github.com/TwoZer00/FireLab/commit/e9fadfc3f5694b135addf66a02c1fd4d62f96f7f))

## 1.7.0 (2026-02-15)

* feat: add Docker Hub image publishing ([7b5c87fa504141534b3bcdb82200e7d92face525](https://github.com/TwoZer00/FireLab/commit/7b5c87fa504141534b3bcdb82200e7d92face525))

## 1.6.0 (2026-02-15)

* feat: add Docker deployment support with port ranges ([0f98a34a33b513268be6cd4db09810692ece202b](https://github.com/TwoZer00/FireLab/commit/0f98a34a33b513268be6cd4db09810692ece202b))
* docs: update README with new features ([6ac8b3095449a0a35df6126509759e9af0313e07](https://github.com/TwoZer00/FireLab/commit/6ac8b3095449a0a35df6126509759e9af0313e07))

## 1.5.0 (2026-02-14)

* feat: add data management, project deletion, and service selection ([cbd41110cf30282b7c3eca5d4bfef382bec5ea06](https://github.com/TwoZer00/FireLab/commit/cbd41110cf30282b7c3eca5d4bfef382bec5ea06))

## <small>1.4.1 (2026-02-14)</small>

* fix: add date transform to handle invalid commit dates in changelog ([4e79cf86f3e64388493caf902851cb99875df14b](https://github.com/TwoZer00/FireLab/commit/4e79cf86f3e64388493caf902851cb99875df14b))

# [1.4.0](https://github.com/TwoZer00/FireLab/compare/v1.3.0...v1.4.0) (2026-02-14)


### Bug Fixes

* simplify semantic-release config to resolve date parsing error ([e72c745](https://github.com/TwoZer00/FireLab/commit/e72c7453bb5f10aab5487ba9f169122781d7b302))
* switch to angular preset to resolve changelog generation error ([cade4e1](https://github.com/TwoZer00/FireLab/commit/cade4e118d6c5c485439c19b54e58252d07f5d15))


### Features

* add auto-snapshots, rules editor improvements, and layout fixes ([1c9e256](https://github.com/TwoZer00/FireLab/commit/1c9e25682127def52b0e4c320a9793d02d6e49dc))

# [1.3.0](https://github.com/TwoZer00/FireLab/compare/v1.2.0...v1.3.0) (2026-02-14)


### Features

* add keyboard shortcuts, named snapshots, and connection status ([29527f9](https://github.com/TwoZer00/FireLab/commit/29527f9264964862f2371273d647126ff36b4eaf))

# [1.2.0](https://github.com/TwoZer00/FireLab/compare/v1.1.0...v1.2.0) (2026-02-14)


### Features

* improve log rendering with ANSI color support ([be6e39a](https://github.com/TwoZer00/FireLab/commit/be6e39aeb4161b3e67a400e83f289bae3e4d4836))

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
