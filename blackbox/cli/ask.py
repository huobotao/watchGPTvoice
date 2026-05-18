"""自然语言提问：把过滤出的事件流喂给 Claude，让它回答关于过去的问题。

用法:
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 -m blackbox.cli.ask "上周末我去过哪？"
    python3 -m blackbox.cli.ask "我记得在机场拍过日落，是哪天？" --search 机场
    python3 -m blackbox.cli.ask "复盘最近一周注意力都在什么上" --since 7d

设计：
    * 事件按时间正序切 chunk，每 chunk ~50 条
    * 多 chunk 时用 prompt caching，把基础说明 + 历史 chunk 缓存
    * 流式打印答案
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Iterable

from anthropic import Anthropic

from ..db import connect
from .query import fetch, to_markdown

MODEL = os.environ.get("BLACKBOX_MODEL", "claude-opus-4-7")
CHUNK_SIZE = int(os.environ.get("BLACKBOX_CHUNK", "50"))

SYSTEM = """你是用户私人记忆助手。下面会提供他自己生活的事件流（相册/位置/截图/聊天记录等），\
事件按时间正序，每行是一次发生。请基于事件回答用户的问题：

- 如果用户问"我记得某件事什么时候发生"，找出最匹配的时间点并列出佐证。
- 如果用户问"复盘"或"总结"，识别注意力聚焦、转移、淡忘的模式，给出具体证据。
- 如果信息不足，明确说"事件流里没有这条线索"，而不是猜测。
- 引用证据时用 `[时间 来源]` 的格式，例如 `[2026-05-18T14:00Z photos]`。
"""


def chunked(rows: list, n: int) -> Iterable[list]:
    for i in range(0, len(rows), n):
        yield rows[i : i + n]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("question")
    ap.add_argument("--since")
    ap.add_argument("--until")
    ap.add_argument("--source")
    ap.add_argument("--search")
    ap.add_argument("--limit", type=int, default=2000)
    args = ap.parse_args(argv)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 2

    with connect() as conn:
        rows = fetch(conn, args.since, args.until, args.source, args.search, args.limit)

    if not rows:
        print("(没有匹配的事件，先跑 importer 或放宽过滤条件)", file=sys.stderr)
        return 1

    print(f"... feeding {len(rows)} events to {MODEL}", file=sys.stderr)

    # 多 chunk：前 N-1 chunk 标 cache_control，最后一个 chunk 跟问题一起
    chunks = list(chunked(rows, CHUNK_SIZE))
    content = []
    for i, chunk in enumerate(chunks):
        block = {"type": "text", "text": to_markdown(chunk)}
        # 缓存除最后一块外的所有事件块（节省 token 费用，便于反复问）
        if i < len(chunks) - 1:
            block["cache_control"] = {"type": "ephemeral"}
        content.append(block)
    content.append({"type": "text", "text": f"\n---\n问题：{args.question}"})

    client = Anthropic()
    with client.messages.stream(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM,
        messages=[{"role": "user", "content": content}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
