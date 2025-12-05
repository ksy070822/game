/**
 * 백엔드 API 호출 서비스
 * 프론트엔드에서 AI 모델을 직접 호출하지 않고 백엔드 API를 통해 처리
 */

import { API_ENDPOINTS, API_CONFIG, getHeaders } from './config';

/**
 * 진단 요청 (Triage)
 * @param {Object} triageData - 진단 요청 데이터
 * @returns {Promise<Object>} 진단 결과
 */
export const requestTriage = async (triageData) => {
  try {
    const response = await fetch(API_ENDPOINTS.TRIAGE, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(triageData),
      signal: AbortSignal.timeout(5000), // 타임아웃을 5초로 단축 (발표 대비)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
      
      // API 키 오류나 400 오류 감지 시 특별한 플래그 설정
      const isApiKeyError = errorMessage.includes('API key not valid') || 
                            errorMessage.includes('API_KEY_INVALID') ||
                            errorMessage.includes('API key') && errorMessage.includes('valid');
      
      const isBackendError = response.status === 400 || response.status === 500 || isApiKeyError;
      
      if (isBackendError) {
        // 백엔드 오류를 명확히 표시하여 프론트엔드 모드로 전환하도록 함
        const enhancedError = new Error(`백엔드 오류: ${errorMessage}`);
        enhancedError.isBackendError = true;
        enhancedError.shouldFallbackToFrontend = true;
        enhancedError.statusCode = response.status;
        throw enhancedError;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Failed to fetch (서버 연결 실패) 또는 타임아웃 시 즉시 에러 반환
    if (error.name === 'AbortError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      const networkError = new Error('백엔드 서버에 연결할 수 없습니다. 프론트엔드 모드로 전환합니다.');
      networkError.shouldFallbackToFrontend = true;
      throw networkError;
    }
    
    // 이미 shouldFallbackToFrontend가 설정된 경우 그대로 전달
    if (error.shouldFallbackToFrontend) {
      throw error;
    }
    
    throw error;
  }
};

/**
 * 진단 진행상황 스트리밍 (Server-Sent Events)
 * @param {string} diagnosisId - 진단 ID
 * @param {Function} onProgress - 진행상황 콜백
 * @param {Function} onComplete - 완료 콜백
 * @param {Function} onError - 에러 콜백
 * @returns {Function} cleanup 함수
 */
export const streamTriageProgress = (diagnosisId, onProgress, onComplete, onError) => {
  const eventSource = new EventSource(API_ENDPOINTS.TRIAGE_STREAM(diagnosisId));

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // 진행상황 업데이트
      if (data.progress !== undefined) {
        onProgress(data);
      }

      // 완료 확인
      if (data.progress === 100) {
        eventSource.close();
        onComplete(data);
      }
    } catch (error) {
      console.error('SSE 파싱 오류:', error);
      onError(error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE 연결 오류:', error);
    eventSource.close();
    onError(new Error('실시간 업데이트 연결이 끊어졌습니다.'));
  };

  // Cleanup 함수 반환
  return () => {
    eventSource.close();
  };
};

/**
 * 헬스 체크
 * @returns {Promise<Object>} 서버 상태
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Health check 실패:', error);
    return { status: 'error', message: error.message };
  }
};

/**
 * Retry 로직을 포함한 요청
 * @param {Function} requestFn - 요청 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Promise<any>}
 */
export const requestWithRetry = async (requestFn, maxRetries = 1) => { // 발표 대비: 재시도 1회로 제한
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Failed to fetch나 네트워크 오류는 즉시 실패 처리 (재시도 안 함)
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('연결할 수 없습니다')) {
        throw error; // 즉시 throw하여 fallback으로 전환
      }

      // 마지막 시도가 아니면 대기 후 재시도
      if (i < maxRetries - 1) {
        const delay = 1000; // 1초로 단축
        console.warn(`요청 실패, ${delay}ms 후 재시도 (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * 질문 답변 요청
 * @param {Object} questionData - 질문 데이터
 * @returns {Promise<Object>} 답변 결과
 */
export const requestQuestionAnswer = async (questionData) => {
  try {
    const response = await fetch(API_ENDPOINTS.QUESTION_ANSWER, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(questionData),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, ...result };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: '요청 시간이 초과되었습니다. 다시 시도해주세요.' };
    }
    return { success: false, error: error.message };
  }
};

/**
 * 멀티에이전트 진단 요청 (프론트엔드 데이터 → 백엔드 형식 변환)
 * @param {Object} petData - 반려동물 정보
 * @param {Object} symptomData - 증상 데이터
 * @returns {Promise<Object>} 진단 결과
 */
export const runMultiAgentDiagnosisViaBackend = async (petData, symptomData) => {
  // 프론트엔드 데이터를 백엔드 API 형식으로 변환
  const triageRequest = {
    symptom_description: symptomData.symptomText || symptomData.description || '',
    species: petData.species || 'dog',
    breed: petData.breed || '미등록',
    age: parseFloat(petData.age) || null,
    sex: petData.sex || null,
    weight: parseFloat(petData.weight) || null,
    image_urls: symptomData.images || [],
    department: symptomData.department || null,
    symptom_tags: symptomData.selectedSymptoms || [],
    follow_up_answers: symptomData.followUpAnswers || {},
    free_text: symptomData.freeText || '',
  };

  // Retry 로직 포함하여 요청
  return await requestWithRetry(() => requestTriage(triageRequest));
};

/**
 * 캐릭터 생성 요청
 * @param {Object} characterData - 캐릭터 생성 데이터
 * @returns {Promise<Object>} 캐릭터 생성 결과
 */
export const requestCharacter = async (characterData) => {
  try {
    // 백엔드 API 엔드포인트가 없으면 프론트엔드에서 처리하도록 에러 반환
    const CHARACTER_ENDPOINT = `${API_ENDPOINTS.TRIAGE.replace('/triage', '/character')}`;
    
    const response = await fetch(CHARACTER_ENDPOINT, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(characterData),
      signal: AbortSignal.timeout(30000), // 30초 타임아웃
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // 백엔드 연결 실패 시 에러 반환 (프론트엔드에서 처리하도록)
    console.warn('[requestCharacter] 백엔드 API 실패:', error);
    throw error;
  }
};

export default {
  requestTriage,
  streamTriageProgress,
  checkHealth,
  requestWithRetry,
  requestQuestionAnswer,
  runMultiAgentDiagnosisViaBackend,
  requestCharacter,
};
