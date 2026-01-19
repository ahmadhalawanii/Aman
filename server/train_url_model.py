import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
import joblib

BASE = os.path.dirname(os.path.abspath(__file__))
MALICIOUS_CSV = os.path.join(BASE, "data", "malicious_phish.csv")
BENIGN_CSV    = os.path.join(BASE, "data", "processed", "benign_urls_gcc.csv")
MODEL_OUT     = os.path.join(BASE, "model", "url_model.joblib")

for p in [MALICIOUS_CSV, BENIGN_CSV]:
    if not os.path.exists(p):
        print(f"Error: {p} not found.")
        exit(1)

print(f"Loading malicious dataset from {MALICIOUS_CSV}...")
df_mal = pd.read_csv(MALICIOUS_CSV)[["url", "type"]]

print(f"Loading benign GCC dataset from {BENIGN_CSV}...")
df_ben = pd.read_csv(BENIGN_CSV)[["url", "type"]]

# Basic cleanup
df_mal["url"] = df_mal["url"].astype(str).str.strip()
df_ben["url"] = df_ben["url"].astype(str).str.strip().str.lower()

df_mal = df_mal.dropna().drop_duplicates(subset=["url"])
df_ben = df_ben.dropna().drop_duplicates(subset=["url"])

# Combine datasets
print("Merging datasets...")
# Separate malicious and benign from the original set
df_mal_only = df_mal[df_mal["type"] != "benign"]
df_ben_orig = df_mal[df_mal["type"] == "benign"]

# Downsample original benign to ~200k to balance with malicious (~223k)
# and give our new 41k GCC/Global benign URLs more relative weight.
df_ben_orig_sampled = df_ben_orig.sample(n=min(len(df_ben_orig), 200000), random_state=42)

# Combine: 223k malicious + 200k generic benign + 41k high-quality benign
df = pd.concat([df_mal_only, df_ben_orig_sampled, df_ben], ignore_index=True).sample(frac=1.0, random_state=42)

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
        max_features=200000,
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
