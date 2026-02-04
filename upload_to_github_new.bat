@echo off
echo 正在上传项目到GitHub...

REM 初始化Git仓库（如果尚未初始化）
if not exist .git (
    git init
)

REM 添加所有文件到Git
git add frontend/ backend/ .gitignore README.md render.yaml

REM 配置Git用户信息（如果尚未配置）
git config --local user.email "user@example.com"
git config --local user.name "User"

REM 提交更改
git commit -m "Initial commit: 新中式极简非遗文化电商平台"

REM 设置远程仓库地址（请将URL替换为您的GitHub仓库地址）
set /p REPO_URL="请输入GitHub仓库地址 (HTTPS或SSH): "

git remote set-url origin %REPO_URL%

REM 推送到GitHub
git branch -M main
git push -u origin main

echo 上传完成！
pause