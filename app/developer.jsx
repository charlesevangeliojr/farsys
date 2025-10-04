import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function DeveloperScreen() {
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

  const developers = [
    {
      name: 'Samantha Cabaño',
      role: 'Developer',
      color: '#E91E63',
      icon: 'person-circle-outline',
    },
    {
      name: 'Khlea Oquinto',
      role: 'Developer',
      color: '#9C27B0',
      icon: 'person-circle-outline',
    },
    {
      name: 'Trishea Delos Santos',
      role: 'Developer',
      color: '#2196F3',
      icon: 'person-circle-outline',
    },
    {
      name: 'April Cate V. Degal',
      role: 'Developer',
      color: '#4CAF50',
      icon: 'person-circle-outline',
    },
    {
      name: 'Steven Earl Miguel',
      role: 'Developer',
      color: '#FF9800',
      icon: 'person-circle-outline',
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
            <ThemedText style={styles.helloText}>Developers</ThemedText>
            <ThemedText style={styles.signInText}>Meet the Team</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Content Section */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Introduction */}
          <View style={styles.introSection}>
            <Ionicons name="code-slash-outline" size={60} color="#8B1538" />
            <ThemedText style={[styles.introTitle, { color: textColor }]}>
              Development Team
            </ThemedText>
            <ThemedText style={[styles.introText, { color: iconColor }]}>
              Meet the talented developers who brought this application to life
            </ThemedText>
          </View>

          {/* Developers List */}
          <View style={styles.developersSection}>
            {developers.map((dev, index) => (
              <View 
                key={index}
                style={[styles.developerCard, { 
                  backgroundColor: backgroundColor,
                  borderColor: isDark ? '#fff' : '#f0f0f0'
                }]}
              >
                <View style={[styles.developerIconContainer, { backgroundColor: dev.color }]}>
                  <Ionicons name={dev.icon} size={40} color="white" />
                </View>
                <View style={styles.developerInfo}>
                  <ThemedText style={[styles.developerName, { color: textColor }]}>
                    {dev.name}
                  </ThemedText>
                  <ThemedText style={[styles.developerRole, { color: iconColor }]}>
                    {dev.role}
                  </ThemedText>
                </View>
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={dev.color} />
                </View>
              </View>
            ))}
          </View>

          {/* Thank You Section */}
          <View style={[styles.thankYouSection, { 
            backgroundColor: 'rgba(139, 21, 56, 0.05)',
            borderColor: isDark ? '#fff' : '#8B1538'
          }]}>
            <Ionicons name="heart" size={40} color="#8B1538" />
            <ThemedText style={[styles.thankYouTitle, { color: textColor }]}>
              Thank You!
            </ThemedText>
            <ThemedText style={[styles.thankYouText, { color: iconColor }]}>
              We appreciate your interest in our application. This project was developed with dedication and passion to serve the educational community.
            </ThemedText>
          </View>

          {/* Tech Stack */}
          <View style={styles.techSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Built With
            </ThemedText>
            <View style={styles.techGrid}>
              <View style={[styles.techBadge, { backgroundColor: 'rgba(97, 218, 251, 0.1)' }]}>
                <Ionicons name="logo-react" size={20} color="#61DAFB" />
                <ThemedText style={[styles.techText, { color: textColor }]}>React Native</ThemedText>
              </View>
              <View style={[styles.techBadge, { backgroundColor: 'rgba(242, 153, 74, 0.1)' }]}>
                <Ionicons name="flame-outline" size={20} color="#F2994A" />
                <ThemedText style={[styles.techText, { color: textColor }]}>Firebase</ThemedText>
              </View>
              <View style={[styles.techBadge, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <Ionicons name="terminal-outline" size={20} color="#4CAF50" />
                <ThemedText style={[styles.techText, { color: textColor }]}>Expo</ThemedText>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <ThemedText style={[styles.footerText, { color: iconColor }]}>
              Developed with ❤️ for
            </ThemedText>
            <ThemedText style={[styles.schoolName, { color: textColor }]}>
              Bayabas National High School
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
  introSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  developersSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  developerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  developerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  developerRole: {
    fontSize: 14,
  },
  checkmarkContainer: {
    marginLeft: 10,
  },
  thankYouSection: {
    alignItems: 'center',
    padding: 25,
    borderRadius: 15,
    marginBottom: 30,
    borderWidth: 2,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  thankYouText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  techSection: {
    marginBottom: 30,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  techBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    gap: 8,
  },
  techText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
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

