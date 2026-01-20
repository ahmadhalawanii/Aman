import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import MenuSheet from "../components/MenuSheet";
import RiskMeter from "../components/RiskMeter";
import { useTheme } from "../theme/ThemeProvider";
import type { ApiAnalyzeResponse as AnalysisResult } from "../lib/api";
import { getRiskLevel, getGuidance } from "../lib/guidance";

type Props = {
  inputText: string;
  result: AnalysisResult;
  onBack: () => void;
};

export default function ResultsScreen({ inputText, result, onBack }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [menuOpen, setMenuOpen] = useState(false);

  const hasFlaggedUrl = (result.urls ?? []).some((u: any) => u.verdict === "flagged");
  const level = getRiskLevel(result.score ?? 0, hasFlaggedUrl);
  const guidance = getGuidance(level);

  async function onCopyChecklist() {
    const text =
      `Safety checklist (${level.toUpperCase()}):\n` +
      guidance.bullets.map((b) => `- ${b}`).join("\n");
    await Clipboard.setStringAsync(text);
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function onExportEvidence() {
    const urls = (result.urls ?? []).map((u: any) => `${u.url} — ${u.verdict}`).join("<br/>");
    const reasons = (result.reasons ?? []).map((r: any) => `• ${escapeHtml(r.title)}: ${escapeHtml(r.detail)}`).join("<br/>");

    const html = `
      <h2>TrustSnap Evidence Pack</h2>
      <p><b>Score:</b> ${result.score} (${level})</p>
      <p><b>Extracted URLs:</b><br/>${urls || "None"}</p>
      <p><b>Top reasons:</b><br/>${reasons || "None"}</p>
      <p><b>Message:</b><br/><pre>${escapeHtml(inputText || "")}</pre></p>
      <p><b>Generated:</b> ${new Date().toISOString()}</p>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  }

  async function onReport() {
    // 1) Export evidence first (optional but recommended)
    await onExportEvidence();

    // 2) Open official reporting page (demo-friendly)
    await Linking.openURL("https://tdra.gov.ae/en/Services/report-a-cyber-incident");
  }

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
          <RiskMeter score={result.score} label={result.risk_label ?? "Unknown"} />
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

        <Text style={[styles.sectionTitle, { color: c.text }]}>{guidance.title}</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, alignItems: "flex-start" }]}>
          {guidance.bullets.map((b, i) => (
            <Text key={i} style={[styles.bullet, { color: c.text }]}>• {b}</Text>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, { borderColor: c.border }]} onPress={onCopyChecklist}>
            <Text style={[styles.actionBtnText, { color: c.text }]}>Copy safe checklist</Text>
          </Pressable>

          <Pressable style={[styles.actionBtn, { borderColor: c.border }]} onPress={onExportEvidence}>
            <Text style={[styles.actionBtnText, { color: c.text }]}>Export evidence</Text>
          </Pressable>

          <Pressable style={[styles.actionBtnPrimary, { backgroundColor: c.primary }]} onPress={onReport}>
            <Text style={[styles.actionBtnText, { color: "white" }]}>Report</Text>
          </Pressable>
        </View>

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
  },
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
  bullet: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
});