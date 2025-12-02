// 병원 모드 대시보드 메인 컴포넌트
import { useState, useEffect } from 'react';
import {
  getUserClinics,
  getClinicInfo,
  getTodayBookings,
  getMonthlyBookings,
  getClinicPatients,
  getClinicStats,
  migrateExistingClinicUser
} from '../services/clinicService';
import { userService } from '../services/firestore';

export function ClinicDashboard({ currentUser, onBack }) {
  const [loading, setLoading] = useState(true);
  const [currentClinic, setCurrentClinic] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  const [todayBookings, setTodayBookings] = useState([]);
  const [monthlyBookings, setMonthlyBookings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // 월이 변경되면 월별 예약 다시 로드
  useEffect(() => {
    if (currentClinic) {
      loadMonthlyBookings();
    }
  }, [currentMonth, currentClinic]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // 사용자가 속한 병원 목록 조회
      let userClinics = await getUserClinics(currentUser.uid);

      // clinicStaff 데이터가 없으면 마이그레이션 시도
      if (userClinics.length === 0) {
        console.log('clinicStaff 데이터 없음, 마이그레이션 시도...');

        // users 컬렉션에서 사용자 정보 조회
        const userDoc = await userService.getUser(currentUser.uid);
        const userData = userDoc.data || {};

        // 마이그레이션 실행
        const migrationResult = await migrateExistingClinicUser(currentUser.uid, {
          ...userData,
          displayName: currentUser.displayName || userData.displayName
        });

        if (migrationResult.success) {
          // 마이그레이션 성공 후 다시 조회
          userClinics = await getUserClinics(currentUser.uid);
          console.log('마이그레이션 후 병원 목록:', userClinics.length);
        } else {
          console.error('마이그레이션 실패:', migrationResult.error);
        }
      }

      if (userClinics.length === 0) {
        alert('병원 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
        onBack();
        return;
      }

      setClinics(userClinics);

      // 첫 번째 병원을 기본 선택
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

      // 병원 통계
      const clinicStats = await getClinicStats(currentClinic.id);
      setStats(clinicStats);

      // 오늘 예약
      const bookings = await getTodayBookings(currentClinic.id);
      setTodayBookings(bookings);

      // 환자 목록
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

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      onBack();
    }
  };

  // 예약 상태별 배지 스타일
  const getStatusBadgeClass = (status) => {
    const classes = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      waiting: 'bg-sky-100 text-sky-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      confirmed: '확정',
      pending: '확인 대기',
      completed: '완료',
      cancelled: '취소',
      waiting: '대기'
    };
    return labels[status] || status;
  };

  // 예약 확정/취소 처리
  const handleConfirmBooking = async (bookingId) => {
    alert('예약 확정 기능은 구현 중입니다.');
    // TODO: 실제 확정 로직 구현
  };

  const handleStartTreatment = async (bookingId) => {
    alert('진료 시작 기능은 구현 중입니다.');
    // TODO: 실제 진료 시작 로직 구현
  };

  // 캘린더 날짜 선택 핸들러
  const handleDateClick = (day) => {
    if (selectedDate === day) {
      setSelectedDate(null);
    } else {
      setSelectedDate(day);
    }
  };

  // 월 변경 핸들러
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

  // 캘린더 렌더링 헬퍼
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 날짜별 예약 수 계산
    const bookingsByDate = {};
    monthlyBookings.forEach(booking => {
      const bookingDate = new Date(booking.date);
      if (bookingDate.getMonth() === month && bookingDate.getFullYear() === year) {
        const day = bookingDate.getDate();
        bookingsByDate[day] = (bookingsByDate[day] || 0) + 1;
      }
    });

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = isCurrentMonth ? today.getDate() : null;

    const days = [];

    // 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // 날짜 추가
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
          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer
            ${isSelected ? 'bg-gradient-to-br from-sky-600 to-sky-700 text-white shadow-lg scale-105' :
              isToday ? 'bg-white border-2 border-sky-600 shadow-md' :
              count > 0 ? 'bg-white/90 shadow-sm hover:shadow-md hover:scale-105' :
              'bg-white/30'}
            ${count > 0 || isToday ? 'border border-gray-200' : ''}
          `}
          style={{ position: 'relative' }}
        >
          <div className={`text-sm font-bold
            ${isSelected ? 'text-white' :
              isToday ? 'text-sky-600' :
              count > 0 ? 'text-gray-900' :
              isSunday ? 'text-red-400' :
              isSaturday ? 'text-blue-400' :
              'text-gray-400'}`}
          >
            {day}
          </div>
          {count > 0 && (
            <div className={`absolute bottom-1 text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm
              ${isSelected ? 'bg-white text-sky-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'}`}
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

    return monthlyBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate.getDate() === selectedDate &&
             bookingDate.getMonth() === month &&
             bookingDate.getFullYear() === year;
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">병원 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-sm">← 돌아가기</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="보호자 모드로 전환"
            >
              <span className="material-symbols-outlined">swap_horiz</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="로그아웃"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-gray-900">
            🏥 {currentClinic?.name || '행복한 동물병원'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">병원 관리자 모드</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 px-4 pb-4">
          <div className="bg-sky-50 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-sky-600">{todayBookings.length}</div>
            <div className="text-xs text-gray-600">오늘 예약</div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-600">
              {todayBookings.filter(b => b.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-600">확인 대기</div>
          </div>
          <div className="bg-green-50 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">
              {todayBookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-xs text-gray-600">확정</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex overflow-x-auto">
        {[
          { id: 'today', icon: 'calendar_today', label: '오늘 예약' },
          { id: 'schedule', icon: 'schedule', label: '진료 스케줄' },
          { id: 'monthly', icon: 'calendar_month', label: '이번달' },
          { id: 'records', icon: 'folder_shared', label: '환자 기록' },
          { id: 'settings', icon: 'settings', label: '설정' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[70px] px-3 py-3 text-xs font-medium text-center border-b-2 transition-all
              ${activeTab === tab.id
                ? 'text-sky-600 border-sky-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'}`}
          >
            <span className="material-symbols-outlined block text-xl mb-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {/* 오늘 예약 Tab */}
        {activeTab === 'today' && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">
              오늘의 진료 일정 ({todayBookings.length}건)
            </h2>

            {todayBookings.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
                <div className="text-6xl mb-3">📅</div>
                <p className="text-gray-400">오늘 예약이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((booking, index) => (
                  <div
                    key={booking.id || index}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-lg font-bold text-gray-900">
                        {booking.time || '시간 미정'}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-purple-400 flex items-center justify-center text-2xl">
                        {booking.pet?.species === 'cat' ? '🐈' : '🐕'}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {booking.pet?.name || '미등록'} ({booking.pet?.breed || '품종 미상'}, {booking.pet?.age || '?'}세)
                        </h3>
                        <p className="text-sm text-gray-600">
                          보호자: {booking.owner?.name || '알 수 없음'} · {booking.owner?.phone || ''}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-gray-600 mb-1">증상</div>
                      <div className="text-sm text-gray-900">{booking.symptom || '일반 진료'}</div>
                    </div>

                    {/* Info Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button className="p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-xl">smart_toy</span>
                        사전 문진
                      </button>
                      <button className="p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-xl">description</span>
                        상세보기
                      </button>
                      <button className="p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-xl">history</span>
                        과거 기록
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleConfirmBooking(booking.id)}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5
                          ${booking.status === 'confirmed'
                            ? 'bg-gray-100 text-gray-700 cursor-default'
                            : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                        disabled={booking.status === 'confirmed'}
                      >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        {booking.status === 'confirmed' ? '예약 확정됨' : '예약 확정'}
                      </button>
                      <button
                        onClick={() => handleStartTreatment(booking.id)}
                        className="py-2.5 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        진료 시작
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 진료 스케줄 Tab */}
        {activeTab === 'schedule' && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">📋 주간 진료 스케줄</h2>

            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={handlePrevMonth}
                >
                  <span className="material-symbols-outlined text-gray-600">chevron_left</span>
                </button>
                <div className="text-center">
                  <div className="font-bold text-gray-900">
                    {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">이번 달</div>
                </div>
                <button
                  className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={handleNextMonth}
                >
                  <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">info</span>
                <span>주간 스케줄 뷰는 개발 중입니다</span>
              </div>
            </div>
          </div>
        )}

        {/* 이번달 Tab - Calendar */}
        {activeTab === 'monthly' && (
          <div>
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-3xl p-6 mb-4 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="bg-white p-2 rounded-lg shadow-sm hover:bg-sky-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-sky-600">chevron_left</span>
                </button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-sky-900">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </h2>
                  <p className="text-xs text-sky-700 mt-1">이번 달</p>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="bg-white p-2 rounded-lg shadow-sm hover:bg-sky-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-sky-600">chevron_right</span>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-bold py-2 ${
                      i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-sky-900'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Selected Date Bookings */}
            {selectedDate && (
              <div className="bg-white border-2 border-sky-600 rounded-2xl p-5 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-sky-600 to-sky-700 text-white px-3 py-1 rounded-lg">
                      {selectedDate}일
                    </span>
                    <span className="text-gray-600 text-base">진료 일정</span>
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl text-gray-600">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {getSelectedDateBookings().length === 0 ? (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">event_busy</span>
                      <p className="text-gray-500 text-sm">{selectedDate}일에는 예약이 없습니다</p>
                    </div>
                  ) : (
                    getSelectedDateBookings().map((booking, idx) => (
                      <div
                        key={idx}
                        className={`bg-gradient-to-r ${
                          booking.status === 'confirmed'
                            ? 'from-green-50 to-emerald-50 border-green-200'
                            : 'from-yellow-50 to-amber-50 border-yellow-200'
                        } p-4 rounded-xl border transition-all hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900">{booking.time}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'confirmed'
                              ? 'bg-green-600 text-white'
                              : 'bg-yellow-600 text-white'
                          } shadow-sm`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{booking.pet?.species === 'cat' ? '🐈' : '🐕'}</span>
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900">{booking.pet?.name || '미등록'}</span>
                            <span className="text-gray-600"> · {booking.pet?.breed || '품종 미상'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Info Box */}
            {!selectedDate && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">info</span>
                  <span>날짜를 클릭하면 진료 일정을 확인할 수 있습니다</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 환자 기록 Tab */}
        {activeTab === 'records' && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">
              📂 환자 기록 관리
            </h2>

            {patients.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <div className="text-6xl mb-3">🐾</div>
                <p className="text-gray-400">등록된 환자가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient, index) => (
                  <div key={patient.id || index} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-purple-400 flex items-center justify-center text-2xl">
                        {patient.species === 'cat' ? '🐈' : '🐕'}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {patient.petName} ({patient.speciesLabelKo || patient.species})
                        </h3>
                        <p className="text-sm text-gray-600">
                          보호자: {patient.ownerName} · {patient.ownerPhone}
                        </p>
                      </div>
                    </div>

                    {/* 우리 병원 기록 */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xl">🏥</div>
                          <span className="text-sm font-bold text-green-800">우리 병원</span>
                        </div>
                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          {patient.visitCount || 0}건
                        </span>
                      </div>
                      <div className="text-xs text-green-800 leading-relaxed mb-3">
                        • 마지막 방문: {patient.lastVisitDate || '방문 기록 없음'}<br/>
                        • 마지막 진단: {patient.lastDiagnosis || '진단 기록 없음'}
                      </div>
                      <button className="w-full text-sm py-3 bg-white text-green-800 border-2 border-green-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-xl">send</span>
                        보호자에게 보내기
                      </button>
                    </div>

                    {/* 통합 타임라인 버튼 */}
                    <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all">
                      <span className="material-symbols-outlined text-2xl">timeline</span>
                      통합 타임라인 보기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 설정 Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3">⚙️ 병원 설정</h2>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-5">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">병원명</div>
                <div className="text-base text-gray-900">{currentClinic?.name}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">주소</div>
                <div className="text-base text-gray-600">{currentClinic?.address || '주소 정보 없음'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">전화번호</div>
                <div className="text-base text-gray-600">{currentClinic?.phone || '전화번호 정보 없음'}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">내 역할</div>
                <div className="text-base text-gray-600">
                  {currentClinic?.staffRole === 'director' ? '원장' :
                   currentClinic?.staffRole === 'vet' ? '수의사' :
                   currentClinic?.staffRole === 'nurse' ? '간호사' : '스태프'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClinicDashboard;
