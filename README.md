# ⚖️ Multilingual RAG-Based Indian Legal AI Assistant

An AI-powered Indian Legal Research Assistant built using Retrieval-Augmented Generation (RAG), Mistral 7B, FAISS vector search, reranking, and NLLB multilingual translation.

This system answers questions about Indian law with cited sources and supports multilingual output (English → Tamil).


## 🚀 Features

- 🔍 FAISS-based semantic retrieval
- 📊 Cross-encoder reranking for better accuracy
- 🧠 Mistral 7B for legal reasoning
- 🌐 Multilingual translation (English → Tamil using NLLB)
- 📚 Source citation (Article / Section references)
- ⚡ Streaming response support
- 🎨 Clean chat-based UI


## 🏗 Architecture

User Query  
↓  
Retriever (FAISS Vector Search)  
↓  
Reranker (Cross Encoder)  
↓  
Context Builder  
↓  
Mistral 7B (Answer Generation)  
↓  
NLLB Translation (Optional)  
↓  
Frontend Streaming Output  



## 🧠 Models Used

### 1️⃣ Mistral 7B (LLM)

- Used for legal reasoning and answer generation.
- Runs locally via LLM server (`http://127.0.0.1:8080/completion`)
- Generates structured, citation-aware answers.


### 2️⃣ FAISS Vector Index

- Stores embedded Indian legal corpus.
- Performs semantic similarity search.
- Retrieves top-k relevant legal sections.


### 3️⃣ Cross-Encoder Reranker

- Improves retrieval precision.
- Re-ranks retrieved documents before passing to LLM.
- 

### 4️⃣ NLLB-200 (facebook/nllb-200-distilled-600M)

- Used for multilingual translation.
- Supports English → Tamil translation.
- Runs locally (offline supported).

Language codes used:
- English → `eng_Latn`
- Tamil → `tam_Taml`


🔐 Offline Support
FAISS index runs locally
Mistral runs locally
NLLB translation model stored locally
No external API calls required after setup


⚡ Future Improvements
Tamil → English query support
Conversation memory
Legal glossary explanations
Confidence scoring
Hybrid search (BM25 + FAISS)
Additional Indian language support


📜 License
This project is for educational and research purposes.
Not a substitute for professional legal advice.
