import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../theme';

export default function RegisterScreen({ navigation }: any) {
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!restaurantName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    const strongPassword = /^(?=.*[0-9]).{8,}$/;
    if (!strongPassword.test(password)) {
      Alert.alert('Erreur', 'Mot de passe : 8 caractères minimum dont 1 chiffre.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, restaurantName.trim());
    } catch (e: any) {
      const msg =
        e.code === 'auth/email-already-in-use'
          ? 'Cet email est déjà utilisé.'
          : 'Erreur lors de la création du compte.';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="wine" size={44} color={COLORS.accent} />
            <Text style={styles.title}>Créer votre compte</Text>
            <Text style={styles.subtitle}>Un compte par établissement • 20€/mois</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nom de l'établissement</Text>
            <TextInput
              style={styles.input}
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder="Le Bar du Coin"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="contact@votrebar.com"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="8 caractères minimum dont 1 chiffre"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingTop: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: COLORS.primary, fontSize: 15, ...FONTS.medium },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 26, ...FONTS.bold, color: COLORS.primary, marginTop: 10 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  form: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  registerBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  registerBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },
});
