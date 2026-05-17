# 双显示器一键交换

macOS 上按一个快捷键 `⌃⌥⌘S`，立即把两台显示器上的所有窗口整体对调（主屏 ↔ 参考屏）。
两台显示器分辨率不同也没问题，窗口位置/大小按相对比例缩放过去。

## 安装（3 步，1 分钟）

### 1. 装 Hammerspoon

```bash
brew install --cask hammerspoon
```

没装 Homebrew 就去 https://www.hammerspoon.org 下 dmg 拖进 Applications。

### 2. 装载脚本

第一次打开 Hammerspoon，菜单栏会出现一个锤子图标，点 **Open Config**（或者直接编辑 `~/.hammerspoon/init.lua`），把这一行加进去：

```lua
dofile(os.getenv("HOME") .. "/path/to/this/repo/dual-display-swap/swap.lua")
```

把 `path/to/this/repo` 换成你 clone 这个仓库的实际路径。

或者更简单：直接把 `swap.lua` 的内容贴进 `~/.hammerspoon/init.lua`。

### 3. 重载 & 授权

- 点菜单栏锤子 → **Reload Config**
- 第一次会弹辅助功能授权：**系统设置 → 隐私与安全 → 辅助功能** → 勾上 Hammerspoon
- 重载成功会弹提示 `Dual-display swap 已加载`

## 使用

按 `⌃⌥⌘S`（Control + Option + Command + S）。
屏幕中央会显示 `已交换 N 个窗口`。

## 自定义

打开 `swap.lua`：

- 改快捷键：`HOTKEY_MODS` / `HOTKEY_KEY`
  ```lua
  local HOTKEY_MODS = { "ctrl", "alt", "cmd" }
  local HOTKEY_KEY  = "s"
  ```
- 想只交换某个 App 的窗口：在 `swapDisplays` 里加一行
  `if win:application():name() ~= "Safari" then goto continue end`
  （记得加 `::continue::` 标签）

## 不工作？

- 没反应 → 检查辅助功能权限有没有勾
- 只有一台显示器时会弹 `需要至少两台显示器`
- 全屏窗口（绿灯进的那种 Fullscreen Space）不会被移动，这是 macOS 限制；用 Stage Manager 或非全屏的最大化就 OK
