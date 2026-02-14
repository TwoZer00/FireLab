# Commit Message Convention

FireLab uses **Conventional Commits** for automatic versioning and CHANGELOG generation.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Important:** The body is HIGHLY RECOMMENDED since it becomes the detailed list in CHANGELOG.

## Types (determines version bump):

### Patch (1.0.0 → 1.0.1)
- `fix:` Bug fixes
- `perf:` Performance improvements

### Minor (1.0.0 → 1.1.0)
- `feat:` New features

### Major (1.0.0 → 2.0.0)
- Any commit with `BREAKING CHANGE:` in footer
- Or `!` after type: `feat!:` or `fix!:`

### No version bump
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/config changes
- `ci:` CI/CD changes

## Writing Detailed Commits for CHANGELOG

### ❌ Bad (only shows header in CHANGELOG)
```bash
git commit -m "feat: add keyboard shortcuts"
```

**CHANGELOG output:**
```markdown
### Features
* add keyboard shortcuts ([abc123])
```

### ✅ Good (shows header + detailed list in CHANGELOG)
```bash
git commit -m "feat: add keyboard shortcuts and snapshots" -m "
- Add Ctrl+E to toggle emulator
- Add Ctrl+L to clear logs
- Add Ctrl+S to save config/rules
- Add named snapshots with timestamps
- Add snapshot restore functionality
- Add connection status indicators
"
```

**CHANGELOG output:**
```markdown
### Features
* add keyboard shortcuts and snapshots ([abc123])
  - Add Ctrl+E to toggle emulator
  - Add Ctrl+L to clear logs
  - Add Ctrl+S to save config/rules
  - Add named snapshots with timestamps
  - Add snapshot restore functionality
  - Add connection status indicators
```

### Using Editor for Multi-line Commits

```bash
git commit
```

Then write:
```
feat: add keyboard shortcuts and snapshots

- Add Ctrl+E to toggle emulator
- Add Ctrl+L to clear logs
- Add Ctrl+S to save config/rules
- Add named snapshots with timestamps
- Add snapshot restore functionality
- Add snapshot delete functionality
- Add connection status indicators
- Show running services with ports
- Add copy button for service URLs
```

## More Examples

### Bug Fix with Details
```bash
git commit -m "fix: resolve emulator crash on stop" -m "
- Fixed issue where emulator process remained running
- Added proper process tree cleanup for Windows
- Use taskkill command with /f /t flags
- Added SIGTERM handler for graceful shutdown
"
```

### Feature with Context
```bash
git commit -m "feat: add rules editor with validation" -m "
- Add inline syntax validation for rules files
- Show green border for valid syntax
- Show red border with error message for invalid
- Support Firestore, Storage, and Database rules
- Add line numbers in editor
- Add save and deploy buttons
"
```

### Breaking Change
```bash
git commit -m "feat!: change API endpoint structure" -m "
- All API endpoints now use /v2/ prefix
- Updated frontend to use new endpoints
- Added backward compatibility layer

BREAKING CHANGE: API endpoints changed from /api/* to /v2/api/*
Update your API calls accordingly.
"
```

### With Scope
```bash
git commit -m "feat(logs): add filtering and search" -m "
- Add search input to filter logs by text
- Add service dropdown to filter by emulator
- Add clear logs button with Ctrl+L shortcut
- Preserve filters in localStorage
"
```

## Best Practices

1. **Subject line (first line):**
   - Keep under 72 characters
   - Use imperative mood ("add" not "added")
   - Don't end with period
   - Be specific but concise

2. **Body (second section - IMPORTANT!):**
   - Use bullet points with `-` for lists
   - Each bullet is a specific change
   - Explain WHAT changed, not HOW
   - These bullets appear in CHANGELOG
   - Leave blank line after subject

3. **Footer (optional):**
   - Use for breaking changes
   - Reference issues: `Closes #123`
   - Leave blank line after body

4. **Scope (optional):**
   - Use when change affects specific area
   - Examples: `(rules)`, `(logs)`, `(ui)`, `(backend)`, `(snapshots)`

## Why Detailed Commits Matter

**Your commit body becomes the CHANGELOG!**

- ✅ Users see exactly what changed
- ✅ Clear documentation of features
- ✅ Easy to understand release notes
- ✅ Better project history
- ❌ Without body, CHANGELOG is just commit headers (not helpful)

## Workflow

1. Make your changes
2. Commit with detailed conventional format (include body!)
3. Push to `master` branch
4. GitHub Actions automatically:
   - Analyzes commits
   - Bumps version based on type
   - Updates CHANGELOG.md with your commit messages
   - Updates package.json versions
   - Creates git tag
   - Creates GitHub release

## Manual Release (optional)

```bash
npm run release
```
