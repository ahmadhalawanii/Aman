import React from "react";
import { Linking, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MenuSheet({ visible, onClose }: Props) {
  const { theme, toggleDark } = useTheme();
  const c = theme.colors;

  const onContact = async () => {
    // Replace with your team email
    const email = "contact@trustsnap.app";
    const subject = encodeURIComponent("TrustSnap Prototype - Contact");
    const body = encodeURIComponent("Hi TrustSnap team,\n\n");
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    // React Native Linking supports mailto to open the mail app
    await Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sheetTitle, { color: c.text }]}>Menu</Text>

        <View style={[styles.row, { borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: "700" }}>Dark mode</Text>
            <Text style={{ color: c.muted, marginTop: 4 }}>
              Toggle UI theme for demo
            </Text>
          </View>
          <Switch value={theme.isDark} onValueChange={toggleDark} />
        </View>

        <Pressable
          onPress={onContact}
          style={[styles.action, { borderColor: c.border }]}
        >
          <Text style={{ color: c.text, fontWeight: "700" }}>Contact us</Text>
          <Text style={{ color: c.muted, marginTop: 4 }}>
            Opens your email app
          </Text>
        </Pressable>

        <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.primary }]}>
          <Text style={{ color: "white", fontWeight: "800" }}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  action: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  closeBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
