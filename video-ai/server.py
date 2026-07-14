"""Servidor próprio de vídeo generativo do Seu Funcionário.

Executa Wan 2.2 TI2V 5B em uma GPU NVIDIA de 24 GB ou mais. A API mantém uma
fila persistente, processa um vídeo por vez e não aplica franquia por usuário.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import queue
import secrets
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
NEGATIVE_PROMPT = (
    "text, subtitles, watermark, logo, static frame, low quality, blurry, "
    "deformed hands, malformed limbs, duplicated people, oversaturated"
)

job_queue: queue.Queue[str] = queue.Queue()
pipeline: WanPipeline | None = None
pipeline_lock = threading.Lock()


class VideoRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=3000)
    quality: str = Field(default="advanced", pattern="^(standard|advanced)$")
    aspectRatio: str = Field(default="16:9", pattern="^(16:9|9:16)$")
    seed: int | None = Field(default=None, ge=0, le=2_147_483_647)


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
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
        db.execute(
            "UPDATE jobs SET status='failed', error='Servidor reiniciado durante a geração', "
            "updated_at=? WHERE status IN ('queued','running')",
            (time.time(),),
        )


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
    if job is None:
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
    except Exception as exc:  # keep worker alive and expose a safe failure message
        update_job(job_id, status="failed", error=str(exc)[:500], progress=0)
        torch.cuda.empty_cache()


def worker_loop() -> None:
    while True:
        render_job(job_queue.get())
        job_queue.task_done()


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not API_TOKEN:
        raise HTTPException(503, "API_TOKEN não configurado no servidor")
    expected = f"Bearer {API_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(401, "Não autorizado")


def content_signature(job_id: str) -> str:
    return hmac.new(API_TOKEN.encode(), job_id.encode(), hashlib.sha256).hexdigest()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    threading.Thread(target=worker_loop, name="video-worker", daemon=True).start()
    yield


app = FastAPI(title="Seu Funcionário Video AI", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": MODEL_ID,
        "modelLoaded": pipeline is not None,
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "queue": job_queue.qsize(),
    }


@app.post("/v1/videos", dependencies=[Depends(require_auth)], status_code=202)
def create_video(body: VideoRequest) -> dict:
    if not torch.cuda.is_available():
        raise HTTPException(503, "Servidor sem GPU NVIDIA disponível")
    if len(body.prompt.strip()) < 5:
        raise HTTPException(422, "Descreva o vídeo em pelo menos 5 caracteres")
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
        url = str(request.url_for("video_content", job_id=job_id))
        url = f"{url}?sig={content_signature(job_id)}"
    duration = (121 if job["quality"] == "advanced" else 81) / 24
    return {
        "status": job["status"],
        "progress": job["progress"],
        "url": url,
        "duration": round(duration, 2),
        "error": job["error"],
        "model": "Wan2.2-TI2V-5B",
    }


@app.get("/v1/videos/{job_id}/content", name="video_content")
def video_content(job_id: str, sig: str = "") -> FileResponse:
    if not hmac.compare_digest(sig, content_signature(job_id)):
        raise HTTPException(401, "Assinatura inválida")
    path = OUTPUT_DIR / f"{job_id}.mp4"
    if not path.is_file():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(path, media_type="video/mp4", filename=f"{job_id}.mp4")
