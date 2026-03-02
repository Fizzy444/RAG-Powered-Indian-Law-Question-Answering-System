import json
import faiss
import numpy as np
import torch
import re
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
from concurrent.futures import ProcessPoolExecutor

RE_WHITE_SPACE = re.compile(r'\s+')

def clean_text(text):
    text = text.replace('\xa0', ' ')
    return RE_WHITE_SPACE.sub(' ', text).strip()

def build_index(input_json, index_path, meta_path):
    print(f"Loading data from {input_json}...")
    with open(input_json, encoding="utf-8") as f:
        data = json.load(f)

    print("Extracting texts and metadata...")
    texts = []
    metadata = []
    
    with ProcessPoolExecutor() as executor:
        raw_texts = [d["text"] for d in data]
        texts = list(tqdm(executor.map(clean_text, raw_texts), total=len(raw_texts), desc="Cleaning Text"))
        metadata = [d["metadata"] for d in data]

    if torch.cuda.is_available():
        device = "cuda"
        print("Using GPU: Enabling FP16 for 2x speedup.")
        model_kwargs = {"torch_dtype": torch.float16} 
    elif torch.backends.mps.is_available():
        device = "mps"
        model_kwargs = {}
    else:
        device = "cpu"
        torch.set_num_threads(8) 
        model_kwargs = {}
        print("Using CPU: Optimized thread count.")

    model = SentenceTransformer("BAAI/bge-base-en-v1.5", device=device)

    print(f"Generating embeddings for {len(texts)} items...")
    embeddings = model.encode(
        texts, 
        normalize_embeddings=True, 
        batch_size=128 if device != "cpu" else 64,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    print("Building FAISS index...")
    dim = embeddings.shape[1]
    
    index = faiss.IndexFlatIP(dim)

    index.add(embeddings.astype("float32"))

    print(f"Saving index to {index_path}...")
    faiss.write_index(index, index_path)
    
    print(f"Saving metadata to {meta_path}...")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False)

    print("Success: Vector store built.")

if __name__ == "__main__":
    build_index(
        "./RAG/cleaned/legal_corpus_v2.json",
        "./RAG/vectorstore/legal.index",
        "./RAG/vectorstore/metadata.json"
    )