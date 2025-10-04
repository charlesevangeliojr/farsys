import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db, serverTimestamp } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function RegistrationRequestScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Fetch students from Firestore based on filter
  const fetchStudents = async (status = 'pending') => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch students with status:', status);
      
      const studentsRef = collection(db, 'students');
      const querySnapshot = await getDocs(studentsRef);
      
      const studentsList = [];
      querySnapshot.forEach((doc) => {
        const studentData = doc.data();
        // Filter by selected status
        if (status === 'all' || studentData.status === status) {
          studentsList.push({
            id: doc.id,
            ...studentData
          });
        }
      });
      
      console.log('Students list:', studentsList);
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', `Failed to load students: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load students when component mounts or filter changes
  React.useEffect(() => {
    fetchStudents(statusFilter);
  }, [statusFilter]);

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedStudent(null);
  };

  const handleApprove = async (student) => {
    Alert.alert(
      'Approve Registration',
      `Approve registration for ${student.first_name} ${student.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const studentRef = doc(db, 'students', student.id);
              await updateDoc(studentRef, {
                status: 'approved',
                updated_at: serverTimestamp(),
              });
              
               Alert.alert('Success', 'Student registration approved!');
               fetchStudents(statusFilter); // Refresh list
               if (showDetailModal) {
                handleCloseDetailModal();
              }
            } catch (error) {
              console.error('Error approving student:', error);
              Alert.alert('Error', 'Failed to approve registration. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (student) => {
    Alert.alert(
      'Reject Registration',
      `Reject registration for ${student.first_name} ${student.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const studentRef = doc(db, 'students', student.id);
              await updateDoc(studentRef, {
                status: 'rejected',
                updated_at: serverTimestamp(),
              });
              
               Alert.alert('Success', 'Student registration rejected.');
               fetchStudents(statusFilter); // Refresh list
               if (showDetailModal) {
                handleCloseDetailModal();
              }
            } catch (error) {
              console.error('Error rejecting student:', error);
              Alert.alert('Error', 'Failed to reject registration. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleFilterSelect = (status) => {
    setStatusFilter(status);
    setShowFilterModal(false);
  };

  const getFilterLabel = () => {
    switch (statusFilter) {
      case 'all': return 'All Registrations';
      case 'pending': return 'Pending Requests';
      case 'approved': return 'Approved Registrations';
      case 'rejected': return 'Rejected Registrations';
      default: return 'Pending Requests';
    }
  };

  const getEmptyStateMessage = () => {
    switch (statusFilter) {
      case 'all': return 'No registrations found in the database.';
      case 'pending': return 'No pending registration requests at the moment!';
      case 'approved': return 'No approved registrations yet.';
      case 'rejected': return 'No rejected registrations.';
      default: return 'No registration requests found.';
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
            <ThemedText style={styles.helloText}>Registration</ThemedText>
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
              <ThemedText style={[styles.contentSubtitle, { color: iconColor }]}>
                Review and approve student registrations
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
            
            {/* Pending Students List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                  Loading pending requests...
                </ThemedText>
              </View>
            ) : students.length > 0 ? (
              <View style={styles.studentsList}>
                {students.map((student) => (
                  <View key={student.id} style={[styles.studentCard, { backgroundColor: backgroundColor }]}>
                    <View style={styles.studentHeader}>
                      <View style={styles.studentIconContainer}>
                        {student.profile_picture ? (
                          <Image 
                            source={{ uri: student.profile_picture }} 
                            style={styles.studentProfileImage}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color="white" />
                        )}
                      </View>
                      <View style={styles.studentInfo}>
                        <ThemedText style={[styles.studentName, { color: textColor }]}>
                          {student.first_name} {student.middle_name} {student.last_name} {student.suffix}
                        </ThemedText>
                        <ThemedText style={[styles.studentLrn, { color: iconColor }]}>
                          LRN: {student.student_lrn}
                        </ThemedText>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: 
                          student.status === 'approved' ? '#E8F5E9' :
                          student.status === 'rejected' ? '#FFEBEE' :
                          '#FFF3E0'
                        }
                      ]}>
                        <Ionicons 
                          name={
                            student.status === 'approved' ? 'checkmark-circle' :
                            student.status === 'rejected' ? 'close-circle' :
                            'time'
                          }
                          size={16} 
                          color={
                            student.status === 'approved' ? '#4CAF50' :
                            student.status === 'rejected' ? '#F44336' :
                            '#FF9800'
                          }
                        />
                        <ThemedText style={[
                          styles.statusBadgeText,
                          { color: 
                            student.status === 'approved' ? '#4CAF50' :
                            student.status === 'rejected' ? '#F44336' :
                            '#FF9800'
                          }
                        ]}>
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.studentDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="mail" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {student.email}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="call" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {student.phone_number}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="school" size={16} color="#666" />
                        <ThemedText style={[styles.detailText, { color: iconColor }]}>
                          {student.student_year} - {student.school_year_name}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleViewDetails(student)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#2196F3" />
                        <ThemedText style={styles.viewButtonText}>View Details</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={() => handleApprove(student)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                        <ThemedText style={styles.approveButtonText}>Approve</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleReject(student)}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                        <ThemedText style={styles.rejectButtonText}>Reject</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={64} color="#666" />
                <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                  {getEmptyStateMessage()}
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

      {/* Student Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                Student Details
              </ThemedText>
              <TouchableOpacity onPress={handleCloseDetailModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {selectedStudent && (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Profile Picture */}
                {selectedStudent.profile_picture && (
                  <View style={styles.profilePictureContainer}>
                    <Image 
                      source={{ uri: selectedStudent.profile_picture }} 
                      style={styles.profilePicture}
                    />
                  </View>
                )}

                {/* Personal Information */}
                <ThemedText style={[styles.sectionTitle, { color: tintColor }]}>Personal Information</ThemedText>
                
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Full Name:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>
                    {selectedStudent.first_name} {selectedStudent.middle_name} {selectedStudent.last_name} {selectedStudent.suffix}
                  </ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Gender:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.gender}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Date of Birth:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.date_of_birth}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Age:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.age}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Address:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.address}</ThemedText>
                </View>

                {/* Contact Information */}
                <ThemedText style={[styles.sectionTitle, { color: tintColor, marginTop: 20 }]}>Contact Information</ThemedText>
                
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Email:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.email}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Phone:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.phone_number}</ThemedText>
                </View>

                {/* Academic Information */}
                <ThemedText style={[styles.sectionTitle, { color: tintColor, marginTop: 20 }]}>Academic Information</ThemedText>
                
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Student LRN:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.student_lrn}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>Student Year:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.student_year}</ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>School Year:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: textColor }]}>{selectedStudent.school_year_name}</ThemedText>
                </View>
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.rejectModalButton}
                onPress={() => selectedStudent && handleReject(selectedStudent)}
              >
                <ThemedText style={styles.rejectModalButtonText}>Reject</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveModalButton}
                onPress={() => selectedStudent && handleApprove(selectedStudent)}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.approveModalButtonGradient}
                >
                  <ThemedText style={styles.approveModalButtonText}>Approve</ThemedText>
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
            <ThemedText style={[styles.filterModalTitle, { color: textColor }]}>
              Filter by Status
            </ThemedText>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                statusFilter === 'all' && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterSelect('all')}
            >
              <Ionicons 
                name="list" 
                size={20} 
                color={statusFilter === 'all' ? '#8B1538' : '#666'} 
              />
              <ThemedText style={[
                styles.filterOptionText,
                { color: statusFilter === 'all' ? '#8B1538' : textColor }
              ]}>
                All Registrations
              </ThemedText>
              {statusFilter === 'all' && (
                <Ionicons name="checkmark" size={20} color="#8B1538" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                statusFilter === 'pending' && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterSelect('pending')}
            >
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={statusFilter === 'pending' ? '#FF9800' : '#666'} 
              />
              <ThemedText style={[
                styles.filterOptionText,
                { color: statusFilter === 'pending' ? '#FF9800' : textColor }
              ]}>
                Pending Requests
              </ThemedText>
              {statusFilter === 'pending' && (
                <Ionicons name="checkmark" size={20} color="#FF9800" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                statusFilter === 'approved' && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterSelect('approved')}
            >
              <Ionicons 
                name="checkmark-circle-outline" 
                size={20} 
                color={statusFilter === 'approved' ? '#4CAF50' : '#666'} 
              />
              <ThemedText style={[
                styles.filterOptionText,
                { color: statusFilter === 'approved' ? '#4CAF50' : textColor }
              ]}>
                Approved Registrations
              </ThemedText>
              {statusFilter === 'approved' && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterOption,
                statusFilter === 'rejected' && styles.filterOptionSelected
              ]}
              onPress={() => handleFilterSelect('rejected')}
            >
              <Ionicons 
                name="close-circle-outline" 
                size={20} 
                color={statusFilter === 'rejected' ? '#F44336' : '#666'} 
              />
              <ThemedText style={[
                styles.filterOptionText,
                { color: statusFilter === 'rejected' ? '#F44336' : textColor }
              ]}>
                Rejected Registrations
              </ThemedText>
              {statusFilter === 'rejected' && (
                <Ionicons name="checkmark" size={20} color="#F44336" />
              )}
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
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
  },
  contentSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    flex: 1,
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  studentsList: {
    width: '100%',
  },
  studentCard: {
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
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  studentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF9800',
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
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentLrn: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  studentDetails: {
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 4,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  approveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  rejectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 4,
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
    maxHeight: 400,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rejectModalButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F44336',
    alignItems: 'center',
  },
  rejectModalButtonText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
  approveModalButton: {
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
  approveModalButtonGradient: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
});
