#!/usr/bin/env bash
# Athro — Mac 一键启动脚本
# 用法:在 Finder 里右键此文件夹 → 服务 → 新建位于文件夹位置的终端
#       然后输入:  bash install.sh

set -e

cd "$(dirname "$0")"

echo "┌────────────────────────────────────────"
echo "│  Athro · iPhone + Widget + Watch App"
echo "│  一次性环境检查 + 启动 Xcode"
echo "└────────────────────────────────────────"

# 1. 系统检查
if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ 只能在 macOS 上跑(你需要 Xcode 才能编译 iOS App)"
    exit 1
fi

if ! command -v xcode-select &>/dev/null || ! xcode-select -p &>/dev/null; then
    echo "❌ 未检测到 Xcode 命令行工具"
    echo "   请先在 App Store 装 Xcode,然后 重新跑此脚本"
    exit 1
fi

XCODE_VER="$(xcodebuild -version 2>/dev/null | head -1)"
echo "✅ 检测到 $XCODE_VER"

# 2. 确保 Homebrew 已装
if ! command -v brew &>/dev/null; then
    echo "→ 装 Homebrew(macOS 包管理器,装一次终身用)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi

# 3. 确保 xcodegen 已装
if ! command -v xcodegen &>/dev/null; then
    echo "→ 装 xcodegen(把 project.yml 生成成 .xcodeproj)..."
    brew install xcodegen
fi
echo "✅ xcodegen 就绪"

# 4. 生成 Xcode 工程
echo "→ 生成 Athro.xcodeproj ..."
xcodegen generate
echo "✅ 工程生成完毕"

# 5. 打开 Xcode
echo "→ 打开 Xcode ..."
open Athro.xcodeproj

cat <<'EOF'

🎉 一切就绪!现在在 Xcode 里:

  1. 左上角选项目 "Athro" → TARGETS 选 "AthroApp"
       → Signing & Capabilities 标签
       → Team 下拉选你自己的 Apple ID(没有就点 "Add an Account")
       → 把 Bundle Identifier 改成 com.<你的名字>.athro.app
       (Widget 和 Watch 两个 target 改同前缀,保持后缀不变)

  2. 用 USB 线把 iPhone 插到 Mac
     顶部工具栏的设备下拉选你的 iPhone

  3. 按 ⌘R 编译并安装到 iPhone

  4. 第一次跑会提示 "未受信任的开发者",
     去 iPhone:设置 → 通用 → VPN 与设备管理 → 信任你的 Apple ID

  5. 桌面出现 Athro 图标 ✈️ → 点开就用了

Widget 安装:长按 iPhone 主屏空白处 → 左上角 + → 搜 Athro → 加大号 widget
Apple Watch:Xcode 顶部 scheme 改 "AthroWatch",设备选你的表,⌘R

碰到错误把整个错误信息发我,我立刻改。
EOF
