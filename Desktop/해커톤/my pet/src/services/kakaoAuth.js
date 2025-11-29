/**
 * 카카오 로그인 서비스
 */

const KAKAO_JS_KEY = '72f88f8c8193dd28d0539df80f16ab87';

// Kakao SDK 초기화 상태
let isKakaoInitialized = false;

/**
 * Kakao SDK 초기화
 */
export const initKakao = () => {
  return new Promise((resolve, reject) => {
    // 이미 초기화되어 있으면 바로 반환
    if (isKakaoInitialized && window.Kakao?.isInitialized()) {
      resolve(true);
      return;
    }

    // Kakao SDK가 로드되어 있는지 확인
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      isKakaoInitialized = true;
      resolve(true);
    } else {
      // SDK가 아직 로드되지 않았으면 대기
      const checkKakao = setInterval(() => {
        if (window.Kakao) {
          clearInterval(checkKakao);
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(KAKAO_JS_KEY);
          }
          isKakaoInitialized = true;
          resolve(true);
        }
      }, 100);

      // 5초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkKakao);
        reject(new Error('Kakao SDK 로딩 실패'));
      }, 5000);
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
