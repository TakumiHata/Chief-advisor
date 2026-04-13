"""Knowledge base router — ingest and search CoC tactical knowledge."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import knowledge_store

router = APIRouter()


class IngestRequest(BaseModel):
    documents: list[str]
    metadatas: list[dict] | None = None
    ids: list[str] | None = None


class IngestResponse(BaseModel):
    added: int


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5


class SearchResult(BaseModel):
    id: str
    document: str
    distance: float | None = None
    metadata: dict | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]


class StatsResponse(BaseModel):
    collection: str
    count: int


@router.post("/knowledge/ingest", response_model=IngestResponse)
async def ingest(req: IngestRequest):
    """Add knowledge documents to ChromaDB."""
    try:
        added = knowledge_store.add_documents(
            documents=req.documents,
            metadatas=req.metadatas,
            ids=req.ids,
        )
        return IngestResponse(added=added)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB error: {e}")


@router.post("/knowledge/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    """Search knowledge base for relevant documents."""
    try:
        docs = knowledge_store.search(query=req.query, n_results=req.n_results)
        return SearchResponse(results=[SearchResult(**d) for d in docs])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB error: {e}")


@router.get("/knowledge/stats", response_model=StatsResponse)
async def stats():
    """Get knowledge base statistics."""
    try:
        return knowledge_store.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB error: {e}")


@router.post("/knowledge/reset")
async def reset():
    """Reset knowledge base (delete all documents)."""
    try:
        knowledge_store.reset()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB error: {e}")
