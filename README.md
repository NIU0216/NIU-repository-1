# 牛越的像素工作室 · GitHub Pages 静态版

这是从当前本地完整版整理出的独立静态发布副本。人物移动、方向动画、鼠标寻路、碰撞、家具交互、内容面板，以及点击窗户后的伸展和看书动作均保留。

## 直接部署到 GitHub Pages

1. 在 GitHub 新建一个空仓库。
2. 将本文件夹内的所有内容上传到仓库根目录，包括 `.github` 和 `.nojekyll`。
3. 仓库默认分支使用 `main`。
4. 打开仓库的 **Settings → Pages**，在 **Build and deployment** 中将 Source 设为 **GitHub Actions**。
5. 打开 **Actions**，等待 `Deploy static portfolio to GitHub Pages` 完成，即可在 Pages 页面看到公开网址。

不需要安装依赖，也不需要执行构建命令。资源路径使用相对地址，因此既支持用户名主页仓库，也支持普通项目仓库。

## 修改个人内容

公开内容集中在 [`data/content.json`](data/content.json)：

- `profile`：姓名、左上角拼音、职业标题、欢迎语、关于我、邮箱和当前状态。
- `projects`：项目经历。
- `skills`：技能树。
- `career`：职业关卡。
- `practice`：练习方式。
- `photos`：旅行照片。

修改 JSON 后提交到 GitHub，Actions 会自动重新发布。JSON 的最后一项后面不能多写逗号。

静态托管没有私有后端，因此这一版本不包含网页内的主人工作台、密码登录、在线保存和在线上传。需要网页内管理内容时，请继续使用原来的 Python 完整版。GitHub 本身会保留提交历史，这是 GitHub 的版本管理机制。

## 添加旅行照片

1. 在 `assets/photos` 中上传压缩后的 WebP 或 JPEG 图片。
2. 在 `data/content.json` 的 `photos` 数组中增加：

```json
{
  "id": "photo-1",
  "title": "旅行片段",
  "alt": "牛越的旅行照片",
  "thumbUrl": "./assets/photos/trip-thumb.webp",
  "url": "./assets/photos/trip.webp"
}
```

建议展示图最长边不超过 1600 像素，缩略图最长边约 480 像素，以减少首次打开时间。

## 本地预览

双击或用 PowerShell 运行 `serve-local.ps1`，然后打开 `http://127.0.0.1:8080/`。由于浏览器安全限制，不建议直接双击 `index.html` 预览数据文件。

## 文件说明

- `index.html`：页面结构。
- `app.js`：人物、寻路、碰撞与场景交互。
- `styles.css`、`styles-v2.css`：布局和视觉样式。
- `assets`：经过压缩的场景、头像和动作素材。
- `data/content.json`：全部公开内容数据。
- `.github/workflows/deploy-pages.yml`：GitHub Pages 自动发布流程。

