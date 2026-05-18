# Elevation Preview

给定一条路线，提前预览整条路线的海拔曲线（累计爬升/下降、最高/最低、平均坡度）。

独立的 Web 子项目，与本仓库的 watchOS 主项目互不依赖。

## 当前进度

- **Phase 1（MVP，全球版）**：✅ 完成
  - Leaflet + OSM 底图
  - 地图点击画线（撤销/清空）
  - GPX/KML 文件上传
  - 按距离均匀重采样到 500 点（turf）
  - Open-Meteo 批量查海拔（5 路并发，100 点/批）
  - ECharts 海拔曲线 + 地图 ↔ 图表 hover 联动
  - 统计：全长 / 累计爬升 / 累计下降 / 最高 / 最低 / 平均坡度
- **Phase 2（国内版，高德）**：待办
- **Phase 3（起点+终点路径规划、KML、缓存、分享）**：待办
- **Phase 4（Worker 代理、坡度上色、平滑）**：待办

## 开发

```bash
cd elevation-preview
npm install
npm run dev
```

打开浏览器到 `http://localhost:5173`。

## 构建

```bash
npm run build
```

产物在 `dist/`，可直接部署到 GitHub Pages / Cloudflare Pages / 任何静态托管。

## 使用方法

1. **地图点击画线**：在地图上依次点击若干路径点，"撤销点"撤回最后一个，"清空"重来。
2. **上传 GPX/KML**：点击顶部"上传 GPX/KML"按钮，选择文件。`public/sample.gpx` 是一条北京香山附近的样例。
3. 点击"查海拔" → 自动重采样并查询 Open-Meteo → 出曲线 + 统计。
4. 鼠标移到曲线上 → 地图上对应位置高亮。

## 数据源

- 地图：OpenStreetMap
- 海拔：[Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api)（免费，CORS 友好，基于 SRTM 30m 数据）

## 已知限制

- 仅全球（WGS-84）路线。国内路线由于 GCJ-02 偏移问题，需要等 Phase 2 接入高德。
- Open-Meteo 单请求最多 100 点，已自动分批；超过 ~10k 次/天可能被限速。
- GPX 自带的 `<ele>` 字段不被采用，统一用 Open-Meteo 查询保证一致性。

## 目录结构

参见仓库根目录的 `/root/.claude/plans/web-curried-donut.md`（开发期规划文档）。
