/**
 * API 설정 파일
 * 백엔드 API 엔드포인트 및 설정 관리
 */

// 백엔드 API URL
export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

// API 엔드포인트
export const API_ENDPOINTS = {
  TRIAGE: `${BACKEND_API_URL}/api/triage`,
  TRIAGE_STREAM: (diagnosisId) => `${BACKEND_API_URL}/api/triage/stream/${diagnosisId}`,
  QUESTION_ANSWER: `${BACKEND_API_URL}/api/question-answer`,
  HEALTH: `${BACKEND_API_URL}/health`,
};

// API 설정
export const API_CONFIG = {
  TIMEOUT: 60000, // 60초
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000, // 2초
};

// 요청 헤더 생성
export const getHeaders = () => ({
  'Content-Type': 'application/json',
});

export default {
  BACKEND_API_URL,
  API_ENDPOINTS,
  API_CONFIG,
  getHeaders,
};
