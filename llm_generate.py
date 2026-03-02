from RAG.retriever import LegalRetriever
from reranker import LegalReranker
from context_builder import build_context
from llm_gen import LegalAnswerGenerator

def classify_intent(llm, query):
    prompt = f"""
Classify the following user query into exactly one category:

Categories:
- GREETING
- LEGAL_QUESTION
- OTHER

Query: "{query}"

Return only the category name.
"""
    result = llm.generate(prompt, max_new_tokens=5)
    return result.strip().upper()

retriever = LegalRetriever(
    "./RAG/vectorstore_v2/legal.index",
    "./RAG/cleaned/legal_corpus_v2.json"
)

reranker = LegalReranker()
llm = LegalAnswerGenerator(url="http://127.0.0.1:8080/completion")

query = input("Query: ")

# -------- Intent Routing --------#
intent = classify_intent(llm, query)
print(intent)
if intent == "GREETING":
    print("Hello! I am an Indian legal research assistant. You can ask me questions about Indian law.")
    exit()

elif intent == "OTHER":
    print("Please ask a question related to Indian law.")
    exit()

# -------- Legal RAG Pipeline --------#
initial = retriever.search(query, k=25)

if not initial:
    print("No relevant legal documents found.")
    exit()

reranked = reranker.rerank(query, initial)

if not reranked:
    print("No relevant legal documents after reranking.")
    exit()

if reranked[0]["score"] > 0.8:
    reranked = reranked[:1]
else:
    reranked = reranked[:3]

prompt = build_context(query, reranked, max_docs=5)

for chunk in llm.generate_stream(prompt):
    print(chunk, end="", flush=True)
