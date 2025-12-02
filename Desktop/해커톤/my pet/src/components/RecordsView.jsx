import { useState, useEffect } from 'react';

const DIAGNOSIS_KEY = 'petMedical_diagnoses';
const CLINIC_RESULTS_KEY = 'petMedical_clinicResults';
const MEDICATION_FEEDBACK_KEY = 'petMedical_medicationFeedback';

// 더미 데이터 - 방문이력
const DUMMY_VISITS = [
  {
    id: 'visit_1',
    date: '2024-11-15',
    hospitalName: '행복한동물병원',
    hospitalAddress: '서울시 강남구 역삼동 123-45',
    diagnosis: '경미한 피부염 - 알레르기성 피부 반응',
    type: 'visit',
    triage_score: 2,
    possible_diseases: [
      { name: '아토피성 피부염', probability: 65 },
      { name: '접촉성 알레르기', probability: 25 }
    ]
  },
  {
    id: 'visit_2',
    date: '2024-10-20',
    hospitalName: '24시 강남동물의료센터',
    hospitalAddress: '서울시 강남구 논현동 456-78',
    diagnosis: '소화기 질환 - 급성 장염',
    type: 'visit',
    triage_score: 3,
    possible_diseases: [
      { name: '급성 장염', probability: 70 },
      { name: '소화불량', probability: 20 }
    ]
  },
  {
    id: 'visit_3',
    date: '2024-09-05',
    hospitalName: '행복한동물병원',
    hospitalAddress: '서울시 강남구 역삼동 123-45',
    diagnosis: '정기검진 - 건강상태 양호',
    type: 'visit',
    triage_score: 1
  }
];

// 더미 데이터 - 의약품 (모가 샘플 데이터 포함)
const DUMMY_MEDICATIONS = [
  {
    id: 'med_1',
    date: '2024-11-28',
    medications: ['피부연고 (히드로코르티손)', '항히스타민제'],
    pharmacyName: '행복한동물병원',
    daysSupply: '7일분',
    status: 'effective'
  },
  {
    id: 'med_2',
    date: '2024-11-20',
    medications: ['아목시실린 (항생제)', '소염진통제'],
    pharmacyName: '24시 강남동물의료센터',
    daysSupply: '5일분',
    status: 'effective'
  },
  {
    id: 'med_3',
    date: '2024-11-15',
    medications: ['감기약 (콧물/기침)', '면역강화제'],
    pharmacyName: '행복한동물병원',
    daysSupply: '3일분',
    status: 'side_effect'
  },
  {
    id: 'med_4',
    date: '2024-11-10',
    medications: ['귀연고 (항균)', '귀세정제'],
    pharmacyName: '24시 강남동물의료센터',
    daysSupply: '10일분',
    status: 'effective'
  },
  {
    id: 'med_5',
    date: '2024-11-05',
    medications: ['프로바이오틱스', '장영양제'],
    pharmacyName: '행복한동물병원',
    daysSupply: '14일분',
    status: 'none'
  },
  {
    id: 'med_6',
    date: '2024-10-28',
    medications: ['안연고 (항생제)', '인공눈물'],
    pharmacyName: '24시 강남동물의료센터',
    daysSupply: '7일분',
    status: 'none'
  },
  {
    id: 'med_7',
    date: '2024-10-15',
    medications: ['넥스가드 스펙트라'],
    pharmacyName: '행복한동물병원',
    daysSupply: '1회분',
    status: 'none'
  }
];

// 더미 데이터 - 건강검진
const DUMMY_CHECKUPS = [
  {
    id: 'checkup_1',
    date: '2024-09-05',
    hospitalName: '행복한동물병원',
    type: '종합건강검진',
    results: [
      { item: '혈액검사', status: 'normal', note: '모든 수치 정상 범위' },
      { item: '소변검사', status: 'normal', note: '요비중 정상' },
      { item: '심장초음파', status: 'normal', note: '심장 기능 양호' },
      { item: '복부초음파', status: 'normal', note: '장기 상태 양호' }
    ],
    overallStatus: '건강'
  },
  {
    id: 'checkup_2',
    date: '2024-03-15',
    hospitalName: '24시 강남동물의료센터',
    type: '기본건강검진',
    results: [
      { item: '혈액검사', status: 'normal', note: '정상' },
      { item: '체중측정', status: 'caution', note: '약간 과체중 (5.8kg → 6.2kg)' },
      { item: '치아검사', status: 'normal', note: '치석 약간 있음' }
    ],
    overallStatus: '주의'
  }
];

// 더미 데이터 - 케어 기록
const DUMMY_CARE_LOGS = [
  {
    id: 'care_1',
    date: '2024-11-29',
    meals: 3,
    water: 4,
    walks: 2,
    treats: 2,
    grooming: 1,
    weight: 6.2,
    notes: '오늘 산책 중 기분 좋아 보였어요!'
  },
  {
    id: 'care_2',
    date: '2024-11-28',
    meals: 2,
    water: 3,
    walks: 1,
    treats: 3,
    grooming: 0,
    weight: null,
    notes: ''
  },
  {
    id: 'care_3',
    date: '2024-11-27',
    meals: 3,
    water: 5,
    walks: 2,
    treats: 1,
    grooming: 1,
    weight: 6.1,
    notes: '목욕 완료'
  },
  {
    id: 'care_4',
    date: '2024-11-26',
    meals: 2,
    water: 4,
    walks: 2,
    treats: 2,
    grooming: 0,
    weight: null,
    notes: ''
  }
];

// 더미 데이터 - 예방접종
const DUMMY_VACCINATIONS = [
  {
    id: 'vac_1',
    date: '2024-08-20',
    name: '종합백신 (DHPPL)',
    hospitalName: '행복한동물병원',
    nextDue: '2025-08-20',
    status: 'completed'
  },
  {
    id: 'vac_2',
    date: '2024-11-01',
    name: '심장사상충 예방',
    hospitalName: '행복한동물병원',
    nextDue: '2024-12-01',
    status: 'completed'
  },
  {
    id: 'vac_3',
    date: '2024-07-15',
    name: '광견병 백신',
    hospitalName: '행복한동물병원',
    nextDue: '2025-07-15',
    status: 'completed'
  },
  {
    id: 'vac_4',
    date: '2024-06-10',
    name: '켄넬코프 백신',
    hospitalName: '24시 강남동물의료센터',
    nextDue: '2025-06-10',
    status: 'completed'
  }
];

export function RecordsView({ petData, onBack, onViewDiagnosis, onOCR, onHome, onHospitalBooking }) {
  const [activeTab, setActiveTab] = useState('visits'); // visits, medication, checkup, vaccination
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicResults, setClinicResults] = useState([]);
  const [medicationFeedback, setMedicationFeedback] = useState({});
  const [useDummyData, setUseDummyData] = useState(true); // 더미데이터 사용 플래그 - 샘플 데이터 표시

  // 진단 기록 로드
  useEffect(() => {
    const stored = localStorage.getItem(DIAGNOSIS_KEY);
    if (stored) {
      const allDiagnoses = JSON.parse(stored);
      const petDiagnoses = allDiagnoses.filter(d => d.petId === petData?.id);
      setDiagnoses(petDiagnoses);
    }
  }, [petData]);

  // 병원 진료 결과 로드
  useEffect(() => {
    const stored = localStorage.getItem(CLINIC_RESULTS_KEY);
    if (stored) {
      const allResults = JSON.parse(stored);
      const petResults = allResults.filter(r => r.petId === petData?.id);
      setClinicResults(petResults);
    }
  }, [petData]);

  // 의약품 피드백 로드
  useEffect(() => {
    const stored = localStorage.getItem(MEDICATION_FEEDBACK_KEY);
    if (stored) {
      setMedicationFeedback(JSON.parse(stored));
    }
  }, []);

  // 의약품 피드백 저장
  const saveMedicationFeedback = (medicationId, feedback) => {
    const newFeedback = {
      ...medicationFeedback,
      [medicationId]: {
        status: feedback,
        updatedAt: new Date().toISOString(),
        petId: petData?.id
      }
    };
    setMedicationFeedback(newFeedback);
    localStorage.setItem(MEDICATION_FEEDBACK_KEY, JSON.stringify(newFeedback));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const tabs = [
    { id: 'visits', label: '방문이력', icon: 'local_hospital' },
    { id: 'medication', label: '의약품', icon: 'medication' },
    { id: 'checkup', label: '건강검진', icon: 'assignment' },
    { id: 'vaccination', label: '예방접종', icon: 'vaccines' },
    { id: 'care', label: '케어기록', icon: 'favorite' }
  ];

  // 방문이력 데이터 (진료 결과 + 진단 기록)
  const visitRecords = (() => {
    // 병원 진료 결과를 방문 기록으로 변환
    const clinicVisits = clinicResults.map(result => ({
      id: result.id,
      date: result.visitDate || result.createdAt,
      hospitalName: result.hospitalName,
      hospitalAddress: result.hospitalAddress || '',
      diagnosis: result.finalDiagnosis || result.diagnosis,
      type: 'visit',
      triage_score: result.triageScore,
      treatment: result.treatment,
      medications: result.medications,
      totalCost: result.totalCost,
      nextVisitDate: result.nextVisitDate,
      doctorNote: result.doctorNote,
      source: 'clinic' // 병원에서 입력한 기록
    }));

    // 진단 기록 (AI 진단)
    const diagnosisVisits = diagnoses.filter(d => d.type === 'visit' || !d.type).map(d => ({
      ...d,
      source: 'ai' // AI 진단 기록
    }));

    const realData = [...clinicVisits, ...diagnosisVisits].sort((a, b) =>
      new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
    );

    return useDummyData ? [...realData, ...DUMMY_VISITS] : realData;
  })();

  // 의약품 기록 (병원 처방 + AI 진단 처방)
  const medicationRecords = (() => {
    // 병원 진료 결과에서 의약품 추출
    const clinicMedications = clinicResults
      .filter(result => result.medications && result.medications.length > 0)
      .flatMap(result =>
        result.medications.map((med, idx) => ({
          id: `${result.id}_med_${idx}`,
          resultId: result.id,
          date: result.visitDate || result.createdAt,
          name: med.name,
          dosage: med.dosage,
          days: med.days,
          instructions: med.instructions,
          hospitalName: result.hospitalName,
          petId: result.petId,
          source: 'clinic',
          // 피드백 상태 확인
          feedbackStatus: medicationFeedback[`${result.id}_med_${idx}`]?.status || 'none'
        }))
      );

    // AI 진단에서 처방 추출
    const aiMedications = diagnoses
      .filter(d => d.medications || d.prescription)
      .map(d => ({
        id: d.id,
        date: d.created_at || d.date,
        medications: d.medications || d.prescription || [],
        hospitalName: 'AI 진단',
        source: 'ai',
        feedbackStatus: medicationFeedback[d.id]?.status || 'none'
      }));

    const realData = [...clinicMedications, ...aiMedications].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    return useDummyData ? [...realData, ...DUMMY_MEDICATIONS] : realData;
  })();

  // 건강검진 기록
  const checkupRecords = useDummyData ? DUMMY_CHECKUPS : [];

  // 예방접종 기록
  const vaccinationRecords = useDummyData ? DUMMY_VACCINATIONS : [];

  // 케어 기록
  const careRecords = useDummyData ? DUMMY_CARE_LOGS : [];

  // 의약품 상태 카운트
  const effectiveMeds = medicationRecords.filter(m => m.feedbackStatus === 'effective').length;
  const sideEffectMeds = medicationRecords.filter(m => m.feedbackStatus === 'side_effect').length;
  const pendingMeds = medicationRecords.filter(m => m.feedbackStatus === 'none' || !m.feedbackStatus).length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'caution': return 'text-yellow-600 bg-yellow-50';
      case 'warning': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal': return 'check_circle';
      case 'caution': return 'warning';
      case 'warning': return 'error';
      default: return 'help';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-slate-600">
            <span className="text-sm">← 돌아가기</span>
          </button>
        </div>
        <h1 className="text-xl font-bold text-slate-900">건강 기록</h1>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 일일 기록 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">일일 기록</h3>
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')}</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-lg">🍚</span>
                <span className="text-[10px] text-slate-600">2회</span>
              </div>
              <span className="text-xs text-slate-500 mt-1">식사</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-lg">💧</span>
                <span className="text-[10px] text-slate-600">3회</span>
              </div>
              <span className="text-xs text-slate-500 mt-1">물</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-lg">🩴</span>
                <span className="text-[10px] text-slate-600">2회</span>
              </div>
              <span className="text-xs text-slate-500 mt-1">산책</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-lg">🍖</span>
                <span className="text-[10px] text-slate-600">1회</span>
              </div>
              <span className="text-xs text-slate-500 mt-1">간식</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                <span className="text-lg">🗑️</span>
                <span className="text-[10px] text-slate-600">2회</span>
              </div>
              <span className="text-xs text-slate-500 mt-1">배변</span>
            </div>
          </div>
        </div>

        {/* 최근 병원 방문 요약 */}
        {visitRecords.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">최근 병원 방문</h3>
              <span className="text-xs text-slate-400">{formatDateShort(visitRecords[0]?.date || visitRecords[0]?.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                visitRecords[0]?.source === 'clinic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {visitRecords[0]?.source === 'clinic' ? '병원 진료' : 'AI 진단'}
              </span>
              <span className="text-sm text-slate-700">{visitRecords[0]?.hospitalName || 'AI 진단'}</span>
            </div>
            <p className="text-sm text-slate-600">{visitRecords[0]?.diagnosis || '진단 정보 없음'}</p>
            {visitRecords[0]?.medications?.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                💊 처방약 {visitRecords[0].medications.length}개
              </p>
            )}
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[80px] py-3 px-2 text-center transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/5 text-primary border-b-2 border-primary'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-lg block mb-0.5">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* 방문이력 */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            {visitRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🏥</div>
                <p className="text-slate-500">방문 기록이 없습니다.</p>
                <p className="text-slate-400 text-sm mt-1">AI 진단 후 병원을 방문하면 기록이 남아요</p>
              </div>
            ) : (
              visitRecords.map(record => (
                <div
                  key={record.id}
                  onClick={() => onViewDiagnosis && onViewDiagnosis(record)}
                  className="bg-slate-50 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.source === 'clinic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {record.source === 'clinic' ? '병원' : 'AI'}
                        </span>
                        <p className="text-slate-500 text-xs">{formatDateShort(record.date || record.created_at)}</p>
                      </div>
                      <h3 className="text-slate-900 font-bold text-base mb-1">
                        {record.hospitalName || 'AI 진단'}
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                  </div>

                  {record.diagnosis && (
                    <p className="text-slate-700 text-sm mb-2">
                      {record.diagnosis}
                    </p>
                  )}

                  {/* 병원 진료 결과 추가 정보 */}
                  {record.source === 'clinic' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {record.treatment && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                          <span className="material-symbols-outlined text-xs">healing</span>
                          {record.treatment}
                        </span>
                      )}
                      {record.medications?.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                          <span className="material-symbols-outlined text-xs">medication</span>
                          처방약 {record.medications.length}개
                        </span>
                      )}
                      {record.totalCost > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          💰 {record.totalCost.toLocaleString()}원
                        </span>
                      )}
                      {record.nextVisitDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          <span className="material-symbols-outlined text-xs">event</span>
                          다음방문: {formatDateShort(record.nextVisitDate)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 의약품 */}
        {activeTab === 'medication' && (
          <div className="space-y-4">
            {/* 요약 정보 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-slate-700 mb-3">약품 피드백 현황</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                  <p className="text-xl font-bold text-green-600 mt-1">{effectiveMeds}</p>
                  <p className="text-xs text-slate-500">잘 맞는 약</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                  <p className="text-xl font-bold text-red-600 mt-1">{sideEffectMeds}</p>
                  <p className="text-xs text-slate-500">부작용</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">pending</span>
                  <p className="text-xl font-bold text-slate-600 mt-1">{pendingMeds}</p>
                  <p className="text-xs text-slate-500">기록 필요</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                💡 약 효과를 기록하면 다음 병원 방문 시 수의사가 참고할 수 있어요
              </p>
            </div>

            {medicationRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">💊</div>
                <p className="text-slate-500">처방받은 약이 없습니다.</p>
                <p className="text-slate-400 text-sm mt-1">병원에서 처방받은 약이 자동으로 기록돼요</p>
              </div>
            ) : (
              medicationRecords.map(record => (
                <div key={record.id} className="bg-slate-50 rounded-xl p-4">
                  {/* 개별 약품 (병원 처방) */}
                  {record.source === 'clinic' && (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              병원 처방
                            </span>
                            <span className="text-xs text-slate-500">{formatDateShort(record.date)}</span>
                          </div>
                          <h4 className="text-slate-900 font-bold text-base">{record.name}</h4>
                          <p className="text-slate-500 text-sm">{record.hospitalName}</p>
                        </div>
                        {/* 현재 피드백 상태 표시 */}
                        {record.feedbackStatus === 'effective' && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check</span>
                            잘 맞음
                          </span>
                        )}
                        {record.feedbackStatus === 'side_effect' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            부작용
                          </span>
                        )}
                      </div>

                      {/* 약품 상세 정보 */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {record.dosage && (
                          <span className="px-2 py-1 bg-white text-slate-600 rounded text-xs">
                            💉 {record.dosage}
                          </span>
                        )}
                        {record.days && (
                          <span className="px-2 py-1 bg-white text-slate-600 rounded text-xs">
                            📅 {record.days}일분
                          </span>
                        )}
                        {record.instructions && (
                          <span className="px-2 py-1 bg-white text-slate-600 rounded text-xs">
                            📝 {record.instructions}
                          </span>
                        )}
                      </div>

                      {/* 피드백 버튼 */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveMedicationFeedback(record.id, 'effective');
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            record.feedbackStatus === 'effective'
                              ? 'bg-green-500 text-white shadow-md'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">thumb_up</span>
                          잘 맞았어요
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveMedicationFeedback(record.id, 'side_effect');
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            record.feedbackStatus === 'side_effect'
                              ? 'bg-red-500 text-white shadow-md'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">thumb_down</span>
                          부작용 있었어요
                        </button>
                      </div>
                    </>
                  )}

                  {/* AI 진단 처방 (기존 형식) */}
                  {record.source === 'ai' && (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              AI 권장
                            </span>
                            <span className="text-xs text-slate-500">{formatDateShort(record.date)}</span>
                          </div>
                          <p className="text-slate-900 font-bold text-base mb-1">
                            {Array.isArray(record.medications) && record.medications.length > 0
                              ? (record.medications.length > 1
                                  ? `${typeof record.medications[0] === 'string' ? record.medications[0] : record.medications[0].name} 외 ${record.medications.length - 1}개`
                                  : (typeof record.medications[0] === 'string' ? record.medications[0] : record.medications[0].name))
                              : '처방 정보'}
                          </p>
                        </div>
                      </div>
                      {Array.isArray(record.medications) && record.medications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {record.medications.map((med, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white text-slate-600 rounded text-xs">
                              💊 {typeof med === 'string' ? med : med.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 건강검진 */}
        {activeTab === 'checkup' && (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-3 mb-4 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-sm">info</span>
              <p className="text-slate-700 text-sm flex-1">건강검진은 최근 10년 동안의 결과를 제공해요.</p>
              <span className="material-symbols-outlined text-slate-400 text-sm">arrow_forward_ios</span>
            </div>

            {checkupRecords.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-slate-500">건강검진 기록이 없습니다.</p>
              </div>
            ) : (
              checkupRecords.map(record => (
                <div key={record.id} className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{formatDateShort(record.date)}</p>
                      <h3 className="text-slate-900 font-bold text-base mb-1 font-display">{record.type}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {record.hospitalName}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.overallStatus === '건강' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {record.overallStatus}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    {record.results.map((result, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded-lg ${getStatusColor(result.status)}`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">{getStatusIcon(result.status)}</span>
                          <span className="text-sm font-medium">{result.item}</span>
                        </div>
                        <span className="text-xs">{result.note}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-4 py-2 text-primary text-sm font-medium flex items-center justify-center gap-1 hover:bg-primary/5 rounded-lg transition-colors">
                    상세 결과 보기
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 예방접종 */}
        {activeTab === 'vaccination' && (
          <div className="space-y-4">
            {/* 권장 예방접종 */}
            <div className="mb-6">
              <h3 className="text-slate-900 font-bold text-base mb-3 font-display">권장 예방접종 백신</h3>
              <div className="space-y-3">
                <div className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm mb-1">종합백신 (DHPPL)</h4>
                      <p className="text-slate-500 text-xs">1년에 1번 접종이 권장됩니다.</p>
                    </div>
                    <button
                      onClick={() => onHospitalBooking && onHospitalBooking()}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      지금 예약하기
                    </button>
                  </div>
                </div>
                <div className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm mb-1">심장사상충 예방약</h4>
                      <p className="text-slate-500 text-xs">1개월에 1번 접종이 권장됩니다.</p>
                    </div>
                    <button
                      onClick={() => onHospitalBooking && onHospitalBooking()}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      지금 예약하기
                    </button>
                  </div>
                </div>
                <div className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm mb-1">광견병 백신</h4>
                      <p className="text-slate-500 text-xs">1년에 1번 접종 (법적 의무)</p>
                    </div>
                    <button
                      onClick={() => onHospitalBooking && onHospitalBooking()}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      지금 예약하기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 이전 접종 내역 */}
            <div>
              <h3 className="text-slate-900 font-bold text-base mb-3 font-display">이전 접종 내역</h3>
              {vaccinationRecords.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">💉</div>
                  <p className="text-slate-500">예방접종 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccinationRecords.map(record => (
                    <div key={record.id} className="bg-surface-light rounded-lg p-4 shadow-soft">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">vaccines</span>
                          </div>
                          <div>
                            <h4 className="text-slate-900 font-bold text-sm mb-1">{record.name}</h4>
                            <p className="text-slate-500 text-xs">{formatDateShort(record.date)} • {record.hospitalName}</p>
                            <p className="text-primary text-xs mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">event</span>
                              다음 접종: {formatDateShort(record.nextDue)}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          완료
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 케어기록 */}
        {activeTab === 'care' && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="bg-surface-light rounded-lg p-4 shadow-soft mb-4">
              <h3 className="text-slate-900 font-bold text-base mb-3 font-display">이번 주 케어 현황</h3>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center">
                  <div className="text-2xl mb-1">🍚</div>
                  <p className="text-xs text-slate-500">식사</p>
                  <p className="text-sm font-bold text-slate-800">
                    {careRecords.reduce((sum, r) => sum + (r.meals || 0), 0)}회
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">💧</div>
                  <p className="text-xs text-slate-500">물</p>
                  <p className="text-sm font-bold text-slate-800">
                    {careRecords.reduce((sum, r) => sum + (r.water || 0), 0)}회
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🩴</div>
                  <p className="text-xs text-slate-500">산책</p>
                  <p className="text-sm font-bold text-slate-800">
                    {careRecords.reduce((sum, r) => sum + (r.walks || 0), 0)}회
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🍖</div>
                  <p className="text-xs text-slate-500">간식</p>
                  <p className="text-sm font-bold text-slate-800">
                    {careRecords.reduce((sum, r) => sum + (r.treats || 0), 0)}회
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🗑️</div>
                  <p className="text-xs text-slate-500">배변</p>
                  <p className="text-sm font-bold text-slate-800">
                    {careRecords.reduce((sum, r) => sum + (r.grooming || 0), 0)}회
                  </p>
                </div>
              </div>
            </div>

            {/* 일별 케어 기록 */}
            <h3 className="text-slate-900 font-bold text-base mb-3 font-display">일별 기록</h3>
            {careRecords.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-slate-500">케어 기록이 없습니다.</p>
                <p className="text-slate-400 text-sm mt-1">대시보드에서 케어 활동을 기록해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {careRecords.map(record => (
                  <div key={record.id} className="bg-surface-light rounded-lg p-4 shadow-soft">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-slate-500 text-sm font-medium">{formatDateShort(record.date)}</p>
                      {record.weight && (
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                          {record.weight}kg
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      {record.meals > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">🍚</span>
                          <span className="text-slate-700">{record.meals}</span>
                        </span>
                      )}
                      {record.water > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">💧</span>
                          <span className="text-slate-700">{record.water}</span>
                        </span>
                      )}
                      {record.walks > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">🩴</span>
                          <span className="text-slate-700">{record.walks}</span>
                        </span>
                      )}
                      {record.treats > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">🍖</span>
                          <span className="text-slate-700">{record.treats}</span>
                        </span>
                      )}
                      {record.grooming > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">🗑️</span>
                          <span className="text-slate-700">{record.grooming}</span>
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-slate-600 text-sm mt-3 p-2 bg-slate-50 rounded-lg">
                        💬 {record.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
