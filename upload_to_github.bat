@echo off
echo Uploading project to GitHub...

REM Check if Git repository exists, initialize if not
if not exist .git (
  echo Initializing Git repository...
  git init
)

REM Add all files
echo Adding all files to staging area...
git add .

REM Check if there are changes to commit
echo Committing changes...
git config user.name "Auto Commit"
git config user.email "noreply@example.com"
git commit -m "Upload project files for deployment"

REM Set remote repository URL
echo Setting remote repository URL...
git remote set-url origin git@github.com:zxs20050325-creator/my-shop-demo.git

REM Push to GitHub
echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo Upload completed!
pause