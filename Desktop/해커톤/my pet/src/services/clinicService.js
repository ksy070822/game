// 병원 모드 Firestore 서비스
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';

// ============================================
// 병원 정보 관련
// ============================================

/**
 * 사용자가 속한 병원 목록 조회
 * @param {string} userId - 사용자 UID
 * @returns {Promise<Array>} 병원 목록
 */
export async function getUserClinics(userId) {
  try {
    // clinicStaff에서 해당 사용자가 속한 병원 찾기
    const staffQuery = query(
      collection(db, 'clinicStaff'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );

    const staffSnapshot = await getDocs(staffQuery);

    if (staffSnapshot.empty) {
      return [];
    }

    // 병원 정보 가져오기
    const clinics = [];
    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data();
      const clinicDoc = await getDoc(doc(db, 'clinics', staffData.clinicId));

      if (clinicDoc.exists()) {
        clinics.push({
          ...clinicDoc.data(),
          staffRole: staffData.role,
          staffId: staffDoc.id
        });
      }
    }

    return clinics;
  } catch (error) {
    console.error('병원 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 병원 정보 조회
 * @param {string} clinicId - 병원 ID
 * @returns {Promise<Object>} 병원 정보
 */
export async function getClinicInfo(clinicId) {
  try {
    const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));

    if (!clinicDoc.exists()) {
      throw new Error('병원 정보를 찾을 수 없습니다');
    }

    return {
      id: clinicDoc.id,
      ...clinicDoc.data()
    };
  } catch (error) {
    console.error('병원 정보 조회 실패:', error);
    throw error;
  }
}

/**
 * 병원 스태프 목록 조회
 * @param {string} clinicId - 병원 ID
 * @returns {Promise<Array>} 스태프 목록
 */
export async function getClinicStaff(clinicId) {
  try {
    const staffQuery = query(
      collection(db, 'clinicStaff'),
      where('clinicId', '==', clinicId),
      where('isActive', '==', true)
    );

    const staffSnapshot = await getDocs(staffQuery);
    const staff = [];

    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data();

      // 사용자 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', staffData.userId));

      if (userDoc.exists()) {
        staff.push({
          id: staffDoc.id,
          ...staffData,
          user: userDoc.data()
        });
      }
    }

    return staff;
  } catch (error) {
    console.error('스태프 목록 조회 실패:', error);
    throw error;
  }
}

// ============================================
// 예약 관련
// ============================================

/**
 * 오늘 예약 목록 조회
 * @param {string} clinicId - 병원 ID
 * @returns {Promise<Array>} 오늘 예약 목록
 */
export async function getTodayBookings(clinicId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', clinicId),
      where('date', '==', todayStr),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(bookingsQuery);
    const bookings = [];

    for (const bookingDoc of snapshot.docs) {
      const bookingData = bookingDoc.data();

      // 펫 정보 가져오기
      const petDoc = await getDoc(doc(db, 'pets', bookingData.petId));
      // 보호자 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', bookingData.userId));

      bookings.push({
        id: bookingDoc.id,
        ...bookingData,
        pet: petDoc.exists() ? petDoc.data() : null,
        owner: userDoc.exists() ? userDoc.data() : null
      });
    }

    return bookings;
  } catch (error) {
    console.error('오늘 예약 조회 실패:', error);
    throw error;
  }
}

/**
 * 월별 예약 목록 조회
 * @param {string} clinicId - 병원 ID
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {Promise<Array>} 예약 목록
 */
export async function getMonthlyBookings(clinicId, year, month) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', clinicId),
      where('date', '>=', startDate),
      where('date', '<', endDate),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(bookingsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('월별 예약 조회 실패:', error);
    throw error;
  }
}

/**
 * 특정 날짜의 예약 목록 조회
 * @param {string} clinicId - 병원 ID
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @returns {Promise<Array>} 예약 목록
 */
export async function getBookingsByDate(clinicId, date) {
  try {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', clinicId),
      where('date', '==', date),
      orderBy('time', 'asc')
    );

    const snapshot = await getDocs(bookingsQuery);
    const bookings = [];

    for (const bookingDoc of snapshot.docs) {
      const bookingData = bookingDoc.data();

      // 펫 정보
      const petDoc = await getDoc(doc(db, 'pets', bookingData.petId));
      // 보호자 정보
      const userDoc = await getDoc(doc(db, 'users', bookingData.userId));

      bookings.push({
        id: bookingDoc.id,
        ...bookingData,
        pet: petDoc.exists() ? petDoc.data() : null,
        owner: userDoc.exists() ? userDoc.data() : null
      });
    }

    return bookings;
  } catch (error) {
    console.error('날짜별 예약 조회 실패:', error);
    throw error;
  }
}

// ============================================
// 환자 관련
// ============================================

/**
 * 병원 환자 목록 조회
 * @param {string} clinicId - 병원 ID
 * @param {Object} options - 옵션 { limit, orderBy }
 * @returns {Promise<Array>} 환자 목록
 */
export async function getClinicPatients(clinicId, options = {}) {
  try {
    let patientsQuery = query(
      collection(db, 'clinicPatients'),
      where('clinicId', '==', clinicId)
    );

    // 정렬
    if (options.orderBy) {
      patientsQuery = query(patientsQuery, orderBy(options.orderBy, 'desc'));
    } else {
      patientsQuery = query(patientsQuery, orderBy('lastVisitDate', 'desc'));
    }

    // 제한
    if (options.limit) {
      patientsQuery = query(patientsQuery, limit(options.limit));
    }

    const snapshot = await getDocs(patientsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('환자 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 환자 상세 정보 조회
 * @param {string} petId - 펫 ID
 * @returns {Promise<Object>} 환자 상세 정보
 */
export async function getPatientDetail(petId) {
  try {
    // 펫 기본 정보
    const petDoc = await getDoc(doc(db, 'pets', petId));

    if (!petDoc.exists()) {
      throw new Error('환자 정보를 찾을 수 없습니다');
    }

    const petData = petDoc.data();

    // 보호자 정보
    const ownerDoc = await getDoc(doc(db, 'users', petData.userId));

    // 진료 기록
    const resultsQuery = query(
      collection(db, 'clinicResults'),
      where('petId', '==', petId),
      orderBy('visitDate', 'desc'),
      limit(10)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    const clinicResults = resultsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 예방접종 기록
    const vaccinationsQuery = query(
      collection(db, 'vaccinations'),
      where('petId', '==', petId),
      orderBy('scheduledDate', 'desc')
    );
    const vaccinationsSnapshot = await getDocs(vaccinationsQuery);
    const vaccinations = vaccinationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      id: petDoc.id,
      ...petData,
      owner: ownerDoc.exists() ? ownerDoc.data() : null,
      clinicResults,
      vaccinations
    };
  } catch (error) {
    console.error('환자 상세 정보 조회 실패:', error);
    throw error;
  }
}

// ============================================
// 진료 결과 관련
// ============================================

/**
 * 진료 결과 목록 조회
 * @param {string} clinicId - 병원 ID
 * @param {Object} options - 옵션
 * @returns {Promise<Array>} 진료 결과 목록
 */
export async function getClinicResults(clinicId, options = {}) {
  try {
    let resultsQuery = query(
      collection(db, 'clinicResults'),
      where('clinicId', '==', clinicId),
      orderBy('visitDate', 'desc')
    );

    if (options.limit) {
      resultsQuery = query(resultsQuery, limit(options.limit));
    }

    const snapshot = await getDocs(resultsQuery);
    const results = [];

    for (const resultDoc of snapshot.docs) {
      const resultData = resultDoc.data();

      // 펫 정보
      const petDoc = await getDoc(doc(db, 'pets', resultData.petId));

      results.push({
        id: resultDoc.id,
        ...resultData,
        pet: petDoc.exists() ? petDoc.data() : null
      });
    }

    return results;
  } catch (error) {
    console.error('진료 결과 조회 실패:', error);
    throw error;
  }
}

// ============================================
// 예방접종 관련
// ============================================

/**
 * 예정된 예방접종 목록 조회
 * @param {string} clinicId - 병원 ID
 * @returns {Promise<Array>} 예방접종 목록
 */
export async function getUpcomingVaccinations(clinicId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const vaccinationsQuery = query(
      collection(db, 'vaccinations'),
      where('clinicId', '==', clinicId),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', today),
      orderBy('scheduledDate', 'asc'),
      limit(50)
    );

    const snapshot = await getDocs(vaccinationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('예방접종 목록 조회 실패:', error);
    throw error;
  }
}

// ============================================
// 통계 관련
// ============================================

/**
 * 병원 대시보드 통계 조회
 * @param {string} clinicId - 병원 ID
 * @returns {Promise<Object>} 통계 데이터
 */
export async function getClinicStats(clinicId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    // 오늘 예약 수
    const todayBookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', clinicId),
      where('date', '==', today)
    );
    const todayBookingsSnapshot = await getDocs(todayBookingsQuery);

    // 이번 달 진료 수
    const monthlyResultsQuery = query(
      collection(db, 'clinicResults'),
      where('clinicId', '==', clinicId),
      where('visitDate', '>=', `${thisMonth}-01`)
    );
    const monthlyResultsSnapshot = await getDocs(monthlyResultsQuery);

    // 총 환자 수
    const patientsQuery = query(
      collection(db, 'clinicPatients'),
      where('clinicId', '==', clinicId)
    );
    const patientsSnapshot = await getDocs(patientsQuery);

    // 예정된 예방접종
    const upcomingVaccQuery = query(
      collection(db, 'vaccinations'),
      where('clinicId', '==', clinicId),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', today)
    );
    const upcomingVaccSnapshot = await getDocs(upcomingVaccQuery);

    return {
      todayBookings: todayBookingsSnapshot.size,
      monthlyVisits: monthlyResultsSnapshot.size,
      totalPatients: patientsSnapshot.size,
      upcomingVaccinations: upcomingVaccSnapshot.size
    };
  } catch (error) {
    console.error('통계 조회 실패:', error);
    throw error;
  }
}

export default {
  getUserClinics,
  getClinicInfo,
  getClinicStaff,
  getTodayBookings,
  getMonthlyBookings,
  getBookingsByDate,
  getClinicPatients,
  getPatientDetail,
  getClinicResults,
  getUpcomingVaccinations,
  getClinicStats
};
