import React, { useState } from 'react';
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
  { value: 'vin_rouge', label: 'Vin Rouge' },
  { value: 'vin_blanc', label: 'Vin Blanc' },
  { value: 'champagne', label: 'Champagne' },
  { value: 'biere', label: 'Bière' },
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
  onSell: (qty: number) => void;
}) {
  const [qty, setQty] = useState('1');
  if (!bottle) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>Vente</Text>
          <Text style={modalStyles.name}>{bottle.name}</Text>
          <Text style={modalStyles.stock}>Stock actuel : {bottle.quantity}</Text>
          <Text style={modalStyles.label}>Quantité vendue</Text>
          <TextInput
            style={modalStyles.input}
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.confirmBtn}
              onPress={() => {
                const n = parseInt(qty, 10);
                if (!n || n <= 0) return;
                onSell(n);
              }}
            >
              <Text style={modalStyles.confirmText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '80%' },
  title: { fontSize: 18, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  name: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 },
  stock: { fontSize: 13, color: COLORS.primary, ...FONTS.medium, marginBottom: 16 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, fontSize: 18, color: COLORS.text, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  buttons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.medium },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
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
          <Text style={itemStyles.name}>{bottle.name}</Text>
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
          <Text style={itemStyles.qty}>{bottle.quantity}</Text>
          <Text style={itemStyles.qtyLabel}>unités</Text>
          <Text style={itemStyles.minLabel}>seuil: {bottle.minThreshold}</Text>
        </View>
        <View style={itemStyles.info}>
          <Text style={itemStyles.price}>{bottle.price.toFixed(2)} €</Text>
          <Text style={itemStyles.priceLabel}>/ unité</Text>
          <Text style={itemStyles.valueLabel}>val. {(bottle.quantity * bottle.price).toFixed(0)} €</Text>
        </View>
        <View style={itemStyles.actions}>
          <TouchableOpacity style={itemStyles.sellBtn} onPress={onSell}>
            <Ionicons name="remove-circle-outline" size={20} color={COLORS.white} />
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
  sellBtnText: { color: COLORS.white, fontSize: 12, ...FONTS.semibold },
  iconBtns: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});

export default function InventoryScreen({ navigation }: any) {
  const { bottles, loading, deleteBottle, sellBottle } = useStock();
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
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteBottle(bottle.id) },
      ]
    );
  };

  const handleSell = async (qty: number) => {
    if (!sellTarget) return;
    if (qty > sellTarget.quantity) {
      Alert.alert('Erreur', 'Quantité supérieure au stock disponible.');
      return;
    }
    await sellBottle(sellTarget.id, qty);
    setSellTarget(null);
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
