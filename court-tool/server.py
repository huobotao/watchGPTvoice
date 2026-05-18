import json
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import translate as T

load_dotenv()

ROOT = Path(__file__).parent
OUTPUTS = ROOT / "outputs"
VIEWER = ROOT / "viewer"

app = FastAPI(title="Court Transcription Viewer")


@app.get("/api/transcript")
def get_transcript():
    p = OUTPUTS / "merged.json"
    if not p.exists():
        raise HTTPException(404, "outputs/merged.json not found — run merge.py first")
    return JSONResponse(json.loads(p.read_text()))


@app.get("/api/audio")
def get_audio():
    p = OUTPUTS / "merged.json"
    if not p.exists():
        raise HTTPException(404, "merged.json not found")
    meta = json.loads(p.read_text())
    audio = Path(meta["audio"])
    if not audio.is_absolute():
        audio = (ROOT / audio).resolve()
    if not audio.exists():
        raise HTTPException(404, f"audio not found at {audio}")
    return FileResponse(audio)


class TranslateReq(BaseModel):
    text: str
    engines: list[str] | None = None


@app.post("/api/translate")
async def translate(req: TranslateReq):
    if not req.text.strip():
        raise HTTPException(400, "empty text")
    return await T.translate_all(req.text, req.engines)


app.mount("/", StaticFiles(directory=str(VIEWER), html=True), name="viewer")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
