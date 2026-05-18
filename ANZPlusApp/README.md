# ANZ Plus · iPhone UI 空壳

单文件、零依赖的 ANZ Plus iPhone 应用 UI 模拟。仅作视觉/交互预览,不含真实银行逻辑。

## 一键打开测试

只需 **双击 `index.html`**,默认浏览器即可打开。无需服务器、无需安装任何东西。

如果你在终端里:

```
# macOS
open ANZPlusApp/index.html

# Linux
xdg-open ANZPlusApp/index.html

# Windows
start ANZPlusApp\index.html
```

## 怎么用

1. 进来先是 **PIN 登录页**:任意按 6 位数字,或点 Face ID 图标,或直接按键盘 0–9 输入,Enter 登录
2. 登录后进入 **首页**:看到 Money in / Money out 卡片、Round-ups、账户列表、最近交易
3. 底部 5 个 tab 切换:**首页 / Money / Save / Grow / 我的**
4. 首页点任一**账户卡**进入账户详情(交易流水)
5. **我的** → 退出登录,回到 PIN 页

## 设计参考

- 深色主题 `#0a0a0a` + ANZ Plus 标志性柠檬绿 `#dafe51`
- iPhone 15/16 外观:Dynamic Island、圆角金属边框、实体侧键、Home Indicator
- 状态栏时钟实时刷新

## 文件结构

```
ANZPlusApp/
├── index.html    # 所有 HTML/CSS/JS 都在这一个文件里
└── README.md     # 你正在读
```

## 已知"不一模一样"

- ANZ Plus 真实 logo 字体未授权,这里用通用衬线模拟
- 真机的某些细节(如卡片堆叠动画、可拖动账户排序、活体 Face ID 动效)未实现
- 不含任何后端交互
