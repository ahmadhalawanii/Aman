import React, { useState } from "react";
import CaptureScreen from "./src/screens/CaptureScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import { analyzeMessageStub, type AnalysisResult } from "./src/lib/analyzeStub";

type Screen = "capture" | "results";

export default function App() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleSubmit = (validatedText: string) => {
    setLoading(true);
    setInputText(validatedText);

    // Fake latency so the demo “feels real”
    setTimeout(() => {
      const r = analyzeMessageStub(validatedText);
      setResult(r);
      setLoading(false);
      setScreen("results");
    }, 700);
  };

  if (screen === "results" && result) {
    return (
      <ResultsScreen
        inputText={inputText}
        result={result}
        onBack={() => {
          setScreen("capture");
        }}
      />
    );
  }

  return <CaptureScreen loading={loading} onSubmit={handleSubmit} />;
}