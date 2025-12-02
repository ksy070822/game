// 협진 시스템 (Collaborative Diagnosis System)
// 여러 AI 모델이 협력하여 진단하고, 서로의 의견을 검증하는 시스템

import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';
import { COMMON_CONTEXT } from './commonContext';

/**
 * 진단 결과 간 불일치 검출
 * @param {Object} medicalResult - Medical Agent 결과
 * @param {Object} triageResult - Triage Agent 결과
 * @returns {Object} 불일치 분석 결과
 */
export const detectDiscrepancies = (medicalResult, triageResult) => {
  const discrepancies = [];

  // 1. 위험도 불일치 검사
  const medicalRisk = medicalResult.risk_level || 'moderate';
  const triageLevel = triageResult.triage_level || 'yellow';

  const riskMapping = {
    'low': ['green', 'yellow'],
    'moderate': ['yellow', 'orange'],
    'high': ['orange', 'red'],
    'emergency': ['red']
  };

  const expectedTriageLevels = riskMapping[medicalRisk] || ['yellow'];
  if (!expectedTriageLevels.includes(triageLevel)) {
    discrepancies.push({
      type: 'risk_level_mismatch',
      severity: 'high',
      medical_assessment: medicalRisk,
      triage_assessment: triageLevel,
      description: `Medical Agent는 ${medicalRisk}로 평가했지만, Triage Engine은 ${triageLevel}로 평가했습니다.`
    });
  }

  // 2. 응급도 점수와 진단 불일치
  const triageScore = triageResult.triage_score || 2;
  const isEmergency = medicalRisk === 'emergency' || medicalRisk === 'high';

  if (isEmergency && triageScore < 3) {
    discrepancies.push({
      type: 'emergency_score_mismatch',
      severity: 'critical',
      medical_assessment: medicalRisk,
      triage_score: triageScore,
      description: `Medical Agent가 높은 위험도를 진단했으나, Triage 점수(${triageScore})가 낮습니다.`
    });
  }

  // 3. 병원 방문 필요성 불일치
  const medicalNeedsHospital = medicalResult.need_hospital_visit || false;
  const triageNeedsHospital = triageScore >= 3 || triageLevel === 'red';

  if (medicalNeedsHospital !== triageNeedsHospital) {
    discrepancies.push({
      type: 'hospital_visit_mismatch',
      severity: 'medium',
      medical_recommendation: medicalNeedsHospital,
      triage_recommendation: triageNeedsHospital,
      description: `병원 방문 필요성에 대한 의견이 다릅니다. Medical: ${medicalNeedsHospital}, Triage: ${triageNeedsHospital}`
    });
  }

  return {
    has_discrepancies: discrepancies.length > 0,
    discrepancy_count: discrepancies.length,
    discrepancies: discrepancies,
    critical_count: discrepancies.filter(d => d.severity === 'critical').length,
    needs_review: discrepancies.some(d => d.severity === 'critical' || d.severity === 'high')
  };
};

/**
 * Claude Sonnet을 사용한 협진 검토
 * 다른 에이전트의 진단을 교차 검증
 */
export const crossValidateDiagnosis = async (petData, symptomData, medicalResult, triageResult, infoResult) => {
  const apiKey = getApiKey(API_KEY_TYPES.ANTHROPIC);

  if (!apiKey) {
    console.warn('Claude API 키가 없어 협진 검토를 건너뜁니다.');
    return null;
  }

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Senior Veterinarian Reviewer (수석 수의사 검토팀)"입니다.

[역할]
- Medical Agent와 Triage Agent의 진단 결과를 독립적으로 검토합니다.
- 두 에이전트의 의견이 일치하는지, 불일치가 있다면 어느 쪽이 더 타당한지 평가합니다.
- 누락된 중요한 소견이나 과잉 진단 여부를 확인합니다.
- 최종적으로 가장 합리적인 진단과 조치를 권고합니다.

[원칙]
- 보수적이고 신중한 접근: 불확실하면 병원 방문을 권장
- 과잉 진단보다는 안전을 우선
- 에이전트 간 불일치가 있을 때는 더 높은 위험도를 채택`;

  const userPrompt = `
반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}
- 나이: ${petData.age || '미상'}
- 체중: ${petData.weight || '미상'}

증상:
${symptomData.symptomText}
${symptomData.guardianResponsesSummary ? `
★★★ 보호자 추가 문진 응답 (매우 중요) ★★★
${symptomData.guardianResponsesSummary}
` : ''}

Information Agent 분석:
${JSON.stringify(infoResult, null, 2)}

Medical Agent 진단:
${JSON.stringify(medicalResult, null, 2)}

Triage Engine 평가:
${JSON.stringify(triageResult, null, 2)}

[검토 요청]
위 진단 결과들을 검토하고 다음 형식으로 답변해주세요:

{
  "agreement_level": "full_agreement | partial_agreement | significant_disagreement",
  "primary_concern": "가장 우려되는 점 (한국어)",
  "medical_agent_assessment": "Medical Agent 진단에 대한 평가 (적절함/과소평가/과대평가)",
  "triage_agent_assessment": "Triage Agent 평가에 대한 평가 (적절함/과소평가/과대평가)",
  "recommended_risk_level": "low | moderate | high | emergency",
  "recommended_triage_score": 0-5,
  "recommended_hospital_visit": true/false,
  "reasoning": "검토 근거 (한국어 3-4문장)",
  "additional_concerns": ["놓친 부분이나 추가 고려사항"],
  "final_recommendation": "최종 권고사항 (한국어 2-3문장)"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('협진 검토 오류:', error);
  }

  return null;
};

/**
 * GPT-4o를 사용한 2차 의견
 * 다른 모델의 관점에서 진단 검증
 */
export const getSecondOpinion = async (petData, symptomData, medicalResult, triageResult, reviewResult) => {
  const apiKey = getApiKey(API_KEY_TYPES.OPENAI);

  if (!apiKey) {
    console.warn('OpenAI API 키가 없어 2차 의견을 건너뜁니다.');
    return null;
  }

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Second Opinion Specialist (제2 의견 전문의)"입니다.

[역할]
- 다른 AI 수의사들의 진단을 검토하고 독립적인 제2의견을 제공합니다.
- Claude 기반 에이전트들이 놓쳤을 수 있는 관점을 제시합니다.
- 최종 진단의 신뢰도를 높이는 데 기여합니다.`;

  const userPrompt = `
반려동물: ${petData.petName} (${petData.species === 'dog' ? '개' : '고양이'}, ${petData.breed || '미등록'})
증상: ${symptomData.symptomText}
${symptomData.guardianResponsesSummary ? `
★ 보호자 추가 문진: ${symptomData.guardianResponsesSummary}
` : ''}

1차 진단 (Medical Agent - Claude):
${JSON.stringify(medicalResult, null, 2)}

응급도 평가 (Triage Engine - Claude):
${JSON.stringify(triageResult, null, 2)}

검토 결과 (Senior Reviewer - Claude):
${reviewResult ? JSON.stringify(reviewResult, null, 2) : '없음'}

[제2 의견 요청]
위 진단들을 검토하고 다음을 답변해주세요:

{
  "agreement_with_diagnosis": true/false,
  "alternative_diagnosis": ["고려해볼 다른 진단 가능성들"],
  "risk_assessment": "low | moderate | high | emergency",
  "key_observations": ["GPT-4o 관점에서 중요하게 본 점들"],
  "dissenting_opinion": "다른 AI들과 다르게 생각하는 부분 (있다면)",
  "confidence_level": "높음 | 중간 | 낮음",
  "recommendation": "최종 권고 (한국어)"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('제2 의견 오류:', error);
  }

  return null;
};

/**
 * 최종 합의 도출
 * 모든 에이전트의 의견을 종합하여 최종 진단 생성
 */
export const generateConsensus = (medicalResult, triageResult, reviewResult, secondOpinion, discrepancyAnalysis) => {
  // 위험도 투표
  const riskVotes = [
    medicalResult.risk_level,
    triageResult.triage_level,
    reviewResult?.recommended_risk_level,
    secondOpinion?.risk_assessment
  ].filter(Boolean);

  // 위험도 매핑 (통일된 기준으로 변환)
  const normalizeRisk = (risk) => {
    const mapping = {
      'green': 'low',
      'yellow': 'low',
      'orange': 'moderate',
      'red': 'high',
      'emergency': 'emergency',
      'low': 'low',
      'moderate': 'moderate',
      'high': 'high'
    };
    return mapping[risk] || 'moderate';
  };

  const normalizedRisks = riskVotes.map(normalizeRisk);

  // 가장 높은 위험도 채택 (안전 우선 원칙)
  const riskHierarchy = ['emergency', 'high', 'moderate', 'low'];
  const finalRisk = riskHierarchy.find(level => normalizedRisks.includes(level)) || 'moderate';

  // Triage 점수 계산 (평균 + 불일치 시 상향 조정)
  const triageScores = [
    triageResult.triage_score,
    reviewResult?.recommended_triage_score
  ].filter(s => s !== null && s !== undefined);

  let finalTriageScore = triageScores.length > 0
    ? Math.round(triageScores.reduce((a, b) => a + b, 0) / triageScores.length)
    : 2;

  // 불일치가 있으면 안전을 위해 점수 상향
  if (discrepancyAnalysis.critical_count > 0) {
    finalTriageScore = Math.min(5, finalTriageScore + 1);
  }

  // 병원 방문 권고
  const hospitalVotes = [
    medicalResult.need_hospital_visit,
    finalTriageScore >= 3,
    reviewResult?.recommended_hospital_visit,
    secondOpinion?.risk_assessment === 'high' || secondOpinion?.risk_assessment === 'emergency'
  ].filter(v => v === true || v === false);

  const finalHospitalVisit = hospitalVotes.filter(v => v === true).length >= hospitalVotes.length / 2;

  // 신뢰도 계산
  const agreementScore = discrepancyAnalysis.has_discrepancies ? 0.7 : 0.95;
  const confidence = reviewResult?.confidence_level === '높음' ? 0.9 :
                    reviewResult?.confidence_level === '중간' ? 0.75 : 0.6;

  return {
    consensus_reached: !discrepancyAnalysis.needs_review,
    final_risk_level: finalRisk,
    final_triage_score: finalTriageScore,
    final_hospital_visit: finalHospitalVisit,
    confidence_score: Math.min(agreementScore, confidence),
    voting_summary: {
      risk_votes: normalizedRisks,
      triage_scores: triageScores,
      hospital_votes: hospitalVotes
    },
    collaborative_notes: {
      medical_diagnosis: medicalResult.primary_assessment_kor || medicalResult.possible_diseases?.[0]?.name_kor,
      reviewer_opinion: reviewResult?.final_recommendation,
      second_opinion: secondOpinion?.recommendation,
      key_concerns: [
        ...(reviewResult?.additional_concerns || []),
        ...(secondOpinion?.key_observations || [])
      ]
    },
    discrepancy_resolution: discrepancyAnalysis.has_discrepancies
      ? `${discrepancyAnalysis.discrepancy_count}개의 의견 차이를 발견했으며, 안전 우선 원칙에 따라 조정했습니다.`
      : '모든 에이전트가 일치된 견해를 보였습니다.'
  };
};

/**
 * 전체 협진 프로세스 실행
 */
export const runCollaborativeDiagnosis = async (petData, symptomData, medicalResult, triageResult, infoResult) => {
  console.log('🤝 협진 시스템 시작...');

  // 1. 불일치 검출
  const discrepancyAnalysis = detectDiscrepancies(medicalResult, triageResult);
  console.log('불일치 분석:', discrepancyAnalysis);

  // 2. 교차 검증 (Claude Sonnet)
  const reviewResult = await crossValidateDiagnosis(petData, symptomData, medicalResult, triageResult, infoResult);
  console.log('검토 결과:', reviewResult);

  // 3. 제2 의견 (GPT-4o) - 불일치가 있거나 위험도가 높을 때만
  let secondOpinion = null;
  if (discrepancyAnalysis.needs_review || medicalResult.risk_level === 'high' || medicalResult.risk_level === 'emergency') {
    secondOpinion = await getSecondOpinion(petData, symptomData, medicalResult, triageResult, reviewResult);
    console.log('제2 의견:', secondOpinion);
  }

  // 4. 최종 합의 도출
  const consensus = generateConsensus(medicalResult, triageResult, reviewResult, secondOpinion, discrepancyAnalysis);
  console.log('최종 합의:', consensus);

  return {
    discrepancy_analysis: discrepancyAnalysis,
    review_result: reviewResult,
    second_opinion: secondOpinion,
    consensus: consensus,
    collaboration_summary: `${discrepancyAnalysis.has_discrepancies ? '⚠️ ' : '✅ '}협진 완료: ${consensus.consensus_reached ? '전체 합의 도달' : '부분 조정 필요'} (신뢰도: ${(consensus.confidence_score * 100).toFixed(0)}%)`
  };
};
