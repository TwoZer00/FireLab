# Commit Message Convention

FireLab uses **Conventional Commits** for automatic versioning.

## Format

```
<type>(<scope>): <subject>
```

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
# Patch release (1.0.0 → 1.0.1)
git commit -m "fix: resolve emulator crash on stop"
git commit -m "fix(logs): fix log color coding"

# Minor release (1.0.0 → 1.1.0)
git commit -m "feat: add export/import data functionality"
git commit -m "feat(rules): add inline validation"

# Major release (1.0.0 → 2.0.0)
git commit -m "feat!: change API endpoint structure"
git commit -m "fix: update config format

BREAKING CHANGE: firebase.json structure changed"

# No version bump
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
```

## Workflow

1. Make your changes
2. Commit with conventional format
3. Push to `main` branch
4. GitHub Actions automatically:
   - Analyzes commits
   - Bumps version
   - Updates CHANGELOG.md
   - Creates git tag
   - Creates GitHub release

## Manual Release (optional)

```bash
npm run release
```
