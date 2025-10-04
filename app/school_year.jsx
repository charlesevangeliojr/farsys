import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db, serverTimestamp } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';

const { height } = Dimensions.get('window');

export default function SchoolYearScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  // Modal and form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSchoolYear, setEditingSchoolYear] = useState(null);
  const [schoolYearData, setSchoolYearData] = useState({
    year_name: '',
    start_date: '',
    end_date: '',
    description: '',
    status: 'active', // Default status
  });

  const handleBack = () => {
    router.back();
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Fetch school years from Firestore
  const fetchSchoolYears = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch school years...');
      
      const schoolYearsRef = collection(db, 'school_years');
      console.log('Collection reference created');
      
      const querySnapshot = await getDocs(schoolYearsRef);
      console.log('Query executed, got', querySnapshot.size, 'documents');
      
      const schoolYearsList = [];
      querySnapshot.forEach((doc) => {
        console.log('Processing document:', doc.id, doc.data());
        schoolYearsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('School years list:', schoolYearsList);
      setSchoolYears(schoolYearsList);
    } catch (error) {
      console.error('Detailed error fetching school years:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to load school years: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load school years when component mounts
  React.useEffect(() => {
    fetchSchoolYears();
  }, []);

  const handleAddSchoolYear = () => {
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSchoolYearData({
      year_name: '',
      start_date: '',
      end_date: '',
      description: '',
      status: 'active',
    });
  };

  const handleSaveSchoolYear = async () => {
    // Validate form
    if (!schoolYearData.year_name.trim()) {
      Alert.alert('Error', 'Please enter school year name');
      return;
    }
    if (!schoolYearData.start_date.trim()) {
      Alert.alert('Error', 'Please enter start date');
      return;
    }
    if (!schoolYearData.end_date.trim()) {
      Alert.alert('Error', 'Please enter end date');
      return;
    }

    try {
      // If setting this as active, deactivate all other school years first
      if (schoolYearData.status === 'active') {
        const schoolYearsRef = collection(db, 'school_years');
        const querySnapshot = await getDocs(schoolYearsRef);
        
        // Update all existing school years to inactive
        const updatePromises = [];
        querySnapshot.forEach((document) => {
          if (document.data().status === 'active') {
            const docRef = doc(db, 'school_years', document.id);
            updatePromises.push(updateDoc(docRef, { status: 'inactive', updated_at: serverTimestamp() }));
          }
        });
        
        await Promise.all(updatePromises);
      }
      
      // Prepare data for Firestore
      const schoolYearDataToSave = {
        year_name: schoolYearData.year_name.trim(),
        start_date: schoolYearData.start_date.trim(),
        end_date: schoolYearData.end_date.trim(),
        description: schoolYearData.description.trim(),
        status: schoolYearData.status,
        created_at: serverTimestamp(), // Automatic timestamp
        updated_at: serverTimestamp(), // Automatic timestamp
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'school_years'), schoolYearDataToSave);
      
      console.log('School year added with ID: ', docRef.id);
      
      Alert.alert('Success', 'School year added successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseModal();
          fetchSchoolYears(); // Refresh the school years list
        }}
      ]);
    } catch (error) {
      console.error('Error adding school year: ', error);
      Alert.alert('Error', 'Failed to add school year. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setSchoolYearData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateSchoolYear = (schoolYear) => {
    console.log('Update school year:', schoolYear);
    setEditingSchoolYear(schoolYear);
    setSchoolYearData({
      year_name: schoolYear.year_name,
      start_date: schoolYear.start_date,
      end_date: schoolYear.end_date,
      description: schoolYear.description || '',
      status: schoolYear.status,
    });
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setEditingSchoolYear(null);
    setSchoolYearData({
      year_name: '',
      start_date: '',
      end_date: '',
      description: '',
      status: 'active',
    });
  };

  const handleUpdateSchoolYearSave = async () => {
    // Validate form
    if (!schoolYearData.year_name.trim()) {
      Alert.alert('Error', 'Please enter school year name');
      return;
    }
    if (!schoolYearData.start_date.trim()) {
      Alert.alert('Error', 'Please enter start date');
      return;
    }
    if (!schoolYearData.end_date.trim()) {
      Alert.alert('Error', 'Please enter end date');
      return;
    }

    try {
      // If setting this as active, deactivate all other school years first
      if (schoolYearData.status === 'active') {
        const schoolYearsRef = collection(db, 'school_years');
        const querySnapshot = await getDocs(schoolYearsRef);
        
        // Update all other school years (except current one) to inactive
        const updatePromises = [];
        querySnapshot.forEach((document) => {
          // Skip the current school year being edited
          if (document.id !== editingSchoolYear.id && document.data().status === 'active') {
            const docRef = doc(db, 'school_years', document.id);
            updatePromises.push(updateDoc(docRef, { status: 'inactive', updated_at: serverTimestamp() }));
          }
        });
        
        await Promise.all(updatePromises);
      }
      
      // Prepare data for Firestore update
      const schoolYearDataToUpdate = {
        year_name: schoolYearData.year_name.trim(),
        start_date: schoolYearData.start_date.trim(),
        end_date: schoolYearData.end_date.trim(),
        description: schoolYearData.description.trim(),
        status: schoolYearData.status,
        updated_at: serverTimestamp(), // Update timestamp
      };

      // Update document in Firestore
      const schoolYearRef = doc(db, 'school_years', editingSchoolYear.id);
      await updateDoc(schoolYearRef, schoolYearDataToUpdate);
      
      console.log('School year updated successfully');
      
      Alert.alert('Success', 'School year updated successfully!', [
        { text: 'OK', onPress: () => {
          handleCloseUpdateModal();
          fetchSchoolYears(); // Refresh the school years list
        }}
      ]);
    } catch (error) {
      console.error('Error updating school year: ', error);
      Alert.alert('Error', 'Failed to update school year. Please try again.');
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
            <ThemedText style={styles.helloText}>School Year</ThemedText>
            <ThemedText style={styles.signInText}>Management</ThemedText>
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
              School Year Management
            </ThemedText>
            <ThemedText style={[styles.contentSubtitle, { color: iconColor }]}>
              Manage academic years and school calendar
            </ThemedText>
            
            {/* Add School Year Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSchoolYear}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={24} color="white" />
                <ThemedText style={styles.addButtonText}>Add School Year</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* School Years List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                  Loading school years...
                </ThemedText>
              </View>
            ) : schoolYears.length > 0 ? (
              <View style={styles.schoolYearsList}>
                {schoolYears.map((schoolYear) => (
                  <View key={schoolYear.id} style={[styles.schoolYearCard, { backgroundColor: backgroundColor }]}>
                    <View style={styles.schoolYearHeader}>
                      <View style={styles.schoolYearIconContainer}>
                        <Ionicons name="calendar" size={24} color="white" />
                      </View>
                      <View style={styles.schoolYearInfo}>
                        <ThemedText style={[styles.schoolYearName, { color: textColor }]}>
                          {schoolYear.year_name}
                        </ThemedText>
                        <ThemedText style={[styles.schoolYearDates, { color: iconColor }]}>
                          {schoolYear.start_date} - {schoolYear.end_date}
                        </ThemedText>
                      </View>
                      <View style={styles.schoolYearStatus}>
                        <ThemedText style={[styles.statusText, { color: schoolYear.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                          {schoolYear.status}
                        </ThemedText>
                      </View>
                      <TouchableOpacity 
                        style={styles.updateButton}
                        onPress={() => handleUpdateSchoolYear(schoolYear)}
                      >
                        <Ionicons name="create-outline" size={16} color="#2196F3" />
                        <ThemedText style={styles.updateButtonText}>Update</ThemedText>
                      </TouchableOpacity>
                    </View>
                    {schoolYear.description ? (
                      <View style={styles.schoolYearDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="information-circle" size={16} color="#666" />
                          <ThemedText style={[styles.detailText, { color: iconColor }]}>
                            {schoolYear.description}
                          </ThemedText>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="calendar-outline" size={64} color="#666" />
                <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                  No school years added yet. Click "Add School Year" to get started!
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

      {/* Add School Year Modal */}
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
                Add New School Year
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Year Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>School Year</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.year_name}
                  onChangeText={(value) => handleInputChange('year_name', value)}
                  placeholder="e.g., 2023-2024"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Start Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Start Date</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.start_date}
                  onChangeText={(value) => handleInputChange('start_date', value)}
                  placeholder="e.g., June 2023"
                  placeholderTextColor="#999"
                />
              </View>

              {/* End Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>End Date</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.end_date}
                  onChangeText={(value) => handleInputChange('end_date', value)}
                  placeholder="e.g., March 2024"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Add notes or description"
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={3}
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
                onPress={handleSaveSchoolYear}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Save School Year</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update School Year Modal */}
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
                Update School Year
              </ThemedText>
              <TouchableOpacity onPress={handleCloseUpdateModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Year Name */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>School Year</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.year_name}
                  onChangeText={(value) => handleInputChange('year_name', value)}
                  placeholder="e.g., 2023-2024"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Start Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Start Date</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.start_date}
                  onChangeText={(value) => handleInputChange('start_date', value)}
                  placeholder="e.g., June 2023"
                  placeholderTextColor="#999"
                />
              </View>

              {/* End Date */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>End Date</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.end_date}
                  onChangeText={(value) => handleInputChange('end_date', value)}
                  placeholder="e.g., March 2024"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea, { color: textColor, borderColor: iconColor }]}
                  value={schoolYearData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Add notes or description"
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Status */}
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Status</ThemedText>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: schoolYearData.status === 'active' ? '#4CAF50' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'active')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: schoolYearData.status === 'active' ? 'white' : '#666' }
                    ]}>
                      Active
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: schoolYearData.status === 'inactive' ? '#FF9800' : '#f0f0f0' }
                    ]}
                    onPress={() => handleInputChange('status', 'inactive')}
                  >
                    <ThemedText style={[
                      styles.statusOptionText,
                      { color: schoolYearData.status === 'inactive' ? 'white' : '#666' }
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
                onPress={handleUpdateSchoolYearSave}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.saveButtonGradient}
                >
                  <ThemedText style={styles.saveButtonText}>Update School Year</ThemedText>
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
  // Add School Year Button Styles
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  // School Years List Styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  schoolYearsList: {
    width: '100%',
  },
  schoolYearCard: {
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
  schoolYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  schoolYearIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  schoolYearInfo: {
    flex: 1,
  },
  schoolYearName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  schoolYearDates: {
    fontSize: 14,
    color: '#666',
  },
  schoolYearStatus: {
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
  schoolYearDetails: {
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
    flex: 1,
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
