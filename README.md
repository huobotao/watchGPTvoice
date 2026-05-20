# 微信 iPhone 版聊天记录查看器（离线 / 公网 / 浏览器）

一个**只读**的微信聊天记录查看器，UI 1:1 还原 iPhone 微信，跑在浏览器里。
不联网、不发消息、不调任何外部服务。你把 iPad / iPhone 备份导出的聊天记录
放进 `data/` 文件夹里，用手机浏览器打开就能像微信一样翻看。

## 跑起来

```bash
python3 server.py            # 默认 0.0.0.0:8080
python3 server.py 9000       # 换端口
```

启动后会打印三个地址：

```
  http://localhost:8080/
  http://192.168.x.x:8080/   <- 同 WiFi 下手机直接打开这个
  http://0.0.0.0:8080/
```

第一次进去会看到内置的演示数据（演示了所有支持的消息类型）。
真实数据放进 `data/` 后，演示数据会被替换。

### 公网访问

服务器只是一个 Python `http.server`，没有任何鉴权，**不要直接挂公网**。
推荐：

- **同 WiFi**：上面的局域网 IP 即可，手机点开
- **公网临时**：`ngrok http 8080` 或 `cloudflared tunnel --url http://localhost:8080`
- **公网长期**：放到 VPS + nginx + HTTPS + Basic Auth

## 数据怎么放

完整 schema 见 [`data/README.md`](data/README.md)，一个 60 秒速览：

```
data/
├── me.json                # 我自己的资料
├── contacts.json          # 联系人 + 群
├── chats.json             # 聊天列表（哪些会话出现在首页）
├── moments.json           # 朋友圈
├── messages/
│   ├── zhangsan.json      # 与某人/某群的完整聊天记录，文件名 = 联系人 id
│   ├── group_work.json
│   └── ...
└── media/                 # 头像、图片、语音、视频、文件，按需放
    ├── avatars/
    ├── images/
    ├── voice/
    ├── video/
    └── files/
```

所有的 `avatar`、`src`、`thumbnail` 等字段都是相对于站点根的路径，
比如 `media/avatars/zhangsan.jpg` 或者绝对 `https://...`。

支持的消息类型：**text / image / sticker / voice / video / file / link /
location / redpacket / transfer / quote / card / system**
— 全部在 UI 上有专门的样式。

## 项目结构

```
.
├── index.html              # SPA 外壳，含 iOS 状态栏 / 底部 tab bar
├── assets/
│   ├── css/wechat.css      # 全部样式（一份）
│   └── js/
│       ├── icons.js        # 所有 SVG 图标
│       ├── utils.js        # 工具函数（时间、头像、拼音首字母...）
│       ├── data.js         # 数据加载 + 内置演示数据
│       ├── views.js        # 全部页面（聊天、通讯录、发现、我、朋友圈...）
│       └── app.js          # 路由、状态栏、底部 tab、弹层
├── data/
│   ├── README.md           # 数据格式文档
│   └── media/              # 媒体文件占位
└── server.py               # Python http.server 包装
```

## 包含的功能（深度而非壳子）

- **微信** tab：聊天列表，置顶、未读红点、免打扰小灰点、@我、草稿、群头像九宫格
- **聊天详情**：所有消息类型、长按菜单（复制/转发/收藏/翻译/引用/多选/删除）、
  时间分组、群里显示发送者名字、点头像跳资料、图片大图查看、视频播放
- **输入栏**：语音/键盘切换、表情面板（90+ emoji）、加号面板（12 个功能图标）、
  发送按钮（有文字时出现）、长按"按住说话"出录音浮层
- **通讯录** tab：新的朋友/群聊/标签/公众号、A-Z 字母索引、点击进资料
- **个人资料**：头像、备注、地区、签名、群成员九宫格、发消息/通话按钮
- **发现** tab：朋友圈、视频号、扫一扫、摇一摇、看一看、搜一搜、附近、购物、游戏、小程序
- **朋友圈**：封面 + 头像、九宫格图片、点赞、评论（含"回复"嵌套）、位置标签
- **我** tab：头像 + 个人卡片、服务、收藏、朋友圈、视频号、卡包、表情、设置
- **设置**：多级列表、关于页

## 不在 scope 里的

- 真实发送（没有网络）
- 拍照 / 录音 / 扫描 / 摇一摇等需要设备权限的功能（只有 UI）
- 公众号文章详情页（点公众号会进会话，文章是 link 卡片）
- 视频号 / 看一看 / 搜一搜 的二级页（toast 提示）

底层 UI 都是 vanilla HTML/CSS/JS，没有任何 build step，没有任何依赖。
想加什么自己改 `assets/js/views.js`。
