// 진료서 작성 컴포넌트
import { useState, useEffect } from 'react';
import { clinicResultService, bookingService } from '../services/firestore';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

export function TreatmentSheet({ booking, clinic, onClose, onSaved, onShared }) {
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [triageScore, setTriageScore] = useState(booking?.aiDiagnosis?.triageScore || 0);
  const [mainDiagnosis, setMainDiagnosis] = useState(booking?.aiDiagnosis?.diagnosis || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastResultId, setLastResultId] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  // 기존 진단서가 있는지 확인하여 isSaved/lastResultId 초기화 및 폼 데이터 로드
  useEffect(() => {
    const initExistingResult = async () => {
      if (!booking?.id) return;

      try {
        const bookingId = booking.bookingId || booking.id;
        const res = await clinicResultService.getResultByBooking(bookingId);
        if (res.success && res.data) {
          const existingResult = res.data;
          setIsSaved(true);
          setLastResultId(existingResult.id);
          
          // ✅ 기존 진단서 데이터를 폼에 채워넣기
          if (existingResult.mainDiagnosis) {
            setMainDiagnosis(existingResult.mainDiagnosis);
          }
          if (existingResult.triageScore !== undefined && existingResult.triageScore !== null) {
            setTriageScore(existingResult.triageScore);
          }
          if (existingResult.soap) {
            setSubjective(existingResult.soap.subjective || '');
            setObjective(existingResult.soap.objective || '');
            setAssessment(existingResult.soap.assessment || '');
            setPlan(existingResult.soap.plan || '');
          }
          
          console.log('[TreatmentSheet] 기존 진단서 발견 및 로드:', existingResult.id);
        }
      } catch (error) {
        console.error('[TreatmentSheet] 기존 진단서 조회 오류:', error);
      }
    };

    initExistingResult();
  }, [booking?.id, booking?.bookingId]);

  if (!booking) return null;

  const handleSave = async () => {
    if (!window.confirm('진료 결과를 저장하시겠습니까?')) return;

    // 필수 필드 방어 로직
    if (!clinic?.id) {
      alert('병원 정보(clinicId)가 없어 진료 결과를 저장할 수 없습니다. 관리자에게 문의해 주세요.');
      return;
    }
    if (!booking?.id || !booking?.userId || !booking?.petId) {
      alert('예약 정보가 불완전하여 진료 결과를 저장할 수 없습니다.');
      return;
    }

    setIsSaving(true);

    try {
      const resultData = {
        clinicId: clinic.id ?? null,
        clinicName: clinic.name ?? null,
        bookingId: booking.id ?? null,
        // 보호자/예약 식별자
        userId: booking.userId ?? null,              // 🔥 undefined 방지
        ownerId: booking.ownerId ?? booking.userId ?? null, // rules 에서 사용될 ownerId
        // 펫 정보
        petId: booking.petId ?? null,  // 🔥 undefined 방지
        petName: booking.pet?.name || booking.petName || null,  // 🔥 undefined 방지
        // 방문 정보
        visitDate: booking.date ?? null,  // 🔥 undefined 방지
        visitTime: booking.time ?? null,  // 🔥 undefined 방지
        // 진료 내용
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

      setIsSaved(true);
      setLastResultId(saveRes.id);

      // ✅ 저장 시에는 status를 그대로 유지 (confirmed 상태 유지)
      // completed는 "보호자에게 공유하기" 시점에 변경됨

      // 3) clinicPatients에 누적/갱신 (실패해도 진료 결과는 저장됨)
      try {
        const patientDocId = `${clinic.id}_${booking.petId}`;
        const patientData = {
          clinicId: clinic.id,
          clinicName: clinic.name,
          petId: booking.petId,
          petName: booking.pet?.name || booking.petName || null,
          species: booking.pet?.species ?? null,
          speciesLabelKo: booking.pet?.speciesLabelKo ?? null,
          ownerUserId: booking.userId ?? null,
          ownerName: booking.owner?.name ?? null,
          ownerPhone: booking.owner?.phone ?? null,
          lastVisitDate: booking.date ?? null,
          lastDiagnosis: mainDiagnosis ?? null,
          lastTriageLevel: triageScore >= 4 ? 'high' : triageScore >= 2 ? 'medium' : 'low',
          lastWeightKg: booking.pet?.weight ?? null,
          visitCount: increment(1),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        };

        console.log('💾 [clinicPatients] 저장 시도:', {
          docId: patientDocId,
          clinicId: patientData.clinicId,
          petId: patientData.petId,
          ownerUserId: patientData.ownerUserId
        });

        await setDoc(
          doc(db, 'clinicPatients', patientDocId),
          patientData,
          { merge: true }
        );

        console.log('✅ [clinicPatients] 저장 성공');
      } catch (patientError) {
        console.warn('⚠️ [clinicPatients] 저장 실패 (진료 결과는 저장됨):', patientError);
      }

      alert('진료 결과가 저장되었습니다.');
      onSaved && onSaved();
    } catch (error) {
      console.error('진료 결과 저장 실패:', error);
      alert('진료 결과 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToGuardian = async () => {
    if (!lastResultId) {
      alert('먼저 진단서를 저장해 주세요.');
      return;
    }

    setIsSharing(true);
    try {
      const shareRes = await clinicResultService.shareResult(lastResultId);
      if (!shareRes.success) {
        console.error('진단서 공유 실패:', shareRes.error);
        alert('공유에 실패했어요. 나중에 다시 시도해 주세요.');
        return;
      }

      // ✅ 공유 완료 후에만 completed로 변경
      if (booking?.id) {
        await bookingService.updateBookingStatus(booking.id, 'completed');
      }

      alert('보호자에게 진단서가 전송되었습니다.');
      onShared && onShared();  // 공유 완료 콜백 호출
    } catch (error) {
      console.error('진단서 공유 오류:', error);
      alert('공유에 실패했어요. 나중에 다시 시도해 주세요.');
    } finally {
      setIsSharing(false);
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
          {!isSaved ? (
            <button
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '진단서 저장'}
            </button>
          ) : (
            <button
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
              onClick={handleShareToGuardian}
              disabled={isSaving || isSharing}
            >
              {isSharing ? '공유 중...' : '보호자에게 공유하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
