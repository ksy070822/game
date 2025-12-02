// 병원 모드 대시보드 메인 컴포넌트
import { useState, useEffect } from 'react';
import {
  getUserClinics,
  getClinicInfo,
  getTodayBookings,
  getMonthlyBookings,
  getClinicPatients,
  getClinicStats
} from '../services/clinicService';

export function ClinicDashboard({ currentUser, onBack }) {
  const [loading, setLoading] = useState(true);
  const [currentClinic, setCurrentClinic] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  const [todayBookings, setTodayBookings] = useState([]);
  const [monthlyBookings, setMonthlyBookings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // 사용자가 속한 병원 목록 조회
      const userClinics = await getUserClinics(currentUser.uid);

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

      // 월별 예약
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const monthly = await getMonthlyBookings(currentClinic.id, year, month);
      setMonthlyBookings(monthly);

      // 환자 목록
      const patientList = await getClinicPatients(currentClinic.id, { limit: 50 });
      setPatients(patientList);

    } catch (error) {
      console.error('병원 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: '#10b981',
      pending: '#f59e0b',
      completed: '#6366f1',
      cancelled: '#ef4444',
      waiting: '#3b82f6'
    };
    return colors[status] || '#94a3b8';
  };

  const getBookingStatusLabel = (status) => {
    const labels = {
      confirmed: '예약 확정',
      pending: '대기중',
      completed: '진료 완료',
      cancelled: '취소',
      waiting: '대기실'
    };
    return labels[status] || status;
  };

  const getTriageColor = (level) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    return colors[level] || '#94a3b8';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#64748b' }}>병원 데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        padding: '24px 20px',
        position: 'relative'
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            left: '20px',
            top: '24px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← 뒤로
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            🏥 {currentClinic?.name || '병원 모드'}
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 병원 전환 드롭다운 (여러 병원인 경우) */}
        {clinics.length > 1 && (
          <select
            value={currentClinic?.id || ''}
            onChange={(e) => {
              const selected = clinics.find(c => c.id === e.target.value);
              setCurrentClinic(selected);
            }}
            style={{
              position: 'absolute',
              right: '20px',
              top: '24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {clinics.map(clinic => (
              <option key={clinic.id} value={clinic.id} style={{ color: '#1e293b' }}>
                {clinic.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 통계 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        padding: '16px',
        marginTop: '-20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>오늘 예약</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
            {stats.todayBookings || 0}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>이번 달 진료</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
            {stats.monthlyVisits || 0}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>총 환자</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>
            {stats.totalPatients || 0}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>예정 접종</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
            {stats.upcomingVaccinations || 0}
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '0 16px 16px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'today', label: '오늘 예약', icon: '📅' },
          { id: 'schedule', label: '진료 스케줄', icon: '🗓️' },
          { id: 'patients', label: '환자 기록', icon: '🐾' },
          { id: 'settings', label: '설정', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'white',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ padding: '0 16px 80px' }}>
        {/* 오늘 예약 */}
        {activeTab === 'today' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              오늘 예약 ({todayBookings.length}건)
            </h2>

            {todayBookings.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
                <p>오늘 예약이 없습니다</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todayBookings.map(booking => (
                  <div
                    key={booking.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${getBookingStatusColor(booking.status)}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {booking.time} - {booking.pet?.name || '미등록'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                          보호자: {booking.owner?.name || '알 수 없음'} | {booking.owner?.phone || ''}
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {booking.symptom || '일반 진료'}
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: getBookingStatusColor(booking.status) + '20',
                        color: getBookingStatusColor(booking.status),
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {getBookingStatusLabel(booking.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 환자 기록 */}
        {activeTab === 'patients' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              환자 목록 ({patients.length}명)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {patients.map(patient => (
                <div
                  key={patient.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {patient.petName} ({patient.speciesLabelKo})
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        {patient.breed} · {patient.ageYears}세 · {patient.lastWeightKg}kg
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        마지막 방문: {patient.lastVisitDate} · 방문 {patient.visitCount}회
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                        마지막 진단: {patient.lastDiagnosis}
                      </div>
                    </div>
                    {patient.lastTriageLevel && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: getTriageColor(patient.lastTriageLevel)
                      }}></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 설정 */}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              병원 설정
            </h2>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>병원명</div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>{currentClinic?.name}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>주소</div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>
                  {currentClinic?.address || '주소 정보 없음'}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>전화번호</div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>
                  {currentClinic?.phone || '전화번호 정보 없음'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>내 역할</div>
                <div style={{ fontSize: '16px', color: '#64748b' }}>
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
