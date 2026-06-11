# 我们的故事 - 恋爱记录网站

一个樱花粉色调的私人恋爱记录网站，两个人共用。数据托管在 GitHub，免费部署。

## 快速部署（3 步）

### 第 1 步：创建 GitHub 仓库

在 GitHub 新建一个仓库，名字随意（比如 `our-story`），设为 **Public** 或 **Private** 都可以。

### 第 2 步：修改配置

编辑 `data/config.json`，把里面的信息改成你们的：

```json
{
  "coupleName": "小明 & 小红",
  "boyName": "小明",
  "girlName": "小红",
  "startDate": "2023-03-12",
  "repoName": "你的GitHub用户名/仓库名",
  "repoBranch": "main"
}
```

### 第 3 步：推送代码

```bash
cd love-journal
git init
git add .
git commit -m "我们的故事"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

然后在 GitHub 仓库 → Settings → Pages → Source 选 `main` 分支 → Save。

一分钟后访问 `https://你的用户名.github.io/仓库名/` 就能看到了。

---

## 怎么用

### 看内容
- 手机/电脑打开网址即可，输入你们设的密码

### 发消息
- **方法一（推荐）**：点击聊天页的"配置 GitHub Token"，填入一个有 repo 权限的 Token，就能直接在网页里发消息
- **方法二**：在 GitHub 网页上直接编辑 `data/messages.json`，在数组末尾添加新消息

### 传照片
- 把照片上传到 `photos/` 目录
- 编辑 `data/photos.json`，添加照片信息

### 改时间线
- 编辑 `data/timeline.json`

---

## 文件结构

```
love-journal/
├── index.html          # 网站主页
├── css/style.css       # 样式（樱花粉主题）
├── js/app.js           # 网站逻辑
├── data/
│   ├── config.json     # 你们的配置
│   ├── messages.json   # 聊天消息
│   ├── photos.json     # 照片信息
│   └── timeline.json   # 时间线事件
├── photos/             # 放照片的地方
└── README.md
```

---

## 提示

- 照片建议先压缩到 1920px 宽以下再上传
- GitHub 仓库总大小限制 1GB，够用很多年了
- 所有数据都在你的仓库里，随时可以备份
- Token 只保存在你自己的浏览器里，不会上传
