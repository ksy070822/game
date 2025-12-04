import { useState, useEffect } from 'react';
import { getPetImage } from '../utils/imagePaths';

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

// 나이 표시 헬퍼 (이미 "세"가 포함되어 있으면 그대로, 아니면 추가)
const formatAge = (age) => {
  if (!age) return '나이 미상';
  if (typeof age === 'string' && age.includes('세')) return age;
  if (typeof age === 'number') return `${age}세`;
  return age;
};

// 성별 표시 헬퍼 (색상 포함)
const formatGender = (gender) => {
  if (!gender) return null;
  const isMale = gender === 'M' || gender === 'male' || gender === '수컷' || gender === '♂';
  const isFemale = gender === 'F' || gender === 'female' || gender === '암컷' || gender === '♀';
  
  if (isMale) {
    return <span className="text-blue-600 font-semibold">♂</span>;
  } else if (isFemale) {
    return <span className="text-red-600 font-semibold">♀</span>;
  }
  return gender;
};

// 로컬 스토리지 키
const BOOKINGS_KEY = 'petMedical_bookings';
const DIAGNOSES_KEY = 'petMedical_diagnoses';
const CLINIC_RESULTS_KEY = 'petMedical_clinicResults';
const MEDICATION_FEEDBACK_KEY = 'petMedical_medicationFeedback';

/**
 * 병원용 어드민 페이지
 * - 오늘의 예약 관리
 * - 사전 문진표(AI 진단 요약) 확인
 * - 진료 결과 입력
 * - 환자 기록 타임라인
 */
export function ClinicAdmin({ onBack, onLogout, onModeSwitch, onHome }) {
  const [activeTab, setActiveTab] = useState('today'); // today, schedule, monthly, records, settings
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [clinicInfo, setClinicInfo] = useState({
    name: '행복한 동물병원',
    doctorName: '김수의',
  });

  // 예약 데이터 로드
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = () => {
    try {
      const data = localStorage.getItem(BOOKINGS_KEY);
      const allBookings = data ? JSON.parse(data) : [];
      setBookings(allBookings);
    } catch (error) {
      console.error('예약 로드 실패:', error);
    }
  };

  // 예약 상태 업데이트
  const updateBookingStatus = (bookingId, newStatus) => {
    try {
      const updatedBookings = bookings.map(b =>
        b.id === bookingId ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b
      );
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updatedBookings));
      setBookings(updatedBookings);
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
    }
  };

  // 진료 결과 저장
  const saveClinicResult = (bookingId, result) => {
    try {
      const results = JSON.parse(localStorage.getItem(CLINIC_RESULTS_KEY) || '[]');
      results.push({
        id: `result_${Date.now()}`,
        bookingId,
        ...result,
        createdAt: new Date().toISOString(),
        clinic: clinicInfo,
      });
      localStorage.setItem(CLINIC_RESULTS_KEY, JSON.stringify(results));

      // 예약 상태를 완료로 변경
      updateBookingStatus(bookingId, 'completed');
      setShowResultModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('결과 저장 실패:', error);
    }
  };

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={onBack} className="text-slate-600">
            <span className="text-sm">← 돌아가기</span>
          </button>
          <div className="flex items-center gap-2">
            {onModeSwitch && (
              <button
                onClick={onModeSwitch}
                className="p-2 text-sky-500 hover:bg-sky-50 rounded-full transition"
                title="보호자 모드로 전환"
              >
                <span className="material-symbols-outlined text-xl">swap_horiz</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
              title="로그아웃"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-slate-900">🏥 {clinicInfo.name}</h1>
          <p className="text-sm text-slate-500 mt-1">병원 관리자 모드</p>
        </div>

        {/* 요약 카드 */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-3">
          <div className="bg-sky-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-sky-600">{todayBookings.length}</p>
            <p className="text-xs text-slate-500">오늘 예약</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingBookings.length}</p>
            <p className="text-xs text-slate-500">확인 대기</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{confirmedBookings.length}</p>
            <p className="text-xs text-slate-500">확정</p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {[
            { id: 'today', label: '오늘 예약', icon: 'calendar_today' },
            { id: 'schedule', label: '진료 스케줄', icon: 'schedule' },
            { id: 'monthly', label: '이번달', icon: 'calendar_month' },
            { id: 'records', label: '환자 기록', icon: 'folder_shared' },
            { id: 'settings', label: '설정', icon: 'settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[70px] py-3 text-center text-xs font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg block mb-0.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 pb-24">
        {activeTab === 'today' && (
          <TodayBookings
            bookings={todayBookings}
            allBookings={bookings}
            onSelectBooking={(b) => {
              setSelectedBooking(b);
            }}
            onUpdateStatus={updateBookingStatus}
            onCompleteVisit={(b) => {
              setSelectedBooking(b);
              setShowResultModal(true);
            }}
          />
        )}

        {activeTab === 'schedule' && (
          <WeeklySchedule
            bookings={bookings}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyCalendar
            bookings={bookings}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelectBooking={(b) => {
              setSelectedBooking(b);
            }}
            onUpdateStatus={updateBookingStatus}
          />
        )}

        {activeTab === 'records' && (
          <PatientRecords
            bookings={bookings}
          />
        )}

        {activeTab === 'settings' && (
          <ClinicSettings
            clinicInfo={clinicInfo}
            onUpdate={setClinicInfo}
          />
        )}
      </div>

      {/* 예약 상세 모달 */}
      {selectedBooking && !showResultModal && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={updateBookingStatus}
          onStartVisit={() => setShowResultModal(true)}
        />
      )}

      {/* 진료 결과 입력 모달 */}
      {showResultModal && selectedBooking && (
        <ClinicResultModal
          booking={selectedBooking}
          onClose={() => {
            setShowResultModal(false);
            setSelectedBooking(null);
          }}
          onSave={(result) => saveClinicResult(selectedBooking.id, result)}
        />
      )}
    </div>
  );
}

// 오늘 예약 탭 - 개선된 UI
function TodayBookings({ bookings, allBookings, onSelectBooking, onUpdateStatus, onCompleteVisit }) {
  const today = new Date().toISOString().split('T')[0];

  // 시간순 정렬
  const sortedBookings = [...bookings].sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return a.time.localeCompare(b.time);
  });

  if (sortedBookings.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">
          event_available
        </span>
        <p className="text-slate-500">오늘 예정된 예약이 없습니다</p>
        <p className="text-sm text-slate-400 mt-1">
          {allBookings.length > 0 ? `전체 ${allBookings.length}건의 예약이 있습니다` : '아직 예약이 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-slate-800 flex items-center gap-2">
        오늘의 진료 일정 ({sortedBookings.length}건)
      </h2>

      {sortedBookings.map((booking) => (
        <EnhancedBookingCard
          key={booking.id}
          booking={booking}
          onSelectBooking={onSelectBooking}
          onConfirm={() => onUpdateStatus(booking.id, 'confirmed')}
          onComplete={() => onCompleteVisit(booking)}
        />
      ))}
    </div>
  );
}

// 개선된 예약 카드 컴포넌트
function EnhancedBookingCard({ booking, onSelectBooking, onConfirm, onComplete }) {
  const statusInfo = getBookingStatusInfo(booking.status);
  const petProfile = booking.petProfile || {};

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-lg font-bold text-slate-900">{booking.time || '시간 미정'}</div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* 반려동물 정보 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-violet-400 overflow-hidden">
          <img
            src={getPetImage(petProfile || { species: petProfile.species || 'dog' }, false)}
            alt={booking.petName || '반려동물'}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center', display: 'block' }}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
            {booking.petName} {petProfile.breed && `(${SPECIES_LABELS[petProfile.species] || petProfile.speciesLabelKo || petProfile.species || '기타'}, ${formatAge(petProfile.age)})`}
            {petProfile.sex && <span className="ml-1">{formatGender(petProfile.sex)}</span>}
          </h3>
          <p className="text-sm text-slate-500">
            보호자: {booking.ownerDisplayName || booking.ownerName || '정보 없음'} · {booking.ownerPhone || '연락처 없음'}
          </p>
        </div>
      </div>

      {/* 증상 */}
      {booking.message && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3">
          <div className="text-xs text-slate-500 mb-1">증상</div>
          <div className="text-sm text-slate-900">{booking.message}</div>
        </div>
      )}

      {/* 정보 버튼 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => onSelectBooking(booking)}
          className={`p-2 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1 ${
            booking.diagnosisId || booking.aiDiagnosis
              ? 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-lg">smart_toy</span>
          사전 문진
        </button>
        <button
          onClick={() => onSelectBooking(booking)}
          className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex flex-col items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">description</span>
          상세보기
        </button>
        <button
          onClick={() => alert('과거 기록 보기 기능')}
          className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex flex-col items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">history</span>
          과거 기록
        </button>
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        {booking.status === 'pending' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="py-2.5 bg-sky-500 text-white text-sm font-bold rounded-lg hover:bg-sky-600 transition flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            예약 확정
          </button>
        ) : (
          <button
            className="py-2.5 bg-slate-100 text-slate-500 text-sm font-semibold rounded-lg cursor-default flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">check_circle</span>
            예약 확정됨
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="py-2.5 bg-sky-500 text-white text-sm font-bold rounded-lg hover:bg-sky-600 transition flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          진료 시작
        </button>
      </div>
    </div>
  );
}

// 주간 스케줄 탭 - 타임라인 UI
function WeeklySchedule({ bookings }) {
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  // 이번 주 날짜 목록 생성
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  // 날짜별로 예약 그룹화
  const bookingsByDate = {};
  bookings.forEach(booking => {
    if (!bookingsByDate[booking.date]) {
      bookingsByDate[booking.date] = [];
    }
    bookingsByDate[booking.date].push(booking);
  });

  const weekDayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="section-title">📋 주간 진료 스케줄</div>

      {/* Week Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
            <span className="material-symbols-outlined text-slate-600">chevron_left</span>
          </button>
          <div className="text-center">
            <div className="font-bold text-slate-900">
              {weekDays[0].getMonth() + 1}월 {weekDays[0].getDate()}일 - {weekDays[6].getMonth() + 1}월 {weekDays[6].getDate()}일
            </div>
            <div className="text-xs text-slate-500 mt-1">이번 주</div>
          </div>
          <button className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition">
            <span className="material-symbols-outlined text-slate-600">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Daily Schedule Cards - 오늘과 내일만 표시 */}
      {weekDays.slice(0, 2).map((date, idx) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayBookings = (bookingsByDate[dateStr] || [])
          .filter(b => b.status !== 'cancelled')
          .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const isToday = dateStr === todayStr;

        return (
          <div key={dateStr} className="mb-6">
            {/* 날짜 헤더 */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex flex-col items-center rounded-xl p-2 min-w-[3.5rem] shadow-md ${
                isToday
                  ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white'
                  : 'bg-white border-2 border-slate-200 text-slate-900'
              }`}>
                <div className={`text-xs font-semibold ${isToday ? 'opacity-90' : 'text-slate-500'}`}>
                  {weekDayNames[date.getDay()]}
                </div>
                <div className="text-2xl font-bold">{date.getDate()}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  {date.getMonth() + 1}월 {date.getDate()}일 ({weekDayNames[date.getDay()]})
                </div>
                <div className="text-sm text-slate-500">
                  {isToday ? '오늘' : '내일'} · {dayBookings.length}건
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-[4.25rem]">
              {/* Timeline Line */}
              <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-200 to-sky-300"></div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {dayBookings.map((booking, i) => {
                  const statusBg = booking.status === 'confirmed'
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200';
                  const statusText = booking.status === 'confirmed' ? '확정' : '대기';
                  const statusColor = booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                  return (
                    <div key={booking.id} className="relative">
                      {/* Timeline Dot */}
                      <div className={`absolute left-[-2.5rem] top-2 w-3 h-3 rounded-full border-2 border-white shadow-md ${
                        booking.status === 'confirmed' ? 'bg-sky-500' : 'bg-amber-500'
                      }`}></div>

                      {/* Booking Card */}
                      <div className={`${statusBg} border rounded-xl p-3.5 transition-all hover:shadow-md hover:translate-x-1`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 text-lg">{booking.time}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-white rounded-full overflow-hidden shadow-sm">
                            <img
                              src={getPetImage(booking.petProfile || { species: booking.petProfile?.species || 'dog' }, false)}
                              alt={booking.petName || '반려동물'}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: 'center', display: 'block' }}
                            />
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-slate-900">{booking.petName}</span>
                            <span className="text-slate-500"> · {booking.petProfile?.breed || '품종 미상'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dayBookings.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block">event_busy</span>
                    예약이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* 나머지 주 요약 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="material-symbols-outlined text-lg">info</span>
          <span>이후 일정: 5건의 예약이 있습니다</span>
        </div>
      </div>
    </div>
  );
}

// 월간 캘린더 탭
function MonthlyCalendar({ bookings, selectedDay, onSelectDay, onSelectBooking, onUpdateStatus }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.getDate();

  // 이번달 첫날과 마지막날
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // 날짜별 예약 수 계산
  const bookingsByDate = {};
  bookings.forEach(booking => {
    const bookingDate = new Date(booking.date);
    if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
      const day = bookingDate.getDate();
      bookingsByDate[day] = (bookingsByDate[day] || 0) + 1;
    }
  });

  // 선택된 날짜의 예약 목록
  const selectedDateStr = selectedDay ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : null;
  const selectedDayBookings = selectedDateStr
    ? bookings.filter(b => b.date === selectedDateStr)
    : [];

  return (
    <div className="space-y-4">
      {/* 캘린더 헤더 */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <button className="bg-white p-2 rounded-lg hover:bg-sky-50 transition shadow-sm">
            <span className="material-symbols-outlined text-sky-600">chevron_left</span>
          </button>
          <h2 className="text-xl font-bold text-sky-900">
            {currentYear}년 {currentMonth + 1}월
          </h2>
          <button className="bg-white p-2 rounded-lg hover:bg-sky-50 transition shadow-sm">
            <span className="material-symbols-outlined text-sky-600">chevron_right</span>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div key={day} className={`text-center text-sm font-bold py-2 ${
              i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-sky-900'
            }`}>
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 빈 셀 (첫날 이전) */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {/* 날짜 셀 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday = day === today;
            const isSelected = day === selectedDay;
            const count = bookingsByDate[day] || 0;
            const dayOfWeek = (firstDay + i) % 7;
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;

            let bgColor;
            if (isSelected) {
              bgColor = 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md';
            } else if (isToday) {
              bgColor = 'bg-white border-2 border-sky-500 text-sky-600 shadow-sm';
            } else if (count > 0) {
              bgColor = 'bg-white/90 border border-slate-200 text-slate-900 shadow-sm';
            } else {
              bgColor = 'bg-white/30 text-slate-400';
            }

            return (
              <button
                key={day}
                onClick={() => count > 0 && onSelectDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${bgColor} ${
                  count > 0 ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className={`text-sm font-bold ${
                  isSelected || isToday || count > 0 ? '' : isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : ''
                }`}>
                  {day}
                </span>
                {count > 0 && (
                  <span className={`absolute bottom-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    isSelected ? 'bg-white text-sky-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  } shadow-sm`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜의 예약 목록 */}
      {selectedDay && selectedDayBookings.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-md border-2 border-sky-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-3 py-1 rounded-lg shadow-sm">
                {selectedDay}일
              </span>
              <span className="text-slate-600 text-sm">진료 일정</span>
            </h3>
            <button
              onClick={() => onSelectDay(null)}
              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              <span className="material-symbols-outlined text-slate-600">close</span>
            </button>
          </div>

          <div className="space-y-3">
            {selectedDayBookings.map((booking) => {
              const statusInfo = getBookingStatusInfo(booking.status);

              return (
                <div
                  key={booking.id}
                  className={`rounded-xl p-3 border transition-all cursor-pointer hover:shadow-md hover:translate-x-1 ${
                    booking.status === 'confirmed'
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                  }`}
                  onClick={() => onSelectBooking(booking)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{booking.time}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 bg-white rounded-full overflow-hidden shadow-sm">
                      <img
                        src={getPetImage(booking.petProfile || { species: booking.petProfile?.species || 'dog' }, false)}
                        alt={booking.petName || '반려동물'}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center', display: 'block' }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm">
                        {booking.petName}{' '}
                        <span className="font-normal text-slate-500">
                          · {booking.petProfile?.breed || '품종 미상'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        보호자: {booking.ownerDisplayName || booking.ownerName || '정보 없음'}
                      </div>
                    </div>
                  </div>
                  {booking.message && (
                    <div className="bg-white rounded-lg p-2 text-xs text-slate-600">
                      <span className="font-semibold">증상:</span> {booking.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && selectedDayBookings.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-2 block">event_busy</span>
          <p className="text-slate-500">{selectedDay}일에는 예약이 없습니다</p>
          <button
            onClick={() => onSelectDay(null)}
            className="mt-4 bg-slate-100 px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-200 transition"
          >
            닫기
          </button>
        </div>
      )}

      {!selectedDay && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>날짜를 클릭하면 진료 일정을 확인할 수 있습니다</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 환자 기록 탭 - 개선된 UI
function PatientRecords({ bookings }) {
  // 고유한 환자(펫) 목록 추출
  const uniquePets = bookings.reduce((acc, b) => {
    if (b.petId && !acc.find(p => p.petId === b.petId)) {
      acc.push({
        petId: b.petId,
        petName: b.petName,
        petProfile: b.petProfile,
        visitCount: bookings.filter(x => x.petId === b.petId).length,
        lastVisit: bookings.filter(x => x.petId === b.petId).sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        )[0]?.date,
      });
    }
    return acc;
  }, []);

  if (uniquePets.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📂</div>
        <p className="text-slate-500">등록된 환자가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-slate-800">
        📂 환자 기록 관리
      </h2>

      {uniquePets.map((pet) => (
        <PatientRecordCard key={pet.petId} pet={pet} />
      ))}
    </div>
  );
}

// 환자 기록 카드 컴포넌트
function PatientRecordCard({ pet }) {
  const petEmoji = pet.petProfile?.species === 'cat' ? '🐈' : '🐕';

  // 로컬 스토리지에서 진료 기록 가져오기
  const clinicResults = JSON.parse(localStorage.getItem(CLINIC_RESULTS_KEY) || '[]');
  const ourRecords = clinicResults.filter(r => r.petId === pet.petId);

  // 가상의 보호자 제공 기록 (실제로는 API나 로컬 스토리지에서 가져와야 함)
  const providerRecords = [];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* 반려동물 정보 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-violet-400 flex items-center justify-center text-2xl">
          {petEmoji}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
            {pet.petName} ({SPECIES_LABELS[pet.petProfile?.species] || pet.petProfile?.speciesLabelKo || pet.petProfile?.species || '기타'}, {formatAge(pet.petProfile?.age)})
            {pet.petProfile?.sex && <span className="ml-1">{formatGender(pet.petProfile.sex)}</span>}
          </h3>
          <p className="text-sm text-slate-500">
            방문 {pet.visitCount}회 · 최근 {pet.lastVisit || '기록 없음'}
          </p>
        </div>
      </div>

      {/* 우리 병원 기록 */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              🏥
            </div>
            <span className="font-bold text-green-800 text-sm">우리 병원</span>
          </div>
          <span className="bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
            {ourRecords.length}건
          </span>
        </div>
        {ourRecords.length > 0 ? (
          <>
            <div className="text-sm text-green-700 mb-3 space-y-1">
              {ourRecords.slice(0, 2).map((record, i) => (
                <div key={i}>
                  • {new Date(record.createdAt).toLocaleDateString('ko-KR')} {typeof record.diagnosis === 'string' ? record.diagnosis : (record.diagnosis?.name || '진단 정보')}
                </div>
              ))}
            </div>
            <button className="w-full bg-white border-2 border-green-500 text-green-700 py-2.5 rounded-xl font-bold text-sm hover:bg-green-50 transition flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined">send</span>
              보호자에게 보내기
            </button>
          </>
        ) : (
          <div className="text-sm text-green-600 text-center py-2">
            진료 기록이 없습니다
          </div>
        )}
      </div>

      {/* 보호자 제공 기록 */}
      <div className={`rounded-xl p-4 border mb-3 ${
        providerRecords.length > 0
          ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
          : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 border-dashed'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center ${
              providerRecords.length === 0 && 'opacity-50'
            }`}>
              📥
            </div>
            <span className={`font-bold text-sm ${
              providerRecords.length > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}>
              보호자 제공
            </span>
          </div>
          {providerRecords.length > 0 && (
            <span className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
              {providerRecords.length}건
            </span>
          )}
        </div>
        <div className={`text-sm text-center py-2 ${
          providerRecords.length > 0 ? 'text-amber-700' : 'text-slate-400'
        }`}>
          타병원 기록이 없습니다
        </div>
      </div>

      {/* 통합 타임라인 버튼 */}
      <button className="w-full bg-gradient-to-r from-purple-500 to-violet-500 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-600 hover:to-violet-600 transition flex items-center justify-center gap-2 shadow-md">
        <span className="material-symbols-outlined text-xl">timeline</span>
        통합 타임라인 보기
      </button>
    </div>
  );
}

// 설정 탭
function ClinicSettings({ clinicInfo, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(clinicInfo);

  const handleSave = () => {
    onUpdate(form);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-500">settings</span>
        ⚙️ 병원 설정
      </h2>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">병원명</label>
          {editing ? (
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          ) : (
            <p className="text-slate-800">{clinicInfo.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">담당 수의사</label>
          {editing ? (
            <input
              type="text"
              value={form.doctorName}
              onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          ) : (
            <p className="text-slate-800">{clinicInfo.doctorName}</p>
          )}
        </div>

        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
            >
              저장
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            수정하기
          </button>
        )}
      </div>

      {/* 추가 기능 */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
        <button className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400">notifications</span>
            <span className="text-slate-700">알림 설정</span>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400">calendar_month</span>
            <span className="text-slate-700">운영 시간</span>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>
        <button className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400">help</span>
            <span className="text-slate-700">도움말</span>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

// 예약 상세 모달
function BookingDetailModal({ booking, onClose, onUpdateStatus, onStartVisit }) {
  // AI 진단 데이터 - booking.aiDiagnosis 우선 사용
  const [diagnosis, setDiagnosis] = useState(null);
  const petProfile = booking.petProfile || {};

  useEffect(() => {
    // 이미 예약에 포함된 aiDiagnosis 사용
    if (booking.aiDiagnosis) {
      setDiagnosis(booking.aiDiagnosis);
    } else if (booking.diagnosisId) {
      // 없으면 localStorage에서 가져오기
      try {
        const diagnoses = JSON.parse(localStorage.getItem('petMedical_diagnoses') || '[]');
        const found = diagnoses.find(d => d.id === booking.diagnosisId);
        setDiagnosis(found);
      } catch (error) {
        console.error('진단 데이터 로드 실패:', error);
      }
    }
  }, [booking.aiDiagnosis, booking.diagnosisId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-lg text-slate-800">예약 상세</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 예약 정보 헤더 */}
          <div className="bg-sky-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white overflow-hidden shadow-sm">
                <img
                  src={getPetImage(petProfile || { species: petProfile.species || 'dog' }, false)}
                  alt={booking.petName || '반려동물'}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center', display: 'block' }}
                />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-sky-800">{booking.petName}</p>
                <p className="text-sm text-sky-600">
                  예약일: {booking.date} {booking.time}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getBookingStatusInfo(booking.status).color}`}>
                  {getBookingStatusInfo(booking.status).label}
                </span>
              </div>
            </div>
          </div>

          {/* 반려동물 상세 정보 */}
          {petProfile && Object.keys(petProfile).length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-sky-50 border-b border-sky-100">
                <h3 className="font-semibold text-sky-800 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-sky-500 text-lg">pets</span>
                  반려동물 정보
                </h3>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2 text-sm">
                {petProfile.breed && (
                  <div>
                    <span className="text-slate-500 text-xs">품종</span>
                    <p className="font-medium text-slate-800">{petProfile.breed}</p>
                  </div>
                )}
                {petProfile.age && (
                  <div>
                    <span className="text-slate-500 text-xs">나이</span>
                    <p className="font-medium text-slate-800">{formatAge(petProfile.age)} {petProfile.sex && formatGender(petProfile.sex)}</p>
                  </div>
                )}
                {petProfile.sex && (
                  <div>
                    <span className="text-slate-500 text-xs">성별</span>
                    <p className="font-medium text-slate-800">
                      {petProfile.sex === 'M' ? '수컷' : petProfile.sex === 'F' ? '암컷' : petProfile.sex}
                      {petProfile.neutered ? ' (중성화)' : ''}
                    </p>
                  </div>
                )}
                {petProfile.weight && (
                  <div>
                    <span className="text-slate-500 text-xs">체중</span>
                    <p className="font-medium text-slate-800">{petProfile.weight}kg</p>
                  </div>
                )}
                {petProfile.allergies && petProfile.allergies.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-500 text-xs">⚠️ 알레르기</span>
                    <p className="font-medium text-red-600">{petProfile.allergies.join(', ')}</p>
                  </div>
                )}
                {petProfile.chronicConditions && petProfile.chronicConditions.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-500 text-xs">⚠️ 기저질환</span>
                    <p className="font-medium text-amber-600">{petProfile.chronicConditions.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 보호자 메시지 */}
          {booking.message && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2 text-sm">
                <span className="material-symbols-outlined text-sky-500">chat</span>
                보호자 메시지
              </h3>
              <p className="text-slate-600">{booking.message}</p>
            </div>
          )}

          {/* AI 사전 진단 정보 */}
          {diagnosis && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-amber-500">auto_awesome</span>
                  AI 사전 진단 정보
                </h3>

                {/* 증상 이미지 */}
                {diagnosis.image && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">증상 이미지</p>
                    <img
                      src={diagnosis.image}
                      alt="증상 이미지"
                      className="w-full max-h-48 object-cover rounded-lg border border-amber-200"
                    />
                  </div>
                )}

                {/* 증상 */}
                {diagnosis.symptoms && diagnosis.symptoms.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">보고된 증상</p>
                    <div className="flex flex-wrap gap-1">
                      {diagnosis.symptoms.map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-100 text-amber-800 text-sm rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 증상 설명 */}
                {diagnosis.symptom && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">증상 상세 설명</p>
                    <p className="text-sm text-amber-800 bg-white p-2 rounded-lg border border-amber-200">
                      {diagnosis.symptom}
                    </p>
                  </div>
                )}

                {/* 증상 시작일 */}
                {diagnosis.onsetDate && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">증상 시작일</p>
                    <p className="text-sm text-amber-800">{diagnosis.onsetDate}</p>
                  </div>
                )}

                {/* 예비 진단 */}
                {diagnosis.diagnosis && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">AI 예비 진단</p>
                    <p className="text-amber-800 font-medium">
                      {typeof diagnosis.diagnosis === 'string'
                        ? diagnosis.diagnosis
                        : diagnosis.diagnosis.primary || JSON.stringify(diagnosis.diagnosis)}
                    </p>
                  </div>
                )}

                {/* AI 감별진단 - possibleDiseases */}
                {(diagnosis.possibleDiseases && diagnosis.possibleDiseases.length > 0) ||
                 (diagnosis.suspectedConditions && diagnosis.suspectedConditions.length > 0) ? (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">🔬 AI 감별진단 (Top 3 의심 질환)</p>
                    <div className="space-y-2">
                      {(diagnosis.possibleDiseases || diagnosis.suspectedConditions || []).slice(0, 3).map((disease, i) => {
                        const prob = disease.probability || disease.probability_percent || 0;
                        const probValue = typeof prob === 'number' && prob <= 1 ? prob * 100 : prob;
                        return (
                          <div key={i} className="bg-white p-2 rounded-lg border border-amber-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-amber-800">{disease.name || disease.name_kor}</span>
                              <span className={`text-sm font-bold ${
                                probValue >= 70 ? 'text-red-600' :
                                probValue >= 40 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {Math.round(probValue)}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-amber-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full ${
                                  probValue >= 70 ? 'bg-red-500' :
                                  probValue >= 40 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${probValue}%` }}
                              />
                            </div>
                            {disease.related_area && (
                              <p className="text-xs text-slate-500 mt-1">관련 부위: {disease.related_area}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* 응급도 평가 (Triage) */}
                {(diagnosis.triageScore !== undefined || diagnosis.triageLevel || diagnosis.riskLevel) && (
                  <div className="mb-3 p-3 bg-white rounded-lg border border-amber-200">
                    <p className="text-xs font-medium text-amber-700 mb-2">🚨 응급도 평가 (Triage)</p>
                    <div className="flex items-center gap-3">
                      {diagnosis.triageScore !== undefined && (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                diagnosis.triageScore >= 4 ? 'bg-red-500' :
                                diagnosis.triageScore >= 3 ? 'bg-orange-500' :
                                diagnosis.triageScore >= 2 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(diagnosis.triageScore / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-slate-800">{diagnosis.triageScore}/5</span>
                        </div>
                      )}
                      {(diagnosis.triageLevel || diagnosis.riskLevel) && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          (diagnosis.triageLevel || '').includes('red') || diagnosis.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                          (diagnosis.triageLevel || '').includes('orange') || diagnosis.riskLevel === 'medium' ? 'bg-orange-100 text-orange-700' :
                          (diagnosis.triageLevel || '').includes('yellow') ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {diagnosis.triageLevel ||
                           (diagnosis.riskLevel === 'high' ? '긴급' :
                            diagnosis.riskLevel === 'medium' ? '주의' : '양호')}
                        </span>
                      )}
                    </div>
                    {diagnosis.hospitalVisitTime && (
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        ⏰ 권장 병원 방문: {diagnosis.hospitalVisitTime}
                      </p>
                    )}
                  </div>
                )}

                {/* 권장 조치사항 */}
                {diagnosis.actions && diagnosis.actions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">💊 AI 권장 조치사항</p>
                    <ul className="text-sm text-amber-800 space-y-1 bg-white p-2 rounded-lg border border-amber-200">
                      {diagnosis.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 권장사항 */}
                {diagnosis.recommendations && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">AI 권장사항</p>
                    <p className="text-sm text-amber-700">{diagnosis.recommendations}</p>
                  </div>
                )}

                {/* 치료 제안 */}
                {diagnosis.suggestedTreatments && diagnosis.suggestedTreatments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">치료 제안</p>
                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                      {diagnosis.suggestedTreatments.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 병원 방문 권고 시간 */}
                {diagnosis.hospitalVisitTime && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      병원 방문 권고
                    </p>
                    <p className="text-sm font-bold text-red-800">{diagnosis.hospitalVisitTime} 내 방문 권장</p>
                  </div>
                )}
              </div>

              {/* 진단 일시 */}
              <div className="px-4 py-2 bg-amber-100/50 border-t border-amber-200 text-xs text-amber-600">
                진단일: {diagnosis.created_at ? new Date(diagnosis.created_at).toLocaleString('ko-KR') : diagnosis.date || '정보 없음'}
              </div>
            </div>
          )}

          {/* 이전 처방약 이력 (보호자 피드백 포함) */}
          <MedicationHistorySection petId={booking.petId} />

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            {booking.status === 'pending' && (
              <button
                onClick={() => {
                  onUpdateStatus(booking.id, 'confirmed');
                  onClose();
                }}
                className="flex-1 py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition"
              >
                예약 확정
              </button>
            )}
            {booking.status !== 'completed' && (
              <button
                onClick={onStartVisit}
                className="flex-1 py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition"
              >
                진료 시작
              </button>
            )}
            {booking.status === 'pending' && (
              <button
                onClick={() => {
                  onUpdateStatus(booking.id, 'cancelled');
                  onClose();
                }}
                className="py-3 px-4 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 진료 결과 입력 모달
function ClinicResultModal({ booking, onClose, onSave }) {
  const [form, setForm] = useState({
    diagnosis: '',
    treatment: '',
    notes: '',
    followUp: '',
    totalCost: '',
  });

  // 처방약 개별 관리
  const [medications, setMedications] = useState([
    { name: '', dosage: '', days: '', instructions: '' }
  ]);

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', days: '', instructions: '' }]);
  };

  const removeMedication = (index) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = () => {
    if (!form.diagnosis.trim()) {
      alert('진단명을 입력해주세요.');
      return;
    }

    // 유효한 처방약만 필터링
    const validMedications = medications.filter(m => m.name.trim());

    onSave({
      petId: booking.petId,
      petName: booking.petName,
      petProfile: booking.petProfile,
      ...form,
      medications: validMedications,
      totalCost: form.totalCost ? parseInt(form.totalCost) : 0,
    });
  };

  const petProfile = booking.petProfile || {};

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-lg text-slate-800">진료 결과 입력</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 환자 정보 */}
          <div className="bg-sky-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white overflow-hidden shadow-sm">
              <img
                src={getPetImage(petProfile || { species: petProfile.species || 'dog' }, false)}
                alt={booking.petName || '반려동물'}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center', display: 'block' }}
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sky-800">{booking.petName}</p>
              <p className="text-xs text-sky-600">
                {petProfile.breed && `${petProfile.breed} · `}
                {petProfile.age && `${petProfile.age} · `}
                {booking.date} 진료
              </p>
            </div>
          </div>

          {/* AI 진단 정보 표시 (있을 경우) */}
          {booking.aiDiagnosis && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">📋 AI 사전 진단</p>
              <p className="text-sm text-amber-800 font-medium">{booking.aiDiagnosis.diagnosis}</p>
              {booking.aiDiagnosis.triageScore && (
                <p className="text-xs text-amber-600 mt-1">
                  응급도: {booking.aiDiagnosis.triageScore}/5 ({booking.aiDiagnosis.triageLevel || ''})
                </p>
              )}
            </div>
          )}

          {/* 진단명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              진단명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="예: 경미한 피부염"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 치료 내용 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">치료 내용</label>
            <textarea
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              placeholder="수행한 치료 내용을 입력하세요"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* 처방약 - 개별 입력 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-sky-500">medication</span>
                처방약
              </span>
            </label>
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">약품 {index + 1}</span>
                    {medications.length > 1 && (
                      <button
                        onClick={() => removeMedication(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    placeholder="약품명 (예: 아포퀠정 16mg)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      placeholder="용량 (예: 1일 2회)"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="text"
                      value={med.days}
                      onChange={(e) => updateMedication(index, 'days', e.target.value)}
                      placeholder="투약기간 (예: 7일분)"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                    placeholder="복용 방법 (예: 식후 30분)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              ))}
              <button
                onClick={addMedication}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm hover:border-sky-400 hover:text-sky-500 transition flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                처방약 추가
              </button>
            </div>
          </div>

          {/* 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">특이사항 / 주의사항</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="보호자에게 전달할 주의사항이나 메모"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* 다음 내원일 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">다음 내원 예정일</label>
            <input
              type="date"
              value={form.followUp}
              onChange={(e) => setForm({ ...form, followUp: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 진료비 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">진료비 (원)</label>
            <input
              type="number"
              value={form.totalCost}
              onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* 안내 문구 */}
          <div className="bg-sky-50 rounded-xl p-3 flex items-start gap-2">
            <span className="material-symbols-outlined text-sky-500 text-lg">info</span>
            <p className="text-sm text-sky-700">
              저장하면 보호자 앱에 진료 결과가 자동으로 전송됩니다.
              처방약 정보는 보호자가 효과/부작용을 기록할 수 있습니다.
            </p>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 이전 처방약 이력 섹션 (보호자 피드백 포함)
function MedicationHistorySection({ petId }) {
  const [medicationHistory, setMedicationHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!petId) return;

    // 진료 결과에서 처방약 가져오기
    const results = JSON.parse(localStorage.getItem(CLINIC_RESULTS_KEY) || '[]');
    const feedback = JSON.parse(localStorage.getItem(MEDICATION_FEEDBACK_KEY) || '{}');

    const petResults = results.filter(r => r.petId === petId);

    // 모든 처방약 추출 및 피드백 연결
    const medications = petResults.flatMap(result =>
      (result.medications || []).map((med, idx) => ({
        id: `${result.id}_med_${idx}`,
        name: med.name,
        dosage: med.dosage,
        days: med.days,
        instructions: med.instructions,
        hospitalName: result.clinic?.name || result.hospitalName || '알 수 없음',
        date: result.visitDate || result.createdAt,
        feedback: feedback[`${result.id}_med_${idx}`] || null
      }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    setMedicationHistory(medications);
  }, [petId]);

  if (medicationHistory.length === 0) return null;

  const effectiveMeds = medicationHistory.filter(m => m.feedback?.status === 'effective');
  const sideEffectMeds = medicationHistory.filter(m => m.feedback?.status === 'side_effect');

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between"
      >
        <h3 className="font-semibold text-purple-800 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-purple-500 text-lg">history</span>
          이전 처방약 이력 ({medicationHistory.length}건)
        </h3>
        <span className="material-symbols-outlined text-purple-500">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-3">
          {/* 요약 정보 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {effectiveMeds.length > 0 && (
              <div className="bg-green-50 rounded-lg p-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">thumb_up</span>
                <div>
                  <p className="text-xs text-green-600">잘 맞았던 약</p>
                  <p className="font-bold text-green-700">{effectiveMeds.length}개</p>
                </div>
              </div>
            )}
            {sideEffectMeds.length > 0 && (
              <div className="bg-red-50 rounded-lg p-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">thumb_down</span>
                <div>
                  <p className="text-xs text-red-600">부작용 있었던 약</p>
                  <p className="font-bold text-red-700">{sideEffectMeds.length}개</p>
                </div>
              </div>
            )}
          </div>

          {/* 부작용 약품 경고 */}
          {sideEffectMeds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                ⚠️ 부작용 기록된 약품 (처방 주의)
              </p>
              <div className="space-y-1">
                {sideEffectMeds.map(med => (
                  <div key={med.id} className="flex items-center gap-2 text-sm text-red-800">
                    <span className="material-symbols-outlined text-xs">medication</span>
                    <span className="font-medium">{med.name}</span>
                    <span className="text-red-500 text-xs">({new Date(med.date).toLocaleDateString('ko-KR')})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 잘 맞았던 약품 */}
          {effectiveMeds.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                잘 맞았던 약품 (재처방 권장)
              </p>
              <div className="space-y-1">
                {effectiveMeds.map(med => (
                  <div key={med.id} className="flex items-center gap-2 text-sm text-green-800">
                    <span className="material-symbols-outlined text-xs">medication</span>
                    <span className="font-medium">{med.name}</span>
                    <span className="text-green-500 text-xs">({new Date(med.date).toLocaleDateString('ko-KR')})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전체 이력 */}
          <p className="text-xs font-medium text-slate-500 mb-2">전체 처방 이력</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {medicationHistory.map(med => (
              <div key={med.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{med.name}</span>
                  {med.feedback && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      med.feedback.status === 'effective'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {med.feedback.status === 'effective' ? '✓ 효과 좋음' : '⚠ 부작용'}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {med.hospitalName} • {new Date(med.date).toLocaleDateString('ko-KR')}
                  {med.dosage && ` • ${med.dosage}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 예약 상태 정보
function getBookingStatusInfo(status) {
  switch (status) {
    case 'confirmed':
      return { label: '확정', color: 'bg-green-100 text-green-700' };
    case 'cancelled':
      return { label: '취소', color: 'bg-red-100 text-red-700' };
    case 'completed':
      return { label: '완료', color: 'bg-slate-100 text-slate-700' };
    default:
      return { label: '대기', color: 'bg-amber-100 text-amber-700' };
  }
}

// CSS 애니메이션 추가 (index.html에 추가하거나 여기서 인라인으로)
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);

export default ClinicAdmin;
