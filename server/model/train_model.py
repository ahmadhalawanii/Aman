import pathlib
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

BASE = pathlib.Path(__file__).resolve().parent
DATA_FILE = BASE / "data" / "SMSSpamCollection"   # put the UCI file here
OUT_FILE = BASE / "model" / "sms_spam_pipeline.joblib"

def load_uci_sms_spam(path: pathlib.Path) -> pd.DataFrame:
    # UCI format: label<TAB>text
    df = pd.read_csv(path, sep="\t", header=None, names=["label", "text"])
    df["y"] = (df["label"] == "spam").astype(int)  # 1=spam, 0=ham
    return df

def main():
    df = load_uci_sms_spam(DATA_FILE)

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"],
        df["y"],
        test_size=0.2,
        random_state=42,
        stratify=df["y"],
    )

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )),
        ("clf", LogisticRegression(
            max_iter=2000,
            class_weight="balanced"
        )),
    ])

    pipe.fit(X_train, y_train)

    y_pred = pipe.predict(X_test)

    print(classification_report(y_test, y_pred, target_names=["ham", "spam"]))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, OUT_FILE)
    print(f"Saved model to: {OUT_FILE}")

if __name__ == "__main__":
    main()