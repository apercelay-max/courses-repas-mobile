import React, { useState, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, Platform, FlatList, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useDatabase } from "@/context/DatabaseContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GradientBackground } from "@/components/GradientBackground";
import { WebBarcodeScanner } from "@/components/WebBarcodeScanner";
import type { Location, InventoryItem } from "@/types/database";
import { UNITS, normalizeUnit } from "@/lib/units";

function parseProductQuantity(raw?: string): { quantity: number; unit: string } | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Zµ]+)/);
  if (!match) return null;
  const qty = parseFloat(match[1].replace(",", "."));
  if (isNaN(qty)) return null;
  return { quantity: qty, unit: normalizeUnit(match[2]) };
}

const LOCATIONS: { key: Location; label: string; icon: "thermometer" | "archive" | "cloud-snow" }[] = [
  { key: "frigo", label: "Frigo", icon: "thermometer" },
  { key: "placard", label: "Placard", icon: "archive" },
  { key: "congelateur", label: "Congélateur", icon: "cloud-snow" },
];

function formatExpiry(dateStr: string | null): { label: string; urgent: boolean } {
  if (!dateStr) return { label: "", urgent: false };
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Périmé", urgent: true };
  if (days === 0) return { label: "Aujourd'hui", urgent: true };
  if (days === 1) return { label: "Demain", urgent: true };
  if (days <= 3) return { label: `${days}j`, urgent: true };
  return { label: `${days}j`, urgent: false };
}

export default function InventaireScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { db, addInventoryItemsBatch, removeInventoryItem, updateInventoryItem, toggleFavorite } = useDatabase();
  const [activeLocation, setActiveLocation] = useState<Location>("frigo");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [favOnly, setFavOnly] = useState(false);

  const [form, setForm] = useState({ name: "", quantity: "1", unit: "piece", location: "frigo" as Location, expiryDate: "" });

  const [showScanner, setShowScanner] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

  const locationItems = useMemo(() => {
    let items = db.inventoryItems.filter(i => i.location === activeLocation);
    if (favOnly) items = items.filter(i => i.isFavorite);
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => {
      const ing = db.ingredients.find(ing => ing.id === i.ingredientId);
      return ing?.canonicalName.toLowerCase().includes(q);
    });
  }, [db, activeLocation, search, favOnly]);

  const suggestions = useMemo(() => {
    if (!form.name || form.name.length < 2) return [];
    const q = form.name.toLowerCase();
    return db.ingredients
      .filter(i => i.canonicalName.toLowerCase().includes(q) || i.aliases.some(a => a.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [db.ingredients, form.name]);

  async function handleAdd() {
    if (!form.name.trim()) return;
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) return;
    const ing = db.ingredients.find(i =>
      i.canonicalName.toLowerCase() === form.name.toLowerCase().trim() ||
      i.aliases.some(a => a.toLowerCase() === form.name.toLowerCase().trim())
    );
    const unit = form.unit || (ing?.defaultUnit ?? "piece");
    // Crée l'ingrédient s'il n'existe pas encore, avec le nom tapé —
    // fini les articles « Inconnu » dans l'inventaire.
    await addInventoryItemsBatch([{
      name: form.name.trim(),
      quantity: qty,
      unit,
      location: form.location,
      expiryDate: form.expiryDate || null,
    }]);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setForm({ name: "", quantity: "1", unit: "piece", location: "frigo", expiryDate: "" });
  }

  async function handleOpenScanner() {
    setScanError(null);
    // Sur le web, expo-camera n'a pas de vraie API de permission caméra
    // fiable : getUserMedia (déclenché par WebBarcodeScanner) affichera
    // lui-même la demande d'autorisation du navigateur.
    if (Platform.OS === "web") {
      hasScannedRef.current = false;
      setShowScanner(true);
      return;
    }
    if (permission && !permission.granted && !permission.canAskAgain) {
      Alert.alert(
        "Permission caméra requise",
        "Active l'accès à la caméra dans les réglages de ton téléphone pour scanner un code-barres."
      );
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    hasScannedRef.current = false;
    setShowScanner(true);
  }

  async function lookupBarcode(code: string) {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLookingUp(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const name: string = json.product.product_name_fr || json.product.product_name || "";
        const parsedQty = parseProductQuantity(json.product.quantity || json.product.product_quantity);
        setForm(f => ({
          ...f,
          name: name || f.name,
          quantity: parsedQty ? String(parsedQty.quantity) : f.quantity,
          unit: parsedQty ? parsedQty.unit : f.unit,
        }));
        if (!name) setScanError("Produit trouvé mais sans nom. Complète-le manuellement.");
      } else {
        setScanError("Produit introuvable dans Open Food Facts. Complète manuellement.");
      }
    } catch (e) {
      setScanError("Impossible de contacter Open Food Facts. Vérifie ta connexion.");
    } finally {
      setIsLookingUp(false);
      setShowScanner(false);
    }
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    await lookupBarcode(result.data);
  }

  function handleWebBarcodeScanned(code: string) {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    lookupBarcode(code);
  }

  async function handleDelete(id: string) {
    if (Platform.OS === "web") {
      await removeInventoryItem(id);
    } else {
      Alert.alert("Supprimer", "Retirer cet article de l'inventaire ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => removeInventoryItem(id) },
      ]);
    }
  }

  const locColor = { frigo: colors.frigo, placard: colors.placard, congelateur: colors.congelateur };
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.locationTabs}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc.key}
                style={[styles.locTab, activeLocation === loc.key && { backgroundColor: locColor[loc.key] }]}
                onPress={() => setActiveLocation(loc.key)}
              >
                <Feather name={loc.icon} size={14} color={activeLocation === loc.key ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.locTabText, { color: activeLocation === loc.key ? "#fff" : colors.mutedForeground }]}>
                  {loc.label}
                </Text>
                <View style={[styles.locBadge, { backgroundColor: activeLocation === loc.key ? "rgba(255,255,255,0.3)" : colors.muted }]}>
                  <Text style={[styles.locBadgeText, { color: activeLocation === loc.key ? "#fff" : colors.mutedForeground }]}>
                    {db.inventoryItems.filter(i => i.location === loc.key).length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.searchRowContainer}>
            <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border, flex: 1 }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Rechercher..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setFavOnly(v => !v)}
              style={[
                styles.favFilter,
                {
                  backgroundColor: favOnly ? colors.warning + "22" : colors.muted,
                  borderColor: favOnly ? colors.warning : colors.border,
                },
              ]}
            >
              <Feather name="star" size={18} color={favOnly ? colors.warning : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={locationItems}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
          scrollEnabled={!!locationItems.length}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="inbox" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {favOnly ? "Aucun favori dans ce compartiment" : "Aucun article dans ce compartiment"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {favOnly ? "Appuie sur ★ sur un article pour le mettre en favori" : "Appuie sur + pour en ajouter un"}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const ing = db.ingredients.find(i => i.id === item.ingredientId);
            const expiry = formatExpiry(item.expiryDate);
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favBtn}>
                  <Feather name="star" size={16} color={item.isFavorite ? colors.warning : colors.border} />
                </TouchableOpacity>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {ing?.canonicalName ?? "Inconnu"}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                {expiry.label ? (
                  <View style={[styles.expiryBadge, { backgroundColor: expiry.urgent ? colors.warningLight : colors.muted }]}>
                    <Text style={[styles.expiryText, { color: expiry.urgent ? colors.warning : colors.mutedForeground }]}>
                      {expiry.label}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            );
          }}
        />

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: locColor[activeLocation] }]}
          onPress={() => { setForm(f => ({ ...f, location: activeLocation })); setShowModal(true); }}
        >
          <Feather name="plus" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={[styles.modalCancel, { color: theme.colors.mutedForeground }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Ajouter un article</Text>
              <TouchableOpacity onPress={handleAdd}>
                <Text style={[styles.modalSave, { color: theme.colors.primary }]}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.mutedForeground, marginTop: 0 }]}>INGRÉDIENT</Text>
                <TouchableOpacity onPress={handleOpenScanner} style={styles.scanBtn}>
                  <Feather name="camera" size={14} color={theme.colors.primary} />
                  <Text style={[styles.scanBtnText, { color: theme.colors.primary }]}>Scanner un code-barres</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.muted, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="ex: poulet, riz, lait..."
                placeholderTextColor={theme.colors.mutedForeground}
                value={form.name}
                onChangeText={v => { setForm(f => ({ ...f, name: v })); setScanError(null); }}
                autoFocus
              />
              {scanError && <Text style={[styles.scanErrorText, { color: theme.colors.destructive }]}>{scanError}</Text>}
              {suggestions.length > 0 && (
                <View style={[styles.suggestions, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  {suggestions.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.suggestionItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => setForm(f => ({ ...f, name: s.canonicalName, unit: s.defaultUnit }))}>
                      <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{s.canonicalName}</Text>
                      <Text style={[styles.suggestionUnit, { color: theme.colors.mutedForeground }]}>{s.defaultUnit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.mutedForeground }]}>QUANTITÉ</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.muted, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="1"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={form.quantity}
                    onChangeText={v => setForm(f => ({ ...f, quantity: v }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.mutedForeground }]}>UNITÉ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                    {UNITS.map(u => (
                      <TouchableOpacity key={u} style={[styles.unitChip, form.unit === u && { backgroundColor: theme.colors.primary }]}
                        onPress={() => setForm(f => ({ ...f, unit: u }))}>
                        <Text style={[styles.unitChipText, { color: form.unit === u ? "#fff" : theme.colors.mutedForeground }]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.mutedForeground }]}>EMPLACEMENT</Text>
              <View style={styles.row}>
                {LOCATIONS.map(loc => (
                  <TouchableOpacity key={loc.key} style={[styles.locationChip, form.location === loc.key && { backgroundColor: locColor[loc.key] }]}
                    onPress={() => setForm(f => ({ ...f, location: loc.key }))}>
                    <Text style={[styles.locationChipText, { color: form.location === loc.key ? "#fff" : theme.colors.mutedForeground }]}>
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.mutedForeground }]}>DATE DE PÉREMPTION (optionnel)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.muted, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={theme.colors.mutedForeground}
                value={form.expiryDate}
                onChangeText={v => setForm(f => ({ ...f, expiryDate: v }))}
              />
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
          <View style={styles.scannerContainer}>
            {Platform.OS === "web" ? (
              <WebBarcodeScanner active={showScanner} onScanned={handleWebBarcodeScanned} />
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
                onBarcodeScanned={isLookingUp ? undefined : handleBarcodeScanned}
              />
            )}
            <View style={styles.scannerOverlay} pointerEvents="none">
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerHint}>
                {isLookingUp ? "Recherche du produit..." : "Vise le code-barres du produit"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.scannerClose, { top: (Platform.OS === "web" ? 20 : insets.top) + 12 }]}
              onPress={() => setShowScanner(false)}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  locationTabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  locTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10 },
  locTabText: { fontSize: 12, fontWeight: "600" },
  locBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  locBadgeText: { fontSize: 10, fontWeight: "700" },
  searchRowContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  favFilter: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 8 },
  favBtn: { marginRight: 10, padding: 4 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemQty: { fontSize: 13, marginTop: 2 },
  expiryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  expiryText: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { padding: 8 },
  fab: { position: "absolute", right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", elevation: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },
  modalBody: { flex: 1, padding: 20 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  textInput: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  suggestions: { borderRadius: 10, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  suggestionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  suggestionText: { fontSize: 15 },
  suggestionUnit: { fontSize: 12 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  unitScroll: { marginTop: 0 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6, backgroundColor: "rgba(0,0,0,0.06)" },
  unitChipText: { fontSize: 13, fontWeight: "600" },
  locationChip: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(0,0,0,0.06)" },
  locationChipText: { fontSize: 14, fontWeight: "600" },
  fieldLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 6 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  scanBtnText: { fontSize: 13, fontWeight: "600" },
  scanErrorText: { fontSize: 12, marginTop: 6 },
  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  scannerFrame: { width: 260, height: 160, borderRadius: 16, borderWidth: 3, borderColor: "#fff" },
  scannerHint: { color: "#fff", fontSize: 15, fontWeight: "600" },
  scannerClose: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
