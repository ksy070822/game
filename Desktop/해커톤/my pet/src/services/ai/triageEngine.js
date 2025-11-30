// AI Triage Engine - GPT 활용
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const calculateTriageScore = async (petData, symptomData, medicalDiagnosis, csSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.OPENAI);
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Triage Engine"입니다.

[역할]
- Medical Agent의 진단 결과와 증상 요약을 바탕으로 응급도를 점수화합니다.
- 0~5 사이의 triage_score를 계산합니다. (0=전혀 응급 아님, 5=즉각적인 응급 상황)
- health_flags를 생성하여 어떤 부위에 문제가 있는지, 전반적인 에너지 상태가 어떤지 정리합니다.
- 이 출력은 아바타(디지털 트윈)와 병원 사전 패킷 양쪽 모두에서 사용됩니다.`;

  const userPrompt = `반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 나이: ${petData.age || '미등록'}세

증상: ${symptomData?.symptomText || '증상 정보 없음'}

수의사 진단:
${JSON.stringify(medicalDiagnosis, null, 2)}

CS Agent 요약:
${JSON.stringify(csSummary, null, 2)}

[출력 형식 - JSON ONLY]

{
  "triage_score": 0,
  "triage_level": "green | yellow | orange | red",
  "emergency_summary_kor": "응급도와 관련된 한 문장 요약",
  "recommended_action_window": "지금 바로 | 오늘 안에 | 24~48시간 내 | 증상 악화 시 | 경과 관찰",
  "health_flags": {
    "earIssue": false,
    "digestionIssue": false,
    "skinIssue": false,
    "fever": false,
    "energyLevel": 0.8
  }
}

세부 규칙:
- triage_score:
  - 0~1: 거의 문제 없음
  - 2: 경미, 외래 진료 필요성 낮음
  - 3: 주의 필요, 24~48시간 내 외래 권장
  - 4: 높은 위험, 오늘 안에 진료 권장
  - 5: 응급, 즉시 병원 방문 필요

- triage_level:
  - green: 0~1
  - yellow: 2
  - orange: 3~4
  - red: 5

- health_flags:
  - Medical Agent의 possible_diseases와 body_part, risk_level을 근거로 값 설정
  - energyLevel: 0~1 범위 실수 (0=매우 무기력, 1=정상 혹은 매우 활발)

출력은 반드시 JSON만 반환하세요.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    return content;
  } catch (error) {
    console.error('Triage Engine 오류:', error);
    
    // Fallback
    const riskLevel = medicalDiagnosis?.risk_level || medicalDiagnosis?.riskLevel || 'moderate';
    let triageScore = 2;
    let triageLevel = 'yellow';
    let urgency = '24~48시간 내';
    
    if (riskLevel === 'emergency' || riskLevel === 'Emergency') {
      triageScore = 5;
      triageLevel = 'red';
      urgency = '지금 바로';
    } else if (riskLevel === 'high' || riskLevel === 'High') {
      triageScore = 4;
      triageLevel = 'orange';
      urgency = '오늘 안에';
    } else if (riskLevel === 'low' || riskLevel === 'Low') {
      triageScore = 1;
      triageLevel = 'green';
      urgency = '경과 관찰';
    } else {
      triageScore = 3;
      triageLevel = 'orange';
      urgency = '24~48시간 내';
    }
    
    // health_flags 생성
    const possibleDiseases = medicalDiagnosis?.possible_diseases || [];
    const healthFlags = {
      earIssue: possibleDiseases.some(d => d.body_part === '귀'),
      digestionIssue: possibleDiseases.some(d => d.body_part === '소화기'),
      skinIssue: possibleDiseases.some(d => d.body_part === '피부'),
      fever: false,
      energyLevel: triageScore <= 2 ? 0.8 : triageScore <= 3 ? 0.6 : 0.4
    };
    
    return {
      triage_score: triageScore,
      triage_level: triageLevel,
      emergency_summary_kor: `${urgency} 병원 방문을 권장합니다.`,
      recommended_action_window: urgency,
      health_flags: healthFlags
    };
  }
};
