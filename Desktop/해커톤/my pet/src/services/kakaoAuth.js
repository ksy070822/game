/**
 * 카카오 로그인 서비스
 */

const KAKAO_JS_KEY = '72f88f8c8193dd28d0539df80f16ab87';

// Kakao SDK 초기화 상태
let isKakaoInitialized = false;

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
export const loginWithKakao = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await initKakao();

      window.Kakao.Auth.login({
        success: (authObj) => {
          // 사용자 정보 가져오기
          window.Kakao.API.request({
            url: '/v2/user/me',
            success: (res) => {
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
              console.error('카카오 사용자 정보 조회 실패:', error);
              reject({ success: false, error: '사용자 정보를 가져올 수 없습니다.' });
            },
          });
        },
        fail: (error) => {
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
  logoutKakao,
  unlinkKakao,
};
