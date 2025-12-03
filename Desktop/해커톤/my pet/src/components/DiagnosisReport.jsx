import React, { useState, useRef } from 'react';
import './DiagnosisReport.css';
import { getPetImage } from '../utils/imagePaths';

function DiagnosisReport({ petData, diagnosisResult, symptomData, onClose, onGoToHospital, onGoToTreatment }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'detail'
  const reportRef = useRef(null);

  const getPetInfo = () => {
    if (!petData) return { name: '미등록', age: '미상', weight: '미상', breed: '미상', species: 'dog' };

    const name = petData.petName || petData.name || '미등록';

    let age = '미상';
    if (petData.age) {
      age = petData.age;
    } else if (petData.birthDate) {
      const birth = new Date(petData.birthDate);
      const today = new Date();
      const years = today.getFullYear() - birth.getFullYear();
      const months = today.getMonth() - birth.getMonth();
      if (years > 0) {
        age = `${years}세`;
      } else if (months > 0) {
        age = `${months}개월`;
      } else {
        age = '1개월 미만';
      }
    }

    const weight = petData.weight ? `${petData.weight}kg` : '미상';
    const breed = petData.breed || '미상';
    const species = petData.species || 'dog';
    const gender = petData.sex || petData.gender;
    const profileImage = getPetImage(petData, false);

    return { name, age, weight, breed, species, gender, profileImage };
  };

  const petInfo = getPetInfo();

  const reportDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getEmergencyInfo = (emergency) => {
    switch(emergency) {
      case 'high':
        return { text: '응급', color: '#ef4444', bgColor: '#fef2f2', icon: '🔴', desc: '즉시 병원 방문 필요' };
      case 'medium':
        return { text: '주의', color: '#f59e0b', bgColor: '#fffbeb', icon: '🟡', desc: '병원 방문 권장' };
      default:
        return { text: '경미', color: '#22c55e', bgColor: '#f0fdf4', icon: '🟢', desc: '가정 내 관리 가능' };
    }
  };

  const emergencyInfo = getEmergencyInfo(diagnosisResult?.emergency);

  const handleSaveAsImage = async () => {
    setIsSaving(true);
    try {
      const reportText = generateReportText();
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `진단서_${petData?.name || '반려동물'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('진단서가 저장되었습니다.');
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateReportText = () => {
    return `
═══════════════════════════════════════
       PetMedical.AI 진단서
═══════════════════════════════════════

발급일시: ${reportDate}
진단서 번호: PMD-${Date.now().toString(36).toUpperCase()}

───────────────────────────────────────
              환자 정보
───────────────────────────────────────
이름: ${petInfo.name}
나이: ${petInfo.age}
몸무게: ${petInfo.weight}
품종: ${petInfo.breed}
${petInfo.gender ? `성별: ${petInfo.gender === 'M' ? '수컷' : '암컷'}` : ''}

───────────────────────────────────────
              증상 분석
───────────────────────────────────────
보호자 설명: ${symptomData?.description || '없음'}
증상 지속 기간: ${symptomData?.duration || '미상'}
관찰된 증상: ${symptomData?.symptoms?.join(', ') || '직접 입력'}

───────────────────────────────────────
              진단 결과
───────────────────────────────────────
진단명: ${diagnosisResult?.diagnosis || '진단 없음'}

응급도: ${emergencyInfo.text} - ${emergencyInfo.desc}
${diagnosisResult?.triage_score ? `Triage Score: ${diagnosisResult.triage_score}/5` : ''}

───────────────────────────────────────
              상세 설명
───────────────────────────────────────
${diagnosisResult?.description || '상세 설명 없음'}

───────────────────────────────────────
              권장 조치사항
───────────────────────────────────────
${diagnosisResult?.actions?.map((action, idx) => `${idx + 1}. ${action}`).join('\n') || '없음'}

═══════════════════════════════════════
    본 진단서는 AI 분석 결과입니다.
    정확한 진단을 위해 수의사 상담을
    권장합니다.
═══════════════════════════════════════
`;
  };

  const handleSendToHospital = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      if (onGoToHospital) {
        onGoToHospital();
      }
    }, 1000);
  };

  return (
    <div className="diagnosis-report-overlay">
      <div className="diagnosis-report-container" ref={reportRef}>
        {/* 헤더 영역 */}
        <div className="report-header-new">
          <button className="report-close-btn-new" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div className="report-header-content">
            <h1>AI 진단 결과</h1>
            <p className="report-date-new">{reportDate}</p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="report-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            요약
          </button>
          <button
            className={`tab-btn ${activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('detail')}
          >
            상세
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="report-content">
          {activeTab === 'overview' ? (
            /* 요약 탭 */
            <div className="overview-tab">
              {/* 반려동물 카드 */}
              <div className="pet-card-new">
                <div className="pet-avatar-new">
                  <img src={petInfo.profileImage} alt={petInfo.name} />
                </div>
                <div className="pet-info-new">
                  <h3>{petInfo.name}</h3>
                  <p>{petInfo.breed} · {petInfo.age}</p>
                  {petInfo.gender && (
                    <span className="pet-gender-badge">
                      {petInfo.gender === 'M' ? '♂ 수컷' : '♀ 암컷'}
                    </span>
                  )}
                </div>
              </div>

              {/* 진단 결과 카드 */}
              <div className="diagnosis-card-new">
                <div className="diagnosis-label">진단명</div>
                <h2 className="diagnosis-title-new">{diagnosisResult?.diagnosis || '진단 결과 없음'}</h2>

                {/* 응급도 배지 */}
                <div
                  className="emergency-badge-new"
                  style={{ backgroundColor: emergencyInfo.bgColor, color: emergencyInfo.color }}
                >
                  <span className="emergency-dot" style={{ backgroundColor: emergencyInfo.color }}></span>
                  <span>{emergencyInfo.text}</span>
                  <span className="emergency-separator">|</span>
                  <span>{emergencyInfo.desc}</span>
                </div>

                {/* 응급도 바 */}
                {diagnosisResult?.triage_score !== undefined && (
                  <div className="triage-bar-new">
                    <div className="triage-label-new">응급도</div>
                    <div className="triage-dots">
                      {[1, 2, 3, 4, 5].map(num => (
                        <div
                          key={num}
                          className={`triage-dot-new ${num <= diagnosisResult.triage_score ? 'filled' : ''}`}
                          style={{
                            backgroundColor: num <= diagnosisResult.triage_score
                              ? (diagnosisResult.triage_score >= 4 ? '#ef4444' :
                                 diagnosisResult.triage_score >= 3 ? '#f59e0b' : '#22c55e')
                              : '#e5e7eb'
                          }}
                        />
                      ))}
                    </div>
                    <span className="triage-score-new">{diagnosisResult.triage_score}/5</span>
                  </div>
                )}
              </div>

              {/* 간단 설명 */}
              {diagnosisResult?.description && (
                <div className="summary-card">
                  <h4>요약 설명</h4>
                  <p>{diagnosisResult.description.length > 150
                    ? diagnosisResult.description.substring(0, 150) + '...'
                    : diagnosisResult.description}
                  </p>
                  {diagnosisResult.description.length > 150 && (
                    <button className="read-more-btn" onClick={() => setActiveTab('detail')}>
                      자세히 보기
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 상세 탭 */
            <div className="detail-tab">
              {/* 증상 정보 */}
              <div className="detail-section">
                <h4>증상 정보</h4>
                {symptomData?.department && (
                  <div className="detail-item">
                    <span className="detail-icon">🏥</span>
                    <span>진료과목: {symptomData.department}</span>
                  </div>
                )}
                {symptomData?.selectedSymptoms?.length > 0 && (
                  <div className="symptom-tags">
                    {symptomData.selectedSymptoms.map((symptom, idx) => (
                      <span key={idx} className="symptom-tag">{symptom}</span>
                    ))}
                  </div>
                )}
                {(symptomData?.userDescription || symptomData?.description) && (
                  <div className="detail-description">
                    {symptomData?.userDescription || symptomData?.description}
                  </div>
                )}
                {symptomData?.duration && (
                  <div className="detail-item">
                    <span className="detail-icon">⏱</span>
                    <span>증상 지속: {symptomData.duration}</span>
                  </div>
                )}
              </div>

              {/* 상세 설명 */}
              {diagnosisResult?.description && (
                <div className="detail-section">
                  <h4>상세 설명</h4>
                  <p className="full-description">{diagnosisResult.description}</p>
                </div>
              )}

              {/* 권장 조치사항 */}
              {diagnosisResult?.actions?.length > 0 && (
                <div className="detail-section">
                  <h4>권장 조치사항</h4>
                  <ul className="actions-list-new">
                    {diagnosisResult.actions.map((action, idx) => (
                      <li key={idx}>
                        <span className="action-num">{idx + 1}</span>
                        <span className="action-text">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 병원 방문 안내 */}
              {diagnosisResult?.hospitalVisit && (
                <div className="hospital-alert">
                  <div className="hospital-alert-icon">🏥</div>
                  <div className="hospital-alert-content">
                    <strong>병원 방문 권장</strong>
                    <p>{diagnosisResult.hospitalVisitTime || '가능한 빨리'} 내 방문하세요</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 안내 문구 */}
        <div className="report-disclaimer-new">
          본 진단서는 AI 분석 결과로, 참고용입니다. 정확한 진단을 위해 수의사와 상담하세요.
        </div>

        {/* 액션 버튼들 */}
        <div className="report-actions-new">
          <button
            className="action-btn-new primary"
            onClick={handleSendToHospital}
            disabled={isSending}
          >
            {isSending ? '전송 중...' : '병원 예약하기'}
          </button>
          <button
            className="action-btn-new secondary"
            onClick={onGoToTreatment}
          >
            집에서 케어하기
          </button>
          <button
            className="action-btn-new outline"
            onClick={handleSaveAsImage}
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '진단서 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiagnosisReport;
