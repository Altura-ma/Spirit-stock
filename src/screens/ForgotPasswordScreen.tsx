import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { COLORS, FONTS } from '../theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert('Erreur', 'Aucun compte associé à cet email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.container}>
          <Ionicons name="lock-open-outline" size={48} color={COLORS.accent} />
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Entrez votre email, vous recevrez un lien pour réinitialiser votre mot de passe.
          </Text>

          {sent ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={styles.successText}>Email envoyé !</Text>
              <Text style={styles.successSub}>Vérifiez votre boîte mail et suivez le lien.</Text>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backBtnText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.sendBtnText}>Envoyer le lien</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 20 },
  backText: { color: COLORS.primary, fontSize: 15, ...FONTS.medium },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 26, ...FONTS.bold, color: COLORS.primary, marginTop: 16 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 20, marginBottom: 32 },
  form: { width: '100%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 13, ...FONTS.semibold, color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  sendBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },
  successCard: { width: '100%', backgroundColor: COLORS.successLight, borderRadius: 16, padding: 28, alignItems: 'center', gap: 8 },
  successText: { fontSize: 20, ...FONTS.bold, color: COLORS.success },
  successSub: { fontSize: 14, color: COLORS.success, textAlign: 'center' },
  backBtn: { backgroundColor: COLORS.success, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  backBtnText: { color: COLORS.white, ...FONTS.bold },
});
