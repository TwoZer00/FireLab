@echo off
REM Usage: version.bat [major|minor|patch]
REM Example: version.bat patch  (1.0.0 -> 1.0.1)

set TYPE=%1
if "%TYPE%"=="" set TYPE=patch

echo Bumping %TYPE% version...

cd backend
call npm version %TYPE% --no-git-tag-version
cd ..

cd frontend
call npm version %TYPE% --no-git-tag-version
cd ..

echo.
echo Version updated!
echo.
echo Next steps:
echo 1. Update CHANGELOG.md
echo 2. git add .
echo 3. git commit -m "Release vX.X.X"
echo 4. git tag -a vX.X.X -m "Release version X.X.X"
echo 5. git push ^&^& git push origin vX.X.X
