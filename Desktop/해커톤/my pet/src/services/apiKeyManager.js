/**
 * API 키 관리 서비스
 * 환경변수에서 API 키를 불러옵니다 (유저용 앱이므로 직접 입력 불가)
 */

// 지원하는 API 키 타입
export const API_KEY_TYPES = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
};

/**
 * 특정 API 키 가져오기 (환경변수에서)
 */
export const getApiKey = (keyType) => {
  switch (keyType) {
    case API_KEY_TYPES.GEMINI:
      return import.meta.env.VITE_GEMINI_API_KEY || null;
    case API_KEY_TYPES.OPENAI:
      return import.meta.env.VITE_OPENAI_API_KEY || null;
    case API_KEY_TYPES.ANTHROPIC:
      return import.meta.env.VITE_ANTHROPIC_API_KEY || null;
    default:
      return null;
  }
};

/**
 * 모든 API 키 가져오기 (환경변수에서)
 */
export const getAllApiKeys = () => {
  return {
    [API_KEY_TYPES.GEMINI]: getApiKey(API_KEY_TYPES.GEMINI),
    [API_KEY_TYPES.OPENAI]: getApiKey(API_KEY_TYPES.OPENAI),
    [API_KEY_TYPES.ANTHROPIC]: getApiKey(API_KEY_TYPES.ANTHROPIC)
  };
};

/**
 * API 키 설정 여부 확인
 */
export const isApiKeyConfigured = (keyType) => {
  return !!getApiKey(keyType);
};

/**
 * 필요한 API 키 목록 확인
 */
export const getRequiredApiKeysStatus = () => {
  return {
    gemini: {
      configured: isApiKeyConfigured(API_KEY_TYPES.GEMINI),
      label: 'Google Gemini',
      description: 'AI 진단, 케어 가이드 생성에 사용'
    },
    openai: {
      configured: isApiKeyConfigured(API_KEY_TYPES.OPENAI),
      label: 'OpenAI',
      description: 'Medical Agent 진단에 사용 (선택)'
    },
    anthropic: {
      configured: isApiKeyConfigured(API_KEY_TYPES.ANTHROPIC),
      label: 'Anthropic Claude',
      description: 'Medical Agent, Triage, Ops Agent 핵심 진단에 사용'
    }
  };
};

// 더 이상 사용하지 않는 함수들 (하위 호환성 유지)
export const saveApiKey = () => {
  console.warn('API 키 저장은 환경변수로만 관리됩니다.');
  return false;
};

export const saveAllApiKeys = () => {
  console.warn('API 키 저장은 환경변수로만 관리됩니다.');
  return false;
};

export const deleteApiKey = () => {
  console.warn('API 키 삭제는 환경변수로만 관리됩니다.');
  return false;
};

export const clearAllApiKeys = () => {
  console.warn('API 키 삭제는 환경변수로만 관리됩니다.');
  return false;
};

export default {
  API_KEY_TYPES,
  getAllApiKeys,
  getApiKey,
  saveApiKey,
  saveAllApiKeys,
  deleteApiKey,
  clearAllApiKeys,
  isApiKeyConfigured,
  getRequiredApiKeysStatus
};
