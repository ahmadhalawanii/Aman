import joblib
import pathlib
import re
from fastapi import FastAPI
from pydantic import BaseModel

BASE = pathlib.Path(__file__).resolve().parent
MODEL_PATH = BASE / "model" / "sms_spam_pipeline.joblib"

app = FastAPI()
model = joblib.load(MODEL_PATH)

URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    text = req.text.strip()

    proba = model.predict_proba([text])[0]  # [p(ham), p(spam)] for this setup
    p_spam = float(proba[1])

    authenticity_score = round((1.0 - p_spam) * 100)

    urls = [u.rstrip("),.?!:;\"'’") for u in (URL_RE.findall(text) or [])]

    return {
        "score": authenticity_score,
        "model": {"label": "spam" if p_spam >= 0.5 else "ham", "confidence": max(p_spam, 1 - p_spam)},
        "urls": [{"url": u, "verdict": "unknown"} for u in urls],
        "reasons": [],  # optional: add model-token explanations later
    }