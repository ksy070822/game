// 진료서 작성 컴포넌트
import { useState } from 'react';
import { clinicResultService, bookingService } from '../services/firestore';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

export function TreatmentSheet({ booking, clinic, onClose, onSaved }) {
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [triageScore, setTriageScore] = useState(booking?.aiDiagnosis?.triageScore || 0);
  const [mainDiagnosis, setMainDiagnosis] = useState(booking?.aiDiagnosis?.diagnosis || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!booking) return null;

  const handleSave = async () => {
    if (!window.confirm('진료 결과를 저장하시겠습니까?')) return;

    setIsSaving(true);

    try {
      const resultData = {
        clinicId: clinic.id ?? null,
        clinicName: clinic.name ?? null,
        bookingId: booking.id ?? null,
        userId: booking.userId ?? null,  // 🔥 undefined 방지
        petId: booking.petId ?? null,  // 🔥 undefined 방지
        petName: booking.pet?.name || booking.petName || null,  // 🔥 undefined 방지
        visitDate: booking.date ?? null,  // 🔥 undefined 방지
        visitTime: booking.time ?? null,  // 🔥 undefined 방지
        triageScore: triageScore ?? 0,
        mainDiagnosis: mainDiagnosis ?? null,
        soap: {
          subjective: subjective ?? '',
          objective: objective ?? '',
          assessment: assessment ?? '',
          plan: plan ?? ''
        },
        // 사전 문진/AI 정보도 필요하면 같이 저장
        previsit: booking.aiDiagnosis ?? null
      };

      // 1) clinicResults 에 저장
      const saveRes = await clinicResultService.saveResult(resultData);
      if (!saveRes.success) throw saveRes.error;

      // 2) 예약 상태를 완료로 변경
      await bookingService.updateBookingStatus(booking.id, 'completed');

      // 3) clinicPatients에 누적/갱신
      const patientDocId = `${clinic.id}_${booking.petId}`;
      await setDoc(
        doc(db, 'clinicPatients', patientDocId),
        {
          clinicId: clinic.id,
          clinicName: clinic.name,
          petId: booking.petId,
          petName: booking.pet?.name || booking.petName || null,
          species: booking.pet?.species ?? null,  // 🔥 undefined 방지
          speciesLabelKo: booking.pet?.speciesLabelKo ?? null,  // 🔥 undefined 방지
          ownerUserId: booking.userId ?? null,  // 🔥 undefined 방지
          ownerName: booking.owner?.name ?? null,  // 🔥 undefined 방지
          ownerPhone: booking.owner?.phone ?? null,  // 🔥 undefined 방지
          lastVisitDate: booking.date ?? null,  // 🔥 undefined 방지
          lastDiagnosis: mainDiagnosis ?? null,  // 🔥 undefined 방지
          lastTriageLevel: triageScore >= 4 ? 'high' : triageScore >= 2 ? 'medium' : 'low',
          lastWeightKg: booking.pet?.weight ?? null,
          visitCount: increment(1),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        },
        { merge: true }
      );

      alert('진료 결과가 저장되었습니다.');
      onSaved && onSaved();
      onClose && onClose();
    } catch (error) {
      console.error('진료 결과 저장 실패:', error);
      alert('진료 결과 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
        {/* 기본 정보 */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">
            {clinic.name} · {booking.date} {booking.time}
          </div>
          <div className="text-lg font-bold">
            {booking.pet?.name || booking.petName} / 보호자 {booking.owner?.name}
          </div>
        </div>

        {/* 간단한 폼 */}
        <div className="space-y-3 text-sm">
          <div>
            <label className="font-semibold block mb-1">주 진단명</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={mainDiagnosis}
              onChange={e => setMainDiagnosis(e.target.value)}
              placeholder="예: 위장염"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Triage 점수 (0~5)</label>
            <input
              type="number"
              min={0}
              max={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={triageScore}
              onChange={e => setTriageScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Subjective (보호자 설명)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={subjective}
              onChange={e => setSubjective(e.target.value)}
              placeholder="보호자가 설명한 증상"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Objective (진찰 소견)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="체온, 맥박, 촉진 결과 등"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Assessment (평가)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={assessment}
              onChange={e => setAssessment(e.target.value)}
              placeholder="진단 및 평가"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Plan (치료/투약 계획)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={plan}
              onChange={e => setPlan(e.target.value)}
              placeholder="처방, 치료 계획"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
            disabled={isSaving}
          >
            닫기
          </button>
          <button
            className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '진료서 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
