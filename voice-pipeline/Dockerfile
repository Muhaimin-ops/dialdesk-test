FROM python:3.12-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends espeak-ng libgomp1 \
  && rm -rf /var/lib/apt/lists/*
COPY voice-pipeline/requirements.txt ./requirements.txt
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY voice-pipeline/ ./

ENV PYTHONUNBUFFERED=1
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7860/health', timeout=3)" || exit 1
CMD ["uvicorn", "web_voice:app", "--host", "0.0.0.0", "--port", "7860"]
