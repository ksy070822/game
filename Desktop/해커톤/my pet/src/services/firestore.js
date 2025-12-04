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
  PRE_QUESTIONNAIRES: 'preQuestionnaires',  // 🔥 사전 문진
  MEDICAL_RECORDS: 'medicalRecords',  // 🔥 환자 기록 (진료 기록)
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
      // 권한 오류는 경고로 처리하고 계속 진행
      if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ 사용자 저장 권한 오류 (Firestore 보안 규칙 확인 필요):', error.message);
        // 로그인은 계속 진행 가능하도록 성공으로 처리
        return { success: true, warning: '사용자 정보 저장 실패 (권한 오류)' };
      }
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
      // 권한 오류는 경고로 처리하고 빈 데이터 반환
      if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ 사용자 조회 권한 오류 (Firestore 보안 규칙 확인 필요):', error.message);
        return { success: false, data: null, warning: '사용자 정보 조회 실패 (권한 오류)' };
      }
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
      // 복합 인덱스 필요 없이 userId로만 조회 후 JS에서 정렬
      const q = query(
        collection(db, COLLECTIONS.PETS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const pets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt 기준 내림차순 정렬
      pets.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
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

// Firestore에 저장하기 전 undefined 값을 재귀적으로 제거하는 헬퍼 함수
function removeUndefinedValues(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const diagnosisService = {
  // 진단 기록 저장
  async saveDiagnosis(diagnosisData) {
    try {
      // 🔥 필수 필드 검증
      if (!diagnosisData.petId) {
        throw new Error('petId는 필수 필드입니다.');
      }
      if (!diagnosisData.ownerId && !diagnosisData.userId) {
        throw new Error('ownerId 또는 userId는 필수 필드입니다.');
      }

      // 🔥 저장 데이터 구조화 (clinicId, ownerId, petId 보장)
      const docData = {
        ...diagnosisData,
        clinicId: diagnosisData.clinicId ?? null,  // 병원 ID (예약 시 설정)
        ownerId: diagnosisData.ownerId || diagnosisData.userId,  // 보호자 UID
        petId: diagnosisData.petId,  // 펫 ID
        createdAt: serverTimestamp()
      };

      // undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
      const cleanedData = removeUndefinedValues(docData);

      const docRef = await addDoc(collection(db, COLLECTIONS.DIAGNOSES), cleanedData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('진단 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 반려동물의 진단 기록 조회
  async getDiagnosesByPet(petId) {
    try {
      // 복합 인덱스 필요 없이 petId로만 조회 후 JS에서 정렬
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('petId', '==', petId)
      );
      const querySnapshot = await getDocs(q);
      const diagnoses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt 기준 내림차순 정렬
      diagnoses.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      return { success: true, data: diagnoses };
    } catch (error) {
      console.error('진단 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 사용자의 모든 진단 기록 조회
  async getDiagnosesByUser(userId) {
    try {
      // 복합 인덱스 필요 없이 userId로만 조회 후 JS에서 정렬
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const diagnoses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt 기준 내림차순 정렬
      diagnoses.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      return { success: true, data: diagnoses };
    } catch (error) {
      console.error('진단 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 🔥 병원 모드: 특정 환자의 진단 기록 조회 (clinicId 기준)
  async getDiagnosesByClinicAndPatient(clinicId, ownerId, petId) {
    try {
      // 복합 인덱스 필요 없이 조회 후 JS에서 정렬
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('clinicId', '==', clinicId),
        where('ownerId', '==', ownerId),
        where('petId', '==', petId)
      );
      const querySnapshot = await getDocs(q);
      const diagnoses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt 기준 내림차순 정렬
      diagnoses.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      return { success: true, data: diagnoses };
    } catch (error) {
      console.error('병원 진단 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 최근 진단 기록 가져오기
  async getLatestDiagnosis(petId) {
    try {
      // 복합 인덱스 필요 없이 petId로만 조회 후 JS에서 정렬하여 첫 번째 반환
      const q = query(
        collection(db, COLLECTIONS.DIAGNOSES),
        where('petId', '==', petId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const diagnoses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // createdAt 기준 내림차순 정렬
        diagnoses.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
        return { success: true, data: diagnoses[0] };
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
  async updateBookingStatus(bookingIdOrDocId, status) {
    try {
      const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);

      // 1차 시도: 이 값을 "문서 ID"라고 가정
      let targetRef = doc(db, COLLECTIONS.BOOKINGS, bookingIdOrDocId);
      let snap = await getDoc(targetRef);

      // 문서가 없으면 → 예전 방식 bookingId 필드로 저장된 것일 수 있음
      if (!snap.exists()) {
        console.warn(
          '[예약 상태 업데이트] 문서 ID로는 예약을 찾을 수 없음, bookingId 필드로 조회 시도:',
          bookingIdOrDocId
        );

        const q = query(bookingsRef, where('bookingId', '==', bookingIdOrDocId));
        const qs = await getDocs(q);

        if (qs.empty) {
          throw new Error(
            `해당 ID 또는 bookingId로 예약을 찾을 수 없습니다: ${bookingIdOrDocId}`
          );
        }

        // bookingId 가 같은 문서 중 첫 번째 문서 사용
        targetRef = qs.docs[0].ref;
      }

      await updateDoc(targetRef, {
        status,
        updatedAt: serverTimestamp()
      });

      console.log('[예약 상태 업데이트] 성공:', bookingIdOrDocId, '→', status);
      return { success: true };
    } catch (error) {
      console.error('예약 상태 업데이트 오류:', error);
      return { success: false, error };
    }
  },

  // 사용자의 예약 목록 조회
  async getBookingsByUser(userId) {
    try {
      // 복합 인덱스 필요 없이 userId로만 조회 후 JS에서 정렬
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt 기준 내림차순 정렬
      bookings.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      return { success: true, data: bookings };
    } catch (error) {
      console.error('예약 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 병원의 예약 목록 조회 (병원 모드용)
  async getBookingsByClinic(clinicId) {
    try {
      // 인덱스 에러 방지: orderBy 제거
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('clinicId', '==', clinicId)
      );
      const querySnapshot = await getDocs(q);
      let bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 클라이언트에서 날짜순 정렬
      bookings.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      // 배열 직접 반환 (ClinicDashboard 호환성)
      return bookings;
    } catch (error) {
      console.error('병원 예약 조회 오류:', error);
      // 에러 시 빈 배열 반환
      return [];
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
      console.log('🔍 [saveResult] 입력 데이터:', {
        clinicId: resultData.clinicId,
        userId: resultData.userId,
        ownerId: resultData.ownerId,
        petId: resultData.petId,
        petIdType: typeof resultData.petId,
        bookingId: resultData.bookingId,
        visitDate: resultData.visitDate
      });

      // 🔥 필수 필드 검증
      if (!resultData.clinicId) {
        throw new Error('clinicId는 필수 필드입니다.');
      }
      if (!resultData.userId && !resultData.ownerId) {
        console.warn('⚠️ userId 또는 ownerId가 없습니다. 보호자 정보를 확인하세요.');
      }
      if (!resultData.petId) {
        console.warn('⚠️ petId가 없습니다. 펫 정보를 확인하세요.');
      }

      // 🔥 저장 데이터 구조화 (userId와 ownerId 둘 다 저장)
      const docData = {
        ...resultData,
        clinicId: resultData.clinicId,  // 병원 ID (필수)
        userId: resultData.userId || resultData.ownerId,  // 보호자 UID (하위 호환)
        ownerId: resultData.ownerId || resultData.userId,  // 보호자 UID (신규 필드)
        petId: resultData.petId,  // 펫 ID
        createdAt: serverTimestamp()
      };

      console.log('💾 [saveResult] Firestore 저장 직전 payload:', {
        clinicId: docData.clinicId,
        userId: docData.userId,
        ownerId: docData.ownerId,
        petId: docData.petId,
        petIdType: typeof docData.petId,
        bookingId: docData.bookingId,
        mainDiagnosis: docData.mainDiagnosis,
        visitDate: docData.visitDate
      });

      const docRef = await addDoc(collection(db, COLLECTIONS.CLINIC_RESULTS), docData);

      console.log('[saveResult] 진료 결과 문서 저장 성공, docId:', docRef.id);

      // 푸시 알림은 "부가 기능"으로 처리하고, 실패해도 전체 흐름은 성공으로 유지
      try {
        const { sendNotificationToGuardian } = await import('./pushNotificationService');

        const notificationRes = await sendNotificationToGuardian(
          resultData.userId,
          '진료 결과가 도착했어요',
          '병원에서 오늘 진료 결과를 등록했어요. 앱에서 내용을 확인해 주세요.',
          {
            clinicId: resultData.clinicId,
            petId: resultData.petId,
            bookingId: resultData.bookingId
          }
        );

        if (!notificationRes?.success) {
          console.warn(
            '[saveResult] 보호자 푸시 알림 실패하지만 무시합니다:',
            notificationRes?.error
          );
        } else {
          console.log('[saveResult] 보호자 푸시 알림 성공');
        }
      } catch (err) {
        console.warn('[saveResult] 푸시 알림 중 에러 발생(무시):', err);
      }

      // 🔥 여기서는 절대 throw 하지 말고, 무조건 성공 리턴
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
      console.log('🔍 [getResultsByPet] 입력:', { petId, petIdType: typeof petId });

      const q = query(
        collection(db, COLLECTIONS.CLINIC_RESULTS),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      console.log('📊 [getResultsByPet] 조회 결과:', {
        count: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          petId: doc.data().petId,
          petIdType: typeof doc.data().petId,
          clinicId: doc.data().clinicId,
          ownerId: doc.data().ownerId,
          userId: doc.data().userId
        }))
      });

      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: results };
    } catch (error) {
      console.error('❌ [getResultsByPet] 진료 결과 목록 조회 오류:', error);
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

// ============ 사전 문진 관련 ============
export const preQuestionnaireService = {
  // 사전 문진 저장
  async saveQuestionnaire(questionnaireData) {
    try {
      // 🔥 필수 필드 검증
      if (!questionnaireData.petId) {
        throw new Error('petId는 필수 필드입니다.');
      }
      if (!questionnaireData.ownerId && !questionnaireData.userId) {
        throw new Error('ownerId 또는 userId는 필수 필드입니다.');
      }
      if (!questionnaireData.clinicId) {
        throw new Error('clinicId는 필수 필드입니다.');
      }

      // 🔥 저장 데이터 구조화
      const docData = {
        ...questionnaireData,
        clinicId: questionnaireData.clinicId,  // 병원 ID
        ownerId: questionnaireData.ownerId || questionnaireData.userId,  // 보호자 UID
        petId: questionnaireData.petId,  // 펫 ID
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.PRE_QUESTIONNAIRES), docData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('사전 문진 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 🔥 병원 모드: 특정 환자의 사전 문진 조회
  async getQuestionnairesByClinicAndPatient(clinicId, ownerId, petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PRE_QUESTIONNAIRES),
        where('clinicId', '==', clinicId),
        where('ownerId', '==', ownerId),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const questionnaires = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: questionnaires };
    } catch (error) {
      console.error('사전 문진 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 보호자 모드: 내 사전 문진 목록
  async getQuestionnairesByOwner(ownerId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.PRE_QUESTIONNAIRES),
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const questionnaires = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: questionnaires };
    } catch (error) {
      console.error('사전 문진 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  }
};

// ============ 환자 기록 (진료 기록) 관련 ============
export const medicalRecordService = {
  // 환자 기록 저장
  async saveRecord(recordData) {
    try {
      // 🔥 필수 필드 검증
      if (!recordData.petId) {
        throw new Error('petId는 필수 필드입니다.');
      }
      if (!recordData.ownerId && !recordData.userId) {
        throw new Error('ownerId 또는 userId는 필수 필드입니다.');
      }
      if (!recordData.clinicId) {
        throw new Error('clinicId는 필수 필드입니다.');
      }

      // 🔥 저장 데이터 구조화
      const docData = {
        ...recordData,
        clinicId: recordData.clinicId,  // 병원 ID
        ownerId: recordData.ownerId || recordData.userId,  // 보호자 UID
        petId: recordData.petId,  // 펫 ID
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.MEDICAL_RECORDS), docData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('환자 기록 저장 오류:', error);
      return { success: false, error };
    }
  },

  // 🔥 병원 모드: 특정 환자의 환자 기록 조회
  async getRecordsByClinicAndPatient(clinicId, ownerId, petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.MEDICAL_RECORDS),
        where('clinicId', '==', clinicId),
        where('ownerId', '==', ownerId),
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
      console.error('환자 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 보호자 모드: 내 환자 기록 목록
  async getRecordsByOwner(ownerId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.MEDICAL_RECORDS),
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: records };
    } catch (error) {
      console.error('환자 기록 목록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 반려동물의 환자 기록 조회
  async getRecordsByPet(petId) {
    try {
      const q = query(
        collection(db, COLLECTIONS.MEDICAL_RECORDS),
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
      console.error('환자 기록 조회 오류:', error);
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

// ============ 코멘트 템플릿 관련 ============
export const commentTemplateService = {
  // 모든 템플릿 가져오기
  async getAllTemplates() {
    try {
      const querySnapshot = await getDocs(collection(db, 'commentTemplates'));
      const templates = [];
      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: templates };
    } catch (error) {
      console.error('템플릿 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 카테고리별 템플릿 가져오기
  async getTemplatesByCategory(category) {
    try {
      const q = query(
        collection(db, 'commentTemplates'),
        where('category', '==', category)
      );
      const querySnapshot = await getDocs(q);
      const templates = [];
      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: templates };
    } catch (error) {
      console.error('카테고리별 템플릿 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 조건에 따른 랜덤 템플릿 가져오기
  // hasHospitalVisit: 병원 방문 기록이 있는지
  // hasDiagnosis: AI 진단 기록이 있는지
  async getRandomTemplate(hasHospitalVisit = false, hasDiagnosis = false) {
    try {
      let categories;

      if (hasHospitalVisit || hasDiagnosis) {
        // 병원 방문 또는 AI 진단 기록이 있으면 병원/투약 모드 (카테고리 1, 2)
        categories = [1, 2];
      } else {
        // 일반 메시지 (카테고리 4, 5, 7)
        categories = [4, 5, 7];
      }

      // 해당 카테고리 중 랜덤 선택
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      const result = await this.getTemplatesByCategory(randomCategory);
      if (result.success && result.data.length > 0) {
        // 랜덤 템플릿 선택
        const randomIndex = Math.floor(Math.random() * result.data.length);
        return { success: true, data: result.data[randomIndex] };
      }

      return { success: false, data: null };
    } catch (error) {
      console.error('랜덤 템플릿 조회 오류:', error);
      return { success: false, error, data: null };
    }
  }
};

// ============ 약물 처방 기록 서비스 ============
export const medicationLogService = {
  // 반려동물의 약물 처방 기록 조회
  async getMedicationsByPet(petId) {
    try {
      console.log('🔍 [getMedicationsByPet] 입력:', { petId });

      const q = query(
        collection(db, 'medicationLogs'),
        where('petId', '==', petId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      console.log('📊 [getMedicationsByPet] 조회 결과:', {
        count: querySnapshot.size
      });

      const medications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: medications };
    } catch (error) {
      console.error('❌ [getMedicationsByPet] 약물 기록 조회 오류:', error);
      return { success: false, error, data: [] };
    }
  },

  // 약물 피드백 업데이트
  async updateMedicationFeedback(medicationId, feedback) {
    try {
      const medRef = doc(db, 'medicationLogs', medicationId);
      await updateDoc(medRef, {
        'evaluation.userFeedback': feedback,
        'evaluation.feedbackAt': serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('약물 피드백 업데이트 오류:', error);
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
  preQuestionnaireService,  // 🔥 사전 문진 서비스
  medicalRecordService,  // 🔥 환자 기록 서비스
  commentTemplateService,  // 🔥 코멘트 템플릿 서비스
  medicationLogService,  // 🔥 약물 처방 기록 서비스
  migrationHelper
};
