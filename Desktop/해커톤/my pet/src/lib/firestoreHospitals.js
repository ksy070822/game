// Firestore 동물병원 검색 함수
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "./firebase";

// 두 좌표 사이 거리(km) 계산
function distanceInKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 지구 반지름 km
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Firestore에서 사용자 위치 기준 근처 병원 가져오기
 * @param {number} userLat - 사용자 위도
 * @param {number} userLng - 사용자 경도
 * @param {number} radiusKm - 반경 km (기본값: 5)
 * @returns {Promise<Array>} 병원 목록
 */
export async function getNearbyHospitalsFromFirestore(userLat, userLng, radiusKm = 5) {
  try {
    console.log('[Firestore] 근처 병원 검색 시작:', { userLat, userLng, radiusKm });
    
    // 대략적인 위도 범위 (1도 ≈ 111km)
    const latDelta = radiusKm / 111;

    const q = query(
      collection(db, "animal_hospitals"),
      where("location.lat", ">=", userLat - latDelta),
      where("location.lat", "<=", userLat + latDelta),
      limit(500)
    );

    const snap = await getDocs(q);
    console.log('[Firestore] 쿼리 결과:', snap.size, '개');

    const hospitals = [];

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.location || data.location.lat == null || data.location.lng == null) {
        return;
      }

      const dist = distanceInKm(
        userLat,
        userLng,
        data.location.lat,
        data.location.lng
      );

      if (dist <= radiusKm) {
        const hospitalName = data.name || data.사업장명 || '이름 없음';
        hospitals.push({
          id: doc.id,
          name: hospitalName,
          phone: data.phone || data.소재지전화 || null,
          address: data.address_jibun || data.소재지전체주소 || null,
          roadAddress: data.address_road || data.도로명전체주소 || null,
          lat: data.location.lat,
          lng: data.location.lng,
          distance: Math.round(dist * 1000), // m 단위
          distanceKm: Number(dist.toFixed(2)),
          category: '동물병원',
          // 카카오맵 상세페이지 URL (검색 링크로 연결)
          url: `https://map.kakao.com/link/search/${encodeURIComponent(hospitalName)}`,
          // 추가 정보
          businessStatus: data.영업상태명 || '영업중',
          is24Hours: hospitalName.includes('24시') || hospitalName.includes('24') || hospitalName.includes('응급'),
        });
      }
    });

    // 거리순 정렬
    hospitals.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log('[Firestore] 반경 내 병원:', hospitals.length, '개');
    return hospitals;
  } catch (error) {
    console.error('[Firestore] 병원 검색 오류:', error);
    throw error;
  }
}

/**
 * 지역명으로 병원 검색 (시/군/구 기준)
 * @param {string} regionName - 지역명 (예: "부산", "해운대", "강남구")
 * @param {number} maxResults - 최대 결과 수
 * @returns {Promise<Array>} 병원 목록
 */
export async function searchHospitalsByRegion(regionName, maxResults = 50) {
  try {
    console.log('[Firestore] 지역 검색:', regionName);
    
    // Firestore에서 전체 데이터를 가져와서 필터링 (주소에 지역명 포함)
    const q = query(
      collection(db, "animal_hospitals"),
      limit(2000) // 충분한 데이터 가져오기
    );

    const snap = await getDocs(q);
    console.log('[Firestore] 전체 데이터:', snap.size, '개');

    const hospitals = [];
    const searchTerm = regionName.toLowerCase().trim();

    snap.forEach((doc) => {
      const data = doc.data();
      
      // 주소에서 검색어 매칭
      const address = (data.address_jibun || data.소재지전체주소 || '').toLowerCase();
      const roadAddress = (data.address_road || data.도로명전체주소 || '').toLowerCase();
      const name = (data.name || data.사업장명 || '').toLowerCase();
      
      if (address.includes(searchTerm) || roadAddress.includes(searchTerm) || name.includes(searchTerm)) {
        const hospitalName = data.name || data.사업장명 || '이름 없음';
        hospitals.push({
          id: doc.id,
          name: hospitalName,
          phone: data.phone || data.소재지전화 || null,
          address: data.address_jibun || data.소재지전체주소 || null,
          roadAddress: data.address_road || data.도로명전체주소 || null,
          lat: data.location?.lat || null,
          lng: data.location?.lng || null,
          distance: null, // 지역 검색은 거리 없음
          category: '동물병원',
          url: `https://map.kakao.com/link/search/${encodeURIComponent(hospitalName)}`,
          businessStatus: data.영업상태명 || '영업중',
          is24Hours: hospitalName.includes('24시') || hospitalName.includes('24') || hospitalName.includes('응급'),
        });
      }
    });

    console.log('[Firestore] 지역 검색 결과:', hospitals.length, '개');
    return hospitals.slice(0, maxResults);
  } catch (error) {
    console.error('[Firestore] 지역 검색 오류:', error);
    throw error;
  }
}

/**
 * 병원명으로 검색
 * @param {string} hospitalName - 병원명
 * @param {number} maxResults - 최대 결과 수
 * @returns {Promise<Array>} 병원 목록
 */
export async function searchHospitalsByName(hospitalName, maxResults = 30) {
  try {
    console.log('[Firestore] 병원명 검색:', hospitalName);
    
    const q = query(
      collection(db, "animal_hospitals"),
      limit(2000)
    );

    const snap = await getDocs(q);
    const hospitals = [];
    const searchTerm = hospitalName.toLowerCase().trim();

    snap.forEach((doc) => {
      const data = doc.data();
      const name = (data.name || data.사업장명 || '').toLowerCase();
      
      if (name.includes(searchTerm)) {
        const hospitalName = data.name || data.사업장명 || '이름 없음';
        hospitals.push({
          id: doc.id,
          name: hospitalName,
          phone: data.phone || data.소재지전화 || null,
          address: data.address_jibun || data.소재지전체주소 || null,
          roadAddress: data.address_road || data.도로명전체주소 || null,
          lat: data.location?.lat || null,
          lng: data.location?.lng || null,
          distance: null,
          category: '동물병원',
          url: `https://map.kakao.com/link/search/${encodeURIComponent(hospitalName)}`,
          businessStatus: data.영업상태명 || '영업중',
          is24Hours: hospitalName.includes('24시') || hospitalName.includes('24') || hospitalName.includes('응급'),
        });
      }
    });

    return hospitals.slice(0, maxResults);
  } catch (error) {
    console.error('[Firestore] 병원명 검색 오류:', error);
    throw error;
  }
}

/**
 * 통합 검색 함수 - 위치 또는 지역명으로 검색
 * @param {Object} options - 검색 옵션
 * @param {number} options.lat - 위도 (위치 기반 검색 시)
 * @param {number} options.lng - 경도 (위치 기반 검색 시)
 * @param {string} options.region - 지역명 (지역 검색 시)
 * @param {string} options.name - 병원명 (병원명 검색 시)
 * @param {number} options.radius - 반경 km
 * @returns {Promise<Array>} 병원 목록
 */
export async function searchHospitals({ lat, lng, region, name, radius = 5 }) {
  // 병원명 검색 우선
  if (name && name.trim()) {
    return await searchHospitalsByName(name, 50);
  }
  
  // 지역 검색
  if (region && region.trim()) {
    return await searchHospitalsByRegion(region, 50);
  }
  
  // 위치 기반 검색
  if (lat && lng) {
    return await getNearbyHospitalsFromFirestore(lat, lng, radius);
  }
  
  // 기본값: 빈 배열
  return [];
}
