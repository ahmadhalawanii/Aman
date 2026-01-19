# server/model/train_model.py
from __future__ import annotations

from pathlib import Path
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report


BASE_DIR = Path(__file__).resolve().parent              # .../server/model
DATA_FILE = BASE_DIR / "data" / "SMSSpamCollection"     # .../server/model/data/SMSSpamCollection
OUT_MODEL = BASE_DIR / "sms_spam_pipeline.joblib"       # .../server/model/sms_spam_pipeline.joblib


def load_uci_sms_spam(path: Path) -> pd.DataFrame:
    """
    UCI SMSSpamCollection format:
      label<TAB>text
      ham<TAB>...
      spam<TAB>...
    """
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at: {path}\n"
            f"Expected file name: SMSSpamCollection\n"
            f"Fix by copying it into: {path.parent}"
        )
    df = pd.read_csv(path, sep="\t", header=None, names=["label", "text"])
    df["label"] = df["label"].astype(str).str.strip()
    df["text"] = df["text"].astype(str).fillna("").str.strip()
    df = df[df["text"].str.len() > 0].reset_index(drop=True)
    return df


def main() -> None:
    df = load_uci_sms_spam(DATA_FILE)

    X = df["text"].values
    y = df["label"].values  # "ham" / "spam"

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    pipe = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(
                lowercase=True,
                stop_words=None,
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.98,
            )),
            ("clf", LogisticRegression(
                max_iter=2000,
                solver="liblinear",  # stable for small text datasets
                class_weight=None,
            )),
        ]
    )

    pipe.fit(X_train, y_train)

    y_pred = pipe.predict(X_test)
    print(classification_report(y_test, y_pred, digits=2))

    # Save
    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, OUT_MODEL)
    print(f"Saved model to: {OUT_MODEL}")


if __name__ == "__main__":
    main()