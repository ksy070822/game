import { useState, useEffect } from 'react';

const DIAGNOSIS_KEY = 'petMedical_diagnoses';

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

// 더미 데이터 - 의약품
const DUMMY_MEDICATIONS = [
  {
    id: 'med_1',
    date: '2024-11-15',
    medications: ['아포퀠정 16mg', '피부영양제', '소염연고'],
    pharmacyName: '행복한동물병원',
    daysSupply: '14일분',
    status: 'effective'
  },
  {
    id: 'med_2',
    date: '2024-10-20',
    medications: ['프로바이오틱스', '장영양제', '지사제'],
    pharmacyName: '24시 강남동물의료센터',
    daysSupply: '7일분',
    status: 'effective'
  },
  {
    id: 'med_3',
    date: '2024-08-10',
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

export function RecordsView({ petData, onBack, onViewDiagnosis }) {
  const [activeTab, setActiveTab] = useState('visits'); // visits, medication, checkup, vaccination
  const [diagnoses, setDiagnoses] = useState([]);
  const [useDummyData, setUseDummyData] = useState(true); // 더미데이터 사용 플래그

  useEffect(() => {
    const stored = localStorage.getItem(DIAGNOSIS_KEY);
    if (stored) {
      const allDiagnoses = JSON.parse(stored);
      const petDiagnoses = allDiagnoses.filter(d => d.petId === petData?.id);
      setDiagnoses(petDiagnoses);
    }
  }, [petData]);

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
    { id: 'vaccination', label: '예방접종', icon: 'vaccines' }
  ];

  // 방문이력 데이터 (실제 + 더미)
  const visitRecords = useDummyData
    ? [...diagnoses.filter(d => d.type === 'visit' || !d.type), ...DUMMY_VISITS]
    : diagnoses.filter(d => d.type === 'visit' || !d.type);

  // 의약품 기록 (실제 + 더미)
  const medicationRecords = useDummyData
    ? [
        ...diagnoses.filter(d => d.medications || d.prescription).map(d => ({
          ...d,
          medications: d.medications || d.prescription || []
        })),
        ...DUMMY_MEDICATIONS
      ]
    : diagnoses.filter(d => d.medications || d.prescription).map(d => ({
        ...d,
        medications: d.medications || d.prescription || []
      }));

  // 건강검진 기록
  const checkupRecords = useDummyData ? DUMMY_CHECKUPS : [];

  // 예방접종 기록
  const vaccinationRecords = useDummyData ? DUMMY_VACCINATIONS : [];

  // 의약품 상태 카운트
  const effectiveMeds = medicationRecords.filter(m => m.status === 'effective').length;
  const sideEffectMeds = medicationRecords.filter(m => m.status === 'side_effect').length;

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
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="flex items-center bg-background-light/80 p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex size-12 shrink-0 items-center text-slate-800">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">의료기록</h2>
        <div className="flex size-12 shrink-0 items-center justify-end gap-2">
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-2xl">refresh</span>
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-2 overflow-x-auto bg-background-light">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white'
                : 'bg-surface-light text-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {tab.icon}
            </span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-40">
        {/* 방문이력 */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            {visitRecords.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏥</div>
                <p className="text-slate-500">방문 기록이 없습니다.</p>
              </div>
            ) : (
              visitRecords.map(record => (
                <div
                  key={record.id}
                  onClick={() => onViewDiagnosis && onViewDiagnosis(record)}
                  className="bg-surface-light rounded-lg p-4 shadow-soft cursor-pointer hover:border-primary/50 border border-transparent transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{formatDateShort(record.date || record.created_at)}</p>
                      <h3 className="text-slate-900 font-bold text-base mb-1 font-display">
                        {record.hospitalName || 'AI 진단'}
                      </h3>
                      {record.hospitalAddress && (
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {record.hospitalAddress}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400">medical_services</span>
                      <span className="text-slate-500 text-sm">진료</span>
                    </div>
                  </div>
                  {record.diagnosis && (
                    <p className="text-slate-700 text-sm mt-2">
                      <strong>진단:</strong> {record.diagnosis}
                    </p>
                  )}
                  <div className="flex items-center justify-end mt-3 text-primary text-sm font-medium">
                    <span>상세보기</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 의약품 */}
        {activeTab === 'medication' && (
          <div className="space-y-4">
            {/* 요약 정보 */}
            <div className="bg-surface-light rounded-lg p-4 shadow-soft mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <span className="text-slate-700 text-sm">잘 듣는 약 {effectiveMeds}</span>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                  <span className="text-slate-700 text-sm">부작용 있는 약 {sideEffectMeds}</span>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </div>
            </div>

            {/* 필터 버튼 */}
            <div className="flex gap-2 mb-4">
              <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium">
                전체
              </button>
              <button className="px-4 py-2 bg-surface-light text-slate-600 rounded-lg text-sm font-medium">
                기록 필요
              </button>
            </div>

            {medicationRecords.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">💊</div>
                <p className="text-slate-500">의약품 기록이 없습니다.</p>
              </div>
            ) : (
              medicationRecords.map(record => (
                <div key={record.id} className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">{formatDateShort(record.date || record.created_at)}</p>
                      <p className="text-slate-900 font-bold text-base mb-1">
                        {record.medications?.length > 0
                          ? (record.medications.length > 1
                              ? `${record.medications[0]} 외 ${record.medications.length - 1}개`
                              : record.medications[0])
                          : '처방전'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {record.pharmacyName || 'AI 진단'} • {record.daysSupply || '3일분'}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">arrow_forward_ios</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      약이 잘 들었어요
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      부작용이 있었어요
                    </button>
                  </div>
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
                      <h4 className="text-slate-900 font-bold text-sm mb-1">종합백신</h4>
                      <p className="text-slate-500 text-xs">1년에 1번 접종이 권장됩니다.</p>
                    </div>
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                      최저가 예약
                    </button>
                  </div>
                </div>
                <div className="bg-surface-light rounded-lg p-4 shadow-soft">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm mb-1">심장사상충 예방약</h4>
                      <p className="text-slate-500 text-xs">1개월에 1번 접종이 권장됩니다.</p>
                    </div>
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                      최저가 예약
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
      </div>
    </div>
  );
}
