from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Text is required for embedding")

    embedding = model.encode(
        text,
        normalize_embeddings=True
    )

    return embedding.tolist()