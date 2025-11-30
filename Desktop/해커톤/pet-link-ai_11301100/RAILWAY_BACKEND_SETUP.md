# 프론트엔드 - 백엔드 연결 가이드

## Railway 백엔드 URL 설정 방법

Railway에서 배포가 완료되면 생성된 Public URL을 프론트엔드에 연결해야 합니다.

### 방법 1: GitHub Secrets (권장 - 프로덕션)

GitHub Actions 빌드 시 환경 변수로 주입:

1. **프론트엔드 레포지토리** (`ksy070822/ai-factory`) 접속
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. 추가:
   - **Name**: `VITE_TRIAGE_API_BASE_URL`
   - **Value**: Railway Public URL (예: `https://petcare-backend-production.up.railway.app`)
5. **Add secret** 클릭

이제 GitHub Actions가 자동으로 빌드할 때 이 환경 변수를 사용합니다.

### 방법 2: 로컬 개발 환경

프론트엔드 프로젝트의 `.env` 파일 (또는 `.env.local`)에 추가:

```env
VITE_TRIAGE_API_BASE_URL=https://your-app-name.up.railway.app
```

파일 위치: `pet-link-ai_11301100/.env`

### 방법 3: 코드에 직접 설정 (임시/발표용)

`App.jsx` 파일의 `getTriageApiBaseUrl()` 함수 수정:

```javascript
// App.jsx 약 1640번째 줄
if (isProduction) {
  // Railway 배포 URL로 직접 설정
  return 'https://your-app-name.up.railway.app';
}
```

**주의**: 이 방법은 코드에 URL이 하드코딩되므로, Railway URL이 변경되면 수동으로 업데이트해야 합니다.

---

## 배포 후 테스트

1. 프론트엔드 재배포 (GitHub Actions 자동 또는 수동)
2. GitHub Pages URL 접속: `https://ksy070822.github.io/ai-factory/`
3. AI 진단 기능 테스트
4. 브라우저 개발자 도구 (F12) → Console 탭에서 오류 확인

---

## 현재 설정 확인

`App.jsx`의 `getTriageApiBaseUrl()` 함수는 다음 우선순위로 URL을 결정합니다:

1. 환경 변수 `VITE_TRIAGE_API_BASE_URL` (최우선)
2. 프로덕션 환경 감지 시 → Railway URL (코드에 설정된 경우)
3. 로컬 개발 환경 → `http://127.0.0.1:8000`

따라서 **방법 1 (GitHub Secrets)**이 가장 권장됩니다.

