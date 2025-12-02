/**
 * Firebase Authentication 서비스
 * 이메일/비밀번호 및 구글 로그인 지원
 */
import { auth } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { userService } from './firestore';

// Google 로그인 프로바이더
const googleProvider = new GoogleAuthProvider();

// 모바일 기기 감지
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 임베디드 브라우저(WebView) 감지
const isEmbeddedBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  // 카카오톡, 인스타그램, 페이스북 등의 인앱 브라우저 감지
  return /KAKAOTALK|FBAN|FBAV|Instagram|Line|NAVER|Daum/i.test(ua) ||
    // 일반 WebView 감지
    (ua.indexOf('wv') > -1) ||
    // iOS WebView
    (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua));
};

// ============ 인증 서비스 ============
export const authService = {
  // 이메일/비밀번호로 회원가입
  async register(email, password, displayName, userMode = 'guardian') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 프로필 업데이트
      await updateProfile(user, { displayName });

      // Firestore에 사용자 정보 저장
      await userService.saveUser(user.uid, {
        email: user.email,
        displayName,
        userMode,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName,
          userMode,
          roles: [],
          defaultClinicId: null
        }
      };
    } catch (error) {
      console.error('회원가입 오류:', error);
      let message = '회원가입에 실패했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        message = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        message = '비밀번호는 6자 이상이어야 합니다.';
      } else if (error.code === 'auth/invalid-email') {
        message = '유효하지 않은 이메일 형식입니다.';
      }
      return { success: false, error: message };
    }
  },

  // 이메일/비밀번호로 로그인
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore에서 사용자 정보 가져오기
      const userDoc = await userService.getUser(user.uid);
      const userData = userDoc.data || {};

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userData.displayName,
          userMode: userData.userMode || 'guardian',
          roles: userData.roles || [],
          defaultClinicId: userData.defaultClinicId || null
        }
      };
    } catch (error) {
      console.error('로그인 오류:', error);
      let message = '로그인에 실패했습니다.';
      if (error.code === 'auth/user-not-found') {
        message = '등록되지 않은 이메일입니다.';
      } else if (error.code === 'auth/wrong-password') {
        message = '비밀번호가 일치하지 않습니다.';
      } else if (error.code === 'auth/invalid-credential') {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      }
      return { success: false, error: message };
    }
  },

  // 구글 로그인
  async loginWithGoogle(userMode = 'guardian') {
    try {
      // 임베디드 브라우저(카카오톡, 인스타 등)인 경우 외부 브라우저로 안내
      if (isEmbeddedBrowser()) {
        const currentUrl = window.location.href;
        // 외부 브라우저로 열기 시도
        if (/android/i.test(navigator.userAgent)) {
          // Android: intent로 Chrome 열기
          window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
        } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // iOS: Safari로 열기
          window.location.href = currentUrl;
        }
        return {
          success: false,
          error: '인앱 브라우저에서는 구글 로그인이 지원되지 않습니다.\n\n외부 브라우저(Safari, Chrome)에서 열어주세요.\n\n우측 상단 메뉴(⋮ 또는 ⋯) → "기본 브라우저에서 열기"',
          isEmbeddedBrowser: true
        };
      }

      // popup 방식 사용 (COOP 경고가 나와도 작동함)
      try {
        console.log('구글 로그인 팝업 시작');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Firestore에 사용자 정보 저장
        let userData = {};
        try {
          const existingUser = await userService.getUser(user.uid);
          userData = existingUser.data || {};
          if (!existingUser.data) {
            await userService.saveUser(user.uid, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              userMode,
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('Firestore 오류 (무시):', e);
        }

        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            userMode: userData.userMode || userMode,
            roles: userData.roles || [],
            defaultClinicId: userData.defaultClinicId || null
          }
        };
      } catch (popupError) {
        console.error('팝업 로그인 실패:', popupError);
        return { success: false, error: '구글 로그인에 실패했습니다: ' + popupError.message };
      }
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      return { success: false, error: '구글 로그인에 실패했습니다: ' + error.message };
    }
  },

  // 리다이렉트 결과 처리 (모바일에서 구글 로그인 후 호출)
  async handleRedirectResult() {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const user = result.user;
        const userMode = sessionStorage.getItem('pendingUserMode') || 'guardian';
        sessionStorage.removeItem('pendingUserMode');

        // Firestore에서 기존 사용자 정보 확인 (실패해도 로그인은 진행)
        let userData = {};
        try {
          const existingUser = await userService.getUser(user.uid);
          userData = existingUser.data || {};

          if (!existingUser.data) {
            // 신규 사용자면 Firestore에 저장 시도
            await userService.saveUser(user.uid, {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              userMode,
              createdAt: new Date().toISOString()
            });
          }
        } catch (firestoreError) {
          console.warn('Firestore 접근 실패 (로그인은 계속 진행):', firestoreError);
        }

        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            userMode: userData.userMode || userMode,
            roles: userData.roles || [],
            defaultClinicId: userData.defaultClinicId || null
          }
        };
      }
      return { success: false, noResult: true };
    } catch (error) {
      console.error('리다이렉트 결과 처리 오류:', error);
      return { success: false, error: '구글 로그인 처리 중 오류가 발생했습니다.' };
    }
  },

  // 비밀번호 재설정 이메일 발송
  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      let errorMessage = '비밀번호 재설정 이메일 발송에 실패했습니다.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = '등록되지 않은 이메일입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      }
      return { success: false, error: errorMessage };
    }
  },

  // 로그아웃
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('로그아웃 오류:', error);
      return { success: false, error: '로그아웃에 실패했습니다.' };
    }
  },

  // 사용자 모드 업데이트
  async updateUserMode(uid, userMode) {
    try {
      await userService.saveUser(uid, { userMode });
      return { success: true };
    } catch (error) {
      console.error('모드 업데이트 오류:', error);
      return { success: false, error };
    }
  },

  // 현재 사용자 가져오기
  getCurrentUser() {
    return auth.currentUser;
  },

  // 인증 상태 변경 리스너
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firestore에서 추가 정보 가져오기
        const userDoc = await userService.getUser(user.uid);
        const userData = userDoc.data || {};
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userData.displayName,
          photoURL: user.photoURL,
          userMode: userData.userMode || 'guardian',
          roles: userData.roles || [],
          defaultClinicId: userData.defaultClinicId || null
        });
      } else {
        callback(null);
      }
    });
  }
};

export default authService;
