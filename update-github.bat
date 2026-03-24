@echo off
echo 🚀 Syncing your latest changes to GitHub...
echo.

:: Add all changed files
git add .

:: Prompt for a commit message
set /p msg="Enter your commit message (or press enter for 'Update from local'): "
if "%msg%"=="" set msg="Update from local"

:: Commit the changes
git commit -m "%msg%"

:: Push to the main branch on GitHub
echo.
echo ⏳ Pushing to GitHub...
git push origin main

echo.
echo ✅ All done! Your changes are live on GitHub.
pause
