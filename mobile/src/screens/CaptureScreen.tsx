// mobile/src/screens/CaptureScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { messageSchema } from "../validation/messageSchema";

type Props = {
  loading: boolean;
  onSubmit: (validatedText: string) => void | Promise<void>;
  error?: string | null;
  onClearError?: () => void;
};

export default function CaptureScreen({ loading, onSubmit, error, onClearError }: Props) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = error ?? localError;

  const onAnalyzePress = async () => {
    onClearError?.();
    setLocalError(null);

    const parsed = messageSchema.safeParse({ text });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Invalid message");
      return;
    }

    await onSubmit(parsed.data.text.trim()); // ✅ this is the key fix
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analyzer</Text>

      <View style={styles.inputCard}> 
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste message here"
          style={styles.input}
          multiline
        />
      </View>

      {!!shownError && <Text style={styles.error}>{shownError}</Text>}

      <Pressable
        onPress={onAnalyzePress}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Analyze</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: "700" },

  inputCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  input: { minHeight: 180, fontSize: 15, lineHeight: 20 },

  error: { marginTop: 10, fontSize: 13, color: "#B00020" },

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