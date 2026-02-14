#!/bin/bash

# Usage: ./version.sh [major|minor|patch]
# Example: ./version.sh patch  (1.0.0 -> 1.0.1)

TYPE=${1:-patch}

echo "Bumping $TYPE version..."

# Update backend version
cd backend
npm version $TYPE --no-git-tag-version
BACKEND_VERSION=$(node -p "require('./package.json').version")
cd ..

# Update frontend version
cd frontend
npm version $TYPE --no-git-tag-version
cd ..

echo "Updated to version $BACKEND_VERSION"
echo ""
echo "Next steps:"
echo "1. Update CHANGELOG.md"
echo "2. git add ."
echo "3. git commit -m \"Release v$BACKEND_VERSION\""
echo "4. git tag -a v$BACKEND_VERSION -m \"Release version $BACKEND_VERSION\""
echo "5. git push && git push origin v$BACKEND_VERSION"
