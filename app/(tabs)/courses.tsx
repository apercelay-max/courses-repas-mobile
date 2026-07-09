import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, SectionList,
  Modal, ScrollView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDatabase } from "@/context/DatabaseContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GradientBackground } from "@/components/GradientBackground";
import { UNITS } from "@/lib/units";
import { RAYON_ORDER, RAYON_LABELS, type Rayon } from "@/lib/rayons";
import type { ShoppingListEntry } from "@/types/database";

export default function CoursesScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, shoppingLists, markItemBought, removeShoppingItem, addManualShoppingItem } = useDatabase();
  const [activeTab, setActiveTab] = useState<"buy" | "stock">("buy");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "1", unit: "piece" });

  async function handleBought(manualItemId: string | undefined) {
    if (!manualItemId) return;
    await markItemBought(manualItemId);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleRemove(manualItemId: string | undefined) {
    if (!manualItemId) return;
    if (Platform.OS === "web") {
      await removeShoppingItem(manualItemId);
    } else {
      Alert.alert("Supprimer", "Retirer cet article de la liste ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => removeShoppingItem(manualItemId) },
      ]);
    }
  }

  async function handleAddManual() {
    if (!form.name.trim()) return;
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) return;
    await addManualShoppingItem(form.name.trim(), qty, form.unit);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
    setForm({ name: "", quantity: "1", unit: "piece" });
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { toBuy, reverse } = shoppingLists;
  const mc = theme.colors;

  const sections = useMemo(() => {
    const groups = new Map<Rayon, ShoppingListEntry[]>();
    for (const item of toBuy) {
      const ing = db.ingredients.find(i => i.id === item.ingredientId);
      const rayon: Rayon = ing?.rayon ?? "autre";
      if (!groups.has(rayon)) groups.set(rayon, []);
      groups.get(rayon)!.push(item);
    }
    return RAYON_ORDER
      .filter(r => groups.has(r))
      .map(r => ({ title: RAYON_LABELS[r], data: groups.get(r)! }));
  }, [toBuy, db.ingredients]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "buy" && { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
              onPress={() => setActiveTab("buy")}
            >
              <Feather name="shopping-cart" size={14} color={activeTab === "buy" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: activeTab === "buy" ? colors.primary : colors.mutedForeground }]}>
                À acheter
              </Text>
              {toBuy.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{toBuy.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "stock" && { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
              onPress={() => setActiveTab("stock")}
            >
              <Feather name="check-circle" size={14} color={activeTab === "stock" ? colors.success : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: activeTab === "stock" ? colors.success : colors.mutedForeground }]}>
                Déjà en stock
              </Text>
              {reverse.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <Text style={styles.badgeText}>{reverse.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === "buy" ? (
          <SectionList
            sections={sections}
            keyExtractor={(item, i) => item.manualItemId ?? `${item.ingredientId}-${item.source}-${i}`}
            contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
            scrollEnabled={!!toBuy.length}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Tout est en stock !</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Planifie des repas ou ajoute des articles manuellement
                </Text>
              </View>
            )}
            renderSectionHeader={({ section }) => (
              <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{section.title.toUpperCase()}</Text>
            )}
            renderItem={({ item }) => (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <View style={styles.itemLeft}>
                  <View style={[styles.itemDot, { backgroundColor: item.source === "auto" ? colors.primary : colors.warning }]} />
                  <View>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                      {item.quantity} {item.unit}
                      {item.inStock > 0 ? ` · ${item.inStock} ${item.inStockUnit} en stock` : ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  {item.manualItemId && (
                    <>
                      <TouchableOpacity onPress={() => handleBought(item.manualItemId)}
                        style={[styles.boughtBtn, { backgroundColor: colors.successLight }]}>
                        <Feather name="check" size={16} color={colors.success} />
                        <Text style={[styles.boughtBtnText, { color: colors.success }]}>Acheté</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemove(item.manualItemId)} style={styles.deleteBtn}>
                        <Feather name="x" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </>
                  )}
                  {!item.manualItemId && (
                    <View style={[styles.autoBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.autoBadgeText, { color: colors.primary }]}>Auto</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={reverse}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
            scrollEnabled={!!reverse.length}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Feather name="archive" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun article en stock</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Les articles nécessaires déjà dans ton frigo/placard apparaîtront ici
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={[styles.stockCard, { backgroundColor: colors.successLight, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                    Besoin : {item.needed.quantity} {item.needed.unit} · En stock : {item.inStock.quantity} {item.inStock.unit}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Feather name="plus" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: mc.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: mc.border }]}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalCancel, { color: mc.mutedForeground }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: mc.text }]}>Ajouter à la liste</Text>
              <TouchableOpacity onPress={handleAddManual}>
                <Text style={[styles.modalSave, { color: mc.primary }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>ARTICLE</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: mc.muted, color: mc.text, borderColor: mc.border }]}
                placeholder="ex: pommes, pain, yaourt..."
                placeholderTextColor={mc.mutedForeground}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>QUANTITÉ</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: mc.muted, color: mc.text, borderColor: mc.border }]}
                    placeholder="1"
                    placeholderTextColor={mc.mutedForeground}
                    value={form.quantity}
                    onChangeText={v => setForm(f => ({ ...f, quantity: v }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: mc.mutedForeground }]}>UNITÉ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {UNITS.slice(0, 6).map(u => (
                      <TouchableOpacity key={u} style={[styles.unitChip, form.unit === u && { backgroundColor: mc.primary }]}
                        onPress={() => setForm(f => ({ ...f, unit: u }))}>
                        <Text style={[styles.unitChipText, { color: form.unit === u ? "#fff" : mc.mutedForeground }]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  tabs: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 13, fontWeight: "600" },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  sectionHeader: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 8 },
  itemLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  itemDot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemQty: { fontSize: 12, marginTop: 2 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  boughtBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  boughtBtnText: { fontSize: 13, fontWeight: "600" },
  deleteBtn: { padding: 6 },
  autoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  autoBadgeText: { fontSize: 11, fontWeight: "600" },
  stockCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  fab: { position: "absolute", right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", elevation: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  textInput: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6, backgroundColor: "rgba(0,0,0,0.06)" },
  unitChipText: { fontSize: 13, fontWeight: "600" },
});
