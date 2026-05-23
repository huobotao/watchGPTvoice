#!/usr/bin/env bash
# 一键 build + 装到插着的 iPhone。
# 用法:  cd iPhoneApp && ./install.sh
# 可选环境变量:
#   TEAM_ID=XXXXXXXXXX   你的 10 位 Apple Team ID(不填会自动从 keychain 抓)
#   BUNDLE_ID=com.foo.x  覆盖 Bundle Identifier
set -euo pipefail
cd "$(dirname "$0")"

PROJECT=ChargePower.xcodeproj
SCHEME=ChargePower
BUNDLE_ID="${BUNDLE_ID:-com.example.ChargePower}"

# ---- 1. 检查 Xcode --------------------------------------------------------
if ! command -v xcodebuild >/dev/null 2>&1; then
    echo "❌ 没找到 xcodebuild。请先装 Xcode(Mac App Store)。" >&2
    exit 1
fi

# ---- 2. 自动找 Team ID ----------------------------------------------------
TEAM_ID="${TEAM_ID:-}"
if [ -z "$TEAM_ID" ]; then
    TEAM_ID=$(security find-identity -v -p codesigning 2>/dev/null \
        | grep -oE '\(([A-Z0-9]{10})\)' | head -1 | tr -d '()' || true)
fi
if [ -z "$TEAM_ID" ]; then
    cat >&2 <<EOF
❌ 找不到签名 Team ID。第一次跑必须先打开 Xcode 一次:
   1. open ChargePower.xcodeproj
   2. Xcode → Settings → Accounts → "+" → 用你的 Apple ID 登录
   3. 选工程根 → Signing & Capabilities → 把 Team 选成你刚加的账号
   4. 关掉 Xcode,重新跑这个脚本
EOF
    exit 1
fi
echo "✓ Team ID: $TEAM_ID"

# ---- 3. 找连着的 iPhone ---------------------------------------------------
DEVICE_LINE=$(xcrun xctrace list devices 2>&1 \
    | awk '/^== Devices ==/{f=1;next} /^== /{f=0} f' \
    | grep -E '\b(iPhone|iPad)\b' \
    | grep -vi 'simulator' \
    | head -1 || true)
if [ -z "$DEVICE_LINE" ]; then
    echo "❌ 没检测到连着的 iPhone。" >&2
    echo "   - 用数据线插上" >&2
    echo "   - iPhone 弹出"信任此电脑"时点信任" >&2
    echo "   - iOS 16+ 要先开:设置 → 隐私与安全性 → 开发者模式" >&2
    exit 1
fi
DEVICE_ID=$(echo "$DEVICE_LINE" | grep -oE '\([0-9A-Fa-f-]{25,}\)' | tail -1 | tr -d '()')
DEVICE_NAME=$(echo "$DEVICE_LINE" | sed -E 's/\s*\([0-9.]+\)\s*\([0-9A-Fa-f-]+\)\s*$//')
echo "✓ Device: $DEVICE_NAME ($DEVICE_ID)"

# ---- 4. Build -------------------------------------------------------------
echo "→ 编译..."
xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath ./build \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
    CODE_SIGN_STYLE=Automatic \
    build | xcbeautify 2>/dev/null || \
xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath ./build \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
    CODE_SIGN_STYLE=Automatic \
    build

APP_PATH=$(find ./build -type d -name "ChargePower.app" -path "*Debug-iphoneos*" | head -1)
[ -z "$APP_PATH" ] && { echo "❌ 没产出 .app,Build 失败"; exit 1; }
echo "✓ Built: $APP_PATH"

# ---- 5. Install -----------------------------------------------------------
echo "→ 安装到 $DEVICE_NAME..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

echo ""
echo "✅ 装好了。iPhone 主屏看 ChargePower 图标。"
echo "   第一次打开会报'未受信任的开发者':"
echo "   设置 → 通用 → VPN与设备管理 → 信任你的 Apple ID"
