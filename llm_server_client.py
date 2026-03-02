import requests

def generate_from_llama(prompt):
    r = requests.post(
        "http://localhost:8000/completion",
        json={
            "prompt": prompt,
            "max_tokens": 256,
            "temperature": 0.2,
            "top_p": 0.9,
            "repeat_penalty": 1.1
        },
        timeout=120
    )
    return r.json()["content"]
