// src/components/Auth.jsx
import { useState } from 'react';

const AUTH_KEY = 'petMedical_auth';
const USERS_KEY = 'petMedical_users';

// 로컬 스토리지에서 유저 목록 가져오기
const getUsersFromStorage = () => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// 유저 저장
const saveUserToStorage = (user) => {
  try {
    const users = getUsersFromStorage();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save user:', error);
  }
};

// 현재 로그인 상태 저장
const setAuthSession = (user) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
};

// 현재 로그인 상태 가져오기
export const getAuthSession = () => {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// 로그아웃
export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_KEY);
};

// 로그인 화면
export function LoginScreen({ onLogin, onGoToRegister, onSkipLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const users = getUsersFromStorage();
      const user = users.find(
        u => u.email === formData.email && u.password === formData.password
      );

      if (user) {
        setAuthSession(user);
        onLogin(user);
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background-light flex flex-col items-center justify-center p-6">
      {/* 로고 */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-lg mx-auto mb-4 flex items-center justify-center">
          <span className="text-5xl">🐾</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 font-display">PetMedical.AI</h1>
        <p className="text-slate-500 mt-2">반려동물 건강 관리의 시작</p>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">로그인</h2>

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
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
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

        {/* 소셜 로그인 (UI만) */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">또는</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button className="flex items-center justify-center py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            </button>
            <button className="flex items-center justify-center py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-[#FEE500]">
              <span className="text-lg">💬</span>
            </button>
            <button className="flex items-center justify-center py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-[#03C75A]">
              <span className="text-white font-bold text-sm">N</span>
            </button>
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

    // 이메일 중복 체크
    const users = getUsersFromStorage();
    if (users.some(u => u.email === formData.email)) {
      setError('이미 사용 중인 이메일입니다.');
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

  const handleSubmit = () => {
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const newUser = {
        id: 'user_' + Date.now(),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        agreeMarketing: formData.agreeMarketing,
        createdAt: new Date().toISOString()
      };

      saveUserToStorage(newUser);
      setAuthSession(newUser);
      setStep(3);
      setLoading(false);
    }, 500);
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
                className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? '처리 중...' : '가입하기'}
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
              onClick={() => onRegister(getAuthSession())}
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
