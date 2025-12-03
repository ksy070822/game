/**
 * Firestore 데이터베이스 서비스
 * localStorage를 대체하여 클라우드 데이터 저장
 */
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// ============ 컬렉션 이름 상수 ============
const COLLECTIONS = {
  USERS: 'users',
  PETS: 'pets',
  DIAGNOSES: 'diagnoses',
  BOOKINGS: 'bookings',
  CLINIC_RESULTS: 'clinicResults',
  DAILY_LOGS: 'dailyLogs',
  RECORDS: 'records', // OCR 스캔 문서
};

// ============ 사용자 관련 ============
export const userService = {
  // 사용자 생성/업데이트
  async saveUser(userId, userData) {
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, userId), {
        ...userData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('사용자 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 사용자 조회
  async getUser(userId) {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('사용자 조회 오류:', error);
      return { success: false, error };
    }
  },

  // 이메일로 사용자 찾기
  async findUserByEmail(email) {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('사용자 검색 오류:', error);
      return { success: false, error };
    }
  }
};

// ============ 반려동물 관련 ============
export const petService = {
  // 반려동물 추가
  async addPet(userId, petData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.PETS), {
        ...petData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('반려동물 추가 오류:', error);
      return { success: false, error };
    }
  },

  // 사용자의 모든 반려동물 조회
  async getPetsByUser(userId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PETS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const pets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: pets };
    } catch (error) {
      console.error('반려동물 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 반려동물 정보 업데이트
  async updatePet(petId, petData) {
    try {
      await updateDoc(doc(db, COLLECTIONS.PETS, petId), {
        ...petData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('반려동물 업데이트 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물 삭제
  async deletePet(petId) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PETS, petId));
      return { success: true };
    } catch (error) {
      console.error('반려동물 삭제 오류:', error);
      return { success: false, error };
    }
  }
};

// ============ AI 진단 관련 ============
export const diagnosisService = {
  // 진단 기록 저장
  async saveDiagnosis(diagnosisData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.DIAGNOSES), {
        ...diagnosisData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('진단 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물의 진단 기록 조회
  async getDiagnosesByPet(petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const diagnoses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: diagnoses };
    } catch (error) {
      console.error('진단 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 사용자의 모든 진단 기록 조회
  async getDiagnosesByUser(userId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const diagnoses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: diagnoses };
    } catch (error) {
      console.error('진단 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 최근 진단 기록 가져오기
  async getLatestDiagnosis(petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('최근 진단 조회 오류:', error);
      return { success: false, error };
    }
  }
};

// ============ 병원 예약 관련 ============
export const bookingService = {
  // 예약 생성
  async createBooking(bookingData) {
    try {
      const bookingDoc = {
        ...bookingData,
        status: bookingData.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // 타임스탬프를 ISO 문자열로도 보관 (조회 편의성)
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString()
      };
      
      console.log('[예약 생성] Firestore 저장 시작:', {
        clinicId: bookingDoc.clinicId,
        clinicName: bookingDoc.clinicName,
        date: bookingDoc.date,
        time: bookingDoc.time
      });
      
      const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingDoc);
      
      console.log('[예약 생성] ✅ Firestore 저장 성공:', docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('[예약 생성] ❌ Firestore 저장 오류:', error);
      console.error('[예약 생성] 오류 상세:', {
        message: error.message,
        code: error.code,
        bookingData: {
          clinicId: bookingData.clinicId,
          clinicName: bookingData.clinicName,
          date: bookingData.date
        }
      });
      return { success: false, error: error.message || error };
    }
  },

  // 예약 상태 업데이트
  async updateBookingStatus(bookingId, status) {
    try {
      await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
        status,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('예약 상태 업데이트 오류:', error);
      return { success: false, error };
    }
  },

  // 사용자의 예약 목록 조회
  async getBookingsByUser(userId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: bookings };
    } catch (error) {
      console.error('예약 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 병원의 예약 목록 조회 (병원 모드용)
  async getBookingsByClinic(clinicId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('clinicId', '==', clinicId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: bookings };
    } catch (error) {
      console.error('병원 예약 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 오늘의 예약 조회
  async getTodayBookings(clinicId) {
    const today = new Date().toISOString().split('T')[0];
    try {
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('clinicId', '==', clinicId),
        where('date', '==', today)
      );
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: bookings };
    } catch (error) {
      console.error('오늘 예약 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 실시간 예약 구독 (병원 모드용)
  subscribeToBookings(clinicId, callback) {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('clinicId', '==', clinicId),
      orderBy('date', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(bookings);
    });
  }
};

// ============ 진료 결과 관련 (병원 모드) ============
export const clinicResultService = {
  // 진료 결과 저장
  async saveResult(resultData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CLINIC_RESULTS), {
        ...resultData,
        createdAt: serverTimestamp()
      });
      
      // 보호자에게 푸시 알림 전송
      if (resultData.userId) {
        try {
          const { sendNotificationToGuardian } = await import('./pushNotificationService');
          const clinicName = resultData.clinicName || resultData.hospitalName || '병원';
          await sendNotificationToGuardian(
            resultData.userId,
            `${clinicName}에서 진료한 결과가 전송되었습니다`,
            `${resultData.petName || '반려동물'}의 진료 결과를 확인해주세요.`,
            {
              type: 'treatment_completed',
              resultId: docRef.id,
              bookingId: resultData.bookingId,
              petName: resultData.petName,
              clinicName: clinicName,
              url: '/records'
            }
          );
          console.log('✅ 보호자 푸시 알림 전송 완료');
        } catch (pushError) {
          console.warn('푸시 알림 전송 실패 (진료 결과는 저장됨):', pushError);
        }
      }
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('진료 결과 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 예약에 대한 진료 결과 조회
  async getResultByBooking(bookingId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.CLINIC_RESULTS),
        where('bookingId', '==', bookingId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('진료 결과 조회 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물의 진료 결과 조회
  async getResultsByPet(petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.CLINIC_RESULTS),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: results };
    } catch (error) {
      console.error('진료 결과 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 진료 결과를 보호자에게 공유 (푸시 알림 전송)
  async shareResult(resultId) {
    try {
      const resultRef = doc(db, COLLECTIONS.CLINIC_RESULTS, resultId);
      const snap = await getDoc(resultRef);
      if (!snap.exists()) {
        return { success: false, error: new Error('결과를 찾을 수 없습니다.') };
      }
      const data = snap.data();
      if (!data.userId) {
        return { success: false, error: new Error('보호자 정보를 찾을 수 없습니다.') };
      }

      // 푸시 알림 전송
      const { sendNotificationToGuardian } = await import('./pushNotificationService');
      const clinicName = data.clinicName || data.hospitalName || '병원';
      await sendNotificationToGuardian(
        data.userId,
        `${clinicName}에서 진료 결과를 보내왔습니다`,
        `${data.petName || '반려동물'}의 진료 결과를 확인해주세요.`,
        {
          type: 'treatment_completed',
          resultId,
          bookingId: data.bookingId,
          petName: data.petName,
          clinicName,
          url: '/records'
        }
      );

      // 공유 상태 업데이트
      await updateDoc(resultRef, {
        sharedToGuardian: true,
        sharedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('진료 결과 공유 오류:', error);
      return { success: false, error };
    }
  }
};

// ============ 일일 케어 로그 관련 ============
export const dailyLogService = {
  // 케어 로그 저장
  async saveLog(petId, date, logData) {
    try {
      const docId = `${petId}_${date}`;
      await setDoc(doc(db, COLLECTIONS.DAILY_LOGS, docId), {
        petId,
        date,
        ...logData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('케어 로그 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 특정 날짜 케어 로그 조회
  async getLog(petId, date) {
    try {
      const docId = `${petId}_${date}`;
      const docSnap = await getDoc(doc(db, COLLECTIONS.DAILY_LOGS, docId));
      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('케어 로그 조회 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물의 모든 케어 로그 조회
  async getLogsByPet(petId, limitCount = 30) {
    try {
      const q = query(
        collection(db, COLLECTIONS.DAILY_LOGS),
        where('petId', '==', petId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => doc.data());
      return { success: true, data: logs };
    } catch (error) {
      console.error('케어 로그 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  }
};

// ============ OCR 문서 기록 관련 ============
export const recordService = {
  // OCR 문서 저장
  async saveRecord(recordData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.RECORDS), {
        ...recordData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('문서 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물의 문서 조회
  async getRecordsByPet(petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.RECORDS),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: records };
    } catch (error) {
      console.error('문서 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  }
};

// ============ 유틸리티 ============
// localStorage에서 Firestore로 데이터 마이그레이션 헬퍼
export const migrationHelper = {
  async migrateFromLocalStorage(userId) {
    try {
      // 반려동물 마이그레이션
      const localPets = JSON.parse(localStorage.getItem('petMedical_pets') || '[]');
      for (const pet of localPets) {
        await petService.addPet(userId, pet);
      }

      // 진단 기록 마이그레이션
      const localDiagnoses = JSON.parse(localStorage.getItem('petMedical_diagnoses') || '[]');
      for (const diagnosis of localDiagnoses) {
        await diagnosisService.saveDiagnosis({ ...diagnosis, userId });
      }

      // 예약 마이그레이션
      const localBookings = JSON.parse(localStorage.getItem('petMedical_bookings') || '[]');
      for (const booking of localBookings) {
        await bookingService.createBooking({ ...booking, userId });
      }

      console.log('마이그레이션 완료!');
      return { success: true };
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      return { success: false, error };
    }
  }
};

export default {
  userService,
  petService,
  diagnosisService,
  bookingService,
  clinicResultService,
  dailyLogService,
  recordService,
  migrationHelper
};
