# 병원모드 예약/진료 상태 플로우 & UI 수정

## 📋 개요
병원모드의 예약 상태 플로우를 일관되게 정리하고, UI 버튼/라벨이 상태에 따라 정확히 반영되도록 수정했습니다.

## 🎯 주요 변경사항

### 1. 예약 상태 의미 재정의
- **pending**: 보호자 예약 신청 후, 병원에서 확인 전 상태 ("확인 대기")
- **confirmed**: 병원이 "예약 확정"을 눌러 진료 예정 상태 ("예약 확정됨")
- **completed**: 진단서 작성 완료 + 보호자에게 공유까지 끝난 상태 ("완료")
  - ⚠️ 기존: 진단서 저장 시점에 `completed`로 변경
  - ✅ 변경: 보호자 공유 완료 시점에 `completed`로 변경

### 2. TreatmentSheet 수정
- ✅ `handleSave`에서 `completed` 상태 변경 제거 (저장 시에는 `confirmed` 유지)
- ✅ `handleShareToGuardian`에서 공유 성공 후 `completed`로 변경
- ✅ `useEffect`로 기존 `clinicResults` 조회하여 `isSaved`/`lastResultId` 초기화
- ✅ `onShared` prop 추가 (공유 완료 콜백)
- ✅ 필수 필드 방어 로직 추가 (`clinic.id`, `booking.id`, `booking.userId`, `booking.petId`)

### 3. ClinicDashboard 수정
- ✅ `TreatmentSheet`에 `onShared` 콜백 추가
- ✅ `onSaved`에서 모달 자동 닫기 제거 (저장 후에도 모달 유지하여 "보호자에게 공유하기" 버튼 표시)
- ✅ `enrichBookingWithResult` 헬퍼 함수 추가 (booking에 `hasResult`, `sharedToGuardian` 필드 추가)
- ✅ 오늘 예약 카드 버튼/라벨 상태 분기 구현:
  - `pending`: "확인 대기" / "예약 확정" (활성) / "진료 시작" (비활성)
  - `confirmed` & `!hasResult`: "예약 확정됨" / "예약 확정됨" (비활성) / "진료 시작" (활성)
  - `confirmed` & `hasResult` & `!sharedToGuardian`: "진단서 저장됨 (공유 전)" / "예약 확정됨" (비활성) / "진료 결과 보기 / 보호자에게 공유" (활성)
  - `completed` & `sharedToGuardian`: "완료" / "완료" (뱃지) / "진료 결과 보기" (활성)
- ✅ q2(clinicName 구독) 상태 갱신 버그 수정: 기존 예약의 status 변경도 반영되도록 병합 로직 변경
- ✅ 실시간 구독(q1, q2) 및 초기 로드 시 `clinicResults` 조인 처리

## 🐛 버그 수정
- **q2 구독 버그**: `clinicName` 기반 fallback 구독에서 기존 예약의 status 변경이 반영되지 않던 문제 수정
- **TreatmentSheet UX**: 저장 후 모달이 바로 닫혀서 "보호자에게 공유하기" 버튼이 보이지 않던 문제 수정
- **상태 초기화**: 이미 저장된 진단이 있는 예약을 다시 열었을 때 `isSaved`가 `false`로 초기화되던 문제 수정

## 📝 변경된 파일
- `src/components/TreatmentSheet.jsx`
- `src/components/ClinicDashboard.jsx`

## ✅ 테스트 체크리스트
- [ ] 예약 확정 → 진료 시작 → 진단서 저장 → 보호자 공유 플로우 확인
- [ ] 상태별 버튼/라벨이 정확히 표시되는지 확인
- [ ] `clinicName` 기반 예약의 status 변경이 실시간으로 반영되는지 확인
- [ ] 이미 저장된 진단서가 있는 예약을 다시 열었을 때 올바른 상태로 표시되는지 확인

