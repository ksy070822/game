// 멀티 에이전트 오케스트레이터
import { callCSAgent } from './csAgent';
import { callInformationAgent } from './informationAgent';
import { callMedicalAgent } from './medicalAgent';
import { callOpsAgent } from './opsAgent';
import { callCareAgent } from './careAgent';
import { calculateTriageScore } from './triageEngine';
import { convertHealthFlagsFormat } from '../../utils/healthFlagsMapper';
import { buildAIContext } from './dataContextService';

export const runMultiAgentDiagnosis = async (petData, symptomData, onLogReceived) => {
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

    await new Promise(resolve => setTimeout(resolve, 800));

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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 접수센터 → 증상 상담실 이관
    onLogReceived({
      agent: 'CS Agent',
      role: '접수 · 예약 센터',
      icon: '🏥',
      type: 'cs',
      content: '증상 상담실로 안내해 드릴게요. 간호팀에서 자세한 증상을 여쭤볼 거예요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 2. Information Agent - 증상 사전 상담실
    onLogReceived({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: '네, 접수 확인했습니다. 증상 정보를 분석 중입니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 800));

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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 증상 상담실 → 전문 진료실 이관
    onLogReceived({
      agent: 'Information Agent',
      role: '증상 사전 상담실',
      icon: '💉',
      type: 'info',
      content: '초기 상담을 마쳤어요. 이제 담당 수의사 선생님께서 직접 진찰해 주실 거예요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 3. Medical Agent (GPT-4o) - 전문 진료실
    onLogReceived({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: '네, 상담 기록 확인했습니다. 정밀 진찰 시작하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    // Firestore에서 FAQ와 과거 진료기록 컨텍스트 조회
    let dataContext = '';
    try {
      dataContext = await buildAIContext(normalizedPetData, normalizedSymptomData);
      if (dataContext) {
        console.log('AI 컨텍스트 로드 완료:', dataContext.length, '자');
      }
    } catch (contextError) {
      console.warn('AI 컨텍스트 로드 실패 (진단은 계속 진행):', contextError);
    }

    medicalResult = await callMedicalAgent(normalizedPetData, normalizedSymptomData, csResult.json, infoResult.json, dataContext);

    logs.push({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: medicalResult.message,
      timestamp: Date.now()
    });
    onLogReceived(logs[logs.length - 1]);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 전문 진료실 → 응급도 판정실 요청
    onLogReceived({
      agent: 'Veterinarian Agent',
      role: '전문 진료실',
      icon: '👨‍⚕️',
      type: 'medical',
      content: '진찰을 마쳤습니다. 응급의학팀에서 위급도를 평가해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 4. Triage Engine (GPT-4o) - 응급도 판정실
    onLogReceived({
      agent: 'Triage Engine',
      role: '응급도 판정실',
      icon: '🚨',
      type: 'triage',
      content: '네, 진단 소견서 확인했습니다. 응급도 평가 진행하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      triageResult = await calculateTriageScore(normalizedPetData, normalizedSymptomData, medicalResult.json, csResult.json);
      logs.push({
        agent: 'Triage Engine',
        role: '응급도 판정실',
        icon: '🚨',
        type: 'triage',
        content: `응급도 평가 완료했습니다.\n\n📊 Triage Score: ${triageResult.triage_score}/5\n🏷️ 응급 등급: ${triageResult.triage_level}\n⏰ 권장 조치: ${triageResult.recommended_action_window}\n\n${triageResult.emergency_summary_kor}\n\n📋 치료 계획팀에 협진 의뢰드립니다.`,
        timestamp: Date.now()
      });
      onLogReceived(logs[logs.length - 1]);
    } catch (err) {
      console.error('Triage 계산 오류:', err);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Data Agent - 치료 계획 수립실
    onLogReceived({
      agent: 'Data Agent',
      role: '치료 계획 수립실',
      icon: '📋',
      type: 'data',
      content: '응급도 평가 결과 확인했습니다. 의료진 협진으로 치료 계획 수립하겠습니다.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 800));

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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 치료 계획실 → 처방 관리실 이관
    onLogReceived({
      agent: 'Data Agent',
      role: '치료 계획 수립실',
      icon: '📋',
      type: 'data',
      content: '치료 계획을 세웠어요. 약국에서 처방약과 복용법을 안내해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 6. Care Agent - 처방 · 약물 관리실
    onLogReceived({
      agent: 'Care Agent',
      role: '처방 · 약물 관리실',
      icon: '💊',
      type: 'care',
      content: '처방전 확인했습니다. 보호자님께 약물 복용법과 케어 가이드 안내해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 800));

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

    await new Promise(resolve => setTimeout(resolve, 800));

    // 처방실 → 진료요약실 이관
    onLogReceived({
      agent: 'Care Agent',
      role: '처방 · 약물 관리실',
      icon: '💊',
      type: 'care',
      content: '약 안내를 마쳤어요. 진료 요약실에서 전체 내용을 정리해 드릴게요.',
      timestamp: Date.now()
    });

    await new Promise(resolve => setTimeout(resolve, 600));

    // 7. Summary - 진료 요약 관리실
    onLogReceived({
      agent: 'summary',
      role: '진료 요약 · 관리실',
      icon: '📄',
      type: 'summary',
      content: '✅ 진료가 완료되었습니다. 진단서와 케어 플랜을 정리했습니다.\n\n📋 주의사항과 홈케어 가이드를 꼭 확인해 주세요!',
      timestamp: Date.now()
    });

    // 최종 진단서 생성
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
      carePlan: careResult.json
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
