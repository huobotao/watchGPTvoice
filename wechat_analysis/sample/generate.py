"""Generate synthetic WeChat-like chat data for demos / tests.

NOT real data. Used only to verify the pipeline end-to-end.
"""
from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

random.seed(42)

TZ = timezone(timedelta(hours=8))


def _emit(out, ts, peer_id, peer_name, peer_type, direction, msg_type,
          text="", amount=None, sender_id=None, sender_name=None):
    rec = {
        "ts": ts.isoformat(),
        "peer_id": peer_id,
        "peer_name": peer_name,
        "peer_type": peer_type,
        "direction": direction,
        "sender_id": sender_id or ("self" if direction == "out" else peer_id),
        "sender_name": sender_name or ("我" if direction == "out" else peer_name),
        "msg_type": msg_type,
        "text": text,
    }
    if amount is not None:
        rec["amount"] = amount
    out.append(rec)


def _conversation(out, day: datetime, peer_id, peer_name, peer_type,
                  intensity: int, lines_pool: list[str], night: bool = False):
    hour = random.randint(22, 25) % 24 if night else random.randint(9, 22)
    t = day.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)
    for _ in range(intensity):
        direction = random.choice(["in", "out"])
        text = random.choice(lines_pool)
        _emit(out, t, peer_id, peer_name, peer_type, direction, "text", text)
        t += timedelta(seconds=random.randint(20, 600))


def generate(out_path: Path, start: datetime, days: int = 180) -> int:
    out: list[dict] = []

    daily_talk = ["在干嘛", "今天好累", "哈哈哈", "晚饭吃啥", "你看那个新闻了吗",
                  "周末有空吗", "我到了", "睡了晚安", "OK", "嗯嗯", "好的"]
    mom_talk = ["记得吃饭", "天冷加衣", "周末回来吃饭吗", "你最近怎么样", "嗯知道了妈"]
    work_talk = ["这个文档发我下", "明天 10 点会议", "收到", "已 push", "周报今晚给你",
                 "客户那边怎么说", "好的"]
    intimate = ["想你了", "晚安宝", "今天约会很开心", "等我下班", "爱你", "哈哈哈哈哈"]

    # Peer A: 妈妈 — 长期低频，最近 30 天上升
    for d in range(days):
        day = start + timedelta(days=d)
        if random.random() < 0.25 or d > days - 30:
            _conversation(out, day, "wxid_mom", "妈妈", "private",
                          intensity=random.randint(2, 4), lines_pool=mom_talk)

    # Peer B: 老板 — 工作日高频，周末几乎没有
    for d in range(days):
        day = start + timedelta(days=d)
        if day.weekday() < 5 and random.random() < 0.7:
            _conversation(out, day, "wxid_boss", "Leo", "private",
                          intensity=random.randint(3, 8), lines_pool=work_talk)

    # Peer C: 恋人 — 前 90 天升温，中段每日，最后 30 天骤降
    for d in range(days):
        day = start + timedelta(days=d)
        if d < 30:
            p = 0.4
            n = random.randint(2, 6)
        elif d < 150:
            p = 0.95
            n = random.randint(8, 20)
        else:
            p = 0.2
            n = random.randint(1, 3)
        if random.random() < p:
            _conversation(out, day, "wxid_lover", "小M", "private",
                          intensity=n, lines_pool=intimate + daily_talk,
                          night=random.random() < 0.5)
        # 一些转账
        if d in (15, 60, 100):
            t = day.replace(hour=12, minute=0)
            _emit(out, t, "wxid_lover", "小M", "private", "out",
                  "transfer", text="转账 给小M", amount=520.00)

    # Peer D: 朋友 - 偶发
    for d in range(days):
        day = start + timedelta(days=d)
        if random.random() < 0.1:
            _conversation(out, day, "wxid_friend", "阿K", "private",
                          intensity=random.randint(2, 5), lines_pool=daily_talk)

    # Peer E: 公司群 — 每个工作日有一些
    for d in range(days):
        day = start + timedelta(days=d)
        if day.weekday() < 5 and random.random() < 0.8:
            t = day.replace(hour=10, minute=random.randint(0, 59))
            for _ in range(random.randint(3, 10)):
                sender = random.choice([("u1", "张三"), ("u2", "李四"),
                                        ("u3", "Leo"), ("self", "我")])
                direction = "out" if sender[0] == "self" else "in"
                _emit(out, t, "g_company", "项目组", "group", direction,
                      "text", random.choice(work_talk),
                      sender_id=sender[0], sender_name=sender[1])
                t += timedelta(seconds=random.randint(30, 400))

    out.sort(key=lambda r: r["ts"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(out)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="wechat_analysis/sample/synthetic.jsonl")
    ap.add_argument("--days", type=int, default=180)
    args = ap.parse_args()
    start = datetime(2025, 11, 1, tzinfo=TZ)
    n = generate(Path(args.out), start, days=args.days)
    print(f"wrote {n} messages to {args.out}")
