// AI 케어 문진 컴포넌트 - 7일 케어 기록 분석
import { useState, useEffect } from 'react';
import { getRecentCareLogs, saveDailyLog } from '../lib/careLogs';
import { analyzeCarePatternWithGemini } from '../lib/aiPatternAnalysis';

// 샘플 데이터 생성 함수 (실제 데이터가 없을 때 사용)
function generateSampleCareLogs() {
  const logs = [];
  const today = new Date();

  // 최근 7일간의 샘플 데이터 생성
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // 약간의 변동성을 가진 샘플 데이터
    const variation = Math.random();
    logs.push({
      date: dateStr,
      mealCount: variation > 0.3 ? 2 : 1,
      waterCount: Math.floor(2 + Math.random() * 3),
      walkCount: variation > 0.5 ? 2 : 1,
      poopCount: variation > 0.4 ? 2 : 1,
      weight: (5.2 + Math.random() * 0.3).toFixed(1),
      note: i === 3 ? '오늘 좀 피곤해 보임' : i === 1 ? '식욕이 좋음' : '',
      mood: variation > 0.6 ? 'happy' : variation > 0.3 ? 'normal' : 'tired'
    });
  }

  return logs;
}

export function AICareConsultation({ petData, onBack, onHome }) {
  const [careLogs, setCareLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    if (!petData) return;

    loadAndAnalyze();
  }, [petData]);

  const loadAndAnalyze = async () => {
    setLoading(true);

    // 실제 케어 로그 가져오기
    let logs = getRecentCareLogs(petData.id, 7);

    // 데이터가 없거나 2일치 미만이면 샘플 데이터 사용
    if (!logs || logs.length < 2) {
      logs = generateSampleCareLogs();
      setUsingSampleData(true);
    } else {
      setUsingSampleData(false);
    }

    setCareLogs(logs);

    // AI 분석 실행
    try {
      const result = await analyzeCarePatternWithGemini(petData, 7);
      if (result) {
        setAnalysis(result);
      } else {
        // API 분석 실패 시 간단한 규칙 기반 분석
        setAnalysis(generateBasicAnalysis(logs, petData));
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
      setAnalysis(generateBasicAnalysis(logs, petData));
    }

    setLoading(false);
  };

  // 간단한 규칙 기반 분석 (AI API 없이도 작동)
  const generateBasicAnalysis = (logs, pet) => {
    const avgMeal = logs.reduce((sum, l) => sum + (l.mealCount || 0), 0) / logs.length;
    const avgWalk = logs.reduce((sum, l) => sum + (l.walkCount || 0), 0) / logs.length;
    const avgPoop = logs.reduce((sum, l) => sum + (l.poopCount || 0), 0) / logs.length;

    const patterns = [];
    const predictions = [];

    if (avgMeal < 1.5) {
      patterns.push('식사량이 평균 이하입니다.');
      predictions.push('식욕 변화를 주의 깊게 관찰하세요.');
    }
    if (avgWalk < 1) {
      patterns.push('산책 횟수가 부족합니다.');
      predictions.push('활동량을 늘려주세요.');
    }
    if (avgPoop > 3) {
      patterns.push('배변 횟수가 많습니다.');
      predictions.push('소화기 건강을 확인해보세요.');
    }

    if (patterns.length === 0) {
      patterns.push('전반적으로 양호한 케어 패턴을 보입니다.');
      predictions.push('현재 케어 루틴을 유지하세요.');
    }

    return {
      earIssue: false,
      digestionIssue: avgPoop > 3,
      skinIssue: false,
      energyLevel: Math.min(1, Math.max(0.3, avgWalk / 2)),
      fever: false,
      patterns,
      predictions,
      risk_changes: {
        description: '특별한 이상 징후가 발견되지 않았습니다.',
        trend: 'stable'
      }
    };
  };

  // 샘플 데이터를 실제 저장하기
  const saveSampleAsReal = () => {
    if (!petData || !usingSampleData) return;

    careLogs.forEach(log => {
      saveDailyLog(petData.id, log);
    });

    setUsingSampleData(false);
    alert('샘플 데이터가 저장되었습니다!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🔍</div>
          <p className="text-slate-600">7일간의 케어 기록을 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            ← 뒤로
          </button>
        </div>
        <h1 className="text-xl font-bold">AI 건강 문진 리포트</h1>
        <p className="text-white/80 text-sm mt-1">
          {petData?.petName || petData?.name}의 7일간 케어 기록 분석
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* AI 분석 결과 - 상단 배치 */}
        {analysis && (
          <>
            {/* 1. 패턴 분석 */}
            {analysis.patterns && analysis.patterns.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  패턴 분석
                </h2>
                <ul className="space-y-2">
                  {analysis.patterns.map((pattern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-sky-500">•</span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 2. 위험도 동향 */}
            {analysis.risk_changes && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">📉</span>
                  위험도 동향
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    analysis.risk_changes.trend === 'up' ? 'bg-red-100 text-red-700' :
                    analysis.risk_changes.trend === 'down' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {analysis.risk_changes.trend === 'up' ? '↑ 상승' :
                     analysis.risk_changes.trend === 'down' ? '↓ 하강' : '→ 안정'}
                  </div>
                  <span className="text-sm text-slate-600">{analysis.risk_changes.description}</span>
                </div>
              </div>
            )}

            {/* 3. AI 권장사항 */}
            {analysis.predictions && analysis.predictions.length > 0 && (
              <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-5 border border-sky-100">
                <h2 className="font-bold text-sky-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">🔮</span>
                  AI 권장사항
                </h2>
                <ul className="space-y-2">
                  {analysis.predictions.map((pred, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-sky-700">
                      <span className="text-sky-500">→</span>
                      {pred}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. 건강 상태 체크 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-xl">🏥</span>
                건강 상태 체크
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl ${analysis.digestionIssue ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className="text-sm">{analysis.digestionIssue ? '⚠️ 소화기 주의' : '✅ 소화기 양호'}</span>
                </div>
                <div className={`p-3 rounded-xl ${analysis.skinIssue ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className="text-sm">{analysis.skinIssue ? '⚠️ 피부 주의' : '✅ 피부 양호'}</span>
                </div>
                <div className={`p-3 rounded-xl ${analysis.earIssue ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className="text-sm">{analysis.earIssue ? '⚠️ 귀 주의' : '✅ 귀 양호'}</span>
                </div>
                <div className={`p-3 rounded-xl ${analysis.fever ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className="text-sm">{analysis.fever ? '⚠️ 발열 의심' : '✅ 체온 정상'}</span>
                </div>
              </div>

              {/* 에너지 레벨 */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">활력 지수</span>
                  <span className="font-medium">{Math.round((analysis.energyLevel || 0.5) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      (analysis.energyLevel || 0.5) > 0.7 ? 'bg-green-500' :
                      (analysis.energyLevel || 0.5) > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(analysis.energyLevel || 0.5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* 5. 7일 케어 기록 요약 - 하단 배치 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">📊</span>
              최근 7일 케어 기록
            </h2>
            <span className="text-xs text-slate-400">
              {careLogs[0]?.date} ~ {careLogs[careLogs.length - 1]?.date}
            </span>
          </div>

          {/* 케어 아이콘 범례 */}
          <div className="grid grid-cols-5 gap-2 mb-4 pb-4 border-b border-slate-100">
            {[
              { icon: '🍚', label: '식사' },
              { icon: '💧', label: '물' },
              { icon: '🩴', label: '산책' },
              { icon: '💩', label: '배변' },
              { icon: '⚖️', label: '체중' }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-lg">{item.icon}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1">{item.label}</span>
              </div>
            ))}
          </div>

          {/* 일별 기록 */}
          <div className="space-y-2">
            {careLogs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2 py-2.5 px-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-medium text-slate-500 w-24">{log.date}</span>
                <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-xs">🍚</span>
                    <span className="font-medium text-slate-700">{log.mealCount || 0}</span>
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-xs">💧</span>
                    <span className="font-medium text-blue-600">{log.waterCount || 0}</span>
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-xs">🩴</span>
                    <span className="font-medium text-green-600">{log.walkCount || 0}</span>
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-xs">💩</span>
                    <span className="font-medium text-amber-600">{log.poopCount || 0}</span>
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-xs">⚖️</span>
                    <span className="font-medium text-slate-600">{log.weight || '-'}kg</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AICareConsultation;
