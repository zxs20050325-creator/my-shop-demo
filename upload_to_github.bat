@echo off
echo 正在上传项目到 GitHub...

REM 检查是否有 Git 仓库，如果没有则初始化
if not exist .git (
  echo 初始化 Git 仓库...
  git init
)

REM 添加所有文件
echo 添加所有文件到暂存区...
git add .

REM 检查是否有要提交的更改
echo 提交更改...
git config user.name "Auto Commit"
git config user.email "noreply@example.com"
git commit -m "Upload project files for deployment"

REM 设置远程仓库地址
echo 设置远程仓库地址...
git remote set-url origin git@github.com:zxs20050325-creator/my-shop-demo.git

REM 推送到 GitHub
echo 正在推送到 GitHub...
git branch -M main
git push -u origin main

echo 上传完成！
pause