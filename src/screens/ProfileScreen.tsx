import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useStock } from '../context/StockContext';
import { COLORS, FONTS, SHADOWS } from '../theme';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { bottles, getTotalStockValue } = useStock();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Remplissez tous les champs.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      const currentUser = auth.currentUser!;
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Alert.alert('Succès', 'Mot de passe modifié.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const msg = e.code === 'auth/wrong-password'
        ? 'Mot de passe actuel incorrect.'
        : 'Erreur lors du changement de mot de passe.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mon compte</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.restaurantName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.restaurantName}>{user?.restaurantName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bottles.length}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getTotalStockValue().toFixed(0)} €</Text>
            <Text style={styles.statLabel}>Valeur stock</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            <Text style={styles.rowText}>Changer le mot de passe</Text>
            <Ionicons
              name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={styles.passwordForm}>
              <Text style={styles.label}>Mot de passe actuel</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Min. 6 caractères"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.label}>Confirmer</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
              />
              <TouchableOpacity
                style={styles.savePasswordBtn}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.savePasswordText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.row, styles.rowDanger]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={[styles.rowText, { color: COLORS.danger }]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Spirit Stock v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20 },
  closeBtn: { padding: 4 },
  navTitle: { fontSize: 17, ...FONTS.bold, color: COLORS.text },
  content: { padding: 20, paddingBottom: 48 },
  identityCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center', ...SHADOWS.card, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, ...FONTS.bold, color: COLORS.white },
  restaurantName: { fontSize: 20, ...FONTS.bold, color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 16, alignItems: 'center', ...SHADOWS.card },
  statValue: { fontSize: 22, ...FONTS.bold, color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  section: { backgroundColor: COLORS.white, borderRadius: 14, ...SHADOWS.card, marginBottom: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowDanger: { borderTopWidth: 0 },
  rowText: { flex: 1, fontSize: 15, ...FONTS.medium, color: COLORS.text },
  passwordForm: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  savePasswordBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  savePasswordText: { color: COLORS.white, ...FONTS.bold },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 16 },
});
