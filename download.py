from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "facebook/nllb-200-distilled-600M"

print("Downloading NLLB English → Tamil model...")

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

tokenizer.save_pretrained("./models/nllb")
model.save_pretrained("./models/nllb")

print("Saved to ./models/nllb")