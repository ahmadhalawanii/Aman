import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib
import os

CSV_PATH = os.path.join("data", "malicious_phish.csv")
MODEL_OUT = os.path.join("model", "url_model.joblib")

if not os.path.exists(CSV_PATH):
    print(f"Error: {CSV_PATH} not found.")
    exit(1)

print(f"Loading dataset from {CSV_PATH}...")
df = pd.read_csv(CSV_PATH)

# Option A: multiclass (benign/phishing/malware/defacement)
y = df["type"].astype(str)
X = df["url"].astype(str)

print("Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("Building pipeline and training...")
pipe = Pipeline([
    ("tfidf", TfidfVectorizer(
        analyzer="char",
        ngram_range=(3, 5),
        min_df=2,
        max_features=200000,   # keeps memory sane
    )),
    ("clf", LogisticRegression(
        max_iter=2000,
        n_jobs=-1,
        class_weight="balanced"
    ))
])

pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)

print(classification_report(y_test, pred))

os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
joblib.dump(pipe, MODEL_OUT)
print("Saved:", MODEL_OUT)
