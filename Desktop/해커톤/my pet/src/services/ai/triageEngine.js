// AI Triage Engine - Claude Sonnet (신중한 응급도 판정)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const calculateTriageScore = async (petData, symptomData, medicalDiagnosis, csSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.ANTHROPIC);
  if (!apiKey) {
    throw new Error('Claude API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const model = 'claude-sonnet-4-20250514';

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Triage Engine"입니다.

[역할]
- Medical Agent의 진단 결과와 증상 요약을 바탕으로 응급도를 점수화합니다.
- 0~5 사이의 triage_score를 계산합니다. (0=전혀 응급 아님, 5=즉각적인 응급 상황)
- health_flags를 생성하여 어떤 부위에 문제가 있는지, 전반적인 에너지 상태가 어떤지 정리합니다.
- 이 출력은 아바타(디지털 트윈)와 병원 사전 패킷 양쪽 모두에서 사용됩니다.

[출력 형식 - JSON ONLY]
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

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
  - 0~1: 거의 문제 없음 → 홈케어로 충분, 병원 방문 불필요
  - 2: 경미, 홈케어 권장 → 집에서 관찰하며 관리, 증상 악화 시에만 병원
  - 3: 주의 필요 → 24~48시간 홈케어 후 개선 없으면 외래 진료
  - 4: 높은 위험, 오늘 안에 진료 권장
  - 5: 응급, 즉시 병원 방문 필요

- triage_level:
  - green: 0~1 → "홈케어로 충분합니다. 경과 관찰하세요."
  - yellow: 2 → "홈케어를 권장합니다. 증상이 악화되면 병원 방문을 고려하세요."
  - orange: 3~4 → "24시간 내 병원 방문을 권장합니다."
  - red: 5 → "즉시 병원 방문이 필요합니다."

- recommended_action_window 선택 기준:
  - "경과 관찰": green 등급, 홈케어로 충분한 경미한 증상
  - "증상 악화 시": yellow 등급, 홈케어하며 악화 시에만 병원
  - "24~48시간 내": orange 등급, 개선 없으면 병원
  - "오늘 안에": orange 고위험
  - "지금 바로": red 등급, 응급

- health_flags:
  - Medical Agent의 possible_diseases와 body_part, risk_level을 근거로 값 설정
  - energyLevel: 0~1 범위 실수 (0=매우 무기력, 1=정상 혹은 매우 활발)

중요: 경미한 증상(일시적 구토, 경미한 설사, 식욕 약간 감소, 가벼운 피부 증상)은 triage_score 0~2로 평가하고 홈케어를 우선 권장하세요. 모든 증상에 병원 방문을 권장하지 마세요.`;

  const userPrompt = `반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 나이: ${petData.age || '미등록'}세

증상: ${symptomData?.symptomText || '증상 정보 없음'}
${symptomData?.guardianResponsesSummary ? `
★★★ 보호자 추가 문진 응답 (매우 중요 - 응급도 평가에 반드시 반영) ★★★
${symptomData.guardianResponsesSummary}

주의: 위 보호자 문진 결과에서 다음 조건이 해당되면 triage_score를 상향 조정하세요:
- 증상 지속 기간이 "일주일 이상"이면 +1
- 식욕이 "거의 안 먹음" 또는 "전혀 안 먹음"이면 +1
- 활동량이 "거의 움직이지 않음"이면 +1
- 동반 증상에 "호흡곤란", "발열"이 있으면 +2
` : ''}

수의사 진단:
${JSON.stringify(medicalDiagnosis, null, 2)}

CS Agent 요약:
${JSON.stringify(csSummary, null, 2)}

출력은 반드시 JSON만 반환하세요.`;

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
        model: model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API 오류: ${response.status} - ${errorData.error?.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    const textContent = data.content[0].text;

    // JSON 파싱
    let content;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      content = JSON.parse(jsonMatch ? jsonMatch[0] : textContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('응답 형식 오류');
    }

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
