import React from "react";
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useColors } from "@/hooks/useColors";
import {
  useTheme, WIDGET_SHAPES,
  type WidgetShape, type WidgetLayout, type TabStyle,
} from "@/context/ThemeContext";
import { THEME_LIST, type ThemeId } from "@/constants/themes";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HomeCustomizeSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const {
    theme, themeId, setThemeId,
    widgetShape, setWidgetShape,
    widgetLayout, setWidgetLayout,
    tabStyle, setTabStyle,
  } = useTheme();
  const isSystem = themeId === "system";
  const cardRadius = WIDGET_SHAPES[widgetShape].radius;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Personnaliser</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* ── THÈME ── */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THÈME</Text>

          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="smartphone" size={16} color={colors.mutedForeground} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Automatique (système)</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Suit le mode clair/sombre du téléphone</Text>
            </View>
            <Switch
              value={isSystem}
              onValueChange={v => setThemeId(v ? "system" : theme.id)}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.themeGrid}>
            {THEME_LIST.map(t => {
              const isActive = !isSystem && themeId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setThemeId(t.id as ThemeId)}
                  style={styles.themeCell}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={t.gradient as [string, string, ...string[]]}
                    style={[styles.themeSwatch, isActive && styles.themeSwatchActive]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.themeEmoji}>{t.emoji}</Text>
                    {isActive && (
                      <View style={styles.checkBadge}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={[styles.themeName, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── DISPOSITION DES WIDGETS ── */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>DISPOSITION DES WIDGETS</Text>
          <View style={styles.twoCol}>
            {([
              { key: "grille", label: "Grille", icon: "grid" },
              { key: "liste",  label: "Liste",  icon: "list" },
            ] as { key: WidgetLayout; label: string; icon: string }[]).map(opt => {
              const active = widgetLayout === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setWidgetLayout(opt.key)}
                  style={[styles.optionBtn, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  activeOpacity={0.8}
                >
                  <Feather name={opt.icon as any} size={22} color={active ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.optionLabel, { color: active ? "#fff" : colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── FORME DES WIDGETS ── */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>FORME DES WIDGETS</Text>
          <View style={styles.fourCol}>
            {(Object.keys(WIDGET_SHAPES) as WidgetShape[]).map(key => {
              const s = WIDGET_SHAPES[key];
              const active = widgetShape === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setWidgetShape(key)}
                  style={[styles.shapeCell, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.shapePreview, {
                    borderRadius: s.radius,
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.muted,
                    borderColor: active ? "rgba(255,255,255,0.4)" : colors.border,
                  }]} />
                  <Text style={[styles.shapeLabel, { color: active ? "#fff" : colors.text }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── BARRE DU BAS ── */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>BARRE DU BAS</Text>
          <View style={styles.twoCol}>
            {([
              { key: "classique", label: "Classique" },
              { key: "verre",     label: "Verre liquide ✨" },
            ] as { key: TabStyle; label: string }[]).map(opt => {
              const active = tabStyle === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setTabStyle(opt.key)}
                  style={[styles.optionBtn, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  activeOpacity={0.8}
                >
                  {opt.key === "verre" ? (
                    <View style={styles.glassPreview}>
                      <BlurView
                        intensity={50}
                        tint={theme.isDark ? "dark" : "light"}
                        style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                      />
                      <View style={[StyleSheet.absoluteFill, {
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
                      }]} />
                      <Feather name="airplay" size={18} color={active ? "#fff" : colors.mutedForeground} />
                    </View>
                  ) : (
                    <Feather name="minus" size={22} color={active ? "#fff" : colors.mutedForeground} />
                  )}
                  <Text style={[styles.optionLabel, { color: active ? "#fff" : colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── APERÇU WIDGETS ── */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>APERÇU</Text>
          {widgetLayout === "grille" ? (
            <View style={styles.previewGrid}>
              {["Inventaire", "Repas", "Courses", "En stock"].map((label, i) => (
                <View key={i} style={[styles.previewCard, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: cardRadius,
                }]}>
                  <View style={[styles.previewIcon, {
                    backgroundColor: [colors.primary, colors.warning, colors.destructive, colors.success][i] + "25",
                    borderRadius: cardRadius * 0.6,
                  }]}>
                    <Feather name={(["package", "calendar", "shopping-cart", "check-circle"] as any[])[i]} size={14}
                      color={[colors.primary, colors.warning, colors.destructive, colors.success][i]} />
                  </View>
                  <Text style={[styles.previewValue, { color: colors.text }]}>0</Text>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.previewList}>
              {["Inventaire", "Repas", "Courses", "En stock"].map((label, i) => (
                <View key={i} style={[styles.previewListRow, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: cardRadius,
                }]}>
                  <View style={[styles.previewListIcon, {
                    backgroundColor: [colors.primary, colors.warning, colors.destructive, colors.success][i] + "25",
                    borderRadius: cardRadius * 0.5,
                  }]}>
                    <Feather name={(["package", "calendar", "shopping-cart", "check-circle"] as any[])[i]} size={14}
                      color={[colors.primary, colors.warning, colors.destructive, colors.success][i]} />
                  </View>
                  <Text style={[styles.previewListLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.previewListValue, { color: colors.text }]}>0</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  body: { padding: 20, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 1 },

  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCell: { width: "30%", alignItems: "center", gap: 6 },
  themeSwatch: { width: "100%", aspectRatio: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  themeSwatchActive: { borderWidth: 3, borderColor: "#fff" },
  themeEmoji: { fontSize: 26 },
  checkBadge: {
    position: "absolute", bottom: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  themeName: { fontSize: 11, fontWeight: "500", textAlign: "center" },

  twoCol: { flexDirection: "row", gap: 10 },
  optionBtn: {
    flex: 1, alignItems: "center", gap: 8, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1.5,
  },
  optionLabel: { fontSize: 13, fontWeight: "600" },

  fourCol: { flexDirection: "row", gap: 8 },
  shapeCell: {
    flex: 1, alignItems: "center", gap: 8, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  shapePreview: { width: 40, height: 28, borderWidth: 1.5 },
  shapeLabel: { fontSize: 11, fontWeight: "600" },

  glassPreview: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },

  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewCard: { width: "46%", padding: 12, borderWidth: 1, gap: 4 },
  previewIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  previewValue: { fontSize: 20, fontWeight: "700" },
  previewLabel: { fontSize: 11, fontWeight: "500" },

  previewList: { gap: 8 },
  previewListRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderWidth: 1,
  },
  previewListIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  previewListLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  previewListValue: { fontSize: 20, fontWeight: "700" },
});
