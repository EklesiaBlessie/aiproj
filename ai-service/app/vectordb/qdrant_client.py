import os
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
)


# Project root:
# D:\AI-Product-Manager-Copilot
BASE_DIR = Path(__file__).resolve().parents[3]
QDRANT_PATH = BASE_DIR / "qdrant_data"


class VectorStore:

    def __init__(
        self,
        collection_name="delivery_app_knowledge_base",
        vector_size=768,
    ):
        self.collection_name = collection_name

        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_host = os.getenv("QDRANT_HOST")
        qdrant_port = os.getenv("QDRANT_PORT")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        if qdrant_url:
            print(f"Connecting to remote Qdrant service via URL: {qdrant_url}")
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        elif qdrant_host:
            port = int(qdrant_port) if qdrant_port else 6333
            print(f"Connecting to remote Qdrant service via host: {qdrant_host}:{port}")
            self.client = QdrantClient(host=qdrant_host, port=port, api_key=qdrant_api_key)
        else:
            print(f"Using local embedded Qdrant database at path: {QDRANT_PATH}")
            self.client = QdrantClient(
                path=str(QDRANT_PATH)
            )

        self._create_collection(vector_size)

    def _create_collection(self, vector_size):

        collections = self.client.get_collections().collections

        names = [collection.name for collection in collections]

        if self.collection_name not in names:

            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE,
                ),
            )

            print(
                f"Created collection: {self.collection_name}"
            )

        else:

            print(
                f"Collection already exists: {self.collection_name}"
            )

    def insert_documents(self, embedded_documents):

        points = []

        for idx, doc in enumerate(embedded_documents):

            points.append(
                PointStruct(
                    id=idx,
                    vector=doc["embedding"],
                    payload={
                        "text": doc["text"],
                        **doc["metadata"],
                    },
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

        print(
            f"Inserted {len(points)} vectors."
        )

    def search(self, query_vector, limit=5):

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit,
            with_payload=True,
        )

        return results.points

    def close(self):
        self.client.close()