import { useState, useEffect } from 'react';

const DIAGNOSIS_KEY = 'petMedical_diagnoses';

export function RecordsView({ petData, onBack, onViewDiagnosis }) {
  const [activeTab, setActiveTab] = useState('visits'); // visits, medication, checkup, vaccination
  const [diagnoses, setDiagnoses] = useState([]);

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

  // 방문이력 필터링
  const visitRecords = diagnoses.filter(d => d.type === 'visit' || !d.type);

  // 의약품 기록 (진단에서 추출)
  const medicationRecords = diagnoses
    .filter(d => d.medications || d.prescription)
    .map(d => ({
      ...d,
      medications: d.medications || d.prescription || []
    }));

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
                  <span className="text-slate-700 text-sm">잘 듣는 약 0</span>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                  <span className="text-slate-700 text-sm">부작용 있는 약 0</span>
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
                          ? `${record.medications[0]} 외 ${record.medications.length - 1}개`
                          : '처방전'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {record.pharmacyName || 'AI 진단'} • {record.daysSupply || '3일분'}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">arrow_forward_ios</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      약이 잘 들었어요
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
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
              <p className="text-slate-700 text-sm">건강검진은 최근 10년 동안의 결과를 제공해요.</p>
              <span className="material-symbols-outlined text-slate-400 text-sm">arrow_forward_ios</span>
            </div>

            <div className="text-center py-20">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-slate-500">건강검진 기록이 없습니다.</p>
            </div>
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
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">
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
                    <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">
                      최저가 예약
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 이전 접종 내역 */}
            <div>
              <h3 className="text-slate-900 font-bold text-base mb-3 font-display">이전 접종 내역</h3>
              <div className="text-center py-20">
                <div className="text-6xl mb-4">💉</div>
                <p className="text-slate-500">예방접종 기록이 없습니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

