import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import type { ApiAnalyzeResponse as AnalysisResult } from "../lib/api";

type Props = {
  inputText: string;
  result: AnalysisResult;
  onBack: () => void;
};

function scoreLabel(score: number) {
  if (score >= 80) return "Likely safe";
  if (score >= 50) return "Suspicious";
  return "High risk";
}

export default function ResultsScreen({ inputText, result, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Authenticity Result</Text>

      <View style={styles.card}>
        <Text style={styles.score}>{result.score}</Text>
        <Text style={styles.scoreLabel}>{scoreLabel(result.score)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Top reasons</Text>
      {result.reasons.length === 0 ? (
        <Text style={styles.muted}>No indicators detected.</Text>
      ) : (
        result.reasons.map((r) => (
          <View key={r.code} style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>{r.title}</Text>
            <Text style={styles.muted}>{r.detail}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Extracted URLs</Text>
      {result.urls.length === 0 ? (
        <Text style={styles.muted}>No URLs found.</Text>
      ) : (
        result.urls.map((u) => (
          <View key={u.url} style={styles.urlRow}>
            <Text style={styles.url}>{u.url}</Text>
            <Text style={styles.badge}>{u.verdict.toUpperCase()}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Message preview</Text>
      <View style={styles.preview}>
        <Text style={styles.previewText}>{inputText}</Text>
      </View>

      <Pressable style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: "700" },

  card: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  score: { fontSize: 52, fontWeight: "800" },
  scoreLabel: { marginTop: 6, fontSize: 14, opacity: 0.75 },

  sectionTitle: { marginTop: 18, fontSize: 16, fontWeight: "700" },

  reasonCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  reasonTitle: { fontSize: 14, fontWeight: "700" },
  muted: { marginTop: 6, opacity: 0.75 },

  urlRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  url: { fontSize: 13 },
  badge: { marginTop: 8, fontSize: 12, fontWeight: "700", opacity: 0.75 },

  preview: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previewText: { fontSize: 13, lineHeight: 18 },

  button: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
});