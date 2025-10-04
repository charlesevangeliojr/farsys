import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
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
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db, storage } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';
import notificationService from '../services/notificationService.js';

const { height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    address: '',
    age: '',
    dateOfBirth: '',
    gender: '',
    studentLrn: '',
    studentYear: '',
    sectionId: '',
    studentSchoolYearId: '',
    profilePicture: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1)); // Default to January 1, 2000
  const [selectedImage, setSelectedImage] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  
  // Safe area insets for responsive design
  const insets = useSafeAreaInsets();
  
  // Theme management
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  // Fetch sections and active school year from Firestore
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sections
        const sectionsRef = collection(db, 'sections');
        const sectionsSnapshot = await getDocs(sectionsRef);
        
        const sectionsList = [];
        sectionsSnapshot.forEach((doc) => {
          const sectionData = doc.data();
          // Only include active sections
          if (sectionData.status === 'active') {
            sectionsList.push({
              id: doc.id,
              ...sectionData
            });
          }
        });
        
        setSections(sectionsList);

        // Fetch active school year
        const schoolYearsRef = collection(db, 'school_years');
        const schoolYearsSnapshot = await getDocs(schoolYearsRef);
        
        let activeYear = null;
        schoolYearsSnapshot.forEach((doc) => {
          const schoolYearData = doc.data();
          if (schoolYearData.status === 'active') {
            activeYear = {
              id: doc.id,
              ...schoolYearData
            };
          }
        });
        
        if (activeYear) {
          setActiveSchoolYear(activeYear);
          // Auto-fill the school year ID
          setFormData(prev => ({
            ...prev,
            studentSchoolYearId: activeYear.year_name
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return '';
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDateString)) return '';
    
    const today = new Date();
    const birth = new Date(birthDateString);
    
    // Check if date is valid
    if (isNaN(birth.getTime())) return '';
    
    // Check if birth date is in the future
    if (birth > today) return '';
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // Ensure age is reasonable (between 0 and 120)
    if (age < 0 || age > 120) return '';
    
    return age.toString();
  };

  const handleDateOfBirthChange = (value) => {
    setFormData(prev => ({
      ...prev,
      dateOfBirth: value,
      age: calculateAge(value)
    }));
  };

  const showCalendar = () => {
    // If there's already a selected date, navigate to that year/month
    if (formData.dateOfBirth) {
      const existingDate = new Date(formData.dateOfBirth);
      setSelectedDate(existingDate);
    } else {
      // Set to a reasonable past date when opening calendar
      const reasonablePastDate = new Date();
      reasonablePastDate.setFullYear(reasonablePastDate.getFullYear() - 20); // 20 years ago
      setSelectedDate(reasonablePastDate);
    }
    setShowCalendarModal(true);
  };

  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const calculatedAge = calculateAge(formattedDate);
    
    setFormData(prev => ({
      ...prev,
      dateOfBirth: formattedDate,
      age: calculatedAge
    }));
    
    setShowCalendarModal(false);
  };

  const closeCalendar = () => {
    setShowCalendarModal(false);
  };

  const genderOptions = ['Male', 'Female'];

  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
    setShowGenderDropdown(false);
  };

  const toggleGenderDropdown = () => {
    setShowGenderDropdown(!showGenderDropdown);
  };

  const handleSectionSelect = (section) => {
    setFormData(prev => ({ 
      ...prev, 
      sectionId: section.id,
      studentYear: section.grade_level // Automatically set student year from grade level
    }));
    setShowSectionDropdown(false);
  };

  const toggleSectionDropdown = () => {
    setShowSectionDropdown(!showSectionDropdown);
  };

  const getSelectedSectionName = () => {
    const selected = sections.find(s => s.id === formData.sectionId);
    return selected ? selected.section_name : '';
  };

  const handleRegister = async () => {
    // Basic validation
    if (!formData.firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return;
    }
    
    if (!formData.lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    if (!formData.age.trim()) {
      Alert.alert('Error', 'Please enter your age');
      return;
    }

    if (!formData.dateOfBirth.trim()) {
      Alert.alert('Error', 'Please enter your date of birth');
      return;
    }

    if (!formData.gender.trim()) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    if (!formData.studentLrn.trim()) {
      Alert.alert('Error', 'Please enter your Student LRN');
      return;
    }

    if (!formData.sectionId.trim()) {
      Alert.alert('Error', 'Please select a section');
      return;
    }

    if (!formData.studentYear.trim()) {
      Alert.alert('Error', 'Student year not set. Please select a section first.');
      return;
    }

    if (!formData.studentSchoolYearId.trim()) {
      Alert.alert('Error', 'No active school year found. Please contact administrator.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Age validation
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age > 100) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }

    setIsLoading(true);
    
    try {
      // Upload profile picture if selected
      let profilePictureURL = '';
      if (selectedImage && selectedImage.uri) {
        try {
          profilePictureURL = await uploadImage(selectedImage.uri);
          console.log('Image uploaded successfully:', profilePictureURL);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert('Warning', 'Failed to upload profile picture. Student will be registered without photo.');
        }
      }

      // Prepare data for Firestore
      const studentData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        middle_name: formData.middleName.trim(),
        suffix: formData.suffix.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password, // Note: In production, this should be hashed
        phone_number: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        age: parseInt(formData.age),
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        student_lrn: formData.studentLrn.trim(),
        student_year: formData.studentYear.trim(),
        section_id: formData.sectionId,
        school_year_id: activeSchoolYear ? activeSchoolYear.id : '',
        school_year_name: formData.studentSchoolYearId,
        profile_picture: profilePictureURL,
        status: 'pending', // Automatically set to pending
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'students'), studentData);
      
      console.log('Student registered with ID: ', docRef.id);

      // Create notification for new registration
      const notificationData = {
        type: 'student_registration',
        title: 'New Student Registration',
        message: `${studentData.first_name} ${studentData.last_name} has registered and is pending approval.`,
        studentId: docRef.id,
        studentName: `${studentData.first_name} ${studentData.middle_name} ${studentData.last_name}`,
        studentLrn: studentData.student_lrn,
        studentEmail: studentData.email,
        studentProfilePicture: profilePictureURL || '',
        isRead: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Notification created successfully');
      
      // Trigger push notification
      await notificationService.notifyNewRegistration(
        `${studentData.first_name} ${studentData.last_name}`,
        studentData.student_lrn
      );
      console.log('Push notification sent');
      
      setIsLoading(false);
      Alert.alert('Success', 'Registration successful! Your account is pending approval.', [
        { 
          text: 'OK', 
          onPress: () => {
            // Clear form and navigate to login
            router.replace('/');
          }
        }
      ]);
    } catch (error) {
      setIsLoading(false);
      console.error('Error registering student: ', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  const handleLogin = () => {
    router.replace('/');
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      // Launch image picker with minimal configuration
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        setSelectedImage(asset);
        setFormData(prev => ({
          ...prev,
          profilePicture: asset.uri
        }));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (uri) => {
    try {
      // Fetch the image from the local URI
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a unique filename with timestamp
      const filename = `student_profiles/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const imageRef = storageRef(storage, filename);
      
      // Upload the blob to Firebase Storage
      await uploadBytes(imageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
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
            <ThemedText style={styles.helloText}>Create</ThemedText>
            <ThemedText style={styles.signInText}>Account!</ThemedText>
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
          {/* Name Inputs */}
          <View style={styles.nameRow}>
            <View style={[styles.nameInputContainer, { marginRight: 8 }]}>
              <ThemedText style={styles.inputLabel}>First Name</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                <TextInput
                  style={[styles.textInput, { color: textColor }]}
                  placeholder="First name"
                  placeholderTextColor={iconColor}
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>
            
            <View style={[styles.nameInputContainer, { marginLeft: 8 }]}>
              <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                <TextInput
                  style={[styles.textInput, { color: textColor }]}
                  placeholder="Last name"
                  placeholderTextColor={iconColor}
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Enter your email"
                placeholderTextColor={iconColor}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Enter your password"
                placeholderTextColor={iconColor}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
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

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Confirm your password"
                placeholderTextColor={iconColor}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Middle Name Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Middle name (optional)"
                placeholderTextColor={iconColor}
                value={formData.middleName}
                onChangeText={(value) => handleInputChange('middleName', value)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Suffix Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Suffix</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Jr., Sr., III, etc. (optional)"
                placeholderTextColor={iconColor}
                value={formData.suffix}
                onChangeText={(value) => handleInputChange('suffix', value)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Phone Number</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Enter your phone number"
                placeholderTextColor={iconColor}
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                keyboardType="phone-pad"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Address</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Enter your complete address"
                placeholderTextColor={iconColor}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Age and Date of Birth Row */}
          <View style={styles.nameRow}>
            <View style={[styles.nameInputContainer, { marginRight: 8 }]}>
              <ThemedText style={styles.inputLabel}>Age</ThemedText>
              <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                <TextInput
                  style={[styles.textInput, { color: textColor }]}
                  placeholder="Auto-calculated"
                  placeholderTextColor={iconColor}
                  value={formData.age}
                  editable={false}
                  pointerEvents="none"
                />
              </View>
            </View>
            
            <View style={[styles.nameInputContainer, { marginLeft: 8 }]}>
              <ThemedText style={styles.inputLabel}>Date of Birth</ThemedText>
              <TouchableOpacity 
                style={[styles.inputWrapper, { borderColor: iconColor }]}
                onPress={showCalendar}
                disabled={isLoading}
              >
                <TextInput
                  style={[styles.textInput, { color: textColor }]}
                  placeholder="Tap to select date"
                  placeholderTextColor={iconColor}
                  value={formData.dateOfBirth}
                  editable={false}
                  pointerEvents="none"
                />
                <Ionicons name="calendar-outline" size={20} color={iconColor} style={styles.inputIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gender Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Gender</ThemedText>
            <TouchableOpacity 
              style={[styles.inputWrapper, { borderColor: iconColor }]}
              onPress={toggleGenderDropdown}
              disabled={isLoading}
            >
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Select gender"
                placeholderTextColor={iconColor}
                value={formData.gender}
                editable={false}
                pointerEvents="none"
              />
              <Ionicons 
                name={showGenderDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={iconColor} 
                style={styles.inputIcon} 
              />
            </TouchableOpacity>
            
            {/* Gender Dropdown */}
            {showGenderDropdown && (
              <View style={[styles.dropdown, { backgroundColor: backgroundColor, borderColor: iconColor }]}>
                {genderOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: iconColor },
                      index === genderOptions.length - 1 && styles.dropdownItemLast
                    ]}
                    onPress={() => handleGenderSelect(option)}
                  >
                    <ThemedText style={[styles.dropdownText, { color: textColor }]}>
                      {option}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Student LRN Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Student LRN</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Enter your Student LRN"
                placeholderTextColor={iconColor}
                value={formData.studentLrn}
                onChangeText={(value) => handleInputChange('studentLrn', value)}
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Section Input */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Section</ThemedText>
            <TouchableOpacity 
              style={[styles.inputWrapper, { borderColor: iconColor }]}
              onPress={toggleSectionDropdown}
              disabled={isLoading}
            >
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Select section"
                placeholderTextColor={iconColor}
                value={getSelectedSectionName()}
                editable={false}
                pointerEvents="none"
              />
              <Ionicons 
                name={showSectionDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={iconColor} 
                style={styles.inputIcon} 
              />
            </TouchableOpacity>
            
            {/* Section Dropdown */}
            {showSectionDropdown && (
              <View style={[styles.dropdown, { backgroundColor: backgroundColor, borderColor: iconColor }]}>
                {sections.length > 0 ? (
                  sections.map((section, index) => (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: iconColor },
                        index === sections.length - 1 && styles.dropdownItemLast
                      ]}
                      onPress={() => handleSectionSelect(section)}
                    >
                      <View>
                        <ThemedText style={[styles.dropdownText, { color: textColor }]}>
                          {section.section_name}
                        </ThemedText>
                        <ThemedText style={[styles.dropdownSubText, { color: iconColor }]}>
                          {section.grade_level}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.dropdownItem}>
                    <ThemedText style={[styles.dropdownText, { color: iconColor }]}>
                      No sections available
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Student Year (Auto-filled from section) */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Student Year</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="Auto-filled from section"
                placeholderTextColor={iconColor}
                value={formData.studentYear}
                editable={false}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* School Year (Auto-filled from active school year) */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>School Year</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder={activeSchoolYear ? "Active school year" : "No active school year"}
                placeholderTextColor={iconColor}
                value={formData.studentSchoolYearId}
                editable={false}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Profile Picture Upload */}
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Profile Picture</ThemedText>
            <TouchableOpacity 
              style={[styles.imageUploadContainer, { borderColor: iconColor }]}
              onPress={pickImage}
              disabled={isLoading}
            >
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: selectedImage.uri }} 
                    style={styles.imagePreview}
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="camera" size={20} color="white" />
                    <ThemedText style={styles.imageOverlayText}>Change Photo</ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={iconColor} />
                  <ThemedText style={[styles.imagePlaceholderText, { color: iconColor }]}>
                    Tap to select photo
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleRegister}
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
                <ThemedText style={styles.signInButtonText}>CREATE ACCOUNT</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signUpContainer}>
            <ThemedText style={styles.signUpText}>Already have an account? </ThemedText>
            <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
              <ThemedText style={styles.signUpLink}>Sign In</ThemedText>
            </TouchableOpacity>
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

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCalendar}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            {/* Teal Header */}
            <View style={styles.tealHeader}>
              <ThemedText style={styles.yearText}>{selectedDate.getFullYear()}</ThemedText>
              <ThemedText style={styles.selectedDateText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </ThemedText>
            </View>
            
            {/* Calendar Container */}
            <View style={styles.calendarContainer}>
              
              {/* Android-style Calendar Grid */}
              <View style={styles.calendarGrid}>
                {/* Month/Year Selector - Android Style */}
                <View style={styles.androidMonthSelector}>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <ThemedText style={styles.androidMonthText}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    // Don't allow future months
                    const today = new Date();
                    if (newDate.getFullYear() < today.getFullYear() || 
                        (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() <= today.getMonth())) {
                      setSelectedDate(newDate);
                    }
                  }}>
                    <Ionicons name="chevron-forward" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
              
                {/* Days of Week - Android Style */}
                <View style={styles.androidDaysOfWeek}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <ThemedText key={index} style={styles.androidDayOfWeek}>{day}</ThemedText>
                  ))}
                </View>
              
              {/* Calendar Days */}
              <View style={styles.calendarDays}>
                {Array.from({ length: 42 }, (_, index) => {
                  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                  const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                  const firstDayOfWeek = firstDayOfMonth.getDay();
                  const daysInMonth = lastDayOfMonth.getDate();
                  
                  const dayNumber = index - firstDayOfWeek + 1;
                  
                  if (dayNumber < 1 || dayNumber > daysInMonth) {
                    return <View key={index} style={styles.androidCalendarDay} />;
                  }
                  
                  const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber);
                  const isPast = currentDate < new Date();
                  const isSelected = formData.dateOfBirth && 
                    new Date(formData.dateOfBirth).toDateString() === currentDate.toDateString();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.androidCalendarDay,
                        isSelected && styles.androidSelectedDay,
                        !isPast && styles.androidFutureDay
                      ]}
                      onPress={() => isPast && handleDateSelect(currentDate)}
                      disabled={!isPast}
                    >
                      <ThemedText style={{
                        fontSize: 16,
                        textAlign: 'center',
                        fontWeight: '400',
                        color: isPast ? 
                          (isSelected ? 'white' : '#333') : 
                          '#999'
                      }}>
                        {dayNumber}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            </View>
            
            {/* Android-style Footer Buttons */}
            <View style={styles.androidFooter}>
              <TouchableOpacity
                style={styles.androidCancelButton}
                onPress={closeCalendar}
              >
                <ThemedText style={styles.androidCancelText}>CANCEL</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.androidOkButton}
                onPress={() => handleDateSelect(selectedDate)}
              >
                <ThemedText style={styles.androidOkText}>OK</ThemedText>
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
  nameRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  nameInputContainer: {
    flex: 1,
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
  inputIcon: {
    marginLeft: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  passwordToggle: {
    padding: 4,
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModal: {
    width: '90%',
    height: '80%',
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  tealHeader: {
    backgroundColor: '#009688',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  yearText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  selectedDateText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '400',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  calendarGrid: {
    height: 280,
  },
  androidMonthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  androidMonthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  androidDaysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  androidDayOfWeek: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    width: '13%',
    color: '#999',
  },
  daysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  dayOfWeek: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '13%',
    color: '#666',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 240,
    backgroundColor: 'white',
  },
  androidCalendarDay: {
    width: '13%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  androidSelectedDay: {
    backgroundColor: '#009688',
  },
  androidFutureDay: {
    opacity: 0.3,
  },
  androidDayText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  androidFutureDayText: {
    color: '#999',
  },
  todayDay: {
    backgroundColor: '#8B1538',
    borderColor: '#8B1538',
  },
  selectedDay: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  futureDay: {
    backgroundColor: '#f1f3f4',
    borderColor: '#e0e0e0',
    opacity: 0.6,
  },
  dayText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  futureDayText: {
    color: '#999',
  },
  androidFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
  },
  androidCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 20,
  },
  androidCancelText: {
    color: '#009688',
    fontSize: 16,
    fontWeight: '500',
  },
  androidOkButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  androidOkText: {
    color: '#009688',
    fontSize: 16,
    fontWeight: '500',
  },
  imageUploadContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
