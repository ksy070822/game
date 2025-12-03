// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { authService } from '../services/firebaseAuth';
import { loginWithKakao, handleKakaoRedirectResult } from '../services/kakaoAuth';
import { userService } from '../services/firestore';
import { setupClinicForNewUser } from '../services/clinicService';

// Firebase 인증 상태 변경 리스너 export
export const onAuthStateChange = authService.onAuthStateChange;

// 로그아웃
export const clearAuthSession = authService.logout;

// 현재 세션 (Firestore 데이터 포함)
export const getAuthSession = async () => {
  const user = authService.getCurrentUser();
  if (!user) return null;

  try {
    // Firestore에서 사용자 정보 가져오기
    const userDoc = await userService.getUser(user.uid);
    const userData = userDoc.data || {};

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || userData.displayName,
      photoURL: user.photoURL,
      userMode: userData.userMode || 'guardian',
      roles: userData.roles || [],
      defaultClinicId: userData.defaultClinicId || null
    };
  } catch (error) {
    console.error('세션 정보 로드 실패:', error);
    // Firestore 실패 시 기본 정보만 반환
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      userMode: 'guardian',
      roles: [],
      defaultClinicId: null
    };
  }
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
  const [showEmailForm, setShowEmailForm] = useState(false); // 이메일 로그인 폼 표시 여부
  const [showPasswordReset, setShowPasswordReset] = useState(false); // 비밀번호 찾기 폼 표시
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // 페이지 로드 시 리다이렉트 결과 확인 (모바일 구글/카카오 로그인)
  useEffect(() => {
    const checkRedirectResult = async () => {
      // 리다이렉트 대기 상태인 경우만 로딩 표시
      const hasPendingGoogle = sessionStorage.getItem('pendingUserMode');
      const hasPendingKakao = sessionStorage.getItem('pendingKakaoLogin');

      if (!hasPendingGoogle && !hasPendingKakao) {
        return; // 리다이렉트 대기 중이 아니면 체크하지 않음
      }

      setLoading(true);
      try {
        // 구글 리다이렉트 결과 확인
        if (hasPendingGoogle) {
          const savedUserMode = hasPendingGoogle; // sessionStorage에 저장된 userMode
          const googleResult = await authService.handleRedirectResult();
          if (googleResult.success) {
            sessionStorage.removeItem('pendingUserMode');
            onLogin({ ...googleResult.user, userMode: savedUserMode });
            setLoading(false);
            return;
          }
        }

        // 카카오 리다이렉트 결과 확인
        if (hasPendingKakao) {
          try {
            const kakaoResult = await handleKakaoRedirectResult();
            if (kakaoResult.success) {
              // Firestore에 사용자 정보 저장 시도
              try {
                await userService.saveUser(kakaoResult.user.uid, {
                  email: kakaoResult.user.email,
                  displayName: kakaoResult.user.displayName,
                  photoURL: kakaoResult.user.photoURL,
                  provider: 'kakao',
                  userMode: kakaoResult.user.userMode,
                  createdAt: new Date().toISOString()
                });
              } catch (firestoreError) {
                console.warn('Firestore 저장 실패 (로그인은 계속 진행):', firestoreError);
              }
              onLogin(kakaoResult.user);
            }
          } catch (kakaoError) {
            if (kakaoError.error) {
              setError(kakaoError.error);
            }
            console.error('카카오 리다이렉트 결과 확인 실패:', kakaoError);
          }
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

  // 비밀번호 재설정 핸들러
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);

    const result = await authService.sendPasswordReset(resetEmail);
    if (result.success) {
      setResetSuccess(true);
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
        // Firestore에 사용자 정보 저장 시도 (실패해도 로그인은 진행)
        try {
          await userService.saveUser(result.user.uid, {
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            provider: 'kakao',
            userMode,
            createdAt: new Date().toISOString()
          });
        } catch (firestoreError) {
          console.warn('Firestore 저장 실패 (로그인은 계속 진행):', firestoreError);
        }

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
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 pt-12">
      {/* 로고 - 가운데 정렬 */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}icon/login/logo.png`}
            alt="PetMedical.AI"
            className="w-20 h-20 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-900 font-display">PetMedical.AI</h1>
          <p className="text-slate-500 text-base">AI 기반 반려동물 건강 관리 서비스</p>
        </div>
      </div>

      {/* 모드 선택 카드 */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setUserMode('guardian')}
            className={`flex-1 py-4 px-3 rounded-xl bg-white shadow-md transition-all flex flex-col items-center ${
              userMode === 'guardian'
                ? 'ring-2 ring-cyan-500 bg-cyan-50'
                : 'hover:shadow-lg'
            }`}
          >
            <div className="w-24 h-24 flex items-center justify-center mb-2">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/main_friend.png`}
                alt="보호자"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-slate-800 text-base">보호자</span>
            <span className="text-xs text-slate-500 mt-1">반려동물 건강 관리</span>
          </button>
          <button
            type="button"
            onClick={() => setUserMode('clinic')}
            className={`flex-1 py-4 px-3 rounded-xl bg-white shadow-md transition-all flex flex-col items-center ${
              userMode === 'clinic'
                ? 'ring-2 ring-cyan-500 bg-cyan-50'
                : 'hover:shadow-lg'
            }`}
          >
            <div className="w-24 h-24 flex items-center justify-center mb-2">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/main_hospital.png`}
                alt="병원"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-slate-800 text-base">병원</span>
            <span className="text-xs text-slate-500 mt-1">예약 및 환자 관리</span>
          </button>
        </div>
      </div>

      {/* 이메일 로그인 */}
      <div className="w-full max-w-sm">
        {!showEmailForm ? (
          /* 이메일로 시작하기 버튼 */
          <button
            onClick={() => setShowEmailForm(true)}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                로딩 중...
              </>
            ) : (
              '이메일로 시작하기'
            )}
          </button>
        ) : showPasswordReset ? (
          /* 비밀번호 찾기 폼 */
          <div className="space-y-4">
            {resetSuccess ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">📧</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">이메일을 확인해주세요</h3>
                <p className="text-sm text-slate-600 mb-4">
                  {resetEmail}로 비밀번호 재설정 링크를 보냈습니다.
                </p>
                <button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all"
                >
                  로그인으로 돌아가기
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🔐</div>
                  <h3 className="font-bold text-slate-800">비밀번호 찾기</h3>
                  <p className="text-sm text-slate-500">가입한 이메일로 재설정 링크를 보내드려요</p>
                </div>
                <input
                  type="email"
                  placeholder="가입한 이메일"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50"
                >
                  {loading ? '전송 중...' : '재설정 링크 보내기'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setError('');
                  }}
                  className="w-full py-2 text-slate-500 text-sm hover:text-slate-700"
                >
                  ← 뒤로
                </button>
              </form>
            )}
          </div>
        ) : (
          /* 이메일 로그인 폼 */
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">이메일 로그인</h3>
              <p className="text-xs text-slate-500 mt-1">이메일과 비밀번호를 입력하세요</p>
            </div>
            <div>
              <input
                type="email"
                placeholder="이메일"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
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
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="text-slate-500 text-sm hover:text-slate-700"
              >
                ← 다른 방법으로 로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(true);
                  setError('');
                }}
                className="text-cyan-600 text-sm hover:underline font-medium"
              >
                비밀번호 찾기
              </button>
            </div>
            <div className="text-center pt-2 border-t border-slate-200 mt-4">
              <span className="text-slate-500 text-sm">계정이 없으신가요? </span>
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-cyan-600 font-bold text-sm hover:underline"
              >
                회원가입
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5">error</span>
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        {/* 소셜 로그인 */}
        {!showEmailForm && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gradient-to-b from-cyan-50 to-blue-50 text-slate-500">또는</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              {/* 카카오 로그인 */}
              <button
                onClick={handleKakaoLogin}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] transition-colors disabled:opacity-50 font-medium"
              >
                <span className="text-lg">●</span>
                <span className="text-slate-900 font-bold">카카오</span>
              </button>

              {/* 구글 로그인 버튼 */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <span className="text-lg font-bold text-blue-500">G</span>
                <span className="font-bold text-slate-700">구글</span>
              </button>
            </div>
          </div>
        )}

        {/* 회원가입 링크 - 이메일 폼이 열려있지 않을 때만 표시 */}
        {!showEmailForm && !showPasswordReset && (
          <div className="mt-8 text-center">
            <span className="text-slate-500 text-sm">계정이 없으신가요? </span>
            <button
              onClick={onGoToRegister}
              className="text-cyan-600 font-bold text-sm hover:underline"
            >
              회원가입
            </button>
          </div>
        )}

        {/* 테스트용 바로 입장 버튼 - 선택한 모드의 테스트 계정으로 자동 로그인 */}
        {onSkipLogin && (
          <div className="mt-4">
            <button
              onClick={() => onSkipLogin(userMode)}
              className="w-full py-3 bg-white/80 text-cyan-700 font-medium rounded-xl hover:bg-white transition-all flex items-center justify-center gap-2 border border-cyan-200 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              로그인 없이 바로 입장하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 회원가입 화면
export function RegisterScreen({ onRegister, onGoToLogin }) {
  const [step, setStep] = useState(1); // 1: 역할선택, 2: 기본정보, 3: 약관동의, 4: 완료
  const [formData, setFormData] = useState({
    userMode: '', // 'guardian' or 'clinic'
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    gender: '', // 선택: 'male', 'female', ''
    birthYear: '', // 선택: 출생연도
    // 병원 전용 필드
    clinicName: '', // 병원명
    clinicAddress: '', // 병원 주소
    clinicPhone: '', // 병원 연락처
    licenseNumber: '', // 사업자등록번호
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  const validateStep2 = () => {
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
    // 병원 모드일 경우 추가 검증
    if (formData.userMode === 'clinic') {
      if (!formData.clinicName || formData.clinicName.length < 2) {
        setError('병원명을 입력해주세요.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.userMode) {
        setError('역할을 선택해주세요.');
        return;
      }
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    // Firebase로 회원가입 (userMode도 전달)
    const result = await authService.register(
      formData.email,
      formData.password,
      formData.name,
      formData.userMode // userMode 전달
    );

    if (result.success) {
      // Firestore에 추가 사용자 정보 저장 (병원 정보 등 추가 필드)
      try {
        const additionalData = {
          phone: formData.phone || null,
          gender: formData.gender || null,
          ageGroup: formData.birthYear || null,
          agreeMarketing: formData.agreeMarketing
        };

        // 병원 모드일 경우: clinics 및 clinicStaff 컬렉션에 데이터 생성
        if (formData.userMode === 'clinic') {
          const clinicInfo = {
            name: formData.clinicName,
            address: formData.clinicAddress || null,
            phone: formData.clinicPhone || null,
            licenseNumber: formData.licenseNumber || null
          };

          // 병원 생성 및 스태프 등록
          const setupResult = await setupClinicForNewUser(result.user.uid, clinicInfo);

          if (setupResult.success) {
            additionalData.defaultClinicId = setupResult.clinicId;
            additionalData.roles = [{ clinicId: setupResult.clinicId, role: 'director' }];
          } else {
            console.warn('병원 설정 실패:', setupResult.error);
          }
        }

        // 추가 정보만 업데이트 (기본 정보는 authService.register에서 이미 저장됨)
        await userService.saveUser(result.user.uid, additionalData);
      } catch (firestoreError) {
        console.warn('Firestore 추가 정보 저장 실패:', firestoreError);
      }

      setRegisteredUser({ ...result.user, userMode: formData.userMode });
      setStep(4);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 pt-12">
      {/* 로고 */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg mx-auto mb-3 flex items-center justify-center">
          <img
            src={`${import.meta.env.BASE_URL}icon/login/logo.png`}
            alt="PetMedical.AI"
            className="w-10 h-10 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-900 font-display">회원가입</h1>
      </div>

      {/* 진행 상태 */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s <= step ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {s === 4 && step === 4 ? '✓' : s}
              </div>
              {s < 4 && (
                <div className={`w-8 h-1 ${s < step ? 'bg-primary' : 'bg-slate-200'}`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
          <span>역할선택</span>
          <span>기본정보</span>
          <span>약관동의</span>
          <span>완료</span>
        </div>
      </div>

      {/* 폼 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        {/* Step 1: 역할 선택 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">어떤 용도로 사용하시나요?</h3>
              <p className="text-sm text-slate-500 mt-1">사용 목적에 맞는 역할을 선택해주세요</p>
            </div>

            <div className="space-y-3">
              {/* 보호자 선택 */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userMode: 'guardian' })}
                className={`w-full p-5 rounded-xl border-2 transition-all flex items-start gap-4 text-left ${
                  formData.userMode === 'guardian'
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  formData.userMode === 'guardian' ? 'bg-cyan-100' : 'bg-slate-100'
                }`}>
                  <img
                    src={`${import.meta.env.BASE_URL}icon/login/main_friend.png`}
                    alt="보호자"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">보호자</span>
                    {formData.userMode === 'guardian' && (
                      <span className="text-cyan-500 text-sm font-bold">✓ 선택됨</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    반려동물의 건강을 관리하고, AI 진료 및 병원 예약 서비스를 이용합니다.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">AI 진료</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">건강관리</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">병원예약</span>
                  </div>
                </div>
              </button>

              {/* 병원 선택 */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userMode: 'clinic' })}
                className={`w-full p-5 rounded-xl border-2 transition-all flex items-start gap-4 text-left ${
                  formData.userMode === 'clinic'
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  formData.userMode === 'clinic' ? 'bg-cyan-100' : 'bg-slate-100'
                }`}>
                  <img
                    src={`${import.meta.env.BASE_URL}icon/login/main_hospital.png`}
                    alt="병원"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">병원 (수의사/스태프)</span>
                    {formData.userMode === 'clinic' && (
                      <span className="text-cyan-500 text-sm font-bold">✓ 선택됨</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    동물병원 관계자로서 예약 관리 및 환자 정보를 확인합니다.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">예약관리</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">환자정보</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">진료기록</span>
                  </div>
                </div>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              onClick={handleNextStep}
              disabled={!formData.userMode}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2: 기본정보 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/${formData.userMode === 'guardian' ? 'main_friend.png' : 'main_hospital.png'}`}
                alt={formData.userMode === 'guardian' ? '보호자' : '병원'}
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium text-slate-500">
                {formData.userMode === 'guardian' ? '보호자' : '병원'} 회원가입
              </span>
            </div>

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

            {/* 병원 모드일 경우 추가 필드 */}
            {formData.userMode === 'clinic' && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <img
                    src={`${import.meta.env.BASE_URL}icon/login/main_hospital.png`}
                    alt="병원"
                    className="w-5 h-5 object-contain"
                  />
                  병원 정보
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">병원명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="행복 동물병원"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">병원 주소</label>
                  <input
                    type="text"
                    placeholder="서울시 강남구 테헤란로 123"
                    value={formData.clinicAddress}
                    onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">병원 연락처</label>
                  <input
                    type="tel"
                    placeholder="02-1234-5678"
                    value={formData.clinicPhone}
                    onChange={(e) => setFormData({ ...formData, clinicPhone: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">사업자등록번호</label>
                  <input
                    type="text"
                    placeholder="123-45-67890"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* 보호자 모드일 경우 선택 정보 */}
            {formData.userMode === 'guardian' && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-400 mb-3">선택 정보</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">성별</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                    >
                      <option value="">선택안함</option>
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">연령대</label>
                    <select
                      value={formData.birthYear}
                      onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                    >
                      <option value="">선택안함</option>
                      <option value="10대">10대</option>
                      <option value="20대">20대</option>
                      <option value="30대">30대</option>
                      <option value="40대">40대</option>
                      <option value="50대">50대</option>
                      <option value="60대">60대</option>
                      <option value="70대 이상">70대 이상</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

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
                onClick={handleNextStep}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 약관동의 */}
        {step === 3 && (
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
                onClick={() => setStep(2)}
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

        {/* Step 4: 완료 */}
        {step === 4 && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">가입 완료!</h3>
            <p className="text-slate-500 mb-2">
              환영합니다, {formData.name}님!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full mb-6">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/${formData.userMode === 'guardian' ? 'main_friend.png' : 'main_hospital.png'}`}
                alt={formData.userMode === 'guardian' ? '보호자' : '병원'}
                className="w-6 h-6 object-contain"
              />
              <span className="text-sm font-medium text-slate-700">
                {formData.userMode === 'guardian' ? '보호자' : '병원'} 회원
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-6">
              {formData.userMode === 'guardian'
                ? '이제 반려동물을 등록하고 서비스를 이용해보세요.'
                : '이제 병원 대시보드에서 예약 및 환자를 관리할 수 있습니다.'}
            </p>
            <button
              onClick={() => onRegister(registeredUser)}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              시작하기
            </button>
          </div>
        )}

        {step < 4 && (
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
