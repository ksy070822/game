import { useState, useEffect, useRef } from 'react';
import { generateHospitalPacket } from '../services/ai/hospitalPacket';
import { getCurrentPosition, searchAnimalHospitals, initKakaoMap, addMarker, loadKakao } from '../services/kakaoMap';
import { getApiKey, API_KEY_TYPES } from '../services/apiKeyManager';
import { getNearbyHospitalsFromFirestore, searchHospitalsByRegion, searchHospitals } from '../lib/firestoreHospitals';
import { bookingService } from '../services/firestore';

// 나이 계산 함수
const calculateAge = (birthDate) => {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  return `${age}세`;
};

export function HospitalBooking({ petData, diagnosis, symptomData, onBack, onSelectHospital, onHome, currentUser }) {
  const [hospitalPacket, setHospitalPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [isRealLocation, setIsRealLocation] = useState(false); // 실제 위치 사용 여부
  const [locationError, setLocationError] = useState(null); // 위치 오류 메시지
  const [reviewSummaries, setReviewSummaries] = useState({}); // 병원별 후기 요약
  const [loadingReviews, setLoadingReviews] = useState({}); // 후기 로딩 상태
  const [dataSource, setDataSource] = useState('firestore'); // 'firestore' | 'kakao'
  const [searchMode, setSearchMode] = useState('nearby'); // 'nearby' | 'region'
  const [isSearching, setIsSearching] = useState(false); // 검색 중 상태
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  // 예약 모달 관련 state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingHospital, setBookingHospital] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // 1. 병원 패킷 생성 및 현재 위치 가져오기
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 패킷 생성 (diagnosis가 있을 때만)
        if (diagnosis && petData && !hospitalPacket) {
          try {
            const packet = await generateHospitalPacket(petData, diagnosis, symptomData);
            if (isMounted) {
              setHospitalPacket(packet);
            }
          } catch (err) {
            console.error('패킷 생성 오류:', err);
          }
        }
        if (isMounted) setLoading(false);

        // 위치 및 병원 검색 (Firestore 우선 사용)
        try {
          const position = await getCurrentPosition();
          if (isMounted) {
            setUserLocation(position);
            setIsRealLocation(position.isReal);
            if (position.error) {
              setLocationError(position.error);
            }
          }

          // Firestore에서 병원 검색 (우선)
          try {
            console.log('[HospitalBooking] Firestore에서 병원 검색 시작');
            const firestoreHospitals = await getNearbyHospitalsFromFirestore(
              position.lat,
              position.lng,
              5 // 반경 5km
            );

            if (isMounted && firestoreHospitals.length > 0) {
              console.log('[HospitalBooking] Firestore 병원 데이터:', firestoreHospitals.length, '개');
              setHospitals(firestoreHospitals);
              setDataSource('firestore');
              setMapLoading(false);
              return; // Firestore 성공 시 여기서 종료
            }
          } catch (firestoreErr) {
            console.warn('[HospitalBooking] Firestore 검색 실패, Kakao로 fallback:', firestoreErr);
          }

          // Firestore 실패 시 Kakao Map API로 fallback
          const hospitalList = await searchAnimalHospitals(position.lat, position.lng);
          if (isMounted) {
            setHospitals(hospitalList);
            setDataSource('kakao');
            setMapLoading(false);
          }
        } catch (err) {
          console.error('위치/병원 검색 오류:', err);
          // 기본 위치(강남역)로 Firestore 검색 시도
          if (isMounted) {
            const defaultLat = 37.4979;
            const defaultLng = 127.0276;
            setUserLocation({ lat: defaultLat, lng: defaultLng });

            try {
              const firestoreHospitals = await getNearbyHospitalsFromFirestore(defaultLat, defaultLng, 5);
              if (firestoreHospitals.length > 0) {
                setHospitals(firestoreHospitals);
                setDataSource('firestore');
                setMapLoading(false);
                return;
              }
            } catch (e) {
              console.warn('[HospitalBooking] Firestore fallback 실패:', e);
            }

            // 최종 fallback: 하드코딩 데이터
            const fallbackHospitals = [
              {
                id: 'h1',
                name: '24시 SNC 동물메디컬센터',
                address: '서울특별시 강남구 역삼동 823-33',
                roadAddress: '서울특별시 강남구 테헤란로 152',
                phone: '02-555-7582',
                distance: 850,
                lat: 37.5012,
                lng: 127.0396,
                category: '동물병원',
                is24Hours: true,
                rating: '4.7',
                reviewCount: 248,
                businessHours: '24시간 운영',
              },
              {
                id: 'h2',
                name: '센트럴동물의료센터',
                address: '서울특별시 서초구 서초동 1303-22',
                roadAddress: '서울특별시 서초구 서초대로 254',
                phone: '02-525-6645',
                distance: 1200,
                lat: 37.4916,
                lng: 127.0076,
                category: '동물병원',
                is24Hours: true,
                rating: '4.8',
                reviewCount: 312,
                businessHours: '24시간 운영',
              }
            ];
            setHospitals(fallbackHospitals);
            setMapLoading(false);
          }
        }
      } catch (error) {
        console.error('초기화 오류:', error);
        if (isMounted) {
          setLoading(false);
          setMapLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [petData, diagnosis, symptomData]);

  // 2. 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!userLocation || !mapContainerRef.current || hospitals.length === 0) return;

    const initMap = async () => {
      try {
        const containerId = 'kakao-map-container';
        let mapDiv = document.getElementById(containerId);
        
        // 이미 지도가 있으면 재사용하지 않고 새로 생성 (간단한 처리를 위해)
        if (mapContainerRef.current.innerHTML === '') {
           mapDiv = document.createElement('div');
           mapDiv.id = containerId;
           mapDiv.style.width = '100%';
           mapDiv.style.height = '300px';
           mapDiv.style.borderRadius = '12px';
           mapContainerRef.current.appendChild(mapDiv);
        } else {
           return; // 이미 지도가 있으면 패스
        }

        const map = await initKakaoMap(containerId, userLocation.lat, userLocation.lng);
        mapRef.current = map;

        // 현재 위치 마커 (파란색 원)
        const kakao = await loadKakao();
        const myPos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
        
        const myCircle = new kakao.maps.Circle({
          center: myPos,
          radius: 50,
          strokeWeight: 2,
          strokeColor: '#4C6FFF',
          strokeOpacity: 0.7,
          fillColor: '#4C6FFF',
          fillOpacity: 0.2, 
        });
        myCircle.setMap(map);

        // 병원 마커 추가
        for (const hospital of hospitals) {
          await addMarker(
            map,
            hospital.lat,
            hospital.lng,
            hospital.name,
            hospital.is24Hours
          );
        }

        // 지도 중심 재조정 (첫번째 병원 기준)
        if (hospitals.length > 0) {
          const firstHospital = hospitals[0];
          const moveLatLon = new kakao.maps.LatLng(firstHospital.lat, firstHospital.lng);
          map.panTo(moveLatLon);
        }
      } catch (error) {
        console.error('지도 렌더링 오류:', error);
      }
    };

    initMap();
  }, [userLocation, hospitals]);

  const handleBookAppointment = (hospital) => {
    // 예약 모달 열기
    setBookingHospital(hospital);
    setShowBookingModal(true);
    // 기본 날짜를 오늘로 설정
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
    setBookingTime('');

    // AI 진단 요약이 있으면 자동으로 메시지에 포함
    if (diagnosis) {
      const symptomText = diagnosis.symptom || symptomData?.symptomText || '';
      const diagnosisName = diagnosis.diagnosis || '';
      const triageLevel = diagnosis.triage_level || '';
      const hospitalVisitTime = diagnosis.hospitalVisitTime || '';

      let defaultMessage = '';
      if (symptomText) {
        defaultMessage += `[증상] ${symptomText}\n`;
      }
      if (diagnosisName) {
        defaultMessage += `[AI 진단] ${diagnosisName}\n`;
      }
      if (triageLevel) {
        const levelText = triageLevel === 'red' ? '응급' :
                         triageLevel === 'orange' ? '주의 필요' :
                         triageLevel === 'yellow' ? '경미' : '정상';
        defaultMessage += `[응급도] ${levelText}\n`;
      }
      if (hospitalVisitTime) {
        defaultMessage += `[권장 방문] ${hospitalVisitTime}\n`;
      }
      defaultMessage += '\n※ AI 진단서가 함께 전송됩니다.';
      setBookingMessage(defaultMessage.trim());
    } else {
      setBookingMessage('');
    }
  };

  // AI 진단서 첨부 여부 (디폴트: 해제)
  const [attachDiagnosis, setAttachDiagnosis] = useState(false);

  const handleConfirmBooking = async () => {
    if (!bookingDate || !bookingTime) {
      alert('날짜와 시간을 선택해주세요.');
      return;
    }

    // 반려동물 상세 정보
    const petProfile = {
      id: petData?.id,
      name: petData?.petName || petData?.name,
      species: petData?.species,
      breed: petData?.breed,
      birthDate: petData?.birthDate,
      age: petData?.birthDate ? calculateAge(petData.birthDate) : petData?.age,
      sex: petData?.sex,
      neutered: petData?.neutered,
      weight: petData?.weight,
      allergies: petData?.allergies || [],
      chronicConditions: petData?.chronicConditions || []
    };

    // AI 진단 상세 정보 (첨부 시)
    const aiDiagnosisData = (attachDiagnosis && diagnosis) ? {
      id: diagnosis.id,
      createdAt: diagnosis.created_at || diagnosis.createdAt,
      symptom: diagnosis.symptom || symptomData?.symptomText,
      symptomTimeline: diagnosis.symptomTimeline,
      // AI 진단 결과
      diagnosis: diagnosis.diagnosis,
      possibleDiseases: diagnosis.possible_diseases || [],
      probability: diagnosis.probability,
      // 응급도
      triageScore: diagnosis.triage_score,
      triageLevel: diagnosis.triage_level,
      riskLevel: diagnosis.riskLevel || diagnosis.emergency,
      hospitalVisitTime: diagnosis.hospitalVisitTime,
      // 권장 조치
      actions: diagnosis.actions || [],
      ownerSheet: diagnosis.ownerSheet,
      // 케어 가이드
      careGuide: diagnosis.careGuide,
      carePlan: diagnosis.carePlan,
      // 건강 플래그
      healthFlags: diagnosis.healthFlags
    } : null;

    // 예약 정보 저장
    const bookingData = {
      id: 'booking_' + Date.now(),
      petId: petData?.id,
      petName: petData?.petName,
      petProfile: petProfile, // 상세 펫 정보 추가
      hospital: {
        id: bookingHospital.id,
        name: bookingHospital.name,
        address: bookingHospital.roadAddress || bookingHospital.address,
        phone: bookingHospital.phone
      },
      date: bookingDate,
      time: bookingTime,
      message: bookingMessage,
      status: 'pending', // pending, confirmed, cancelled
      createdAt: new Date().toISOString(),
      diagnosisId: (attachDiagnosis && diagnosis) ? diagnosis.id : null,
      aiDiagnosis: aiDiagnosisData // AI 진단 상세 데이터 포함
    };

    // localStorage에 저장
    try {
      const existingBookings = JSON.parse(localStorage.getItem('petMedical_bookings') || '[]');
      existingBookings.push(bookingData);
      localStorage.setItem('petMedical_bookings', JSON.stringify(existingBookings));
    } catch (error) {
      console.error('예약 localStorage 저장 실패:', error);
    }

    // Firestore에도 저장
    try {
      const firestoreBookingData = {
        ...bookingData,
        userId: currentUser?.uid || petData?.userId || null,
        clinicId: bookingHospital.id,
        clinicName: bookingHospital.name
      };
      const result = await bookingService.createBooking(firestoreBookingData);
      if (result.success) {
        console.log('예약 Firestore 저장 완료:', result.id);
      }
    } catch (firestoreError) {
      console.warn('예약 Firestore 저장 실패 (로컬 저장은 완료):', firestoreError);
    }

    setSelectedHospital(bookingHospital);
    if (onSelectHospital) {
      onSelectHospital({
        ...bookingHospital,
        bookingDate,
        bookingTime,
        bookingMessage
      });
    }

    // 성공 화면 표시
    setBookingSuccess(true);
  };

  // 예약 가능한 시간 슬롯 생성 (오늘인 경우 현재 시간 이후만)
  const getTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const isToday = bookingDate === new Date().toISOString().split('T')[0];

    for (let hour = 9; hour <= 18; hour++) {
      // 오늘이면 현재 시간 이후만 표시
      if (isToday) {
        // 정시 슬롯: 현재 시간보다 1시간 이상 후만 표시
        if (hour > currentHour) {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        // 30분 슬롯: 현재 시간+30분 이후만 표시
        if (hour < 18) {
          if (hour > currentHour || (hour === currentHour && currentMinutes < 30)) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
          }
        }
      } else {
        // 오늘이 아니면 모든 시간 표시
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 18) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    return slots;
  };

  const handleRefreshLocation = async () => {
    setMapLoading(true);
    setLocationError(null);
    try {
      const position = await getCurrentPosition();
      setUserLocation(position);
      setIsRealLocation(position.isReal);
      if (position.error) {
        setLocationError(position.error);
      }
      const hospitalList = await searchAnimalHospitals(position.lat, position.lng);
      setHospitals(hospitalList);
    } catch (error) {
      console.error('위치 갱신 오류:', error);
    } finally {
      setMapLoading(false);
    }
  };

  const formatDistance = (meters) => {
    if (!meters && meters !== 0) return ''; // null/undefined 처리
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // AI로 후기 요약 생성
  const generateReviewSummary = async (hospital) => {
    if (reviewSummaries[hospital.id] || loadingReviews[hospital.id]) {
      return; // 이미 생성되었거나 생성 중이면 스킵
    }

    setLoadingReviews(prev => ({ ...prev, [hospital.id]: true }));

    try {
      // localStorage에서 API 키 가져오기 (마이페이지에서 설정한 키)
      const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
      if (apiKey) {
        const prompt = `다음 동물병원 정보를 바탕으로 이 병원만의 특징과 장점을 구체적으로 요약해주세요.

병원명: ${hospital.name}
주소: ${hospital.address}
24시간 운영: ${hospital.is24Hours ? '예' : '아니오'}
평점: ${hospital.rating || '정보 없음'}
후기 수: ${hospital.reviewCount || 0}개
거리: ${hospital.distance ? (hospital.distance / 1000).toFixed(1) + 'km' : '정보 없음'}

각 병원의 고유한 특징(24시간 여부, 평점, 위치 등)을 반영하여 다른 병원과 차별화된 2-3줄 요약을 작성하세요.
병원마다 다른 내용으로 작성해주세요.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const summary = data.candidates[0].content.parts[0].text;
          setReviewSummaries(prev => ({ ...prev, [hospital.id]: summary }));
        } else {
          throw new Error('API 호출 실패');
        }
      } else {
        // API 키가 없으면 병원 특성에 맞는 기본 요약 생성
        let defaultSummary = '';
        if (hospital.is24Hours) {
          defaultSummary = `🚨 24시간 운영 병원! 야간 응급 상황에도 즉시 대응 가능합니다. `;
        }
        if (hospital.rating && parseFloat(hospital.rating) >= 4.5) {
          defaultSummary += `⭐ 평점 ${hospital.rating}점의 인기 병원으로, ${hospital.reviewCount}개 이상의 긍정적인 후기가 있습니다.`;
        } else if (hospital.rating) {
          defaultSummary += `평점 ${hospital.rating}점, ${hospital.reviewCount}개의 후기가 있는 검증된 병원입니다.`;
        }
        if (!defaultSummary) {
          defaultSummary = `${hospital.name}은(는) 내 위치에서 ${hospital.distance ? (hospital.distance / 1000).toFixed(1) + 'km' : '가까운'} 거리에 있는 동물병원입니다.`;
        }
        setReviewSummaries(prev => ({ ...prev, [hospital.id]: defaultSummary }));
      }
    } catch (error) {
      console.error('후기 요약 생성 오류:', error);
      // Fallback 요약 - 병원별 특성 반영
      let fallbackSummary = hospital.is24Hours
        ? `🚨 24시간 응급 진료 가능한 병원입니다.`
        : `평점 ${hospital.rating || '정보없음'}점의 동물병원입니다.`;
      if (hospital.reviewCount > 100) {
        fallbackSummary += ` ${hospital.reviewCount}개의 후기로 검증된 곳입니다.`;
      }
      setReviewSummaries(prev => ({ ...prev, [hospital.id]: fallbackSummary }));
    } finally {
      setLoadingReviews(prev => {
        const updated = { ...prev };
        delete updated[hospital.id];
        return updated;
      });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // 지역/병원명 검색 핸들러 (Firestore 사용)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // 검색어 없으면 내 위치 기반으로 복귀
      if (userLocation) {
        setIsSearching(true);
        try {
          const results = await getNearbyHospitalsFromFirestore(userLocation.lat, userLocation.lng, 5);
          setHospitals(results);
          setSearchMode('nearby');
        } catch (err) {
          console.error('위치 기반 검색 실패:', err);
        }
        setIsSearching(false);
      }
      return;
    }

    setIsSearching(true);
    try {
      console.log('[HospitalBooking] 지역/병원명 검색:', searchQuery);
      const results = await searchHospitalsByRegion(searchQuery, 50);
      console.log('[HospitalBooking] 검색 결과:', results.length, '개');
      setHospitals(results);
      setSearchMode('region');
      setDataSource('firestore');
    } catch (err) {
      console.error('검색 오류:', err);
      alert('검색 중 오류가 발생했습니다.');
    }
    setIsSearching(false);
  };

  // 엔터키 검색
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!petData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">반려동물을 등록해주세요</h2>
          <button
            onClick={onBack}
            className="mt-4 bg-sky-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-sky-600 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 검색 필터링
  const filteredHospitals = hospitals.filter(hospital =>
    !searchQuery || hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (hospital.address && hospital.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-slate-600">
            <span className="text-sm">← 돌아가기</span>
          </button>
        </div>
        <h1 className="text-xl font-bold text-slate-900">병원 찾기</h1>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 위치 상태 배너 */}
        {!isRealLocation && userLocation && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  기본 위치(서울 강남)를 사용 중입니다
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {locationError || '내 위치 기반 검색을 위해 위치 권한을 허용해주세요.'}
                </p>
                <button
                  onClick={handleRefreshLocation}
                  className="mt-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                >
                  📍 내 위치로 다시 검색
                </button>
              </div>
            </div>
          </div>
        )}

        {isRealLocation && userLocation && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-lg">✅</span>
              <p className="text-sm font-medium text-green-800">
                내 위치 기반으로 주변 병원을 검색합니다
              </p>
              <button
                onClick={handleRefreshLocation}
                className="ml-auto px-2 py-1 text-xs text-green-600 hover:bg-green-100 rounded"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        )}

        {/* AI 진단 요약 카드 */}
        {diagnosis && (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl shadow-soft border border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
              <h3 className="font-bold text-white flex items-center gap-2 font-display">
                <span className="material-symbols-outlined">smart_toy</span>
                AI 사전진단 요약
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                진단서 준비 중...
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* 반려동물 정보 */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center text-2xl">
                    {petData?.species === 'dog' ? '🐕' : '🐈'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{petData?.petName || '반려동물'}</h4>
                    <p className="text-sm text-slate-500">{petData?.breed} • {petData?.birthDate ? calculateAge(petData.birthDate) : ''}</p>
                  </div>
                </div>

                {/* 주요 증상 */}
                {diagnosis.symptom && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">symptoms</span>
                      주요 증상
                    </p>
                    <p className="text-slate-800 font-medium">{diagnosis.symptom}</p>
                  </div>
                )}

                {/* 의심 질환 */}
                {diagnosis.possible_diseases && diagnosis.possible_diseases.length > 0 && (
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">psychology</span>
                      AI 의심 질환
                    </p>
                    <div className="space-y-2">
                      {diagnosis.possible_diseases.slice(0, 2).map((disease, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-slate-800 text-sm">{disease.name || disease}</span>
                          <span className={`text-sm font-bold ${idx === 0 ? 'text-primary' : 'text-slate-500'}`}>
                            {disease.probability || disease.probability_percent || 'N/A'}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 전송 상태 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500">병원 선택 시 자동 전송</span>
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    전송 준비 완료
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!diagnosis && (
          <div className="bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent">lightbulb</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">진단 기록이 없습니다</h4>
                <p className="text-sm text-slate-600">AI 진단을 받으면 병원에 사전 전송할 수 있는 진단서가 생성됩니다. 병원에서 미리 증상을 파악하고 더 정확한 진료를 준비할 수 있어요.</p>
              </div>
            </div>
          </div>
        )}

        {/* Triage Score 표시 */}
        {diagnosis?.triage_score !== undefined && (
          <div className="bg-surface-light p-4 rounded-lg shadow-soft border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 font-display flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">warning</span>
                응급도 평가
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                diagnosis.triage_score >= 4 ? 'bg-red-100 text-red-600' : 
                diagnosis.triage_score >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
              }`}>
                {diagnosis.triage_level || 'Normal'}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  diagnosis.triage_score >= 4 ? 'bg-red-500' : 
                  diagnosis.triage_score >= 3 ? 'bg-orange-500' : 
                  diagnosis.triage_score >= 2 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${(diagnosis.triage_score / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-right">{diagnosis.hospitalVisitTime || '24시간 내'} 권장</p>
          </div>
        )}

        {/* 검색 섹션 */}
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900">
            {searchMode === 'nearby' ? '📍 내 주변 동물병원' : `🔍 "${searchQuery}" 검색 결과`}
          </h3>
          {searchMode === 'region' && (
            <button
              onClick={() => {
                setSearchQuery('');
                handleSearch();
              }}
              className="text-sm text-sky-500 font-medium"
            >
              내 위치로
            </button>
          )}
        </div>

        {/* 데이터 소스 표시 */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>📊 {dataSource === 'firestore' ? '공공데이터 (행안부)' : '카카오맵'}</span>
          <span>•</span>
          <span>{hospitals.length}개 병원</span>
        </div>

        {/* 검색창 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="지역명 검색 (예: 부산, 해운대, 강남)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-3 pl-10 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isSearching ? '검색중...' : '검색'}
          </button>
        </div>

        {/* 병원 리스트 */}
        <div className="space-y-4">
          {isSearching && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-2xl border border-slate-100">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              병원을 검색하고 있습니다...
            </div>
          )}
          {!isSearching && filteredHospitals.length === 0 && !mapLoading ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-2xl border border-slate-100">
              {searchMode === 'region'
                ? `"${searchQuery}" 지역에서 동물병원을 찾을 수 없습니다.`
                : '주변에 동물병원을 찾을 수 없습니다.'}
            </div>
          ) : !isSearching && (
            filteredHospitals.map(hospital => (
              <div key={hospital.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                {/* 병원명과 거리 */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sky-600 text-base">{hospital.name}</h4>
                      <a
                        href={hospital.url || `https://map.kakao.com/link/search/${encodeURIComponent(hospital.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-[#FFEB00] text-[#3C1E1E] text-xs font-bold rounded hover:bg-[#F5E100] transition-colors"
                      >
                        상세정보
                      </a>
                      {hospital.is24Hours && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">24시</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{hospital.roadAddress || hospital.address}</p>
                  </div>
                  <span className="text-sm text-slate-500">{formatDistance(hospital.distance)}</span>
                </div>

                {/* 영업상태 + 영업시간 (한 줄) */}
                <div className="flex items-center gap-2 mb-2 text-xs">
                  {hospital.businessStatus && (
                    <span className={`font-medium px-2 py-0.5 rounded ${
                      hospital.businessStatus === '영업중' || hospital.businessStatus === '영업/정상'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {hospital.businessStatus}
                    </span>
                  )}
                  {hospital.is24Hours ? (
                    <span className="text-red-600 font-medium">영업시간: 24시간</span>
                  ) : (
                    <span className="text-slate-400">
                      영업시간 -
                      <a
                        href={hospital.url || `https://map.kakao.com/link/search/${encodeURIComponent(hospital.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:underline ml-1"
                      >
                        카카오맵에서 확인
                      </a>
                    </span>
                  )}
                  <span className="text-slate-300">|</span>
                  <span className="text-yellow-500">⭐</span>
                  <span className="text-slate-500">
                    후기 평점 -
                    <a
                      href={hospital.url || `https://map.kakao.com/link/search/${encodeURIComponent(hospital.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:underline ml-1"
                    >
                      카카오맵에서 확인
                    </a>
                  </span>
                </div>


                {/* AI 병원 특징 요약 */}
                <div className="mb-4">
                  {loadingReviews[hospital.id] ? (
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                      병원 정보 분석 중...
                    </div>
                  ) : reviewSummaries[hospital.id] ? (
                    <div className="bg-gradient-to-r from-slate-50 to-sky-50 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-1 text-sky-600 font-medium mb-1.5">
                        <span>🤖</span>
                        <span>AI가 요약한 병원 특징</span>
                      </div>
                      <p className="text-slate-700">{reviewSummaries[hospital.id]}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateReviewSummary(hospital)}
                      className="text-xs text-slate-500 hover:text-sky-500 font-medium flex items-center gap-1"
                    >
                      🤖 AI가 요약한 병원 특징 보기
                    </button>
                  )}
                </div>

                {/* 버튼 - 순서: 예약하기, 길찾기, T펫택시 예약 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBookAppointment(hospital)}
                    className="flex-1 py-2.5 text-center bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-colors"
                  >
                    예약하기
                  </button>
                  <a
                    href={userLocation
                      ? `https://map.kakao.com/link/from/내위치,${userLocation.lat},${userLocation.lng}/to/${encodeURIComponent(hospital.name)},${hospital.lat},${hospital.lng}`
                      : `https://map.kakao.com/link/to/${encodeURIComponent(hospital.name)},${hospital.lat},${hospital.lng}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 text-center border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    🗺️ 길찾기
                  </a>
                  <a
                    href="https://service.kakaomobility.com/launch/kakaot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 text-center bg-[#1E1B4B] rounded-xl text-sm font-bold hover:bg-[#2d2a5a] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-[#FACC15] font-black">T</span>
                    <span className="text-white">펫택시 예약</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 예약 모달 */}
      {showBookingModal && bookingHospital && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            {bookingSuccess ? (
              /* 예약 성공 화면 */
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">예약 요청 완료!</h3>
                <p className="text-slate-500 mb-6">
                  병원에서 확인 후 연락드릴 예정입니다.
                </p>

                <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary">local_hospital</span>
                    <span className="font-bold text-slate-900">{bookingHospital.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {bookingDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {bookingTime}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">info</span>
                    예약 상태는 마이페이지에서 확인할 수 있습니다.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingSuccess(false);
                  }}
                  className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  확인
                </button>
              </div>
            ) : (
              <>
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">예약하기</h3>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* 선택된 병원 정보 */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="font-bold text-slate-900">{bookingHospital.name}</p>
                  <p className="text-sm text-slate-500">{bookingHospital.roadAddress || bookingHospital.address}</p>
                </div>

                {/* 날짜 선택 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_today</span>
                    예약 날짜
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* 시간 선택 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">schedule</span>
                    예약 시간
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {getTimeSlots().map(time => (
                      <button
                        key={time}
                        onClick={() => setBookingTime(time)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          bookingTime === time
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 메시지 입력 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">edit_note</span>
                    병원에 전달할 메시지 (선택)
                  </label>
                  <textarea
                    value={bookingMessage}
                    onChange={(e) => setBookingMessage(e.target.value)}
                    placeholder="증상이나 요청사항을 입력해주세요"
                    rows="3"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  />
                </div>

                {/* AI 진단서 첨부 옵션 */}
                {diagnosis && (
                  <div className="mb-4">
                    <div
                      className={`rounded-xl p-4 border-2 cursor-pointer transition-all ${
                        attachDiagnosis
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                      onClick={() => setAttachDiagnosis(!attachDiagnosis)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 ${
                          attachDiagnosis ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                        }`}>
                          {attachDiagnosis ? (
                            <span className="material-symbols-outlined text-white text-lg font-bold">check</span>
                          ) : (
                            <span className="w-4 h-4"></span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-lg">description</span>
                            <span className="font-bold text-slate-800">AI 사전 진단서 첨부</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${attachDiagnosis ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{attachDiagnosis ? '✓ 첨부됨' : '권장'}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            병원에서 사전에 진료 계획을 세울 수 있어요
                          </p>
                          {attachDiagnosis && (
                            <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                반려동물 기본 정보
                              </div>
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                증상 및 타임라인
                              </div>
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                AI 감별진단 (Top 3 의심 질환)
                              </div>
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                                응급도 평가 및 권장 조치
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!attachDiagnosis && (
                      <p className="text-xs text-slate-500 mt-2 ml-1">
                        ⚠️ 진단서 없이 예약하면 병원에서 증상을 다시 설명해야 할 수 있어요
                      </p>
                    )}
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30"
                  >
                    예약 요청
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
