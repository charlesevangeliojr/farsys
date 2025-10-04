import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db, serverTimestamp, storage } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function TeacherAccountScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  // Modal and form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAssignSectionModal, setShowAssignSectionModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(1990, 0, 1));
  const [selectedImage, setSelectedImage] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [teacherSections, setTeacherSections] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [teacherData, setTeacherData] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
    suffix: '',
    gender: '',
    date_of_birth: '',
    age: '',
    address: '',
    email: '',
    contact_number: '',
    position: '',
    password: '',
    profilePicture: '',
    status: 'active',
  });

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Calculate age from date of birth
  const calculateAge = (birthDateString) => {
    if (!birthDateString) return '';
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDateString)) return '';
    
    const today = new Date();
    const birth = new Date(birthDateString);
    
    if (isNaN(birth.getTime())) return '';
    if (birth > today) return '';
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age < 0 || age > 120) return '';
    
    return age.toString();
  };

  // Show calendar modal
  const showCalendar = () => {
    console.log('Opening calendar modal...');
    if (teacherData.date_of_birth) {
      const existingDate = new Date(teacherData.date_of_birth);
      setSelectedDate(existingDate);
    } else {
      const reasonablePastDate = new Date();
      reasonablePastDate.setFullYear(reasonablePastDate.getFullYear() - 30);
      setSelectedDate(reasonablePastDate);
    }
    setShowCalendarModal(true);
    console.log('Calendar modal state set to true');
  };

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    const calculatedAge = calculateAge(formattedDate);
    
    setTeacherData(prev => ({
      ...prev,
      date_of_birth: formattedDate,
      age: calculatedAge
    }));
    
    setShowCalendarModal(false);
  };

  // Close calendar modal
  const closeCalendar = () => {
    setShowCalendarModal(false);
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        setSelectedImage(asset);
        setTeacherData(prev => ({
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
      const filename = `teacher_profiles/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
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

  // Fetch teachers from Firestore
  const fetchTeachers = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch teachers...');
      
      const teachersRef = collection(db, 'teachers');
      const querySnapshot = await getDocs(teachersRef);
      
      const teachersList = [];
      querySnapshot.forEach((doc) => {
        teachersList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Teachers list:', teachersList);
      setTeachers(teachersList);
      
      // Fetch teacher-section assignments
      await fetchTeacherSections();
    } catch (error) {
      console.error('Error fetching teachers:', error);
      Alert.alert('Error', `Failed to load teachers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch teacher sections mapping
  const fetchTeacherSections = async () => {
    try {
      const teacherSectionsRef = collection(db, 'teacher_sections');
      const querySnapshot = await getDocs(teacherSectionsRef);
      
      const sectionsRef = collection(db, 'sections');
      const sectionsSnapshot = await getDocs(sectionsRef);
      
      // Create sections map for quick lookup
      const sectionsMap = {};
      sectionsSnapshot.forEach((doc) => {
        sectionsMap[doc.id] = doc.data();
      });
      
      // Group sections by teacher_id
      const teacherSectionsMap = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const teacherId = data.teacher_id;
        const sectionId = data.section_id;
        
        if (!teacherSectionsMap[teacherId]) {
          teacherSectionsMap[teacherId] = [];
        }
        
        // Add section info if it exists
        if (sectionsMap[sectionId]) {
          teacherSectionsMap[teacherId].push({
            id: sectionId,
            ...sectionsMap[sectionId]
          });
        }
      });
      
      console.log('Teacher sections mapping:', teacherSectionsMap);
      setTeacherSections(teacherSectionsMap);
    } catch (error) {
      console.error('Error fetching teacher sections:', error);
    }
  };

  // Fetch sections from Firestore
  const fetchSections = async () => {
    try {
      const sectionsRef = collection(db, 'sections');
      const querySnapshot = await getDocs(sectionsRef);
      
      const sectionsList = [];
      querySnapshot.forEach((doc) => {
        sectionsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setSections(sectionsList);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Load teachers and sections when component mounts
  React.useEffect(() => {
    fetchTeachers();
    fetchSections();
  }, []);

  const handleAddTeacher = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedImage(null);
    setTeacherData({
      firstname: '',
      middlename: '',
      lastname: '',
      suffix: '',
      gender: '',
      date_of_birth: '',
      age: '',
      address: '',
      email: '',
      contact_number: '',
      position: '',
      password: '',
      profilePicture: '',
      status: 'active',
    });
  };

  const handleSaveTeacher = async () => {
    // Validate form
    if (!teacherData.firstname.trim()) {
      Alert.alert('Error', 'Please enter first name');
      return;
    }
    if (!teacherData.lastname.trim()) {
      Alert.alert('Error', 'Please enter last name');
      return;
    }
    if (!teacherData.gender.trim()) {
      Alert.alert('Error', 'Please select gender');
      return;
    }
    if (!teacherData.date_of_birth.trim()) {
      Alert.alert('Error', 'Please enter date of birth');
      return;
    }
    if (!teacherData.age.trim()) {
      Alert.alert('Error', 'Please enter age');
      return;
    }
    if (!teacherData.email.trim()) {
      Alert.alert('Error', 'Please enter email');
      return;
    }
    if (!teacherData.contact_number.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return;
    }
    if (!teacherData.position.trim()) {
      Alert.alert('Error', 'Please enter position');
      return;
    }
    if (!teacherData.password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    try {
      setIsLoading(true);
      
      // Upload profile picture if selected
      let profilePictureURL = '';
      if (selectedImage && selectedImage.uri) {
        try {
          profilePictureURL = await uploadImage(selectedImage.uri);
          console.log('Image uploaded successfully:', profilePictureURL);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert('Warning', 'Failed to upload profile picture. Teacher will be added without photo.');
        }
      }
      
      // Prepare data for Firestore
      const teacherDataToSave = {
        firstname: teacherData.firstname.trim(),
        middlename: teacherData.middlename.trim(),
        lastname: teacherData.lastname.trim(),
        suffix: teacherData.suffix.trim(),
        gender: teacherData.gender.trim(),
        date_of_birth: teacherData.date_of_birth.trim(),
        age: parseInt(teacherData.age.trim()),
        address: teacherData.address.trim(),
        email: teacherData.email.trim(),
        contact_number: teacherData.contact_number.trim(),
        position: teacherData.position.trim(),
        password: teacherData.password.trim(), // Note: In production, hash this password
        profilePicture: profilePictureURL,
        status: teacherData.status,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'teachers'), teacherDataToSave);
      
      console.log('Teacher added with ID: ', docRef.id);
      
      setIsLoading(false);
      Alert.alert('Success', 'Teacher added successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseModal();
          fetchTeachers();
        }}
      ]);
    } catch (error) {
      setIsLoading(false);
      console.error('Error adding teacher: ', error);
      Alert.alert('Error', 'Failed to add teacher. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setTeacherData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateTeacher = (teacher) => {
    console.log('Update teacher:', teacher);
    setEditingTeacher(teacher);
    
    // Set image if exists
    if (teacher.profilePicture) {
      setSelectedImage({ uri: teacher.profilePicture });
    }
    
    setTeacherData({
      firstname: teacher.firstname,
      middlename: teacher.middlename || '',
      lastname: teacher.lastname,
      suffix: teacher.suffix || '',
      gender: teacher.gender,
      date_of_birth: teacher.date_of_birth,
      age: teacher.age.toString(),
      address: teacher.address || '',
      email: teacher.email,
      contact_number: teacher.contact_number,
      position: teacher.position,
      password: teacher.password,
      profilePicture: teacher.profilePicture || '',
      status: teacher.status,
    });
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setEditingTeacher(null);
    setSelectedImage(null);
    setTeacherData({
      firstname: '',
      middlename: '',
      lastname: '',
      suffix: '',
      gender: '',
      date_of_birth: '',
      age: '',
      address: '',
      email: '',
      contact_number: '',
      position: '',
      password: '',
      profilePicture: '',
      status: 'active',
    });
  };

  const handleUpdateTeacherSave = async () => {
    // Validate form
    if (!teacherData.firstname.trim()) {
      Alert.alert('Error', 'Please enter first name');
      return;
    }
    if (!teacherData.lastname.trim()) {
      Alert.alert('Error', 'Please enter last name');
      return;
    }
    if (!teacherData.gender.trim()) {
      Alert.alert('Error', 'Please select gender');
      return;
    }
    if (!teacherData.email.trim()) {
      Alert.alert('Error', 'Please enter email');
      return;
    }

    try {
      setIsLoading(true);
      
      // Upload new profile picture if selected
      let profilePictureURL = teacherData.profilePicture || '';
      
      // Check if a new image was selected (local URI vs Firebase URL)
      if (selectedImage && selectedImage.uri && !selectedImage.uri.startsWith('http')) {
        try {
          profilePictureURL = await uploadImage(selectedImage.uri);
          console.log('New image uploaded successfully:', profilePictureURL);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert('Warning', 'Failed to upload new profile picture. Using existing photo.');
        }
      }
      
      // Prepare data for Firestore update
      const teacherDataToUpdate = {
        firstname: teacherData.firstname.trim(),
        middlename: teacherData.middlename.trim(),
        lastname: teacherData.lastname.trim(),
        suffix: teacherData.suffix.trim(),
        gender: teacherData.gender.trim(),
        date_of_birth: teacherData.date_of_birth.trim(),
        age: parseInt(teacherData.age.trim()),
        address: teacherData.address.trim(),
        email: teacherData.email.trim(),
        contact_number: teacherData.contact_number.trim(),
        position: teacherData.position.trim(),
        password: teacherData.password.trim(),
        profilePicture: profilePictureURL,
        status: teacherData.status,
        updated_at: serverTimestamp(),
      };

      // Update document in Firestore
      const teacherRef = doc(db, 'teachers', editingTeacher.id);
      await updateDoc(teacherRef, teacherDataToUpdate);
      
      console.log('Teacher updated successfully');
      
      setIsLoading(false);
      Alert.alert('Success', 'Teacher updated successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseUpdateModal();
          fetchTeachers();
        }}
      ]);
    } catch (error) {
      setIsLoading(false);
      console.error('Error updating teacher: ', error);
      Alert.alert('Error', 'Failed to update teacher. Please try again.');
    }
  };

  // Assign section to teacher
  const handleAssignSection = (teacher) => {
    setSelectedTeacher(teacher);
    setSelectedSections([]);
    setShowAssignSectionModal(true);
  };

  const handleCloseAssignSectionModal = () => {
    setShowAssignSectionModal(false);
    setSelectedTeacher(null);
    setSelectedSections([]);
  };

  const handleToggleSection = (sectionId) => {
    setSelectedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleSaveTeacherSections = async () => {
    if (selectedSections.length === 0) {
      Alert.alert('Error', 'Please select at least one section');
      return;
    }

    try {
      // Save each teacher-section relationship
      for (const sectionId of selectedSections) {
        await addDoc(collection(db, 'teacher_sections'), {
          teacher_id: selectedTeacher.id,
          section_id: sectionId,
          created_at: serverTimestamp(),
        });
      }
      
      // Refresh teacher sections
      await fetchTeacherSections();
      
      Alert.alert('Success', 'Sections assigned successfully!', [
        { text: 'OK', onPress: handleCloseAssignSectionModal }
      ]);
    } catch (error) {
      console.error('Error assigning sections: ', error);
      Alert.alert('Error', 'Failed to assign sections. Please try again.');
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.helloText}>Teacher</ThemedText>
            <ThemedText style={styles.signInText}>Account</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* White Card Form Section */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            <ThemedText style={[styles.contentTitle, { color: textColor }]}>
              Teacher Account Management
            </ThemedText>
            <ThemedText style={[styles.contentSubtitle, { color: iconColor }]}>
              Manage teacher accounts and assignments
            </ThemedText>
            
            {/* Add Teacher Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddTeacher}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={24} color="white" />
                <ThemedText style={styles.addButtonText}>Add Teacher</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Teachers List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                  Loading teachers...
                </ThemedText>
              </View>
            ) : teachers.length > 0 ? (
              <View style={styles.teachersList}>
                {teachers.map((teacher) => (
                  <View key={teacher.id} style={[styles.teacherCard, { backgroundColor: backgroundColor }]}>
                    <View style={styles.teacherHeader}>
                      <View style={styles.teacherIconContainer}>
                        {teacher.profilePicture ? (
                          <Image 
                            source={{ uri: teacher.profilePicture }} 
                            style={styles.teacherProfileImage}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color="white" />
                        )}
                      </View>
                      <View style={styles.teacherInfo}>
                        <ThemedText style={[styles.teacherName, { color: textColor }]}>
                          {teacher.firstname} {teacher.middlename} {teacher.lastname} {teacher.suffix}
                        </ThemedText>
                        <ThemedText style={[styles.teacherPosition, { color: iconColor }]}>
                          {teacher.position}
                        </ThemedText>
                      </View>
                      <View style={styles.teacherStatus}>
                        <ThemedText style={[styles.statusText, { color: teacher.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                          {teacher.status}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.teacherDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="mail" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {teacher.email}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="call" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {teacher.contact_number}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="transgender" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {teacher.gender} • Age {teacher.age}
                        </ThemedText>
                      </View>
                      {teacherSections[teacher.id] && teacherSections[teacher.id].length > 0 && (
                        <View style={styles.assignedSectionsRow}>
                          <View style={styles.sectionLabelRow}>
                            <Ionicons name="school" size={16} color="#666" />
                            <ThemedText style={[styles.sectionLabel, { color: iconColor }]}>
                              Assigned Sections:
                            </ThemedText>
                          </View>
                          <View style={styles.sectionsContainer}>
                            {teacherSections[teacher.id].map((section, index) => (
                              <View key={section.id} style={styles.sectionTag}>
                                <ThemedText style={styles.sectionTagText}>
                                  {section.section_name}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.updateButton}
                        onPress={() => handleUpdateTeacher(teacher)}
                      >
                        <Ionicons name="create-outline" size={16} color="#2196F3" />
                        <ThemedText style={styles.updateButtonText}>Update</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.assignButton}
                        onPress={() => handleAssignSection(teacher)}
                      >
                        <Ionicons name="link-outline" size={16} color="#FF9800" />
                        <ThemedText style={styles.assignButtonText}>Assign Section</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="people-outline" size={64} color="#666" />
                <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                  No teachers added yet. Click "Add Teacher" to get started!
                </ThemedText>
              </View>
            )}
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

      {/* Add Teacher Modal */}
      <Modal
        visible={showAddModal && !showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Add New Teacher
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>First Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.firstname}
                    onChangeText={(value) => handleInputChange('firstname', value)}
                    placeholder="Enter first name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Middle Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.middlename}
                    onChangeText={(value) => handleInputChange('middlename', value)}
                    placeholder="Enter middle name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.lastname}
                    onChangeText={(value) => handleInputChange('lastname', value)}
                    placeholder="Enter last name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Suffix */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Suffix (Optional)</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.suffix}
                    onChangeText={(value) => handleInputChange('suffix', value)}
                    placeholder="e.g., Jr., Sr., III"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Gender */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      { backgroundColor: teacherData.gender === 'Male' ? '#2196F3' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('gender', 'Male')}
                  >
                    <ThemedText style={[
                      styles.genderOptionText,
                      { color: teacherData.gender === 'Male' ? 'white' : '#666' }
                    ]}>
                      Male
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      { backgroundColor: teacherData.gender === 'Female' ? '#E91E63' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('gender', 'Female')}
                  >
                    <ThemedText style={[
                      styles.genderOptionText,
                      { color: teacherData.gender === 'Female' ? 'white' : '#666' }
                    ]}>
                      Female
                    </ThemedText>
                  </TouchableOpacity>
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
                      value={teacherData.age}
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
                    activeOpacity={0.7}
                  >
                    <TextInput
                      style={[styles.textInput, { color: textColor }]}
                      placeholder="Tap to select date"
                      placeholderTextColor={iconColor}
                      value={teacherData.date_of_birth}
                      editable={false}
                      pointerEvents="none"
                    />
                    <Ionicons name="calendar-outline" size={20} color={iconColor} style={styles.inputIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Address</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    placeholder="Enter complete address"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Email</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="Enter email address"
                    placeholderTextColor={iconColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Contact Number</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.contact_number}
                    onChangeText={(value) => handleInputChange('contact_number', value)}
                    placeholder="Enter contact number"
                    placeholderTextColor={iconColor}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Position */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Position</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.position}
                    onChangeText={(value) => handleInputChange('position', value)}
                    placeholder="e.g., Mathematics Teacher"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Enter password"
                    placeholderTextColor={iconColor}
                    secureTextEntry={true}
                  />
                </View>
              </View>

              {/* Profile Picture Upload */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Profile Picture</ThemedText>
                <TouchableOpacity 
                  style={[styles.imageUploadContainer, { borderColor: iconColor }]}
                  onPress={pickImage}
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
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveTeacher}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Save Teacher</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Teacher Modal */}
      <Modal
        visible={showUpdateModal && !showCalendarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseUpdateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Update Teacher
              </ThemedText>
              <TouchableOpacity onPress={handleCloseUpdateModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>First Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.firstname}
                    onChangeText={(value) => handleInputChange('firstname', value)}
                    placeholder="Enter first name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Middle Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Middle Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.middlename}
                    onChangeText={(value) => handleInputChange('middlename', value)}
                    placeholder="Enter middle name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Last Name</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.lastname}
                    onChangeText={(value) => handleInputChange('lastname', value)}
                    placeholder="Enter last name"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Suffix */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Suffix (Optional)</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.suffix}
                    onChangeText={(value) => handleInputChange('suffix', value)}
                    placeholder="e.g., Jr., Sr., III"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Gender */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Gender</ThemedText>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      { backgroundColor: teacherData.gender === 'Male' ? '#2196F3' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('gender', 'Male')}
                  >
                    <ThemedText style={[
                      styles.genderOptionText,
                      { color: teacherData.gender === 'Male' ? 'white' : '#666' }
                    ]}>
                      Male
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      { backgroundColor: teacherData.gender === 'Female' ? '#E91E63' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('gender', 'Female')}
                  >
                    <ThemedText style={[
                      styles.genderOptionText,
                      { color: teacherData.gender === 'Female' ? 'white' : '#666' }
                    ]}>
                      Female
                    </ThemedText>
                  </TouchableOpacity>
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
                      value={teacherData.age}
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
                    activeOpacity={0.7}
                  >
                    <TextInput
                      style={[styles.textInput, { color: textColor }]}
                      placeholder="Tap to select date"
                      placeholderTextColor={iconColor}
                      value={teacherData.date_of_birth}
                      editable={false}
                      pointerEvents="none"
                    />
                    <Ionicons name="calendar-outline" size={20} color={iconColor} style={styles.inputIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Address</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.address}
                    onChangeText={(value) => handleInputChange('address', value)}
                    placeholder="Enter complete address"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Email</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder="Enter email address"
                    placeholderTextColor={iconColor}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Contact Number</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.contact_number}
                    onChangeText={(value) => handleInputChange('contact_number', value)}
                    placeholder="Enter contact number"
                    placeholderTextColor={iconColor}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Position */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Position</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.position}
                    onChangeText={(value) => handleInputChange('position', value)}
                    placeholder="e.g., Mathematics Teacher"
                    placeholderTextColor={iconColor}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={teacherData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Enter password"
                    placeholderTextColor={iconColor}
                    secureTextEntry={true}
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Status</ThemedText>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: teacherData.status === 'active' ? '#4CAF50' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'active')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: teacherData.status === 'active' ? 'white' : '#666' }
                    ]}>
                      Active
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: teacherData.status === 'inactive' ? '#FF9800' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'inactive')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: teacherData.status === 'inactive' ? 'white' : '#666' }
                    ]}>
                      Inactive
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Profile Picture Upload */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Profile Picture</ThemedText>
                <TouchableOpacity 
                  style={[styles.imageUploadContainer, { borderColor: iconColor }]}
                  onPress={pickImage}
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
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseUpdateModal}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateTeacherSave}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Update Teacher</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Section Modal */}
      <Modal
        visible={showAssignSectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseAssignSectionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Assign Sections
              </ThemedText>
              <TouchableOpacity onPress={handleCloseAssignSectionModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <ThemedText style={[styles.modalSubtitle, { color: iconColor }]}>
                Select sections to assign to {selectedTeacher?.firstname} {selectedTeacher?.lastname}
              </ThemedText>
              
              {sections.length > 0 ? (
                sections.map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    style={[
                      styles.sectionCheckbox,
                      { backgroundColor: selectedSections.includes(section.id) ? '#E3F2FD' : '#f9f9f9' }
                    ]}
                    onPress={() => handleToggleSection(section.id)}
                  >
                    <View style={styles.checkboxContainer}>
                      <View style={[
                        styles.checkbox,
                        { backgroundColor: selectedSections.includes(section.id) ? '#2196F3' : 'white' }
                      ]}>
                        {selectedSections.includes(section.id) && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <View style={styles.sectionCheckboxInfo}>
                        <ThemedText style={[styles.sectionCheckboxName, { color: textColor }]}>
                          {section.section_name}
                        </ThemedText>
                        <ThemedText style={[styles.sectionCheckboxGrade, { color: iconColor }]}>
                          {section.grade_level} • Adviser: {section.adviser}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <ThemedText style={[styles.noSectionsText, { color: iconColor }]}>
                  No sections available
                </ThemedText>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseAssignSectionModal}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveTeacherSections}
              >
                <LinearGradient
                  colors={['#FF9800', '#F57C00']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Assign Sections</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal && (showAddModal || showUpdateModal)}
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
                  const isSelected = teacherData.date_of_birth && 
                    new Date(teacherData.date_of_birth).toDateString() === currentDate.toDateString();
                  
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
  contentContainer: {
    alignItems: 'center',
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  contentSubtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 22,
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
  // Add Teacher Button Styles
  addButton: {
    marginBottom: 30,
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
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
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
  },
  inputContainer: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  nameInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
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
    color: '#666',
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
  // Teachers List Styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  teachersList: {
    width: '100%',
  },
  teacherCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  teacherIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  teacherProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teacherPosition: {
    fontSize: 14,
    color: '#666',
  },
  teacherStatus: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  teacherDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  assignedSectionsRow: {
    marginBottom: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 24,
    gap: 6,
  },
  sectionTag: {
    backgroundColor: '#8B1538',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  sectionTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 4,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assignButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  // Status Selection Styles
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Gender Selection Styles
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Section Assignment Styles
  sectionCheckbox: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionCheckboxInfo: {
    flex: 1,
  },
  sectionCheckboxName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionCheckboxGrade: {
    fontSize: 12,
    color: '#666',
  },
  noSectionsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Calendar Modal Styles
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
  calendarContainer: {
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
  androidFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 290,
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
  // Image Upload Styles
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
