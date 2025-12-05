// 푸시 알림 서비스
import { messaging } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// VAPID 키 (Firebase Console에서 발급받은 키)
const VAPID_KEY = 'BKEaMLnqCvGpIMgn0Qi8eWq3WgzyHtu-pVVcHkBOJLSLYK3WcZ7lZJI8p7Gja0lHM5MPEL8f9CVJEFcJW02SAXM';

/**
 * 푸시 알림 토큰 요청 및 저장
 */
export async function requestPushPermission(userId) {
  if (!messaging) {
    console.warn('Firebase Messaging이 지원되지 않습니다.');
    return null;
  }

  try {
    // Service Worker 확인
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker를 지원하지 않는 브라우저입니다.');
      return null;
    }

    // 알림 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('푸시 알림 권한이 거부되었습니다.');
      return null;
    }

    // FCM 토큰 가져오기
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      // Firestore에 토큰 저장 (권한 오류는 무시)
      try {
        await updateDoc(doc(db, 'users', userId), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString()
        });
        console.log('푸시 알림 토큰 저장 완료:', token);
      } catch (saveError) {
        // 권한 오류는 경고로만 처리
        if (saveError.code === 'permission-denied' || saveError.message?.includes('Missing or insufficient permissions')) {
          console.warn('⚠️ 푸시 알림 토큰 저장 권한 오류 (Firestore 보안 규칙 확인 필요):', saveError.message);
        } else {
          console.warn('푸시 알림 토큰 저장 실패:', saveError);
        }
      }
      return token;
    }
    
    return null;
  } catch (error) {
    // Service Worker 관련 오류는 경고로만 처리
    if (error.code === 'messaging/failed-service-worker-registration' || 
        error.message?.includes('ServiceWorker') ||
        error.message?.includes('404')) {
      console.warn('⚠️ 푸시 알림 설정 실패 (Service Worker 없음). 앱은 정상 작동합니다.');
      return null;
    }
    console.error('푸시 알림 토큰 요청 오류:', error);
    return null;
  }
}

/**
 * 병원 스태프들에게 푸시 알림 전송
 */
export async function sendNotificationToClinicStaff(clinicId, title, body, data = {}) {
  try {
    // clinicStaff에서 해당 병원의 모든 스태프 찾기
    const staffQuery = query(
      collection(db, 'clinicStaff'),
      where('clinicId', '==', clinicId),
      where('isActive', '==', true)
    );

    const staffSnapshot = await getDocs(staffQuery);
    const tokens = [];
    const staffUserIds = [];

    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data();
      staffUserIds.push(staffData.userId);
      const userDoc = await getDoc(doc(db, 'users', staffData.userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      }
    }

    // FCM Admin SDK를 사용해야 하므로, 여기서는 Firestore에 알림 데이터 저장
    // 실제 푸시는 백엔드에서 처리하거나 Cloud Functions 사용
    const notificationData = {
      type: 'clinic_notification',
      clinicId,
      title,
      body,
      data,
      tokens,
      staffUserIds, // 스태프 userId 목록 (대시보드 알림용)
      createdAt: new Date().toISOString(),
      sent: false,
      read: false // 읽음 상태 추가
    };

    // 알림 큐에 저장 (FCM 토큰 유무와 관계없이 항상 저장)
    await addDoc(collection(db, 'notificationQueue'), notificationData);

    if (tokens.length === 0) {
      console.log('📋 알림 저장됨 (푸시 토큰 없음 - 대시보드에서 확인 가능)');
      return { success: true, tokensCount: 0, message: '알림이 저장되었습니다 (푸시 토큰 없음)' };
    }

    console.log(`푸시 알림 큐에 추가: ${tokens.length}명에게 전송 예정`);
    return { success: true, tokensCount: tokens.length };

  } catch (error) {
    console.error('병원 스태프 푸시 알림 전송 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 보호자에게 푸시 알림 전송
 */
export async function sendNotificationToGuardian(userId, title, body, data = {}) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }
    
    const userData = userDoc.data();
    const token = userData.fcmToken;
    
    if (!token) {
      console.warn('사용자의 푸시 알림 토큰이 없습니다.');
      return { success: false, message: '푸시 알림 토큰이 없습니다.' };
    }
    
    // 알림 큐에 저장
    const notificationData = {
      type: 'guardian_notification',
      userId,
      title,
      body,
      data,
      token,
      createdAt: new Date().toISOString(),
      sent: false
    };
    
    await addDoc(collection(db, 'notificationQueue'), notificationData);
    
    console.log('보호자 푸시 알림 큐에 추가');
    return { success: true };
    
  } catch (error) {
    console.error('보호자 푸시 알림 전송 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 포그라운드 메시지 수신 처리
 */
export function setupForegroundMessageHandler(callback) {
  if (!messaging) return null;
  
  return onMessage(messaging, (payload) => {
    console.log('포그라운드 메시지 수신:', payload);
    if (callback) {
      callback(payload);
    }
  });
}

