import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GlassTabBar } from "@/components/GlassTabBar";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Accueil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventaire">
        <Icon sf={{ default: "archivebox", selected: "archivebox.fill" }} />
        <Label>Inventaire</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="repas">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.plus" }} />
        <Label>Repas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} />
        <Label>Courses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="parametres">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Réglages</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { tabStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isGlass = tabStyle === "verre";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: isGlass
          ? { display: "none" }
          : {
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : colors.background,
              borderTopWidth: isWeb ? 1 : 0,
              borderTopColor: colors.border,
              elevation: 0,
              ...(isWeb ? { height: 84 } : {}),
            },
        tabBarBackground: () =>
          isGlass ? null :
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
      tabBar={isGlass ? (props) => <GlassTabBar {...props} insets={insets} /> : undefined}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventaire"
        options={{
          title: "Inventaire",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="archivebox" tintColor={color} size={24} /> : <Feather name="package" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="repas"
        options={{
          title: "Repas",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="calendar" tintColor={color} size={24} /> : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="cart" tintColor={color} size={24} /> : <Feather name="shopping-cart" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parametres"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="gearshape" tintColor={color} size={24} /> : <Feather name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
