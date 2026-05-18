import os
import json
import uuid
import shutil
import asyncio
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel

import translate as T
import transcribe_deepgram as Edg
import transcribe_assemblyai as Eaa
import transcribe_replicate as Erp
import transcribe_groq as Egq
import merge as M

load_dotenv()

ROOT = Path(__file__).parent
VIEWER = ROOT / "viewer"
DATA = Path(os.environ.get("DATA_DIR", "/tmp/court-tool-data"))
DATA.mkdir(parents=True, exist_ok=True)

APP_PASSWORD = os.environ.get("APP_PASSWORD")

app = FastAPI(title="Court Transcription")

JOBS: dict[str, dict] = {}

ENGINES = {
    "deepgram": ("DEEPGRAM_API_KEY", lambda audio, env: _run_deepgram(audio, env)),
    "assemblyai": ("ASSEMBLYAI_API_KEY", lambda audio, env: _run_assemblyai(audio, env)),
    "replicate": ("REPLICATE_API_TOKEN", lambda audio, env: _run_replicate(audio, env)),
    "groq": ("GROQ_API_KEY", lambda audio, env: _run_groq(audio, env)),
}


def _run_deepgram(audio: Path, env: dict) -> dict:
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource
    client = DeepgramClient(env["DEEPGRAM_API_KEY"])
    with open(audio, "rb") as f:
        buf = f.read()
    opts = PrerecordedOptions(model="nova-3", language="multi",
                              smart_format=True, diarize=True, punctuate=True,
                              utterances=True, paragraphs=True)
    resp = client.listen.rest.v("1").transcribe_file({"buffer": buf}, opts)
    return Edg.normalize(resp.to_dict(), str(audio))


def _run_assemblyai(audio: Path, env: dict) -> dict:
    data = Eaa.transcribe(str(audio), env["ASSEMBLYAI_API_KEY"])
    return Eaa.normalize(data, str(audio))


def _run_replicate(audio: Path, env: dict) -> dict:
    out = Erp.transcribe(str(audio), env["REPLICATE_API_TOKEN"])
    return Erp.normalize(out, str(audio), "en")


def _run_groq(audio: Path, env: dict) -> dict:
    data = Egq.transcribe(str(audio), env["GROQ_API_KEY"])
    return Egq.normalize(data, str(audio))


def _has_password() -> bool:
    return bool(APP_PASSWORD)


@app.middleware("http")
async def auth(request: Request, call_next):
    if not _has_password() or request.url.path.startswith("/api/health"):
        return await call_next(request)
    if request.cookies.get("ct_auth") == APP_PASSWORD:
        return await call_next(request)
    if request.url.path == "/api/login":
        return await call_next(request)
    if request.url.path.startswith("/login"):
        return await call_next(request)
    if request.method == "GET" and request.url.path in ("/", "/index.html"):
        return RedirectResponse("/login.html")
    if request.url.path.startswith("/api/"):
        raise HTTPException(401, "unauthorized")
    return await call_next(request)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "engines_configured": [
            name for name, (envk, _) in ENGINES.items() if os.environ.get(envk)
        ],
        "translators_configured": [
            k for k, envk in [("claude", "ANTHROPIC_API_KEY"),
                              ("gpt", "OPENAI_API_KEY"),
                              ("gemini", "GEMINI_API_KEY")]
            if os.environ.get(envk)
        ],
        "password_required": _has_password(),
    }


class LoginReq(BaseModel):
    password: str


@app.post("/api/login")
def login(req: LoginReq):
    if not _has_password():
        return {"ok": True}
    if req.password != APP_PASSWORD:
        raise HTTPException(401, "bad password")
    r = JSONResponse({"ok": True})
    r.set_cookie("ct_auth", APP_PASSWORD, max_age=60*60*24*30,
                 httponly=True, samesite="lax")
    return r


@app.post("/api/upload")
async def upload(file: UploadFile = File(...),
                 engines: str = Form("deepgram,assemblyai,groq")):
    jid = uuid.uuid4().hex[:10]
    job_dir = DATA / jid
    job_dir.mkdir(parents=True, exist_ok=True)
    audio_path = job_dir / file.filename
    with audio_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    requested = [e.strip() for e in engines.split(",") if e.strip()]
    available = [e for e in requested if os.environ.get(ENGINES.get(e, ("",))[0])]
    if not available:
        raise HTTPException(400, f"no engines configured for {requested}")
    JOBS[jid] = {
        "id": jid,
        "status": "queued",
        "audio": str(audio_path),
        "filename": file.filename,
        "engines": available,
        "engine_status": {e: "queued" for e in available},
        "logs": [],
        "merged": None,
        "created_at": time.time(),
    }
    asyncio.create_task(run_job(jid))
    return {"job_id": jid, "engines": available}


async def run_job(jid: str) -> None:
    job = JOBS[jid]
    job["status"] = "running"
    job_dir = DATA / jid
    transcripts: list[tuple[str, dict]] = []
    env = dict(os.environ)
    loop = asyncio.get_event_loop()

    async def one_engine(name: str) -> None:
        try:
            job["engine_status"][name] = "running"
            job["logs"].append(f"→ {name} 转写中…")
            envk, fn = ENGINES[name]
            t0 = time.time()
            result = await loop.run_in_executor(None, fn, Path(job["audio"]), env)
            dt = time.time() - t0
            (job_dir / f"{name}.json").write_text(
                json.dumps(result, ensure_ascii=False, indent=2))
            transcripts.append((name, result))
            job["engine_status"][name] = "done"
            job["logs"].append(f"✓ {name} 完成 ({dt:.1f}s, {len(result['segments'])} 段)")
        except Exception as e:
            job["engine_status"][name] = "failed"
            job["logs"].append(f"✗ {name} 失败: {type(e).__name__}: {str(e)[:200]}")

    await asyncio.gather(*[one_engine(e) for e in job["engines"]])

    if not transcripts:
        job["status"] = "failed"
        job["logs"].append("所有引擎都失败,任务终止")
        return

    job["logs"].append("→ 合并对照…")
    primary_name, primary = transcripts[0]
    others = [t for _, t in transcripts[1:]]
    try:
        merged = M.merge(primary, others)
        merged["audio"] = f"/api/audio/{jid}"
        merged["job_id"] = jid
        (job_dir / "merged.json").write_text(
            json.dumps(merged, ensure_ascii=False, indent=2))
        job["merged"] = merged
        job["status"] = "done"
        s = merged["stats"]
        job["logs"].append(f"✓ 合并完成: {s['review_words']}/{s['total_words']} 词待核")
    except Exception as e:
        job["status"] = "failed"
        job["logs"].append(f"✗ 合并失败: {e}")


@app.get("/api/jobs")
def list_jobs():
    return [
        {
            "id": j["id"],
            "filename": j.get("filename"),
            "status": j["status"],
            "engines": j["engines"],
            "engine_status": j["engine_status"],
            "created_at": j["created_at"],
            "stats": j["merged"]["stats"] if j.get("merged") else None,
        }
        for j in sorted(JOBS.values(), key=lambda x: -x["created_at"])
    ]


@app.get("/api/jobs/{jid}")
def job_status(jid: str):
    j = JOBS.get(jid)
    if not j:
        raise HTTPException(404, "job not found")
    return {
        "id": j["id"],
        "filename": j.get("filename"),
        "status": j["status"],
        "engines": j["engines"],
        "engine_status": j["engine_status"],
        "logs": j["logs"][-50:],
        "transcript_ready": j["status"] == "done",
    }


@app.get("/api/jobs/{jid}/transcript")
def job_transcript(jid: str):
    j = JOBS.get(jid)
    if not j or not j.get("merged"):
        raise HTTPException(404, "transcript not ready")
    return JSONResponse(j["merged"])


@app.get("/api/audio/{jid}")
def job_audio(jid: str):
    j = JOBS.get(jid)
    if not j:
        raise HTTPException(404)
    audio = Path(j["audio"])
    if not audio.exists():
        raise HTTPException(404, "audio missing")
    return FileResponse(audio)


class TranslateReq(BaseModel):
    text: str
    engines: list[str] | None = None


@app.post("/api/translate")
async def translate(req: TranslateReq):
    if not req.text.strip():
        raise HTTPException(400, "empty text")
    avail = [e for e in (req.engines or ["claude", "gpt", "gemini"])
             if os.environ.get({"claude": "ANTHROPIC_API_KEY",
                                "gpt": "OPENAI_API_KEY",
                                "gemini": "GEMINI_API_KEY"}.get(e, ""))]
    if not avail:
        raise HTTPException(400, "no translator engines configured")
    return await T.translate_all(req.text, avail)


app.mount("/", StaticFiles(directory=str(VIEWER), html=True), name="viewer")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
