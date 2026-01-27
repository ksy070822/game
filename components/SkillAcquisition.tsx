import React, { useEffect, useState } from 'react';
import { SkillType } from '../types';

interface SkillAcquisitionProps {
  skill: SkillType;
  skillNumber: number;
  onContinue: () => void;
  onBack?: () => void;
}

const SkillAcquisition: React.FC<SkillAcquisitionProps> = ({ skill, skillNumber, onContinue, onBack }) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShowAnimation(true);
    const timer = setTimeout(() => setShowDetails(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const skillInfo: Record<SkillType, { name: string; nameEn: string; effects: string[]; stats: { label: string; value: number }[]; description: string; rarity: string; stars: number }> = {
    [SkillType.AUTOMATION]: {
      name: '아지트봇',
      nameEn: 'Agit Bot',
      effects: [
        '24시간 실시간 메시지 감지',
        '이벤트 기반 자료 트리거',
        '비상형 버스트 자동 수립'
      ],
      stats: [
        { label: '자동화력', value: 250 },
        { label: '효율성', value: 180 },
        { label: '정확도', value: 200 }
      ],
      description: '아지트는 채널에서 특정 키워드를 감지하여 자동으로 워크플로우를 시작합니다. 더 이상 수동으로 메시지를 확인하고 복사할 필요가 없습니다!',
      rarity: 'LEGENDARY',
      stars: 5
    },
    [SkillType.API]: {
      name: '슬랙봇',
      nameEn: 'Slack Bot',
      effects: [
        '실시간 커뮤니케이션 향상',
        '작업 자동 전송',
        '워크플로우 상태 업데이트'
      ],
      stats: [
        { label: '소통력', value: 300 },
        { label: '반응속도', value: 250 },
        { label: '협법력', value: 220 }
      ],
      description: 'Slackbot은 사용자와 실시간으로 소통하며 작업 상태를 자동으로 업데이트합니다. 모든 팀원이 최신 정보를 즉시 확인할 수 있습니다!',
      rarity: 'LEGENDARY',
      stars: 5
    },
    [SkillType.BOT]: {
      name: '앱스스크립트',
      nameEn: 'Apps Script',
      effects: [
        'Google Workspace 자동화',
        '데이터 실시간 식별 및 연결',
        '커스텀 워크플로우 구축'
      ],
      stats: [
        { label: '프로그래밍', value: 400 },
        { label: '통합력', value: 350 },
        { label: '확장성', value: 300 }
      ],
      description: 'Google Sheets, Docs, Gmail을 활용하여 데이터를 실시간으로 수집, 변환, 저장합니다. 복잡한 비즈니스 로직도 구현 가능!',
      rarity: 'LEGENDARY',
      stars: 5
    },
    [SkillType.AI]: {
      name: '제미나이',
      nameEn: 'Gemini AI',
      effects: [
        'AI 기반 자료 자동 작성',
        '지능형 데이터 분석',
        '자동화 처리 및 요약'
      ],
      stats: [
        { label: '지능', value: 500 },
        { label: '창의력', value: 450 },
        { label: '생산성', value: 480 }
      ],
      description: 'Gemini AI가 수집된 데이터를 분석하고 보고서 초안을 자동으로 작성합니다. 사람은 최종 검토만 하면 됩니다!',
      rarity: 'MYTHIC',
      stars: 6
    }
  };

  const info = skillInfo[skill];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => {
          const size = Math.random() * 3 + 1;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 2;
          return (
            <div
              key={i}
              className="particle absolute rounded-full bg-yellow-400"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                boxShadow: `0 0 ${size * 2}px rgba(250, 204, 21, 0.8)`
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 w-full max-w-4xl px-8">
        {/* Skill Acquired Title */}
        <div className={`text-center mb-8 transition-all duration-1000 ${showAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <h1 className="text-6xl font-black text-yellow-400 mb-4 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] pixel-font tracking-wider text-glow animate-pulse-glow">
            {skillNumber === 4 ? 'ULTIMATE SKILL ACQUIRED!' : `SKILL #${skillNumber} ACQUIRED!`}
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto animate-glow"></div>
        </div>

        {/* Skill Card */}
        <div className={`bg-slate-900/95 border-4 border-orange-500 rounded-3xl p-8 mb-6 shadow-[0_0_50px_rgba(249,115,22,0.5)] transition-all duration-1000 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex flex-col items-center">
            {/* Skill Icon Placeholder */}
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 glow-yellow border-4 border-white/20 animate-float">
              <span className="text-4xl font-black text-white drop-shadow-lg">{info.nameEn.charAt(0)}</span>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2">{info.name} ({info.nameEn})</h2>
            
            {/* Rarity Stars */}
            <div className="flex gap-1 mb-2">
              {Array.from({ length: info.stars }).map((_, i) => (
                <span key={i} className="text-2xl text-yellow-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>★</span>
              ))}
            </div>
            <span className="text-lg font-bold text-orange-400">{info.rarity}</span>
          </div>
        </div>

        {/* Skill Details */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 mb-6 animate-in fade-in slide-in-from-bottom duration-700">
            {/* Skill Effects */}
            <div className="bg-slate-900/80 border-2 border-green-500 rounded-2xl p-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <span>⚡</span> 스킬 효과
              </h3>
              <ul className="space-y-2">
                {info.effects.map((effect, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stat Increase */}
            <div className="bg-slate-900/80 border-2 border-green-500 rounded-2xl p-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <span>📊</span> 스탯 증가
              </h3>
              <ul className="space-y-2">
                {info.stats.map((stat, i) => (
                  <li key={i} className="text-sm text-slate-200 flex items-center justify-between">
                    <span>{stat.label}</span>
                    <span className="text-green-400 font-bold">+{stat.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Usage Method */}
            <div className="bg-slate-900/80 border-2 border-green-500 rounded-2xl p-6 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <span>🔧</span> 활용 방법
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">{info.description}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-lg"
            >
              ◀ BACK
            </button>
          )}
          <button
            onClick={onContinue}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-black transition-all shadow-[0_4px_0_#ea580c] active:translate-y-1 active:shadow-none text-lg"
          >
            EQUIP & CONTINUE ▶
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillAcquisition;
