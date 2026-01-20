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


def url_risk_score(url_items: list[dict]) -> int:
    """
    url_items: each item includes fields like:
      verdict: 'clean' | 'unknown' | 'flagged'
      ml_prob: float (optional)
      safe_browsing: { sb_verdict: 'match'|'no_match'|'not_configured'... } (optional)
    """
    if not url_items:
        return 0

    # 1) If Google Safe Browsing returns a match, treat as very high risk.
    for u in url_items:
        sb = (u.get("safe_browsing") or {}).get("sb_verdict")
        if sb in ("match", "unsafe", "threat_match"):
            return 95

    # 2) If your engine already decided FLAGGED, push high.
    flagged = [u for u in url_items if u.get("verdict") == "flagged"]
    if flagged:
        # If ML is extremely confident, go higher; otherwise still high.
        max_prob = max(float(u.get("ml_prob") or 0) for u in flagged)
        return 95 if max_prob >= 0.97 else 88

    # 3) Unknown URLs (shorteners / new links) -> optional medium bump
    if any(u.get("verdict") == "unknown" for u in url_items):
        return 60

    return 0


def aggregate_overall_score(message_score: int, url_items: list[dict]) -> tuple[int, str]:
    u_score = url_risk_score(url_items)
    overall = max(int(message_score or 0), u_score)

    label = "High risk" if overall >= 80 else "Medium risk" if overall >= 50 else "Low risk"
    return overall, label


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
            "risk_label": "Low risk",
            "model": {"label": "ham", "confidence": 0.0},
            "urls": [],
            "reasons": [],
        }

    # Model outputs
    p_spam = _spam_probability(text)
    message_risk_score = round(p_spam * 100)

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

    overall_score, risk_label = aggregate_overall_score(message_risk_score, url_results)

    return {
        "score": overall_score,
        "risk_label": risk_label,
        "model": {"label": label, "confidence": confidence},
        "urls": url_results,
        "reasons": reasons,
        "text": text
    }