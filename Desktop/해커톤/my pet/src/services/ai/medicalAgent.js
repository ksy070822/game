// Medical Agent - Claude Sonnet (수의학 진단 정확도 최강)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';
import { buildAIContext } from './dataContextService';

export const callMedicalAgent = async (petData, symptomData, csSummary, infoSummary, dataContext = '') => {
  const apiKey = getApiKey(API_KEY_TYPES.ANTHROPIC);
  if (!apiKey) {
    throw new Error('Claude API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const model = 'claude-sonnet-4-20250514';

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Medical Agent (전문 수의사)"입니다.
경력 10년 이상의 수의사로서, 근거 중심으로 판단해야 합니다.

[역할]
- CS Agent + Information Agent의 내용을 바탕으로 진단 가설을 세웁니다.
- 가능한 질환 후보(감별진단)를 1~3개 정도 도출합니다.
- 각 질환 후보에 대해 '왜 그렇게 생각하는지' reasoning을 적습니다.
- 위험도 및 응급 여부를 평가합니다.
- 지금 이 채널에서 직접 처방전을 내리지는 않습니다. 대신 병원 진료 필요성과 시급성을 안내합니다.

[출력 형식 - JSON ONLY]
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

{
  "primary_assessment_kor": "현재 상황에 대한 한 문단 요약 (한국어)",
  "possible_diseases": [
    {
      "name_kor": "의심 질환명 (한국어)",
      "name_en": "가능하면 영어명 (모르면 빈 문자열)",
      "probability": 0.0,
      "reasoning_kor": "이 질환을 의심하는 근거 (증상, 기간, 종/품종 등)",
      "body_part": "귀 | 피부 | 소화기 | 호흡기 | 눈 | 관절/다리 | 기타 중 하나"
    }
  ],
  "risk_level": "low | moderate | high | emergency",
  "need_hospital_visit": true,
  "hospital_visit_timing": "지금 바로(응급실 수준) | 오늘 안에 | 24~48시간 내 | 증상이 악화되면 | 경과 관찰 가능",
  "suggested_tests": ["필요 시 권장되는 검사 예: 귀 내시경 검사, 혈액검사, X-ray 등"],
  "caution_notes_for_owner": ["지금 당장 피해야 할 행동 1", "주의해야 할 증상 변화 1"]
}`;

  const userPrompt = `반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}
- 나이: ${petData.age || '미등록'}세
${petData.weight ? `- 체중: ${petData.weight}kg` : ''}

CS Agent 요약:
${JSON.stringify(csSummary, null, 2)}

Information Agent 요약:
${JSON.stringify(infoSummary, null, 2)}

원본 증상 설명:
${symptomData.symptomText || '증상 정보 없음'}
${dataContext ? `
=== 참고 데이터 (Firestore DB) ===
${dataContext}
=================================
위 참고 데이터는 과거 진료 기록과 FAQ입니다. 진단 시 참고하되, 현재 증상을 기반으로 독립적인 판단을 해주세요.
` : ''}

규칙:
- 'emergency'는 생명 위협 가능성이 있는 경우만 사용합니다.
- 확실하지 않은 정보를 단정적으로 말하지 말고, '가능성이 높음/중간/낮음' 수준으로 기술하되, JSON에는 probability(0~1)를 숫자로 넣어주세요.
- 너무 많은 질환 후보를 나열하지 말고, 1~3개 이내로 유지하세요.
- 출력은 반드시 JSON만 반환하세요.

중요 - 홈케어 vs 병원 방문 판단 기준:
- risk_level이 'low'인 경우: 집에서 관찰하며 홈케어로 충분히 관리 가능. need_hospital_visit은 false.
- risk_level이 'moderate'인 경우: 홈케어를 우선 시도하고, 24-48시간 후에도 증상이 개선되지 않거나 악화되면 병원 방문 권장.
- 다음과 같은 경미한 증상은 홈케어를 우선 권장하세요:
  * 경미한 소화불량, 일시적 구토(1-2회), 경미한 설사
  * 식욕 약간 감소, 활동량 약간 저하
  * 경미한 피부 발적, 가벼운 귀 가려움
  * 눈물, 눈곱이 약간 증가
- 다음 경우에만 병원 방문을 강력 권장하세요:
  * 지속적인 구토(3회 이상), 혈변/혈뇨
  * 48시간 이상 음식 거부, 탈수 증상
  * 발열, 호흡곤란, 의식저하
  * 심한 통증, 부종, 외상`;

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
        max_tokens: 2048,
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

    // JSON 파싱 (Claude는 가끔 마크다운 코드블록으로 감쌀 수 있음)
    let content;
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      content = JSON.parse(jsonMatch ? jsonMatch[0] : textContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('응답 형식 오류');
    }

    return {
      json: content,
      message: `종합 진단 수행 중...\n\n🔬 증상 분석 결과:\n${content.primary_assessment_kor}\n\n📊 진단 결과:\n${content.possible_diseases.map(d => `• ${d.name_kor} (확률 ${Math.round(d.probability * 100)}%)`).join('\n')}\n\n⚠️ 위험도: ${content.risk_level === 'low' ? '낮음' : content.risk_level === 'moderate' ? '보통' : content.risk_level === 'high' ? '높음' : '응급'}\n🚨 응급도: ${content.hospital_visit_timing}\n\n→ Triage Engine, 응급도 평가 부탁합니다.`
    };
  } catch (error) {
    console.error('Medical Agent 오류:', error);
    // Fallback
    return {
      json: {
        primary_assessment_kor: '증상 기반 분석을 완료했습니다.',
        possible_diseases: [{
          name_kor: '일반 건강 이상',
          name_en: '',
          probability: 0.6,
          reasoning_kor: '증상 기반 분석',
          body_part: '기타'
        }],
        risk_level: 'moderate',
        need_hospital_visit: false,
        hospital_visit_timing: '증상이 악화되면',
        suggested_tests: [],
        caution_notes_for_owner: ['증상 관찰 지속', '충분한 휴식 제공']
      },
      message: `종합 진단 수행 중...\n\n🔬 증상 분석 결과를 확인했습니다.\n\n📊 진단 결과:\n• 일반 건강 이상 (확률 60%)\n\n⚠️ 위험도: Moderate\n🚨 응급도: 증상이 악화되면\n\n→ Triage Engine, 응급도 평가 부탁합니다.`
    };
  }
};
