import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS, SHADOWS } from '../theme';
import { CATEGORY_LABELS } from '../types';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { bottles, loading, getLowStockBottles, getTotalStockValue } = useStock();

  const lowStock = getLowStockBottles();
  const totalValue = getTotalStockValue();
  const outOfStock = bottles.filter((b) => b.quantity === 0);

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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour</Text>
            <Text style={styles.restaurantName}>{user?.restaurantName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileBtn}
          >
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {user?.restaurantName?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statValue}>{bottles.length}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statValue, lowStock.length > 0 && { color: COLORS.danger }]}>
              {lowStock.length}
            </Text>
            <Text style={styles.statLabel}>Alertes</Text>
          </View>
          <View style={[styles.statCard, { flex: 1.4 }]}>
            <Text style={styles.statValue}>{totalValue.toFixed(0)} €</Text>
            <Text style={styles.statLabel}>Valeur stock</Text>
          </View>
        </View>

        {/* Out of stock banner */}
        {outOfStock.length > 0 && (
          <TouchableOpacity
            style={styles.outOfStockBanner}
            onPress={() => navigation.navigate('Restock')}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            <Text style={styles.outOfStockText}>
              {outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} épuisé{outOfStock.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.outOfStockLink}>Voir →</Text>
          </TouchableOpacity>
        )}

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stock faible</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Restock')}>
                <Text style={styles.seeAll}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {lowStock.slice(0, 5).map((bottle) => (
              <View key={bottle.id} style={styles.alertCard}>
                <View style={styles.alertLeft}>
                  <View style={[styles.dot, bottle.quantity === 0 ? styles.dotDanger : styles.dotWarning]} />
                  <View>
                    <Text style={styles.alertName}>{bottle.name}</Text>
                    <Text style={styles.alertCategory}>{CATEGORY_LABELS[bottle.category]}</Text>
                  </View>
                </View>
                <View style={styles.alertRight}>
                  <Text style={[styles.alertQty, bottle.quantity === 0 && { color: COLORS.danger }]}>
                    {bottle.quantity} restant{bottle.quantity > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.alertMin}>seuil : {bottle.minThreshold}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* All good */}
        {lowStock.length === 0 && bottles.length > 0 && (
          <View style={styles.allGoodCard}>
            <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            <Text style={styles.allGoodText}>Tout est en ordre !</Text>
            <Text style={styles.allGoodSub}>Aucun produit sous le seuil minimum</Text>
          </View>
        )}

        {/* Empty state */}
        {bottles.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="wine-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Aucun produit</Text>
            <Text style={styles.emptySub}>
              Commencez par ajouter vos bouteilles dans l'onglet Inventaire
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Inventory')}
            >
              <Text style={styles.emptyBtnText}>Ajouter des produits</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  restaurantName: { fontSize: 22, ...FONTS.bold, color: COLORS.text },
  profileBtn: { padding: 2 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { fontSize: 16, ...FONTS.bold, color: COLORS.white },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, ...SHADOWS.card, alignItems: 'center' },
  statValue: { fontSize: 22, ...FONTS.bold, color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, ...FONTS.medium },
  outOfStockBanner: { backgroundColor: COLORS.dangerLight, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  outOfStockText: { flex: 1, color: COLORS.danger, ...FONTS.medium, fontSize: 13 },
  outOfStockLink: { color: COLORS.danger, ...FONTS.bold, fontSize: 13 },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, ...SHADOWS.card, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, ...FONTS.medium },
  alertCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotWarning: { backgroundColor: COLORS.warning },
  dotDanger: { backgroundColor: COLORS.danger },
  alertName: { fontSize: 14, ...FONTS.semibold, color: COLORS.text },
  alertCategory: { fontSize: 12, color: COLORS.textSecondary },
  alertRight: { alignItems: 'flex-end' },
  alertQty: { fontSize: 14, ...FONTS.bold, color: COLORS.warning },
  alertMin: { fontSize: 11, color: COLORS.textSecondary },
  allGoodCard: { backgroundColor: COLORS.successLight, borderRadius: 16, padding: 28, alignItems: 'center', ...SHADOWS.card },
  allGoodText: { fontSize: 18, ...FONTS.bold, color: COLORS.success, marginTop: 12 },
  allGoodSub: { fontSize: 13, color: COLORS.success, marginTop: 4, textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center', ...SHADOWS.card },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.text, marginTop: 16 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  emptyBtnText: { color: COLORS.white, ...FONTS.semibold },
});
