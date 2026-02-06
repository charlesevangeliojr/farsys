import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function AboutScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const features = [
    {
      icon: 'person-add-outline',
      title: 'Student Registration',
      description: 'Students can register and create their accounts with complete profile information.',
      color: '#4CAF50',
    },
    {
      icon: 'school-outline',
      title: 'Teacher Management',
      description: 'Administrators can manage teacher accounts and their information.',
      color: '#2196F3',
    },
    {
      icon: 'calendar-outline',
      title: 'School Year Management',
      description: 'Organize and manage different school years for better academic tracking.',
      color: '#FF9800',
    },
    {
      icon: 'people-outline',
      title: 'Section Management',
      description: 'Create and manage class sections for organized student grouping.',
      color: '#9C27B0',
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Consultation Scheduling',
      description: 'Students can request consultations with teachers at their preferred time.',
      color: '#E91E63',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Consultation Approval',
      description: 'Teachers can review, approve, or decline consultation requests.',
      color: '#00BCD4',
    },
    {
      icon: 'notifications-outline',
      title: 'Real-time Notifications',
      description: 'Get instant notifications for important updates and approvals.',
      color: '#FF5722',
    },
    {
      icon: 'person-circle-outline',
      title: 'Profile Management',
      description: 'Users can view and edit their profile information anytime.',
      color: '#795548',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: backgroundColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#1a1a1a" : "#8B1538"} translucent={false} />
      
      {/* Gradient Header Section */}
      <LinearGradient
        colors={['#8B1538', '#4A0E4E']}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.helloText}>About</ThemedText>
            <ThemedText style={styles.signInText}>This App</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Content Section */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and App Name */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.appLogo}
            />
            <ThemedText style={[styles.appName, { color: textColor }]}>
              Bayabas Toril Schedule App
            </ThemedText>
            <ThemedText style={[styles.appTagline, { color: iconColor }]}>
              Simplifying Consultation Scheduling
            </ThemedText>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              What is this app?
            </ThemedText>
            <ThemedText style={[styles.descriptionText, { color: iconColor }]}>
              The Bayabas Toril Schedule App is a comprehensive consultation scheduling platform designed for educational institutions. 
              It connects students with teachers, making it easy to schedule, manage, and track consultation sessions.
            </ThemedText>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Key Features
            </ThemedText>
            
            {features.map((feature, index) => (
              <View 
                key={index} 
                style={[styles.featureCard, { 
                  backgroundColor: backgroundColor,
                  borderColor: isDark ? '#fff' : '#f0f0f0'
                }]}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color }]}>
                  <Ionicons name={feature.icon} size={24} color="white" />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText style={[styles.featureTitle, { color: textColor }]}>
                    {feature.title}
                  </ThemedText>
                  <ThemedText style={[styles.featureDescription, { color: iconColor }]}>
                    {feature.description}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* Developer Info */}
          <View style={styles.developerSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Developed For
            </ThemedText>
            <View style={[styles.developerCard, { 
              backgroundColor: 'rgba(139, 21, 56, 0.05)',
              borderColor: isDark ? '#fff' : '#8B1538'
            }]}>
              <Ionicons name="school-outline" size={40} color="#8B1538" />
              <ThemedText style={[styles.institutionName, { color: textColor }]}>
                Bayabas National High School
              </ThemedText>
              <ThemedText style={[styles.institutionLocation, { color: iconColor }]}>
                Toril District, Davao City
              </ThemedText>
            </View>
          </View>

          {/* Version Info */}
          <View style={styles.versionSection}>
            <View style={styles.versionDivider} />
            <View style={styles.versionInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#8B1538" />
              <ThemedText style={[styles.versionText, { color: iconColor }]}>
                Version 1.0
              </ThemedText>
            </View>
            <ThemedText style={[styles.copyrightText, { color: iconColor }]}>
              © 2025 Bayabas Toril Schedule App
            </ThemedText>
            <ThemedText style={[styles.rightsText, { color: iconColor }]}>
              All rights reserved
            </ThemedText>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appLogo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  descriptionSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'justify',
  },
  featuresSection: {
    marginBottom: 30,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  developerSection: {
    marginBottom: 30,
  },
  developerCard: {
    alignItems: 'center',
    padding: 25,
    borderRadius: 15,
    borderWidth: 2,
  },
  institutionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  institutionLocation: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  versionSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  versionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 20,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  copyrightText: {
    fontSize: 14,
    marginTop: 10,
  },
  rightsText: {
    fontSize: 12,
    marginTop: 5,
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

