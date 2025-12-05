// 병원 모드 대시보드 메인 컴포넌트
// 핵심: 병원 ↔ 보호자 양방향 AI-병원 진료기록 교류 & 동물 데이터 공유
import { useState, useEffect } from 'react';
import {
  getUserClinics,
  getClinicInfo,
  getTodayBookings,
  getMonthlyBookings,
  getClinicPatients,
  getClinicStats,
  getClinicResults,
  migrateExistingClinicUser,
  addClinicStaff
} from '../services/clinicService';
import { userService, bookingService, diagnosisService, clinicResultService } from '../services/firestore';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { getPetImage } from '../utils/imagePaths';
import { TreatmentSheet } from './TreatmentSheet';

// 동물 종류 한글 매핑
const SPECIES_LABELS = {
  dog: '강아지',
  cat: '고양이',
  rabbit: '토끼',
  hamster: '햄스터',
  bird: '조류',
  hedgehog: '고슴도치',
  reptile: '파충류',
  etc: '기타',
  other: '기타'
};

// 나이 표시 헬퍼
const formatAge = (age) => {
  if (!age) return '나이 미상';
  if (typeof age === 'string' && age.includes('세')) return age;
  if (typeof age === 'number') return `${age}세`;
  return age;
};

// 성별 표시 헬퍼
const formatGender = (gender) => {
  if (!gender) return null;
  const isMale = gender === 'M' || gender === 'male' || gender === '수컷' || gender === '♂';
  const isFemale = gender === 'F' || gender === 'female' || gender === '암컷' || gender === '♀';
  if (isMale) return <span className="text-blue-600 font-semibold">♂</span>;
  if (isFemale) return <span className="text-rose-600 font-semibold">♀</span>;
  return gender;
};

// 로컬 타임존 기준으로 YYYY-MM-DD 문자열을 반환
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ClinicDashboard({ currentUser, onBack, onModeSwitch }) {
  const [loading, setLoading] = useState(true);
  const [currentClinic, setCurrentClinic] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [todayBookings, setTodayBookings] = useState([]);
  const [monthlyBookings, setMonthlyBookings] = useState([]);
  const [monthlyResults, setMonthlyResults] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 오늘 예약 필터 ('all', 'confirmed', 'pending')
  const [todayFilter, setTodayFilter] = useState('all');

  // 진료서 작성 관련 상태
  const [activeTreatmentBooking, setActiveTreatmentBooking] = useState(null);

  // 상세보기 관련 상태
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalType, setDetailModalType] = useState(null);
  const [historyData, setHistoryData] = useState({ diagnoses: [], results: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  // 병원 설정 편집 모드
  const [isEditingClinic, setIsEditingClinic] = useState(false);
  const [editClinic, setEditClinic] = useState(null);

  // 진단서 상세보기 모달 상태
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // AI 진단서 상세보기 모달
  const [aiDiagnosisModal, setAiDiagnosisModal] = useState(null);

  // 임직원 등록 상태
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(''); // 초기값을 빈 문자열로 설정
  const [staffList, setStaffList] = useState([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // 환자정보 탭 상태
  const [patientList, setPatientList] = useState([]); // 고유 환자(pet) 목록
  const [selectedPatient, setSelectedPatient] = useState(null); // 선택된 환자
  const [patientRecords, setPatientRecords] = useState([]); // 선택된 환자의 진료기록
  const [patientRecordsLoading, setPatientRecordsLoading] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    if (currentUser?.uid) {
      loadInitialData();
    }
  }, [currentUser]);

  // 현재 병원이 변경되면 데이터 다시 로드
  useEffect(() => {
    if (currentClinic) {
      loadClinicData();
    }
  }, [currentClinic]);

  // booking에 clinicResults 정보를 조인하는 헬퍼 함수
  const enrichBookingWithResult = async (booking) => {
    try {
      const bookingId = booking.bookingId || booking.id;
      const res = await clinicResultService.getResultByBooking(bookingId);
      if (res.success && res.data) {
        return {
          ...booking,
          hasResult: true,
          sharedToGuardian: res.data.sharedToGuardian || false,
          lastResultId: res.data.id,
          clinicResult: res.data
        };
      }
      return { ...booking, hasResult: false, sharedToGuardian: false };
    } catch (error) {
      return { ...booking, hasResult: false, sharedToGuardian: false };
    }
  };

  // 실시간 예약 구독 (오늘 예약만) - Firestore 실시간 업데이트
  useEffect(() => {
    if (!currentClinic?.id) return;

    const today = getLocalDateString();
    console.log('[실시간 구독 시작] clinicId:', currentClinic.id, '날짜:', today);
    
    const unsubscribes = [];

    // clinics ID로 실시간 구독
    try {
      const q1 = query(
        collection(db, 'bookings'),
        where('clinicId', '==', currentClinic.id),
        where('date', '==', today),
        orderBy('time', 'asc')
      );

      const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
        console.log('[실시간] 예약 업데이트:', snapshot.docs.length, '개');
        
        const bookings = [];
        for (const bookingDoc of snapshot.docs) {
          const bookingData = bookingDoc.data();
          
          let pet = null;
          if (bookingData.petId) {
            try {
              const petDoc = await getDoc(doc(db, 'pets', bookingData.petId));
              pet = petDoc.exists() ? petDoc.data() : bookingData.pet || bookingData.petProfile || null;
            } catch (e) {
              pet = bookingData.pet || bookingData.petProfile || null;
            }
          }
          
          let owner = null;
          if (bookingData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', bookingData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                owner = {
                  ...userData,
                  name: userData.displayName || userData.name || bookingData.owner?.name || '알 수 없음',
                  displayName: userData.displayName || userData.name || bookingData.owner?.displayName
                };
              } else {
                owner = bookingData.owner || null;
              }
            } catch (e) {
              owner = bookingData.owner || null;
            }
          }

          bookings.push({
            ...bookingData,
            id: bookingDoc.id,
            bookingId: bookingData.bookingId || bookingDoc.id,
            pet,
            owner
          });
        }

        Promise.all(bookings.map(enrichBookingWithResult)).then(enrichedBookings => {
          enrichedBookings.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
          setTodayBookings(enrichedBookings);
        });
      });

      unsubscribes.push(unsubscribe1);
    } catch (error) {
      console.error('[실시간] 구독 오류:', error);
    }

    // 병원명으로도 구독 (하위 호환)
    if (currentClinic.name) {
      try {
        const q2 = query(
          collection(db, 'bookings'),
          where('clinicName', '==', currentClinic.name),
          where('date', '==', today)
        );

        const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
          setTodayBookings((prev) => {
            const map = new Map(prev.map(b => [b.id, b]));
            for (const bookingDoc of snapshot.docs) {
                const bookingData = bookingDoc.data();
              const enriched = {
                  ...bookingData,
                id: bookingDoc.id,
                bookingId: bookingData.bookingId || bookingDoc.id,
                  pet: bookingData.pet || bookingData.petProfile || null,
                  owner: bookingData.owner || null
              };
              map.set(bookingDoc.id, enriched);
            }
            const merged = Array.from(map.values());
            Promise.all(merged.map(enrichBookingWithResult)).then(enrichedBookings => {
              enrichedBookings.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
              setTodayBookings(enrichedBookings);
            });
            return merged.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
          });
        });

        unsubscribes.push(unsubscribe2);
      } catch (error) {
        console.error('[실시간] 병원명 구독 오류:', error);
      }
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentClinic?.id, currentClinic?.name]);

  // 월이 변경되면 월별 예약 다시 로드
  useEffect(() => {
    if (currentClinic) {
      loadMonthlyBookings();
      loadMonthlyResults();
    }
  }, [currentMonth, currentClinic]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      let userClinics = await getUserClinics(currentUser.uid);

      if (userClinics.length === 0) {
        const userDoc = await userService.getUser(currentUser.uid);
        const userData = userDoc.data || {};
        const migrationResult = await migrateExistingClinicUser(currentUser.uid, {
          ...userData,
          displayName: currentUser.displayName || userData.displayName
        });
        if (migrationResult.success) {
          userClinics = await getUserClinics(currentUser.uid);
        }
      }

      if (userClinics.length === 0) {
        alert('병원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
        onBack();
        return;
      }

      setClinics(userClinics);
      setCurrentClinic(userClinics[0]);
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      alert('데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadClinicData = async () => {
    try {
      setLoading(true);
      const clinicStats = await getClinicStats(currentClinic.id);
      setStats(clinicStats);

      const bookings = await getTodayBookings(currentClinic.id);
      const enrichedBookings = await Promise.all(bookings.map(enrichBookingWithResult));
      setTodayBookings(enrichedBookings);

      const patientList = await getClinicPatients(currentClinic.id, { limit: 50 });
      setPatients(patientList);
    } catch (error) {
      console.error('병원 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyBookings = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const monthly = await getMonthlyBookings(currentClinic.id, year, month);
      setMonthlyBookings(monthly);
    } catch (error) {
      console.error('월별 예약 로드 실패:', error);
    }
  };

  const loadMonthlyResults = async () => {
    try {
      const results = await getClinicResults(currentClinic.id, { limit: 100 });
      setMonthlyResults(results);
    } catch (error) {
      console.error('월별 진료 결과 로드 실패:', error);
    }
  };

  // 날짜를 문자열로 변환하는 헬퍼 함수
  const formatDateToString = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    if (date?.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp
      return date.toDate().toISOString().split('T')[0];
    }
    if (date?.seconds) {
      // Firestore Timestamp (seconds 필드가 있는 경우)
      return new Date(date.seconds * 1000).toISOString().split('T')[0];
    }
    return '';
  };

  // 환자 목록 로드 (clinicPatients 컬렉션에서 직접 조회 + 예약 기록에서 고유 환자 추출)
  const loadPatientList = async () => {
    try {
      // 1) clinicPatients 컬렉션에서 직접 환자 목록 조회
      const clinicPatients = await getClinicPatients(currentClinic.id, { limit: 100 });
      
      console.log('📋 [loadPatientList] clinicPatients 조회 결과:', clinicPatients.length, '명');
      
      // clinicPatients를 patientList 형식으로 변환
      const patientsFromCollection = clinicPatients.map(patient => {
        const lastVisitDate = formatDateToString(patient.lastVisitDate || patient.updatedAt);
        // petId가 숫자일 수 있으므로 문자열로 변환
        // 문서 ID 형식이 "clinicId_petId"인 경우 petId 추출
        let petId = patient.petId;
        if (!petId && patient.id) {
          // 문서 ID에서 petId 추출 (마지막 _ 이후 부분)
          const parts = String(patient.id).split('_');
          petId = parts.length > 1 ? parts[parts.length - 1] : patient.id;
        }
        // 숫자면 문자열로 변환
        petId = petId ? String(petId) : patient.id;
        
        return {
          id: petId,
          name: patient.petName || '이름 없음',
          species: patient.species || 'dog',
          breed: patient.breed || '',
          profileImage: null,
          guardianName: patient.ownerName || '',
          guardianId: patient.ownerUserId,
          lastVisit: lastVisitDate,
          visitCount: patient.visitCount || 0,
          bookings: []
        };
      });
      
      console.log('📋 [loadPatientList] 변환된 환자:', patientsFromCollection.length, '명');

      // 2) 예약 기록에서도 고유 환자 추출 (기존 로직 유지)
      const allBookings = await bookingService.getBookingsByClinic(currentClinic.id);
      const allResults = await getClinicResults(currentClinic.id, { limit: 200 });

      const petsMap = new Map();

      // clinicPatients에서 온 환자들을 먼저 맵에 추가
      patientsFromCollection.forEach(patient => {
        if (patient.id) {
          petsMap.set(patient.id, patient);
        }
      });

      // 예약에서 환자 정보 수집 (기존 환자 정보 보강)
      allBookings.forEach(booking => {
        if (booking.pet?.id || booking.petId) {
          const petId = booking.pet?.id || booking.petId;
          const bookingDate = formatDateToString(booking.date);
          if (!petsMap.has(petId)) {
            petsMap.set(petId, {
              id: petId,
              name: booking.pet?.name || booking.petName || '이름 없음',
              species: booking.pet?.species || booking.petSpecies || 'dog',
              breed: booking.pet?.breed || booking.petBreed || '',
              profileImage: booking.pet?.profileImage,
              guardianName: booking.guardianName || booking.guardian?.displayName || '',
              guardianId: booking.userId || booking.guardianId,
              lastVisit: bookingDate,
              visitCount: 0,
              bookings: []
            });
          }
          const pet = petsMap.get(petId);
          pet.visitCount++;
          pet.bookings.push(booking);
          if (bookingDate && (!pet.lastVisit || bookingDate > pet.lastVisit)) {
            pet.lastVisit = bookingDate;
          }
        }
      });

      // 진료 결과에서도 정보 보강
      allResults.forEach(result => {
        const petId = result.petId;
        if (petId && petsMap.has(petId)) {
          const pet = petsMap.get(petId);
          if (!pet.results) pet.results = [];
          pet.results.push(result);
          // visitCount 업데이트
          const resultVisitDate = formatDateToString(result.visitDate);
          if (resultVisitDate && (!pet.lastVisit || resultVisitDate > pet.lastVisit)) {
            pet.lastVisit = resultVisitDate;
          }
        }
      });

      // 최근 방문순으로 정렬 (lastVisit를 문자열로 보장)
      const sortedPatients = Array.from(petsMap.values()).sort((a, b) => {
        const dateA = formatDateToString(a.lastVisit) || '';
        const dateB = formatDateToString(b.lastVisit) || '';
        return dateB.localeCompare(dateA);
      });
      
      console.log('📋 [loadPatientList] 최종 환자 목록:', sortedPatients.length, '명');

      setPatientList(sortedPatients);
    } catch (error) {
      console.error('환자 목록 로드 실패:', error);
    }
  };

  // 선택된 환자의 진료 기록 로드
  const loadPatientRecords = async (petId) => {
    setPatientRecordsLoading(true);
    try {
      // 1) 해당 환자의 모든 예약 조회
      const allBookings = await bookingService.getBookingsByClinic(currentClinic.id);
      const petBookings = allBookings.filter(b =>
        (b.pet?.id || b.petId) === petId
      ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // 각 예약에 진료 결과 정보 추가
      const enrichedBookings = await Promise.all(
        petBookings.map(async (booking) => {
          const enriched = await enrichBookingWithResult(booking);
          return enriched;
        })
      );

      // 2) 해당 환자의 진료 결과(clinicResults) 조회 (예약과 별개로 저장된 진료 기록)
      const resultRes = await clinicResultService.getResultsByPet(petId);
      const clinicResults = resultRes.success && resultRes.data ? resultRes.data : [];
      
      // clinicResults를 booking 형식으로 변환
      const resultRecords = clinicResults.map(result => ({
        id: result.id,
        date: result.visitDate || result.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0],
        time: result.visitTime || '시간 미정',
        status: result.sharedToGuardian ? 'completed' : 'confirmed',
        pet: {
          id: result.petId,
          name: result.petName
        },
        petId: result.petId,
        petName: result.petName,
        aiDiagnosis: null,
        symptom: result.soap?.subjective || '',
        result: {
          mainDiagnosis: result.mainDiagnosis,
          soap: result.soap,
          triageScore: result.triageScore
        },
        hasResult: true,
        sharedToGuardian: result.sharedToGuardian || false,
        isFromClinicResult: true // clinicResults에서 온 데이터임을 표시
      }));

      // 예약과 진료 결과를 합치고 날짜순 정렬
      const allRecords = [...enrichedBookings, ...resultRecords].sort((a, b) => 
        (b.date || '').localeCompare(a.date || '')
      );

      setPatientRecords(allRecords);
    } catch (error) {
      console.error('환자 기록 로드 실패:', error);
      setPatientRecords([]);
    } finally {
      setPatientRecordsLoading(false);
    }
  };

  // 환자 선택 핸들러
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    loadPatientRecords(patient.id);
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      onBack();
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '확인 대기',
      confirmed: '진료 예정',   // ✅ 기존 '확정' → '진료 예정' 으로 변경
      completed: '진료 완료',   // ✅ 기존 '완료' → '진료 완료' 로 변경
      cancelled: '취소됨',
      waiting: '대기'
    };
    return labels[status] || status;
  };

  // 예약 확정 처리
  const handleConfirmBooking = async (bookingOrId) => {
    const targetId = typeof bookingOrId === 'object'
      ? (bookingOrId.id || bookingOrId.docId || bookingOrId.bookingId)
      : bookingOrId;

    const ok = window.confirm('이 예약을 확정하시겠습니까?');
    if (!ok) return;

    const result = await bookingService.updateBookingStatus(targetId, 'confirmed');
    if (!result?.success) {
      alert('예약 확정 중 오류가 발생했습니다.');
      return;
    }

    // 오늘 예약 목록 업데이트
    setTodayBookings(prev =>
      prev.map(b => b.id === targetId ? { ...b, status: 'confirmed' } : b)
    );

    // 월별 예약 목록도 업데이트 (달력 반영)
    setMonthlyBookings(prev =>
      prev.map(b => b.id === targetId ? { ...b, status: 'confirmed' } : b)
    );

    alert('예약이 확정되었습니다.');
  };

  const handleStartTreatment = (bookingId) => {
    const booking = todayBookings.find(b => b.id === bookingId);
    if (!booking) {
      alert('예약 정보를 찾을 수 없습니다.');
      return;
    }
    setActiveTreatmentBooking(booking);
  };

  // AI 진단서 상세보기
  const handleShowAIDiagnosis = async (booking) => {
    if (booking.aiDiagnosis) {
      setAiDiagnosisModal({ booking, diagnosis: booking.aiDiagnosis });
      return;
    }
    if (booking.diagnosisId) {
      const res = await diagnosisService.getDiagnosisById(booking.diagnosisId);
      if (res.success && res.data) {
        setAiDiagnosisModal({ booking, diagnosis: res.data });
        return;
      }
    }
    alert('AI 진단서 정보가 없습니다.');
  };

  // 환자 상세 정보 보기
  const handleShowPatientDetail = (booking) => {
    setSelectedBooking(booking);
    setDetailModalType('patient');
  };

  // 병원 진단서 상세보기
  const handleShowResultDetail = async (booking) => {
    if (!booking?.id && !booking?.bookingId) {
      alert('예약 정보를 찾을 수 없습니다.');
      return;
    }
    try {
      const bookingId = booking.bookingId || booking.id;
      const res = await clinicResultService.getResultByBooking(bookingId);
      if (!res.success || !res.data) {
        alert('저장된 병원 진단서가 없습니다.');
        return;
      }
      setSelectedResult(res.data);
      setResultModalOpen(true);
    } catch (error) {
      alert('진단서 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 과거 기록 보기
  const handleShowHistory = async (booking) => {
    if (!booking.petId) {
      alert('펫 정보가 없습니다.');
      return;
    }
    setSelectedBooking(booking);
    setDetailModalType('history');
    setHistoryLoading(true);
    try {
      const ownerId = booking.userId || booking.owner?.id;
      const diagnosesPromise = ownerId
        ? diagnosisService.getDiagnosesByClinicAndPatient(currentClinic.id, ownerId, booking.petId)
        : diagnosisService.getDiagnosesByPet(booking.petId);
      const resultsPromise = clinicResultService.getResultsByPet(booking.petId);
      const [diagRes, resultRes] = await Promise.all([diagnosesPromise, resultsPromise]);
      setHistoryData({
        diagnoses: diagRes.success ? diagRes.data : [],
        results: resultRes.success ? resultRes.data : []
      });
    } catch (error) {
      alert('과거 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 캘린더 날짜 선택
  const handleDateClick = (day) => {
    setSelectedDate(selectedDate === day ? null : day);
  };

  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
    setSelectedDate(null);
  };

  // 캘린더 렌더링
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const bookingsByDate = {};
    
    // todayBookings와 monthlyBookings를 합쳐서 사용
    const allBookings = [...todayBookings, ...monthlyBookings];
    
    allBookings.forEach(booking => {
      // booking.date가 문자열 형식(YYYY-MM-DD)일 수도 있고 Date 객체일 수도 있음
      let bookingDate;
      if (typeof booking.date === 'string') {
        // 문자열 형식인 경우
        const [y, m, d] = booking.date.split('-').map(Number);
        bookingDate = new Date(y, m - 1, d);
      } else if (booking.date instanceof Date) {
        bookingDate = booking.date;
      } else if (booking.date?.toDate) {
        // Firestore Timestamp인 경우
        bookingDate = booking.date.toDate();
      } else {
        return; // 날짜를 파싱할 수 없으면 스킵
      }
      
      if (bookingDate.getMonth() === month && bookingDate.getFullYear() === year) {
        const day = bookingDate.getDate();
        bookingsByDate[day] = (bookingsByDate[day] || 0) + 1;
      }
    });
    
    console.log('📅 [renderCalendar] todayBookings:', todayBookings.length, 'monthlyBookings:', monthlyBookings.length);
    console.log('📅 [renderCalendar] 예약 건수:', bookingsByDate);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = isCurrentMonth ? today.getDate() : null;
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const count = bookingsByDate[day] || 0;
      const isToday = day === todayDate;
      const isSelected = day === selectedDate;
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      days.push(
        <div
          key={day}
          onClick={() => count > 0 && handleDateClick(day)}
          className={`aspect-square flex flex-col items-center justify-start pt-2 rounded-xl transition-all cursor-pointer
            ${isSelected ? 'bg-gradient-to-br from-red-300 to-rose-400 text-white shadow-lg scale-105' :
              isToday ? 'bg-white border-2 border-rose-300 shadow-md' :
              count > 0 ? 'bg-white/90 shadow-sm hover:shadow-md hover:scale-105' :
              'bg-white/30'}
          `}
        >
          <div className={`text-sm font-bold
            ${isSelected ? 'text-white' :
              isToday ? 'text-rose-500' :
              count > 0 ? 'text-gray-900' :
              isSunday ? 'text-red-400' :
              isSaturday ? 'text-blue-400' :
              'text-gray-400'}`}
          >
            {day}
          </div>
          {count > 0 && (
            <div className={`mt-1 w-5 h-5 flex items-center justify-center text-[10px] rounded-full font-bold
              ${isSelected ? 'bg-white text-rose-500' : 'bg-gradient-to-r from-red-300 to-rose-400 text-white'}`}
            >
              {count}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  // 선택된 날짜의 예약 목록
  const getSelectedDateBookings = () => {
    if (!selectedDate) return [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    
    // todayBookings와 monthlyBookings를 합쳐서 사용
    const allBookings = [...todayBookings, ...monthlyBookings];
    
    return allBookings.filter(booking => {
      // booking.date가 문자열 형식(YYYY-MM-DD)일 수도 있고 Date 객체일 수도 있음
      let bookingDate;
      if (typeof booking.date === 'string') {
        // 문자열 형식인 경우 직접 비교
        if (booking.date === selectedDateStr) {
          return true;
        }
        // 또는 Date 객체로 변환하여 비교
        const [y, m, d] = booking.date.split('-').map(Number);
        bookingDate = new Date(y, m - 1, d);
      } else if (booking.date instanceof Date) {
        bookingDate = booking.date;
      } else if (booking.date?.toDate) {
        // Firestore Timestamp인 경우
        bookingDate = booking.date.toDate();
      } else {
        return false;
      }
      
      return bookingDate.getMonth() === month &&
        bookingDate.getFullYear() === year &&
        bookingDate.getDate() === selectedDate;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  // 이번달 통계 계산 (가상 데이터 포함)
  const getMonthlyStats = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 이번달 완료된 진료
    const completedThisMonth = monthlyResults.filter(r => {
      if (!r.visitDate) return false;
      const date = new Date(r.visitDate);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    // 종류별 진료 수 (실제 데이터)
    const speciesCount = {};
    completedThisMonth.forEach(r => {
      const species = r.pet?.species || r.species || 'other';
      speciesCount[species] = (speciesCount[species] || 0) + 1;
    });

    // 가상 데이터 추가 (발표용 - 실제 데이터가 없을 때)
    const demoSpeciesCount = {
      dog: 23,
      cat: 18,
      rabbit: 5,
      hamster: 3,
      bird: 2
    };

    const realTotal = completedThisMonth.length;
    const demoTotal = 51; // 가상 총 진료수
    const demoRevenue = 3850000; // 가상 매출 (385만원)

    // 실제 예약 수
    const realPendingCount = monthlyBookings.filter(b => b.status === 'pending').length;
    const realConfirmedCount = monthlyBookings.filter(b => b.status === 'confirmed').length;

    // 가상 예약 수 (발표용)
    const demoPendingCount = 8;
    const demoConfirmedCount = 24;

    // 실제 데이터가 있으면 사용, 없으면 가상 데이터 사용
    const useDemo = realTotal === 0;
    const useBookingDemo = (realPendingCount + realConfirmedCount) === 0;

    return {
      total: useDemo ? demoTotal : realTotal,
      speciesCount: useDemo ? demoSpeciesCount : (Object.keys(speciesCount).length > 0 ? speciesCount : demoSpeciesCount),
      estimatedRevenue: useDemo ? demoRevenue : (realTotal * 75000), // 진료당 평균 7.5만원
      pendingCount: useBookingDemo ? demoPendingCount : realPendingCount,
      confirmedCount: useBookingDemo ? demoConfirmedCount : realConfirmedCount,
      isDemo: useDemo
    };
  };

  // 임직원 추가
  const handleAddStaff = async () => {
    if (!newStaffEmail.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }
    if (!newStaffRole) {
      alert('직무를 선택해주세요.');
      return;
    }
    setIsAddingStaff(true);
    try {
      // 이메일로 사용자 찾기
      const userRes = await userService.findUserByEmail(newStaffEmail.trim());
      if (!userRes.success || !userRes.data) {
        alert('해당 이메일로 가입된 사용자를 찾을 수 없습니다.');
        return;
      }

      // ✅ userId는 문서 ID(id) 또는 uid 필드를 사용
      const userId = userRes.data.id || userRes.data.uid;
      if (!userId) {
        alert('사용자 ID를 찾을 수 없습니다.');
        return;
      }

      const result = await addClinicStaff(currentClinic.id, userId, newStaffRole);
      if (result.success) {
        alert('임직원이 등록되었습니다.');
        setNewStaffEmail('');
        setNewStaffRole(''); // 직무도 초기화
        // 스태프 목록 새로고침
        loadStaffList();
      } else {
        alert('등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('임직원 추가 실패:', error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const loadStaffList = async () => {
    try {
      const { getClinicStaff } = await import('../services/clinicService');
      const staff = await getClinicStaff(currentClinic.id);
      setStaffList(staff);
    } catch (error) {
      console.error('스태프 목록 로드 실패:', error);
    }
  };

  useEffect(() => {
    if (currentClinic?.id && activeTab === 'settings') {
      loadStaffList();
    }
  }, [currentClinic?.id, activeTab]);

  // 환자정보 탭 선택 시 환자 목록 로드
  useEffect(() => {
    if (currentClinic?.id && activeTab === 'patients') {
      console.log('📋 [useEffect] 환자정보 탭 선택, currentClinic.id:', currentClinic.id);
      loadPatientList();
    }
  }, [currentClinic?.id, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">병원 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  const monthlyStats = getMonthlyStats();

  // 오늘 진료 대상 환자 수 (확정된 예약 중 아직 진료하지 않은 환자)
  const todayTreatmentCount = todayBookings.filter(b => b.status === 'confirmed' && !b.hasResult).length;
  const pendingCount = todayBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      {/* Header - 로고 좌측, 텍스트 중앙 (파스텔 레드 테마) */}
      <header className="bg-gradient-to-r from-red-300 to-rose-300 px-4 pt-8 pb-8 shadow-lg">
        <div className="flex items-center max-w-lg mx-auto">
          {/* 좌측: 뒤로가기 + 로고 */}
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors text-gray-800">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/logo_red.png`}
                alt="PetMedical.AI"
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>
          {/* 중앙: 텍스트 영역 */}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">PetMedical.AI</h1>
            <p className="text-white text-sm font-medium">AI기반 반려동물 건강관리 플랫폼</p>
          </div>
          {/* 우측: 로그아웃 */}
          <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white" title="로그아웃">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Tabs - 상단 고정 네비게이션 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex overflow-x-auto shadow-sm">
        {[
          { id: 'home', icon: 'home', label: '홈' },
          { id: 'today', icon: 'today', label: '오늘 예약' },
          { id: 'patients', icon: 'folder_shared', label: '환자정보' },
          { id: 'calendar', icon: 'calendar_month', label: '예약 달력' },
          { id: 'stats', icon: 'analytics', label: '진료 현황' },
          { id: 'settings', icon: 'settings', label: '병원 설정' }
        ].map(tab => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[70px] px-3 py-3 text-xs font-medium text-center border-b-2 transition-all
              ${activeTab === tab.id
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined block text-xl mb-1">{tab.icon}</span>
            {tab.label}
            </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-24 max-w-lg mx-auto">
        {/* 홈 탭 - 병원 프로필 및 대시보드 카드 */}
        {activeTab === 'home' && (
          <>
            {/* 병원 프로필 배너 - 보호자모드 메인화면과 유사 */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 relative overflow-hidden mb-4">
              <div className="relative flex items-stretch gap-4">
                {/* 병원 이미지 */}
                <div className="flex-shrink-0 w-28 h-40 bg-white/80 rounded-2xl shadow-md overflow-hidden border-2 border-white flex items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}icon/login/main_hospital.png`}
                    alt="병원 모드"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* 병원 정보 */}
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div className="flex flex-col items-center justify-center text-center w-full">
                    <p className="text-xl font-display font-bold text-gray-900 w-full">
                      {currentClinic?.name || '행복한 동물병원'}
                    </p>
                    <p className="text-lg font-semibold text-rose-500 mt-2 w-full">
                      관리자 모드입니다.
                    </p>
                    <p className="text-base text-gray-600 mt-2 w-full">
                      오늘도 든든한 진료 시작!
                    </p>
                  </div>

                  {/* 태그 정보 */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 justify-center">
                    <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                      {currentClinic?.staffRole === 'director' ? '원장' :
                       currentClinic?.staffRole === 'vet' ? '수의사' :
                       currentClinic?.staffRole === 'nurse' ? '간호사' : '스태프'}
                    </span>
                    <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                      진료대기 {todayTreatmentCount}명
                    </span>
                    <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                      확정대기 {pendingCount}명
                    </span>
                  </div>
                </div>
              </div>

              {/* 오늘 진료할 환자 배너 - 클릭 시 오늘 예약 탭으로 이동 */}
            <button
                onClick={() => { setActiveTab('today'); setTodayFilter('all'); }}
                className="w-full mt-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-sm py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
                오늘 진료할 환자 {todayBookings.length}명 확인하기 &gt;
            </button>
          </div>

            {/* 대시보드 카드 영역 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 오늘 진료 카드 */}
              <div
                onClick={() => { setActiveTab('today'); setTodayFilter('confirmed'); }}
                className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 cursor-pointer hover:shadow-xl transition-all active:scale-95 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-rose-400">medical_services</span>
                  <span className="text-sm font-semibold text-gray-700">오늘 진료</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{todayTreatmentCount}</div>
                <p className="text-xs text-gray-500 mt-1">확정된 진료 대기</p>
        </div>

              {/* 확정 대기 카드 */}
              <div
                onClick={() => { setActiveTab('today'); setTodayFilter('pending'); }}
                className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 cursor-pointer hover:shadow-xl transition-all active:scale-95 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                  <span className="text-sm font-semibold text-gray-700">확정 대기</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{pendingCount}</div>
                <p className="text-xs text-gray-500 mt-1">확정 필요한 예약</p>
        </div>

              {/* 이번달 진료 카드 */}
              <div
                onClick={() => setActiveTab('stats')}
                className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 cursor-pointer hover:shadow-xl transition-all active:scale-95 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-rose-400">analytics</span>
                  <span className="text-sm font-semibold text-gray-700">이번달 진료</span>
          </div>
                <div className="text-3xl font-bold text-gray-900">{monthlyStats.total}</div>
                <p className="text-xs text-gray-500 mt-1">완료된 진료</p>
            </div>

              {/* 예약 달력 카드 */}
              <div
                onClick={() => setActiveTab('calendar')}
                className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 cursor-pointer hover:shadow-xl transition-all active:scale-95 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-rose-400">calendar_month</span>
                  <span className="text-sm font-semibold text-gray-700">예약 달력</span>
          </div>
                <div className="text-3xl font-bold text-gray-900">{monthlyBookings.length}</div>
                <p className="text-xs text-gray-500 mt-1">이번달 총 예약</p>
            </div>
          </div>

            {/* 병원 설정 바로가기 */}
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center justify-between hover:shadow-xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-500">settings</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-700">병원 설정</p>
                  <p className="text-xs text-gray-400">병원 정보 및 임직원 관리</p>
        </div>
      </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </button>
          </>
        )}
        {/* 오늘 예약 Tab */}
        {activeTab === 'today' && (() => {
          // 필터 적용
          const filteredBookings = todayFilter === 'all'
            ? todayBookings
            : todayFilter === 'confirmed'
            ? todayBookings.filter(b => b.status === 'confirmed' && !b.hasResult)
            : todayBookings.filter(b => b.status === 'pending');

          return (
          <div>
            {/* 필터 버튼 */}
            <div className="flex gap-2 mb-3">
          <button
                onClick={() => setTodayFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  todayFilter === 'all' ? 'bg-rose-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체 ({todayBookings.length})
          </button>
              <button
                onClick={() => setTodayFilter('confirmed')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  todayFilter === 'confirmed' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                오늘 진료 ({todayBookings.filter(b => b.status === 'confirmed' && !b.hasResult).length})
              </button>
              <button
                onClick={() => setTodayFilter('pending')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  todayFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                확정 대기 ({todayBookings.filter(b => b.status === 'pending').length})
              </button>
      </div>

            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
              {todayFilter === 'all' ? '오늘의 진료 일정' : todayFilter === 'confirmed' ? '오늘 진료 대상' : '확정 대기 예약'} ({filteredBookings.length}건)
            </h2>

            {filteredBookings.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
                <div className="text-6xl mb-3">{todayFilter === 'pending' ? '✅' : '📅'}</div>
                <p className="text-gray-400">{todayFilter === 'pending' ? '확정 대기 중인 예약이 없습니다' : '오늘 예약이 없습니다'}</p>
                <p className="text-gray-300 text-sm mt-1">새 예약이 들어오면 실시간으로 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking, index) => (
                  <div
                    key={booking.id || index}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* 상단: 시간 & 상태 */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{booking.time || '시간 미정'}</span>
                        {(booking.aiDiagnosis || booking.diagnosisId) && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            AI진단서
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'completed' && booking.sharedToGuardian
                          ? 'bg-blue-100 text-blue-800'
                          : booking.hasResult && !booking.sharedToGuardian
                          ? 'bg-purple-100 text-purple-800'
                          : getStatusBadgeClass(booking.status)
                      }`}>
                        {booking.status === 'completed' && booking.sharedToGuardian
                          ? '진료 완료'
                          : booking.hasResult && !booking.sharedToGuardian
                          ? '진단서 저장됨'
                          : getStatusLabel(booking.status)}
                      </span>
                    </div>

                    {/* 환자 정보 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden border-2 border-rose-200">
                        <img
                          src={booking.pet?.profileImage || getPetImage(booking.pet || { species: booking.pet?.species || 'dog' }, false)}
                          alt={booking.pet?.name || '반려동물'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {booking.pet?.name || '미등록'}
                          <span className="text-gray-500 font-normal ml-1">
                            ({SPECIES_LABELS[booking.pet?.species] || '기타'}, {formatAge(booking.pet?.age)})
                          </span>
                          {booking.pet?.sex && <span className="ml-1">{formatGender(booking.pet.sex)}</span>}
                        </h3>
                        <p className="text-sm text-gray-600">
                          보호자: {booking.owner?.displayName || booking.owner?.name || '알 수 없음'}
                        </p>
                        {booking.owner?.phone && (
                          <p className="text-xs text-gray-400">{booking.owner.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* 증상/진단 미리보기 */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-gray-500 mb-1">주요 증상</div>
                      <div className="text-sm text-gray-900">
                        {booking.aiDiagnosis?.diagnosis || booking.aiDiagnosis?.mainDiagnosis || booking.symptom || '일반 진료'}
                      </div>
                    </div>

                    {/* 정보 버튼들 - 양방향 데이터 교류 핵심 */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
          <button
                        onClick={() => handleShowPatientDetail(booking)}
                        className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors flex flex-col items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-lg">pets</span>
                        환자정보
                      </button>
                      <button
                        onClick={() => handleShowAIDiagnosis(booking)}
                        disabled={!booking.aiDiagnosis && !booking.diagnosisId}
                        className={`p-2 border rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-colors
                          ${booking.aiDiagnosis || booking.diagnosisId
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                      >
                        <span className="material-symbols-outlined text-lg">description</span>
                        AI진단서
          </button>
          <button
            onClick={() => handleShowHistory(booking)}
                        className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors flex flex-col items-center gap-1"
          >
                        <span className="material-symbols-outlined text-lg">history</span>
                        과거기록
          </button>
        </div>

                    {/* 액션 버튼 - 상태별 분기 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 좌측 버튼: 예약 확정 / 진료 예정 / 진료 완료 */}
                      <button
                        onClick={() => {
                          if (booking.status === 'pending') {
                            handleConfirmBooking(booking);
                          }
                        }}
                        disabled={booking.status !== 'pending'}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
                          ${booking.status === 'pending'
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-gray-100 text-gray-700 cursor-default'}`}
                      >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        {booking.status === 'pending'
                          ? '예약 확정'
                          : booking.status === 'confirmed'
                          ? '진료 예정'
                          : booking.status === 'completed'
                          ? '진료 완료'
                          : '예약 상태'}
                      </button>

                      {/* 우측 버튼: 진료 시작 / 보호자에게 공유하기 / 진료 결과 보기 */}
                      <button
                        onClick={() => {
                          if (booking.status === 'pending') {
                            // pending 상태에서는 아무 동작 안 함
                            return;
                          } else if (booking.status === 'confirmed' && !booking.hasResult) {
                            // 진료 예정이고 진단서가 없으면 진료 시작
                            handleStartTreatment(booking.id);
                          } else if (booking.status === 'confirmed' && booking.hasResult && !booking.sharedToGuardian) {
                            // 진단서 저장됐지만 공유 전이면 TreatmentSheet 열기 (공유하기)
                            handleStartTreatment(booking.id);
                          } else if (booking.status === 'completed' || booking.sharedToGuardian) {
                            // 완료 상태면 진료 결과 보기
                            handleShowResultDetail(booking);
                          }
                        }}
                        disabled={booking.status === 'pending'}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
                          ${booking.status === 'pending'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : booking.hasResult && !booking.sharedToGuardian
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                      >
                        {booking.status === 'pending' && (
                          <>
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        진료 시작
                          </>
                        )}
                        {booking.status === 'confirmed' && !booking.hasResult && (
                          <>
                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                            진료 시작
                          </>
                        )}
                        {booking.status === 'confirmed' && booking.hasResult && !booking.sharedToGuardian && (
                          <>
                            <span className="material-symbols-outlined text-lg">send</span>
                            보호자에게 공유하기
                          </>
                        )}
                        {(booking.status === 'completed' || booking.sharedToGuardian) && (
                          <>
                            <span className="material-symbols-outlined text-lg">description</span>
                            진료 결과 보기
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        })()}

        {/* 환자정보 Tab */}
        {activeTab === 'patients' && (
          <div>
            {selectedPatient ? (
              // 선택된 환자의 진료 기록 뷰
              <div>
                {/* 뒤로가기 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => { setSelectedPatient(null); setPatientRecords([]); }}
                    className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-600">arrow_back</span>
                </button>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden border-2 border-rose-200">
                      <img
                        src={selectedPatient.profileImage || getPetImage({ species: selectedPatient.species }, false)}
                        alt={selectedPatient.name}
                        className="w-full h-full object-cover"
                      />
                  </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedPatient.name}</h2>
                      <p className="text-sm text-gray-500">
                        {SPECIES_LABELS[selectedPatient.species] || '기타'} · 방문 {selectedPatient.visitCount}회
                      </p>
                </div>
                  </div>
                </div>

                {/* 진료 기록 목록 */}
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                  진료 기록 ({patientRecords.length}건)
                </h3>

                {patientRecordsLoading ? (
                  <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-200">
                    <div className="animate-spin text-4xl mb-2">🔄</div>
                    <p className="text-gray-400">진료 기록을 불러오는 중...</p>
                  </div>
                ) : patientRecords.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-200">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-gray-400">진료 기록이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientRecords.map((record, index) => (
                      <div
                        key={record.id || index}
                        className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
                      >
                        {/* 날짜 & 상태 */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-sm font-bold text-gray-900">{record.date}</span>
                            <span className="text-gray-400 ml-2">{record.time}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(record.status)}`}>
                            {getStatusLabel(record.status)}
                          </span>
                        </div>

                        {/* 증상/진단 */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="text-xs text-gray-500 mb-1">증상</div>
                          <p className="text-sm text-gray-900">
                            {record.aiDiagnosis?.diagnosis || record.symptom || '일반 진료'}
                          </p>
                        </div>

                        {/* 진료 결과 (있는 경우) */}
                        {record.result && (
                          <div className="bg-emerald-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-1 text-xs text-emerald-600 mb-1">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              병원 진료 결과
                            </div>
                            <p className="text-sm text-emerald-900 font-medium">
                              {record.result.diagnosis || record.result.summary || '진료 완료'}
                            </p>
                            {record.result.treatment && (
                              <p className="text-xs text-emerald-700 mt-1">
                                처치: {record.result.treatment}
                              </p>
                            )}
                          </div>
                        )}

                        {/* AI 진단서 보기 버튼 */}
                        {(record.aiDiagnosis || record.diagnosisId) && (
                <button
                            onClick={() => handleShowAIDiagnosis(record)}
                            className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                >
                            <span className="material-symbols-outlined text-lg">smart_toy</span>
                            AI 진단서 보기
                </button>
                        )}
              </div>
                    ))}
            </div>
                )}
              </div>
            ) : (
              // 환자 목록 (폴더) 뷰
              <div>
                <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-400 rounded-full"></span>
                  환자 목록
                </h2>

                {patientList.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-200">
                    <div className="text-5xl mb-3">📁</div>
                    <p className="text-gray-400">등록된 환자가 없습니다</p>
                    <p className="text-gray-300 text-sm mt-1">예약이 들어오면 자동으로 추가됩니다</p>
              </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {patientList.map((patient, index) => (
                      <div
                        key={patient.id || index}
                        onClick={() => handleSelectPatient(patient)}
                        className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        {/* 환자 이미지 */}
                        <div className="flex justify-center mb-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden border-2 border-rose-200 shadow-md">
                            <img
                              src={patient.profileImage || getPetImage({ species: patient.species }, false)}
                              alt={patient.name}
                              className="w-full h-full object-cover"
                            />
            </div>
                        </div>

                        {/* 환자 정보 */}
                        <div className="text-center">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{patient.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {SPECIES_LABELS[patient.species] || '기타'}
                          </p>
                          <div className="flex items-center justify-center gap-1 text-xs text-rose-500 mt-2">
                            <span className="material-symbols-outlined text-sm">folder</span>
                            진료 {patient.visitCount}건
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            최근: {patient.lastVisit || '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 예약 달력 Tab */}
        {activeTab === 'calendar' && (
          <div>
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 mb-4 shadow-md border border-rose-100">
              <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="bg-white p-2 rounded-lg shadow-sm hover:bg-rose-50 transition-colors">
                  <span className="material-symbols-outlined text-rose-500">chevron_left</span>
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-rose-900">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </h2>
                  <p className="text-xs text-rose-500 mt-1">예약 현황</p>
                </div>
                <button onClick={handleNextMonth} className="bg-white p-2 rounded-lg shadow-sm hover:bg-rose-50 transition-colors">
                  <span className="material-symbols-outlined text-rose-500">chevron_right</span>
                </button>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div key={day} className={`text-center text-sm font-bold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-rose-800'}`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* 캘린더 그리드 */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* 선택된 날짜의 예약 목록 */}
            {selectedDate && (
              <div className="bg-white border-2 border-rose-300 rounded-2xl p-5 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-red-300 to-rose-400 text-white px-3 py-1 rounded-lg">
                      {selectedDate}일
                    </span>
                    예약 목록
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors">
                    <span className="material-symbols-outlined text-xl text-gray-600">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {getSelectedDateBookings().length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <span className="material-symbols-outlined text-4xl block mb-2">event_busy</span>
                      예약이 없습니다
                    </div>
                  ) : (
                    getSelectedDateBookings().map((booking, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleShowPatientDetail(booking)}
                        className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer
                          ${booking.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                            booking.status === 'completed' ? 'bg-blue-50 border-blue-200' :
                            'bg-amber-50 border-amber-200'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-900">{booking.time}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold text-white
                            ${booking.status === 'confirmed' ? 'bg-green-500' :
                              booking.status === 'completed' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src={getPetImage(booking.pet || { species: 'dog' }, false)}
                            alt={booking.pet?.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900">{booking.pet?.name || '미등록'}</span>
                            <span className="text-gray-500"> · {booking.owner?.displayName || booking.owner?.name || '보호자'}</span>
                          </div>
                        </div>
                        {(booking.aiDiagnosis || booking.diagnosisId) && (
                          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            AI 진단서 첨부됨
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!selectedDate && (
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center text-gray-500 text-sm">
                <span className="material-symbols-outlined text-2xl block mb-1 text-rose-300">touch_app</span>
                날짜를 클릭하면 예약 목록을 확인할 수 있습니다
              </div>
            )}
          </div>
        )}

        {/* 진료 현황 Tab */}
        {activeTab === 'stats' && (
          <div>
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400">analytics</span>
              {currentMonth.getMonth() + 1}월 진료 현황
            </h2>

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-red-300 to-rose-400 text-white p-4 rounded-2xl shadow-lg text-center">
                <div className="text-3xl font-bold">{monthlyStats.total}</div>
                <div className="text-red-100 text-sm">총 진료 완료</div>
              </div>
              <div className="bg-gradient-to-br from-sky-400 to-sky-500 text-white p-4 rounded-2xl shadow-lg text-center">
                <div className="text-3xl font-bold">{monthlyStats.estimatedRevenue.toLocaleString()}원</div>
                <div className="text-sky-100 text-sm">예상 매출</div>
              </div>
            </div>

            {/* 예약 현황 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">event_note</span>
                예약 현황
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-200">
                  <div className="text-2xl font-bold text-amber-600">{monthlyStats.pendingCount}</div>
                  <div className="text-xs text-amber-700">확정 대기</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{monthlyStats.confirmedCount}</div>
                  <div className="text-xs text-green-700">확정됨</div>
                </div>
              </div>
            </div>

            {/* 종류별 진료 수 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">pets</span>
                종류별 진료 수
              </h3>
              {Object.keys(monthlyStats.speciesCount).length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <span className="material-symbols-outlined text-3xl block mb-2">bar_chart</span>
                  이번 달 진료 기록이 없습니다
                      </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(monthlyStats.speciesCount)
                    .sort((a, b) => b[1] - a[1])
                    .map(([species, count]) => (
                      <div key={species} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-700 font-medium">{SPECIES_LABELS[species] || '기타'}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-300 to-rose-400 rounded-full"
                              style={{ width: `${(count / monthlyStats.total) * 100}%` }}
                            />
                    </div>
                          <span className="font-bold text-rose-500 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* 병원 설정 Tab (병원정보 + 임직원 관리 통합) */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* 병원 정보 섹션 */}
          <div>
            <h2 className="font-bold text-gray-900 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400">local_hospital</span>
                  병원 정보
                </span>
              {!isEditingClinic && (
                <button
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setEditClinic({
                      name: currentClinic?.name || '',
                      address: currentClinic?.address || '',
                      phone: currentClinic?.phone || ''
                    });
                    setIsEditingClinic(true);
                  }}
                >
                  수정
                </button>
              )}
            </h2>

              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-3">
              <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">병원명</div>
                {isEditingClinic ? (
                  <input
                    type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editClinic?.name || ''}
                    onChange={e => setEditClinic(prev => ({ ...prev, name: e.target.value }))}
                  />
                ) : (
                      <div className="text-sm text-gray-900 font-medium">{currentClinic?.name}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">내 역할</div>
                    <div className="text-sm text-gray-600">
                      {currentClinic?.staffRole === 'director' ? '원장' :
                       currentClinic?.staffRole === 'vet' ? '수의사' :
                       currentClinic?.staffRole === 'nurse' ? '간호사' : '스태프'}
                    </div>
                  </div>
              </div>

              <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">주소</div>
                {isEditingClinic ? (
                  <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    value={editClinic?.address || ''}
                    onChange={e => setEditClinic(prev => ({ ...prev, address: e.target.value }))}
                  />
                ) : (
                    <div className="text-sm text-gray-600">{currentClinic?.address || '주소 정보 없음'}</div>
                )}
              </div>

              <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">전화번호</div>
                {isEditingClinic ? (
                  <input
                    type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editClinic?.phone || ''}
                    onChange={e => setEditClinic(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                    <div className="text-sm text-gray-600">{currentClinic?.phone || '전화번호 정보 없음'}</div>
                )}
              </div>

              {isEditingClinic && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => { setEditClinic(null); setIsEditingClinic(false); }}
                  >
                    취소
                  </button>
                  <button
                      className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    onClick={async () => {
                      if (!currentClinic?.id) return;
                      try {
                        const { updateClinicInfo } = await import('../services/clinicService');
                          const res = await updateClinicInfo(currentClinic.id, editClinic);
                        if (!res?.success) {
                            alert('병원 정보 수정에 실패했습니다.');
                          return;
                        }
                          setCurrentClinic(prev => ({ ...prev, ...editClinic }));
                        setIsEditingClinic(false);
                          alert('병원 정보가 수정되었습니다.');
                      } catch (error) {
                          alert('병원 정보 수정에 실패했습니다.');
                      }
                    }}
                  >
                    저장
                  </button>
                </div>
              )}
              </div>
            </div>

            {/* 임직원 관리 섹션 */}
            <div>
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">group</span>
                임직원 관리
              </h2>

              <div className="bg-white rounded-2xl p-4 shadow-sm">
                {/* 등록된 임직원 목록 */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">등록된 임직원</h3>
                  {staffList.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-lg">
                      등록된 임직원이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {staffList.map(staff => (
                        <div key={staff.id} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{staff.user?.displayName || staff.user?.email || '이름 없음'}</div>
                            <div className="text-xs text-gray-500">{staff.user?.email}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                            ${staff.role === 'director' ? 'bg-rose-100 text-rose-700' :
                              staff.role === 'vet' ? 'bg-blue-100 text-blue-700' :
                              staff.role === 'nurse' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'}`}>
                            {staff.role === 'director' ? '원장' :
                             staff.role === 'vet' ? '수의사' :
                             staff.role === 'nurse' ? '간호사' : '스태프'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 새 임직원 등록 */}
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 mb-2">새 임직원 등록</h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="직원 이메일"
                      value={newStaffEmail}
                      onChange={e => setNewStaffEmail(e.target.value)}
                    />
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer min-w-[100px]"
                      value={newStaffRole}
                      onChange={e => setNewStaffRole(e.target.value)}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.5rem center',
                        backgroundSize: '12px'
                      }}
                    >
                      <option value="" disabled>직무</option>
                      <option value="vet">수의사</option>
                      <option value="nurse">간호사</option>
                      <option value="staff">스태프</option>
                    </select>
                    <button
                      onClick={handleAddStaff}
                      disabled={isAddingStaff}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isAddingStaff ? '...' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 진료서 작성 모달 */}
      {activeTreatmentBooking && (
        <TreatmentSheet
          booking={activeTreatmentBooking}
          clinic={currentClinic}
          onClose={() => setActiveTreatmentBooking(null)}
          onSaved={async () => {
            // ✅ 진단서 저장 후 해당 booking의 hasResult를 즉시 갱신
            const bookingId = activeTreatmentBooking.bookingId || activeTreatmentBooking.id;
            const enriched = await enrichBookingWithResult(activeTreatmentBooking);
            
            setTodayBookings(prev => 
              prev.map(b => {
                if (b.id === activeTreatmentBooking.id || b.bookingId === bookingId) {
                  return enriched;
                }
                return b;
              })
            );
            
            // 전체 데이터도 갱신 (권한 오류 시 무시)
            try {
              await loadClinicData();
            } catch (error) {
              console.warn('병원 데이터 갱신 중 오류 (무시):', error);
              // 권한 오류는 무시하고 계속 진행
            }
          }}
          onShared={async () => {
            // ✅ 공유 완료 후 해당 booking의 상태를 즉시 갱신
            const bookingId = activeTreatmentBooking.bookingId || activeTreatmentBooking.id;
            const enriched = await enrichBookingWithResult(activeTreatmentBooking);
            
            setTodayBookings(prev => 
              prev.map(b => {
                if (b.id === activeTreatmentBooking.id || b.bookingId === bookingId) {
                  return { ...enriched, sharedToGuardian: true, status: 'completed' };
                }
                return b;
              })
            );
            
            setActiveTreatmentBooking(null);
            
            // 전체 데이터도 갱신 (권한 오류 시 무시)
            try {
              await loadClinicData();
            } catch (error) {
              console.warn('병원 데이터 갱신 중 오류 (무시):', error);
              // 권한 오류는 무시하고 계속 진행
            }
          }}
        />
      )}

      {/* 환자 상세정보 모달 */}
      {detailModalType === 'patient' && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-red-300 to-rose-400 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">환자 정보</h3>
                <button onClick={() => { setDetailModalType(null); setSelectedBooking(null); }} className="p-1 hover:bg-white/20 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* 동물 정보 */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-rose-100">
                  <img
                    src={selectedBooking.pet?.profileImage || getPetImage(selectedBooking.pet || { species: 'dog' }, false)}
                    alt={selectedBooking.pet?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedBooking.pet?.name || '미등록'}</h4>
                  <p className="text-gray-600">
                    {SPECIES_LABELS[selectedBooking.pet?.species] || '기타'} · {selectedBooking.pet?.breed || '품종 미상'}
                  </p>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">나이</span>
                  <span className="font-medium">{formatAge(selectedBooking.pet?.age)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">성별</span>
                  <span className="font-medium">{selectedBooking.pet?.sex === 'M' ? '수컷' : selectedBooking.pet?.sex === 'F' ? '암컷' : '미상'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">체중</span>
                  <span className="font-medium">{selectedBooking.pet?.weight ? `${selectedBooking.pet.weight}kg` : '미등록'}</span>
                </div>
              </div>

              {/* 보호자 정보 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  보호자 정보
                </h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">이름</span>
                    <span className="font-medium text-blue-900">{selectedBooking.owner?.displayName || selectedBooking.owner?.name || '알 수 없음'}</span>
                  </div>
                  {selectedBooking.owner?.phone && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">연락처</span>
                      <a href={`tel:${selectedBooking.owner.phone}`} className="font-medium text-blue-900 underline">{selectedBooking.owner.phone}</a>
                    </div>
                  )}
                  {selectedBooking.owner?.email && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">이메일</span>
                      <span className="font-medium text-blue-900">{selectedBooking.owner.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 예약 정보 */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">event</span>
                  예약 정보
                </h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">예약일시</span>
                    <span className="font-medium text-amber-900">{selectedBooking.date} {selectedBooking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">증상/메모</span>
                    <span className="font-medium text-amber-900">{selectedBooking.symptom || selectedBooking.message || '없음'}</span>
                  </div>
                </div>
                  </div>

              {/* AI 진단 요약 */}
              {(selectedBooking.aiDiagnosis || selectedBooking.diagnosisId) && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    AI 진단 요약
                  </h5>
                  <div className="text-sm text-emerald-800">
                    <p className="font-medium">{selectedBooking.aiDiagnosis?.diagnosis || selectedBooking.aiDiagnosis?.mainDiagnosis || '진단명 없음'}</p>
                    {selectedBooking.aiDiagnosis?.description && (
                      <p className="mt-1 text-emerald-700 line-clamp-3">{selectedBooking.aiDiagnosis.description}</p>
                    )}
                      </div>
                  <button
                    onClick={() => {
                      setDetailModalType(null);
                      handleShowAIDiagnosis(selectedBooking);
                    }}
                    className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-1"
                  >
                    AI 진단서 상세보기
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                        </div>
                      )}
            </div>
          </div>
                        </div>
                      )}

      {/* AI 진단서 상세보기 모달 */}
      {aiDiagnosisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">smart_toy</span>
                  AI 진단서
                </h3>
                <button onClick={() => setAiDiagnosisModal(null)} className="p-1 hover:bg-white/20 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-emerald-100 text-sm mt-1">보호자가 전송한 AI 분석 결과</p>
            </div>

            <div className="p-4 space-y-4">
              {/* 환자 정보 */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <img
                  src={getPetImage(aiDiagnosisModal.booking?.pet || { species: 'dog' }, false)}
                  alt="pet"
                  className="w-12 h-12 rounded-full object-cover"
                />
                        <div>
                  <div className="font-bold text-gray-900">{aiDiagnosisModal.booking?.pet?.name || '환자'}</div>
                  <div className="text-sm text-gray-500">
                    {aiDiagnosisModal.booking?.owner?.displayName || '보호자'}님이 전송
                        </div>
                </div>
              </div>

              {/* 진단명 */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-sm text-emerald-600 mb-1">주요 진단</div>
                <div className="text-lg font-bold text-emerald-900">
                  {typeof aiDiagnosisModal.diagnosis?.diagnosis === 'string'
                    ? aiDiagnosisModal.diagnosis.diagnosis
                    : (aiDiagnosisModal.diagnosis?.diagnosis?.name || aiDiagnosisModal.diagnosis?.mainDiagnosis || '진단명 없음')}
                </div>
              </div>

              {/* 응급도 & 신뢰도 */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl text-center
                  ${aiDiagnosisModal.diagnosis?.emergency === 'high' ? 'bg-red-100' :
                    aiDiagnosisModal.diagnosis?.emergency === 'medium' ? 'bg-amber-100' : 'bg-green-100'}`}>
                  <div className="text-xs text-gray-600 mb-1">응급도</div>
                  <div className={`font-bold
                    ${aiDiagnosisModal.diagnosis?.emergency === 'high' ? 'text-red-700' :
                      aiDiagnosisModal.diagnosis?.emergency === 'medium' ? 'text-amber-700' : 'text-green-700'}`}>
                    {aiDiagnosisModal.diagnosis?.emergency === 'high' ? '높음' :
                     aiDiagnosisModal.diagnosis?.emergency === 'medium' ? '보통' : '낮음'}
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl text-center">
                  <div className="text-xs text-gray-600 mb-1">신뢰도</div>
                  <div className="font-bold text-blue-700">
                    {Math.round((aiDiagnosisModal.diagnosis?.probability || aiDiagnosisModal.diagnosis?.confidence || 0.7) * 100)}%
                  </div>
                </div>
              </div>

              {/* 상세 설명 */}
              {aiDiagnosisModal.diagnosis?.description && (
                        <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">상세 설명</div>
                  <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700">
                    {aiDiagnosisModal.diagnosis.description}
                        </div>
                    </div>
                  )}

              {/* 권장 조치 */}
              {aiDiagnosisModal.diagnosis?.actions?.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">권장 조치사항</div>
                  <div className="space-y-2">
                    {aiDiagnosisModal.diagnosis.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                        <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700">{action}</span>
                </div>
                    ))}
            </div>
                </div>
              )}

              {/* 증상 정보 */}
              {aiDiagnosisModal.diagnosis?.symptom && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">보호자 설명 증상</div>
                  <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700">
                    {aiDiagnosisModal.diagnosis.symptom}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 과거 기록 모달 */}
      {detailModalType === 'history' && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedBooking.pet?.name || '환자'} 과거 기록</h3>
                <button onClick={() => { setDetailModalType(null); setSelectedBooking(null); }} className="p-1 hover:bg-white/20 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-4">
            {historyLoading ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                  불러오는 중...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI 진단 기록 */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">smart_toy</span>
                      AI 진단 기록
                    </h4>
                  {historyData.diagnoses.length === 0 ? (
                      <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded-lg">기록 없음</div>
                    ) : (
                      <div className="space-y-2">
                        {historyData.diagnoses.slice(0, 5).map(d => (
                          <div key={d.id} className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                            <div className="text-xs text-emerald-600 mb-1">
                              {d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleDateString('ko-KR') : d.createdAt}
                          </div>
                            <div className="font-semibold text-emerald-900">{typeof d.diagnosis === 'string' ? d.diagnosis : (d.diagnosis?.name || '진단 정보')}</div>
                            {d.symptom && <div className="text-sm text-emerald-700 mt-1">{d.symptom}</div>}
                          </div>
                        ))}
                      </div>
                  )}
                </div>

                  {/* 병원 진료 기록 */}
                <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-rose-400 text-lg">local_hospital</span>
                      병원 진료 기록
                    </h4>
                  {historyData.results.length === 0 ? (
                      <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded-lg">기록 없음</div>
                    ) : (
                      <div className="space-y-2">
                        {historyData.results.slice(0, 5).map(r => (
                          <div key={r.id} className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
                            <div className="text-xs text-rose-500 mb-1">{r.visitDate} {r.visitTime}</div>
                            <div className="font-semibold text-rose-900">{r.mainDiagnosis || r.diagnosis}</div>
                            {r.soap?.assessment && (
                              <div className="text-sm text-rose-700 mt-1 line-clamp-2">{r.soap.assessment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                  )}
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 병원 진단서 상세보기 모달 */}
      {resultModalOpen && selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-300 to-rose-400 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">병원 진단서</h3>
                <button onClick={() => { setResultModalOpen(false); setSelectedResult(null); }} className="p-1 hover:bg-white/20 rounded-full">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-red-100 text-sm">{selectedResult.visitDate} {selectedResult.visitTime}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="text-sm text-rose-500 mb-1">주 진단명</div>
                <div className="text-lg font-bold text-rose-900">
                  {selectedResult.mainDiagnosis || selectedResult.diagnosis || '기록 없음'}
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl text-center">
                <div className="text-xs text-amber-600">Triage 점수</div>
                <div className="text-2xl font-bold text-amber-700">{selectedResult.triageScore ?? '-'}/5</div>
              </div>

              {selectedResult.soap && (
                <div className="space-y-3">
                  {selectedResult.soap.subjective && (
                  <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Subjective (보호자 설명)</div>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{selectedResult.soap.subjective}</div>
                    </div>
                  )}
                  {selectedResult.soap.objective && (
                  <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Objective (진찰 소견)</div>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{selectedResult.soap.objective}</div>
                    </div>
                  )}
                  {selectedResult.soap.assessment && (
                  <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Assessment (평가)</div>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{selectedResult.soap.assessment}</div>
                    </div>
                  )}
                  {selectedResult.soap.plan && (
                  <div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Plan (치료 계획)</div>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{selectedResult.soap.plan}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 하단 고정 네비게이션 - 보호자 모드 전환 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex items-center justify-center p-3">
          <button
            onClick={onModeSwitch}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <span>🐕</span>
            <span>보호자 모드로 전환</span>
          </button>
        </div>
      </div>

      {/* 하단 네비게이션 공간 확보 */}
      <div className="h-20"></div>
    </div>
  );
}

export default ClinicDashboard;
