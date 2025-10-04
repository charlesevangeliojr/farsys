import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db, serverTimestamp } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';
import notificationService from '../services/notificationService.js';

const { height } = Dimensions.get('window');

export default function MakeConsultationScreen() {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  // Modal and form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notifiedConsultations, setNotifiedConsultations] = useState(new Set());
  const [consultationData, setConsultationData] = useState({
    purpose: '',
    date: '',
    time: '',
    teacher_id: '',
    teacher_name: '',
    status: 'pending', // Default status: pending, approved, completed, cancelled
  });

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Fetch schedules from Firestore
  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch schedules...');
      
      const schedulesRef = collection(db, 'schedules');
      const querySnapshot = await getDocs(schedulesRef);
      
      const schedulesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only show schedules for the current logged-in student (exclusive to this user)
        if (user && data.student_id === user.id) {
          schedulesList.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log('Schedules list:', schedulesList);
      setConsultations(schedulesList);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      Alert.alert('Error', `Failed to load schedules: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch teachers from Firestore
  const fetchTeachers = async () => {
    try {
      console.log('Starting to fetch teachers...');
      
      const teachersRef = collection(db, 'teachers');
      const querySnapshot = await getDocs(teachersRef);
      
      const teachersList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'active') { // Only get active teachers
          teachersList.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log('Teachers list:', teachersList);
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      Alert.alert('Error', `Failed to load teachers: ${error.message}`);
    }
  };

  // Check consultations and send notifications
  const checkConsultationNotifications = async () => {
    if (!user || !consultations.length) return;

    for (const consultation of consultations) {
      const notificationKey = `${consultation.id}_${consultation.status}`;
      
      // Skip if already notified for this status
      if (notifiedConsultations.has(notificationKey)) continue;

      // Notify student about pending consultations
      if (consultation.status === 'pending') {
        await notificationService.notifyPendingConsultation(
          consultation.teacher_name,
          consultation.purpose,
          consultation.consultation_date
        );
        
        // Create Firestore notification for teacher
        await addDoc(collection(db, 'notifications'), {
          type: 'consultation_request',
          title: 'New Consultation Request',
          message: `${consultation.student_name} requested a consultation: ${consultation.purpose}`,
          teacher_id: consultation.teacher_id,
          student_id: consultation.student_id,
          consultation_id: consultation.id,
          consultation_date: consultation.consultation_date,
          consultation_time: consultation.consultation_time,
          isRead: false,
          createdAt: serverTimestamp(),
        });
        
        setNotifiedConsultations(prev => new Set([...prev, notificationKey]));
      }
      
      // Notify student about approved consultations
      if (consultation.status === 'approved') {
        await notificationService.notifyApprovedConsultation(
          consultation.teacher_name,
          consultation.purpose,
          consultation.consultation_date,
          consultation.consultation_time
        );
        
        setNotifiedConsultations(prev => new Set([...prev, notificationKey]));
      }
    }
  };

  // Load consultations and teachers when component mounts
  React.useEffect(() => {
    fetchConsultations();
    fetchTeachers();
    
    // Request notification permissions
    notificationService.requestPermissions();
  }, []);

  // Check for notifications every 1 minute
  React.useEffect(() => {
    if (!user) return;

    // Initial check
    checkConsultationNotifications();

    // Set interval for periodic checks (every 1 minute)
    const interval = setInterval(() => {
      checkConsultationNotifications();
    }, 60000); // 60000ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [consultations, user]);

  // Check for notifications every 1 minute
  React.useEffect(() => {
    if (!user) return;

    // Initial check
    checkConsultationNotifications();

    // Set interval for periodic checks (every 1 minute)
    const interval = setInterval(() => {
      checkConsultationNotifications();
    }, 60000); // 60000ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [consultations, user]);

  const handleAddConsultation = () => {
    setShowAddModal(true);
  };

  const showDateTimePicker = () => {
    // Set to current date if no date selected, or use selected date
    if (consultationData.date) {
      const existingDate = new Date(consultationData.date);
      setSelectedDate(existingDate);
    } else {
      setSelectedDate(new Date()); // Default to today
    }
    setShowDateTimeModal(true);
  };

  const closeDateTimePicker = () => {
    setShowDateTimeModal(false);
  };

  const handleDateSelect = (date) => {
    // Format date properly without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    setConsultationData(prev => ({
      ...prev,
      date: formattedDate
    }));
    setShowDateTimeModal(false);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setConsultationData({
      purpose: '',
      date: '',
      time: '',
      teacher_id: '',
      teacher_name: '',
      status: 'pending',
    });
  };

  const handleSaveConsultation = async () => {
    // Validate form
    if (!consultationData.purpose.trim()) {
      Alert.alert('Error', 'Please enter purpose of consultation');
      return;
    }
    if (!consultationData.date.trim()) {
      Alert.alert('Error', 'Please select consultation date');
      return;
    }
    if (!consultationData.time.trim()) {
      Alert.alert('Error', 'Please enter consultation time');
      return;
    }
    if (!consultationData.teacher_id.trim()) {
      Alert.alert('Error', 'Please select a teacher');
      return;
    }

    // Check if user is logged in
    if (!user || !user.id) {
      Alert.alert('Error', 'You must be logged in to create a consultation');
      return;
    }

    try {
      // Prepare data for Firestore schedule table
      const scheduleData = {
        purpose: consultationData.purpose.trim(),
        consultation_date: consultationData.date.trim(),
        consultation_time: consultationData.time.trim(),
        teacher_id: consultationData.teacher_id.trim(),
        teacher_name: consultationData.teacher_name.trim(),
        student_id: user.id, // ID of the user who submitted
        student_name: `${user.first_name} ${user.middle_name} ${user.last_name}`.trim(),
        student_profile_picture: user.profile_picture || '',
        student_email: user.email || '',
        status: 'pending', // pending, approved, completed, cancelled
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Add document to Firestore schedules collection
      const docRef = await addDoc(collection(db, 'schedules'), scheduleData);
      
      console.log('Schedule created with ID: ', docRef.id);
      
      // Create notification for teacher (stored in Firestore, teacher will see this)
      await addDoc(collection(db, 'notifications'), {
        type: 'consultation_request',
        title: 'New Consultation Request',
        message: `${scheduleData.student_name} requested a consultation: ${scheduleData.purpose}`,
        teacher_id: scheduleData.teacher_id, // Only this teacher can see the notification
        student_id: scheduleData.student_id,
        consultation_id: docRef.id,
        consultation_date: scheduleData.consultation_date,
        consultation_time: scheduleData.consultation_time,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      
      // Show local notification to student (appears in status bar)
      await notificationService.notifyPendingConsultation(
        scheduleData.teacher_name,
        scheduleData.purpose,
        scheduleData.consultation_date
      );
      
      console.log('Notifications sent to student and teacher');
      
      Alert.alert('Success', 'Consultation request submitted successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseModal();
          fetchConsultations();
        }}
      ]);
    } catch (error) {
      console.error('Error creating schedule: ', error);
      Alert.alert('Error', 'Failed to submit consultation request. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleTeacherDropdown = () => {
    setShowTeacherDropdown(!showTeacherDropdown);
  };

  const handleTeacherSelect = (teacher) => {
    setConsultationData(prev => ({
      ...prev,
      teacher_id: teacher.id,
      teacher_name: `${teacher.firstname} ${teacher.middlename} ${teacher.lastname}`.trim()
    }));
    setShowTeacherDropdown(false);
  };

  const handleUpdateConsultation = (consultation) => {
    console.log('Update consultation:', consultation);
    setEditingConsultation(consultation);
    setConsultationData({
      purpose: consultation.purpose,
      date: consultation.consultation_date,
      time: consultation.consultation_time,
      teacher_id: consultation.teacher_id,
      teacher_name: consultation.teacher_name,
      status: consultation.status,
    });
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setEditingConsultation(null);
    setConsultationData({
      purpose: '',
      date: '',
      time: '',
      teacher_id: '',
      teacher_name: '',
      status: 'pending',
    });
  };

  const handleUpdateConsultationSave = async () => {
    // Validate form
    if (!consultationData.purpose.trim()) {
      Alert.alert('Error', 'Please enter purpose of consultation');
      return;
    }
    if (!consultationData.date.trim()) {
      Alert.alert('Error', 'Please select consultation date');
      return;
    }
    if (!consultationData.time.trim()) {
      Alert.alert('Error', 'Please enter consultation time');
      return;
    }

    try {
      // Prepare data for Firestore update (students cannot change status)
      const scheduleDataToUpdate = {
        purpose: consultationData.purpose.trim(),
        consultation_date: consultationData.date.trim(),
        consultation_time: consultationData.time.trim(),
        updated_at: serverTimestamp(),
      };

      // Update document in Firestore schedules collection
      const scheduleRef = doc(db, 'schedules', editingConsultation.id);
      await updateDoc(scheduleRef, scheduleDataToUpdate);
      
      console.log('Schedule updated successfully');
      
      Alert.alert('Success', 'Consultation schedule updated successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseUpdateModal();
          fetchConsultations();
        }}
      ]);
    } catch (error) {
      console.error('Error updating schedule: ', error);
      Alert.alert('Error', 'Failed to update consultation schedule. Please try again.');
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
            <ThemedText style={styles.helloText}>Make</ThemedText>
            <ThemedText style={styles.signInText}>Consultation</ThemedText>
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
               Consultation Requests
             </ThemedText>
             <ThemedText style={[styles.contentSubtitle, { color: iconColor }]}>
               Request consultations with your teachers
             </ThemedText>
             
             {/* Create Schedule Button */}
             <TouchableOpacity
               style={styles.addButton}
               onPress={handleAddConsultation}
             >
               <LinearGradient
                 colors={['#8B1538', '#4A0E4E']}
                 style={styles.addButtonGradient}
               >
                 <Ionicons name="calendar" size={24} color="white" />
                 <ThemedText style={styles.addButtonText}>Create Schedule Now</ThemedText>
               </LinearGradient>
             </TouchableOpacity>
             
             {/* Consultations List */}
             {isLoading ? (
               <View style={styles.loadingContainer}>
                 <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                   Loading consultations...
                 </ThemedText>
               </View>
             ) : consultations.length > 0 ? (
               <View style={styles.sectionsList}>
                 {consultations.map((consultation) => (
                   <View key={consultation.id} style={[styles.sectionCard, { 
                     backgroundColor: backgroundColor,
                     borderColor: isDark ? '#fff' : '#f0f0f0'
                   }]}>
                     <View style={styles.sectionHeader}>
                       <View style={styles.sectionIconContainer}>
                         <Ionicons name="calendar" size={24} color="white" />
                       </View>
                       <View style={styles.sectionInfo}>
                         <ThemedText style={[styles.sectionName, { color: textColor }]}>
                           {consultation.purpose}
                         </ThemedText>
                         <ThemedText style={[styles.sectionGrade, { color: iconColor }]}>
                           {consultation.teacher_name}
                         </ThemedText>
                       </View>
                      <View style={styles.sectionStatus}>
                         <ThemedText style={[styles.statusText, { 
                           color: consultation.status === 'pending' ? '#FF9800' : 
                                  consultation.status === 'approved' ? '#4CAF50' : 
                                  consultation.status === 'completed' ? '#2196F3' : '#F44336'
                         }]}>
                           {consultation.status}
                         </ThemedText>
                       </View>
                      {consultation.status === 'pending' && (
                        <TouchableOpacity 
                          style={styles.updateButton}
                          onPress={() => handleUpdateConsultation(consultation)}
                        >
                          <Ionicons name="create-outline" size={16} color="#2196F3" />
                          <ThemedText style={styles.updateButtonText}>Update</ThemedText>
                        </TouchableOpacity>
                      )}
                     </View>
                     <View style={[styles.sectionDetails, { borderTopColor: isDark ? '#fff' : '#f0f0f0' }]}>
                       <View style={styles.detailRow}>
                         <Ionicons name="calendar-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Date: {consultation.consultation_date}
                         </ThemedText>
                       </View>
                       <View style={styles.detailRow}>
                         <Ionicons name="time-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Time: {consultation.consultation_time}
                         </ThemedText>
                       </View>
                       <View style={styles.detailRow}>
                         <Ionicons name="person-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Teacher: {consultation.teacher_name}
                         </ThemedText>
                       </View>
                       {consultation.status === 'declined' && !!consultation.decline_reason && (
                         <View style={styles.detailRow}>
                           <Ionicons name="alert-circle-outline" size={16} color="#C62828" />
                           <ThemedText style={[styles.detailText, { color: '#C62828' }]}> 
                             Reason: {consultation.decline_reason}
                           </ThemedText>
                         </View>
                       )}
                     </View>
                   </View>
                 ))}
               </View>
             ) : (
               <View style={styles.placeholderContainer}>
                 <Ionicons name="calendar-outline" size={64} color="#666" />
                 <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                   No consultation requests yet. Click "Create Schedule Now" to request a consultation!
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

      {/* Add Consultation Modal */}
      <Modal
        visible={showAddModal && !showDateTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Create New Consultation
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Purpose */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Purpose of Consultation</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={consultationData.purpose}
                  onChangeText={(value) => handleInputChange('purpose', value)}
                  placeholder="e.g., Academic Performance Discussion"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Date of Consultation</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateInputWrapper, { borderColor: iconColor }]}
                  onPress={showDateTimePicker}
                  activeOpacity={0.7}
                >
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={consultationData.date}
                    placeholder="Tap to select date"
                    placeholderTextColor="#999"
                    editable={false}
                    pointerEvents="none"
                  />
                  <Ionicons name="calendar-outline" size={20} color={iconColor} style={styles.inputIcon} />
                </TouchableOpacity>
              </View>

              {/* Time */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Time of Consultation</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={consultationData.time}
                  onChangeText={(value) => handleInputChange('time', value)}
                  placeholder="e.g., 10:00 AM - 11:00 AM"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Teacher Selection */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Select Teacher</ThemedText>
                <TouchableOpacity 
                  style={[styles.inputWrapper, { borderColor: iconColor }]}
                  onPress={toggleTeacherDropdown}
                  activeOpacity={0.7}
                >
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    placeholder="Select a teacher"
                    placeholderTextColor="#999"
                    value={consultationData.teacher_name}
                    editable={false}
                    pointerEvents="none"
                  />
                  <Ionicons 
                    name={showTeacherDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={iconColor} 
                    style={styles.inputIcon} 
                  />
                </TouchableOpacity>
                
                {/* Teacher Dropdown */}
                {showTeacherDropdown && (
                  <View style={[styles.dropdown, { backgroundColor: backgroundColor, borderColor: iconColor }]}>
                    {teachers.length > 0 ? (
                      teachers.map((teacher, index) => (
                        <TouchableOpacity
                          key={teacher.id}
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: iconColor },
                            index === teachers.length - 1 && styles.dropdownItemLast
                          ]}
                          onPress={() => handleTeacherSelect(teacher)}
                        >
                          <View style={styles.teacherDropdownContent}>
                            {teacher.profilePicture ? (
                              <Image 
                                source={{ uri: teacher.profilePicture }} 
                                style={styles.teacherDropdownImage}
                              />
                            ) : (
                              <View style={styles.teacherDropdownIcon}>
                                <Ionicons name="person" size={20} color="white" />
                              </View>
                            )}
                            <View style={styles.teacherDropdownInfo}>
                              <ThemedText style={[styles.dropdownText, { color: textColor }]}>
                                {teacher.firstname} {teacher.middlename} {teacher.lastname}
                              </ThemedText>
                              <ThemedText style={[styles.dropdownSubText, { color: iconColor }]}>
                                {teacher.position}
                              </ThemedText>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <ThemedText style={[styles.dropdownText, { color: iconColor }]}>
                          No teachers available
                        </ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </View>
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
                onPress={handleSaveConsultation}
              >
                <LinearGradient
                  colors={['#8B1538', '#4A0E4E']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Submit </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Consultation Modal */}
      <Modal
        visible={showUpdateModal && !showDateTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseUpdateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Update Consultation
              </ThemedText>
              <TouchableOpacity onPress={handleCloseUpdateModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Purpose */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Purpose of Consultation</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={consultationData.purpose}
                  onChangeText={(value) => handleInputChange('purpose', value)}
                  placeholder="e.g., Academic Performance Discussion"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Date of Consultation</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateInputWrapper, { borderColor: iconColor }]}
                  onPress={showDateTimePicker}
                  activeOpacity={0.7}
                >
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={consultationData.date}
                    placeholder="Tap to select date"
                    placeholderTextColor="#999"
                    editable={false}
                    pointerEvents="none"
                  />
                  <Ionicons name="calendar-outline" size={20} color={iconColor} style={styles.inputIcon} />
                </TouchableOpacity>
              </View>

              {/* Time */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Time of Consultation</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={consultationData.time}
                  onChangeText={(value) => handleInputChange('time', value)}
                  placeholder="e.g., 10:00 AM - 11:00 AM"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Teacher (Read-only) */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Teacher</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor, opacity: 0.6 }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={consultationData.teacher_name}
                    editable={false}
                    placeholderTextColor="#999"
                  />
                  <Ionicons name="lock-closed" size={16} color={iconColor} style={styles.inputIcon} />
                </View>
              </View>

              {/* Status - Read Only for Students */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Status</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: iconColor, opacity: 0.6 }]}>
                  <TextInput
                    style={[styles.textInput, { 
                      color: textColor, 
                      textTransform: 'capitalize'
                    }]}
                    value={consultationData.status}
                    editable={false}
                    placeholderTextColor="#999"
                  />
                  <Ionicons name="lock-closed" size={16} color={iconColor} style={styles.inputIcon} />
                </View>
                <ThemedText style={[styles.statusNote, { color: iconColor }]}>
                  Note: Status can only be changed by teachers or administrators
                </ThemedText>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseUpdateModal}
              >
                <ThemedText style={[styles.cancelButtonText, { color: iconColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateConsultationSave}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Update </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDateTimeModal && (showAddModal || showUpdateModal)}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDateTimePicker}
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
              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {/* Month/Year Selector */}
                <View style={styles.androidMonthSelector}>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    // Don't allow going to past months
                    const today = new Date();
                    today.setDate(1);
                    today.setHours(0, 0, 0, 0);
                    newDate.setDate(1);
                    newDate.setHours(0, 0, 0, 0);
                    if (newDate >= today) {
                      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
                    }
                  }}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <ThemedText style={styles.androidMonthText}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}>
                    <Ionicons name="chevron-forward" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
              
                {/* Days of Week */}
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
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    currentDate.setHours(0, 0, 0, 0);
                    const isPast = currentDate < today;
                    const isToday = currentDate.getTime() === today.getTime();
                    const isSelected = consultationData.date && 
                      new Date(consultationData.date).toDateString() === currentDate.toDateString();
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.androidCalendarDay,
                          isSelected && styles.androidSelectedDay,
                          isPast && styles.androidPastDay
                        ]}
                        onPress={() => !isPast && handleDateSelect(currentDate)}
                        disabled={isPast}
                      >
                        <ThemedText style={{
                          fontSize: 16,
                          textAlign: 'center',
                          fontWeight: '400',
                          color: isPast ? 
                            '#ccc' : 
                            (isSelected ? 'white' : '#333')
                        }}>
                          {dayNumber}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            
            {/* Footer Buttons */}
            <View style={styles.androidFooter}>
              <TouchableOpacity
                style={styles.androidCancelButton}
                onPress={closeDateTimePicker}
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
  // Add Section Button Styles
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B1538',
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
  // Sections List Styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  sectionsList: {
    width: '100%',
  },
  sectionCard: {
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionGrade: {
    fontSize: 14,
  },
  sectionStatus: {
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
  sectionDetails: {
    borderTopWidth: 1,
    paddingTop: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    marginLeft: 10,
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
  statusNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Dropdown Styles
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
    maxHeight: 250,
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
  teacherDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherDropdownImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 12,
  },
  teacherDropdownIcon: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teacherDropdownInfo: {
    flex: 1,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
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
    backgroundColor: '#8B1538',
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
    backgroundColor: '#8B1538',
    borderRadius: 20,
  },
  androidPastDay: {
    opacity: 0.3,
    backgroundColor: '#f5f5f5',
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
    color: '#8B1538',
    fontSize: 16,
    fontWeight: '500',
  },
  androidOkButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  androidOkText: {
    color: '#8B1538',
    fontSize: 16,
    fontWeight: '500',
  },
});
