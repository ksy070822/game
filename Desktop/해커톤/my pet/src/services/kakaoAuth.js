/**
 * 카카오 로그인 서비스
 */

const KAKAO_JS_KEY = '72f88f8c8193dd28d0539df80f16ab87';
const KAKAO_REST_API_KEY = '6a6433ff3ccbbc31a0448cae49055e4d';
const KAKAO_CLIENT_SECRET = 'jNNfgEPny8kfcQ6NLBtGmegCRa558c4m';
// 리다이렉트 URI는 현재 페이지로 설정 (카카오 개발자 콘솔에 등록 필요)
const KAKAO_REDIRECT_URI = window.location.origin + window.location.pathname;

// Kakao SDK 초기화 상태
let isKakaoInitialized = false;

/**
 * 모바일 환경 감지
 */
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * 임베디드 브라우저 감지 (카카오톡, 인스타그램 등)
 */
const isEmbeddedBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /KAKAOTALK|FBAN|FBAV|Instagram|Line|NAVER|Daum/i.test(ua) ||
    (ua.indexOf('wv') > -1) ||
    (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua));
};

/**
 * Kakao SDK 스크립트 동적 로드
 */
const loadKakaoScript = () => {
  return new Promise((resolve, reject) => {
    // 이미 스크립트가 있는지 확인
    if (window.Kakao) {
      resolve(true);
      return;
    }

    // 이미 로드 중인 스크립트가 있는지 확인
    const existingScript = document.querySelector('script[src*="kakao_js_sdk"]');
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => reject(new Error('Kakao SDK 로딩 실패'));
      return;
    }

    // 스크립트 동적 로드
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js';
    // integrity 속성 제거 - SDK 업데이트 시 해시 불일치 문제 방지
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      reject(new Error('Kakao SDK 스크립트 로딩 실패'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Kakao SDK 초기화
 */
export const initKakao = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // 이미 초기화되어 있으면 바로 반환
      if (isKakaoInitialized && window.Kakao?.isInitialized()) {
        resolve(true);
        return;
      }

      // SDK 스크립트 로드
      await loadKakaoScript();

      // SDK 로드 대기 (최대 10초)
      let attempts = 0;
      const maxAttempts = 100;

      const checkKakao = setInterval(() => {
        attempts++;

        if (window.Kakao) {
          clearInterval(checkKakao);
          try {
            if (!window.Kakao.isInitialized()) {
              window.Kakao.init(KAKAO_JS_KEY);
            }
            isKakaoInitialized = true;
            resolve(true);
          } catch (error) {
            reject(new Error('Kakao SDK 초기화 오류: ' + error.message));
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(checkKakao);
          reject(new Error('Kakao SDK 로딩 시간 초과'));
        }
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 카카오 로그인
 * REST API Authorization Code 방식
 */
export const loginWithKakao = (userMode = 'guardian') => {
  return new Promise(async (resolve, reject) => {
    try {
      // 유저 모드 저장
      sessionStorage.setItem('pendingUserMode', userMode);
      sessionStorage.setItem('pendingKakaoLogin', 'true');

      // Authorization Code 방식 (response_type=code)
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;

      window.location.href = kakaoAuthUrl;

      // 리다이렉트 되므로 여기서 반환
      resolve({ success: false, redirecting: true });
    } catch (error) {
      console.error('카카오 로그인 시작 실패:', error);
      reject({ success: false, error: '카카오 로그인을 시작할 수 없습니다.' });
    }
  });
};

/**
 * 카카오 리다이렉트 결과 처리
 * URL에서 authorization code를 추출하고 토큰 교환 후 사용자 정보 조회
 */
export const handleKakaoRedirectResult = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // 카카오 로그인 대기 중인지 확인
      const isPending = sessionStorage.getItem('pendingKakaoLogin');
      if (!isPending) {
        resolve({ success: false, noPending: true });
        return;
      }

      // URL 쿼리에서 code 또는 error 확인
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // 에러 확인
      if (error) {
        sessionStorage.removeItem('pendingKakaoLogin');
        sessionStorage.removeItem('pendingUserMode');
        window.history.replaceState({}, document.title, window.location.pathname);
        reject({ success: false, error: errorDescription || '카카오 로그인이 취소되었습니다.' });
        return;
      }

      // authorization code가 있으면 토큰 교환
      if (code) {
        // URL 정리
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          // 토큰 교환 요청 (client_secret 포함)
          const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: KAKAO_REST_API_KEY,
              client_secret: KAKAO_CLIENT_SECRET,
              redirect_uri: KAKAO_REDIRECT_URI,
              code: code
            })
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || '토큰 발급 실패');
          }

          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;

          // REST API로 사용자 정보 가져오기
          const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
          });

          if (!userResponse.ok) {
            throw new Error('사용자 정보 조회 실패');
          }

          const res = await userResponse.json();
          const userMode = sessionStorage.getItem('pendingUserMode') || 'guardian';
          sessionStorage.removeItem('pendingKakaoLogin');
          sessionStorage.removeItem('pendingUserMode');

          const kakaoUser = {
            uid: `kakao_${res.id}`,
            email: res.kakao_account?.email || `kakao_${res.id}@kakao.com`,
            displayName: res.kakao_account?.profile?.nickname || '카카오 사용자',
            photoURL: res.kakao_account?.profile?.profile_image_url || null,
            provider: 'kakao',
            kakaoId: res.id,
            userMode,
          };
          resolve({ success: true, user: kakaoUser });
        } catch (fetchError) {
          sessionStorage.removeItem('pendingKakaoLogin');
          sessionStorage.removeItem('pendingUserMode');
          console.error('카카오 로그인 처리 실패:', fetchError);
          reject({ success: false, error: fetchError.message || '카카오 로그인 처리에 실패했습니다.' });
        }
        return;
      }

      // code가 없는 경우
      sessionStorage.removeItem('pendingKakaoLogin');
      resolve({ success: false, noCode: true });
    } catch (error) {
      sessionStorage.removeItem('pendingKakaoLogin');
      sessionStorage.removeItem('pendingUserMode');
      console.error('카카오 리다이렉트 결과 처리 실패:', error);
      reject({ success: false, error: 'Kakao 로그인 처리에 실패했습니다.' });
    }
  });
};

/**
 * 카카오 로그아웃
 */
export const logoutKakao = () => {
  return new Promise(async (resolve) => {
    try {
      await initKakao();

      if (window.Kakao.Auth.getAccessToken()) {
        window.Kakao.Auth.logout(() => {
          resolve({ success: true });
        });
      } else {
        resolve({ success: true });
      }
    } catch (error) {
      console.error('카카오 로그아웃 실패:', error);
      resolve({ success: false });
    }
  });
};

/**
 * 카카오 연결 끊기 (탈퇴)
 */
export const unlinkKakao = () => {
  return new Promise(async (resolve) => {
    try {
      await initKakao();

      window.Kakao.API.request({
        url: '/v1/user/unlink',
        success: () => {
          resolve({ success: true });
        },
        fail: (error) => {
          console.error('카카오 연결 끊기 실패:', error);
          resolve({ success: false, error });
        },
      });
    } catch (error) {
      resolve({ success: false, error });
    }
  });
};

export default {
  initKakao,
  loginWithKakao,
  handleKakaoRedirectResult,
  logoutKakao,
  unlinkKakao,
};
