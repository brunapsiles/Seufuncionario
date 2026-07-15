"""Servidor próprio de vídeo generativo do Seu Funcionário.

Executa Wan 2.2 TI2V 5B em uma GPU NVIDIA de 24 GB ou mais. A API mantém uma
fila persistente, processa um vídeo por vez e não aplica franquia por usuário.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import queue
import secrets
import shutil
import sqlite3
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from diffusers import AutoencoderKLWan, WanPipeline
from diffusers.utils import export_to_video
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

MODEL_ID = os.getenv("MODEL_ID", "Wan-AI/Wan2.2-TI2V-5B-Diffusers")
API_TOKEN = os.getenv("API_TOKEN", "")
DATA_DIR = Path(os.getenv("DATA_DIR", "/data"))
OUTPUT_DIR = DATA_DIR / "outputs"
DB_PATH = DATA_DIR / "jobs.sqlite3"
MAX_QUEUE = max(1, int(os.getenv("MAX_QUEUE", "8")))
OUTPUT_TTL_HOURS = max(1, int(os.getenv("OUTPUT_TTL_HOURS", "48")))
CONTENT_URL_TTL_SECONDS = max(300, int(os.getenv("CONTENT_URL_TTL_SECONDS", "3600")))
NEGATIVE_PROMPT = (
    "text, subtitles, watermark, logo, static frame, low quality, blurry, "
    "deformed hands, malformed limbs, duplicated people, oversaturated"
)

job_queue: queue.Queue[str] = queue.Queue()
pipeline: WanPipeline | None = None
pipeline_lock = threading.Lock()
logger = logging.getLogger("seu-funcionario-video")


class VideoRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=3000)
    quality: str = Field(default="advanced", pattern="^(standard|advanced)$")
    aspectRatio: str = Field(default="16:9", pattern="^(16:9|9:16)$")
    seed: int | None = Field(default=None, ge=0, le=2_147_483_647)


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> list[str]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute(
            """CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, prompt TEXT NOT NULL, quality TEXT NOT NULL,
                aspect_ratio TEXT NOT NULL, seed INTEGER NOT NULL, status TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0, error TEXT, output_path TEXT,
                created_at REAL NOT NULL, updated_at REAL NOT NULL
            )"""
        )
        now = time.time()
        db.execute(
            "UPDATE jobs SET status='queued', progress=1, error=NULL, updated_at=? "
            "WHERE status='running'",
            (now,),
        )
        pending = db.execute(
            "SELECT id FROM jobs WHERE status='queued' ORDER BY created_at"
        ).fetchall()
    return [row["id"] for row in pending]


def cleanup_expired_jobs() -> int:
    cutoff = time.time() - OUTPUT_TTL_HOURS * 3600
    with connect() as db:
        expired = db.execute(
            "SELECT id, output_path FROM jobs "
            "WHERE status IN ('done','failed','cancelled') AND updated_at < ?",
            (cutoff,),
        ).fetchall()
        for job in expired:
            if job["output_path"]:
                Path(job["output_path"]).unlink(missing_ok=True)
        if expired:
            db.executemany(
                "DELETE FROM jobs WHERE id=?", [(job["id"],) for job in expired]
            )
    return len(expired)


def update_job(job_id: str, **values: object) -> None:
    values["updated_at"] = time.time()
    assignments = ", ".join(f"{key}=?" for key in values)
    with connect() as db:
        db.execute(
            f"UPDATE jobs SET {assignments} WHERE id=?",  # noqa: S608 - fixed column names
            (*values.values(), job_id),
        )


def load_pipeline() -> WanPipeline:
    global pipeline
    with pipeline_lock:
        if pipeline is not None:
            return pipeline
        vae = AutoencoderKLWan.from_pretrained(
            MODEL_ID, subfolder="vae", torch_dtype=torch.float32
        )
        loaded = WanPipeline.from_pretrained(
            MODEL_ID, vae=vae, torch_dtype=torch.bfloat16
        )
        loaded.enable_model_cpu_offload()
        loaded.vae.enable_tiling()
        pipeline = loaded
        return loaded


def render_job(job_id: str) -> None:
    with connect() as db:
        job = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if job is None or job["status"] != "queued":
        return

    try:
        update_job(job_id, status="running", progress=3, error=None)
        pipe = load_pipeline()
        update_job(job_id, progress=12)

        advanced = job["quality"] == "advanced"
        landscape = job["aspect_ratio"] == "16:9"
        width, height = ((1280, 704) if advanced else (832, 480))
        if not landscape:
            width, height = height, width
        frames = 121 if advanced else 81
        steps = 50 if advanced else 28

        def progress_callback(_pipe, step: int, _timestep, callback_kwargs):
            progress = 12 + round(((step + 1) / steps) * 80)
            update_job(job_id, progress=min(progress, 92))
            return callback_kwargs

        generator = torch.Generator(device="cuda").manual_seed(job["seed"])
        result = pipe(
            prompt=job["prompt"],
            negative_prompt=NEGATIVE_PROMPT,
            height=height,
            width=width,
            num_frames=frames,
            guidance_scale=5.0,
            num_inference_steps=steps,
            generator=generator,
            callback_on_step_end=progress_callback,
        ).frames[0]

        output_path = OUTPUT_DIR / f"{job_id}.mp4"
        update_job(job_id, progress=95)
        export_to_video(result, output_path, fps=24)
        update_job(
            job_id,
            status="done",
            progress=100,
            output_path=str(output_path),
            error=None,
        )
        del result
        torch.cuda.empty_cache()
    except Exception:  # keep worker alive without exposing server internals
        logger.exception("Falha ao gerar o trabalho %s", job_id)
        update_job(
            job_id,
            status="failed",
            error="A geração falhou no servidor. Tente novamente em alguns minutos.",
            progress=0,
        )
        torch.cuda.empty_cache()


def worker_loop() -> None:
    while True:
        job_id = job_queue.get()
        try:
            render_job(job_id)
        finally:
            job_queue.task_done()


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not API_TOKEN:
        raise HTTPException(503, "API_TOKEN não configurado no servidor")
    expected = f"Bearer {API_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(401, "Não autorizado")


def content_signature(job_id: str, expires_at: int) -> str:
    payload = f"{job_id}:{expires_at}".encode()
    return hmac.new(API_TOKEN.encode(), payload, hashlib.sha256).hexdigest()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    recovered_jobs = initialize_database()
    cleanup_expired_jobs()
    threading.Thread(target=worker_loop, name="video-worker", daemon=True).start()
    for job_id in recovered_jobs:
        job_queue.put(job_id)
    yield


app = FastAPI(title="Seu Funcionário Video AI", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    with connect() as db:
        pending = db.execute(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')"
        ).fetchone()[0]
        outputs = db.execute(
            "SELECT COUNT(*) FROM jobs WHERE status='done'"
        ).fetchone()[0]
    disk = shutil.disk_usage(DATA_DIR)
    return {
        "status": "ok" if API_TOKEN and torch.cuda.is_available() else "not_ready",
        "ready": bool(API_TOKEN and torch.cuda.is_available()),
        "model": MODEL_ID,
        "modelLoaded": pipeline is not None,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "queue": job_queue.qsize(),
        "pending": pending,
        "maxQueue": MAX_QUEUE,
        "outputs": outputs,
        "freeDiskGb": round(disk.free / 1024**3, 1),
    }


@app.post("/v1/videos", dependencies=[Depends(require_auth)], status_code=202)
def create_video(body: VideoRequest) -> dict:
    if not torch.cuda.is_available():
        raise HTTPException(503, "Servidor sem GPU NVIDIA disponível")
    if len(body.prompt.strip()) < 5:
        raise HTTPException(422, "Descreva o vídeo em pelo menos 5 caracteres")
    cleanup_expired_jobs()
    with connect() as db:
        pending = db.execute(
            "SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')"
        ).fetchone()[0]
    if pending >= MAX_QUEUE:
        raise HTTPException(
            429,
            "A fila de vídeo está cheia. Aguarde uma geração terminar e tente novamente.",
        )
    job_id = f"wan_{secrets.token_hex(16)}"
    seed = body.seed if body.seed is not None else secrets.randbelow(2_147_483_647)
    now = time.time()
    with connect() as db:
        db.execute(
            "INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (
                job_id, body.prompt.strip(), body.quality, body.aspectRatio, seed,
                "queued", 1, None, None, now, now,
            ),
        )
    job_queue.put(job_id)
    return {
        "status": "pending",
        "requestId": job_id,
        "model": "Wan2.2-TI2V-5B",
        "position": job_queue.qsize(),
    }


@app.get("/v1/videos/{job_id}", dependencies=[Depends(require_auth)])
def video_status(job_id: str, request: Request) -> dict:
    with connect() as db:
        job = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if job is None:
        raise HTTPException(404, "Vídeo não encontrado")
    url = None
    if job["status"] == "done":
        expires_at = int(time.time()) + CONTENT_URL_TTL_SECONDS
        url = str(request.url_for("video_content", job_id=job_id))
        url = f"{url}?exp={expires_at}&sig={content_signature(job_id, expires_at)}"
    duration = (121 if job["quality"] == "advanced" else 81) / 24
    return {
        "status": job["status"],
        "progress": job["progress"],
        "url": url,
        "duration": round(duration, 2),
        "error": job["error"],
        "model": "Wan2.2-TI2V-5B",
    }


@app.delete("/v1/videos/{job_id}", dependencies=[Depends(require_auth)])
def cancel_video(job_id: str) -> dict:
    with connect() as db:
        job = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    if job is None:
        raise HTTPException(404, "Vídeo não encontrado")
    if job["status"] == "running":
        raise HTTPException(409, "A geração já começou e não pode ser interrompida")
    if job["output_path"]:
        Path(job["output_path"]).unlink(missing_ok=True)
    update_job(job_id, status="cancelled", progress=0, output_path=None)
    return {"status": "cancelled", "requestId": job_id}


@app.get("/v1/videos/{job_id}/content", name="video_content")
def video_content(job_id: str, exp: int = 0, sig: str = "") -> FileResponse:
    if not API_TOKEN:
        raise HTTPException(503, "Servidor não configurado")
    if exp < int(time.time()):
        raise HTTPException(401, "Link expirado")
    if not hmac.compare_digest(sig, content_signature(job_id, exp)):
        raise HTTPException(401, "Assinatura inválida")
    path = OUTPUT_DIR / f"{job_id}.mp4"
    if not path.is_file():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(path, media_type="video/mp4", filename=f"{job_id}.mp4")
