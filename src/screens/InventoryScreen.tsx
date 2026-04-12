import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS, SHADOWS } from '../theme';
import { Bottle, CATEGORY_LABELS, BottleCategory } from '../types';

const CATEGORIES: Array<{ value: BottleCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tout' },
  { value: 'whisky', label: 'Whisky' },
  { value: 'rhum', label: 'Rhum' },
  { value: 'vodka', label: 'Vodka' },
  { value: 'gin', label: 'Gin' },
  { value: 'cognac', label: 'Cognac' },
  { value: 'tequila', label: 'Tequila' },
  { value: 'vin_rouge', label: 'Vin Rouge' },
  { value: 'vin_blanc', label: 'Vin Blanc' },
  { value: 'vin_rose', label: 'Rosé' },
  { value: 'champagne', label: 'Champagne' },
  { value: 'biere', label: 'Bière' },
  { value: 'liqueur', label: 'Liqueur' },
  { value: 'autre', label: 'Autre' },
];

function SellModal({
  bottle,
  visible,
  onClose,
  onSell,
}: {
  bottle: Bottle | null;
  visible: boolean;
  onClose: () => void;
  onSell: (qty: number) => Promise<void>;
}) {
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(false);

  // Réinitialise la quantité à chaque nouvelle bouteille
  useEffect(() => {
    if (bottle) setQty('1');
  }, [bottle?.id]);

  if (!bottle) return null;

  const parsed = parseInt(qty, 10);
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= bottle.quantity;

  const handleConfirm = async () => {
    if (!isValid) {
      Alert.alert(
        'Quantité invalide',
        `Entrez une quantité entre 1 et ${bottle.quantity}.`
      );
      return;
    }
    setLoading(true);
    try {
      await onSell(parsed);
    } finally {
      setLoading(false);
    }
  };

  const adjust = (delta: number) => {
    const current = parseInt(qty, 10) || 0;
    const next = Math.max(1, Math.min(bottle.quantity, current + delta));
    setQty(String(next));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>Enregistrer une vente</Text>
          <Text style={modalStyles.name}>{bottle.name}</Text>
          <Text style={modalStyles.stock}>
            Stock disponible : <Text style={{ color: COLORS.primary }}>{bottle.quantity}</Text>
          </Text>

          <Text style={modalStyles.label}>Quantité vendue</Text>
          <View style={modalStyles.qtyRow}>
            <TouchableOpacity
              style={modalStyles.qtyBtn}
              onPress={() => adjust(-1)}
            >
              <Ionicons name="remove" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TextInput
              style={modalStyles.input}
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={modalStyles.qtyBtn}
              onPress={() => adjust(1)}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={modalStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirmBtn, !isValid && modalStyles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading || !isValid}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={modalStyles.confirmText}>Valider</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '85%' },
  title: { fontSize: 18, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  name: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 4 },
  stock: { fontSize: 13, ...FONTS.medium, color: COLORS.text, marginBottom: 20 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.inputBg },
  input: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, fontSize: 22, color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, ...FONTS.bold },
  buttons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.medium },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: COLORS.border },
  confirmText: { color: COLORS.white, ...FONTS.bold },
});

function BottleItem({
  bottle,
  onEdit,
  onDelete,
  onSell,
}: {
  bottle: Bottle;
  onEdit: () => void;
  onDelete: () => void;
  onSell: () => void;
}) {
  const isLow = bottle.quantity <= bottle.minThreshold;
  const isEmpty = bottle.quantity === 0;

  return (
    <View style={[itemStyles.card, isEmpty && itemStyles.cardEmpty, isLow && !isEmpty && itemStyles.cardLow]}>
      <View style={itemStyles.top}>
        <View style={itemStyles.titleRow}>
          <Text style={itemStyles.name} numberOfLines={1}>{bottle.name}</Text>
          {isEmpty && (
            <View style={itemStyles.badge}>
              <Text style={itemStyles.badgeText}>ÉPUISÉ</Text>
            </View>
          )}
          {isLow && !isEmpty && (
            <View style={[itemStyles.badge, itemStyles.badgeWarning]}>
              <Text style={[itemStyles.badgeText, { color: COLORS.warning }]}>FAIBLE</Text>
            </View>
          )}
        </View>
        <Text style={itemStyles.category}>{CATEGORY_LABELS[bottle.category]}</Text>
      </View>

      <View style={itemStyles.bottom}>
        <View style={itemStyles.info}>
          <Text style={[itemStyles.qty, isEmpty && { color: COLORS.danger }]}>
            {bottle.quantity}
          </Text>
          <Text style={itemStyles.qtyLabel}>unités</Text>
          <Text style={itemStyles.minLabel}>seuil : {bottle.minThreshold}</Text>
        </View>
        <View style={itemStyles.info}>
          <Text style={itemStyles.price}>{bottle.price.toFixed(2)} €</Text>
          <Text style={itemStyles.priceLabel}>/ unité</Text>
          <Text style={itemStyles.valueLabel}>
            val. {(bottle.quantity * bottle.price).toFixed(0)} €
          </Text>
        </View>
        <View style={itemStyles.actions}>
          <TouchableOpacity
            style={[itemStyles.sellBtn, isEmpty && itemStyles.sellBtnDisabled]}
            onPress={isEmpty ? undefined : onSell}
            disabled={isEmpty}
          >
            <Ionicons name="remove-circle-outline" size={18} color={COLORS.white} />
            <Text style={itemStyles.sellBtnText}>Vente</Text>
          </TouchableOpacity>
          <View style={itemStyles.iconBtns}>
            <TouchableOpacity onPress={onEdit} style={itemStyles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={itemStyles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10, ...SHADOWS.card },
  cardLow: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardEmpty: { borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  top: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, ...FONTS.bold, color: COLORS.text, flex: 1 },
  badge: { backgroundColor: COLORS.dangerLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeWarning: { backgroundColor: COLORS.warningLight },
  badgeText: { fontSize: 10, ...FONTS.bold, color: COLORS.danger },
  category: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  info: { flex: 1 },
  qty: { fontSize: 24, ...FONTS.bold, color: COLORS.primary },
  qtyLabel: { fontSize: 11, color: COLORS.textSecondary },
  minLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  priceLabel: { fontSize: 11, color: COLORS.textSecondary },
  valueLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  sellBtn: { backgroundColor: COLORS.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  sellBtnDisabled: { backgroundColor: COLORS.border },
  sellBtnText: { color: COLORS.white, fontSize: 12, ...FONTS.semibold },
  iconBtns: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});

export default function InventoryScreen({ navigation }: any) {
  const { bottles, loading, error, deleteBottle, sellBottle } = useStock();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BottleCategory | 'all'>('all');
  const [sellTarget, setSellTarget] = useState<Bottle | null>(null);

  const filtered = bottles.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || b.category === category;
    return matchSearch && matchCat;
  });

  const handleDelete = (bottle: Bottle) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${bottle.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBottle(bottle.id);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer ce produit.');
            }
          },
        },
      ]
    );
  };

  const handleSell = async (qty: number) => {
    if (!sellTarget) return;
    try {
      await sellBottle(sellTarget.id, qty);
      setSellTarget(null);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la vente.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventaire</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddBottle', {})}
        >
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="wifi-outline" size={16} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor={COLORS.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(i) => i.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, category === item.value && styles.catChipActive]}
            onPress={() => setCategory(item.value)}
          >
            <Text style={[styles.catChipText, category === item.value && styles.catChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.catScroll}
      />

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <BottleItem
            bottle={item}
            onEdit={() => navigation.navigate('EditBottle', { bottle: item })}
            onDelete={() => handleDelete(item)}
            onSell={() => setSellTarget(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wine-outline" size={44} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {bottles.length === 0 ? 'Ajoutez votre premier produit' : 'Aucun résultat'}
            </Text>
          </View>
        }
      />

      <SellModal
        bottle={sellTarget}
        visible={!!sellTarget}
        onClose={() => setSellTarget(null)}
        onSell={handleSell}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, ...FONTS.bold, color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.dangerLight, paddingHorizontal: 20, paddingVertical: 8 },
  errorText: { flex: 1, fontSize: 12, color: COLORS.danger },
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchBox: { backgroundColor: COLORS.white, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  catScroll: { maxHeight: 44 },
  catList: { paddingHorizontal: 20, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium },
  catChipTextActive: { color: COLORS.white },
  list: { padding: 20, paddingTop: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
});
