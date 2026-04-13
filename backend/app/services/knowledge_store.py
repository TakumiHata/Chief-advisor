"""CoC knowledge store backed by ChromaDB for RAG retrieval."""

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings

COLLECTION_NAME = "coc_knowledge"


def _get_client() -> chromadb.ClientAPI:
    return chromadb.HttpClient(
        host=settings.chroma_host,
        port=settings.chroma_port,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _get_collection(client: chromadb.ClientAPI) -> chromadb.Collection:
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def add_documents(
    documents: list[str],
    metadatas: list[dict] | None = None,
    ids: list[str] | None = None,
) -> int:
    """Add knowledge documents to the store. Returns count of added docs."""
    client = _get_client()
    collection = _get_collection(client)

    if ids is None:
        existing = collection.count()
        ids = [f"doc_{existing + i}" for i in range(len(documents))]

    collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
    return len(documents)


def search(query: str, n_results: int = 5) -> list[dict]:
    """Search for relevant knowledge given a query string."""
    client = _get_client()
    collection = _get_collection(client)

    if collection.count() == 0:
        return []

    results = collection.query(query_texts=[query], n_results=n_results)

    docs = []
    for i in range(len(results["ids"][0])):
        doc = {
            "id": results["ids"][0][i],
            "document": results["documents"][0][i],
            "distance": results["distances"][0][i] if results["distances"] else None,
        }
        if results["metadatas"] and results["metadatas"][0][i]:
            doc["metadata"] = results["metadatas"][0][i]
        docs.append(doc)

    return docs


def get_stats() -> dict:
    """Return collection stats."""
    client = _get_client()
    collection = _get_collection(client)
    return {"collection": COLLECTION_NAME, "count": collection.count()}


def reset() -> None:
    """Delete and recreate the collection."""
    client = _get_client()
    client.delete_collection(COLLECTION_NAME)
    _get_collection(client)
