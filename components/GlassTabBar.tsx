import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

const TABS = [
  { name: "index",      label: "Accueil",    icon: "home",          sf: "house"     },
  { name: "inventaire", label: "Inventaire", icon: "package",       sf: "archivebox" },
  { name: "repas",      label: "Repas",      icon: "calendar",      sf: "calendar"  },
  { name: "courses",    label: "Courses",    icon: "shopping-cart", sf: "cart"      },
  { name: "parametres", label: "Réglages",   icon: "settings",      sf: "gearshape" },
] as const;

interface Props {
  state: any;
  descriptors: any;
  navigation: any;
  insets: { bottom: number };
}

export function GlassTabBar({ state, navigation, insets }: Props) {
  const colors = useColors();
  const { theme } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isDark = theme.isDark;

  const bottomPad = isWeb ? 12 : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <BlurView
          intensity={isIOS ? 80 : 60}
          tint={isDark ? "dark" : "light"}
          style={[StyleSheet.absoluteFill, { borderRadius: 40 }]}
          experimentalBlurMethod={isWeb ? "dimezisBlurView" : undefined}
        />
        {/* Glass sheen */}
        <View style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 40,
            backgroundColor: isDark ? "rgba(30,30,40,0.35)" : "rgba(255,255,255,0.40)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.75)",
          }
        ]} pointerEvents="none" />

        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find(t => t.name === route.name);
          if (!tab) return null;
          const isFocused = state.index === index;
          const color = isFocused ? colors.primary : colors.mutedForeground;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tabBtn}
              activeOpacity={0.7}
            >
              {isFocused && (
                <View style={[styles.activePill, { backgroundColor: colors.primary + "22" }]} />
              )}
              {isIOS ? (
                <SymbolView
                  name={isFocused ? `${tab.sf}.fill` : tab.sf}
                  tintColor={color}
                  size={22}
                />
              ) : (
                <Feather name={tab.icon as any} size={22} color={color} />
              )}
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    borderRadius: 40,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
    width: "92%",
    maxWidth: 480,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 3,
    borderRadius: 32,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0, left: 4, right: 4, bottom: 0,
    borderRadius: 32,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
