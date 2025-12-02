/**
 * useDiagnosis Hook
 * 백엔드 API를 통한 진단 요청 및 상태 관리
 */

import { useState, useCallback, useEffect } from 'react';
import { runMultiAgentDiagnosisViaBackend, streamTriageProgress } from '../services/api/backendAPI';

export const useDiagnosis = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [logs, setLogs] = useState([]);

  /**
   * 진단 요청
   */
  const requestDiagnosis = useCallback(async (petData, symptomData) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setLogs([]);
    setDiagnosisResult(null);

    try {
      // 백엔드 API 호출
      const result = await runMultiAgentDiagnosisViaBackend(petData, symptomData);

      // 결과 처리
      if (result.status === 'success') {
        setDiagnosisResult(result.data);
        setProgress(100);
        setLogs(result.data.logs || []);
      } else {
        throw new Error(result.message || '진단 요청에 실패했습니다.');
      }

      return result.data;
    } catch (err) {
      console.error('진단 요청 오류:', err);
      setError(err.message || '진단 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 실시간 진행상황 스트리밍
   */
  const streamProgress = useCallback((diagnosisId) => {
    const cleanup = streamTriageProgress(
      diagnosisId,
      // onProgress
      (data) => {
        setProgress(data.progress || 0);
        setCurrentAgent(data.agent || null);

        // 로그 추가
        if (data.message) {
          setLogs((prev) => [
            ...prev,
            {
              agent: data.agent,
              message: data.message,
              timestamp: data.timestamp || Date.now(),
            },
          ]);
        }
      },
      // onComplete
      (data) => {
        setProgress(100);
        setIsLoading(false);
      },
      // onError
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return cleanup;
  }, []);

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setDiagnosisResult(null);
    setProgress(0);
    setCurrentAgent(null);
    setLogs([]);
  }, []);

  return {
    // 상태
    isLoading,
    error,
    diagnosisResult,
    progress,
    currentAgent,
    logs,

    // 액션
    requestDiagnosis,
    streamProgress,
    reset,
  };
};

export default useDiagnosis;
