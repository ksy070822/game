
import React, { useState, useEffect, useCallback } from 'react';
import { slides } from './data/slides';
import { CharacterState, SkillType } from './types';
import LegoCharacter from './components/LegoCharacter';
import SkillAcquisition from './components/SkillAcquisition';
import BossBattle from './components/BossBattle';
import EndingScene from './components/EndingScene';
import AcquisitionMark, { AcquisitionMarksDisplay } from './components/AcquisitionMark';
import { GoogleGenAI } from "@google/genai";

// Typing component for AI Quest Master
const TypingMessage: React.FC<{ text: string; speed?: number }> = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [index, text, speed]);

  return <span>{displayedText}</span>;
};

const App: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [characterState, setCharacterState] = useState<CharacterState>({
    level: 1,
    skills: []
  });
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [aiTip, setAiTip] = useState<string>("새로운 퀘스트를 시작할 준비가 되셨나요?");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showBossBattle, setShowBossBattle] = useState(false);
  const [showSkillAcquisition, setShowSkillAcquisition] = useState(false);
  const [showEndingScene, setShowEndingScene] = useState(false);
  const [showAcquisitionMark, setShowAcquisitionMark] = useState(false);
  const [acquiredItemName, setAcquiredItemName] = useState<string>('');

  const currentSlide = slides[currentSlideIndex];

  // Handle Boss Battle Display
  useEffect(() => {
    if (currentSlide.isBossBattle && currentSlide.bossData) {
      setShowBossBattle(true);
    } else {
      setShowBossBattle(false);
    }
  }, [currentSlideIndex]);

  // Handle Skill Acquisition Display
  useEffect(() => {
    if (currentSlide.isSkillAcquisition && currentSlide.levelUp) {
      // Show skill acquisition screen after a short delay
      const timer = setTimeout(() => {
        setShowSkillAcquisition(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowSkillAcquisition(false);
    }
  }, [currentSlideIndex]);

  // Handle Ending Scene Display
  useEffect(() => {
    if (currentSlide.isEnding) {
      const timer = setTimeout(() => {
        setShowEndingScene(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowEndingScene(false);
    }
  }, [currentSlideIndex]);

  // Handle Level Up Logic
  useEffect(() => {
    if (currentSlide.levelUp && !characterState.skills.includes(currentSlide.levelUp)) {
      setIsLevelingUp(true);
      const skillName = currentSlide.levelUp;
      setCharacterState(prev => ({
        level: prev.level + 1,
        skills: [...prev.skills, skillName]
      }));
      
      // Show acquisition mark
      setAcquiredItemName(skillName);
      setShowAcquisitionMark(true);
      
      setTimeout(() => setIsLevelingUp(false), 2500);
    }
  }, [currentSlideIndex]);

  // Fetch AI Skill Tip
  const fetchAiTip = useCallback(async () => {
    if (currentSlideIndex === 0 || currentSlide.isEnding) return;

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `당신은 업무 자동화 퀘스트의 마스터입니다. 현재 캐릭터 레벨은 ${characterState.level}입니다. 현재 슬라이드 "${currentSlide.title}"에 맞춰 카카오모빌리티 CX 담당자들에게 줄 위트 있는 조언을 1문장으로 하세요. 말투는 정중하면서도 게임 NPC 같은 느낌을 유지하세요.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiTip(response.text || "데이터 동기화 에너지가 충만합니다!");
    } catch (error) {
      // Fallback messages for when API is unavailable (e.g. GitHub Pages env vars issue)
      const fallbackTips: Record<number, string> = {
        1: "파편화된 도구들은 마치 인벤토리 정리가 안 된 상태와 같습니다. 통합이 시급합니다!",
        2: "자동화 장화(Boots)를 장착하셨군요! 이제 걷지 말고 날아다닐 시간입니다.",
        3: "API 허브는 마치 마을의 포털과 같습니다. 어디로든 순식간에 이동할 수 있죠.",
        4: "리포트 봇은 당신의 든든한 파트너입니다. 당신이 잠든 사이에도 데이터를 지킵니다.",
        5: "AI 스킬을 개방하셨군요! 이제 단순 반복 몬스터들은 한 방에 정리될 것입니다."
      };
      setAiTip(fallbackTips[currentSlideIndex] || "시스템이 최적화 경로를 계산 중입니다...");
    } finally {
      setIsAiLoading(false);
    }
  }, [currentSlideIndex, characterState.level]);

  useEffect(() => {
    if (!currentSlide.isEnding) {
      fetchAiTip();
    } else {
      setAiTip("축하합니다! 모든 시련을 극복하고 진정한 데이터 마스터로 각성하셨군요!");
    }
  }, [currentSlideIndex]);

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const handleBossVictory = () => {
    setShowBossBattle(false);
    handleNext();
  };

  const handleSkillAcquisitionContinue = () => {
    setShowSkillAcquisition(false);
    handleNext();
  };

  const handleEndingRestart = () => {
    setShowEndingScene(false);
    setCurrentSlideIndex(0);
    setCharacterState({ level: 1, skills: [] });
  };

  const handleAcquisitionMarkComplete = () => {
    setShowAcquisitionMark(false);
  };

  const progress = ((currentSlideIndex + 1) / slides.length) * 100;

  // Don't render main UI if showing special screens
  if (showBossBattle && currentSlide.bossData) {
    return (
      <BossBattle
        bossName={currentSlide.bossData.name}
        bossHp={currentSlide.bossData.hp}
        maxHp={currentSlide.bossData.maxHp}
        problems={currentSlide.bossData.problems}
        onVictory={handleBossVictory}
        onBack={handlePrev}
      />
    );
  }

  if (showSkillAcquisition && currentSlide.levelUp) {
    const skillNumber = characterState.skills.length + 1;
    return (
      <SkillAcquisition
        skill={currentSlide.levelUp}
        skillNumber={skillNumber}
        onContinue={handleSkillAcquisitionContinue}
        onBack={handlePrev}
      />
    );
  }

  if (showEndingScene) {
    return (
      <EndingScene
        characterLevel={characterState.level}
        skills={characterState.skills}
        onRestart={handleEndingRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 overflow-hidden font-['Noto_Sans_KR']">
      {/* Acquisition Mark */}
      {showAcquisitionMark && (
        <AcquisitionMark
          itemName={acquiredItemName}
          onComplete={handleAcquisitionMarkComplete}
        />
      )}
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="grid grid-cols-12 h-full gap-2">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="border border-slate-700 aspect-square"></div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-6xl aspect-[16/9] bg-[#0f172a] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] border-[6px] border-[#334155] flex flex-col overflow-hidden">

        {/* 통합형 상단 UI Bar */}
        <div className="h-20 bg-[#1e293b] flex items-center justify-between px-10 border-b-4 border-[#334155]">
          <div className="flex items-center gap-10">
            {/* 레벨 표시 - 더 크고 굵게 */}
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-yellow-500 font-black tracking-tighter mb-1 pixel-font">STATUS</span>
              <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                LV.{characterState.level}
              </span>
            </div>

            {/* 현재 모험 단계 */}
            <div className="flex flex-col items-start leading-none border-l-2 border-slate-700 pl-8">
              <span className="text-[10px] text-indigo-400 font-black mb-1 pixel-font">ADVENTURE</span>
              <span className="text-xl font-bold text-white tracking-tight">
                {currentSlide.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* 진행도 게이지 */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] text-slate-400 font-bold pixel-font">QUEST PROGRESS {currentSlideIndex + 1}/{slides.length}</span>
              <div className="h-4 w-48 bg-slate-900 rounded-full overflow-hidden border-2 border-slate-700">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-300 transition-all duration-1000 glow-yellow" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            {/* 다음 스테이지 버튼 (상단 배치) */}
            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              className={`px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl font-black transition-all shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none text-sm ${currentSlideIndex === slides.length - 1 ? 'opacity-20' : ''}`}
            >
              다음 스테이지 →
            </button>
          </div>
        </div>

        {/* 메인 게임 & 발표 영역 */}
        <div className="flex-1 relative flex flex-col px-12 pb-8 pt-6 min-h-0">

          {/* 캐릭터 우측 상단 배치 */}
          <div className="absolute top-4 right-8 z-20 pointer-events-none scale-75 origin-top-right">
            <LegoCharacter
              skills={characterState.skills}
              isLevelingUp={isLevelingUp}
              isEnding={currentSlide.isEnding}
            />
          </div>

          {/* 메인 슬라이드 본문 (스크롤 가능 영역 - 기본적으로 스크롤 없이 나오도록 크기 축소) */}
          <div className={`flex-1 overflow-y-auto pr-4 relative z-10 transition-all duration-700 ${isLevelingUp ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
            <div className="max-w-3xl">
              <div className="mb-4">
                <h1 className="text-4xl font-black text-white leading-tight drop-shadow-lg">
                  {currentSlide.title}
                </h1>
                {currentSlide.subtitle && (
                  <p className="text-yellow-500/80 mt-1 font-bold tracking-[0.3em] text-xs uppercase">{currentSlide.subtitle}</p>
                )}
              </div>
              <div className="text-slate-200 text-lg leading-relaxed bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                {currentSlide.content}
              </div>
            </div>
          </div>

          {/* JRPG 스타일 하단 대화창 (고정 높이) */}
          <div className="mt-2 relative z-20 shrink-0">
            <div className="bg-slate-900/95 backdrop-blur-md border-[3px] border-indigo-500/50 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.15)] p-5 min-h-[120px] flex flex-col relative overflow-hidden ring-1 ring-white/10">
              {/* Decorative Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-500/70 rounded-tl-sm"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-500/70 rounded-tr-sm"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-500/70 rounded-bl-sm"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-500/70 rounded-br-sm"></div>

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-700/50">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_#eab308]"></div>
                <span className="text-[10px] font-bold text-yellow-500/90 pixel-font tracking-[0.2em] uppercase">System Message</span>
              </div>

              <div className="text-base font-medium text-slate-200 leading-relaxed font-['Noto_Sans_KR']">
                {isAiLoading ? (
                  <div className="flex gap-2 items-center h-full pt-1">
                    <span className="text-xs text-indigo-400">Analysis...</span>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                ) : (
                  <TypingMessage text={aiTip} speed={30} />
                )}
              </div>

              {/* Cursor Animation */}
              <div className="absolute bottom-3 right-5 text-yellow-500 animate-bounce text-xs opacity-80">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Level Up 전면 배너 (이펙트) */}
        {isLevelingUp && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="w-full h-full bg-indigo-950/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="text-7xl font-black text-yellow-400 mb-8 drop-shadow-[0_0_40px_rgba(250,204,21,0.8)] pixel-font">LEVEL UP!</div>
              <div className="text-3xl font-black text-white tracking-widest bg-white/10 px-16 py-8 rounded-[3rem] border-4 border-yellow-400/50 shadow-2xl">
                {currentSlide.levelUp} 획득!
              </div>
            </div>
          </div>
        )}

        {/* 하단 네비게이션 보조 */}
        <div className="h-10 bg-[#0f172a] flex items-center justify-between px-10 text-[10px] text-slate-500 font-bold border-t border-slate-800">
          <button onClick={handlePrev} className={`hover:text-white transition-colors ${currentSlideIndex === 0 ? 'invisible' : ''}`}>PREV STAGE</button>
          <div className="flex gap-2">
            <AcquisitionMarksDisplay acquiredItems={characterState.skills} />
          </div>
          <span className="pixel-font">KAKAO MOBILITY CX SYNERGY</span>
        </div>
      </div>
    </div>
  );
};

export default App;
