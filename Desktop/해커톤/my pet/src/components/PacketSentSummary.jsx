import { useState, useEffect } from 'react';

// 동물 종류 한글 매핑
const SPECIES_LABELS = {
  dog: '강아지',
  cat: '고양이',
  rabbit: '토끼',
  hamster: '햄스터',
  bird: '조류',
  hedgehog: '고슴도치',
  reptile: '파충류',
  etc: '기타',
  other: '기타'
};

export function PacketSentSummary({ petData, hospital, bookingTime, bookingDate, onBack, onGetDirections, onHome }) {
  const [registrationCode, setRegistrationCode] = useState('');
  const [reservationTime, setReservationTime] = useState('');

  useEffect(() => {
    // 접수 코드 생성 (4자리 숫자)
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRegistrationCode(code);

    // 예약 접수 시간 포맷팅
    if (bookingTime && bookingTime.includes(':')) {
      const parts = bookingTime.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);

      if (!isNaN(hour) && !isNaN(minute)) {
        const ampm = hour >= 12 ? '오후' : '오전';
        let displayHours = hour % 12;
        if (displayHours === 0) displayHours = 12;
        setReservationTime(`${ampm} ${displayHours}시 ${minute.toString().padStart(2, '0')}분`);
      } else {
        setReservationTime(bookingTime);
      }
    } else if (bookingTime) {
      setReservationTime(bookingTime);
    } else {
      setReservationTime('시간 미지정');
    }
  }, [bookingTime]);

  // 반려동물 정보 포맷팅 (대분류/품종[이름])
  const formatPetInfo = () => {
    if (!petData) return '반려동물 정보 없음';

    const speciesLabel = SPECIES_LABELS[petData.species] || '기타';
    const breed = petData.breed || '품종 미등록';
    const name = petData.petName || petData.name || '이름 없음';

    return `${speciesLabel}/${breed}[${name}]`;
  };

  if (!petData || !hospital) {
    return null;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex size-12 shrink-0 items-center text-slate-800">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">전송 완료</h2>
        <div className="flex size-12 shrink-0 items-center justify-end"></div>
      </div>

      <div className="px-4 pt-6 pb-40">
        {/* Success Icon */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-accent text-6xl">pets</span>
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-2 font-display">병원으로 패킷 전송 완료!</h1>
          <p className="text-slate-600 text-base text-center max-w-sm">
            병원에서 미리 확인하고, 더욱 꼼꼼하게 진료를 준비할 수 있어요.
          </p>
        </div>

        {/* 병원 정보 카드 */}
        <div className="mb-4 rounded-lg bg-surface-light p-4 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary">
              <span className="material-symbols-outlined text-3xl">local_hospital</span>
            </div>
            <div className="flex-1">
              <h3 className="text-slate-900 font-bold text-base mb-1 font-display">{hospital.name}</h3>
              <p className="text-slate-600 text-sm">{hospital.roadAddress || hospital.address}</p>
              {hospital.phone && (
                <p className="text-slate-500 text-sm mt-1">{hospital.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* 예약 정보 및 반려동물 정보 */}
        <div className="mb-6 rounded-lg bg-surface-light p-4 shadow-soft">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-12 text-primary">
              <span className="material-symbols-outlined text-3xl">schedule</span>
            </div>
            <div className="flex-1">
              <h3 className="text-slate-900 font-bold text-base mb-2 font-display">예약 정보</h3>
              <p className="text-slate-600 text-sm">예약 접수시간: {reservationTime}</p>
              <p className="text-slate-600 text-sm mt-1">
                반려동물: {formatPetInfo()}
              </p>
            </div>
          </div>
        </div>

        {/* 접수 코드 */}
        <div className="mb-6 rounded-lg bg-primary/10 p-6">
          <div className="flex flex-col items-center">
            {/* QR Code Placeholder */}
            <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4 shadow-md">
              <div className="text-center">
                <div className="text-6xl mb-2">📱</div>
                <p className="text-xs text-slate-500">QR Code</p>
              </div>
            </div>
            <p className="text-slate-700 text-sm text-center mb-4">
              병원 도착 후 접수 시 코드를 보여주세요.
            </p>
            <div className="bg-white rounded-lg px-6 py-4 shadow-md">
              <p className="text-slate-900 text-3xl font-bold tracking-wider font-mono">
                {registrationCode.match(/.{1,4}/g)?.join(' ') || registrationCode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 border-t border-slate-200 space-y-2">
        <button
          onClick={onGetDirections}
          className="w-full bg-primary text-white font-bold py-4 px-6 rounded-lg text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">directions</span>
          <span>길찾기</span>
        </button>
        <a
          href="https://service.kakaomobility.com/launch/kakaot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#1E1B4B] text-white font-bold py-4 px-6 rounded-lg text-base hover:bg-[#2d2a5a] transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-[#FACC15] font-black text-xl">T</span>
          <span>Kakao T 펫택시 이용하기</span>
        </a>
        <button
          onClick={onHome || onBack}
          className="w-full text-slate-600 font-medium py-3 px-6 rounded-lg text-sm hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

