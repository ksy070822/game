import { useState, useEffect } from 'react';

// 로컬 스토리지 키
const BOOKINGS_KEY = 'petMedical_bookings';
const DIAGNOSES_KEY = 'petMedical_diagnoses';
const CLINIC_RESULTS_KEY = 'petMedical_clinicResults';

/**
 * 병원용 어드민 페이지
 * - 오늘의 예약 관리
 * - 사전 문진표(AI 진단 요약) 확인
 * - 진료 결과 입력
 * - 환자 기록 타임라인
 */
export function ClinicAdmin({ onBack, onLogout, onModeSwitch, onHome }) {
  const [activeTab, setActiveTab] = useState('today'); // today, packets, patients, settings
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
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
      <div className="bg-white border-b border-slate-100">
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
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 overflow-x-auto">
        <div className="flex min-w-max">
          {[
            { id: 'today', label: '오늘 예약', icon: 'calendar_today' },
            { id: 'monthly', label: '이번달', icon: 'calendar_month' },
            { id: 'schedule', label: '진료 스케줄', icon: 'schedule' },
            { id: 'packets', label: '사전 문진', icon: 'description' },
            { id: 'patients', label: '환자 관리', icon: 'folder_shared' },
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

        {activeTab === 'monthly' && (
          <MonthlyBookings
            bookings={bookings}
            onSelectBooking={(b) => {
              setSelectedBooking(b);
            }}
            onUpdateStatus={updateBookingStatus}
          />
        )}

        {activeTab === 'schedule' && (
          <TodaySchedule
            bookings={bookings}
          />
        )}

        {activeTab === 'packets' && (
          <PreVisitPackets
            bookings={bookings.filter(b => b.diagnosisId || b.aiDiagnosis)}
            onViewDetails={setSelectedBooking}
          />
        )}

        {activeTab === 'patients' && (
          <PatientManagement
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

// 요약 카드 컴포넌트
function SummaryCard({ icon, label, value, color }) {
  return (
    <div className={`${color} rounded-xl p-3 text-center`}>
      <span className="material-symbols-outlined text-white/80 text-lg">{icon}</span>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/80">{label}</p>
    </div>
  );
}

// 오늘 예약 탭
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
        <BookingCard
          key={booking.id}
          booking={booking}
          onClick={() => onSelectBooking(booking)}
          onConfirm={() => onUpdateStatus(booking.id, 'confirmed')}
          onComplete={() => onCompleteVisit(booking)}
        />
      ))}
    </div>
  );
}

// 예약 카드 컴포넌트
function BookingCard({ booking, onClick, onConfirm, onComplete }) {
  const statusInfo = getBookingStatusInfo(booking.status);

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-xl">
              🐾
            </div>
            <div>
              <p className="font-bold text-slate-800">{booking.petName || '이름 없음'}</p>
              <p className="text-sm text-slate-500">
                {booking.time || '시간 미정'} · {booking.hospital?.name || '병원 정보 없음'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {booking.message && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
            💬 {booking.message}
          </p>
        )}

        {/* 빠른 액션 버튼 */}
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {booking.status === 'pending' && (
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition"
            >
              예약 확정
            </button>
          )}
          {(booking.status === 'confirmed' || booking.status === 'pending') && (
            <button
              onClick={onComplete}
              className="flex-1 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 transition"
            >
              진료 완료
            </button>
          )}
        </div>
      </div>

      {/* AI 진단 정보 표시 */}
      {booking.diagnosisId && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
          <span className="text-xs text-amber-700">✨ AI 사전 진단 정보 있음</span>
        </div>
      )}
    </div>
  );
}

// 사전 문진 탭
function PreVisitPackets({ bookings, onViewDetails }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-slate-500">AI 사전 진단 정보가 없습니다</p>
        <p className="text-sm text-slate-400 mt-1">
          보호자가 AI 진단을 받고 예약하면 여기에 표시됩니다
        </p>
      </div>
    );
  }

  // AI 진단 데이터 가져오기
  const getDiagnosisData = (diagnosisId) => {
    try {
      const diagnoses = JSON.parse(localStorage.getItem('petMedical_diagnoses') || '[]');
      return diagnoses.find(d => d.id === diagnosisId);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-slate-800">
        AI 사전 문진표 ({bookings.length}건)
      </h2>

      {bookings.map((booking) => {
        const diagnosis = getDiagnosisData(booking.diagnosisId);
        return (
          <div
            key={booking.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md transition"
            onClick={() => onViewDetails(booking)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-800">{booking.petName}</p>
                <p className="text-sm text-slate-500">
                  예약일: {booking.date} {booking.time}
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </div>

            {diagnosis && (
              <div className="mt-3 p-3 bg-sky-50 rounded-xl">
                <p className="text-sm font-bold text-sky-800">AI 예비 진단</p>
                <p className="text-sm text-slate-600 mt-1">
                  {diagnosis.diagnosis?.primary || diagnosis.diagnosis || '진단 정보 없음'}
                </p>
                {diagnosis.symptoms && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {diagnosis.symptoms.slice(0, 3).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-white text-slate-600 text-xs rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 환자 관리 탭
function PatientManagement({ bookings }) {
  // 고유한 환자(펫) 목록 추출
  const uniquePets = bookings.reduce((acc, b) => {
    if (b.petId && !acc.find(p => p.petId === b.petId)) {
      acc.push({
        petId: b.petId,
        petName: b.petName,
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
        <div className="text-5xl mb-3">🐾</div>
        <p className="text-slate-500">등록된 환자가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-slate-800">
        환자 목록 ({uniquePets.length}마리)
      </h2>

      {uniquePets.map((pet) => (
        <div
          key={pet.petId}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-lg">
                🐾
              </div>
              <div>
                <p className="font-bold text-slate-800">{pet.petName}</p>
                <p className="text-xs text-slate-500">
                  방문 {pet.visitCount}회 · 최근 {pet.lastVisit || '기록 없음'}
                </p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <span className="material-symbols-outlined">folder_open</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// 이번달 예약 탭
function MonthlyBookings({ bookings, onSelectBooking, onUpdateStatus }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 이번달 예약만 필터링
  const monthlyBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
  });

  // 날짜별로 그룹화
  const groupedByDate = monthlyBookings.reduce((acc, booking) => {
    const date = booking.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {});

  // 날짜순 정렬
  const sortedDates = Object.keys(groupedByDate).sort();

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (dateStr === today) return '오늘';
    if (dateStr === tomorrow) return '내일';

    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (monthlyBookings.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">
          calendar_month
        </span>
        <p className="text-slate-500">이번달 예약이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-500">calendar_month</span>
        {currentMonth + 1}월 예약 현황 ({monthlyBookings.length}건)
      </h2>

      {/* 월간 요약 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-600">
            {monthlyBookings.filter(b => b.status === 'pending').length}
          </p>
          <p className="text-xs text-amber-700">대기</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">
            {monthlyBookings.filter(b => b.status === 'confirmed').length}
          </p>
          <p className="text-xs text-green-700">확정</p>
        </div>
        <div className="bg-sky-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-sky-600">
            {monthlyBookings.filter(b => b.status === 'completed').length}
          </p>
          <p className="text-xs text-sky-700">완료</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-600">
            {monthlyBookings.filter(b => b.status === 'cancelled').length}
          </p>
          <p className="text-xs text-red-700">취소</p>
        </div>
      </div>

      {/* 날짜별 예약 목록 */}
      {sortedDates.map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-2 sticky top-16 bg-slate-100 py-2 z-5">
            <span className="material-symbols-outlined text-slate-400 text-sm">event</span>
            <span className="text-sm font-medium text-slate-600">{formatDateLabel(date)}</span>
            <span className="text-xs text-slate-400">({groupedByDate[date].length}건)</span>
          </div>

          {groupedByDate[date]
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            .map(booking => {
              const statusInfo = getBookingStatusInfo(booking.status);
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md transition"
                  onClick={() => onSelectBooking(booking)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
                        🐾
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{booking.petName || '이름 없음'}</p>
                        <p className="text-xs text-slate-500">{booking.time || '시간 미정'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

// 오늘 진료 스케줄 탭
function TodaySchedule({ bookings }) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today && b.status !== 'cancelled');

  // 시간대별 스케줄 생성 (9시~18시)
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const halfTimeStr = `${hour.toString().padStart(2, '0')}:30`;

    const slotBookings = todayBookings.filter(b => {
      if (!b.time) return false;
      const bookingHour = parseInt(b.time.split(':')[0]);
      const bookingMinute = parseInt(b.time.split(':')[1] || 0);
      return bookingHour === hour && bookingMinute < 30;
    });

    const halfSlotBookings = todayBookings.filter(b => {
      if (!b.time) return false;
      const bookingHour = parseInt(b.time.split(':')[0]);
      const bookingMinute = parseInt(b.time.split(':')[1] || 0);
      return bookingHour === hour && bookingMinute >= 30;
    });

    timeSlots.push({ time: timeStr, bookings: slotBookings });
    timeSlots.push({ time: halfTimeStr, bookings: halfSlotBookings });
  }

  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-500">schedule</span>
        오늘의 진료 스케줄
      </h2>

      {/* 현재 시간 표시 */}
      <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600">access_time</span>
        <span className="text-emerald-700 font-medium">
          현재 시간: {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')}
        </span>
      </div>

      {/* 타임라인 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {timeSlots.map((slot, idx) => {
          const slotHour = parseInt(slot.time.split(':')[0]);
          const slotMinute = parseInt(slot.time.split(':')[1]);
          const isPast = slotHour < currentHour || (slotHour === currentHour && slotMinute < currentMinute);
          const isCurrent = slotHour === currentHour &&
            ((slotMinute === 0 && currentMinute < 30) || (slotMinute === 30 && currentMinute >= 30));

          return (
            <div
              key={slot.time}
              className={`flex border-b border-slate-100 last:border-b-0 ${
                isCurrent ? 'bg-emerald-50' : isPast ? 'bg-slate-50' : ''
              }`}
            >
              {/* 시간 */}
              <div className={`w-16 py-3 px-2 text-center border-r border-slate-100 ${
                isCurrent ? 'text-emerald-600 font-bold' : isPast ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <span className="text-sm">{slot.time}</span>
              </div>

              {/* 예약 내용 */}
              <div className="flex-1 py-2 px-3">
                {slot.bookings.length > 0 ? (
                  <div className="space-y-1">
                    {slot.bookings.map(booking => {
                      const statusInfo = getBookingStatusInfo(booking.status);
                      return (
                        <div
                          key={booking.id}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            booking.status === 'completed' ? 'bg-slate-100' :
                            booking.status === 'confirmed' ? 'bg-emerald-100' : 'bg-amber-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🐾</span>
                            <span className="font-medium text-sm text-slate-800">{booking.petName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-sm ${isPast ? 'text-slate-300' : 'text-slate-400'}`}>
                    -
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 예약 없음 안내 */}
      {todayBookings.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">event_busy</span>
          오늘 예정된 진료가 없습니다
        </div>
      )}
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
        병원 설정
      </h2>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">병원명</label>
          {editing ? (
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
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
  // AI 진단 데이터 가져오기
  const [diagnosis, setDiagnosis] = useState(null);

  useEffect(() => {
    if (booking.diagnosisId) {
      try {
        const diagnoses = JSON.parse(localStorage.getItem('petMedical_diagnoses') || '[]');
        const found = diagnoses.find(d => d.id === booking.diagnosisId);
        setDiagnosis(found);
      } catch (error) {
        console.error('진단 데이터 로드 실패:', error);
      }
    }
  }, [booking.diagnosisId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800">예약 상세</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 환자 정보 */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-sm">
                🐾
              </div>
              <div>
                <p className="font-bold text-lg text-emerald-800">{booking.petName}</p>
                <p className="text-sm text-emerald-600">
                  예약일: {booking.date} {booking.time}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getBookingStatusInfo(booking.status).color}`}>
                  {getBookingStatusInfo(booking.status).label}
                </span>
              </div>
            </div>
          </div>

          {/* 보호자 메시지 */}
          {booking.message && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
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

                {/* 가능성 있는 질환 */}
                {diagnosis.suspectedConditions && diagnosis.suspectedConditions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">의심 질환</p>
                    <div className="space-y-2">
                      {diagnosis.suspectedConditions.map((condition, i) => (
                        <div key={i} className="bg-white p-2 rounded-lg border border-amber-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-amber-800">{condition.name}</span>
                            <span className={`text-sm font-bold ${
                              condition.probability >= 70 ? 'text-red-600' :
                              condition.probability >= 40 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {condition.probability}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-amber-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                condition.probability >= 70 ? 'bg-red-500' :
                                condition.probability >= 40 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${condition.probability}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 긴급도 */}
                {(diagnosis.triageScore || diagnosis.riskLevel) && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">긴급도</p>
                    <div className="flex items-center gap-2">
                      {diagnosis.triageScore && (
                        <>
                          <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                diagnosis.triageScore >= 70 ? 'bg-red-500' :
                                diagnosis.triageScore >= 40 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${diagnosis.triageScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-amber-800">{diagnosis.triageScore}점</span>
                        </>
                      )}
                      {diagnosis.riskLevel && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          diagnosis.riskLevel === 'high' || diagnosis.riskLevel === '긴급' ? 'bg-red-100 text-red-700' :
                          diagnosis.riskLevel === 'medium' || diagnosis.riskLevel === '주의' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {diagnosis.riskLevel === 'high' ? '긴급' :
                           diagnosis.riskLevel === 'medium' ? '주의' :
                           diagnosis.riskLevel === 'low' ? '양호' : diagnosis.riskLevel}
                        </span>
                      )}
                    </div>
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

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-2">
            {booking.status === 'pending' && (
              <button
                onClick={() => {
                  onUpdateStatus(booking.id, 'confirmed');
                  onClose();
                }}
                className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition"
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
    medications: '',
    notes: '',
    followUp: '',
    totalCost: '',
  });

  const handleSubmit = () => {
    if (!form.diagnosis.trim()) {
      alert('진단명을 입력해주세요.');
      return;
    }
    onSave({
      petId: booking.petId,
      petName: booking.petName,
      ...form,
      totalCost: form.totalCost ? parseInt(form.totalCost) : 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
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
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
              🐾
            </div>
            <div>
              <p className="font-semibold text-sky-800">{booking.petName}</p>
              <p className="text-xs text-sky-600">{booking.date} 진료</p>
            </div>
          </div>

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

          {/* 처방약 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">처방약</label>
            <textarea
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              placeholder="처방한 약품 및 용법을 입력하세요"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">특이사항</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="추가 메모사항"
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
              className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition flex items-center justify-center gap-2"
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

// 예약 상태 정보
function getBookingStatusInfo(status) {
  switch (status) {
    case 'confirmed':
      return { label: '예약 확정', color: 'bg-green-100 text-green-700' };
    case 'cancelled':
      return { label: '예약 취소', color: 'bg-red-100 text-red-700' };
    case 'completed':
      return { label: '진료 완료', color: 'bg-slate-100 text-slate-700' };
    default:
      return { label: '확인 대기', color: 'bg-amber-100 text-amber-700' };
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
`;
document.head.appendChild(style);

export default ClinicAdmin;
