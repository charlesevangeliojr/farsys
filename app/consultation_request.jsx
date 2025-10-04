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

const { height } = Dimensions.get('window');

export default function SectionScreen() {
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
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineReasonError, setDeclineReasonError] = useState(false);
  const [decliningConsultation, setDecliningConsultation] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sectionData, setSectionData] = useState({
    section_name: '',
    grade_level: '',
    adviser: '',
    max_students: '',
    status: 'active', // Default status
  });

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Fetch consultation requests for the logged-in teacher
  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch consultation requests for teacher...');

      const schedulesRef = collection(db, 'schedules');
      const querySnapshot = await getDocs(schedulesRef);

      const list = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (user && user.userType === 'teacher' && data.teacher_id === user.id) {
          if (statusFilter === 'all' || data.status === statusFilter) {
            list.push({ id: docSnap.id, ...data });
          }
        }
      });

      console.log('Consultations list for teacher:', list.length);
      setConsultations(list);
    } catch (error) {
      console.error('Error fetching consultation requests:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to load consultation requests: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (consultation) => {
    Alert.alert(
      'Approve Consultation',
      'Are you sure you want to approve this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const scheduleRef = doc(db, 'schedules', consultation.id);
              await updateDoc(scheduleRef, {
                status: 'approved',
                updated_at: serverTimestamp(),
              });

              // Notify student (local inbox/notification center)
              await addDoc(collection(db, 'notifications'), {
                type: 'consultation_approved',
                title: 'Consultation Approved',
                message: `Your consultation with ${user?.firstname || 'Teacher'} has been approved`,
                student_id: consultation.student_id,
                teacher_id: consultation.teacher_id,
                consultation_id: consultation.id,
                consultation_date: consultation.consultation_date,
                consultation_time: consultation.consultation_time,
                isRead: false,
                createdAt: serverTimestamp(),
              });

              Alert.alert('Success', 'Consultation approved');
              await fetchConsultations();
            } catch (error) {
              console.error('Error approving consultation:', error);
              Alert.alert('Error', 'Failed to approve consultation');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDecline = async (consultation) => {
    Alert.alert(
      'Decline Consultation',
      'Are you sure you want to decline this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setDecliningConsultation(consultation);
            setDeclineReason('');
            setDeclineReasonError(false);
            setShowDeclineModal(true);
          }
        }
      ]
    );
  };

  const handleMarkCompleted = async (consultation) => {
    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this consultation as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const scheduleRef = doc(db, 'schedules', consultation.id);
              await updateDoc(scheduleRef, {
                status: 'completed',
                updated_at: serverTimestamp(),
              });

              // Optional: notify student about completion
              await addDoc(collection(db, 'notifications'), {
                type: 'consultation_completed',
                title: 'Consultation Completed',
                message: `Your consultation with ${user?.firstname || 'Teacher'} has been marked as completed`,
                student_id: consultation.student_id,
                teacher_id: consultation.teacher_id,
                consultation_id: consultation.id,
                consultation_date: consultation.consultation_date,
                consultation_time: consultation.consultation_time,
                isRead: false,
                createdAt: serverTimestamp(),
              });

              Alert.alert('Success', 'Consultation marked as completed');
              await fetchConsultations();
            } catch (error) {
              console.error('Error completing consultation:', error);
              Alert.alert('Error', 'Failed to mark as completed');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Load consultation requests when component mounts
  React.useEffect(() => {
    fetchConsultations();
  }, [statusFilter]);

  const handleFilterSelect = (status) => {
    setStatusFilter(status);
    setShowFilterModal(false);
  };

  const getFilterLabel = () => {
    switch (statusFilter) {
      case 'all': return 'All Requests';
      case 'pending': return 'Pending Requests';
      case 'approved': return 'Approved Requests';
      case 'declined': return 'Declined Requests';
      case 'completed': return 'Completed Requests';
      default: return 'Pending Requests';
    }
  };

  const handleAddSection = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSectionData({
      section_name: '',
      grade_level: '',
      adviser: '',
      max_students: '',
      status: 'active',
    });
  };

  const handleSaveSection = async () => {
    // Validate form
    if (!sectionData.section_name.trim()) {
      Alert.alert('Error', 'Please enter section name');
      return;
    }
    if (!sectionData.grade_level.trim()) {
      Alert.alert('Error', 'Please enter grade level');
      return;
    }
    if (!sectionData.adviser.trim()) {
      Alert.alert('Error', 'Please enter adviser name');
      return;
    }
    if (!sectionData.max_students.trim()) {
      Alert.alert('Error', 'Please enter maximum students');
      return;
    }

    try {
      // Prepare data for Firestore
      const sectionDataToSave = {
        section_name: sectionData.section_name.trim(),
        grade_level: sectionData.grade_level.trim(),
        adviser: sectionData.adviser.trim(),
        max_students: parseInt(sectionData.max_students.trim()),
        status: sectionData.status,
        created_at: serverTimestamp(), // Automatic timestamp
        updated_at: serverTimestamp(), // Automatic timestamp
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'sections'), sectionDataToSave);
      
      console.log('Section added with ID: ', docRef.id);
      
      Alert.alert('Success', 'Section added successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseModal();
          fetchSections(); // Refresh the sections list
        }}
      ]);
    } catch (error) {
      console.error('Error adding section: ', error);
      Alert.alert('Error', 'Failed to add section. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setSectionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateSection = (section) => {
    console.log('Update section:', section);
    setEditingSection(section);
    setSectionData({
      section_name: section.section_name,
      grade_level: section.grade_level,
      adviser: section.adviser,
      max_students: section.max_students.toString(),
      status: section.status,
    });
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setEditingSection(null);
    setSectionData({
      section_name: '',
      grade_level: '',
      adviser: '',
      max_students: '',
      status: 'active',
    });
  };

  const handleUpdateSectionSave = async () => {
    // Validate form
    if (!sectionData.section_name.trim()) {
      Alert.alert('Error', 'Please enter section name');
      return;
    }
    if (!sectionData.grade_level.trim()) {
      Alert.alert('Error', 'Please enter grade level');
      return;
    }
    if (!sectionData.adviser.trim()) {
      Alert.alert('Error', 'Please enter adviser name');
      return;
    }
    if (!sectionData.max_students.trim()) {
      Alert.alert('Error', 'Please enter maximum students');
      return;
    }

    try {
      // Prepare data for Firestore update
      const sectionDataToUpdate = {
        section_name: sectionData.section_name.trim(),
        grade_level: sectionData.grade_level.trim(),
        adviser: sectionData.adviser.trim(),
        max_students: parseInt(sectionData.max_students.trim()),
        status: sectionData.status,
        updated_at: serverTimestamp(), // Update timestamp
      };

      // Update document in Firestore
      const sectionRef = doc(db, 'sections', editingSection.id);
      await updateDoc(sectionRef, sectionDataToUpdate);
      
      console.log('Section updated successfully');
      
      Alert.alert('Success', 'Section updated successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseUpdateModal();
          fetchSections(); // Refresh the sections list
        }}
      ]);
    } catch (error) {
      console.error('Error updating section: ', error);
      Alert.alert('Error', 'Failed to update section. Please try again.');
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
            <ThemedText style={styles.helloText}>Consultation</ThemedText>
            <ThemedText style={styles.signInText}>Requests</ThemedText>
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
             
            <View style={styles.subtitleRow}>
              <View style={styles.filterSpacer} />
              <ThemedText style={[styles.contentSubtitle, { color: iconColor, textAlign: 'center', flex: 1 }]}> 
                Requests assigned to you (as teacher)
              </ThemedText>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons name="filter" size={20} color="#8B1538" />
              </TouchableOpacity>
            </View>

            {/* Filter Badge */}
            <View style={styles.filterBadgeContainer}>
              <ThemedText style={styles.filterBadgeText}>
                {getFilterLabel()}
              </ThemedText>
            </View>
             
             {/* Consultation Requests List */}
             {isLoading ? (
               <View style={styles.loadingContainer}>
                 <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                   Loading consultation requests...
                 </ThemedText>
               </View>
             ) : consultations.length > 0 ? (
               <View style={styles.sectionsList}>
                 {consultations.map((c) => (
                  <View key={c.id} style={[styles.sectionCard, { backgroundColor: backgroundColor }]}> 
                       <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        {c.student_profile_picture ? (
                          <Image source={{ uri: c.student_profile_picture }} style={styles.studentProfileImage} />
                        ) : (
                          <Ionicons name="person" size={24} color="white" />
                        )}
                      </View>
                       <View style={styles.sectionInfo}>
                         <ThemedText style={[styles.sectionName, { color: textColor }]}>
                           {c.purpose}
                         </ThemedText>
                         <ThemedText style={[styles.sectionGrade, { color: iconColor }]}>
                           From: {c.student_name}
                         </ThemedText>
                       </View>
                       <View style={styles.sectionStatus}>
                         <ThemedText style={[styles.statusText, { color: c.status === 'approved' ? '#4CAF50' : c.status === 'pending' ? '#FF9800' : '#2196F3' }]}> 
                           {c.status}
                         </ThemedText>
                       </View>
                     </View>
                     <View style={styles.sectionDetails}>
                       <View style={styles.detailRow}>
                         <Ionicons name="calendar-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Date: {c.consultation_date}
                         </ThemedText>
                       </View>
                       <View style={styles.detailRow}>
                         <Ionicons name="time-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Time: {c.consultation_time}
                         </ThemedText>
                       </View>
                       {c.status === 'approved' && (
                         <View style={styles.detailRow}>
                           <Ionicons name="checkmark-done-circle-outline" size={16} color="#2E7D32" />
                           <ThemedText style={[styles.detailText, { color: '#2E7D32' }]}> 
                             This schedule is officially approved
                           </ThemedText>
                         </View>
                       )}
                       {c.status === 'approved' && (
                         <View style={styles.actionsRow}>
                           <TouchableOpacity style={styles.approveButton} onPress={() => handleMarkCompleted(c)} disabled={isLoading}>
                             <Ionicons name="checkmark-done-circle" size={18} color="#2E7D32" />
                             <ThemedText style={styles.approveText}>Mark as Completed</ThemedText>
                           </TouchableOpacity>
                         </View>
                       )}
                       {c.status === 'declined' && !!c.decline_reason && (
                         <View style={styles.detailRow}>
                           <Ionicons name="alert-circle-outline" size={16} color="#C62828" />
                           <ThemedText style={[styles.detailText, { color: '#C62828' }]}> 
                             Reason: {c.decline_reason}
                           </ThemedText>
                         </View>
                       )}
                        {c.status === 'pending' && (
                          <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.declineButton} onPress={() => handleDecline(c)} disabled={isLoading}>
                              <Ionicons name="close-circle" size={18} color="#F44336" />
                              <ThemedText style={styles.declineText}>Decline</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(c)} disabled={isLoading}>
                              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                              <ThemedText style={styles.approveText}>Approve</ThemedText>
                            </TouchableOpacity>
                          </View>
                        )}
                     </View>
                   </View>
                 ))}
               </View>
             ) : (
               <View style={styles.placeholderContainer}>
                 <Ionicons name="chatbubbles-outline" size={64} color="#666" />
                 <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                   No consultation requests assigned to you.
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

      {/* Add Section Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Add New Section
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Section Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Section Name</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.section_name}
                  onChangeText={(value) => handleInputChange('section_name', value)}
                  placeholder="e.g., Grade 7-A"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Grade Level */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Grade Level</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.grade_level}
                  onChangeText={(value) => handleInputChange('grade_level', value)}
                  placeholder="e.g., Grade 7"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Adviser */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Adviser</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.adviser}
                  onChangeText={(value) => handleInputChange('adviser', value)}
                  placeholder="e.g., John Doe"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Max Students */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Maximum Students</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.max_students}
                  onChangeText={(value) => handleInputChange('max_students', value)}
                  placeholder="e.g., 40"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
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
                onPress={handleSaveSection}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Save Section</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Section Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseUpdateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Update Section
              </ThemedText>
              <TouchableOpacity onPress={handleCloseUpdateModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Section Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Section Name</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.section_name}
                  onChangeText={(value) => handleInputChange('section_name', value)}
                  placeholder="e.g., Grade 7-A"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Grade Level */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Grade Level</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.grade_level}
                  onChangeText={(value) => handleInputChange('grade_level', value)}
                  placeholder="e.g., Grade 7"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Adviser */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Adviser</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.adviser}
                  onChangeText={(value) => handleInputChange('adviser', value)}
                  placeholder="e.g., John Doe"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Max Students */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Maximum Students</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={sectionData.max_students}
                  onChangeText={(value) => handleInputChange('max_students', value)}
                  placeholder="e.g., 40"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Status */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Status</ThemedText>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: sectionData.status === 'active' ? '#4CAF50' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'active')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: sectionData.status === 'active' ? 'white' : '#666' }
                    ]}>
                      Active
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: sectionData.status === 'inactive' ? '#FF9800' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'inactive')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: sectionData.status === 'inactive' ? 'white' : '#666' }
                    ]}>
                      Inactive
                    </ThemedText>
                  </TouchableOpacity>
                </View>
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
                onPress={handleUpdateSectionSave}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Update Section</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Reason Modal */}
      <Modal
        visible={showDeclineModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>Decline Consultation</ThemedText>
              <TouchableOpacity onPress={() => setShowDeclineModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <ThemedText style={styles.inputLabel}>Reason for declining</ThemedText>
              <TextInput
                style={[styles.textInput, { color: textColor, borderColor: declineReasonError ? '#F44336' : iconColor }]}
                value={declineReason}
                onChangeText={setDeclineReason}
                placeholder="Enter reason"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
              {declineReasonError && (
                <ThemedText style={{ color: '#F44336', marginTop: 6, fontSize: 12 }}>
                  Reason is required
                </ThemedText>
              )}
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeclineModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                  if (!declineReason.trim()) {
                    setDeclineReasonError(true);
                    return;
                  }
                  try {
                    setIsLoading(true);
                    const c = decliningConsultation;
                    const scheduleRef = doc(db, 'schedules', c.id);
                    await updateDoc(scheduleRef, {
                      status: 'declined',
                      decline_reason: declineReason.trim(),
                      updated_at: serverTimestamp(),
                    });
                    await addDoc(collection(db, 'notifications'), {
                      type: 'consultation_declined',
                      title: 'Consultation Declined',
                      message: `Your consultation with ${user?.firstname || 'Teacher'} has been declined. Reason: ${declineReason.trim()}`,
                      student_id: c.student_id,
                      teacher_id: c.teacher_id,
                      consultation_id: c.id,
                      consultation_date: c.consultation_date,
                      consultation_time: c.consultation_time,
                      isRead: false,
                      createdAt: serverTimestamp(),
                    });
                    setShowDeclineModal(false);
                    setDeclineReason('');
                    setDecliningConsultation(null);
                    await fetchConsultations();
                  } catch (error) {
                    console.error('Error declining consultation:', error);
                    Alert.alert('Error', 'Failed to decline consultation');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <LinearGradient colors={['#F44336', '#D32F2F']} style={styles.saveButtonGradient}>
                  <ThemedText style={styles.saveButtonText}>Submit</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.filterModalContainer, { backgroundColor: backgroundColor }]}>
            <ThemedText style={[styles.filterModalTitle, { color: textColor }]}>Filter by Status</ThemedText>

            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'all' && styles.filterOptionSelected]}
              onPress={() => handleFilterSelect('all')}
            >
              <Ionicons name="list" size={20} color={statusFilter === 'all' ? '#8B1538' : '#666'} />
              <ThemedText style={[styles.filterOptionText, { color: statusFilter === 'all' ? '#8B1538' : textColor }]}>All Requests</ThemedText>
              {statusFilter === 'all' && (<Ionicons name="checkmark" size={20} color="#8B1538" />)}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'pending' && styles.filterOptionSelected]}
              onPress={() => handleFilterSelect('pending')}
            >
              <Ionicons name="time-outline" size={20} color={statusFilter === 'pending' ? '#FF9800' : '#666'} />
              <ThemedText style={[styles.filterOptionText, { color: statusFilter === 'pending' ? '#FF9800' : textColor }]}>Pending Requests</ThemedText>
              {statusFilter === 'pending' && (<Ionicons name="checkmark" size={20} color="#FF9800" />)}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'approved' && styles.filterOptionSelected]}
              onPress={() => handleFilterSelect('approved')}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={statusFilter === 'approved' ? '#4CAF50' : '#666'} />
              <ThemedText style={[styles.filterOptionText, { color: statusFilter === 'approved' ? '#4CAF50' : textColor }]}>Approved Requests</ThemedText>
              {statusFilter === 'approved' && (<Ionicons name="checkmark" size={20} color="#4CAF50" />)}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'declined' && styles.filterOptionSelected]}
              onPress={() => handleFilterSelect('declined')}
            >
              <Ionicons name="close-circle-outline" size={20} color={statusFilter === 'declined' ? '#F44336' : '#666'} />
              <ThemedText style={[styles.filterOptionText, { color: statusFilter === 'declined' ? '#F44336' : textColor }]}>Declined Requests</ThemedText>
              {statusFilter === 'declined' && (<Ionicons name="checkmark" size={20} color="#F44336" />)}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, statusFilter === 'completed' && styles.filterOptionSelected]}
              onPress={() => handleFilterSelect('completed')}
            >
              <Ionicons name="checkmark-done-circle-outline" size={20} color={statusFilter === 'completed' ? '#2196F3' : '#666'} />
              <ThemedText style={[styles.filterOptionText, { color: statusFilter === 'completed' ? '#2196F3' : textColor }]}>Completed Requests</ThemedText>
              {statusFilter === 'completed' && (<Ionicons name="checkmark" size={20} color="#2196F3" />)}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 15,
    width: '100%',
  },
  filterSpacer: {
    width: 40,
    height: 40,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  filterBadgeContainer: {
    backgroundColor: '#8B1538',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 25,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    color: '#4CAF50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  studentProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
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
    color: '#666',
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
    borderTopColor: '#f0f0f0',
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
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
  },
  approveText: {
    marginLeft: 6,
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContainer: {
    width: '80%',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  filterOptionSelected: {
    backgroundColor: '#f5f5f5',
  },
  filterOptionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    marginRight: 8,
  },
  declineText: {
    marginLeft: 6,
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
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
});
