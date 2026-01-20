// mobile/src/screens/CaptureScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { messageSchema, MAX_CHARS } from "../validation/messageSchema";
import AppMenuSheet from "../components/AppMenuSheet";

type Props = {
  loading: boolean;
  onSubmit: (validatedText: string) => void | Promise<void>;
  error?: string | null;
  onClearError?: () => void;
};

const countWords = (s: string) => {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
};

export default function CaptureScreen({ loading, onSubmit, error, onClearError }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const shownError = error ?? localError;

  const charCount = text.length;
  const wordCount = countWords(text);

  const onAnalyzePress = async () => {
    onClearError?.();
    setLocalError(null);

    const parsed = messageSchema.safeParse({ text });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Invalid message");
      return;
    }

    await onSubmit(parsed.data.text.trim());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]}>Analyze a message</Text>

        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, styles.menuBtn]}
        >
          <Text style={[styles.menuIcon, { color: c.text }]}>☰</Text>
        </Pressable>
      </View>

      <View style={[styles.inputCard, { backgroundColor: c.card, borderColor: c.border }]}> 
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste message here"
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text }]}
          multiline
        />
        <Text style={[styles.counter, { color: c.muted }]}>
          {wordCount} words • {charCount}/{MAX_CHARS}
        </Text>
      </View>

      {!!shownError && <Text style={[styles.error, { color: c.danger }]}>{shownError}</Text>}

      <Pressable
        onPress={onAnalyzePress}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: c.primary, borderColor: c.border },
          loading && styles.buttonDisabled,
          pressed && !loading && styles.buttonPressed,
        ]}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Analyze</Text>}
      </Pressable>

      <AppMenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700" },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { fontSize: 24, fontWeight: "900" },

  inputCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  input: { minHeight: 180, fontSize: 15, lineHeight: 20, textAlignVertical: "top" },
  counter: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "right",
    fontWeight: "600",
  },

  error: { marginTop: 10, fontSize: 13 },

  button: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonText: { fontSize: 16, fontWeight: "800", color: "white" },
});