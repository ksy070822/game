import React, { useEffect, useState } from 'react';
import { SkillType } from '../types';

interface EndingSceneProps {
  characterLevel: number;
  skills: SkillType[];
  onRestart?: () => void;
}

const EndingScene: React.FC<EndingSceneProps> = ({ characterLevel, skills, onRestart }) => {
  const [showContent, setShowContent] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showChain, setShowChain] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 500);
    const timer2 = setTimeout(() => setShowStats(true), 1500);
    const timer3 = setTimeout(() => setShowChain(true), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const skillChain = [
    { name: '아지트봇', icon: '🤖', color: 'blue' },
    { name: '슬랙봇', icon: '💬', color: 'purple' },
    { name: '앱스스크립트', icon: '⚙️', color: 'green' },
    { name: '제미나이', icon: '✨', color: 'yellow' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 150 }).map((_, i) => {
          const size = Math.random() * 4 + 1;
          const duration = Math.random() * 4 + 2;
          const delay = Math.random() * 3;
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
                boxShadow: `0 0 ${size * 4}px rgba(250, 204, 21, 0.8)`
              }}
            />
          );
        })}
      </div>

      {/* Radial Glow Effect */}
      <div className="absolute inset-0 bg-radial-gradient from-yellow-400/20 via-transparent to-transparent"></div>

      <div className="relative z-10 w-full max-w-6xl px-8 text-center">
        {/* Main Title */}
        <div className={`mb-8 transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-400 mb-4 drop-shadow-[0_0_40px_rgba(250,204,21,0.8)] pixel-font animate-pulse text-glow">
            업무 자동화 마스터 달성!
          </h1>
          <div className="h-2 w-64 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto"></div>
        </div>

        {/* Character Display */}
        <div className={`mb-8 transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="relative inline-block">
            {/* Glowing Rings */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 border-4 border-yellow-400 rounded-full animate-ping"
                style={{
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2s',
                  opacity: 0.3 - i * 0.1
                }}
              />
            ))}
            
            {/* Character Image Placeholder - will use actual character image */}
            <div className="relative z-10 w-48 h-48 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(250,204,21,0.6)] border-8 border-white/20">
              <span className="text-6xl">🏆</span>
            </div>

            {/* Sparkle Particles */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 360;
              const radius = 140;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <div
                  key={i}
                  className="absolute text-yellow-400 text-3xl animate-sparkle"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '2s',
                    filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))'
                  }}
                >
                  ✨
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="bg-slate-900/90 border-4 border-yellow-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-2xl font-black text-yellow-400">스킬</div>
              <div className="text-4xl font-black text-white mt-2">MAX</div>
            </div>
            <div className="bg-slate-900/90 border-4 border-yellow-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <div className="text-4xl mb-2">⚔️</div>
              <div className="text-2xl font-black text-yellow-400">스킬</div>
              <div className="text-4xl font-black text-white mt-2">{skills.length}/4</div>
            </div>
            <div className="bg-slate-900/90 border-4 border-yellow-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
              <div className="text-4xl mb-2">🚀</div>
              <div className="text-2xl font-black text-yellow-400">도전</div>
              <div className="text-4xl font-black text-white mt-2">999%</div>
            </div>
          </div>
        )}

        {/* Completed Skill Chain */}
        {showChain && (
          <div className="bg-slate-900/90 border-4 border-yellow-500 rounded-3xl p-8 mb-8 shadow-[0_0_40px_rgba(250,204,21,0.4)] animate-in fade-in slide-in-from-bottom duration-700">
            <h2 className="text-3xl font-black text-yellow-400 mb-6 pixel-font">완성된 스킬 체인</h2>
            <div className="flex items-center justify-center gap-4">
              {skillChain.map((skill, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`w-20 h-20 bg-gradient-to-br from-${skill.color}-500 to-${skill.color}-700 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white/20 mb-2`}>
                      {skill.icon}
                    </div>
                    <span className="text-sm font-bold text-white">{skill.name}</span>
                  </div>
                  {i < skillChain.length - 1 && (
                    <div className="text-3xl text-yellow-400 font-bold animate-pulse">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-6 text-lg text-slate-200">
              <p className="font-bold text-yellow-400">완전 자동화 워크플로우 완성!</p>
              <p className="mt-2">모든 능력치 극대화! 업무 마스터 달성!</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {showChain && (
          <div className="animate-in fade-in duration-700">
            <button
              onClick={onRestart}
              className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-2xl font-black text-xl transition-all shadow-[0_8px_0_#ea580c] active:translate-y-2 active:shadow-none"
            >
              QUEST COMPLETE ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndingScene;
