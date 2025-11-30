/**
 * 카카오 로그인 서비스
 */

const KAKAO_JS_KEY = '72f88f8c8193dd28d0539df80f16ab87';
const KAKAO_REDIRECT_URI = window.location.origin + '/oauth/kakao/callback';

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
    script.integrity = 'sha384-6MFdIr0zOira1CHQkedUqJVql0YtcZA1P0nbPrQYJXVJZUkTk/oX4U9GhUIs3/z8';
    script.crossOrigin = 'anonymous';
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
 */
export const loginWithKakao = (userMode = 'guardian') => {
  return new Promise(async (resolve, reject) => {
    try {
      await initKakao();

      // 모바일 또는 임베디드 브라우저에서는 리다이렉트 방식 사용
      if (isMobile() || isEmbeddedBrowser()) {
        // 유저 모드 저장
        sessionStorage.setItem('pendingUserMode', userMode);
        sessionStorage.setItem('pendingKakaoLogin', 'true');

        // 리다이렉트 방식으로 로그인
        window.Kakao.Auth.authorize({
          redirectUri: KAKAO_REDIRECT_URI,
          scope: 'profile_nickname,profile_image,account_email',
        });

        // 리다이렉트 되므로 여기서 반환
        resolve({ success: false, redirecting: true });
        return;
      }

      // 데스크톱에서는 팝업 방식 사용 (타임아웃 추가)
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject({ success: false, error: '카카오 로그인 시간이 초과되었습니다. 팝업이 차단되었는지 확인해주세요.' });
        }
      }, 60000); // 60초 타임아웃

      window.Kakao.Auth.login({
        success: (authObj) => {
          if (isResolved) return;
          clearTimeout(timeout);

          // 사용자 정보 가져오기
          window.Kakao.API.request({
            url: '/v2/user/me',
            success: (res) => {
              if (isResolved) return;
              isResolved = true;

              const kakaoUser = {
                uid: `kakao_${res.id}`,
                email: res.kakao_account?.email || `kakao_${res.id}@kakao.com`,
                displayName: res.kakao_account?.profile?.nickname || '카카오 사용자',
                photoURL: res.kakao_account?.profile?.profile_image_url || null,
                provider: 'kakao',
                kakaoId: res.id,
                accessToken: authObj.access_token,
              };
              resolve({ success: true, user: kakaoUser });
            },
            fail: (error) => {
              if (isResolved) return;
              isResolved = true;
              console.error('카카오 사용자 정보 조회 실패:', error);
              reject({ success: false, error: '사용자 정보를 가져올 수 없습니다.' });
            },
          });
        },
        fail: (error) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          console.error('카카오 로그인 실패:', error);
          reject({ success: false, error: '카카오 로그인에 실패했습니다.' });
        },
      });
    } catch (error) {
      console.error('카카오 초기화 실패:', error);
      reject({ success: false, error: 'Kakao SDK 초기화에 실패했습니다.' });
    }
  });
};

/**
 * 카카오 리다이렉트 결과 처리 (모바일용)
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

      // URL에서 인증 코드 확인
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        sessionStorage.removeItem('pendingKakaoLogin');
        resolve({ success: false, noCode: true });
        return;
      }

      await initKakao();

      // 액세스 토큰이 이미 있는지 확인
      const accessToken = window.Kakao.Auth.getAccessToken();

      if (accessToken) {
        // 사용자 정보 가져오기
        window.Kakao.API.request({
          url: '/v2/user/me',
          success: (res) => {
            const userMode = sessionStorage.getItem('pendingUserMode') || 'guardian';
            sessionStorage.removeItem('pendingKakaoLogin');
            sessionStorage.removeItem('pendingUserMode');

            // URL에서 code 파라미터 제거
            window.history.replaceState({}, document.title, window.location.pathname);

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
          },
          fail: (error) => {
            sessionStorage.removeItem('pendingKakaoLogin');
            console.error('카카오 사용자 정보 조회 실패:', error);
            reject({ success: false, error: '사용자 정보를 가져올 수 없습니다.' });
          },
        });
      } else {
        // 인증 코드로 토큰을 받아야 하는 경우 (서버 사이드 처리 필요)
        // 클라이언트에서는 SDK로 직접 처리가 어려우므로 에러 표시
        sessionStorage.removeItem('pendingKakaoLogin');
        console.warn('카카오 리다이렉트 로그인: 서버 사이드 토큰 교환이 필요합니다.');

        // URL에서 code 파라미터 제거
        window.history.replaceState({}, document.title, window.location.pathname);

        reject({ success: false, error: '카카오 로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.' });
      }
    } catch (error) {
      sessionStorage.removeItem('pendingKakaoLogin');
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
