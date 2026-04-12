import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS, SHADOWS } from '../theme';
import { Bottle, CATEGORY_LABELS } from '../types';

interface Section {
  supplier: { id: string; name: string; phone: string };
  data: Bottle[];
}

export default function RestockScreen() {
  const { getLowStockBottles, suppliers } = useStock();
  const lowStock = getLowStockBottles();

  const sections: Section[] = suppliers
    .map((supplier) => ({
      supplier,
      data: lowStock.filter((b) => b.supplierId === supplier.id),
    }))
    .filter((s) => s.data.length > 0);

  const unassigned = lowStock.filter(
    (b) => !suppliers.find((s) => s.id === b.supplierId)
  );
  if (unassigned.length > 0) {
    sections.push({
      supplier: { id: 'none', name: 'Sans fournisseur', phone: '' },
      data: unassigned,
    });
  }

  const callSupplier = (phone: string, name: string) => {
    if (!phone) {
      Alert.alert('Aucun numéro', 'Ce fournisseur n\'a pas de numéro de téléphone.');
      return;
    }
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
      else Alert.alert('Erreur', 'Impossible de passer un appel depuis cet appareil.');
    });
  };

  const renderBottle = ({ item }: { item: Bottle }) => {
    const isEmpty = item.quantity === 0;
    return (
      <View style={[styles.bottleRow, isEmpty && styles.bottleRowEmpty]}>
        <View style={[styles.statusDot, isEmpty ? styles.dotEmpty : styles.dotLow]} />
        <View style={styles.bottleInfo}>
          <Text style={styles.bottleName}>{item.name}</Text>
          <Text style={styles.bottleCat}>{CATEGORY_LABELS[item.category]}</Text>
        </View>
        <View style={styles.bottleQty}>
          <Text style={[styles.qty, isEmpty && { color: COLORS.danger }]}>
            {item.quantity}
          </Text>
          <Text style={styles.qtyLabel}>/ seuil {item.minThreshold}</Text>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.supplierInfo}>
        <Text style={styles.supplierName}>{section.supplier.name}</Text>
        {section.supplier.phone ? (
          <Text style={styles.supplierPhone}>{section.supplier.phone}</Text>
        ) : null}
      </View>
      {section.supplier.phone ? (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => callSupplier(section.supplier.phone, section.supplier.name)}
        >
          <Ionicons name="call" size={16} color={COLORS.white} />
          <Text style={styles.callBtnText}>Appeler</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (lowStock.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>À commander</Text>
        </View>
        <View style={styles.allGood}>
          <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          <Text style={styles.allGoodTitle}>Tout est en stock</Text>
          <Text style={styles.allGoodSub}>Aucun produit sous le seuil minimum</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>À commander</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{lowStock.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Produits groupés par fournisseur — appuyez sur "Appeler" pour commander
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderBottle}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        SectionSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  titleBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, ...FONTS.bold, color: COLORS.text },
  countBadge: { backgroundColor: COLORS.danger, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: COLORS.white, fontSize: 13, ...FONTS.bold },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: 20, marginBottom: 12 },
  list: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  sectionHeader: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: 15, ...FONTS.bold, color: COLORS.white },
  supplierPhone: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  callBtnText: { color: COLORS.white, ...FONTS.bold, fontSize: 14 },
  bottleRow: { backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bottleRowEmpty: { backgroundColor: COLORS.dangerLight },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  dotLow: { backgroundColor: COLORS.warning },
  dotEmpty: { backgroundColor: COLORS.danger },
  bottleInfo: { flex: 1 },
  bottleName: { fontSize: 14, ...FONTS.semibold, color: COLORS.text },
  bottleCat: { fontSize: 12, color: COLORS.textSecondary },
  bottleQty: { alignItems: 'flex-end' },
  qty: { fontSize: 18, ...FONTS.bold, color: COLORS.warning },
  qtyLabel: { fontSize: 11, color: COLORS.textSecondary },
  allGood: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  allGoodTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.success },
  allGoodSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
