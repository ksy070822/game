// 멀티 에이전트 오케스트레이터 (협진 시스템 통합)
import { callCSAgent } from './csAgent';
import { callInformationAgent } from './informationAgent';
import { callMedicalAgent } from './medicalAgent';
import { callOpsAgent } from './opsAgent';
import { callCareAgent } from './careAgent';
import { calculateTriageScore } from './triageEngine';
import { convertHealthFlagsFormat } from '../../utils/healthFlagsMapper';
import { buildAIContext } from './dataContextService';
import { runCollaborativeDiagnosis } from './collaborativeDiagnosis';

export const runMultiAgentDiagnosis = async (petData, symptomData, onLogReceived, onWaitForGuardianResponse = null) => {
  const logs = [];
  let csResult = null;
  let infoResult = null;
  let medicalResult = null;
  let triageResult = null;
  let opsResult = null;
  let careResult = null;

  // petData 정규화 - petName/name 호환성 보장
  const normalizedPetData = {
    ...petData,
    petName: petData.petName || petData.name || '반려동물',
    name: petData.name || petData.petName || '반려동물',
    species: petData.species || 'dog',
    breed: petData.breed || '미등록',
    age: petData.age || '미상',
    weight: petData.weight || null
  };

  // symptomData 정규화
  const normalizedSymptomData = {
    ...symptomData,
    symptomText: symptomData?.symptomText || symptomData?.description || symptomData?.userDescription || '증상 정보 없음',
    selectedSymptoms: symptomData?.selectedSymptoms || [],
    department: symptomData?.department || '내과',
    images: symptomData?.images || []
  };

  try {
    // 1. CS Agent (Gemini Flash) - 접수센터
    onLogReceived({
      agent: 'CS Agent',
      role: '접수 · 예약 센터',
      icon: '🏥',
      type: 'cs',
      content: '안녕하세요, 접수센터입니다. 진료 접수 도와드리겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    csResult = await callCSAgent(normalizedPetData, normalizedSymptomData);
    logs.push({
      agent: 'CS Agent',
      role: '접수 · 예약 센터',
      icon: '🏥',
      type: 'cs',
      content: csResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 접수센터 → 증상 상담실 이관
    onLogReceived({
      agent: 'CS Agent',
      role: '접수 · 예약 센터',
      icon: '🏥',
      type: 'cs',
      content: '증상 상담실로 안내해 드릴게요. 간호팀에서 자세한 증상을 확인할게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 2. Information Agent - 증상 사전 상담실
    onLogReceived({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: '네, 접수 확인했습니다. 증상 정보를 분석 중입니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    infoResult = await callInformationAgent(normalizedPetData, normalizedSymptomData, csResult.json);

    logs.push({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: infoResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 보호자에게 추가 정보 질문
    onLogReceived({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: '정확한 진단을 위해 몇 가지 추가 정보가 필요합니다. 아래 질문에 답변해 주세요:',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 필수 질문들 생성
    const questions = [
      {
        id: 'symptom_start',
        question: '언제부터 증상이 시작되었나요?',
        options: ['오늘', '어제', '2-3일 전', '일주일 이상'],
        type: 'single'
      },
      {
        id: 'appetite',
        question: '식욕은 어떤가요?',
        options: ['평소와 같음', '약간 감소', '거의 안 먹음', '전혀 안 먹음'],
        type: 'single'
      },
      {
        id: 'activity',
        question: '활동량은 평소와 비교해 어떤가요?',
        options: ['평소와 같음', '약간 감소', '많이 감소', '거의 움직이지 않음'],
        type: 'single'
      },
      {
        id: 'other_symptoms',
        question: '다른 동반 증상이 있나요? (복수 선택 가능)',
        options: ['구토', '설사', '기침', '재채기', '호흡곤란', '발열', '없음'],
        type: 'multiple'
      }
    ];

    // 보호자 답변 대기 (콜백이 제공된 경우)
    let guardianResponses = {};

    if (onWaitForGuardianResponse) {
      // 질문 메시지와 함께 대기 시작
      onLogReceived({
        agent: 'Information Agent',
        role: '증상 사전 상담실',
        icon: '💉',
        type: 'info',
        content: '',
        isQuestionPhase: true,
        questions: questions,
        timestamp: Date.now()
      });

      // 보호자 답변 대기
      guardianResponses = await onWaitForGuardianResponse(questions);

      // 답변 완료 메시지
      onLogReceived({
        agent: 'Information Agent',
        role: '증상 사전 상담실',
        icon: '💉',
        type: 'info',
        content: '답변해 주셔서 감사합니다. 입력하신 정보를 바탕으로 분석을 진행하겠습니다.',
        timestamp: Date.now()
      });

      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      // 콜백이 없으면 기존 방식으로 질문만 표시 (백워드 호환)
      for (const q of questions) {
        onLogReceived({
          agent: 'Information Agent',
          role: '증상 사전 상담실',
          icon: '💉',
          type: 'info',
          content: q.question,
          isQuestion: true,
          questionData: q,
          timestamp: Date.now()
        });
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    // 보호자 응답을 symptomData에 추가
    const enrichedSymptomData = {
      ...normalizedSymptomData,
      guardianResponses: guardianResponses,
      guardianResponsesSummary: Object.entries(guardianResponses)
        .map(([key, value]) => {
          const q = questions.find(q => q.id === key);
          return `${q?.question || key}: ${Array.isArray(value) ? value.join(', ') : value}`;
        })
        .join('\n')
    };

    // 증상 상담실 → 전문 진료실 이관
    onLogReceived({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: '초기 상담을 마쳤어요. 이제 담당 수의사 선생님께서 직접 진찰해 주실 거예요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 3. Medical Agent (GPT-4o) - 전문 진료실
    onLogReceived({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: '네, 상담 기록 확인했습니다. 정밀 진찰 시작하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Firestore에서 FAQ와 과거 진료기록 컨텍스트 조회
    let dataContext = '';
    try {
      dataContext = await buildAIContext(normalizedPetData, enrichedSymptomData);
      if (dataContext) {
        console.log('AI 컨텍스트 로드 완료:', dataContext.length, '자');
      }
    } catch (contextError) {
      console.warn('AI 컨텍스트 로드 실패 (진단은 계속 진행):', contextError);
    }

    // 보호자 응답 정보를 Medical Agent에 전달
    medicalResult = await callMedicalAgent(normalizedPetData, enrichedSymptomData, csResult.json, infoResult.json, dataContext);

    logs.push({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: medicalResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 전문 진료실 → 응급도 판정실 요청
    onLogReceived({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: '진찰을 마쳤습니다. 응급의학팀에서 위급도를 평가해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 4. Triage Engine (Claude Sonnet) - 응급도 판정실
    onLogReceived({
      agent: 'Triage Engine',
      role: '응급도 판정실',
      icon: '🚨',
      type: 'triage',
      content: '네, 진단 소견서 확인했습니다. 응급도 평가 진행하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      triageResult = await calculateTriageScore(normalizedPetData, enrichedSymptomData, medicalResult.json, csResult.json);
      logs.push({
        agent: 'Triage Engine',
        role: '응급도 판정실',
        icon: '🚨',
        type: 'triage',
        content: `응급도 평가 완료했습니다.\n\n📊 Triage Score: ${triageResult.triage_score}/5\n🏷️ 응급 등급: ${triageResult.triage_level}\n⏰ 권장 조치: ${triageResult.recommended_action_window}\n\n${triageResult.emergency_summary_kor}`,
        timestamp: Date.now()
      });
      onLogReceived(logs[logs.length - 1]);
    } catch (err) {
      console.error('Triage 계산 오류:', err);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4.5 협진 시스템 (Collaborative Diagnosis) - 다중 모델 교차 검증
    onLogReceived({
      agent: 'Collaborative System',
      role: '협진 검토팀',
      icon: '🤝',
      type: 'collaboration',
      content: '여러 AI 수의사들의 진단을 교차 검증하고 있습니다...',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    let collaborationResult = null;
    try {
      collaborationResult = await runCollaborativeDiagnosis(
        normalizedPetData,
        normalizedSymptomData,
        medicalResult.json,
        triageResult,
        infoResult.json
      );

      // 협진 결과 로그
      const consensusMsg = collaborationResult.consensus.consensus_reached
        ? `✅ 모든 AI 수의사가 일치된 견해를 보였습니다.`
        : `⚠️ ${collaborationResult.discrepancy_analysis.discrepancy_count}개의 의견 차이를 발견하여 조정했습니다.`;

      logs.push({
        agent: 'Collaborative System',
        role: '협진 검토팀',
        icon: '🤝',
        type: 'collaboration',
        content: `${collaborationResult.collaboration_summary}\n\n${consensusMsg}\n\n📊 최종 위험도: ${collaborationResult.consensus.final_risk_level}\n🎯 신뢰도: ${(collaborationResult.consensus.confidence_score * 100).toFixed(0)}%\n\n${collaborationResult.consensus.collaborative_notes.reviewer_opinion || ''}`,
        timestamp: Date.now()
      });
      onLogReceived(logs[logs.length - 1]);

      // 협진 결과로 triage와 medical 결과 업데이트
      if (collaborationResult.consensus) {
        triageResult.triage_score = collaborationResult.consensus.final_triage_score;
        triageResult.triage_level = collaborationResult.consensus.final_risk_level === 'low' ? 'yellow' :
                                     collaborationResult.consensus.final_risk_level === 'moderate' ? 'orange' :
                                     collaborationResult.consensus.final_risk_level === 'high' ? 'red' : 'red';
        medicalResult.json.risk_level = collaborationResult.consensus.final_risk_level;
        medicalResult.json.need_hospital_visit = collaborationResult.consensus.final_hospital_visit;
      }
    } catch (err) {
      console.error('협진 시스템 오류:', err);
      onLogReceived({
        agent: 'Collaborative System',
        role: '협진 검토팀',
        icon: '🤝',
        type: 'collaboration',
        content: '협진 검토를 진행했으나 일부 단계를 건너뛰었습니다. 기본 진단으로 진행합니다.',
        timestamp: Date.now()
      });
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    // 협진팀 → 치료 계획실 이관
    onLogReceived({
      agent: 'Collaborative System',
      role: '협진 검토팀',
      icon: '🤝',
      type: 'collaboration',
      content: '협진 검토를 완료했습니다. 치료 계획팀에 최종 소견을 전달합니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 5. Data Agent - 치료 계획 수립실
    onLogReceived({
      agent: 'Data Agent',
      role: '치료 계획 수립실',
      icon: '📋',
      type: 'data',
      content: '응급도 평가 결과 확인했습니다. 의료진 협진으로 치료 계획 수립하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    opsResult = await callOpsAgent(
      normalizedPetData,
      normalizedSymptomData,
      medicalResult.json,
      triageResult,
      csResult.json,
      infoResult.json
    );

    logs.push({
      agent: 'Data Agent',
      role: '치료 계획 수립실',
      icon: '📋',
      type: 'data',
      content: opsResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 치료 계획실 → 처방 관리실 이관
    onLogReceived({
      agent: 'Data Agent',
      role: '치료 계획 수립실',
      icon: '📋',
      type: 'data',
      content: '치료 계획을 세웠어요. 약국에서 처방약과 복용법을 안내해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 6. Care Agent - 처방 · 약물 관리실
    onLogReceived({
      agent: 'Care Agent',
      role: '처방 · 약물 관리실',
      icon: '💊',
      type: 'care',
      content: '처방전 확인했습니다. 보호자님께 약물 복용법과 케어 가이드 안내해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    careResult = await callCareAgent(
      normalizedPetData,
      opsResult.json,
      medicalResult.json,
      triageResult
    );

    logs.push({
      agent: 'Care Agent',
      role: '처방 · 약물 관리실',
      icon: '💊',
      type: 'care',
      content: careResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 처방실 → 진료요약실 이관
    onLogReceived({
      agent: 'Care Agent',
      role: '처방 · 약물 관리실',
      icon: '💊',
      type: 'care',
      content: '약 안내를 마쳤어요. 진료 요약실에서 전체 내용을 정리해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 7. Summary - 진료 요약 관리실
    onLogReceived({
      agent: 'summary',
      role: '진료 요약 · 관리실',
      icon: '📄',
      type: 'summary',
      content: '✅ 진료가 완료되었습니다. 진단서와 케어 플랜을 정리했습니다.\n\n📋 주의사항과 홈케어 가이드를 꼭 확인해 주세요!',
      timestamp: Date.now()
    });

    // 최종 진단서 생성 (협진 결과 포함)
    const medicalLog = opsResult.json.medical_log;
    const ownerSheet = opsResult.json.owner_friendly_diagnosis_sheet;
    const healthFlags = convertHealthFlagsFormat(triageResult?.health_flags || medicalLog.health_flags || {});

    const finalDiagnosis = {
      id: Date.now().toString(),
      created_at: Date.now(),
      petId: normalizedPetData.id,
      petName: normalizedPetData.petName,
      diagnosis: medicalLog.possible_diseases?.[0]?.name_kor || '일반 건강 이상',
      probability: medicalLog.possible_diseases?.[0]?.probability || 0.6,
      riskLevel: medicalLog.risk_level || 'moderate',
      emergency: medicalLog.risk_level === 'emergency' ? 'high' :
                 medicalLog.risk_level === 'high' ? 'high' :
                 medicalLog.risk_level === 'moderate' ? 'medium' : 'low',
      actions: ownerSheet.immediate_home_actions || [],
      hospitalVisit: medicalLog.need_hospital_visit || false,
      hospitalVisitTime: medicalLog.hospital_visit_timing || '증상 악화 시',
      description: medicalResult.json.primary_assessment_kor || '증상 기반 분석',
      careGuide: careResult.fullGuide,
      conversationHistory: [],
      triage_score: medicalLog.triage_score || triageResult?.triage_score || 2,
      triage_level: medicalLog.triage_level || triageResult?.triage_level || 'yellow',
      healthFlags: healthFlags,
      // 추가 정보
      ownerSheet: ownerSheet,
      hospitalPacket: opsResult.json.hospital_previsit_packet,
      carePlan: careResult.json,
      // 협진 정보
      collaboration: collaborationResult ? {
        consensus_reached: collaborationResult.consensus.consensus_reached,
        confidence_score: collaborationResult.consensus.confidence_score,
        discrepancies_found: collaborationResult.discrepancy_analysis.discrepancy_count,
        models_consulted: [
          'Claude Sonnet (Medical Agent)',
          'Claude Sonnet (Triage Engine)',
          'Claude Sonnet (Senior Reviewer)',
          collaborationResult.second_opinion ? 'GPT-4o (Second Opinion)' : null
        ].filter(Boolean),
        final_recommendation: collaborationResult.consensus.collaborative_notes.reviewer_opinion,
        resolution_notes: collaborationResult.consensus.discrepancy_resolution
      } : null
    };

    return {
      logs,
      finalDiagnosis
    };

  } catch (error) {
    console.error('멀티 에이전트 오류:', error);
    throw error;
  }
};
