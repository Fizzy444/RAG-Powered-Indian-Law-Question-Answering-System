from sentence_transformers import CrossEncoder

class LegalReranker:
    def __init__(self):
        self.model = CrossEncoder("./models/ms-marco-MiniLM-L-6-v2")

    def rerank(self, query, docs):
        pairs = [(query, d["text"]) for d in docs]
        scores = self.model.predict(pairs)

        for d, s in zip(docs, scores):
            d["score"] = float(s)

        docs.sort(key=lambda x: x["score"], reverse=True)
        return docs