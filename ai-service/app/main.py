from fastapi import FastAPI
from pathlib import Path
import tempfile

from app.storage.miniio_client import download_file
from app.extraction.pdf_extractor import extract_text_from_pdf
from app.embeddings.embedding_service import generate_embedding


app = FastAPI(
    title="DMS AI/NLP Service",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "DMS AI/NLP Service"
    }


@app.post("/internal/extract/pdf/{object_key:path}")
def extract_pdf_from_minio(object_key: str):

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_file:

        temp_path = temp_file.name

    try:
        # Download PDF from MinIO
        download_file(object_key, temp_path)

        # Extract text / OCR
        result = extract_text_from_pdf(temp_path)

        return {
            "success": True,
            "object_key": object_key,
            **result
        }

    finally:
        Path(temp_path).unlink(missing_ok=True)

@app.post("/internal/embeddings")
def create_embedding(payload: dict):

    text = payload.get("text", "")

    embedding = generate_embedding(text)

    return {
        "success": True,
        "dimensions": len(embedding),
        "embedding": embedding
    }