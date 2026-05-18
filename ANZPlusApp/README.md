# ANZ Plus · iPhone UI 空壳

只是一个用 HTML/CSS/JS 模拟 ANZ Plus iPhone 应用的视觉空壳,**没有任何真实银行逻辑**,仅供 UI 预览 / 截图 / 后续切到原生 SwiftUI 时的样式参考。

## 预览

直接双击 `index.html` 在浏览器打开即可。也可以起个本地静态服务器:

```
cd ANZPlusApp
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## 包含的页面

- **登录页**:6 位 PIN 键盘 + Face ID 假按钮(任意输入 6 位即跳到首页)
- **首页 (Home)**:总余额卡片、Spend/Save/目标账户列表、最近交易
- **Pay**:搜索框 + 4 个快捷入口 + 联系人列表
- **Save**:存钱目标卡片 + 进度条 + 新建目标按钮
- **Grow**:本月开支柱状图 + 类别分布
- **我的 (Profile)**:头像 + 设置项 + 退出登录
- **账户详情**:点首页任一账户进入,显示交易流水

底部 5 个 tab(首页 / Pay / Save / Grow / 我的)可切换。

## 设计要点

- 配色仿 ANZ Plus 实机:深色背景 `#0b0e12` + 柠檬绿主色 `#c8ff00`
- iPhone 外框 + 刘海 + Home Indicator,纯 CSS 绘制
- 状态栏时间实时显示
- 无任何外部依赖,纯静态 3 个文件

## 文件

```
ANZPlusApp/
├── index.html    # 所有视图都在一个文件里,用 .is-active 控制显隐
├── styles.css    # 全部样式
└── app.js        # 视图切换 + PIN 键盘 + 账户跳转
```

## 不包含

- 真实登录 / API 调用
- 真实数据持久化
- 原生 SwiftUI 工程(如需,可参考根目录 `WatchApp/` 的结构后续补)
