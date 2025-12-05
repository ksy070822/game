# Firestore 인덱스 생성 가이드

이 문서는 반려동물 헬스케어 앱의 Firestore 권한 문제를 해결하기 위해 필요한 인덱스 목록입니다.

## 🔥 필수 인덱스 목록

### 1. bookings (예약 컬렉션)

#### 1-1. 오늘 예약 조회용
```
컬렉션: bookings
필드:
  - clinicId (Ascending)
  - date (Ascending)
  - time (Ascending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Clt-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Jvb2tpbmdzL2luZGV4ZXMvXxABGgoKBmNsaW5pY0lkEAEaCgoGZGF0ZRABGgkKBXRpbWUQARoMCghfX25hbWVfXxAB
```

#### 1-2. 월별 예약 조회용 (범위 쿼리)
```
컬렉션: bookings
필드:
  - clinicId (Ascending)
  - date (Ascending)
  - time (Ascending)
```

**참고:** 1-1과 동일한 인덱스를 사용합니다.

#### 1-3. 병원명 기준 조회 (하위 호환용)
```
컬렉션: bookings
필드:
  - clinicName (Ascending)
  - date (Ascending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=ClV-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Jvb2tpbmdzL2luZGV4ZXMvXxABGgwKCGNsaW5pY05hbWUQARoKCgZkYXRlEAEaDAoIX19uYW1lX18QAQ
```

---

### 2. diagnoses (진단서 컬렉션)

#### 2-1. 병원 모드: 특정 환자의 진단 기록 조회
```
컬렉션: diagnoses
필드:
  - clinicId (Ascending)
  - ownerId (Ascending)
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크 (실제 프로젝트):**
```
https://console.firebase.google.com/v1/r/project/ai-factory-c6d58/firestore/indexes?create_composite=ClJwcm9qZWN0cy9haS1mYWN0b3J5LWM2ZDU4L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9kaWFnbm9zZXMvaW5kZXhlcy9fEAEaDAoIY2xpbmljSWQQARoLCgdvd25lcklkEAEaCQoFcGV0SWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

**⚠️ 바로 위 링크를 클릭하여 인덱스를 생성하세요!** (테스트 로그에서 자동 생성된 URL)

#### 2-2. 보호자 모드: 펫별 진단 기록 조회
```
컬렉션: diagnoses
필드:
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=ClZ-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2RpYWdub3Nlcy9pbmRleGVzL18QARoJCgVwZXRJZBABGgsKB2NyZWF0ZWRBdBAC
```

---

### 3. clinicResults (진료 결과 컬렉션)

#### 3-1. 펫별 진료 결과 조회
```
컬렉션: clinicResults
필드:
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl1-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NsaW5pY1Jlc3VsdHMvaW5kZXhlcy9fEAEaCQoFcGV0SWQQARoLCgdjcmVhdGVkQXQQAg
```

#### 3-2. 병원별 진료 결과 조회
```
컬렉션: clinicResults
필드:
  - clinicId (Ascending)
  - visitDate (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl1-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NsaW5pY1Jlc3VsdHMvaW5kZXhlcy9fEAEaCgoGY2xpbmljSWQQARoLCgd2aXNpdERhdGUQAg
```

---

### 4. preQuestionnaires (사전 문진 컬렉션)

#### 4-1. 병원 모드: 특정 환자의 사전 문진 조회
```
컬렉션: preQuestionnaires
필드:
  - clinicId (Ascending)
  - ownerId (Ascending)
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=CmJ-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3ByZVF1ZXN0aW9ubmFpcmVzL2luZGV4ZXMvXxABGgoKBmNsaW5pY0lkEAEaCgoGb3duZXJJZBABGgkKBXBldElkEAEaCwoHY3JlYXRlZEF0EAI
```

#### 4-2. 보호자 모드: 내 사전 문진 목록
```
컬렉션: preQuestionnaires
필드:
  - ownerId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=CmJ-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3ByZVF1ZXN0aW9ubmFpcmVzL2luZGV4ZXMvXxABGgoKBm93bmVySWQQARoLCgdjcmVhdGVkQXQQAg
```

---

### 5. medicalRecords (환자 기록 컬렉션)

#### 5-1. 병원 모드: 특정 환자의 환자 기록 조회
```
컬렉션: medicalRecords
필드:
  - clinicId (Ascending)
  - ownerId (Ascending)
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl9-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21lZGljYWxSZWNvcmRzL2luZGV4ZXMvXxABGgoKBmNsaW5pY0lkEAEaCgoGb3duZXJJZBABGgkKBXBldElkEAEaCwoHY3JlYXRlZEF0EAI
```

#### 5-2. 보호자 모드: 내 환자 기록 목록
```
컬렉션: medicalRecords
필드:
  - ownerId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl9-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21lZGljYWxSZWNvcmRzL2luZGV4ZXMvXxABGgoKBm93bmVySWQQARoLCgdjcmVhdGVkQXQQAg
```

#### 5-3. 펫별 환자 기록 조회
```
컬렉션: medicalRecords
필드:
  - petId (Ascending)
  - createdAt (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl9-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21lZGljYWxSZWNvcmRzL2luZGV4ZXMvXxABGgkKBXBldElkEAEaCwoHY3JlYXRlZEF0EAI
```

---

### 6. clinicStaff (병원 직원 컬렉션)

#### 6-1. 사용자별 병원 목록 조회
```
컬렉션: clinicStaff
필드:
  - userId (Ascending)
  - isActive (Ascending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl1-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NsaW5pY1N0YWZmL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGgoKBmlzQWN0aXZlEAE
```

---

### 7. clinicPatients (환자 목록 컬렉션)

#### 7-1. 병원별 환자 목록 조회
```
컬렉션: clinicPatients
필드:
  - clinicId (Ascending)
  - lastVisitDate (Descending)
```

**Firebase Console 링크:**
```
https://console.firebase.google.com/project/[YOUR-PROJECT-ID]/firestore/indexes?create_composite=Cl5-cHJvamVjdHMvW1lPVVItUFJPSkVDVC1JRF0vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NsaW5pY1BhdGllbnRzL2luZGV4ZXMvXxABGgoKBmNsaW5pY0lkEAEaDwoLbGFzdFZpc2l0RGF0ZRAC
```

---

## 📝 인덱스 생성 방법

### 방법 1: Firebase Console에서 수동 생성

1. Firebase Console (https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. Firestore Database > 인덱스 탭으로 이동
4. "인덱스 추가" 버튼 클릭
5. 위 목록의 각 인덱스를 하나씩 생성

### 방법 2: 앱 실행 중 자동 생성

1. 앱을 실행하고 각 기능을 테스트합니다
2. 콘솔에 나타나는 인덱스 생성 링크를 클릭합니다
3. Firebase Console에서 자동으로 인덱스가 생성됩니다

### 방법 3: firestore.indexes.json 사용

프로젝트 루트에 `firestore.indexes.json` 파일을 생성하고 다음 내용을 추가합니다:

```json
{
  "indexes": [
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicName", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "diagnoses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "diagnoses",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clinicResults",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clinicResults",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "visitDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "preQuestionnaires",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "preQuestionnaires",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "medicalRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "medicalRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "medicalRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "petId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clinicStaff",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "clinicPatients",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clinicId", "order": "ASCENDING" },
        { "fieldPath": "lastVisitDate", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

그 다음 Firebase CLI로 배포:

```bash
firebase deploy --only firestore:indexes
```

---

## ⚠️ 주의사항

1. **인덱스 생성 시간:** 인덱스 생성에는 몇 분에서 몇 시간이 걸릴 수 있습니다.
2. **비용:** 인덱스는 저장 공간을 차지하므로 비용이 발생할 수 있습니다.
3. **필수 여부:** 위 인덱스는 모두 필수입니다. 하나라도 없으면 해당 쿼리에서 에러가 발생합니다.
4. **테스트:** 인덱스 생성 후 반드시 각 기능을 테스트하여 정상 동작하는지 확인하세요.

---

## 📚 참고 자료

- [Firestore 인덱스 공식 문서](https://firebase.google.com/docs/firestore/query-data/indexing)
- [복합 인덱스 관리](https://firebase.google.com/docs/firestore/query-data/index-overview)
