# 牛越的像素工作室 · GitHub Pages 静态版

这是从当前本地完整版整理出的独立静态发布副本。人物移动、方向动画、鼠标寻路、碰撞、家具交互、内容面板，以及点击窗户后的伸展和看书动作均保留。

## 直接部署到 GitHub Pages

本仓库使用 GitHub Actions 自动部署。打开仓库的 **Settings → Pages**，将 Source 设为 **GitHub Actions**，推送到 `main` 后会自动发布。

## 修改个人内容

公开内容集中在 `data/content.json`。修改后提交到 GitHub，Actions 会自动重新发布。

静态托管没有私有后端，因此本版本不包含网页内的主人工作台、密码登录、在线保存和在线上传。
