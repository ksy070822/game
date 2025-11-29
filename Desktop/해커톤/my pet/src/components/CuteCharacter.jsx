import React, { useState, useEffect } from "react";
import "./CuteCharacter.css";

/**
 * 귀여운 CSS 기반 동물 캐릭터 컴포넌트
 * - 순수 CSS로 강아지/고양이 캐릭터 렌더링
 * - 인터랙티브 애니메이션 (눈 깜빡임, 꼬리 흔들기, 귀 움직임)
 * - 건강 상태별 표정 변화
 */
export function CuteCharacter({
  pet,
  healthFlags = {},
  size = "md",
  interactive = true,
  showEffects = true
}) {
  const { name, species, breed } = pet || {};
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [hearts, setHearts] = useState([]);

  // 자동 눈 깜빡임
  useEffect(() => {
    if (!interactive) return;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [interactive]);

  // 터치 시 하트 이펙트
  const handleTouch = () => {
    if (!interactive) return;

    setIsTouched(true);
    setTimeout(() => setIsTouched(false), 600);

    // 하트 파티클 추가
    if (showEffects) {
      const newHeart = {
        id: Date.now(),
        x: Math.random() * 60 - 30,
        delay: Math.random() * 0.3
      };
      setHearts(prev => [...prev, newHeart]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 1500);
    }
  };

  // 건강 상태 계산
  const healthStatus = (() => {
    const hasIssue = healthFlags.earIssue || healthFlags.digestionIssue ||
                     healthFlags.skinIssue || healthFlags.fever;
    const energyLevel = healthFlags.energyLevel || 1;

    if (hasIssue || energyLevel < 0.4) return 'sick';
    if (energyLevel >= 0.4 && energyLevel < 0.7) return 'recovering';
    return 'healthy';
  })();

  // 표정 결정
  const getExpression = () => {
    if (isTouched) return 'happy';
    if (healthStatus === 'sick') return 'sad';
    if (healthStatus === 'recovering') return 'neutral';
    return 'happy';
  };

  const expression = getExpression();
  const sizeClass = size === "lg" ? "character-lg" : size === "sm" ? "character-sm" : "character-md";
  const isDog = species === "dog";
  const isCat = species === "cat";

  // 품종별 색상
  const getCharacterColor = () => {
    if (!breed) return isDog ? '#f5d0a9' : '#e0e0e0';
    const lower = breed.toLowerCase();
    if (lower.includes('말티즈') || lower.includes('화이트')) return '#fefefe';
    if (lower.includes('푸들')) return '#d4a574';
    if (lower.includes('시바')) return '#e8a857';
    if (lower.includes('러시안')) return '#9ca3af';
    if (lower.includes('코리안')) return '#f5d0a9';
    if (lower.includes('브라운')) return '#8b5a2b';
    return isDog ? '#f5d0a9' : '#d1d5db';
  };

  const characterColor = getCharacterColor();

  return (
    <div
      className={`cute-character-wrapper ${sizeClass}`}
      onClick={handleTouch}
    >
      {/* 배경 글로우 효과 */}
      <div className={`character-glow character-glow-${healthStatus}`}></div>

      {/* 플로팅 파티클 */}
      {showEffects && healthStatus === 'healthy' && (
        <div className="floating-particles">
          <span className="particle">✨</span>
          <span className="particle">⭐</span>
          <span className="particle">✨</span>
        </div>
      )}

      {/* 하트 이펙트 */}
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="heart-particle"
          style={{
            '--x-offset': `${heart.x}px`,
            animationDelay: `${heart.delay}s`
          }}
        >
          💕
        </div>
      ))}

      {/* 캐릭터 본체 */}
      <div className={`cute-character ${isDog ? 'dog' : isCat ? 'cat' : 'other'} ${healthStatus} ${isTouched ? 'touched' : ''}`}>

        {/* ===== 강아지 캐릭터 ===== */}
        {isDog && (
          <>
            {/* 귀 */}
            <div className="dog-ear dog-ear-left" style={{ backgroundColor: characterColor }}>
              <div className="ear-inner"></div>
            </div>
            <div className="dog-ear dog-ear-right" style={{ backgroundColor: characterColor }}>
              <div className="ear-inner"></div>
            </div>

            {/* 얼굴 */}
            <div className="dog-face" style={{ backgroundColor: characterColor }}>
              {/* 이마 무늬 */}
              <div className="face-highlight"></div>

              {/* 눈 */}
              <div className="eyes">
                <div className={`eye eye-left ${isBlinking ? 'blink' : ''} ${expression}`}>
                  <div className="eye-white">
                    <div className="pupil">
                      <div className="eye-shine"></div>
                    </div>
                  </div>
                  {expression === 'sad' && <div className="tear"></div>}
                </div>
                <div className={`eye eye-right ${isBlinking ? 'blink' : ''} ${expression}`}>
                  <div className="eye-white">
                    <div className="pupil">
                      <div className="eye-shine"></div>
                    </div>
                  </div>
                  {expression === 'sad' && <div className="tear"></div>}
                </div>
              </div>

              {/* 볼터치 */}
              <div className="cheeks">
                <div className="cheek cheek-left"></div>
                <div className="cheek cheek-right"></div>
              </div>

              {/* 코 */}
              <div className="dog-nose">
                <div className="nose-shine"></div>
              </div>

              {/* 입 */}
              <div className={`dog-mouth ${expression}`}>
                {expression === 'happy' && <div className="tongue"></div>}
              </div>

              {/* 수염 */}
              <div className="whiskers whiskers-left">
                <div className="whisker"></div>
                <div className="whisker"></div>
              </div>
              <div className="whiskers whiskers-right">
                <div className="whisker"></div>
                <div className="whisker"></div>
              </div>
            </div>

            {/* 몸통 */}
            <div className="dog-body" style={{ backgroundColor: characterColor }}>
              <div className="body-belly"></div>
              {/* 다리 */}
              <div className="dog-legs">
                <div className="leg leg-left" style={{ backgroundColor: characterColor }}>
                  <div className="paw"></div>
                </div>
                <div className="leg leg-right" style={{ backgroundColor: characterColor }}>
                  <div className="paw"></div>
                </div>
              </div>
            </div>

            {/* 꼬리 */}
            <div className="dog-tail" style={{ backgroundColor: characterColor }}>
              <div className="tail-tip"></div>
            </div>

            {/* 건강 상태 표시 */}
            {healthFlags.earIssue && <div className="health-indicator ear-indicator">❗</div>}
            {healthFlags.fever && <div className="health-indicator fever-indicator">🌡️</div>}
          </>
        )}

        {/* ===== 고양이 캐릭터 ===== */}
        {isCat && (
          <>
            {/* 귀 */}
            <div className="cat-ear cat-ear-left" style={{ backgroundColor: characterColor }}>
              <div className="ear-inner-cat"></div>
            </div>
            <div className="cat-ear cat-ear-right" style={{ backgroundColor: characterColor }}>
              <div className="ear-inner-cat"></div>
            </div>

            {/* 얼굴 */}
            <div className="cat-face" style={{ backgroundColor: characterColor }}>
              <div className="face-highlight"></div>

              {/* 눈 */}
              <div className="eyes cat-eyes">
                <div className={`eye eye-left cat-eye ${isBlinking ? 'blink' : ''} ${expression}`}>
                  <div className="eye-white">
                    <div className="pupil cat-pupil">
                      <div className="eye-shine"></div>
                    </div>
                  </div>
                </div>
                <div className={`eye eye-right cat-eye ${isBlinking ? 'blink' : ''} ${expression}`}>
                  <div className="eye-white">
                    <div className="pupil cat-pupil">
                      <div className="eye-shine"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 볼터치 */}
              <div className="cheeks">
                <div className="cheek cheek-left"></div>
                <div className="cheek cheek-right"></div>
              </div>

              {/* 코 */}
              <div className="cat-nose">
                <div className="nose-shine"></div>
              </div>

              {/* 입 */}
              <div className={`cat-mouth ${expression}`}></div>

              {/* 수염 */}
              <div className="whiskers whiskers-left cat-whiskers">
                <div className="whisker"></div>
                <div className="whisker"></div>
                <div className="whisker"></div>
              </div>
              <div className="whiskers whiskers-right cat-whiskers">
                <div className="whisker"></div>
                <div className="whisker"></div>
                <div className="whisker"></div>
              </div>
            </div>

            {/* 몸통 */}
            <div className="cat-body" style={{ backgroundColor: characterColor }}>
              <div className="body-belly cat-belly"></div>
              <div className="cat-legs">
                <div className="leg cat-leg leg-left" style={{ backgroundColor: characterColor }}>
                  <div className="paw cat-paw"></div>
                </div>
                <div className="leg cat-leg leg-right" style={{ backgroundColor: characterColor }}>
                  <div className="paw cat-paw"></div>
                </div>
              </div>
            </div>

            {/* 꼬리 */}
            <div className="cat-tail" style={{ backgroundColor: characterColor }}></div>

            {/* 건강 상태 표시 */}
            {healthFlags.earIssue && <div className="health-indicator ear-indicator">❗</div>}
            {healthFlags.fever && <div className="health-indicator fever-indicator">🌡️</div>}
          </>
        )}

        {/* ===== 기타 동물 ===== */}
        {!isDog && !isCat && (
          <div className="other-animal">
            <div className="other-emoji">🐾</div>
          </div>
        )}
      </div>

      {/* 이름 표시 */}
      {name && (
        <div className="character-name-tag">
          <span className="name-text">{name}</span>
          {healthStatus === 'healthy' && <span className="status-icon">💚</span>}
          {healthStatus === 'recovering' && <span className="status-icon">💛</span>}
          {healthStatus === 'sick' && <span className="status-icon">🩹</span>}
        </div>
      )}
    </div>
  );
}

export default CuteCharacter;
