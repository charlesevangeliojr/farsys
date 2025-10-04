import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';
import emailService from '../services/emailService.js';

const { height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  React.useEffect(() => {
    if (user && user.id) {
      router.replace('/dashboard');
    }
  }, [user]);

  const sendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      const emailLowerCase = email.trim().toLowerCase();
      // Check if email exists in students or teachers
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(query(studentsRef, where('email', '==', emailLowerCase)));
      const teachersRef = collection(db, 'teachers');
      const teachersSnapshot = await getDocs(query(teachersRef, where('email', '==', emailLowerCase)));

      if (studentsSnapshot.empty && teachersSnapshot.empty) {
        Alert.alert('Not found', 'No account found with this email address.');
        setIsLoading(false);
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      await AsyncStorage.setItem(`otp:${emailLowerCase}`, JSON.stringify({ otp, expiry }));

      // Save OTP to Firestore 'otp' collection
      try {
        await addDoc(collection(db, 'otp'), {
          email: emailLowerCase,
          otp,
          status: 'unused',
          expires_at: new Date(expiry),
          created_at: serverTimestamp(),
        });
      } catch (e) {
        console.error('Failed to save OTP to Firestore:', e);
      }

      // Try to send email, but don't block if it fails
      let emailSent = false;
      try {
        await emailService.sendOtpEmail(emailLowerCase, otp, 10);
        emailSent = true;
      } catch (e) {
        console.warn('Email send failed (continuing):', e?.message || e);
      }

      // For development: Show OTP in alert if email service is not available
      if (!emailSent) {
        Alert.alert(
          'OTP Code (Development Mode)', 
          `Your OTP code is: ${otp}\n\nNote: Email service is not configured. This is for development/testing only.\n\nThe code expires in 10 minutes.`,
          [
            {
              text: 'Copy Code',
              onPress: () => {
                // In production, you'd use Clipboard API here
                Alert.alert('OTP Code', otp);
              }
            },
            {
              text: 'Continue',
              onPress: () => {
                router.push({ pathname: '/verify_otp', params: { email: emailLowerCase } });
              }
            }
          ]
        );
      } else {
        Alert.alert('OTP Sent', 'We have sent a 6-digit code to your email. The code expires in 10 minutes.');
        router.push({ pathname: '/verify_otp', params: { email: emailLowerCase } });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
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
            <ThemedText style={styles.helloText}>Forgot</ThemedText>
            <ThemedText style={styles.signInText}>Password</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                placeholder="Enter your email"
                placeholderTextColor="#999"
              />
              <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
            </View>
          </View>

          <TouchableOpacity style={styles.signInButton} onPress={sendOtp} disabled={isLoading}>
            <LinearGradient colors={['#FF4444', '#4A0E4E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradient}>
              {isLoading ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.signInButtonText}>Send OTP</ThemedText>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.sponsorContainer}>
            <View style={styles.sponsorLogos}>
              <Image source={require('../assets/images/bayabas.png')} style={styles.sponsorLogo} />
            </View>
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity style={[styles.themeToggleButton, { bottom: insets.bottom + 20 }]} onPress={handleToggleTheme}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    height: height * 0.25,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  helloText: {
    color: 'white',
    fontSize: 38,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 45,
  },
  signInText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  inputIcon: {
    marginLeft: 10,
  },
  signInButton: {
    borderRadius: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signUpText: {
    fontSize: 14,
    color: '#999',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sponsorContainer: {
    marginTop: 30,
  },
  sponsorLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sponsorLogo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  footerDecor: {
    height: 120,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    marginTop: 30,
  },
  themeToggleButton: {
    position: 'absolute',
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
