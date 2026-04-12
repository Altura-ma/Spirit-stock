import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS, SHADOWS } from '../theme';
import { Supplier } from '../types';

function SupplierFormModal({
  visible,
  supplier,
  onClose,
  onSave,
}: {
  visible: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (name: string, phone: string) => Promise<void>;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setName(supplier?.name ?? '');
    setPhone(supplier?.phone ?? '');
  }, [supplier, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      await onSave(name.trim(), phone.trim().replace(/\s/g, ''));
      onClose();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le fournisseur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={formStyles.overlay}
      >
        <View style={formStyles.sheet}>
          <View style={formStyles.handle} />
          <Text style={formStyles.title}>
            {supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </Text>

          <Text style={formStyles.label}>Nom *</Text>
          <TextInput
            style={formStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nom du fournisseur"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />

          <Text style={formStyles.label}>Téléphone</Text>
          <TextInput
            style={formStyles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0612345678"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />

          <View style={formStyles.btnRow}>
            <TouchableOpacity style={formStyles.cancelBtn} onPress={onClose}>
              <Text style={formStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={formStyles.saveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, ...FONTS.bold, color: COLORS.text, marginBottom: 8 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.medium },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: COLORS.white, ...FONTS.bold },
});

function SupplierCard({
  supplier,
  bottleCount,
  onCall,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  bottleCount: number;
  onCall: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.avatar}>
        <Text style={cardStyles.avatarText}>{supplier.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{supplier.name}</Text>
        <Text style={cardStyles.phone}>{supplier.phone || 'Aucun numéro'}</Text>
        <Text style={cardStyles.count}>{bottleCount} produit{bottleCount > 1 ? 's' : ''}</Text>
      </View>
      <View style={cardStyles.actions}>
        {supplier.phone ? (
          <TouchableOpacity style={cardStyles.callBtn} onPress={onCall}>
            <Ionicons name="call" size={18} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onEdit} style={cardStyles.iconBtn}>
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={cardStyles.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', ...SHADOWS.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, ...FONTS.bold, color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  count: { fontSize: 12, color: COLORS.primary, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  callBtn: { backgroundColor: COLORS.success, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  iconBtn: { padding: 8 },
});

export default function SuppliersScreen() {
  const { suppliers, bottles, addSupplier, updateSupplier, deleteSupplier } = useStock();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const handleCall = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
    });
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${supplier.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteSupplier(supplier.id),
        },
      ]
    );
  };

  const handleSave = async (name: string, phone: string) => {
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, { name, phone });
    } else {
      await addSupplier({ name, phone });
    }
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setModalVisible(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Fournisseurs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            bottleCount={bottles.filter((b) => b.supplierId === item.id).length}
            onCall={() => handleCall(item.phone)}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="call-outline" size={44} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucun fournisseur</Text>
            <Text style={styles.emptySub}>Louis Mathieu est ajouté automatiquement à l'inscription</Text>
          </View>
        }
      />

      <SupplierFormModal
        visible={modalVisible}
        supplier={editingSupplier}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, ...FONTS.bold, color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 16, ...FONTS.semibold, color: COLORS.textSecondary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
