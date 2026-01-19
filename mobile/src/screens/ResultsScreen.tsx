import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MenuSheet from "../components/MenuSheet";
import { useTheme } from "../theme/ThemeProvider";
import type { ApiAnalyzeResponse as AnalysisResult } from "../lib/api";

type Props = {
  inputText: string;
  result: AnalysisResult;
  onBack: () => void;
};

function scoreLabel(score: number) {
  if (score >= 80) return "High risk";
  if (score >= 50) return "Medium risk";
  return "Low risk";
}

export default function ResultsScreen({ inputText, result, onBack }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Authenticity Result</Text>

        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.menuBtn}>
          <Text style={[styles.menuIcon, { color: c.text }]}>☰</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.score, { color: result.score >= 50 ? c.danger : c.primary }]}>{result.score}</Text>
          <Text style={[styles.scoreLabel, { color: c.muted }]}>{scoreLabel(result.score)}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.text }]}>Top reasons</Text>
        {result.reasons.length === 0 ? (
          <Text style={[styles.muted, { color: c.muted }]}>No indicators detected.</Text>
        ) : (
          result.reasons.map((r) => (
            <View key={r.code} style={[styles.reasonCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.reasonTitle, { color: c.text }]}>{r.title}</Text>
              <Text style={[styles.muted, { color: c.muted }]}>{r.detail}</Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: c.text }]}>Extracted URLs</Text>
        {result.urls.length === 0 ? (
          <Text style={[styles.muted, { color: c.muted }]}>No URLs found.</Text>
        ) : (
          result.urls.map((u) => (
            <View key={u.url} style={[styles.urlRow, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.url, { color: c.text }]}>{u.url}</Text>
              <Text style={[styles.badge, { color: c.muted }]}>{u.verdict.toUpperCase()}</Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: c.text }]}>Message preview</Text>
        <View style={[styles.preview, { backgroundColor: c.card2, borderColor: c.border }]}>
          <Text style={[styles.previewText, { color: c.text }]}>{inputText}</Text>
        </View>

        <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  menuIcon: { fontSize: 22, fontWeight: "900" },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  score: { fontSize: 52, fontWeight: "800" },
  scoreLabel: { marginTop: 6, fontSize: 14 },
  sectionTitle: { marginTop: 18, fontSize: 16, fontWeight: "700" },
  reasonCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  reasonTitle: { fontSize: 14, fontWeight: "700" },
  muted: { marginTop: 6 },
  urlRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  url: { fontSize: 13 },
  badge: { marginTop: 8, fontSize: 12, fontWeight: "700" },
  preview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  previewText: { fontSize: 13, lineHeight: 18 },
  button: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "800", color: "white" },
});