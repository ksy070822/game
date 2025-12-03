import React, { useState, useRef } from 'react';
import './DiagnosisReport.css';
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

function DiagnosisReport({ petData, diagnosisResult, symptomData, onClose, onGoToHospital, onGoToTreatment }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const reportRef = useRef(null);

  const getPetInfo = () => {
    if (!petData) return { name: '미등록', age: '미상', weight: '미상', breed: '미상', species: 'dog', speciesLabel: '강아지', genderLabel: '미상' };

    const name = petData.petName || petData.name || '미등록';

    let age = '미상';
    if (petData.age) {
      age = typeof petData.age === 'number' ? `${petData.age}세` : petData.age;
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
    const speciesLabel = SPECIES_LABELS[species] || '기타';
    const gender = petData.sex || petData.gender;
    const genderLabel = gender === 'M' ? '수컷' : gender === 'F' ? '암컷' : '미상';
    const profileImage = getPetImage(petData, false);

    return { name, age, weight, breed, species, speciesLabel, gender, genderLabel, profileImage };
  };

  const petInfo = getPetInfo();

  const reportDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const pmdNumber = `PMD.${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const getEmergencyInfo = (emergency) => {
    switch(emergency) {
      case 'high':
        return { text: '긴급', color: '#ef4444', bgColor: '#fef2f2', desc: '즉시 병원 방문 필요' };
      case 'medium':
        return { text: '주의', color: '#f59e0b', bgColor: '#fffbeb', desc: '병원 방문 권장' };
      default:
        return { text: '경미', color: '#22c55e', bgColor: '#f0fdf4', desc: '가정 내 관리 가능' };
    }
  };

  const emergencyInfo = getEmergencyInfo(diagnosisResult?.emergency);

  // 신뢰도 계산
  const confidenceLevel = Math.round((diagnosisResult?.probability || 0.7) * 100);

  const handleSaveAsImage = async () => {
    setIsSaving(true);
    try {
      const reportText = generateReportText();
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `진단서_${petInfo.name}_${new Date().toISOString().split('T')[0]}.txt`;
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
진단서 번호: No. ${pmdNumber}

───────────────────────────────────────
              환자 정보
───────────────────────────────────────
이름: ${petInfo.name}
종류: ${petInfo.speciesLabel}
나이: ${petInfo.age}
품종: ${petInfo.breed}
몸무게: ${petInfo.weight}
성별: ${petInfo.genderLabel}

───────────────────────────────────────
              증상 분석
───────────────────────────────────────
진료과목: ${symptomData?.department || '일반'}
증상: ${symptomData?.selectedSymptoms?.join(', ') || symptomData?.description || '직접 입력'}
상세 설명: ${symptomData?.userDescription || symptomData?.description || '없음'}

───────────────────────────────────────
              진단 결과
───────────────────────────────────────
진단명: ${diagnosisResult?.diagnosis || '진단 없음'}
신뢰도: ${confidenceLevel}%
응급도: ${emergencyInfo.text} - ${emergencyInfo.desc}
${diagnosisResult?.triage_score ? `중증도: ${diagnosisResult.triage_score}/5` : ''}

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

  const getPetEmoji = () => {
    const species = petInfo.species?.toLowerCase();
    const emojis = {
      dog: '🐶',
      cat: '🐱',
      rabbit: '🐰',
      hamster: '🐹',
      bird: '🐦',
      hedgehog: '🦔',
      reptile: '🦎'
    };
    return emojis[species] || '🐾';
  };

  return (
    <div className="dr-overlay">
      <div className="dr-container" ref={reportRef}>
        {/* 헤더 */}
        <div className="dr-header">
          <div className="dr-header-left">
            <div className="dr-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="dr-header-text">
              <h1>PetMedical.AI 진단서</h1>
              <p>AI 기반 반려동물 건강 분석 리포트</p>
            </div>
          </div>
          <button className="dr-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="dr-content">
          {/* 진료 정보 */}
          <div className="dr-meta-card">
            <div className="dr-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{reportDate}</span>
            </div>
            <span className="dr-pmd-number">No. {pmdNumber}</span>
          </div>

          {/* 반려동물 정보 카드 */}
          <div className="dr-pet-card">
            <div className="dr-pet-avatar">
              {petInfo.profileImage ? (
                <img src={petInfo.profileImage} alt={petInfo.name} />
              ) : (
                <span className="dr-pet-emoji">{getPetEmoji()}</span>
              )}
            </div>
            <div className="dr-pet-details">
              <h2>반려동물 정보</h2>
              <div className="dr-pet-grid">
                <div className="dr-pet-item">
                  <span className="dr-pet-label">이름</span>
                  <span className="dr-pet-value">{petInfo.name}</span>
                </div>
                <div className="dr-pet-item">
                  <span className="dr-pet-label">종류</span>
                  <span className="dr-pet-value">{petInfo.speciesLabel}</span>
                </div>
                <div className="dr-pet-item">
                  <span className="dr-pet-label">나이</span>
                  <span className="dr-pet-value">{petInfo.age}</span>
                </div>
                <div className="dr-pet-item">
                  <span className="dr-pet-label">품종</span>
                  <span className="dr-pet-value">{petInfo.breed}</span>
                </div>
                <div className="dr-pet-item">
                  <span className="dr-pet-label">체중</span>
                  <span className="dr-pet-value">{petInfo.weight}</span>
                </div>
                <div className="dr-pet-item">
                  <span className="dr-pet-label">성별</span>
                  <span className="dr-pet-value">{petInfo.genderLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 증상 정보 */}
          {symptomData && (
            <div className="dr-section">
              <h3 className="dr-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                증상 정보
              </h3>
              {symptomData?.department && (
                <p className="dr-symptom-department">진료과목: {symptomData.department}</p>
              )}
              {symptomData?.selectedSymptoms?.length > 0 && (
                <div className="dr-symptom-tags">
                  {symptomData.selectedSymptoms.map((symptom, idx) => (
                    <span key={idx} className="dr-symptom-tag">{symptom}</span>
                  ))}
                </div>
              )}
              {(symptomData?.userDescription || symptomData?.description) && (
                <div className="dr-description-box">
                  {symptomData?.userDescription || symptomData?.description}
                </div>
              )}
            </div>
          )}

          {/* 진단 결과 카드 */}
          <div className="dr-diagnosis-card">
            <div className="dr-diagnosis-header">
              <div className="dr-diagnosis-title-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>진단 결과</h3>
              </div>
              <div className="dr-emergency-badges">
                <span className="dr-badge" style={{ backgroundColor: emergencyInfo.color }}>
                  {emergencyInfo.text}
                </span>
              </div>
            </div>

            <div className="dr-diagnosis-content">
              <h4 className="dr-diagnosis-name">{diagnosisResult?.diagnosis || '진단 결과 없음'}</h4>

              {/* 신뢰도 바 */}
              <div className="dr-confidence">
                <span className="dr-confidence-label">신뢰도</span>
                <div className="dr-confidence-bar">
                  <div className="dr-confidence-fill" style={{ width: `${confidenceLevel}%` }}></div>
                </div>
                <span className="dr-confidence-value">{confidenceLevel}%</span>
              </div>

              {/* 중증도 평가 */}
              {diagnosisResult?.triage_score !== undefined && (
                <div className="dr-severity">
                  <span className="dr-severity-label">중증도 평가</span>
                  <div className="dr-severity-dots">
                    {[1, 2, 3, 4, 5].map(num => (
                      <div
                        key={num}
                        className={`dr-severity-dot ${num <= diagnosisResult.triage_score ? 'active' : ''}`}
                        style={{
                          backgroundColor: num <= diagnosisResult.triage_score
                            ? (diagnosisResult.triage_score >= 4 ? '#ef4444' :
                               diagnosisResult.triage_score >= 3 ? '#f59e0b' : '#22c55e')
                            : '#e5e7eb'
                        }}
                      />
                    ))}
                  </div>
                  <span className="dr-severity-value">{diagnosisResult.triage_score}/5</span>
                </div>
              )}
            </div>
          </div>

          {/* 상세 설명 */}
          {diagnosisResult?.description && (
            <div className="dr-section">
              <h3 className="dr-section-title">상세 설명</h3>
              <div className="dr-description-box">
                {diagnosisResult.description}
              </div>
            </div>
          )}

          {/* 권장 조치사항 */}
          {diagnosisResult?.actions?.length > 0 && (
            <div className="dr-section">
              <h3 className="dr-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                권장 조치사항
              </h3>
              <div className="dr-actions-list">
                {diagnosisResult.actions.map((action, idx) => (
                  <div key={idx} className="dr-action-item">
                    <div className="dr-action-num">{idx + 1}</div>
                    <p className="dr-action-text">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 약물 안내 */}
          {diagnosisResult?.medicationGuidance?.hasMedicationGuidance && (
            <div className="dr-section dr-medication-section">
              <h3 className="dr-section-title">약물 안내</h3>
              <p className="dr-medication-summary">{diagnosisResult.medicationGuidance.message}</p>
              {diagnosisResult.medicationGuidance.medications?.map((categoryMed, idx) => (
                <div key={idx} className="dr-medication-category">
                  <div className="dr-medication-category-title">{categoryMed.category} 관련</div>
                  {categoryMed.medications?.slice(0, 2).map((med, medIdx) => (
                    <div key={medIdx} className="dr-medication-item">
                      <div className="dr-medication-type">{med.type}</div>
                      <div className="dr-medication-details">
                        <span>복용: {med.usage}</span>
                        <span>기간: {med.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <p className="dr-medication-disclaimer">{diagnosisResult.medicationGuidance.disclaimer}</p>
            </div>
          )}

          {/* 병원 방문 안내 */}
          {(diagnosisResult?.hospitalVisit || diagnosisResult?.emergency === 'high' || diagnosisResult?.emergency === 'medium') && (
            <div className="dr-hospital-alert">
              <div className="dr-hospital-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="dr-hospital-content">
                <strong>중요 안내사항</strong>
                <p>{diagnosisResult?.hospitalVisitTime || '가능한 빨리'} 병원 방문을 권장합니다. 증상이 지속되거나 악화될 경우 반드시 전문 수의사의 진료를 받으세요.</p>
              </div>
            </div>
          )}

          {/* 하단 안내 */}
          <div className="dr-footer-notice">
            본 진단서는 AI 분석 결과로 참고용입니다.
            정확한 진단은 반드시 전문 수의사와 상담하세요.
          </div>

          {/* 푸터 로고 */}
          <div className="dr-footer-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#06b6d4">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>PetMedical.AI</span>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="dr-actions">
          <button
            className="dr-btn dr-btn-primary"
            onClick={handleSaveAsImage}
            disabled={isSaving}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {isSaving ? '저장 중...' : '진단서 저장'}
          </button>
          <button
            className="dr-btn dr-btn-secondary"
            onClick={handleSendToHospital}
            disabled={isSending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {isSending ? '전송 중...' : '병원 예약하기'}
          </button>
          <button
            className="dr-btn dr-btn-treatment"
            onClick={onGoToTreatment}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            직접 치료하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiagnosisReport;
