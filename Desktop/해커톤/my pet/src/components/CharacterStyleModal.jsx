import { useState } from 'react';

// 캐릭터 스타일 옵션
const CHARACTER_STYLES = [
  { id: 'cute', label: '귀여운 스타일', emoji: '😊', description: '부드럽고 따뜻한 느낌' },
  { id: 'cartoon', label: '만화 스타일', emoji: '🎨', description: '밝고 활기찬 만화풍' },
  { id: 'realistic', label: '사실적 스타일', emoji: '📷', description: '자연스럽고 현실적인 느낌' },
  { id: 'watercolor', label: '수채화 스타일', emoji: '🖌️', description: '부드러운 수채화 느낌' },
  { id: 'anime', label: '애니메이션 스타일', emoji: '✨', description: '일본 애니메이션 풍' },
  { id: 'sketch', label: '스케치 스타일', emoji: '✏️', description: '연필 스케치 느낌' }
];

export function CharacterStyleModal({ onClose, onStyleSelect, originalImageUrl, petName }) {
  const [selectedStyle, setSelectedStyle] = useState(null);

  const handleSelect = (style) => {
    setSelectedStyle(style);
    onStyleSelect(style);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">캐릭터 스타일 선택</h2>
            <p className="text-gray-600 mt-1">{petName}의 캐릭터 스타일을 선택해주세요</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {originalImageUrl && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">원본 이미지</p>
            <img 
              src={originalImageUrl} 
              alt="원본" 
              className="w-32 h-32 object-cover rounded-lg mx-auto"
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CHARACTER_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => handleSelect(style.id)}
              className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                selectedStyle === style.id
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-gray-200 hover:border-sky-300'
              }`}
            >
              <div className="text-4xl mb-2">{style.emoji}</div>
              <div className="font-semibold text-gray-900 mb-1">{style.label}</div>
              <div className="text-xs text-gray-500">{style.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

