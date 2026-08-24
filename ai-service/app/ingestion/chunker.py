from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


class Chunker:

    def __init__(self,
                 chunk_size=500,
                 chunk_overlap=100):

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

    def chunk_documents(self, cleaned_documents):

        docs = []

        for doc in cleaned_documents:

            docs.append(
                Document(
                    page_content=doc["text"],
                    metadata=doc["metadata"]
                )
            )

        chunks = self.splitter.split_documents(docs)

        return chunks