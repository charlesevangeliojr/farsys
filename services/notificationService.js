import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Request notification permissions
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permission');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule a local notification
  async scheduleNotification(title, body, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          badge: 1,
        },
        trigger: null, // Show immediately
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Show notification for new student registration
  async notifyNewRegistration(studentName, studentLrn) {
    return await this.scheduleNotification(
      '🎓 New Student Registration',
      `${studentName} (LRN: ${studentLrn}) has registered and is pending approval.`,
      {
        type: 'student_registration',
        studentName,
        studentLrn,
      }
    );
  }

  // Show notification for registration approval
  async notifyApproval(studentName) {
    return await this.scheduleNotification(
      '✅ Registration Approved',
      `${studentName}'s registration has been approved!`,
      {
        type: 'approval',
        studentName,
      }
    );
  }

  // Show notification for registration rejection
  async notifyRejection(studentName) {
    return await this.scheduleNotification(
      '❌ Registration Rejected',
      `${studentName}'s registration has been rejected.`,
      {
        type: 'rejection',
        studentName,
      }
    );
  }

  // Show notification for pending consultation
  async notifyPendingConsultation(teacherName, purpose, date) {
    return await this.scheduleNotification(
      '⏳ Pending Consultation',
      `Your consultation with ${teacherName} on ${date} is pending approval.`,
      {
        type: 'consultation_pending',
        teacherName,
        purpose,
        date,
      }
    );
  }

  // Show notification for approved consultation
  async notifyApprovedConsultation(teacherName, purpose, date, time) {
    return await this.scheduleNotification(
      '✅ Consultation Approved',
      `Your consultation with ${teacherName} on ${date} at ${time} has been approved!`,
      {
        type: 'consultation_approved',
        teacherName,
        purpose,
        date,
        time,
      }
    );
  }

  // Show notification for new consultation request (for teachers)
  async notifyNewConsultationRequest(studentName, purpose, date, time) {
    return await this.scheduleNotification(
      '📅 New Consultation Request',
      `${studentName} requested a consultation: ${purpose} on ${date} at ${time}`,
      {
        type: 'consultation_request',
        studentName,
        purpose,
        date,
        time,
      }
    );
  }

  // Get notification badge count
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set notification badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear badge count
  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // Dismiss all notifications
  async dismissAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error dismissing notifications:', error);
    }
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { notificationService, NotificationService };

