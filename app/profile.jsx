import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

// Profile Section Component
function ProfileSection({ title, children }) {
  const textColor = useThemeColor({}, 'text');
  
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
        {title}
      </ThemedText>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

// Profile Item Component
function ProfileItem({ icon, label, value, valueColor }) {
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  
  return (
    <View style={styles.profileItem}>
      <View style={styles.profileItemLeft}>
        <Ionicons name={icon} size={20} color={iconColor} style={styles.profileItemIcon} />
        <ThemedText style={[styles.profileItemLabel, { color: iconColor }]}>
          {label}
        </ThemedText>
      </View>
      <ThemedText style={[
        styles.profileItemValue, 
        { color: valueColor || textColor }
      ]}>
        {value}
      </ThemedText>
    </View>
  );
}

// Profile Item Password Component
function ProfileItemPassword({ icon, label, value, showPassword, onToggle }) {
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  
  return (
    <View style={styles.profileItem}>
      <View style={styles.profileItemLeft}>
        <Ionicons name={icon} size={20} color={iconColor} style={styles.profileItemIcon} />
        <ThemedText style={[styles.profileItemLabel, { color: iconColor }]}>
          {label}
        </ThemedText>
      </View>
      <View style={styles.passwordContainer}>
        <ThemedText style={[styles.profileItemValue, { color: textColor }]}>
          {showPassword ? value : '••••••••'}
        </ThemedText>
        <TouchableOpacity onPress={onToggle} style={styles.eyeButton}>
          <Ionicons 
            name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
            size={18} 
            color={iconColor} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, setUserData } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState({});

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleEditProfile = () => {
    // Initialize edit data based on user type
    if (user.userType === 'student') {
      setEditData({
        first_name: user.first_name || '',
        middle_name: user.middle_name || '',
        last_name: user.last_name || '',
        suffix: user.suffix || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
        password: user.password || '',
        student_lrn: user.student_lrn || '',
        student_year: user.student_year || '',
      });
    } else if (user.userType === 'teacher') {
      setEditData({
        firstname: user.firstname || '',
        middlename: user.middlename || '',
        lastname: user.lastname || '',
        suffix: user.suffix || '',
        email: user.email || '',
        contact_number: user.contact_number || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        address: user.address || '',
        password: user.password || '',
        position: user.position || '',
      });
    } else if (user.userType === 'admin') {
      setEditData({
        firstname: user.firstname || '',
        middlename: user.middlename || '',
        lastname: user.lastname || '',
        email: user.email || '',
        password: user.password || '',
      });
    }
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditData({});
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);

      // Determine collection based on user type
      let collectionName = '';
      if (user.userType === 'student') {
        collectionName = 'students';
      } else if (user.userType === 'teacher') {
        collectionName = 'teachers';
      } else if (user.userType === 'admin') {
        collectionName = 'admin_accounts';
      }

      // Update Firestore
      const userRef = doc(db, collectionName, user.id);
      await updateDoc(userRef, editData);

      // Update local user context
      setUserData({
        ...user,
        ...editData
      });

      setIsLoading(false);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: handleCloseModal }
      ]);
    } catch (error) {
      setIsLoading(false);
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get user's full name based on user type
  const getFullName = () => {
    if (!user) return '';
    
    if (user.userType === 'student') {
      return `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim();
    } else if (user.userType === 'teacher' || user.userType === 'admin') {
      return `${user.firstname || ''} ${user.middlename || ''} ${user.lastname || ''}`.trim();
    }
    
    return 'User';
  };

  // Get user type label
  const getUserTypeLabel = () => {
    if (!user) return '';
    
    if (user.userType === 'student') return 'Student';
    if (user.userType === 'teacher') return 'Teacher';
    if (user.userType === 'admin') return 'Administrator';
    
    return user.userType || '';
  };

  // Get profile picture
  const getProfilePicture = () => {
    if (!user) return null;
    
    if (user.userType === 'student') {
      return user.profile_picture || null;
    } else if (user.userType === 'teacher') {
      return user.profilePicture || null;
    }
    
    return null;
  };

  // Render profile info sections based on user type
  const renderProfileSections = () => {
    if (!user) return null;

    if (user.userType === 'student') {
      return (
        <>
          <ProfileSection title="Personal Information">
            <ProfileItem icon="person-outline" label="Full Name" value={getFullName()} />
            <ProfileItem icon="mail-outline" label="Email" value={user.email || 'N/A'} />
            <ProfileItem icon="call-outline" label="Phone" value={user.phone_number || 'N/A'} />
            <ProfileItem icon="calendar-outline" label="Date of Birth" value={user.date_of_birth || 'N/A'} />
            <ProfileItem icon="person-outline" label="Gender" value={user.gender || 'N/A'} />
            <ProfileItem icon="location-outline" label="Address" value={user.address || 'N/A'} />
            <ProfileItemPassword 
              icon="lock-closed-outline" 
              label="Password" 
              value={user.password || 'N/A'}
              showPassword={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </ProfileSection>

          <ProfileSection title="Academic Information">
            <ProfileItem icon="school-outline" label="Student LRN" value={user.student_lrn || 'N/A'} />
            <ProfileItem icon="book-outline" label="Grade Level" value={user.student_year || 'N/A'} />
            <ProfileItem icon="calendar-outline" label="School Year" value={user.school_year_name || 'N/A'} />
            <ProfileItem 
              icon="checkmark-circle-outline" 
              label="Status" 
              value={user.status || 'N/A'}
              valueColor={
                user.status === 'approved' ? '#4CAF50' : 
                user.status === 'pending' ? '#FF9800' : '#F44336'
              }
            />
          </ProfileSection>
        </>
      );
    } else if (user.userType === 'teacher') {
      return (
        <>
          <ProfileSection title="Personal Information">
            <ProfileItem icon="person-outline" label="Full Name" value={getFullName()} />
            <ProfileItem icon="mail-outline" label="Email" value={user.email || 'N/A'} />
            <ProfileItem icon="call-outline" label="Contact" value={user.contact_number || 'N/A'} />
            <ProfileItem icon="calendar-outline" label="Date of Birth" value={user.date_of_birth || 'N/A'} />
            <ProfileItem icon="person-outline" label="Gender" value={user.gender || 'N/A'} />
            <ProfileItem icon="location-outline" label="Address" value={user.address || 'N/A'} />
            <ProfileItemPassword 
              icon="lock-closed-outline" 
              label="Password" 
              value={user.password || 'N/A'}
              showPassword={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </ProfileSection>

          <ProfileSection title="Professional Information">
            <ProfileItem icon="briefcase-outline" label="Position" value={user.position || 'N/A'} />
            <ProfileItem 
              icon="checkmark-circle-outline" 
              label="Status" 
              value={user.status || 'N/A'}
              valueColor={user.status === 'active' ? '#4CAF50' : '#F44336'}
            />
          </ProfileSection>
        </>
      );
    } else if (user.userType === 'admin') {
      return (
        <>
          <ProfileSection title="Administrator Information">
            <ProfileItem icon="person-outline" label="Full Name" value={getFullName()} />
            <ProfileItem icon="mail-outline" label="Email" value={user.email || 'N/A'} />
            <ProfileItemPassword 
              icon="lock-closed-outline" 
              label="Password" 
              value={user.password || 'N/A'}
              showPassword={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
            <ProfileItem icon="shield-checkmark-outline" label="Role" value="Administrator" />
            <ProfileItem 
              icon="checkmark-circle-outline" 
              label="Status" 
              value={user.status || 'N/A'}
              valueColor={user.status === 'active' ? '#4CAF50' : '#F44336'}
            />
          </ProfileSection>
        </>
      );
    }

    return null;
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.helloText}>My Profile</ThemedText>
            <ThemedText style={styles.signInText}>{getUserTypeLabel()}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Profile Content */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {getProfilePicture() ? (
                <Image 
                  source={{ uri: getProfilePicture() }} 
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: tintColor }]}>
                  <Ionicons name="person" size={60} color="white" />
                </View>
              )}
            </View>
            <ThemedText style={[styles.profileName, { color: textColor }]}>
              {getFullName()}
            </ThemedText>
            <View style={styles.userTypeBadge}>
              <ThemedText style={styles.userTypeText}>
                {getUserTypeLabel()}
              </ThemedText>
            </View>
          </View>

          {/* Profile Sections */}
          {renderProfileSections()}

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <LinearGradient
              colors={['#8B1538', '#4A0E4E']}
              style={styles.editButtonGradient}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Edit Profile
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={iconColor} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {user && user.userType === 'student' && (
                <>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>First Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.first_name}
                      onChangeText={(value) => handleInputChange('first_name', value)}
                      placeholder="Enter first name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.middle_name}
                      onChangeText={(value) => handleInputChange('middle_name', value)}
                      placeholder="Enter middle name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.last_name}
                      onChangeText={(value) => handleInputChange('last_name', value)}
                      placeholder="Enter last name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Email</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      placeholder="Enter email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Phone Number</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.phone_number}
                      onChangeText={(value) => handleInputChange('phone_number', value)}
                      placeholder="Enter phone number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Date of Birth</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.date_of_birth}
                      onChangeText={(value) => handleInputChange('date_of_birth', value)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.gender}
                      onChangeText={(value) => handleInputChange('gender', value)}
                      placeholder="Enter gender"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Address</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.address}
                      onChangeText={(value) => handleInputChange('address', value)}
                      placeholder="Enter address"
                      placeholderTextColor="#999"
                      multiline
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Password</ThemedText>
                    <View style={[styles.passwordInputWrapper, { borderColor: iconColor }]}>
                      <TextInput
                        style={[styles.passwordTextInput, { color: textColor }]}
                        value={editData.password}
                        onChangeText={(value) => handleInputChange('password', value)}
                        placeholder="Enter password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showEditPassword}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowEditPassword(!showEditPassword)}
                        style={styles.eyeIconButton}
                      >
                        <Ionicons 
                          name={showEditPassword ? 'eye-off-outline' : 'eye-outline'} 
                          size={20} 
                          color={iconColor} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Student LRN</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.student_lrn}
                      onChangeText={(value) => handleInputChange('student_lrn', value)}
                      placeholder="Enter student LRN"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Grade Level</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.student_year}
                      onChangeText={(value) => handleInputChange('student_year', value)}
                      placeholder="Enter grade level"
                      placeholderTextColor="#999"
                    />
                  </View>
                </>
              )}

              {user && user.userType === 'teacher' && (
                <>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>First Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.firstname}
                      onChangeText={(value) => handleInputChange('firstname', value)}
                      placeholder="Enter first name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.middlename}
                      onChangeText={(value) => handleInputChange('middlename', value)}
                      placeholder="Enter middle name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.lastname}
                      onChangeText={(value) => handleInputChange('lastname', value)}
                      placeholder="Enter last name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Email</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      placeholder="Enter email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Contact Number</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.contact_number}
                      onChangeText={(value) => handleInputChange('contact_number', value)}
                      placeholder="Enter contact number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Date of Birth</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.date_of_birth}
                      onChangeText={(value) => handleInputChange('date_of_birth', value)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.gender}
                      onChangeText={(value) => handleInputChange('gender', value)}
                      placeholder="Enter gender"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Address</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.address}
                      onChangeText={(value) => handleInputChange('address', value)}
                      placeholder="Enter address"
                      placeholderTextColor="#999"
                      multiline
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Password</ThemedText>
                    <View style={[styles.passwordInputWrapper, { borderColor: iconColor }]}>
                      <TextInput
                        style={[styles.passwordTextInput, { color: textColor }]}
                        value={editData.password}
                        onChangeText={(value) => handleInputChange('password', value)}
                        placeholder="Enter password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showEditPassword}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowEditPassword(!showEditPassword)}
                        style={styles.eyeIconButton}
                      >
                        <Ionicons 
                          name={showEditPassword ? 'eye-off-outline' : 'eye-outline'} 
                          size={20} 
                          color={iconColor} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Position</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.position}
                      onChangeText={(value) => handleInputChange('position', value)}
                      placeholder="Enter position"
                      placeholderTextColor="#999"
                    />
                  </View>
                </>
              )}

              {user && user.userType === 'admin' && (
                <>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>First Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.firstname}
                      onChangeText={(value) => handleInputChange('firstname', value)}
                      placeholder="Enter first name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.middlename}
                      onChangeText={(value) => handleInputChange('middlename', value)}
                      placeholder="Enter middle name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.lastname}
                      onChangeText={(value) => handleInputChange('lastname', value)}
                      placeholder="Enter last name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Email</ThemedText>
                    <TextInput
                      style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                      value={editData.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      placeholder="Enter email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.inputLabel}>Password</ThemedText>
                    <View style={[styles.passwordInputWrapper, { borderColor: iconColor }]}>
                      <TextInput
                        style={[styles.passwordTextInput, { color: textColor }]}
                        value={editData.password}
                        onChangeText={(value) => handleInputChange('password', value)}
                        placeholder="Enter password"
                        placeholderTextColor="#999"
                        secureTextEntry={!showEditPassword}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowEditPassword(!showEditPassword)}
                        style={styles.eyeIconButton}
                      >
                        <Ionicons 
                          name={showEditPassword ? 'eye-off-outline' : 'eye-outline'} 
                          size={20} 
                          color={iconColor} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: iconColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#8B1538', '#4A0E4E']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </ThemedText>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#8B1538',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#8B1538',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  userTypeBadge: {
    backgroundColor: '#8B1538',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userTypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionContent: {
    backgroundColor: 'rgba(139, 21, 56, 0.05)',
    borderRadius: 15,
    padding: 15,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemIcon: {
    marginRight: 10,
  },
  profileItemLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileItemValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  editButton: {
    marginTop: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    marginLeft: 8,
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    maxHeight: '65%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B1538',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    paddingRight: 10,
  },
  passwordTextInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  eyeIconButton: {
    padding: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonGradient: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

