import { useState, useEffect } from 'react';
import { getAllApiKeys, saveAllApiKeys, API_KEY_TYPES, getRequiredApiKeysStatus } from '../services/apiKeyManager';

const DIAGNOSIS_KEY = 'petMedical_diagnoses';
const STORAGE_KEY = 'petMedical_pets';
const BOOKINGS_KEY = 'petMedical_bookings';

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

export function MyPage({ onBack, onSelectPet, onViewDiagnosis, onAddPet, onClinicMode, onHome, userId }) {
  const [activeTab, setActiveTab] = useState('pets'); // 'pets', 'records', 'bookings', or 'settings'
  const [pets, setPets] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingPet, setEditingPet] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // API 키 설정 상태
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    openai: '',
    anthropic: ''
  });
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({
    gemini: false,
    openai: false,
    anthropic: false
  });

  useEffect(() => {
    // 사용자별 데이터 로드
    if (userId) {
      setPets(getPetsForUser(userId));
      setDiagnoses(getDiagnosesForUser(userId));
      setBookings(getBookingsForUser(userId));
    } else {
      setPets(getPetsFromStorage());
      setDiagnoses(getDiagnosesFromStorage());
      setBookings(getBookingsFromStorage());
    }

    // API 키 로드
    const storedKeys = getAllApiKeys();
    setApiKeys({
      gemini: storedKeys[API_KEY_TYPES.GEMINI] || '',
      openai: storedKeys[API_KEY_TYPES.OPENAI] || '',
      anthropic: storedKeys[API_KEY_TYPES.ANTHROPIC] || ''
    });
  }, [userId]);

  const handleSaveApiKeys = () => {
    const keysToSave = {
      [API_KEY_TYPES.GEMINI]: apiKeys.gemini,
      [API_KEY_TYPES.OPENAI]: apiKeys.openai,
      [API_KEY_TYPES.ANTHROPIC]: apiKeys.anthropic
    };
    saveAllApiKeys(keysToSave);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const toggleShowApiKey = (key) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    switch(riskLevel) {
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
    switch(riskLevel) {
      case 'Emergency':
      case 'high': return '🔴 응급';
      case 'High': return '🟠 위험';
      case 'Moderate':
      case 'medium': return '🟡 보통';
      case 'Low':
      case 'low': return '🟢 경미';
      default: return riskLevel;
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

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="flex items-center bg-background-light/80 p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex size-12 shrink-0 items-center text-slate-800">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">마이페이지</h2>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {onHome && (
            <button
              onClick={onHome}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"
              title="홈으로"
            >
              <span className="material-symbols-outlined text-2xl">home</span>
            </button>
          )}
          {onClinicMode && (
            <button
              onClick={onClinicMode}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
              title="병원 모드"
            >
              <span className="material-symbols-outlined text-2xl">local_hospital</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-2 bg-background-light border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pets')}
          className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'pets'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          내 반려동물
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm transition-colors whitespace-nowrap relative ${
            activeTab === 'bookings'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          내 예약
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {bookings.filter(b => b.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'records'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          진료 기록
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-slate-600'
          }`}
        >
          설정
        </button>
      </div>

      {activeTab === 'pets' && (
        <div className="px-4 pt-4 pb-40">
          {pets.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🐾</div>
              <p className="text-slate-500 mb-4">등록된 반려동물이 없습니다</p>
              <button
                onClick={() => onAddPet && onAddPet()}
                className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
              >
                반려동물 등록하기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pets.map(pet => (
                <div key={pet.id} className="bg-surface-light rounded-lg p-4 shadow-soft">
                  {editingPet === pet.id ? (
                    // 편집 모드
                    <div className="space-y-4">
                      {/* 프로필 사진 변경 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">프로필 사진</label>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl overflow-hidden">
                            {editFormData?.profileImage ? (
                              <img
                                src={editFormData.profileImage}
                                alt="프로필"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              editFormData?.species === 'dog' ? '🐕' : '🐈'
                            )}
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
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl overflow-hidden">
                          {pet.profileImage ? (
                            <img
                              src={pet.profileImage}
                              alt={pet.petName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            pet.species === 'dog' ? '🐕' : '🐈'
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-slate-900 font-bold text-lg mb-1 font-display">{pet.petName}</h3>
                          <p className="text-slate-500 text-sm">
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
                            <p className="text-slate-400 text-xs mt-1">{pet.sido} {pet.sigungu}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSelectPet && onSelectPet(pet)}
                          className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          선택
                        </button>
                        <button
                          onClick={() => handleEditPet(pet)}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePet(pet.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
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
        <div className="px-4 pt-4 pb-40">
          {bookings.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-slate-500 mb-2">예약 내역이 없습니다</p>
              <p className="text-slate-400 text-sm">병원 예약을 하면 여기서 확인할 수 있어요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 예약 상태별 요약 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                  <p className="text-xs text-amber-700">대기중</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className="text-xs text-green-700">확정</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-600">
                    {bookings.filter(b => b.status === 'completed').length}
                  </p>
                  <p className="text-xs text-slate-700">완료</p>
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
                        <span>{booking.petName || '반려동물'}</span>
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

      {activeTab === 'records' && (
        <div className="px-4 pt-4 pb-40">
          {diagnoses.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-slate-500 mb-2">아직 진료 기록이 없습니다</p>
              <p className="text-slate-400 text-sm">AI 진료를 받으면 기록이 저장됩니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {diagnoses.map(record => (
                <div
                  key={record.id}
                  className="bg-surface-light rounded-lg p-4 shadow-soft cursor-pointer hover:shadow-md transition-all"
                  onClick={() => onViewDiagnosis && onViewDiagnosis(record)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{formatDate(record.created_at || record.date)}</p>
                      <h3 className="text-slate-900 font-bold text-base mb-1 font-display">
                        {record.petName || '반려동물'}
                      </h3>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getRiskColor(record.riskLevel || record.emergency) }}
                    >
                      {getRiskLabel(record.riskLevel || record.emergency)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <strong className="text-slate-700">진단:</strong>{' '}
                    <span className="text-slate-600">
                      {record.diagnosis || record.suspectedConditions?.[0]?.name || '일반 건강 이상'}
                    </span>
                  </div>
                  {record.symptom && (
                    <div className="mb-3">
                      <strong className="text-slate-700">증상:</strong>{' '}
                      <span className="text-slate-600">{record.symptom}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDiagnosis && onViewDiagnosis(record);
                    }}
                    className="text-primary text-sm font-medium flex items-center gap-1"
                  >
                    상세 보기
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="px-4 pt-4 pb-40">
          <div className="space-y-6">
            {/* API 키 설정 섹션 */}
            <div className="bg-surface-light rounded-lg p-4 shadow-soft">
              <h3 className="text-slate-900 font-bold text-lg mb-1 font-display flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">key</span>
                API 키 설정
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                AI 진단 기능을 사용하려면 API 키를 입력하세요.
              </p>

              {/* Gemini API Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Google Gemini API 키
                  <span className="text-xs text-slate-400 ml-2">(CS Agent, Care Agent)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKeys.gemini ? 'text' : 'password'}
                      value={apiKeys.gemini}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                      placeholder="AIza..."
                      className="w-full p-3 pr-10 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('gemini')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showApiKeys.gemini ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                {apiKeys.gemini && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    설정됨
                  </p>
                )}
              </div>

              {/* OpenAI API Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  OpenAI API 키
                  <span className="text-xs text-slate-400 ml-2">(Medical Agent, Triage Engine)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKeys.openai ? 'text' : 'password'}
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                      placeholder="sk-proj-..."
                      className="w-full p-3 pr-10 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('openai')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showApiKeys.openai ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                {apiKeys.openai && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    설정됨
                  </p>
                )}
              </div>

              {/* Anthropic API Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Anthropic API 키
                  <span className="text-xs text-slate-400 ml-2">(Ops Agent)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKeys.anthropic ? 'text' : 'password'}
                      value={apiKeys.anthropic}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                      placeholder="sk-ant-..."
                      className="w-full p-3 pr-10 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-primary focus:border-primary text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('anthropic')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showApiKeys.anthropic ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                {apiKeys.anthropic && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    설정됨
                  </p>
                )}
              </div>

              {/* 저장 버튼 */}
              <button
                onClick={handleSaveApiKeys}
                className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {apiKeySaved ? (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    저장 완료!
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    API 키 저장
                  </>
                )}
              </button>

              {/* 안내 메시지 */}
              <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">API 키 발급 방법:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Gemini:</strong> <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li><strong>OpenAI:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                  <li><strong>Anthropic:</strong> <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a></li>
                </ul>
              </div>

              {/* 보안 안내 */}
              <div className="mt-3 bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
                <p className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                  <span>API 키는 브라우저의 로컬 스토리지에 저장됩니다. 공용 컴퓨터에서는 사용 후 키를 삭제해주세요.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

