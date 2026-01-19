# server/app.py
import pathlib
import re
import joblib
from fastapi import FastAPI
from pydantic import BaseModel

BASE = pathlib.Path(__file__).resolve().parent
MODEL_PATH = BASE / "model" / "sms_spam_pipeline.joblib"  # <- matches your saved path

app = FastAPI(title="Aman SMS Analyzer", version="1.0")

URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)


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


@app.get("/")
def root():
    return {"status": "ok", "hint": "Open /docs for Swagger UI"}


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

    # URLs
    urls = [u.rstrip("),.?!:;\"'’") for u in (URL_RE.findall(text) or [])]

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
    if urls:
        reasons.append(
            {"code": "url_present", "title": "Link present", "detail": "Message contains at least one URL."}
        )

    return {
        "score": authenticity_score,
        "model": {"label": label, "confidence": confidence},
        "urls": [{"url": u, "verdict": "unknown"} for u in urls],
        "reasons": reasons,
    }