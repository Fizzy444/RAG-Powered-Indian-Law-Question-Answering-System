from flask import Flask, render_template, request, Response, stream_with_context
from RAG.retriever import LegalRetriever
from reranker import LegalReranker
from context_builder import build_context
from llm_gen import LegalAnswerGenerator

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

app = Flask(__name__)

retriever = LegalRetriever(
    "./RAG/vectorstore_v2/legal.index",
    "./RAG/cleaned/legal_corpus_v2.json"
)

reranker = LegalReranker()
llm = LegalAnswerGenerator(url="http://127.0.0.1:8080/completion")

translator_tokenizer = AutoTokenizer.from_pretrained(
    r"D:\Indian-law-llm\models\nllb",
    local_files_only=True
)

translator_model = AutoModelForSeq2SeqLM.from_pretrained(
    r"D:\Indian-law-llm\models\nllb",
    local_files_only=True
).to("cpu")

translator_model.eval()

LANG_MAP = {
    "en": "eng_Latn",
    # "hi": "hin_Deva",
    "ta": "tam_Taml"
    # "te": "tel_Telu",
    # "kn": "kan_Knda",
    # "ml": "mal_Mlym",
    # "mr": "mar_Deva",
    # "gu": "guj_Gujr",
    # "pa": "pan_Guru",
    # "bn": "ben_Beng"
}

def classify_intent(llm, query):
    prompt = f"""
Classify the following user query into exactly one category:

Categories:
- GREETING
- OTHER

Query: "{query}"

Return only the category name.
IMPORTANT:
DON'T say 'ANSWER:', just give only one of the 2 given words.
"""
    text = "".join(llm.generate_stream(prompt, max_new_tokens=8))
    return text.strip().upper()

def translate_text(text, target_lang):
    if not text.strip():
        return text

    translator_tokenizer.src_lang = "eng_Latn"

    inputs = translator_tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True
    )

    target_lang_id = translator_tokenizer.convert_tokens_to_ids(target_lang)

    with torch.no_grad():
        outputs = translator_model.generate(
            **inputs,
            forced_bos_token_id=target_lang_id,
            max_length=1024
        )

    return translator_tokenizer.decode(
        outputs[0],
        skip_special_tokens=True
    )

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html')

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    query = data.get("query")
    lang_code = data.get("language", "en")
    target_lang = LANG_MAP.get(lang_code, "eng_Latn")

    intent = classify_intent(llm, query)
    print("Intent:", intent)

    if "GREETING" in intent:
        greeting = "Hello! I am an Indian legal research assistant. You can ask me questions about Indian law."
        if target_lang != "eng_Latn":
            greeting = translate_text(greeting, target_lang)
        return Response(greeting, mimetype="text/plain")

    initial = retriever.search(query, k=10)
    if not initial:
        return Response("No relevant legal documents found.", mimetype="text/plain")

    reranked = reranker.rerank(query, initial)
    if not reranked:
        return Response("No relevant legal documents found.", mimetype="text/plain")

    reranked = reranked[:1] if reranked[0]["score"] > 0.8 else reranked[:3]
    prompt = build_context(query, reranked)

    def generate():
        full_output = ""

        for chunk in llm.generate_stream(prompt):
            full_output += chunk

        if target_lang != "eng_Latn":
            full_output = translate_text(full_output, target_lang)

        yield full_output

        sources_text = "\n\nSources:\n"

        for r in reranked:
            meta = r["metadata"]

            if meta["document_type"] == "constitution":
                sources_text += f"- Constitution of India, Article {meta['article']}\n"
            else:
                sources_text += f"- {meta['law_name']}, Section {meta['section']}\n"

        if target_lang != "eng_Latn":
            sources_text = translate_text(sources_text, target_lang)

        yield sources_text

    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)