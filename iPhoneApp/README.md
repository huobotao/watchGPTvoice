# ChargePower — iPhone 充电功率监测

一张 Swift Charts 图同时画:**电量 %**、**充电功率 W**、**电池温度 °C**、**电压 V**、**电流 A**。
默认走 IOKit 路径读真值,7 天自签 / Apple Dev 账号自用。

## 装到 iPhone 上

### 路线 A:命令行一键(推荐,日常用)

```bash
cd iPhoneApp
./install.sh
```

脚本会:自动找 keychain 里的 Team ID → 找连着的 iPhone → `xcodebuild` 编译 → `devicectl` 推到手机。

**前提**(只做一次):必须先在 Xcode 里打开过一次工程把 Apple ID 加进去:
1. `open ChargePower.xcodeproj`
2. Xcode → Settings → Accounts → 「+」 → Apple ID 登录(免费就行)
3. 关掉 Xcode

之后每次更新就只跑 `./install.sh`。7 天到期重签也是这一条命令。

可选环境变量:
```bash
TEAM_ID=XXXXXXXXXX BUNDLE_ID=com.you.chargepower ./install.sh
```

### 路线 B:Xcode GUI(完全可视化)

1. 在 Mac 上 `git pull`,双击 `iPhoneApp/ChargePower.xcodeproj`
2. 左侧工程根 → **Signing & Capabilities**:Team 选你的 Apple ID,Bundle Identifier 改成独一无二的
3. iPhone:**设置 → 隐私与安全性 → 开发者模式 → 打开**(iOS 16+,会重启),数据线连 Mac,弹窗信任电脑
4. Xcode 顶部目标栏选你的 iPhone → **⌘R**

### 首次安装后

iPhone 上首次打开会报"未受信任的开发者":
**设置 → 通用 → VPN与设备管理 → 你的 Apple ID → 信任**,再打开 App 就行。

## 测试用例

- 不同充电头各试 1 分钟:5W 老豆腐头、20W PD、MagSafe → 看实测功率峰值
- 跑到 80% 后继续充 → 应该看到曲线明显下降(iOS 涓流保护)
- 拔线 → 电流变负,功率归 0,电量曲线开始缓慢下降
- 把 App 放后台 30 秒再回来 → 期间数据会断,因为 Timer 在后台停了(README 末尾有解法)

## 能看到什么

| 项 | 来源 | 备注 |
|---|---|---|
| 电量 % | `kIOPSCurrentCapacityKey` | 1% 精度 |
| 充电状态 | `kIOPSIsChargingKey` | |
| 电流 A | `InstantAmperage` (mA) | 充电正,放电负 |
| 电压 V | `Voltage` (mV) | |
| 实测功率 W | V × I | 充电时显示,放电时 0 |
| 电池温度 °C | `Temperature` (0.01°C) | |
| 充电头瓦数 | `AdapterDetails.Watts` | 20W PD / 30W 之类 |

读不到私有键(模拟器/沙盒)会自动退化:电量+充电状态+差分估算功率,温度/电压/电流显示 `—`。

## 目录

```
iPhoneApp/
├── ChargePower.xcodeproj/      # 直接双击打开
└── ChargePower/
    ├── ChargePowerApp.swift    # @main
    ├── ContentView.swift       # UI:摘要卡 + Charts 折线 + 窗口 Picker
    ├── SampleStore.swift       # 2s 采样、24h 滚动、30s 节流持久化
    ├── PowerSampler.swift      # PublicAPISampler + IOKitSampler(默认)
    └── Sample.swift            # 数据模型
```

## App Store 警告

`IOKitSampler` 用了未公开的字典键(`InstantAmperage` / `Voltage` / `Temperature` / `AdapterDetails`)。
**这个 target 不能上架 App Store**,审核会直接拒。
要做合规版本,在 `SampleStore` 构造里换成 `PublicAPISampler()`。

## 后台采样

App 切到后台 `Timer` 会停。最简单的做法是充电时让屏幕常亮、App 在前台:
```swift
// 在 ContentView .onAppear 里加:
UIApplication.shared.isIdleTimerDisabled = true
```
要彻底后台:开 Background Modes → Audio 放静音(费电),或 `BGAppRefreshTask`(系统约 15 分钟才唤醒一次,稀疏)。
