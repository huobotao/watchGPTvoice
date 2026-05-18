# Court Transcription Tool 庭审转写比对

针对你的场景：录音里有法官 / 调解员 / 中英两方 / 翻译员，要从一段中英混说的庭审录音里**准确还原英语原文**，并对比 AI 翻译与现场翻译员的翻译差异。

## 它干什么

1. **三家托管转写引擎并行跑**：Deepgram Nova-3（主） + AssemblyAI Universal + Groq Whisper-large-v3 + 可选 Replicate WhisperX。全是 API 调用，无需本地 GPU。
2. **自动找需要回听的位置**：两个引擎给出**不同单词**的位置 = 最该回听的位置。点开看每个引擎给的候选词 + 一键回听原音。
3. **三家 LLM 并排翻译**：Claude / GPT / Gemini 一起翻每段英文，自动定位下一段中文（翻译员说的）做对照，一眼能看出现场翻译漏了什么。
4. **Web UI**：上传音频 → 进度条 → 转写完成自动进 viewer。iPhone Safari 友好。

## 三种部署方式

### 方式 A：部署到 Render（一键，iPhone 可访问）

1. 把这个仓库 push 到你的 GitHub（已经在 `claude/court-transcription-tool-c3PCf` 分支）
2. 去 [render.com](https://render.com) 用 GitHub 账号登录
3. 点 **New +** → **Blueprint**，选这个仓库 → Render 会读到根目录的 `render.yaml`（注：`render.yaml` 位于 `court-tool/` 子目录内，需要把 Blueprint 的根目录指向它，或者复制 `court-tool/render.yaml` 到仓库根）
4. 一通确认后会让你填环境变量（API Keys）：
   - 至少填一个转写引擎的 Key（推荐 `DEEPGRAM_API_KEY` + `ASSEMBLYAI_API_KEY` + `GROQ_API_KEY`）
   - 至少填一个翻译 LLM Key（推荐 `ANTHROPIC_API_KEY`）
   - `APP_PASSWORD` 让 Render 自动生成（之后用它登录）
5. Deploy → 等 2–3 分钟 → 拿到 `https://<你的名字>.onrender.com` URL
6. iPhone Safari 打开 URL → 输入 APP_PASSWORD → 用

**Render 免费层的注意**：15 分钟没人访问会自动休眠，下次访问首屏冷启动 ~30 秒。容器存储是 ephemeral，重启后任务历史和音频会清空——这工具本来就是"一次性核对"用的，不存历史也行。

### 方式 B：本机跑

```bash
cd court-tool
cp .env.example .env       # 填 Keys
pip install -r requirements.txt
python server.py
# 打开 http://127.0.0.1:8000
```

### 方式 C：Docker

```bash
cd court-tool
docker build -t court-tool .
docker run -p 8000:8000 --env-file .env -v $(pwd)/data:/tmp/court-tool-data court-tool
```

## 命令行用法（不开 web UI）

```bash
python transcribe_deepgram.py hearing.mp3       # → outputs/deepgram.json
python transcribe_assemblyai.py hearing.mp3     # → outputs/assemblyai.json
python transcribe_groq.py hearing.mp3           # → outputs/groq.json
python transcribe_replicate.py hearing.mp3      # → outputs/replicate_whisperx.json

python merge.py --primary outputs/deepgram.json \
                --other outputs/assemblyai.json \
                --other outputs/groq.json \
                -o outputs/merged.json

python translate.py --transcript outputs/merged.json --from-seg 12 --to-seg 14
```

## 关键 UI 交互

- **黄色波浪线** = Deepgram 自己置信度 < 0.7
- **红色波浪线 + 红底** = 多个引擎给出不同单词。**这是最高价值的回听定位**——点开看每家给的候选，一键播放这个词。
- **左侧栏说话人**：第一次打开都是"说话人 0/1/2…"，听几秒就知道谁是谁，在输入框改名（法官/调解员/原告/被告/翻译员），自动存 localStorage。
- **🌐 译 按钮**：每段右侧。点了之后弹出全屏面板：英文原文 + 自动定位的翻译员中文 + Claude/GPT/Gemini 三家译文。
- **左下"跳转到待核"**：按时间列出所有有分歧/低置信度的段落，一键跳过去。
- **键盘**：空格=播放/暂停，左右=±3秒，Esc=关弹窗。

## 引擎对比

| 引擎 | 模型族 | 中英混说 | Diarization | 词置信度 | 速度（1 小时音频） | 成本/分钟 |
|---|---|---|---|---|---|---|
| Deepgram Nova-3 | Conformer | ✅ 原生 `multi` | ✅ | ✅ | ~30 秒 | $0.0043 |
| AssemblyAI Universal | 自研 | ✅ 自动检测 | ✅ | ✅ | ~1 分钟 | $0.0065 |
| Groq Whisper-large-v3 | Whisper | ✅ | ❌ | ❌ | ~5 秒 | $0.0006 |
| Replicate WhisperX | Whisper + wav2vec2 | ✅ | 可选 | ✅ | ~5 分钟 | $0.0036 |

**用法建议**：勾 Deepgram + AssemblyAI + Groq 三家。Deepgram 做主转写（diarization 最稳）；AssemblyAI 跟 Deepgram 不同模型族，分歧就是高价值的回听点；Groq 几秒就能给一个参考。

## 文件结构

```
court-tool/
├── transcribe_deepgram.py     # Deepgram → JSON
├── transcribe_assemblyai.py   # AssemblyAI → JSON
├── transcribe_groq.py         # Groq Whisper → JSON
├── transcribe_replicate.py    # Replicate WhisperX → JSON
├── transcribe_whisperx.py     # 本地 WhisperX(可选,需 GPU 才实用)
├── merge.py                   # 时间戳对齐,标记需核对的词
├── translate.py               # 并发 Claude/GPT/Gemini
├── server.py                  # FastAPI: 上传 + 后台转写 + 翻译 API + 登录
├── viewer/                    # web UI
│   ├── index.html
│   ├── login.html
│   ├── viewer.css
│   └── viewer.js
├── render.yaml                # Render Blueprint 一键部署
├── Dockerfile
├── requirements.txt
└── .env.example
```

## API 端点（部署后能直接调）

- `GET /api/health` — 看哪些引擎配好了
- `POST /api/login` `{password}` — 设了 APP_PASSWORD 时
- `POST /api/upload` (multipart) — 字段：`file` + `engines` (逗号分隔)
- `GET /api/jobs` — 列表
- `GET /api/jobs/{id}` — 单个任务状态 + 进度日志
- `GET /api/jobs/{id}/transcript` — 完整 merged.json
- `GET /api/audio/{id}` — 流式原音频
- `POST /api/translate` `{text, engines?}` — 并发翻译

## 已知限制

- **Render 免费层不能传特别大的文件**（>100MB 容易超时）。1+ 小时录音建议先在本机切片，或升 Render 付费层（$7/月）。
- **Groq 单文件 25MB 限制**（免费层），25–100MB 走付费层。
- **Replicate WhisperX 用 base64 上传**当前实现，大文件慢；要好用得开个临时公开 URL（S3 / R2）。
- **iPhone Safari 上传** 一般没问题，但如果是从"语音备忘录"导出的 .m4a，先确认格式被引擎接受（多数都支持）。

## 后续可加（你说了就做）

- 用户手动修正后写回 / 导出 SRT/VTT/PDF
- 让 Claude 根据上下文猜低置信度词的可能性
- 全文搜索 + 多录音管理
- 切片上传（>1h 的录音自动切 10 分钟一段）
