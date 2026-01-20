import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  score: number;        // 0..100
  label: string;        // "Low risk" | "Medium risk" | "High risk"
};

export default function RiskMeter({ score, label }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation needs false
    }).start();
  }, [clamped, anim]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text }]}>Authenticity</Text>
        <Text style={[styles.value, { color: c.text }]}>{clamped}</Text>
      </View>

      <View style={[styles.track, { borderColor: c.border, backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
        <Animated.View style={[styles.fill, { width: widthInterpolated, backgroundColor: c.primary }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.min, { color: c.muted }]}>0</Text>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        <Text style={[styles.max, { color: c.muted }]}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 16, fontWeight: "600", opacity: 0.9 },
  value: { fontSize: 18, fontWeight: "700", opacity: 0.95 },

  track: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
    opacity: 0.9,
    borderWidth: 1,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },

  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  min: { fontSize: 12, opacity: 0.6 },
  max: { fontSize: 12, opacity: 0.6 },
  label: { fontSize: 13, fontWeight: "600", opacity: 0.85 },
});
