import React, { useEffect, useState } from 'react';

interface AcquisitionMarkProps {
  itemName: string;
  onComplete?: () => void;
}

const AcquisitionMark: React.FC<AcquisitionMarkProps> = ({ itemName, onComplete }) => {
  const [show, setShow] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    setShow(true);
    setTimeout(() => setScale(1), 100);
    const timer = setTimeout(() => {
      setScale(0);
      setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 300);
    }, 2000);
    return () => clearTimeout(timer);
  }, [itemName, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-8 z-50 pointer-events-none">
      <div
        className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 shadow-[0_0_30px_rgba(250,204,21,0.8)] border-4 border-white/30 transform transition-all duration-300"
        style={{
          transform: `scale(${scale})`,
          opacity: scale
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-bounce">✨</div>
          <div>
            <div className="text-sm font-bold text-white">획득!</div>
            <div className="text-lg font-black text-white">{itemName}</div>
          </div>
        </div>
        
        {/* Sparkle Effects */}
        <div className="absolute -top-2 -right-2 text-yellow-300 text-xl animate-spin">⭐</div>
        <div className="absolute -bottom-2 -left-2 text-orange-300 text-xl animate-pulse">💫</div>
      </div>
    </div>
  );
};

interface AcquisitionMarksDisplayProps {
  acquiredItems: string[];
}

export const AcquisitionMarksDisplay: React.FC<AcquisitionMarksDisplayProps> = ({ acquiredItems }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {acquiredItems.map((item, index) => (
        <div
          key={index}
          className="bg-yellow-500/20 border-2 border-yellow-500 rounded-lg px-3 py-1 flex items-center gap-2 animate-in fade-in slide-in-from-right duration-500"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <span className="text-yellow-400 text-sm">✓</span>
          <span className="text-yellow-400 text-xs font-bold">{item}</span>
        </div>
      ))}
    </div>
  );
};

export default AcquisitionMark;
