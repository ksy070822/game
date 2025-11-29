import { useState, useEffect, useRef } from 'react';
import { generateHospitalPacket } from '../services/ai/hospitalPacket';
import { getCurrentPosition, searchAnimalHospitals, initKakaoMap, addMarker, loadKakao } from '../services/kakaoMap';

export function HospitalBooking({ petData, diagnosis, symptomData, onBack, onSelectHospital }) {
  const [hospitalPacket, setHospitalPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [reviewSummaries, setReviewSummaries] = useState({}); // 병원별 후기 요약
  const [loadingReviews, setLoadingReviews] = useState({}); // 후기 로딩 상태
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

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

        // 위치 및 병원 검색 (항상 수행)
        try {
          const position = await getCurrentPosition();
          if (isMounted) setUserLocation(position);

          const hospitalList = await searchAnimalHospitals(position.lat, position.lng);
          if (isMounted) {
            setHospitals(hospitalList);
            setMapLoading(false);
          }
        } catch (err) {
          console.error('위치/병원 검색 오류:', err);
          // 기본 위치로 fallback
          if (isMounted) {
            setUserLocation({ lat: 37.4979, lng: 127.0276 });
            // 모킹 데이터 사용
            const mockHospitals = [
              {
                id: 'h1',
                name: '서울 24시 동물메디컬센터',
                address: '서울시 강남구 강남대로 123',
                roadAddress: '서울시 강남구 강남대로 123',
                phone: '02-1234-5678',
                distance: 1200,
                lat: 37.5079,
                lng: 127.0376,
                category: '동물병원',
                is24Hours: true,
              },
              {
                id: 'h2',
                name: '행복한 동물병원',
                address: '서울시 강남구 테헤란로 45',
                roadAddress: '서울시 강남구 테헤란로 45',
                phone: '02-2345-6789',
                distance: 2500,
                lat: 37.4879,
                lng: 127.0176,
                category: '동물병원',
                is24Hours: false,
              }
            ];
            setHospitals(mockHospitals);
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
    setSelectedHospital(hospital);
    if (onSelectHospital) {
      onSelectHospital(hospital);
    }
  };

  const handleRefreshLocation = async () => {
    setMapLoading(true);
    try {
      const position = await getCurrentPosition();
      setUserLocation(position);
      const hospitalList = await searchAnimalHospitals(position.lat, position.lng);
      setHospitals(hospitalList);
    } catch (error) {
      console.error('위치 갱신 오류:', error);
    } finally {
      setMapLoading(false);
    }
  };

  const formatDistance = (meters) => {
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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const prompt = `다음 동물병원 정보를 바탕으로 간단한 후기 요약을 생성해주세요. (실제 후기가 아닌, 병원 특징을 기반으로 한 요약)

병원명: ${hospital.name}
주소: ${hospital.address}
24시간 운영: ${hospital.is24Hours ? '예' : '아니오'}
평점: ${hospital.rating || '정보 없음'}
후기 수: ${hospital.reviewCount || 0}개

위 정보를 바탕으로 이 병원의 특징을 2-3줄로 요약해주세요. 예: "24시간 운영으로 응급 상황에 대비할 수 있는 병원입니다. 평점이 높아 신뢰할 수 있는 진료를 제공합니다."`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
        // API 키가 없으면 기본 요약 생성
        const defaultSummary = hospital.is24Hours 
          ? `24시간 운영으로 응급 상황에 대비할 수 있는 병원입니다. 평점 ${hospital.rating}점으로 신뢰할 수 있는 진료를 제공합니다.`
          : `평점 ${hospital.rating}점의 신뢰할 수 있는 동물병원입니다. ${hospital.reviewCount}개의 후기가 있어 검증된 병원입니다.`;
        setReviewSummaries(prev => ({ ...prev, [hospital.id]: defaultSummary }));
      }
    } catch (error) {
      console.error('후기 요약 생성 오류:', error);
      // Fallback 요약
      const fallbackSummary = hospital.is24Hours 
        ? `24시간 운영으로 응급 상황에 대비할 수 있는 병원입니다.`
        : `신뢰할 수 있는 동물병원입니다.`;
      setReviewSummaries(prev => ({ ...prev, [hospital.id]: fallbackSummary }));
    } finally {
      setLoadingReviews(prev => {
        const updated = { ...prev };
        delete updated[hospital.id];
        return updated;
      });
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
            className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
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
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">병원 찾기</h2>
        <div className="flex size-12 shrink-0 items-center justify-end"></div>
      </div>

      <div className="px-4 pt-2 pb-40 space-y-6">
        {/* AI 진단 패킷 미리보기 */}
        {diagnosis && (
          <div className="bg-surface-light rounded-lg shadow-soft border border-slate-200 overflow-hidden">
            <div className="bg-primary/10 p-4 border-b border-primary/20">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
                AI 진단 패킷 준비 완료
              </h3>
              <p className="text-xs text-slate-600 mt-1">선택한 병원에 자동으로 전송됩니다</p>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                패킷 생성 중...
              </div>
            ) : hospitalPacket && (
              <div className="p-4">
                <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 p-2 rounded border border-gray-100 max-h-32 overflow-y-auto">
                  {hospitalPacket.packet_text}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>작성일: {new Date().toLocaleDateString()}</span>
                  <span>상태: <span className="text-green-500 font-bold">준비됨</span></span>
                </div>
              </div>
            )}
          </div>
        )}

        {!diagnosis && (
          <div className="bg-accent/20 border border-accent/30 rounded-lg p-4">
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-accent">lightbulb</span>
              <span><strong>진단 기록이 없습니다.</strong> AI 진단을 받으면 병원에 사전 전송할 수 있는 진단 패킷이 생성됩니다.</span>
            </p>
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

        {/* 지도 및 병원 목록 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-lg font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              내 주변 병원
            </h3>
            <button 
              onClick={handleRefreshLocation}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              재검색
            </button>
          </div>

          {/* 지도 영역 */}
          <div className="bg-gray-100 rounded-2xl overflow-hidden h-[300px] relative shadow-inner border border-gray-200">
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <p className="text-gray-500 text-sm">지도를 불러오는 중...</p>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full"></div>
          </div>

          {/* 병원 리스트 */}
          <div className="space-y-3">
            {hospitals.length === 0 && !mapLoading ? (
              <div className="text-center py-8 text-gray-500 bg-white rounded-2xl border border-gray-100">
                주변에 동물병원을 찾을 수 없습니다.
              </div>
            ) : (
              hospitals.map(hospital => (
                <div key={hospital.id} className="bg-surface-light p-4 rounded-lg shadow-soft border border-slate-200 hover:border-primary/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 font-display">{hospital.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{hospital.roadAddress || hospital.address}</p>
                      
                      {/* 평점 및 후기 */}
                      {hospital.rating && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-sm">⭐</span>
                            <span className="font-bold text-slate-900 text-sm">{hospital.rating}</span>
                          </div>
                          {hospital.reviewCount > 0 && (
                            <span className="text-xs text-slate-500">({hospital.reviewCount.toLocaleString()}개 후기)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-primary font-bold text-sm">{formatDistance(hospital.distance)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {hospital.is24Hours ? (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-md">24시 응급</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-md">진료중</span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] rounded-md">{hospital.category}</span>
                    {hospital.rating && hospital.rating >= 4.5 && (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded-md">⭐ 인기</span>
                    )}
                  </div>

                  {/* 후기 요약 */}
                  <div className="mb-4">
                    {loadingReviews[hospital.id] ? (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                        후기 요약 생성 중...
                      </div>
                    ) : reviewSummaries[hospital.id] ? (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-xs text-slate-700">
                        <div className="font-medium mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-sm">rate_review</span>
                          후기 요약
                        </div>
                        <p>{reviewSummaries[hospital.id]}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateReviewSummary(hospital)}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">rate_review</span>
                        후기 요약 보기
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {hospital.phone && (
                      <a 
                        href={`tel:${hospital.phone}`}
                        className="flex-1 py-2 text-center border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        📞 전화
                      </a>
                    )}
                    <button 
                      onClick={() => handleBookAppointment(hospital)}
                      className="flex-1 py-2 text-center bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      예약하기
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 예약 완료 모달 - App.jsx의 hospital-review 화면에서 처리됨 */}
    </div>
  );
}
