from app.embeddings.embedding_model import EmbeddingModel


class EmbeddingService:
    """
    Converts LangChain Documents into vector embeddings.
    """

    def __init__(self):
        self.embedding_model = EmbeddingModel()

    def embed_documents(self, documents):
        """
        Input:
            List[Document]

        Output:
            List[dict]
        """

        texts = [doc.page_content for doc in documents]

        vectors = self.embedding_model.encode(texts)

        embedded_documents = []

        for doc, vector in zip(documents, vectors):
            embedded_documents.append(
                {
                    "text": doc.page_content,
                    "embedding": vector.tolist(),
                    "metadata": doc.metadata,
                }
            )

        return embedded_documents