@echo off
chcp 65001 > nul

REM 检查是否已经是一个git仓库
if exist .git (
    echo 正在更新现有仓库...
) else (
    echo 初始化新的git仓库...
    git init
    if errorlevel 1 (
        echo 错误：无法初始化git仓库，请确保已安装Git
        pause
        exit /b 1
    )
)

REM 添加所有文件到git暂存区
echo 添加文件到暂存区...
git add .

REM 检查是否有需要提交的更改
git status --porcelain
if errorlevel 1 (
    echo 没有检测到任何更改，跳过提交步骤
) else (
    echo 检测到更改，正在提交...
    
    REM 配置git用户信息（如果尚未配置）
    git config user.name "冀遗筑梦开发者"
    git config user.email "jiyi_zhumeng@example.com"
    
    REM 提交更改
    git commit -m "feat: 上传冀遗筑梦项目文件"
    if errorlevel 1 (
        echo 警告：提交失败，可能没有更改需要提交
    )
)

REM 提供默认远程仓库URL（需要用户替换为实际URL）
set /p REPO_URL="请输入远程仓库URL (例如: https://github.com/用户名/仓库名.git 或 git@github.com:用户名/仓库名.git)，直接回车使用默认值跳过: "

if "%REPO_URL%"=="" (
    echo 跳过远程仓库设置
) else (
    REM 设置远程仓库
    git remote set-url origin %REPO_URL%
    
    REM 推送前先拉取最新代码（如果有的话）
    git pull origin master --allow-unrelated-histories 2>nul
    
    REM 推送到远程仓库
    echo 正在推送到远程仓库...
    git push -u origin master --force-with-lease
    
    if errorlevel 1 (
        echo 推送失败，请检查网络连接或仓库权限
        pause
        exit /b 1
    ) else (
        echo 成功上传到GitHub！
    )
)

echo.
echo 上传流程完成！
pause