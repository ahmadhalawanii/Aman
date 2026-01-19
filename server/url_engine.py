import os
import time
import joblib
import requests
import pathlib
import sqlite3
import json
import hashlib
import base64
from urllib.parse import urlparse

BASE = pathlib.Path(__file__).resolve().parent
MODEL_PATH = BASE / "model" / "url_model.joblib"
CACHE_DB = BASE / "url_cache.db"

# Load model lazily or at module level
try:
    _model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"Warning: Could not load URL model from {MODEL_PATH}: {e}")
    _model = None

SAFE_BROWSING_KEY = os.getenv("SAFE_BROWSING_API_KEY")
VIRUSTOTAL_KEY = os.getenv("VIRUSTOTAL_API_KEY")

CACHE_TTL_SEC = 86400 * 7  # 1 week for reputation cache

# Trusted UAE domains
ALLOWLIST = [
    "smiles.ae",
    "etisalat.ae",
    "du.ae",
    "government.ae",
    "adcb.com",
    "emiratesnbd.com",
    "mashreqbank.com",
    "u.ae",
    "mohre.gov.ae",
    "ica.gov.ae",
    "dubaipolice.gov.ae",
    "rta.ae",
]

def init_db():
    conn = sqlite3.connect(CACHE_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS url_cache (
            url_hash TEXT PRIMARY KEY,
            url TEXT,
            result_json TEXT,
            expires_at REAL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            label TEXT,
            timestamp REAL
        )
    """)
    conn.commit()
    conn.close()

# Ensure DB is initialized
init_db()

def store_feedback(url, label):
    try:
        conn = sqlite3.connect(CACHE_DB)
        conn.execute(
            "INSERT INTO feedback (url, label, timestamp) VALUES (?, ?, ?)",
            (url, label, time.time())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Feedback store error: {e}")

def get_cached_result(url):
    url_hash = hashlib.sha256(url.encode()).hexdigest()
    try:
        conn = sqlite3.connect(CACHE_DB)
        row = conn.execute(
            "SELECT result_json, expires_at FROM url_cache WHERE url_hash = ?", (url_hash,)
        ).fetchone()
        conn.close()
        
        if row:
            result_json, expires_at = row
            if expires_at > time.time():
                return json.loads(result_json)
    except Exception as e:
        print(f"Cache read error: {e}")
    return None

def set_cached_result(url, result):
    url_hash = hashlib.sha256(url.encode()).hexdigest()
    expires_at = time.time() + CACHE_TTL_SEC
    try:
        conn = sqlite3.connect(CACHE_DB)
        conn.execute(
            "INSERT OR REPLACE INTO url_cache (url_hash, url, result_json, expires_at) VALUES (?, ?, ?, ?)",
            (url_hash, url, json.dumps(result), expires_at)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Cache write error: {e}")

def normalize_url(url):
    url = url.strip()
    # Remove trailing punctuation
    url = url.rstrip("),.?!:;\"'’")
    if url.lower().startswith("www."):
        url = "https://" + url
    return url

def is_allowlisted(url):
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if not domain:
            # Maybe it didn't have a scheme
            if "/" in url:
                domain = url.split("/")[0].lower()
            else:
                domain = url.lower()
            
        for trusted in ALLOWLIST:
            if domain == trusted or domain.endswith("." + trusted):
                return True
    except:
        pass
    return False

def ml_predict(urls):
    if _model is None:
        return ["unknown"] * len(urls), [0.0] * len(urls)
    
    try:
        preds = _model.predict(urls)
        probs = None
        if hasattr(_model, "predict_proba"):
            probs = _model.predict_proba(urls)
            # For multiclass, we take the max probability
            max_probs = [float(max(p)) for p in probs]
        else:
            max_probs = [1.0] * len(urls)
        return preds, max_probs
    except Exception as e:
        print(f"ML prediction error: {e}")
        return ["error"] * len(urls), [0.0] * len(urls)

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
                }
        return out
    except Exception as e:
        print(f"Safe Browsing API error: {e}")
        return {u: {"sb_verdict": "error", "detail": str(e)} for u in urls}

def virustotal_lookup(url):
    if not VIRUSTOTAL_KEY:
        return {"vt_verdict": "not_configured"}
    
    # URL ID for VT is base64 of the URL without padding
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    
    endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
    headers = {"x-apikey": VIRUSTOTAL_KEY}
    
    try:
        r = requests.get(endpoint, headers=headers, timeout=10)
        if r.status_code == 404:
            # Request scan
            scan_endpoint = "https://www.virustotal.com/api/v3/urls"
            requests.post(scan_endpoint, headers=headers, data={"url": url}, timeout=10)
            return {"vt_verdict": "scanning", "detail": "URL submitted for scanning"}
            
        r.raise_for_status()
        data = r.json()
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        
        verdict = "clean"
        if malicious > 0: verdict = "flagged"
        elif suspicious > 0: verdict = "unknown"
        
        return {
            "vt_verdict": verdict,
            "vt_malicious": malicious,
            "vt_suspicious": suspicious,
            "vt_stats": stats
        }
    except Exception as e:
        return {"vt_verdict": "error", "detail": str(e)}

def analyze_urls(urls):
    # Normalize and filter
    normalized = [normalize_url(u) for u in urls if u.strip()]
    if not normalized:
        return []
    
    # Unique URLs only, maintain order
    unique_normalized = []
    seen = set()
    for u in normalized:
        if u not in seen:
            unique_normalized.append(u)
            seen.add(u)
    
    unique_normalized = unique_normalized[:20]
    
    results_map = {}
    todo = []
    
    for u in unique_normalized:
        cached = get_cached_result(u)
        if cached:
            results_map[u] = cached
        else:
            todo.append(u)
            
    if todo:
        preds, probs = ml_predict(todo)
        sb = safe_browsing_lookup(todo)
        
        for i, u in enumerate(todo):
            ml_label = str(preds[i])
            ml_prob = probs[i]
            sb_info = sb.get(u, {"sb_verdict": "unknown"})
            allowlisted = is_allowlisted(u)
            
            reasons = []
            # Decision Logic
            if sb_info.get("sb_verdict") == "match":
                final_verdict = "malicious"
                verdict = "flagged"
                reasons.append("Known unsafe URL (Google Safe Browsing)")
            elif allowlisted:
                final_verdict = "clean"
                verdict = "clean"
                reasons.append("Trusted UAE domain")
            elif ml_label != "benign" and ml_prob > 0.8:
                final_verdict = ml_label
                verdict = "flagged"
                reasons.append(f"URL matches known {ml_label} patterns (High confidence)")
            elif ml_label != "benign":
                final_verdict = ml_label
                verdict = "unknown"
                reasons.append(f"URL matches known {ml_label} patterns")
            else:
                final_verdict = "clean"
                verdict = "clean"
                
            out = {
                "url": u,
                "ml_label": ml_label,
                "ml_prob": ml_prob,
                "safe_browsing": sb_info,
                "allowlisted": allowlisted,
                "final_verdict": final_verdict,
                "verdict": verdict,
                "reasons": reasons,
            }
            results_map[u] = out
            set_cached_result(u, out)
            
    return [results_map[u] for u in unique_normalized]
