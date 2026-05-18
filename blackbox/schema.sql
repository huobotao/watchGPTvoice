-- 统一事件表：所有数据源最终都落到这里
-- 设计要点：
--   * ts 是真实发生时间（UTC ISO8601），不是导入时间
--   * (source, external_id) 唯一，保证导入器可重跑
--   * text 是给全文检索和 AI 阅读的归一化文本
--   * raw_json 保留源数据的全部细节，避免重导
CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY,
    ts           TEXT    NOT NULL,            -- ISO8601, e.g. 2026-05-18T14:00:00Z
    source       TEXT    NOT NULL,            -- 'photos' | 'location' | 'screenshot' | 'wechat' | 'watch_audio'
    kind         TEXT    NOT NULL,            -- 子类型，如 'photo' / 'video' / 'gps_point' / 'message'
    external_id  TEXT    NOT NULL,            -- 源内的稳定 id（文件 hash / msg id / 时间戳）
    text         TEXT,                        -- 归一化文本（OCR/转写/聊天内容/EXIF 摘要）
    lat          REAL,
    lon          REAL,
    media_path   TEXT,                        -- 本地文件路径（图片/音频/视频）
    raw_json     TEXT,                        -- 原始字段全量备份
    imported_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_events_ts     ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_source ON events (source, ts);
CREATE INDEX IF NOT EXISTS idx_events_geo    ON events (lat, lon) WHERE lat IS NOT NULL;

-- 全文检索：FTS5 外部内容表，跟随 events 自动同步
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5 (
    text,
    content='events',
    content_rowid='id',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
    INSERT INTO events_fts (rowid, text) VALUES (new.id, new.text);
END;
CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
    INSERT INTO events_fts (events_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;
CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts (events_fts, rowid, text) VALUES ('delete', old.id, old.text);
    INSERT INTO events_fts (rowid, text) VALUES (new.id, new.text);
END;
