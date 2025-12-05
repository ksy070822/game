import { useState } from 'react';

// 캐릭터 스타일 옵션 - 3가지 표정
const CHARACTER_STYLES = [
  { id: 'happy', label: 'Happy', emoji: '😊', description: '밝고 행복한 표정' },
  { id: 'funny', label: 'Funny', emoji: '😜', description: '재미있고 익살스러운 표정' },
  { id: 'lovely', label: 'Lovely', emoji: '🥰', description: '사랑스럽고 귀여운 표정' }
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
            <h2 className="text-xl font-bold text-gray-900">{petName}의 어떤 모습을 프로필로 설정할까요?</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
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

