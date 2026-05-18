# Court Transcription Tool 庭审转写比对

针对你的场景：录音里有法官 / 调解员 / 中英两方 / 翻译员，要从一段中英混说的庭审录音里**准确还原英语原文**，并对比 AI 翻译与现场翻译员的翻译差异。

## 它干什么

1. 用 **Deepgram Nova-3** 转写：词级时间戳 + 说话人分离 + 中英混说 + 词级置信度
2. （可选）再用 **WhisperX** 本地转写一遍，做交叉对照
3. `merge.py` 把两份转写按时间戳对齐，**两个引擎给出不同单词的位置 = 最该回听的位置**，自动标红
4. Web UI 里可以：
   - 听音频，词级高亮跟读
   - 点低置信度 / 引擎分歧的词，弹出候选列表（另一个引擎给的是什么 + 一键回听这个词）
   - 给每个英文段落一键调用 **Claude + GPT + Gemini** 并排翻译，跟下一段（一般是翻译员的中文）对照看
   - 一次性给五个说话人编号取名（法官、调解员、原告、被告、翻译员），存 localStorage

## 一次运行

```bash
cd court-tool
cp .env.example .env       # 填 DEEPGRAM_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
pip install -r requirements.txt

# 1) 主转写：Deepgram（云）
python transcribe_deepgram.py /path/to/hearing.mp3

# 2) 可选：本地交叉对照（需要 ffmpeg；CPU 上慢，GPU 上快）
python transcribe_whisperx.py /path/to/hearing.mp3

# 3) 合并 + 自动标记分歧词
python merge.py --primary outputs/deepgram.json --other outputs/whisperx.json
#  (没跑 WhisperX 就只用 Deepgram：)
# python merge.py --primary outputs/deepgram.json

# 4) 起 viewer
python server.py
# 打开 http://127.0.0.1:8000
```

## 引擎选型说明

| 项 | 选什么 | 为什么 |
|---|---|---|
| 主转写 | Deepgram Nova-3 (`language=multi`) | 原生中英混说 + diarization + 词置信度，一行 API |
| 交叉对照 | WhisperX (`large-v3`) | 跟 Deepgram 用完全不同的模型族；两者对同一个词给出不同拼写，就是高价值核对点 |
| 翻译比对 | Claude / GPT / Gemini 三家并排 | 不同模型的翻译风格和漏译点不同；三家一致 = 高把握，一家偏离 = 需注意 |

## 关键 UI 交互

- **左侧栏说话人**：第一次打开时全是"说话人 0/1/2…"，听几秒就能知道谁是法官；在输入框改名即可，下次自动保留。
- **黄色波浪线**：词置信度 < 0.7（Deepgram 自己不确定）。
- **红色波浪线 + 红底**：Deepgram 和 WhisperX 给的词不一样。点开看另一个引擎的候选词，一键回听。
- **跳转列表**：左下"跳转"区域列出所有有待核单词的段落，按时间排序，一键定位。
- **🌐 译 按钮**：每段右侧。点了之后弹出全屏面板：左上是英文原文，右上是法庭翻译员说的下一段（自动定位），下面两格是 Claude/GPT/Gemini 的翻译——一眼能看出翻译员漏了什么。
- **键盘**：空格 = 播放/暂停，左右 = ±3 秒，Esc = 关弹窗。

## 文件结构

```
court-tool/
├── transcribe_deepgram.py   # Deepgram → outputs/deepgram.json
├── transcribe_whisperx.py   # WhisperX → outputs/whisperx.json
├── merge.py                 # 对齐两份，标记需核对的词 → outputs/merged.json
├── translate.py             # CLI 翻译；也被 server.py 调用
├── server.py                # FastAPI，serve viewer + /api/translate
├── viewer/
│   ├── index.html
│   ├── viewer.css
│   └── viewer.js
└── outputs/                 # 中间产物
```

## 已知限制 & 取舍

- **Deepgram 没有原生 N-best 词级候选**，所以"候选"来自 WhisperX 对照。如果只跑了 Deepgram，红色分歧标记不会出现，但黄色低置信度仍会标。
- **WhisperX 默认不带 diarization**（pyannote 需要 HF token 和接受模型 license）。这里 diarization 信赖 Deepgram 一边就够了。
- **录音设备质量决定上限**。两个引擎都听不清的词，工具就只能告诉你"这里听不清"——这时弹出的候选就是空，需要你回听确认；语境信息可以再丢给 Claude 让它根据上下文猜（这是后续可加的功能）。

## 后续可加

- 用户手动修正后的转写写回 JSON / 导出 SRT / VTT / PDF
- 让 Claude 根据上下文猜低置信度词的可能性（"根据前后 30 秒，这个词更可能是 …"）
- 多个录音文件管理 + 全文搜索
- 把 Deepgram 的 N 个 alternatives 当 fallback（需要 `alternatives` 参数和不同 endpoint）
