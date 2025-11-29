// src/components/DailyCareLog.jsx
import { useEffect, useState } from "react";
import "./DailyCareLog.css";
import { loadDailyLog, saveDailyLog, getTodayKey } from "../lib/careLogs";

export function DailyCareLog({ pet }) {
  const [log, setLog] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pet) return;
    const today = getTodayKey();
    const loaded = loadDailyLog(pet.id, today);
    setLog(loaded);
  }, [pet]);

  if (!pet || !log) return null;

  const updateField = (field, value) => {
    const updated = { ...log, [field]: value };
    setLog(updated);
  };

  const handleCompleteCare = () => {
    saveDailyLog(pet.id, log);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 아이콘 클릭시 카운트 증가
  const handleIconClick = (field) => {
    updateField(field, (log[field] || 0) + 1);
  };

  const careItems = [
    { field: 'mealCount', icon: '🍚', label: '밥' },
    { field: 'waterCount', icon: '💧', label: '물' },
    { field: 'walkCount', icon: '🚶', label: '산책' },
    { field: 'poopCount', icon: '💩', label: '배변' },
  ];

  return (
    <div className="carelog-card">
      <div className="carelog-header">
        <h3>오늘 케어 기록</h3>
        <span className="carelog-date">{log.date}</span>
      </div>

      {/* 케어 아이콘 그리드 - 클릭하면 카운트 증가 */}
      <div className="carelog-icon-grid">
        {careItems.map(item => (
          <button
            key={item.field}
            className="carelog-icon-btn"
            onClick={() => handleIconClick(item.field)}
          >
            <span className="carelog-icon">{item.icon}</span>
            <span className="carelog-count">{log[item.field] || 0}회</span>
            <span className="carelog-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 체중 입력 */}
      <div className="carelog-input-section">
        <label className="carelog-input-label">
          <span className="carelog-input-icon">⚖️</span>
          체중 (kg)
        </label>
        <input
          type="number"
          value={log.weight || ""}
          onChange={(e) => updateField("weight", e.target.value)}
          className="carelog-input"
          step="0.1"
          placeholder="예: 5.2"
        />
      </div>

      {/* 특이사항 입력 */}
      <div className="carelog-input-section">
        <label className="carelog-input-label">
          <span className="carelog-input-icon">📝</span>
          특이사항
        </label>
        <textarea
          value={log.note || ""}
          onChange={(e) => updateField("note", e.target.value)}
          className="carelog-textarea"
          placeholder="오늘 아이 상태나 특이사항을 적어주세요."
          rows={3}
        />
      </div>

      {/* 케어 완료 버튼 */}
      <button
        onClick={handleCompleteCare}
        className={`carelog-complete-btn ${saved ? 'saved' : ''}`}
      >
        {saved ? '✓ 저장되었습니다!' : '오늘 케어 완료'}
      </button>
    </div>
  );
}
