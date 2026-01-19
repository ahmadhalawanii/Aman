import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

type Theme = {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    bg: string;
    card: string;
    card2: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    danger: string;
  };
};

type ThemeContextValue = {
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // returns 'light' | 'dark' based on OS
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") setModeState(saved);
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const theme: Theme = useMemo(() => {
    const base = isDark
      ? {
          bg: "#0B0B0F",
          card: "#141421",
          card2: "#0F0F18",
          text: "#FFFFFF",
          muted: "rgba(255,255,255,0.75)",
          border: "#2B2B3A",
          primary: "#7C3AED", // royal purple
          danger: "#FCA5A5",
        }
      : {
          bg: "#F7F7FB",
          card: "#FFFFFF",
          card2: "#F1F1FA",
          text: "#0B0B0F",
          muted: "rgba(11,11,15,0.65)",
          border: "#E3E3F1",
          primary: "#7C3AED",
          danger: "#B91C1C",
        };

    return { mode, isDark, colors: base };
  }, [isDark, mode]);

  const toggleDark = () => setMode(isDark ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
