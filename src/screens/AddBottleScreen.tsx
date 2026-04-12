import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS } from '../theme';
import { BottleCategory, CATEGORY_LABELS } from '../types';

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [BottleCategory, string][];

export default function AddBottleScreen({ navigation, route }: any) {
  const { addBottle, suppliers } = useStock();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BottleCategory>('whisky');
  const [quantity, setQuantity] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [price, setPrice] = useState('');
  const [supplierId, setSupplierId] = useState(
    route.params?.supplierId || (suppliers[0]?.id ?? '')
  );
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom du produit est obligatoire.');
      return;
    }
    const qty = parseInt(quantity, 10);
    const min = parseInt(minThreshold, 10);
    const p = parseFloat(price.replace(',', '.'));

    if (isNaN(qty) || qty < 0) {
      Alert.alert('Erreur', 'La quantité doit être un nombre valide.');
      return;
    }
    if (isNaN(min) || min < 0) {
      Alert.alert('Erreur', 'Le seuil minimum doit être un nombre valide.');
      return;
    }
    if (isNaN(p) || p < 0) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide.');
      return;
    }

    setLoading(true);
    try {
      await addBottle({
        name: name.trim(),
        category,
        quantity: qty,
        minThreshold: min,
        price: p,
        supplierId,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Nouveau produit</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Nom du produit *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="ex: Johnnie Walker Black"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Catégorie *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.pickerText}>{CATEGORY_LABELS[category]}</Text>
              <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerList}>
                {CATEGORIES.map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.pickerItem, category === val && styles.pickerItemActive]}
                    onPress={() => { setCategory(val); setShowCategoryPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, category === val && styles.pickerItemTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Quantité *</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Seuil minimum *</Text>
                <TextInput
                  style={styles.input}
                  value={minThreshold}
                  onChangeText={setMinThreshold}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
            </View>

            <Text style={styles.label}>Prix unitaire (€) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textSecondary}
            />

            {suppliers.length > 0 && (
              <>
                <Text style={styles.label}>Fournisseur</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => setShowSupplierPicker(!showSupplierPicker)}
                >
                  <Text style={styles.pickerText}>
                    {selectedSupplier?.name || 'Sélectionner un fournisseur'}
                  </Text>
                  <Ionicons name={showSupplierPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showSupplierPicker && (
                  <View style={styles.pickerList}>
                    {suppliers.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.pickerItem, supplierId === s.id && styles.pickerItemActive]}
                        onPress={() => { setSupplierId(s.id); setShowSupplierPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, supplierId === s.id && styles.pickerItemTextActive]}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          <Text style={styles.hint}>* Champs obligatoires</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20 },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, ...FONTS.bold, color: COLORS.text },
  saveText: { fontSize: 16, ...FONTS.semibold, color: COLORS.primary },
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  picker: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 15, color: COLORS.text },
  pickerList: { backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, overflow: 'hidden' },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemActive: { backgroundColor: COLORS.primary + '15' },
  pickerItemText: { fontSize: 14, color: COLORS.text },
  pickerItemTextActive: { color: COLORS.primary, ...FONTS.semibold },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },
});
