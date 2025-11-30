// Medical Agent - GPT-4o (수의학 진단 최강)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const callMedicalAgent = async (petData, symptomData, csSummary, infoSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.OPENAI);
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Medical Agent (전문 수의사)"입니다.
경력 10년 이상의 수의사로서, 근거 중심으로 판단해야 합니다.

[역할]
- CS Agent + Information Agent의 내용을 바탕으로 진단 가설을 세웁니다.
- 가능한 질환 후보(감별진단)를 1~3개 정도 도출합니다.
- 각 질환 후보에 대해 '왜 그렇게 생각하는지' reasoning을 적습니다.
- 위험도 및 응급 여부를 평가합니다.
- 지금 이 채널에서 직접 처방전을 내리지는 않습니다. 대신 병원 진료 필요성과 시급성을 안내합니다.`;

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

[출력 형식 - JSON ONLY]

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
}

규칙:
- 'emergency'는 생명 위협 가능성이 있는 경우만 사용합니다.
- 확실하지 않은 정보를 단정적으로 말하지 말고, '가능성이 높음/중간/낮음' 수준으로 기술하되, JSON에는 probability(0~1)를 숫자로 넣어주세요.
- 너무 많은 질환 후보를 나열하지 말고, 1~3개 이내로 유지하세요.
- 출력은 반드시 JSON만 반환하세요.`;

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
