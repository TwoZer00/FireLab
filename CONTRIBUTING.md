# Commit Message Convention

FireLab uses **Conventional Commits** for automatic versioning.

## Format

```
<type>(<scope>): <subject>

<body>
```

**Important:** The body is optional but HIGHLY RECOMMENDED since it becomes part of the CHANGELOG.

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

## Examples

```bash
# Bad - Too generic (but still works)
git commit -m "fix: resolve emulator crash"

# Good - Detailed description
git commit -m "fix: resolve emulator crash on stop

Fixed issue where emulator process remained running after clicking stop button.
Added proper process tree cleanup for Windows using taskkill command."

# Bad - No context
git commit -m "feat: add export data"

# Good - Clear explanation
git commit -m "feat: add export/import emulator data functionality

Users can now export emulator data while running and import it on next start.
- Added export button in emulator controls
- Added import checkbox that appears when export data exists
- Data saved to emulator-data/ folder in project directory"

# Major release with breaking change
git commit -m "feat!: change API endpoint structure

BREAKING CHANGE: All API endpoints now use /v2/ prefix.
Update your API calls from /api/config to /v2/api/config"

# With scope
git commit -m "feat(rules): add inline validation

Added real-time validation for rules files with visual feedback.
- Shows green border for valid syntax
- Shows red border with error message for invalid syntax
- Validates JSON for database rules
- Checks for required declarations in Firestore/Storage rules"
```

## Best Practices

1. **Subject line (first line):**
   - Keep under 72 characters
   - Use imperative mood ("add" not "added")
   - Don't end with period

2. **Body (optional but recommended):**
   - Explain WHAT and WHY, not HOW
   - Use bullet points for multiple changes
   - Reference issues if applicable

3. **Scope (optional):**
   - Use when change affects specific area
   - Examples: `(rules)`, `(logs)`, `(ui)`, `(backend)`

## Workflow

1. Make your changes
2. Commit with detailed conventional format
3. Push to `master` branch
4. GitHub Actions automatically:
   - Analyzes commits
   - Bumps version
   - Updates CHANGELOG.md with your commit messages
   - Creates git tag
   - Creates GitHub release

## Manual Release (optional)

```bash
npm run release
```
