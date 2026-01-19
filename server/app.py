# server/app.py
import pathlib
import re
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from url_engine import analyze_urls, normalize_url, virustotal_lookup

BASE = pathlib.Path(__file__).resolve().parent
MODEL_PATH = BASE / "model" / "sms_spam_pipeline.joblib"  # <- matches your saved path

app = FastAPI(title="Aman SMS Analyzer", version="1.0")

URL_RE = re.compile(r"(?:https?://|www\.)[^\s)]+", re.IGNORECASE)


class AnalyzeRequest(BaseModel):
    text: str


# Load model once at startup
model = joblib.load(MODEL_PATH)


def _get_classes():
    """
    Works for:
    - plain estimators (model.classes_)
    - sklearn Pipeline (last step has classes_)
    """
    if hasattr(model, "classes_"):
        return list(model.classes_)

    if hasattr(model, "named_steps"):
        last_step = list(model.named_steps.values())[-1]
        if hasattr(last_step, "classes_"):
            return list(last_step.classes_)

    return None


def _spam_probability(text: str) -> float:
    proba = model.predict_proba([text])[0]
    classes = _get_classes()

    if not classes:
        raise RuntimeError("Could not determine classes_ from the loaded model.")

    # Case A: string labels
    if "spam" in classes:
        return float(proba[classes.index("spam")])

    # Case B: numeric labels (0/1) where 1 = spam
    if 1 in classes:
        return float(proba[classes.index(1)])

    raise RuntimeError(f"Unrecognized classes_: {classes}")


class UrlAnalyzeIn(BaseModel):
    urls: List[str]


class FeedbackIn(BaseModel):
    url: str
    label: str  # e.g., "scam" or "legit"


@app.post("/url/feedback")
def url_feedback(payload: FeedbackIn):
    from url_engine import store_feedback
    store_feedback(payload.url, payload.label)
    return {"status": "ok", "message": "Feedback stored for review"}


@app.get("/")
def root():
    return {"status": "ok", "hint": "Open /docs for Swagger UI"}


@app.post("/url/analyze")
def url_analyze(payload: UrlAnalyzeIn):
    results = analyze_urls(payload.urls)
    return {"results": results}


@app.post("/url/deep-check")
def url_deep_check(req: AnalyzeRequest):
    url = req.text.strip()
    if not url:
        return {"error": "No URL provided"}
    url = normalize_url(url)
    return virustotal_lookup(url)


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    text = req.text.strip()

    if not text:
        return {
            "score": 0,
            "model": {"label": "ham", "confidence": 0.0},
            "urls": [],
            "reasons": [],
        }

    # Model outputs
    p_spam = _spam_probability(text)
    authenticity_score = round((1.0 - p_spam) * 100)

    # Predicted label (robust for numeric or string labels)
    pred = model.predict([text])[0]
    if isinstance(pred, str):
        label = "spam" if pred.lower() == "spam" else "ham"
    else:
        label = "spam" if int(pred) == 1 else "ham"

    confidence = float(p_spam if label == "spam" else (1.0 - p_spam))

    # URLs extraction
    raw_urls = URL_RE.findall(text) or []
    
    # URL Analysis
    url_results = analyze_urls(raw_urls)

    # Simple “reasons” (optional but helpful for the UI)
    reasons = []
    lower = text.lower()
    if any(k in lower for k in ["urgent", "immediately", "asap", "limited time", "act now"]):
        reasons.append(
            {"code": "urgency", "title": "Urgency pressure", "detail": "Message uses urgent language to push quick action."}
        )
    if any(k in lower for k in ["verify", "confirm", "login", "password", "otp", "pin"]):
        reasons.append(
            {"code": "credentials", "title": "Credential request", "detail": "Message mentions verifying/login/OTP/PIN."}
        )
    
    if url_results:
        reasons.append(
            {"code": "url_present", "title": "Link present", "detail": f"Message contains {len(url_results)} URL(s)."}
        )
        
        # Add risk reasons from URLs
        for res in url_results:
            if res["final_verdict"] != "clean":
                reasons.append({
                    "code": f"url_{res['final_verdict']}",
                    "title": f"Unsafe link: {res['final_verdict']}",
                    "detail": f"URL {res['url']} is flagged: {', '.join(res['reasons'])}"
                })

    return {
        "score": authenticity_score,
        "model": {"label": label, "confidence": confidence},
        "urls": url_results,
        "reasons": reasons,
    }