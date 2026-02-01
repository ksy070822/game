
import React, { useMemo } from 'react';
import { SkillType } from '../types';

interface LegoCharacterProps {
  skills: SkillType[];
  isLevelingUp?: boolean;
  isEnding?: boolean;
}

const LegoCharacter: React.FC<LegoCharacterProps> = ({ skills, isLevelingUp, isEnding }) => {
  const levelIndex = skills.length;
  // Support level 0-5 (6 images total)
  const safeIndex = Math.min(levelIndex, 5);
  const imagePath = `${import.meta.env.BASE_URL}characters/level${safeIndex}.png`;

  return (
    <div className={`relative transition-all duration-700 transform ${isLevelingUp ? 'scale-110 -translate-y-4 brightness-125' : 'scale-100'} ${isEnding ? 'scale-125' : ''}`}>
      {/* Level Up Aura Effect */}
      {isLevelingUp && (
        <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse z-0" />
      )}

      {/* Character Image */}
      <img
        src={imagePath}
        alt={`Character Level ${safeIndex}`}
        className="relative z-10 w-auto h-64 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
      />

      {/* Skill Indicators (Optional floating icons could act as particles primarily) */}
      {isLevelingUp && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-xl animate-bounce whitespace-nowrap drop-shadow-md z-20">
          LEVEL UP!
        </div>
      )}
    </div>
  );
};

export default LegoCharacter;
