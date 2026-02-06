import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { db } from '../firebase.js';
import { useThemeColor } from '../hooks/use-theme-color.js';
import notificationService from '../services/notificationService.js';

const { height } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();

  // Running clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all'); // 'all', 'unread', 'read'
  const [notifiedNotifications, setNotifiedNotifications] = useState(new Set());
  const [consultations, setConsultations] = useState([]);
  
  // Notification listeners
  const notificationListener = useRef();
  const responseListener = useRef();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize push notifications
  useEffect(() => {
    // Request notification permissions
    notificationService.requestPermissions();

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Refresh notification count
      fetchNotificationCount();
    });

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Open notifications modal when tapped
      handleOpenNotifications();
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Fetch unread notifications count
  const fetchNotificationCount = async () => {
    try {
      if (!user) return;

      const notificationsRef = collection(db, 'notifications');
      let q;

      // Fetch ONLY this user's notifications without isRead filter to avoid composite index
      if (user.userType === 'student') {
        q = query(notificationsRef, where('student_id', '==', user.id));
      } else if (user.userType === 'teacher') {
        q = query(notificationsRef, where('teacher_id', '==', user.id));
      } else {
        // Admin or others: fetch all
        q = query(notificationsRef);
      }

      const snapshot = await getDocs(q);
      let unread = 0;
      snapshot.forEach(d => {
        const n = d.data();
        if (!n) return;
        // Exclude teacher-only types for students
        if (user.userType === 'student' && n.type === 'consultation_request') return;
        // Exclude student-only types for teachers if desired (keep only request)
        if (user.userType === 'teacher' && (n.type === 'consultation_pending' || n.type === 'consultation_approved' || n.type === 'consultation_completed')) return;
        if (n.isRead === false) unread += 1;
      });

      setNotificationCount(unread);
      await notificationService.setBadgeCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch consultations (same as make_consultation.jsx)
  const fetchConsultations = async () => {
    try {
      if (!user) return;

      const schedulesRef = collection(db, 'schedules');
      const querySnapshot = await getDocs(schedulesRef);
      
      const schedulesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Get consultations for current user (student or teacher)
        if (user.userType === 'student' && data.student_id === user.id) {
          schedulesList.push({
            id: doc.id,
            ...data
          });
        } else if (user.userType === 'teacher' && data.teacher_id === user.id) {
          schedulesList.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      setConsultations(schedulesList);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  };

  // Check notifications list and raise local notifications to StatusBar
  const checkNotificationAlerts = async (sourceNotifications) => {
    if (!user) return;
    const list = Array.isArray(sourceNotifications) ? sourceNotifications : notifications;
    if (!list || !list.length) return;

    for (const notif of list) {
      // Skip already-read notifications — do not show alert for these
      if (notif.isRead === true) continue;

      // ONLY show if ikaw ang ni-notify — notification must be for the current user
      const isForStudent = notif.student_id && notif.student_id === user.id && user.userType === 'student';
      const isForTeacher = notif.teacher_id && notif.teacher_id === user.id && user.userType === 'teacher';
      if (!isForStudent && !isForTeacher) continue;

      const notificationKey = `notif_${notif.id}_${notif.type}`;
      if (notifiedNotifications.has(notificationKey)) continue;

      // Teacher gets notified of new consultation requests (only when isRead === false)
      if (notif.type === 'consultation_request' && user.userType === 'teacher') {
        await notificationService.notifyNewConsultationRequest(
          notif.studentName || (notif.message ? notif.message.split(' ')[0] : 'Student'),
          notif.message || 'New consultation request',
          notif.consultation_date || '',
          notif.consultation_time || '',
          notif.id
        );
        setNotifiedNotifications(prev => new Set([...prev, notificationKey]));
        continue;
      }

      // Student gets notified for pending or approved (only when isRead === false)
      if (notif.type === 'consultation_pending' && user.userType === 'student') {
        await notificationService.notifyPendingConsultation(
          notif.teacher_name || 'Teacher',
          notif.message || 'Consultation pending',
          notif.consultation_date || '',
          notif.id
        );
        setNotifiedNotifications(prev => new Set([...prev, notificationKey]));
        continue;
      }

      if (notif.type === 'consultation_approved' && user.userType === 'student') {
        await notificationService.notifyApprovedConsultation(
          notif.teacher_name || 'Teacher',
          notif.message || 'Consultation approved',
          notif.consultation_date || '',
          notif.consultation_time || '',
          notif.id
        );
        setNotifiedNotifications(prev => new Set([...prev, notificationKey]));
        continue;
      }
    }
  };

  // Check consultations and send notifications (EXACT same as make_consultation.jsx)
  const checkConsultationNotifications = async () => {
    if (!user || !consultations.length) return;

    for (const consultation of consultations) {
      // ONLY show if para sayo — consultation must be for the current user
      const isForStudent = consultation.student_id === user.id && user.userType === 'student';
      const isForTeacher = consultation.teacher_id === user.id && user.userType === 'teacher';
      if (!isForStudent && !isForTeacher) continue;

      const notificationKey = `${consultation.id}_${consultation.status}`;
      
      // Skip if already notified for this status
      if (notifiedNotifications.has(notificationKey)) continue;

      // Notify student about pending consultations only (approved comes from Firestore)
      if (consultation.status === 'pending' && user.userType === 'student') {
        await notificationService.notifyPendingConsultation(
          consultation.teacher_name,
          consultation.purpose,
          consultation.consultation_date
        );
        setNotifiedNotifications(prev => new Set([...prev, notificationKey]));
      }
      // Teacher new request & student approved: handled by checkNotificationAlerts (Firestore)
      // to avoid duplicate notifications
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotificationCount();
    fetchNotifications();
    fetchConsultations();
  }, [user]);

  // Trigger notification alerts when notifications update (status bar alerts)
  useEffect(() => {
    if (!user || !notifications.length) return;
    checkNotificationAlerts();
  }, [notifications, user]);

  // Trigger consultation notifications when consultations update (same as make_consultation.jsx)
  useEffect(() => {
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

  // Get user's name based on user type
  const getUserName = () => {
    if (!user) return '';
    
    if (user.userType === 'student') {
      return user.first_name || 'Student';
    } else if (user.userType === 'teacher') {
      return user.firstname || 'Teacher';
    } else if (user.userType === 'admin') {
      return user.firstname || 'Admin';
    }
    
    return '';
  };

  // Format date and time
  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return currentTime.toLocaleDateString('en-US', options);
  };

  const getFormattedTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const allMenuOptions = [
    {
      id: 1,
      title: 'Student Registration Request',
      icon: 'person-add-outline',
      color: '#4CAF50',
      allowedUserTypes: ['admin', 'teacher'],
    },
    {
      id: 2,
      title: 'Teacher Account',
      icon: 'school-outline',
      color: '#2196F3',
      allowedUserTypes: ['admin'],
    },
    {
      id: 3,
      title: 'School Year',
      icon: 'calendar-outline',
      color: '#FF9800',
      allowedUserTypes: ['admin'],
    },
    {
      id: 4,
      title: 'Section',
      icon: 'people-outline',
      color: '#9C27B0',
      allowedUserTypes: ['admin'],
    },
    {
      id: 5,
      title: 'Consultation Request',
      icon: 'chatbubbles-outline',
      color: '#E91E63',
      allowedUserTypes: ['admin', 'teacher'],
    },
    {
      id: 7,
      title: 'Settings',
      icon: 'settings-outline',
      color: '#795548',
      allowedUserTypes: ['admin', 'teacher', 'student'],
    },
    {
      id: 8,
      title: 'Developer',
      icon: 'code-outline',
      color: '#607D8B',
      allowedUserTypes: ['admin', 'teacher', 'student'],
    },
    {
      id: 9,
      title: 'Make Consultation',
      icon: 'chatbubble-ellipses-outline',
      color: '#4CAF50',
      allowedUserTypes: ['student','admin'],
    },
  ];

  // Filter menu options based on user type
  const menuOptions = allMenuOptions.filter(option => {
    if (!user || !user.userType) return false;
    return option.allowedUserTypes.includes(user.userType);
  });

  const handleMenuPress = (option) => {
    console.log(`Selected: ${option.title}`);
    
    // Navigate to specific screens based on the option
    switch (option.id) {
      case 1: // Student Registration Request
        router.push('/registration_request');
        break;
      case 2: // Teacher Account
        router.push('/teacher_account');
        break;
      case 3: // School Year
        router.push('/school_year');
        break;
      case 4: // Section
        router.push('/section');
        break;
      case 9: // Make Consultation
        router.push('/make_consultation');
        break;
      case 5: // Consultation Request
        router.push('/consultation_request');
        break;
      case 7: // Settings
        router.push('/settings');
        break;
      case 8: // Developer
        router.push('/developer');
        break;
      default:
        // For other options, just log for now
        console.log(`Navigation for ${option.title} not implemented yet`);
        break;
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {}
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleOpenNotifications = async () => {
    setShowNotificationModal(true);
    await fetchNotifications();
  };

  const fetchNotifications = async () => {
    // Fetch ONLY notifications for the current logged-in user (user-specific read/unread status)
    try {
      if (!user) return;

      const notificationsRef = collection(db, 'notifications');
      let q;
      
      // Filter notifications based on user type - USER SPECIFIC!
      if (user.userType === 'student') {
        // Students see ONLY their notifications (student_id match)
        q = query(
          notificationsRef, 
          where('student_id', '==', user.id)
        );
        console.log(`Fetching notifications for student: ${user.id}`);
      } else if (user.userType === 'teacher') {
        // Teachers see ONLY their notifications (teacher_id match)
        q = query(
          notificationsRef, 
          where('teacher_id', '==', user.id)
        );
        console.log(`Fetching notifications for teacher: ${user.id}`);
      } else {
        // Admin or other users see all notifications
        q = query(notificationsRef);
        console.log('Fetching all notifications (admin)');
      }
      
      const querySnapshot = await getDocs(q);
      
      let notificationsList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data) return;
        notificationsList.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to JavaScript timestamp for sorting
          timestamp: data.createdAt?.seconds || 0
        });
      });
      // Filter by allowed types per user
      if (user.userType === 'student') {
        notificationsList = notificationsList.filter(n => n.type !== 'consultation_request');
      } else if (user.userType === 'teacher') {
        notificationsList = notificationsList.filter(n => n.type === 'consultation_request' || n.type === 'consultation_completed');
      }
      
      // Sort by timestamp in descending order (newest first)
      notificationsList.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`Loaded ${notificationsList.length} notifications for user ${user.id}`);
      setNotifications(notificationsList);
      // Immediately attempt to raise alerts with the freshly fetched list
      await checkNotificationAlerts(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });

      // Dismiss from lock screen / notification tray when marked as read
      await notificationService.dismissNotificationForFirestoreId(notificationId);
      
      // Refresh notifications and count
      await fetchNotifications();
      await fetchNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getFilteredNotifications = () => {
    // Filter the current user's notifications by read/unread status
    if (notificationFilter === 'unread') {
      return notifications.filter(n => !n.isRead); // Show only UNREAD notifications of this user
    } else if (notificationFilter === 'read') {
      return notifications.filter(n => n.isRead); // Show only READ notifications of this user
    }
    return notifications; // Show ALL notifications of this user
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
            <View style={styles.headerRow}>
              <ThemedText style={styles.helloText}>
                {user ? `Welcome ${user.userType === 'student' ? 'Student' : user.userType === 'teacher' ? 'Teacher' : user.userType === 'admin' ? '' : 'User'} ${getUserName()}!` : ''}
              </ThemedText>
            </View>
            <View style={styles.clockContainer}>
              <View style={styles.dateTimeRow}>
                <Ionicons name="calendar-outline" size={16} color="white" style={styles.clockIcon} />
                <ThemedText style={styles.dateText}>{getFormattedDate()}</ThemedText>
              </View>
              <View style={styles.dateTimeRow}>
                <Ionicons name="time-outline" size={16} color="white" style={styles.clockIcon} />
                <ThemedText style={styles.timeText}>{getFormattedTime()}</ThemedText>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={handleOpenNotifications}>
            <Ionicons name="notifications-outline" size={28} color="white" />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* White Card Form Section */}
      <View style={[styles.formCard, { backgroundColor: backgroundColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridContainer}>
            {menuOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.gridCard, { 
                  backgroundColor: backgroundColor,
                  borderColor: isDark ? '#fff' : '#f0f0f0'
                }]}
                onPress={() => handleMenuPress(option)}
              >
                <View style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon} size={28} color="white" />
                  </View>
                  <ThemedText style={[styles.cardTitle, { color: textColor }]}>
                    {option.title}
                  </ThemedText>
                </View>
                <View style={styles.cardFooter}>
                  <ThemedText style={styles.cardSubtitle}>
                    Tap to access
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={16} color="#666" style={styles.arrowIcon} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Theme Toggle Button */}
      <TouchableOpacity
        style={[styles.themeToggleButton, { bottom: insets.bottom + 20, right: 80 }]}
        onPress={handleToggleTheme}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={24}
          color="white"
        />
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, { bottom: insets.bottom + 20 }]}
        onPress={handleLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={24}
          color="white"
        />
      </TouchableOpacity>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <View style={[styles.notificationModalContainer, { backgroundColor: backgroundColor }]}>
            {/* Modal Header */}
            <View style={[styles.notificationModalHeader, { borderBottomColor: isDark ? '#fff' : '#f0f0f0' }]}>
              <ThemedText style={[styles.notificationModalTitle, { color: textColor }]}>
                Notifications
              </ThemedText>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)} style={[styles.closeModalButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                <Ionicons name="close" size={24} color={iconColor} />
              </TouchableOpacity>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterButtonsContainer}>
              <TouchableOpacity 
                style={[
                  styles.filterButton, 
                  notificationFilter === 'all' && styles.filterButtonActive,
                  { borderColor: isDark ? '#fff' : '#8B1538' }
                ]}
                onPress={() => setNotificationFilter('all')}
              >
                <ThemedText style={[
                  styles.filterButtonText,
                  { color: notificationFilter === 'all' ? '#fff' : textColor }
                ]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterButton, 
                  notificationFilter === 'unread' && styles.filterButtonActive,
                  { borderColor: isDark ? '#fff' : '#8B1538' }
                ]}
                onPress={() => setNotificationFilter('unread')}
              >
                <ThemedText style={[
                  styles.filterButtonText,
                  { color: notificationFilter === 'unread' ? '#fff' : textColor }
                ]}>
                  Unread
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterButton, 
                  notificationFilter === 'read' && styles.filterButtonActive,
                  { borderColor: isDark ? '#fff' : '#8B1538' }
                ]}
                onPress={() => setNotificationFilter('read')}
              >
                <ThemedText style={[
                  styles.filterButtonText,
                  { color: notificationFilter === 'read' ? '#fff' : textColor }
                ]}>
                  Read
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {getFilteredNotifications().length > 0 ? (
                getFilteredNotifications().map((notification) => (
                  <TouchableOpacity 
                    key={notification.id} 
                    style={[styles.notificationItem, { 
                      backgroundColor: notification.isRead ? backgroundColor : (isDark ? '#2a2a2a' : '#FFF3E0'),
                      borderColor: isDark ? '#fff' : '#f0f0f0'
                    }]}
                    onPress={() => !notification.isRead && handleMarkAsRead(notification.id)}
                    activeOpacity={notification.isRead ? 1 : 0.7}
                  >
                    <View style={[styles.notificationIconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                      {notification.type === 'student_registration' && notification.studentProfilePicture ? (
                        <Image 
                          source={{ uri: notification.studentProfilePicture }} 
                          style={styles.notificationProfileImage}
                        />
                      ) : (
                        <Ionicons 
                          name={
                            notification.type === 'student_registration' ? 'person-add' :
                            notification.type === 'approval' ? 'checkmark-circle' :
                            notification.type === 'rejection' ? 'close-circle' :
                            notification.type === 'consultation_request' ? 'chatbubbles' :
                            notification.type === 'consultation_pending' ? 'time' :
                            notification.type === 'consultation_approved' ? 'checkmark-done-circle' :
                            'notifications'
                          } 
                          size={24} 
                          color={
                            notification.type === 'student_registration' ? '#2196F3' :
                            notification.type === 'approval' ? '#4CAF50' :
                            notification.type === 'rejection' ? '#F44336' :
                            notification.type === 'consultation_request' ? '#E91E63' :
                            notification.type === 'consultation_pending' ? '#FF9800' :
                            notification.type === 'consultation_approved' ? '#4CAF50' :
                            '#FF9800'
                          }
                        />
                      )}
                    </View>
                    <View style={styles.notificationContent}>
                      <ThemedText style={[styles.notificationTitle, { color: textColor }]}>
                        {notification.title}
                      </ThemedText>
                      <ThemedText style={[styles.notificationMessage, { color: iconColor }]}>
                        {notification.message}
                      </ThemedText>
                      {notification.createdAt && (
                        <ThemedText style={styles.notificationTime}>
                          {new Date(notification.createdAt.seconds * 1000).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </ThemedText>
                      )}
                    </View>
                    {!notification.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={64} color={iconColor} />
                  <ThemedText style={[styles.emptyNotificationsText, { color: iconColor }]}>
                    {notificationFilter === 'unread' ? 'No unread notifications' :
                     notificationFilter === 'read' ? 'No read notifications' :
                     'No notifications yet'}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  helloText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  signInText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  clockContainer: {
    marginTop: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clockIcon: {
    marginRight: 8,
  },
  dateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  timeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  gridCard: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
  cardContent: {
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginRight: 5,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  themeToggleButton: {
    position: 'absolute',
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
  logoutButton: {
    position: 'absolute',
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4444',
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
  notificationButton: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B1538',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationModalContainer: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 20,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#8B1538',
    borderColor: '#8B1538',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsList: {
    flex: 1,
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
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
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  notificationProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsText: {
    fontSize: 16,
    marginTop: 16,
  },
});
