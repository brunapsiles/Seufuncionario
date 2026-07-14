FROM pytorch/pytorch:2.7.1-cuda12.8-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models \
    DATA_DIR=/data

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg git libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

RUN pip install \
    "fastapi==0.116.1" \
    "uvicorn[standard]==0.35.0" \
    "transformers>=4.52" \
    "accelerate>=1.8" \
    "sentencepiece>=0.2" \
    "ftfy>=6.3" \
    "imageio>=2.37" \
    "imageio-ffmpeg>=0.6" \
    "huggingface-hub[hf_xet]>=0.33" \
    "git+https://github.com/huggingface/diffusers.git"

WORKDIR /app
COPY server.py /app/server.py

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]

