import { useState } from 'react';

const STYLE_LABELS = {
  cute: '귀여운 스타일',
  cartoon: '만화 스타일',
  realistic: '사실적 스타일',
  watercolor: '수채화 스타일',
  anime: '애니메이션 스타일',
  sketch: '스케치 스타일'
};

export function CharacterResultModal({ onClose, characterUrl, style, onSave, onSetAsProfile, saving }) {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">캐릭터 생성 완료</h2>
            {style && (
              <p className="text-gray-600 mt-1 text-sm">{STYLE_LABELS[style] || style} 스타일</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* 생성된 캐릭터 이미지 */}
        <div className="mb-6 bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
          {imageLoading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm">이미지 로딩 중...</p>
            </div>
          )}
          {characterUrl && (
            <img
              src={characterUrl}
              alt="생성된 캐릭터"
              className={`max-w-full max-h-[400px] object-contain rounded-lg ${
                imageLoading ? 'hidden' : 'block'
              }`}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (onSave) onSave();
            }}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
          <button
            onClick={() => {
              if (onSetAsProfile) onSetAsProfile();
            }}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">photo_camera</span>
            프로필로 설정
          </button>
        </div>
      </div>
    </div>
  );
}

