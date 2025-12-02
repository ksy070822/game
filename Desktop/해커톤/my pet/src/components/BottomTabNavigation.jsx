// src/components/BottomTabNavigation.jsx

export function BottomTabNavigation({ currentTab, onTabChange, onModeSwitch, showModeSwitch }) {
  const tabs = [
    { id: 'care', label: '홈', icon: 'home' },
    { id: 'diagnosis', label: 'AI진단', icon: 'medical_services' },
    { id: 'hospital', label: '병원예약', icon: 'local_hospital' },
    { id: 'records', label: '기록', icon: 'receipt_long' },
    { id: 'mypage', label: '마이', icon: 'person' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
      <div className="flex items-center h-16 px-0.5 max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentTab === tab.id
                ? 'text-sky-500'
                : 'text-slate-400'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={`material-symbols-outlined text-[18px] mb-0.5 ${
              currentTab === tab.id ? 'font-bold' : ''
            }`}>
              {tab.icon}
            </span>
            <span className={`text-[9px] font-medium ${
              currentTab === tab.id ? 'text-sky-500' : 'text-slate-400'
            }`}>
              {tab.label}
            </span>
          </button>
        ))}

        {/* 병원 모드 전환 버튼 - 항상 표시 */}
        {showModeSwitch && onModeSwitch && (
          <button
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-emerald-500 hover:text-emerald-600"
            onClick={onModeSwitch}
            title="병원 관리자 모드로 전환"
          >
            <span className="material-symbols-outlined text-[18px] mb-0.5">
              swap_horiz
            </span>
            <span className="text-[9px] font-medium text-emerald-500">
              병원모드
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
