// Care Agent - Gemini Pro/Flash (홈케어 가이드 작성 특화)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const callCareAgent = async (petData, opsData, medicalDiagnosis, triageResult) => {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const model = import.meta.env.VITE_GEMINI_CARE_MODEL || 'gemini-1.5-pro';

  const prompt = `${COMMON_CONTEXT}

당신은 "Care Agent (케어 플래너)"입니다.

[역할]
- Medical / Triage / Ops 결과를 바탕으로, 보호자가 집에서 할 수 있는 케어 플랜을 만듭니다.
- 응급을 요하는 경우 '집에서 케어'보다는 병원 방문을 우선하도록 안내합니다.
- 일상 관리/예방 팁도 함께 제공합니다.
- 과장되지 않고, 현실적인 수준의 조언만 합니다.

[입력]
- pet_profile: 반려동물 정보
- medical_result: Medical Agent JSON
- triage_result: Triage Engine JSON
- ops_medical_log: Ops Agent의 medical_log

반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}

Medical Agent 진단:
${JSON.stringify(medicalDiagnosis, null, 2)}

Triage Engine 결과:
${JSON.stringify(triageResult, null, 2)}

Ops Agent 진료 기록:
${JSON.stringify(opsData?.medical_log || {}, null, 2)}

[출력 형식 - JSON ONLY]

{
  "immediate_home_care": [
    "오늘 당장 집에서 해줄 수 있는 구체적인 조치 1",
    "오늘 당장 해주면 좋은 조치 2"
  ],
  "things_to_avoid": [
    "피해야 할 행동/음식/환경 1",
    "피해야 할 행동 2"
  ],
  "monitoring_guide": [
    "오늘과 내일 관찰해야 할 포인트 1",
    "악화 신호가 나타나면 바로 병원에 가야 하는 기준"
  ],
  "long_term_prevention": [
    "향후 1~3개월 동안 도움이 될 수 있는 관리 방법",
    "식단/운동/환경 관리 등"
  ],
  "care_tone_message": "보호자에게 건네는 짧은 응원/안심 메시지 (한국어 1~2문장)"
}

규칙:
- triage_result가 red 또는 emergency인 경우, immediate_home_care 내용은 최소화하고 '즉시 병원 방문'을 우선 안내하세요.
- 과학적으로 논란이 있거나 검증되지 않은 민간요법은 절대 제안하지 마세요.
- 출력은 반드시 JSON만 반환하세요.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const careGuide = JSON.parse(jsonMatch[0]);
      
      // 텍스트 형식으로도 변환
      const fullGuideText = `
${careGuide.care_tone_message}

[즉시 조치 사항]
${careGuide.immediate_home_care.map(a => `• ${a}`).join('\n')}

[피해야 할 행동]
${careGuide.things_to_avoid.map(a => `• ${a}`).join('\n')}

[관찰 포인트]
${careGuide.monitoring_guide.map(a => `• ${a}`).join('\n')}

[장기 예방]
${careGuide.long_term_prevention.map(a => `• ${a}`).join('\n')}
      `.trim();
      
      return {
        json: careGuide,
        message: `${petData.petName}를 위한 케어 플랜이 준비되었습니다!\n\n${careGuide.care_tone_message}`,
        fullGuide: fullGuideText
      };
    }
    
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('Care Agent 오류:', error);
    
    // Fallback
    const isEmergency = triageResult?.triage_level === 'red' || triageResult?.triage_score >= 4;
    
    return {
      json: {
        immediate_home_care: isEmergency 
          ? ['즉시 병원 방문이 필요합니다. 집에서의 케어는 최소화하세요.']
          : ['증상 관찰 지속', '충분한 휴식 제공', '수분 섭취 촉진'],
        things_to_avoid: ['과도한 활동', '스트레스 유발 환경'],
        monitoring_guide: ['증상 변화 관찰', '식욕 및 배변 상태 확인'],
        long_term_prevention: ['정기적인 건강 검진', '균형 잡힌 식단'],
        care_tone_message: `${petData.petName}의 빠른 회복을 기원합니다.`
      },
      message: `${petData.petName}를 위한 케어 플랜!\n\n즉시 조치:\n✓ 증상 관찰 지속\n✓ 충분한 휴식 제공`,
      fullGuide: '기본 케어 가이드'
    };
  }
};
