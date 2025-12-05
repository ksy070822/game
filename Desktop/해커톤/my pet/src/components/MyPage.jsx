import { useState, useEffect } from 'react';
import { getPetImage, getProfileImage } from '../utils/imagePaths';
import { clinicResultService, bookingService } from '../services/firestore';

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

const DIAGNOSIS_KEY = 'petMedical_diagnoses';
const STORAGE_KEY = 'petMedical_pets';
const BOOKINGS_KEY = 'petMedical_bookings';
const CLINIC_RESULTS_KEY = 'petMedical_clinicResults';

// 사용자별 키 생성
const getUserPetsKey = (userId) => `petMedical_pets_${userId}`;
const getUserDiagnosesKey = (userId) => `petMedical_diagnoses_${userId}`;
const getUserBookingsKey = (userId) => `petMedical_bookings_${userId}`;

// 사용자별 데이터 가져오기
const getPetsForUser = (userId) => {
  if (!userId) return [];
  try {
    const data = localStorage.getItem(getUserPetsKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const savePetsForUser = (userId, pets) => {
  if (!userId) return;
  try {
    localStorage.setItem(getUserPetsKey(userId), JSON.stringify(pets));
  } catch (error) {
    console.error('Failed to save pets:', error);
  }
};

const getDiagnosesForUser = (userId) => {
  if (!userId) return [];
  try {
    const data = localStorage.getItem(getUserDiagnosesKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getBookingsForUser = (userId) => {
  if (!userId) return [];
  try {
    const data = localStorage.getItem(getUserBookingsKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveBookingsForUser = (userId, bookings) => {
  if (!userId) return;
  try {
    localStorage.setItem(getUserBookingsKey(userId), JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save bookings:', error);
  }
};

// 기존 호환용
const getDiagnosesFromStorage = () => {
  try {
    const data = localStorage.getItem(DIAGNOSIS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getPetsFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const savePetsToStorage = (pets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
  } catch (error) {
    console.error('Failed to save pets:', error);
  }
};

const getBookingsFromStorage = () => {
  try {
    const data = localStorage.getItem(BOOKINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveBookingsToStorage = (bookings) => {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save bookings:', error);
  }
};

// 병원 진료 기록 가져오기
const getClinicResultsFromStorage = () => {
  try {
    const data = localStorage.getItem(CLINIC_RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export function MyPage({ onBack, onSelectPet, onViewDiagnosis, onAddPet, onClinicMode, onHome, userId, onPetsUpdate }) {
  // localStorage에서 초기 탭 확인
  const getInitialTab = () => {
    const savedTab = localStorage.getItem('mypage_initialTab');
    if (savedTab && ['pets', 'bookings', 'records'].includes(savedTab)) {
      localStorage.removeItem('mypage_initialTab');
      return savedTab;
    }
    return 'pets';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab); // 'pets', 'records', 'bookings'
  
  // 커스텀 이벤트 리스너 추가
  useEffect(() => {
    const handleSetTab = (event) => {
      if (event.detail && ['pets', 'bookings', 'records'].includes(event.detail)) {
        setActiveTab(event.detail);
      }
    };
    window.addEventListener('mypage-set-tab', handleSetTab);
    return () => window.removeEventListener('mypage-set-tab', handleSetTab);
  }, []);
  const [pets, setPets] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicResults, setClinicResults] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingPet, setEditingPet] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // 페이지 진입 시 스크롤을 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // 사용자별 데이터 로드
    if (userId) {
      setPets(getPetsForUser(userId));
      setDiagnoses(getDiagnosesForUser(userId));

      // Firestore에서 예약 조회 (상태 변경 반영)
      const loadBookings = async () => {
        try {
          const result = await bookingService.getBookingsByUser(userId);
          if (result.success && result.data.length > 0) {
            setBookings(result.data);
            // localStorage도 동기화
            saveBookingsForUser(userId, result.data);
          } else {
            // Firestore에 없으면 localStorage 사용
            setBookings(getBookingsForUser(userId));
          }
        } catch (error) {
          console.warn('Firestore 예약 로드 오류, localStorage 사용:', error);
          setBookings(getBookingsForUser(userId));
        }
      };
      loadBookings();
    } else {
      setPets(getPetsFromStorage());
      setDiagnoses(getDiagnosesFromStorage());
      setBookings(getBookingsFromStorage());
    }

  }, [userId]);

  // 병원 진료 기록 로드 (pets가 로드된 후)
  useEffect(() => {
    const loadClinicResults = async () => {
      if (pets.length === 0) return;

      try {
        // 모든 반려동물의 진료 기록 로드 (병원에서 공유된 것만)
        const allResults = [];
        for (const pet of pets) {
          if (pet.id) {
            const resultRes = await clinicResultService.getResultsByPet(pet.id);
            if (resultRes.success && resultRes.data.length > 0) {
              // 병원에서 보호자에게 공유한 진단서만 필터링
              const sharedResults = resultRes.data.filter(r => r.sharedToGuardian === true);
              allResults.push(...sharedResults);
            }
          }
        }

        if (allResults.length > 0) {
          setClinicResults(allResults);
          return;
        }
      } catch (error) {
        console.warn('Firestore 진료 결과 로드 오류:', error);
      }

      // Firestore 실패 시 localStorage 폴백
      setClinicResults(getClinicResultsFromStorage());
    };

    loadClinicResults();
  }, [pets]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskColor = (riskLevel) => {
    // 객체인 경우 level 속성 추출
    const level = typeof riskLevel === 'string' ? riskLevel : (riskLevel?.level || riskLevel?.name || 'medium');
    switch(level) {
      case 'Emergency':
      case 'high': return '#f44336';
      case 'High': return '#ff9800';
      case 'Moderate':
      case 'medium': return '#ff9800';
      case 'Low':
      case 'low': return '#4caf50';
      default: return '#666';
    }
  };

  const getRiskLabel = (riskLevel) => {
    // 객체인 경우 level 속성 추출
    const level = typeof riskLevel === 'string' ? riskLevel : (riskLevel?.level || riskLevel?.name || 'medium');
    switch(level) {
      case 'Emergency':
      case 'high': return '🔴 응급';
      case 'High': return '🟠 위험';
      case 'Moderate':
      case 'medium': return '🟡 보통';
      case 'Low':
      case 'low': return '🟢 경미';
      default: return '🟡 보통'; // 기본값을 문자열로 반환
    }
  };

  const handleEditPet = (pet) => {
    setEditingPet(pet.id);
    setEditFormData({ ...pet });
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;

    const updatedPets = pets.map(p =>
      p.id === editingPet ? { ...editFormData } : p
    );
    setPets(updatedPets);

    // 사용자별로 저장
    if (userId) {
      savePetsForUser(userId, updatedPets);
    } else {
      savePetsToStorage(updatedPets);
    }

    // 부모 컴포넌트에 pets 업데이트 알림
    if (onPetsUpdate) {
      onPetsUpdate(updatedPets);
    }

    setEditingPet(null);
    setEditFormData(null);
  };

  const handleCancelEdit = () => {
    setEditingPet(null);
    setEditFormData(null);
  };

  const handleDeletePet = (petId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const updatedPets = pets.filter(p => p.id !== petId);
      setPets(updatedPets);

      // 사용자별로 저장
      if (userId) {
        savePetsForUser(userId, updatedPets);
      } else {
        savePetsToStorage(updatedPets);
      }

      // 부모 컴포넌트에 pets 업데이트 알림
      if (onPetsUpdate) {
        onPetsUpdate(updatedPets);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const getBookingStatusInfo = (status) => {
    switch (status) {
      case 'confirmed':
        return { label: '예약 확정', color: 'bg-green-100 text-green-700', icon: 'check_circle' };
      case 'cancelled':
        return { label: '예약 취소', color: 'bg-red-100 text-red-700', icon: 'cancel' };
      case 'completed':
        return { label: '진료 완료', color: 'bg-slate-100 text-slate-700', icon: 'task_alt' };
      default:
        return { label: '확인 대기', color: 'bg-amber-100 text-amber-700', icon: 'schedule' };
    }
  };

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('예약을 취소하시겠습니까?')) {
      const updatedBookings = bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      );
      setBookings(updatedBookings);

      // 사용자별로 저장
      if (userId) {
        saveBookingsForUser(userId, updatedBookings);
      } else {
        saveBookingsToStorage(updatedBookings);
      }
    }
  };

  const formatBookingDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 반려동물 정보 포맷팅 (대분류/품종[이름])
  const formatPetInfo = (booking) => {
    const species = booking.petSpecies || booking.petProfile?.species;
    const breed = booking.petBreed || booking.petProfile?.breed;
    const name = booking.petName || booking.petProfile?.name || '이름 없음';

    if (species) {
      const speciesLabel = SPECIES_LABELS[species] || '기타';
      const breedLabel = breed || '품종 미등록';
      return `${speciesLabel}/${breedLabel}[${name}]`;
    }
    return name;
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="flex items-center bg-background-light/80 p-3 sm:p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex size-10 sm:size-12 shrink-0 items-center text-slate-800">
          <button onClick={onBack} className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-2xl sm:text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-base sm:text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">마이페이지</h2>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {onHome && (
            <button
              onClick={onHome}
              className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-full"
              title="홈으로"
            >
              <span className="material-symbols-outlined text-xl sm:text-2xl">home</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 pt-2 pb-2 bg-background-light border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pets')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === 'pets'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          내 반려동물
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap relative ${
            activeTab === 'bookings'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          내 예약
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
              {bookings.filter(b => b.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === 'records'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          진료 기록
        </button>
      </div>

      {activeTab === 'pets' && (
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-40">
          {pets.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🐾</div>
              <p className="text-slate-500 mb-3 sm:mb-4 text-sm sm:text-base">등록된 반려동물이 없습니다</p>
              <button
                onClick={() => onAddPet && onAddPet()}
                className="bg-primary text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors text-sm sm:text-base"
              >
                반려동물 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {pets.map(pet => (
                <div key={pet.id} className="bg-surface-light rounded-lg p-3 sm:p-4 shadow-soft">
                  {editingPet === pet.id ? (
                    // 편집 모드
                    <div className="space-y-4">
                      {/* 프로필 사진 변경 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">프로필 사진</label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                            <img
                              src={editFormData?.profileImage || getProfileImage(editFormData?.species || 'dog')}
                              alt="프로필"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              id={`profileImage-${pet.id}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert('이미지 크기는 5MB 이하여야 합니다.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    handleInputChange('profileImage', event.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor={`profileImage-${pet.id}`}
                              className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm align-middle mr-1">photo_camera</span>
                              사진 변경
                            </label>
                            {editFormData?.profileImage && (
                              <button
                                onClick={() => handleInputChange('profileImage', null)}
                                className="ml-2 px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg transition-colors"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                        <input
                          type="text"
                          value={editFormData?.petName || ''}
                          onChange={(e) => handleInputChange('petName', e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">품종</label>
                        <input
                          type="text"
                          value={editFormData?.breed || ''}
                          onChange={(e) => handleInputChange('breed', e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">생년월일</label>
                        <input
                          type="date"
                          value={editFormData?.birthDate || ''}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 overflow-hidden flex-shrink-0">
                          <img
                            src={getPetImage(pet, false)}
                            alt={pet.petName}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center', display: 'block' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-900 font-bold text-base sm:text-lg mb-0.5 sm:mb-1 font-display truncate">{pet.petName}</h3>
                          <p className="text-slate-500 text-xs sm:text-sm truncate">
                            {pet.breed || '품종 미등록'} • {
                              pet.birthDate ? (() => {
                                const birth = new Date(pet.birthDate);
                                const today = new Date();
                                const age = today.getFullYear() - birth.getFullYear();
                                return `${age}세`;
                              })() : '나이 미등록'
                            }
                          </p>
                          {pet.sido && (
                            <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">{pet.sido} {pet.sigungu}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={() => onSelectPet && onSelectPet(pet)}
                          className="flex-1 bg-primary text-white py-1.5 sm:py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-xs sm:text-sm"
                        >
                          선택
                        </button>
                        <button
                          onClick={() => handleEditPet(pet)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePet(pet.id)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs sm:text-sm">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => onAddPet && onAddPet()}
                className="w-full bg-primary/10 text-primary py-4 rounded-lg font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                반려동물 추가하기
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-40">
          {bookings.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📅</div>
              <p className="text-slate-500 mb-1.5 sm:mb-2 text-sm sm:text-base">예약 내역이 없습니다</p>
              <p className="text-slate-400 text-xs sm:text-sm">병원 예약을 하면 여기서 확인할 수 있어요</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* 예약 상태별 요약 */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <div className="bg-amber-50 rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700">대기중</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-green-700">확정</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-slate-600">
                    {bookings.filter(b => b.status === 'completed').length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-700">완료</p>
                </div>
              </div>

              {/* 예약 목록 */}
              {bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(booking => {
                const statusInfo = getBookingStatusInfo(booking.status);
                return (
                  <div
                    key={booking.id}
                    className="bg-surface-light rounded-lg p-4 shadow-soft"
                  >
                    {/* 상태 배지 */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">local_hospital</span>
                        <h3 className="text-slate-900 font-bold font-display">
                          {booking.hospital?.name || '병원'}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                        <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* 예약 정보 */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined text-sm text-slate-400">calendar_today</span>
                        <span>{formatBookingDate(booking.date)}</span>
                        <span className="text-slate-400">|</span>
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="material-symbols-outlined text-sm text-slate-400">pets</span>
                        <span>{formatPetInfo(booking)}</span>
                      </div>
                      {booking.hospital?.address && (
                        <div className="flex items-start gap-2 text-sm text-slate-500">
                          <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                          <span>{booking.hospital.address}</span>
                        </div>
                      )}
                    </div>

                    {/* 전달 메시지 */}
                    {booking.message && (
                      <div className="bg-slate-50 rounded-lg p-2 mb-3 text-sm text-slate-600">
                        💬 {booking.message}
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        {booking.hospital?.phone && (
                          <a
                            href={`tel:${booking.hospital.phone}`}
                            className="flex-1 py-2 text-center border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            📞 전화하기
                          </a>
                        )}
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="flex-1 py-2 text-center bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          예약 취소
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && booking.hospital?.phone && (
                      <a
                        href={`tel:${booking.hospital.phone}`}
                        className="block w-full py-2 text-center bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        📞 병원 연락하기
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (() => {
        // AI 진단 기록과 병원 진료 기록 합치기
        const aiRecords = diagnoses.map(d => ({
          ...d,
          source: 'ai'
        }));

        // ✅ 병원에서 보호자에게 실제로 공유한 진료만 리스트에 포함
        const hospitalRecords = clinicResults
          .filter(r => r.sharedToGuardian === true)
          .map(result => ({
            id: result.id,
            date: result.visitDate || result.createdAt,
            created_at: result.visitDate || result.createdAt,
            hospitalName: result.clinicName || result.hospitalName,
            diagnosis: result.mainDiagnosis || result.finalDiagnosis || result.diagnosis,
            petName: result.petName,
            petId: result.petId,
            riskLevel: result.triageScore <= 2 ? 'low' : result.triageScore <= 3 ? 'medium' : 'high',
            treatment: result.soap?.plan || result.treatment,
            assessment: result.soap?.assessment,
            subjective: result.soap?.subjective,
            objective: result.soap?.objective,
            triageScore: result.triageScore,
            medications: result.medications,
            totalCost: result.totalCost,
            doctorNote: result.doctorNote,
            source: 'clinic',
            soap: result.soap,
            mainDiagnosis: result.mainDiagnosis || result.finalDiagnosis || result.diagnosis,
            summary: result.summary || result.description || result.memo || '',
            description: result.description || result.summary || result.memo || ''
          }));

        const allRecords = [...aiRecords, ...hospitalRecords].sort((a, b) =>
          new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
        );

        return (
          <div className="px-4 pt-4 pb-40">
            {/* 색상 안내 */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-sky-200 border border-sky-300"></div>
                <span className="text-slate-600">AI 진단</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-200 border border-red-300"></div>
                <span className="text-slate-600">병원 진료</span>
              </div>
            </div>

            {allRecords.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-slate-500 mb-2">아직 진료 기록이 없습니다</p>
                <p className="text-slate-400 text-sm">AI 진료를 받으면 기록이 저장됩니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allRecords.map(record => {
                  // 해당 반려동물 찾기
                  const pet = pets.find(p => p.id === record.petId);
                  
                  // AI 진단인 경우 하늘색 테마 진단서 카드 (클릭 시 상세보기)
                  if (record.source === 'ai') {
                    const diagnosis = record.diagnosis || record.suspectedConditions?.[0]?.name || '일반 건강 이상';
                    const description = record.description || record.detailDescription || '';
                    const actions = record.actions || record.recommendedActions || [];
                    
                    return (
                      <div
                        key={record.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                        onClick={() => {
                          if (onViewDiagnosis) {
                            // 돌아올 때 진료기록 탭으로 돌아오도록 설정
                            localStorage.setItem('mypage_initialTab', 'records');
                            onViewDiagnosis({ ...record, pet });
                          }
                        }}
                      >
                        {/* 상단: 하늘색 그라데이션 배경 */}
                        <div className="bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 p-5 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                              <span className="material-symbols-outlined text-white">info</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm opacity-90">상세 진단</p>
                              <h3 className="text-xl font-bold mt-1">{diagnosis}</h3>
                              <p className="text-xs opacity-80 mt-1">AI 기반 멀티 에이전트 분석 결과</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* 상세 설명 */}
                          {description && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                                <h4 className="font-bold text-slate-800">상세 설명</h4>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-sky-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
                              </div>
                            </div>
                          )}

                          {/* 권장 조치사항 */}
                          {actions.length > 0 && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                  </svg>
                                </div>
                                <h4 className="font-bold text-slate-800">권장 조치사항</h4>
                              </div>
                              <div className="space-y-2">
                                {actions.map((action, idx) => {
                                  // action이 객체인 경우 처리
                                  const actionText = typeof action === 'string' 
                                    ? action 
                                    : (action?.title || action?.description || action?.text || JSON.stringify(action));
                                  return (
                                    <div key={idx} className="flex items-start gap-3 bg-sky-50 rounded-lg p-3">
                                      <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {idx + 1}
                                      </div>
                                      <p className="text-sm text-slate-700 flex-1">{actionText}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 하단 안내 */}
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-white text-sm">info</span>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-slate-800 mb-1">중요 안내사항</h5>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  본 진단서는 AI가 분석한 참고자료입니다. 증상이 지속되거나 악화될 경우 반드시 전문 수의사의 진료를 받으시기 바랍니다.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 병원 진료인 경우 연레드 테마 진단서 카드 (클릭 시 상세보기)
                  if (record.source === 'clinic') {
                    const diagnosis = record.mainDiagnosis || record.diagnosis || '진단명 없음';
                    const description = record.summary || record.description || record.doctorNote || '';
                    const treatment = record.soap?.plan || record.treatment || '';
                    const soap = record.soap || {};
                    
                    return (
                      <div
                        key={record.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                        onClick={() => {
                          if (onViewDiagnosis) {
                            // 돌아올 때 진료기록 탭으로 돌아오도록 설정
                            localStorage.setItem('mypage_initialTab', 'records');
                            onViewDiagnosis({ ...record, pet });
                          }
                        }}
                      >
                        {/* 상단: 연레드 그라데이션 배경 */}
                        <div className="bg-gradient-to-br from-red-200 via-red-300 to-red-400 p-5 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                              <span className="material-symbols-outlined text-white">local_hospital</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm opacity-90">상세 진료</p>
                              <h3 className="text-xl font-bold mt-1">{diagnosis}</h3>
                              <p className="text-xs opacity-80 mt-1">병원 진료 결과</p>
                              {record.hospitalName && (
                                <p className="text-xs opacity-70 mt-1">{record.hospitalName}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* SOAP 정보 */}
                          {soap.subjective && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                                <h4 className="font-bold text-slate-800">Subjective (보호자 설명)</h4>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{soap.subjective}</p>
                              </div>
                            </div>
                          )}

                          {soap.objective && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                                <h4 className="font-bold text-slate-800">Objective (진찰 소견)</h4>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{soap.objective}</p>
                              </div>
                            </div>
                          )}

                          {soap.assessment && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                                <h4 className="font-bold text-slate-800">Assessment (평가)</h4>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{soap.assessment}</p>
                              </div>
                            </div>
                          )}

                          {/* 상세 설명 */}
                          {description && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                </svg>
                                <h4 className="font-bold text-slate-800">진료 내용</h4>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
                              </div>
                            </div>
                          )}

                          {/* 치료 계획 */}
                          {treatment && (
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                  </svg>
                                </div>
                                <h4 className="font-bold text-slate-800">치료 계획</h4>
                              </div>
                              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{treatment}</p>
                              </div>
                            </div>
                          )}

                          {/* 하단 안내 */}
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-white text-sm">info</span>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-bold text-slate-800 mb-1">중요 안내사항</h5>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  본 진료서는 병원에서 작성한 공식 진료 기록입니다.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}

