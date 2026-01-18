// mobile/App.tsx
import React, { useState } from "react";
import CaptureScreen from "./src/screens/CaptureScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import { analyzeMessage, type ApiAnalyzeResponse } from "./src/lib/api";

type Screen = "capture" | "results";

export default function App() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ApiAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (validatedText: string) => {
    setLoading(true);
    setError(null);
    setInputText(validatedText);

    try {
      const r = await analyzeMessage(validatedText); // calls FastAPI /analyze
      setResult(r);
      setScreen("results");
    } catch (e: any) {
      setError(e?.message ?? "Failed to analyze");
      // stay on capture screen
    } finally {
      setLoading(false);
    }
  };

  if (screen === "results" && result) {
    return (
      <ResultsScreen
        inputText={inputText}
        result={result}
        onBack={() => {
          setScreen("capture");
          // optional: keep result for quick back/forward; or clear it:
          // setResult(null);
        }}
      />
    );
  }

  return (
    <CaptureScreen
      loading={loading}
      onSubmit={handleSubmit}
      // If your CaptureScreen doesn’t accept this prop, remove it.
      error={error}
      onClearError={() => setError(null)}
    />
  );
}