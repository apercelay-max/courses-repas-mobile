import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  children: React.ReactNode;
  style?: object;
}

export function GradientBackground({ children, style }: Props) {
  const { theme } = useTheme();
  const isClassic = theme.id === "classicLight" || theme.id === "classicDark";

  if (isClassic) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.colors.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={theme.gradient as string[]}
      start={theme.gradientStart ?? { x: 0, y: 0 }}
      end={theme.gradientEnd ?? { x: 0.5, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
