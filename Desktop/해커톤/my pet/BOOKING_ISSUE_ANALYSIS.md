# 보호자-병원 간 예약 데이터 동기화 문제 분석 및 개선 계획

## 🔍 문제 분석

### 현재 상황
- **보호자 계정**: `guardian@test.com`에서 예약 생성
- **병원 계정**: `clinic@happyvet.com`의 대시보드에서 예약이 보이지 않음
- Firebase에 데이터는 저장되고 있지만, 병원 대시보드에 반영되지 않음

### 핵심 문제점

#### 1. **ID 불일치 문제** (가장 중요)
```
예약 생성 시:
- bookingHospital.id → animal_hospitals 컬렉션의 문서 ID 사용
- 예: "abc123" (animal_hospitals 문서 ID)

병원 대시보드 조회 시:
- currentClinic.id → clinics 컬렉션의 문서 ID 사용  
- 예: "xyz789" (clinics 문서 ID)

→ 두 ID가 완전히 다름! 매칭 불가능
```

**코드 위치:**
- 예약 생성: `my pet/src/components/HospitalBooking.jsx:371`
  ```javascript
  clinicId: bookingHospital.id,  // animal_hospitals의 문서 ID
  ```

- 병원 조회: `my pet/src/services/clinicService.js:146`
  ```javascript
  where('clinicId', '==', clinicId),  // clinics의 문서 ID로 조회
  ```

#### 2. **컬렉션 구조 불일치**
- `animal_hospitals`: 카카오맵/공공데이터 기반 병원 정보
- `clinics`: 병원 모드에서 사용하는 병원 정보
- 두 컬렉션이 분리되어 있고 매핑 관계가 없음

#### 3. **예약 조회 쿼리 문제**
- `getTodayBookings()`는 `clinics` 컬렉션의 ID로만 조회
- `animal_hospitals`의 ID로 저장된 예약은 찾을 수 없음

## 📋 개선 계획

### Phase 1: 즉시 해결 (단기)

#### 1.1 clinics 컬렉션에 animalHospitalId 필드 추가
```javascript
// clinics 컬렉션 구조
{
  id: "clinic_doc_id",
  name: "행복한 동물병원",
  address: "...",
  animalHospitalId: "animal_hospitals_doc_id",  // 새로 추가
  ...
}
```

#### 1.2 예약 생성 시 clinics ID 찾기
```javascript
// HospitalBooking.jsx 수정
async function findClinicId(animalHospitalId) {
  // animal_hospitals의 ID로 clinics 찾기
  const clinicsQuery = query(
    collection(db, 'clinics'),
    where('animalHospitalId', '==', animalHospitalId)
  );
  const snapshot = await getDocs(clinicsQuery);
  if (!snapshot.empty) {
    return snapshot.docs[0].id;  // clinics의 문서 ID 반환
  }
  return null;
}

// 예약 생성 시
const clinicId = await findClinicId(bookingHospital.id);
if (clinicId) {
  firestoreBookingData.clinicId = clinicId;  // clinics ID 사용
} else {
  // clinics가 없으면 animal_hospitals ID 사용 (하위 호환)
  firestoreBookingData.clinicId = bookingHospital.id;
  firestoreBookingData.animalHospitalId = bookingHospital.id;  // 원본 ID 보관
}
```

#### 1.3 병원 대시보드 조회 로직 개선
```javascript
// clinicService.js 수정
export async function getTodayBookings(clinicId) {
  const todayStr = today.toISOString().split('T')[0];
  
  // clinics ID로 조회
  const bookingsQuery1 = query(
    collection(db, 'bookings'),
    where('clinicId', '==', clinicId),
    where('date', '==', todayStr)
  );
  
  // animalHospitalId로도 조회 (하위 호환)
  const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
  const clinicData = clinicDoc.data();
  const animalHospitalId = clinicData?.animalHospitalId;
  
  let bookingsQuery2 = null;
  if (animalHospitalId) {
    bookingsQuery2 = query(
      collection(db, 'bookings'),
      where('animalHospitalId', '==', animalHospitalId),
      where('date', '==', todayStr)
    );
  }
  
  // 두 쿼리 결과 병합
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(bookingsQuery1),
    bookingsQuery2 ? getDocs(bookingsQuery2) : Promise.resolve({ docs: [] })
  ]);
  
  // 중복 제거 및 병합
  const bookingMap = new Map();
  [...snapshot1.docs, ...(snapshot2?.docs || [])].forEach(doc => {
    bookingMap.set(doc.id, doc);
  });
  
  // ... 나머지 로직
}
```

### Phase 2: 데이터 마이그레이션 (중기)

#### 2.1 기존 예약 데이터 마이그레이션 스크립트
```javascript
// scripts/migrateBookings.js
async function migrateBookings() {
  // 1. 모든 bookings 조회
  const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
  
  // 2. 각 예약에 대해 clinics ID 찾기
  for (const bookingDoc of bookingsSnapshot.docs) {
    const booking = bookingDoc.data();
    const animalHospitalId = booking.clinicId;  // 현재는 animal_hospitals ID
    
    // clinics에서 찾기
    const clinicsQuery = query(
      collection(db, 'clinics'),
      where('animalHospitalId', '==', animalHospitalId)
    );
    const clinicsSnapshot = await getDocs(clinicsQuery);
    
    if (!clinicsSnapshot.empty) {
      // clinics ID로 업데이트
      await updateDoc(bookingDoc.ref, {
        clinicId: clinicsSnapshot.docs[0].id,
        animalHospitalId: animalHospitalId  // 원본 보관
      });
    }
  }
}
```

#### 2.2 clinics 컬렉션에 animalHospitalId 추가
```javascript
// scripts/addAnimalHospitalIdToClinics.js
async function addAnimalHospitalIdToClinics() {
  // 1. clinics 조회
  const clinicsSnapshot = await getDocs(collection(db, 'clinics'));
  
  // 2. 각 clinic에 대해 animal_hospitals에서 매칭
  for (const clinicDoc of clinicsSnapshot.docs) {
    const clinic = clinicDoc.data();
    
    // 병원명으로 animal_hospitals 찾기
    const hospitalsQuery = query(
      collection(db, 'animal_hospitals'),
      where('name', '==', clinic.name),
      limit(1)
    );
    const hospitalsSnapshot = await getDocs(hospitalsQuery);
    
    if (!hospitalsSnapshot.empty) {
      await updateDoc(clinicDoc.ref, {
        animalHospitalId: hospitalsSnapshot.docs[0].id
      });
    }
  }
}
```

### Phase 3: 구조 개선 (장기)

#### 3.1 통합 병원 정보 구조
- `animal_hospitals`와 `clinics`를 하나로 통합하거나
- 명확한 매핑 테이블 생성

#### 3.2 예약 생성 플로우 개선
- 병원 선택 시 clinics ID를 직접 사용
- animal_hospitals는 검색용으로만 사용

## 🚀 우선순위별 실행 계획

### 즉시 (오늘)
1. ✅ 문제 분석 완료
2. ⏳ `clinics` 컬렉션에 `animalHospitalId` 필드 추가 로직 작성
3. ⏳ 예약 생성 시 clinics ID 찾기 로직 추가
4. ⏳ 병원 대시보드 조회 로직 개선

### 단기 (이번 주)
1. 데이터 마이그레이션 스크립트 작성 및 실행
2. 테스트 계정으로 검증
3. 기존 예약 데이터 업데이트

### 중기 (다음 주)
1. 구조 개선 검토
2. 성능 최적화
3. 문서화

## 📝 체크리스트

- [x] `clinics` 컬렉션에 `animalHospitalId` 필드 추가 (스크립트 작성 완료)
- [x] 예약 생성 시 clinics ID 찾기 로직 구현 ✅
- [x] 병원 대시보드 조회 로직 개선 (양방향 조회) ✅
- [x] 마이그레이션 스크립트 작성 ✅
- [ ] 테스트 계정으로 검증
- [ ] 기존 예약 데이터 업데이트 (스크립트 실행 필요)
- [x] 문서화 ✅

## ✅ 완료된 작업

### 1. 예약 생성 로직 수정 (`HospitalBooking.jsx`)
- 병원명으로 `clinics` 컬렉션에서 실제 clinicId 찾기
- `animalHospitalId` 필드 추가로 원본 ID 보관
- 하위 호환성 유지

### 2. 병원 대시보드 조회 로직 개선 (`clinicService.js`)
- `getTodayBookings()`: clinics ID, 병원명, animalHospitalId로 3방향 조회
- `getMonthlyBookings()`: 동일하게 3방향 조회
- 중복 제거 및 정렬 처리

### 3. 마이그레이션 스크립트 작성
- `scripts/migrateBookings.js`: 기존 예약 데이터 업데이트
- `scripts/addAnimalHospitalIdToClinics.js`: clinics에 animalHospitalId 추가

## 🔧 테스트 시나리오

1. **보호자 계정으로 예약 생성**
   - guardian@test.com으로 로그인
   - "행복한 동물병원" 선택
   - 예약 생성

2. **병원 계정으로 확인**
   - clinic@happyvet.com으로 로그인
   - 병원 모드 진입
   - 오늘 예약 탭에서 예약 확인

3. **검증 포인트**
   - 예약이 올바른 clinicId로 저장되는지
   - 병원 대시보드에서 예약이 보이는지
   - 예약 상세 정보가 올바른지

