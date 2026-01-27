import React, { useEffect, useState } from 'react';

interface BossBattleProps {
  bossName: string;
  bossHp: number;
  maxHp: number;
  problems: Array<{ name: string; hp: number; icon: string }>;
  onVictory: () => void;
  onBack?: () => void;
}

const BossBattle: React.FC<BossBattleProps> = ({ bossName, bossHp, maxHp, problems, onVictory, onBack }) => {
  const [showVictory, setShowVictory] = useState(false);
  const [hp, setHp] = useState(maxHp);

  useEffect(() => {
    // Animate HP decrease
    const interval = setInterval(() => {
      setHp(prev => {
        if (prev <= bossHp) {
          clearInterval(interval);
          setTimeout(() => setShowVictory(true), 500);
          return bossHp;
        }
        return Math.max(prev - 50, bossHp);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [bossHp, maxHp]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => {
          const size = Math.random() * 4 + 2;
          const duration = Math.random() * 2 + 1;
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
                boxShadow: `0 0 ${size * 3}px rgba(250, 204, 21, 0.6)`
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 w-full max-w-5xl px-8">
        {/* Boss Title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg pixel-font text-glow animate-pulse-glow">BOSS: {bossName}</h1>
          <div className="h-1 w-48 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto animate-glow"></div>
        </div>

        {/* Boss HP Bar */}
        <div className="bg-slate-900/90 border-4 border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-400 font-bold text-lg">HP</span>
            <span className="text-white font-bold text-lg">{hp}/{maxHp}</span>
          </div>
          <div className="h-8 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 flex items-center justify-end pr-2"
              style={{ width: `${(hp / maxHp) * 100}%` }}
            >
              {hp <= 0 && <span className="text-xs font-bold text-white">DEFEATED</span>}
            </div>
          </div>
        </div>

        {/* Problem Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="bg-slate-900/80 border-2 border-slate-700 rounded-xl p-4 hover:border-yellow-500 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{problem.icon}</span>
                <span className="text-yellow-400 font-bold text-sm">{problem.hp} HP</span>
              </div>
              <h3 className="text-white font-bold text-sm">{problem.name}</h3>
            </div>
          ))}
        </div>

        {/* Victory Message */}
        {showVictory && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
            <div className="text-center">
              <h2 className="text-7xl font-black text-green-400 mb-6 drop-shadow-[0_0_40px_rgba(34,197,94,0.8)] pixel-font animate-bounce text-glow glow-green">
                BOSS DEFEATED!
              </h2>
              <div className="bg-red-900/90 border-4 border-red-500 rounded-2xl p-6 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <p className="text-2xl font-bold text-white">{bossName}을(를) 물리쳤습니다!</p>
                <p className="text-lg text-slate-200 mt-2">문제점을 파악했습니다! 이제 해결 전략을 배워봅시다.</p>
              </div>
              <div className="flex justify-center gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                  >
                    ◀ BACK
                  </button>
                )}
                <button
                  onClick={onVictory}
                  className="px-8 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-black transition-all shadow-[0_4px_0_#16a34a] active:translate-y-1 active:shadow-none text-lg"
                >
                  CONTINUE ▶
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BossBattle;
