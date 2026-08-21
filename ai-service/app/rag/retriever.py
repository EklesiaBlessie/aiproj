from app.embeddings.embedding_model import EmbeddingModel
from app.vectordb.qdrant_client import VectorStore


class Retriever:

    def __init__(self):
        self.embedding_model = EmbeddingModel()
        self.vector_store = VectorStore()

    def search(self, query: str, limit: int = 5):

        query_vector = self.embedding_model.encode([query])[0].tolist()

        results = self.vector_store.search(
            query_vector=query_vector,
            limit=limit,
        )

        documents = []

        for point in results:
            documents.append(
                {
                    "score": point.score,
                    "text": point.payload["text"],
                    "metadata": {
                        k: v
                        for k, v in point.payload.items()
                        if k != "text"
                    },
                }
            )

        return documents
    
    def close(self):
        self.vector_store.close()