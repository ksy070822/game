// Care Agent - Gemini Pro (홈케어 가이드 작성 특화)
import { COMMON_CONTEXT, getSpeciesDisplayName } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const callCareAgent = async (petData, opsData, medicalDiagnosis, triageResult) => {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  // gemini-2.0-flash 사용 (다른 에이전트와 통일, 더 빠르고 안정적)
  const model = import.meta.env.VITE_GEMINI_CARE_MODEL || 'gemini-2.0-flash';

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
- 종류: ${getSpeciesDisplayName(petData.species)}
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
    "오늘 당장 해주면 좋은 조치 2",
    "구체적인 케어 방법 (예: 어떤 음식을 얼마나, 휴식 환경 조성법)"
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
  "follow_up_guide": {
    "need_follow_up": true,
    "timing": "24~48시간 후 | 3일 후 | 1주일 후 | 증상 악화 시만",
    "condition_for_hospital": "이런 증상이 나타나면 병원 방문이 필요합니다",
    "home_care_duration": "홈케어 권장 기간 (예: 2~3일간 관찰)"
  },
  "care_tone_message": "보호자에게 건네는 짧은 응원/안심 메시지 (한국어 1~2문장)",
  "hospital_needed": false
}

규칙:
- triage_score가 0~2 (green/yellow)인 경우: 홈케어를 중심으로 상세하고 실용적인 케어 가이드를 제공하세요. hospital_needed는 false.
- triage_score가 3인 경우: 홈케어를 우선 안내하되, 24~48시간 후에도 개선이 없으면 병원 방문을 권장. hospital_needed는 조건부 true.
- triage_result가 red 또는 emergency인 경우: immediate_home_care 내용은 최소화하고 '즉시 병원 방문'을 우선 안내. hospital_needed는 true.
- 과학적으로 논란이 있거나 검증되지 않은 민간요법은 절대 제안하지 마세요.
- follow_up_guide에 재진료/재평가 시점과 조건을 명확히 안내하세요.
- 경미한 증상은 "집에서 충분히 관리 가능합니다"라는 안심 메시지를 포함하세요.
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
      const followUpText = careGuide.follow_up_guide ? `
[재진료/재평가 안내]
• 시점: ${careGuide.follow_up_guide.timing || '증상 악화 시'}
• 홈케어 기간: ${careGuide.follow_up_guide.home_care_duration || '2~3일간 관찰'}
• 병원 방문 필요 조건: ${careGuide.follow_up_guide.condition_for_hospital || '증상이 악화되거나 새로운 증상이 나타날 경우'}
` : '';

      const hospitalNeededText = careGuide.hospital_needed
        ? '\n⚠️ 병원 방문을 권장합니다.'
        : '\n✅ 현재는 홈케어로 충분히 관리 가능합니다.';

      const fullGuideText = `
${careGuide.care_tone_message}
${hospitalNeededText}

[즉시 조치 사항]
${careGuide.immediate_home_care.map(a => `• ${a}`).join('\n')}

[피해야 할 행동]
${careGuide.things_to_avoid.map(a => `• ${a}`).join('\n')}

[관찰 포인트]
${careGuide.monitoring_guide.map(a => `• ${a}`).join('\n')}
${followUpText}
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
    const isLowRisk = triageResult?.triage_score <= 2;

    const fallbackCareGuide = {
      immediate_home_care: isEmergency
        ? ['즉시 병원 방문이 필요합니다. 집에서의 케어는 최소화하세요.']
        : isLowRisk
        ? ['충분한 휴식을 제공하세요', '신선한 물을 자주 제공하세요', '소화가 잘 되는 부드러운 음식을 소량씩 급여하세요', '조용하고 편안한 환경을 만들어주세요']
        : ['증상 관찰 지속', '충분한 휴식 제공', '수분 섭취 촉진'],
      things_to_avoid: ['과도한 활동', '스트레스 유발 환경', '갑작스러운 식단 변화'],
      monitoring_guide: ['증상 변화 관찰', '식욕 및 배변 상태 확인', '활동량 변화 체크'],
      long_term_prevention: ['정기적인 건강 검진', '균형 잡힌 식단'],
      follow_up_guide: {
        need_follow_up: !isLowRisk,
        timing: isEmergency ? '즉시' : isLowRisk ? '증상 악화 시만' : '24~48시간 후',
        condition_for_hospital: '증상이 악화되거나 새로운 증상(구토, 설사, 식욕부진 등)이 나타날 경우',
        home_care_duration: isLowRisk ? '2~3일간 관찰' : '24시간 관찰'
      },
      care_tone_message: isLowRisk
        ? `${petData.petName}의 증상은 경미해 보입니다. 집에서 충분히 관리 가능합니다!`
        : `${petData.petName}의 빠른 회복을 기원합니다.`,
      hospital_needed: isEmergency
    };

    const fallbackFullGuide = isLowRisk
      ? `✅ 현재는 홈케어로 충분히 관리 가능합니다.\n\n[즉시 조치]\n${fallbackCareGuide.immediate_home_care.map(a => `• ${a}`).join('\n')}\n\n[재진료 안내]\n• ${fallbackCareGuide.follow_up_guide.timing}에 재평가하세요.`
      : '기본 케어 가이드';

    return {
      json: fallbackCareGuide,
      message: isLowRisk
        ? `${petData.petName}를 위한 케어 플랜!\n\n✅ 홈케어로 충분합니다.\n\n즉시 조치:\n✓ 충분한 휴식 제공\n✓ 수분 섭취 촉진\n\n증상이 악화되면 재진료를 받아보세요.`
        : `${petData.petName}를 위한 케어 플랜!\n\n즉시 조치:\n✓ 증상 관찰 지속\n✓ 충분한 휴식 제공`,
      fullGuide: fallbackFullGuide
    };
  }
};
