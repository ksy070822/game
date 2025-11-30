/**
 * API 키 관리 서비스
 * localStorage에 API 키를 안전하게 저장하고 불러옵니다.
 */

const API_KEYS_STORAGE_KEY = 'petMedical_apiKeys';

// 지원하는 API 키 타입
export const API_KEY_TYPES = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
};

/**
 * 모든 API 키 가져오기
 */
export const getAllApiKeys = () => {
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('API 키 로드 실패:', error);
    return {};
  }
};

/**
 * 특정 API 키 가져오기
 * 우선순위: localStorage > 환경변수
 */
export const getApiKey = (keyType) => {
  const keys = getAllApiKeys();

  // localStorage에 저장된 키 우선
  if (keys[keyType]) {
    return keys[keyType];
  }

  // 환경변수 fallback
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
 * API 키 저장하기
 */
export const saveApiKey = (keyType, apiKey) => {
  try {
    const keys = getAllApiKeys();
    if (apiKey && apiKey.trim()) {
      keys[keyType] = apiKey.trim();
    } else {
      delete keys[keyType];
    }
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    return true;
  } catch (error) {
    console.error('API 키 저장 실패:', error);
    return false;
  }
};

/**
 * 모든 API 키 저장하기
 */
export const saveAllApiKeys = (keys) => {
  try {
    const cleanedKeys = {};
    Object.entries(keys).forEach(([keyType, value]) => {
      if (value && value.trim()) {
        cleanedKeys[keyType] = value.trim();
      }
    });
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(cleanedKeys));
    return true;
  } catch (error) {
    console.error('API 키 저장 실패:', error);
    return false;
  }
};

/**
 * 특정 API 키 삭제하기
 */
export const deleteApiKey = (keyType) => {
  try {
    const keys = getAllApiKeys();
    delete keys[keyType];
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    return true;
  } catch (error) {
    console.error('API 키 삭제 실패:', error);
    return false;
  }
};

/**
 * 모든 API 키 삭제하기
 */
export const clearAllApiKeys = () => {
  try {
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('API 키 삭제 실패:', error);
    return false;
  }
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
      description: 'AI 진단, 케어 가이드 생성에 사용',
      placeholder: 'AIza...'
    },
    openai: {
      configured: isApiKeyConfigured(API_KEY_TYPES.OPENAI),
      label: 'OpenAI',
      description: 'Medical Agent 진단에 사용 (선택)',
      placeholder: 'sk-...'
    },
    anthropic: {
      configured: isApiKeyConfigured(API_KEY_TYPES.ANTHROPIC),
      label: 'Anthropic Claude',
      description: '병원 패킷 생성에 사용',
      placeholder: 'sk-ant-...'
    }
  };
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
