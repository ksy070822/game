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
  updateProfile
} from 'firebase/auth';
import { userService } from './firestore';

// Google 로그인 프로바이더
const googleProvider = new GoogleAuthProvider();

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
          userMode
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
          userMode: userData.userMode || 'guardian'
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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Firestore에서 기존 사용자 정보 확인
      const existingUser = await userService.getUser(user.uid);

      if (!existingUser.data) {
        // 신규 사용자면 Firestore에 저장
        await userService.saveUser(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          userMode,
          createdAt: new Date().toISOString()
        });
      }

      const userData = existingUser.data || {};

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          userMode: userData.userMode || userMode
        }
      };
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      let message = '구글 로그인에 실패했습니다.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = '로그인이 취소되었습니다.';
      }
      return { success: false, error: message };
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
          userMode: userData.userMode || 'guardian'
        });
      } else {
        callback(null);
      }
    });
  }
};

export default authService;
