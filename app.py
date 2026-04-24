from flask import Flask, render_template, request, Response, stream_with_context, session, redirect, url_for, jsonify
from RAG.retriever import LegalRetriever
from reranker import LegalReranker
from context_builder import build_context
from llm_gen import LegalAnswerGenerator
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from functools import wraps
from db import (
    init_db, create_user, get_user_by_email, verify_password,
    get_chats_for_user, create_chat, update_chat_title, delete_chat,
    add_message, get_messages_for_chat
)
import torch

app = Flask(__name__)
app.secret_key = "change_this_to_a_long_random_secret_key"

retriever = LegalRetriever(
    "./RAG/vectorstore_v2/legal.index",
    "./RAG/cleaned/legal_corpus_v2.json"
)
reranker = LegalReranker()
llm = LegalAnswerGenerator(url="http://127.0.0.1:8080/completion")

translator_tokenizer = AutoTokenizer.from_pretrained(
    r"D:\Models\nllb",
    local_files_only=True
)
translator_model = AutoModelForSeq2SeqLM.from_pretrained(
    r"D:\Models\nllb",
    local_files_only=True
).to("cpu")
translator_model.eval()

LANG_MAP = {
    "en": "eng_Latn",
    "ta": "tam_Taml"
}

init_db()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("auth"))
        return f(*args, **kwargs)
    return decorated

def classify_intent(llm, query):
    prompt = f"""
Classify the following user query into exactly one category:
Categories:
- GREETING (Thank you also comes under this)
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
    return translator_tokenizer.decode(outputs[0], skip_special_tokens=True)

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/auth')
def auth():
    if "user_id" in session:
        return redirect(url_for("chatbot"))
    return render_template('auth.html')

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if get_user_by_email(email):
        return jsonify({"error": "An account with this email already exists."}), 409

    user = create_user(name, email, password)
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    return jsonify({"ok": True, "redirect": "/chatbot"}), 201

@app.route('/api/signin', methods=['POST'])
def signin():
    data = request.json
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password."}), 401

    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    return jsonify({"ok": True, "redirect": "/chatbot"})

@app.route('/api/signout', methods=['POST'])
def signout():
    session.clear()
    return jsonify({"ok": True, "redirect": "/"})

@app.route('/chatbot')
@login_required
def chatbot():
    return render_template('chatbot.html')

# ── Chat history API ──────────────────────────────────────────

@app.route('/api/chats', methods=['GET'])
@login_required
def list_chats():
    chats = get_chats_for_user(session["user_id"])
    return jsonify(chats)

@app.route('/api/chats/<chat_id>', methods=['GET'])
@login_required
def get_chat(chat_id):
    messages = get_messages_for_chat(chat_id, session["user_id"])
    if messages is None:
        return jsonify({"error": "Chat not found."}), 404
    return jsonify(messages)

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
@login_required
def remove_chat(chat_id):
    delete_chat(chat_id, session["user_id"])
    return jsonify({"ok": True})

@app.route('/api/chats/<chat_id>/message', methods=['POST'])
@login_required
def save_message(chat_id):
    data = request.json
    role = data.get("role")
    content = (data.get("content") or "").strip()
    title = (data.get("title") or "").strip()

    if role not in ("user", "bot") or not content:
        return jsonify({"error": "Invalid payload."}), 400

    if role == "user":
        create_chat(chat_id, session["user_id"], title or content[:48])
        if title:
            update_chat_title(chat_id, title)

    add_message(chat_id, role, content)
    return jsonify({"ok": True})

# ── Ask (RAG) ─────────────────────────────────────────────────

@app.route('/ask', methods=['POST'])
@login_required
def ask():
    data = request.json
    if not data:
        return Response("Invalid request.", mimetype="text/plain", status=400)

    query = data.get("query", "").strip()
    if not query:
        return Response("Empty query.", mimetype="text/plain", status=400)

    lang_code = data.get("language", "en")
    target_lang = LANG_MAP.get(lang_code, "eng_Latn")

    try:
        intent = classify_intent(llm, query)
        print("Intent:", intent)
    except Exception as e:
        print("Intent classification error:", e)
        return Response("Error classifying intent.", mimetype="text/plain", status=500)

    if "GREETING" in intent:
        greeting = "Hello! I am an Indian legal research assistant. You can ask me questions about Indian law."
        if target_lang != "eng_Latn":
            greeting = translate_text(greeting, target_lang)
        return Response(greeting, mimetype="text/plain")

    try:
        initial = retriever.search(query, k=10)
    except Exception as e:
        print("Retrieval error:", e)
        return Response("Error retrieving documents.", mimetype="text/plain", status=500)

    if not initial:
        return Response("No relevant legal documents found.", mimetype="text/plain")

    try:
        reranked = reranker.rerank(query, initial)
    except Exception as e:
        print("Reranking error:", e)
        return Response("Error reranking documents.", mimetype="text/plain", status=500)

    if not reranked:
        return Response("No relevant legal documents found.", mimetype="text/plain")

    reranked = reranked[:1] if reranked[0]["score"] > 0.8 else reranked[:3]
    prompt = build_context(query, reranked)

    def generate():
        try:
            if target_lang != "eng_Latn":
                full_output = ""
                for chunk in llm.generate_stream(prompt):
                    full_output += chunk
                yield translate_text(full_output, target_lang)
            else:
                for chunk in llm.generate_stream(prompt):
                    yield chunk

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
        except Exception as e:
            print("Generation error:", e)
            yield f"Error generating response: {str(e)}"

    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)