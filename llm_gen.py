import requests
import json

class LegalAnswerGenerator:
    def __init__(self, url="http://127.0.0.1:8080/completion"):
        self.url = url

    def generate_stream(self, prompt, max_new_tokens=500):
        payload = {
            "prompt": prompt,
            "n_predict": max_new_tokens,
            "stream": True,
            "temperature": 0.2,
            "top_p": 0.9,
            "stop": ["</s>", "Llama:", "User:", "QUESTION:", "LEGAL CONTEXT:"]
        }

        response = requests.post(self.url, json=payload, stream=True)

        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8')
                if line_text.startswith("data: "):
                    try:
                        chunk = json.loads(line_text[6:])
                        content = chunk.get("content", "")
                        yield content
                        if chunk.get("stop") is True:
                            break
                    except Exception as e:
                        print(f"Error parsing chunk: {e}")
                        continue