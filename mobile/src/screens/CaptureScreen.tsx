import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MIN_CHARS = 20;
const MAX_CHARS = 1200;

export default function CaptureScreen() {
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const canAnalyze = useMemo(() => trimmed.length >= MIN_CHARS, [trimmed.length]);

  const hint = useMemo(() => {
    if (trimmed.length === 0) return `Paste at least ${MIN_CHARS} characters.`;
    if (trimmed.length < MIN_CHARS) return `Add ${MIN_CHARS - trimmed.length} more characters.`;
    return "";
  }, [trimmed.length]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analyze a message</Text>
      <Text style={styles.subtitle}>Paste SMS / WhatsApp / email text</Text>

      <View style={styles.inputCard}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste the message here…"
          multiline
          maxLength={MAX_CHARS}
          textAlignVertical="top"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <Text style={styles.counter}>
          {text.length} / {MAX_CHARS}
        </Text>
      </View>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <Pressable
        disabled={!canAnalyze}
        style={[styles.button, !canAnalyze && styles.buttonDisabled]}
        onPress={() => console.log("Analyze pressed:", trimmed)}
      >
        <Text style={styles.buttonText}>Analyze</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { marginTop: 6, fontSize: 14, opacity: 0.75 },

  inputCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  input: {
    minHeight: 180,
    fontSize: 15,
    lineHeight: 20,
  },
  counter: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.7,
    textAlign: "right",
  },

  hint: { marginTop: 10, fontSize: 13, opacity: 0.75 },

  button: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: "600" },
});