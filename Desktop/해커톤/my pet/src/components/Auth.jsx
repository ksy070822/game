// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { authService } from '../services/firebaseAuth';
import { loginWithKakao, handleKakaoRedirectResult } from '../services/kakaoAuth';
import { userService } from '../services/firestore';

// Firebase 인증 상태 변경 리스너 export
export const onAuthStateChange = authService.onAuthStateChange;

// 로그아웃
export const clearAuthSession = authService.logout;

// 현재 세션 (호환성 유지 - 실제로는 Firebase auth 사용)
export const getAuthSession = () => {
  const user = authService.getCurrentUser();
  return user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  } : null;
};

// 로그인 화면
export function LoginScreen({ onLogin, onGoToRegister, onSkipLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [userMode, setUserMode] = useState('guardian'); // 'guardian' or 'clinic'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 페이지 로드 시 리다이렉트 결과 확인 (모바일 구글/카카오 로그인)
  useEffect(() => {
    const checkRedirectResult = async () => {
      setLoading(true);
      try {
        // 구글 리다이렉트 결과 확인
        const googleResult = await authService.handleRedirectResult();
        if (googleResult.success) {
          onLogin(googleResult.user);
          setLoading(false);
          return;
        }

        // 카카오 리다이렉트 결과 확인
        try {
          const kakaoResult = await handleKakaoRedirectResult();
          if (kakaoResult.success) {
            // Firestore에 사용자 정보 저장
            await userService.saveUser(kakaoResult.user.uid, {
              email: kakaoResult.user.email,
              displayName: kakaoResult.user.displayName,
              photoURL: kakaoResult.user.photoURL,
              provider: 'kakao',
              userMode: kakaoResult.user.userMode,
              createdAt: new Date().toISOString()
            });
            onLogin(kakaoResult.user);
          }
        } catch (kakaoError) {
          if (kakaoError.error) {
            setError(kakaoError.error);
          }
          console.error('카카오 리다이렉트 결과 확인 실패:', kakaoError);
        }
      } catch (error) {
        console.error('리다이렉트 결과 확인 실패:', error);
      }
      setLoading(false);
    };
    checkRedirectResult();
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authService.login(formData.email, formData.password);

    if (result.success) {
      // 사용자 모드 업데이트
      await authService.updateUserMode(result.user.uid, userMode);
      onLogin({ ...result.user, userMode });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // 구글 로그인
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    const result = await authService.loginWithGoogle(userMode);

    if (result.success) {
      onLogin({ ...result.user, userMode });
    } else if (result.redirecting) {
      // 모바일에서 리다이렉트 중이면 아무것도 안함
      return;
    } else if (result.isEmbeddedBrowser) {
      // 임베디드 브라우저 안내
      setError(result.error);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  // 카카오 로그인
  const handleKakaoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await loginWithKakao(userMode);

      if (result.success) {
        // Firestore에 사용자 정보 저장
        await userService.saveUser(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          provider: 'kakao',
          userMode,
          createdAt: new Date().toISOString()
        });

        onLogin({ ...result.user, userMode });
      } else if (result.redirecting) {
        // 모바일에서 리다이렉트 중이면 아무것도 안함
        return;
      } else {
        setError(result.error || '카카오 로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('카카오 로그인 오류:', error);
      setError(error.error || '카카오 로그인에 실패했습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background-light flex flex-col items-center justify-center p-6">
      {/* 로고 */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-lg mx-auto mb-4 flex items-center justify-center">
          <span className="text-5xl">🐾</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 font-display">PetLink AI</h1>
        <p className="text-slate-500 mt-2">반려동물 건강 관리의 시작</p>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">로그인</h2>

        {/* 모드 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2 text-center">이용 모드 선택</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUserMode('guardian')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                userMode === 'guardian'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">🐾</span>
              <span className="font-semibold text-sm">보호자</span>
              <span className="text-xs opacity-70">반려동물 관리</span>
            </button>
            <button
              type="button"
              onClick={() => setUserMode('clinic')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                userMode === 'clinic'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">🏥</span>
              <span className="font-semibold text-sm">병원</span>
              <span className="text-xs opacity-70">환자 예약 관리</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input
              type="email"
              required
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input
              type="password"
              required
              placeholder="비밀번호를 입력하세요"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">error</span>
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">계정이 없으신가요?</p>
          <button
            onClick={onGoToRegister}
            className="text-primary font-medium hover:underline mt-1"
          >
            회원가입하기
          </button>
        </div>

        {/* 소셜 로그인 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">또는</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* 구글 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span className="font-medium text-slate-700">Google로 계속하기</span>
            </button>

            {/* 카카오 로그인 */}
            <button
              onClick={handleKakaoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-[#FEE500] hover:bg-[#FDD835] transition-colors disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2.14282C6.26621 2.14282 1.61035 5.94196 1.61035 10.5715C1.61035 13.4547 3.38887 15.9903 6.11035 17.4761L5.15039 21.1904C5.08984 21.4285 5.35938 21.619 5.56641 21.4761L9.91504 18.6428C10.5938 18.7618 11.291 18.8237 12 18.8237C17.7338 18.8237 22.3896 15.0246 22.3896 10.395C22.3896 5.76539 17.7338 2.14282 12 2.14282Z" fill="#191919"/>
              </svg>
              <span className="font-medium text-slate-900">카카오로 계속하기</span>
            </button>

            {/* 네이버 로그인 (준비 중) */}
            <button
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-[#03C75A] hover:bg-[#02b351] transition-colors opacity-50 cursor-not-allowed"
              disabled
              title="준비 중"
            >
              <span className="text-white font-bold text-lg">N</span>
              <span className="font-medium text-white">네이버로 계속하기</span>
            </button>
            <p className="text-xs text-slate-400 text-center">네이버 로그인은 준비 중입니다</p>
          </div>
        </div>

        {/* 테스트용 바로 입장 버튼 */}
        {onSkipLogin && (
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
            <button
              onClick={onSkipLogin}
              className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              로그인 없이 바로 입장하기
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">테스트 용도로만 사용하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 회원가입 화면
export function RegisterScreen({ onRegister, onGoToLogin }) {
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 약관동의, 3: 완료
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  const validateStep1 = () => {
    if (!formData.name || formData.name.length < 2) {
      setError('이름을 2자 이상 입력해주세요.');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('올바른 이메일을 입력해주세요.');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return false;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    // Firebase로 회원가입
    const result = await authService.register(
      formData.email,
      formData.password,
      formData.name
    );

    if (result.success) {
      setRegisteredUser(result.user);
      setStep(3);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background-light flex flex-col items-center justify-center p-6">
      {/* 로고 */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-white rounded-2xl shadow-lg mx-auto mb-3 flex items-center justify-center">
          <span className="text-4xl">🐾</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">회원가입</h1>
      </div>

      {/* 진행 상태 */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s <= step ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {s === 3 && step === 3 ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-primary' : 'bg-slate-200'}`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2 px-2">
          <span>기본정보</span>
          <span>약관동의</span>
          <span>완료</span>
        </div>
      </div>

      {/* 폼 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이름 *</label>
              <input
                type="text"
                required
                placeholder="홍길동"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이메일 *</label>
              <input
                type="email"
                required
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 *</label>
              <input
                type="password"
                required
                placeholder="6자 이상"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인 *</label>
              <input
                type="password"
                required
                placeholder="비밀번호 재입력"
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">휴대폰 번호</label>
              <input
                type="tel"
                placeholder="010-1234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              onClick={handleNextStep}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              다음
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">약관 동의</h3>

            {/* 전체 동의 */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeTerms && formData.agreePrivacy && formData.agreeMarketing}
                  onChange={(e) => setFormData({
                    ...formData,
                    agreeTerms: e.target.checked,
                    agreePrivacy: e.target.checked,
                    agreeMarketing: e.target.checked
                  })}
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                />
                <span className="font-bold text-slate-900">전체 동의</span>
              </label>
            </div>

            <div className="space-y-3 pl-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-slate-700">[필수] 이용약관 동의</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.agreePrivacy}
                    onChange={(e) => setFormData({ ...formData, agreePrivacy: e.target.checked })}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-slate-700">[필수] 개인정보 처리방침 동의</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.agreeMarketing}
                    onChange={(e) => setFormData({ ...formData, agreeMarketing: e.target.checked })}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-slate-700">[선택] 마케팅 정보 수신 동의</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    처리 중...
                  </>
                ) : (
                  '가입하기'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">가입 완료!</h3>
            <p className="text-slate-500 mb-6">
              환영합니다, {formData.name}님!<br />
              이제 반려동물을 등록하고 서비스를 이용해보세요.
            </p>
            <button
              onClick={() => onRegister(registeredUser)}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              시작하기
            </button>
          </div>
        )}

        {step < 3 && (
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">이미 계정이 있으신가요?</p>
            <button
              onClick={onGoToLogin}
              className="text-primary font-medium hover:underline mt-1"
            >
              로그인하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
