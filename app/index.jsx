import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Safe area insets for responsive design
  const insets = useSafeAreaInsets();
  
  // Auth context
  const { user, setUserData } = useAuth();
  
  // Theme management
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Check if already logged in - redirect to dashboard (persistent login like Facebook)
  React.useEffect(() => {
    if (user && user.id) {
      console.log('User already logged in, redirecting to dashboard...');
      router.replace('/dashboard');
    }
  }, [user]);

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const emailLowerCase = email.trim().toLowerCase();

      // Check admin_accounts first (for all email formats)
      console.log('Checking admin_accounts with email:', emailLowerCase);
      const adminsRef = collection(db, 'admin_accounts');
      
      // Try to get all admin documents first to see what's available
      const allAdminsSnapshot = await getDocs(adminsRef);
      console.log('Total admin documents:', allAdminsSnapshot.docs.length);
      
      if (!allAdminsSnapshot.empty) {
        allAdminsSnapshot.docs.forEach((doc, index) => {
          console.log(`Admin ${index + 1}:`, doc.data());
        });
        
        // Find admin by email
        const adminDoc = allAdminsSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.email && data.email.toLowerCase().trim() === emailLowerCase;
        });
        
        if (adminDoc) {
          const adminData = adminDoc.data();
          
          console.log('Admin data found:', { 
            email: adminData.email, 
            hasPassword: !!adminData.password,
            status: adminData.status,
            firstname: adminData.firstname
          });
          console.log('Comparing passwords - DB:', adminData.password, 'Input:', password.trim());

          // Check if password matches (trim both sides to handle any extra spaces)
          if (adminData.password && adminData.password.trim() === password.trim()) {
            // Check if admin is active
            if (adminData.status === 'active') {
              // Save user data to context
              setUserData({
                id: adminDoc.id,
                ...adminData,
                userType: 'admin'
              });
              
              setIsLoading(false);
              Alert.alert('Success', 'Welcome Admin!', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to dashboard and clear login screen from history
                    router.replace('/dashboard');
                  }
                }
              ]);
              return;
            } else {
              setIsLoading(false);
              Alert.alert('Account Inactive', 'Your account is inactive. Please contact the system administrator.');
              return;
            }
          } else {
            setIsLoading(false);
            Alert.alert('Error', 'Incorrect password. Please try again.');
            return;
          }
        }
      }

      // Check in students collection
      const studentsRef = collection(db, 'students');
      const studentsQuery = query(studentsRef, where('email', '==', emailLowerCase));
      const studentsSnapshot = await getDocs(studentsQuery);

      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        const studentData = studentDoc.data();

        // Check if password matches
        if (studentData.password === password.trim()) {
          // Check if student is approved
          if (studentData.status === 'approved') {
            // Save user data to context
            setUserData({
              id: studentDoc.id,
              ...studentData,
              userType: 'student'
            });
            
            setIsLoading(false);
            Alert.alert('Success', 'Welcome back, ' + studentData.first_name + '!', [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to dashboard and clear login screen from history
                  router.replace('/dashboard');
                }
              }
            ]);
            return;
          } else if (studentData.status === 'pending') {
            setIsLoading(false);
            Alert.alert('Account Pending', 'Your account is still pending approval. Please wait for admin approval.');
            return;
          } else if (studentData.status === 'rejected') {
            setIsLoading(false);
            Alert.alert('Account Rejected', 'Your account has been rejected. Please contact the administrator.');
            return;
          }
        } else {
          setIsLoading(false);
          Alert.alert('Error', 'Incorrect password. Please try again.');
          return;
        }
      }

      // Check in teachers collection
      const teachersRef = collection(db, 'teachers');
      const teachersQuery = query(teachersRef, where('email', '==', emailLowerCase));
      const teachersSnapshot = await getDocs(teachersQuery);

      if (!teachersSnapshot.empty) {
        const teacherDoc = teachersSnapshot.docs[0];
        const teacherData = teacherDoc.data();

        // Check if password matches
        if (teacherData.password === password.trim()) {
          // Check if teacher is active
          if (teacherData.status === 'active') {
            // Save user data to context
            setUserData({
              id: teacherDoc.id,
              ...teacherData,
              userType: 'teacher'
            });
            
            setIsLoading(false);
            Alert.alert('Success', 'Welcome back, ' + teacherData.firstname + '!', [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to dashboard and clear login screen from history
                  router.replace('/dashboard');
                }
              }
            ]);
            return;
          } else {
            setIsLoading(false);
            Alert.alert('Account Inactive', 'Your account is inactive. Please contact the administrator.');
            return;
          }
        } else {
          setIsLoading(false);
          Alert.alert('Error', 'Incorrect password. Please try again.');
          return;
        }
      }

      // If no user found in any collection
      setIsLoading(false);
      Alert.alert('Error', 'No account found with this email address. Please sign up first.');
    } catch (error) {
      setIsLoading(false);
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgotpassword');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#1a1a1a" : "#8B1538"} translucent={false} />
      
      {/* Gradient Header Section */}
      <LinearGradient
        colors={['#8B1538', '#4A0E4E']}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.helloText}>Hello, {getGreeting()}</ThemedText>
            <ThemedText style={styles.signInText}>Sign in!</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* White Card Form Section */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Gmail Input */}
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
              />
              <Ionicons name="checkmark" size={20} color="#666" style={styles.inputIcon} />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
            disabled={isLoading}
          >
            <ThemedText style={styles.forgotPasswordText}>
              Forgot password?
            </ThemedText>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#FF4444', '#4A0E4E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <ThemedText style={styles.signInButtonText}>SIGN IN</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <ThemedText style={styles.signUpText}>Don't have account? </ThemedText>
            <TouchableOpacity onPress={handleRegister} disabled={isLoading}>
              <ThemedText style={styles.signUpLink}>Sign up</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Centered Logo */}
          <View style={styles.sponsorContainer}>
            <View style={styles.sponsorLogos}>
              <Image
                source={require('../assets/images/bayabas.png')}
                style={styles.sponsorLogo}
              />
            </View>
          </View>

        
        </ScrollView>
      </View>

      {/* Theme Toggle Button */}
      <TouchableOpacity
        style={[styles.themeToggleButton, { bottom: insets.bottom + 20 }]}
        onPress={handleToggleTheme}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={24}
          color="white"
        />
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
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
  passwordToggle: {
    padding: 4,
    marginLeft: 10,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 40,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#666',
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
