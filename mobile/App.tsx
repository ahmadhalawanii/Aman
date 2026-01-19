// mobile/App.tsx
import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import CaptureScreen from "./src/screens/CaptureScreen";
import ResultsScreen from "./src/screens/ResultsScreen";
import { analyzeMessage, type ApiAnalyzeResponse } from "./src/lib/api";

type Screen = "capture" | "results";

function MainApp() {
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
        }}
      />
    );
  }

  return (
    <CaptureScreen
      loading={loading}
      onSubmit={handleSubmit}
      error={error}
      onClearError={() => setError(null)}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}