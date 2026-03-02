import faiss
import json
import numpy as np
from sentence_transformers import SentenceTransformer

class LegalRetriever:
    def __init__(self, index_path, corpus_path):
        self.index = faiss.read_index(index_path)
        self.corpus = json.load(open(corpus_path, encoding="utf-8"))
        self.model = SentenceTransformer("./models/bge-base-en-v1.5")

    def search(self, query, k=10, filters=None):
        qvec = self.model.encode([query], normalize_embeddings=True)
        scores, ids = self.index.search(np.array(qvec, dtype="float32"), k)

        results = []
        for idx in ids[0]:
            doc = self.corpus[idx]
            meta = doc["metadata"]

            if filters:
                if any(meta.get(key) != val for key, val in filters.items()):
                    continue

            results.append({
                "id": doc["id"],
                "text": doc["text"],
                "metadata": meta
            })

        return results
