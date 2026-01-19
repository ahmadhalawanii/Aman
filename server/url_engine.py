import os
import time
import joblib
import requests
import pathlib

BASE = pathlib.Path(__file__).resolve().parent
MODEL_PATH = BASE / "model" / "url_model.joblib"

# Load model lazily or at module level
try:
    _model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"Warning: Could not load URL model from {MODEL_PATH}: {e}")
    _model = None

SAFE_BROWSING_KEY = os.getenv("SAFE_BROWSING_API_KEY")

# Simple in-memory cache: {url: (expires_at, result_dict)}
_cache = {}
CACHE_TTL_SEC = 3600  # 1 hour

def ml_predict(urls):
    if _model is None:
        return ["unknown"] * len(urls), [0.0] * len(urls)
    
    preds = _model.predict(urls)
    probs = None
    if hasattr(_model, "predict_proba"):
        probs = _model.predict_proba(urls)
        # For multiclass, we take the max probability
        max_probs = [float(max(p)) for p in probs]
    else:
        max_probs = [1.0] * len(urls)
    
    return preds, max_probs

def safe_browsing_lookup(urls):
    if not SAFE_BROWSING_KEY:
        return {u: {"sb_verdict": "not_configured"} for u in urls}

    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SAFE_BROWSING_KEY}"
    body = {
        "client": {"clientId": "trustsnap-poc", "clientVersion": "0.1"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": u} for u in urls],
        },
    }
    try:
        r = requests.post(endpoint, json=body, timeout=10)
        r.raise_for_status()
        data = r.json()

        # Build a per-url map
        out = {u: {"sb_verdict": "no_match"} for u in urls}
        for m in data.get("matches", []) or []:
            u = m.get("threat", {}).get("url")
            if u:
                out[u] = {
                    "sb_verdict": "match",
                    "sb_threatType": m.get("threatType"),
                    "sb_platformType": m.get("platformType"),
                }
        return out
    except Exception as e:
        print(f"Safe Browsing API error: {e}")
        return {u: {"sb_verdict": "error", "detail": str(e)} for u in urls}

def analyze_urls(urls):
    urls = [u.strip() for u in urls if u.strip()]
    if not urls:
        return []
    
    # Simple limit for POC safety
    urls = urls[:20]

    # Cache check
    fresh = {}
    todo = []
    now = time.time()
    for u in urls:
        if u in _cache and _cache[u][0] > now:
            fresh[u] = _cache[u][1]
        else:
            todo.append(u)

    results = dict(fresh)

    if todo:
        preds, probs = ml_predict(todo)
        sb = safe_browsing_lookup(todo)

        for i, u in enumerate(todo):
            ml_label = str(preds[i])
            ml_prob = probs[i]

            sb_info = sb.get(u, {"sb_verdict": "unknown"})
            
            # Final verdict override logic
            if sb_info.get("sb_verdict") == "match":
                final = "malicious"
                reasons = ["Known unsafe URL (Google Safe Browsing)"]
            else:
                # simple mapping for POC
                # types in dataset: benign, phishing, malware, defacement
                if ml_label != "benign":
                    final = "suspicious" if ml_label == "phishing" else "malicious"
                    reasons = [f"URL pattern matches known {ml_label} examples"]
                else:
                    final = "clean"
                    reasons = []

            # Map to mobile app's expected "verdict" enum: unknown | flagged | clean
            if final in ["malicious", "suspicious"]:
                verdict = "flagged"
            elif final == "clean":
                verdict = "clean"
            else:
                verdict = "unknown"

            out = {
                "url": u,
                "ml_label": ml_label,
                "ml_prob": ml_prob,
                "safe_browsing": sb_info,
                "final_verdict": final,
                "verdict": verdict,
                "reasons": reasons,
            }
            results[u] = out
            _cache[u] = (now + CACHE_TTL_SEC, out)

    return [results[u] for u in urls]
