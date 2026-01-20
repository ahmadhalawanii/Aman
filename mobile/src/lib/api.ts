// mobile/src/lib/api.ts
const BASE_URL = "http://192.168.1.244:8000";

export type ApiAnalyzeResponse = {
  score: number;
  risk_label?: string;
  model: { label: "spam" | "ham"; confidence: number };
  urls: { url: string; verdict: string }[];
  reasons: { code: string; title: string; detail: string }[];
  text?: string;
};

export async function analyzeMessage(text: string): Promise<ApiAnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${errText || "Request failed"}`);
  }

  return res.json();
}