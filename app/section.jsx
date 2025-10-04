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

export default function SectionScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  // Modal and form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
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

  // Fetch sections from Firestore
  const fetchSections = async () => {
    try {
      setIsLoading(true);
      console.log('Starting to fetch sections...');
      
      // Try a simple query first without ordering
      const sectionsRef = collection(db, 'sections');
      console.log('Collection reference created');
      
      const querySnapshot = await getDocs(sectionsRef);
      console.log('Query executed, got', querySnapshot.size, 'documents');
      
      const sectionsList = [];
      querySnapshot.forEach((doc) => {
        console.log('Processing document:', doc.id, doc.data());
        sectionsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Sections list:', sectionsList);
      setSections(sectionsList);
    } catch (error) {
      console.error('Detailed error fetching sections:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      Alert.alert('Error', `Failed to load sections: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sections when component mounts
  React.useEffect(() => {
    fetchSections();
  }, []);

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
            <ThemedText style={styles.helloText}>Section</ThemedText>
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
               Section Management
             </ThemedText>
             <ThemedText style={[styles.contentSubtitle, { color: iconColor }]}>
               Manage student sections and class groupings
             </ThemedText>
             
             {/* Add Section Button */}
             <TouchableOpacity
               style={styles.addButton}
               onPress={handleAddSection}
             >
               <LinearGradient
                 colors={['#4CAF50', '#45a049']}
                 style={styles.addButtonGradient}
               >
                 <Ionicons name="add" size={24} color="white" />
                 <ThemedText style={styles.addButtonText}>Add Section</ThemedText>
               </LinearGradient>
             </TouchableOpacity>
             
             {/* Sections List */}
             {isLoading ? (
               <View style={styles.loadingContainer}>
                 <ThemedText style={[styles.loadingText, { color: iconColor }]}>
                   Loading sections...
                 </ThemedText>
               </View>
             ) : sections.length > 0 ? (
               <View style={styles.sectionsList}>
                 {sections.map((section) => (
                   <View key={section.id} style={[styles.sectionCard, { backgroundColor: backgroundColor }]}>
                     <View style={styles.sectionHeader}>
                       <View style={styles.sectionIconContainer}>
                         <Ionicons name="people" size={24} color="white" />
                       </View>
                       <View style={styles.sectionInfo}>
                         <ThemedText style={[styles.sectionName, { color: textColor }]}>
                           {section.section_name}
                         </ThemedText>
                         <ThemedText style={[styles.sectionGrade, { color: iconColor }]}>
                           {section.grade_level}
                         </ThemedText>
                       </View>
                       <View style={styles.sectionStatus}>
                         <ThemedText style={[styles.statusText, { color: section.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
                           {section.status}
                         </ThemedText>
                       </View>
                       <TouchableOpacity 
                         style={styles.updateButton}
                         onPress={() => handleUpdateSection(section)}
                       >
                         <Ionicons name="create-outline" size={16} color="#2196F3" />
                         <ThemedText style={styles.updateButtonText}>Update</ThemedText>
                       </TouchableOpacity>
                     </View>
                     <View style={styles.sectionDetails}>
                       <View style={styles.detailRow}>
                         <Ionicons name="person" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Adviser: {section.adviser}
                         </ThemedText>
                       </View>
                       <View style={styles.detailRow}>
                         <Ionicons name="people-outline" size={16} color="#666" />
                         <ThemedText style={[styles.detailText, { color: iconColor }]}>
                           Max Students: {section.max_students}
                         </ThemedText>
                       </View>
                     </View>
                   </View>
                 ))}
               </View>
             ) : (
               <View style={styles.placeholderContainer}>
                 <Ionicons name="people-outline" size={64} color="#666" />
                 <ThemedText style={[styles.placeholderText, { color: iconColor }]}>
                   No sections added yet. Click "Add Section" to get started!
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
