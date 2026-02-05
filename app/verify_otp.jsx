import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      const emailLower = String(email).toLowerCase();

      // First, validate against Firestore 'otp' collection for UNUSED code
      const otpRef = collection(db, 'otp');
      const q = query(otpRef, where('email', '==', emailLower), where('status', '==', 'unused'));
      const snap = await getDocs(q);

      if (snap.empty) {
        Alert.alert('Invalid', 'No unused OTP found for this email. Please request a new code.');
        setIsLoading(false);
        return;
      }

      // Find a matching OTP doc where not expired and code matches
      const now = Date.now();
      let matchingDoc = null;
      snap.forEach(d => {
        const data = d.data();
        const expiresAt = (data.expires_at && data.expires_at.toDate) ? data.expires_at.toDate().getTime() : new Date(data.expires_at).getTime();
        if (String(data.otp) === otp.trim() && expiresAt > now) {
          matchingDoc = { id: d.id, ...data };
        }
      });

      if (!matchingDoc) {
        Alert.alert('Invalid or expired', 'The OTP is incorrect or has expired.');
        setIsLoading(false);
        return;
      }

      // Mark OTP as used
      await updateDoc(doc(db, 'otp', matchingDoc.id), {
        status: 'used',
        used_at: serverTimestamp(),
      });

      // Also clear local storage copy
      const key = `otp:${emailLower}`;
      await AsyncStorage.removeItem(key);

      // Open reset password modal
      setShowResetModal(true);
    } catch (e) {
      console.error('Verify OTP error:', e);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      const emailLower = String(email).toLowerCase();

      // Try update in students first
      const studentsRef = collection(db, 'students');
      const studentsSnap = await getDocs(query(studentsRef, where('email', '==', emailLower)));
      if (!studentsSnap.empty) {
        const docId = studentsSnap.docs[0].id;
        await updateDoc(doc(db, 'students', docId), { password: newPassword, updated_at: serverTimestamp() });
        Alert.alert('Success', 'Password updated. You can now sign in.', [{ text: 'OK', onPress: () => router.replace('/') }]);
        return;
      }

      // Else try teachers
      const teachersRef = collection(db, 'teachers');
      const teachersSnap = await getDocs(query(teachersRef, where('email', '==', emailLower)));
      if (!teachersSnap.empty) {
        const docId = teachersSnap.docs[0].id;
        await updateDoc(doc(db, 'teachers', docId), { password: newPassword, updated_at: serverTimestamp() });
        Alert.alert('Success', 'Password updated. You can now sign in.', [{ text: 'OK', onPress: () => router.replace('/') }]);
        return;
      }

      Alert.alert('Not found', 'Account not found for this email.');
    } catch (err) {
      console.error('Password reset error:', err);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#1a1a1a' : '#8B1538'} translucent={false} />

      <LinearGradient colors={['#8B1538', '#4A0E4E']} style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.helloText}>Verify</ThemedText>
            <ThemedText style={styles.signInText}>OTP</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.instructions, { color: iconColor }]}>We sent a code to {email}</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Enter OTP</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.signInButton} onPress={handleVerify} disabled={isLoading}>
            <LinearGradient colors={['#FF4444', '#4A0E4E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
              {isLoading ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.signInButtonText}>Verify</ThemedText>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.sponsorContainer}>
            <View style={styles.sponsorLogos}>
              <Image source={require('../assets/images/logo.png')} style={styles.sponsorLogo} />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Reset Password Modal */}
      <Modal
        transparent={true}
        visible={showResetModal}
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}> 
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>Set New Password</ThemedText>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <ThemedText style={styles.inputLabel}>New Password</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: textColor, textAlign: 'left', letterSpacing: 0 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={true}
                  placeholder="Enter new password"
                  placeholderTextColor="#999"
                />
              </View>
              <ThemedText style={[styles.inputLabel, { marginTop: 16 }]}>Confirm Password</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: textColor, textAlign: 'left', letterSpacing: 0 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={true}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowResetModal(false)}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handlePasswordReset} disabled={resetLoading}>
                <LinearGradient colors={['#FF4444', '#4A0E4E']} style={styles.saveButtonGradient}>
                  {resetLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Update Password</ThemedText>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { height: height * 0.25, paddingHorizontal: 20, paddingBottom: 30, justifyContent: 'flex-start', paddingTop: 60 },
  headerContent: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginTop: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerTextContainer: { flex: 1 },
  helloText: { color: 'white', fontSize: 38, fontWeight: 'bold', marginBottom: 8, lineHeight: 45 },
  signInText: { color: 'white', fontSize: 32, fontWeight: 'bold', lineHeight: 38 },
  formCard: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -15, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 40, paddingBottom: 30 },
  instructions: { fontSize: 14, marginBottom: 8, textAlign: 'center' },
  inputContainer: { marginBottom: 25 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#FF4444', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
  textInput: { flex: 1, fontSize: 20, paddingVertical: 8, textAlign: 'center', letterSpacing: 4 },
  signInButton: { borderRadius: 25, marginTop: 10, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  buttonGradient: { borderRadius: 25, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  signInButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  sponsorContainer: { marginTop: 10 },
  sponsorLogos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  sponsorLogo: { width: 100, height: 100, resizeMode: 'contain' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '90%', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cancelButton: { flex: 1, marginRight: 10, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  saveButton: { flex: 1, marginLeft: 10, borderRadius: 10 },
  saveButtonGradient: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

