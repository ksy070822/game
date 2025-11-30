// CS Agent - Gemini Flash (빠르고 저렴, 문진/요약 특화)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const callCSAgent = async (petData, symptomData) => {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const prompt = `${COMMON_CONTEXT}

당신은 "CS Agent (상담 간호사)"입니다.

[역할]
- 보호자가 입력한 증상/상황을 이해하기 쉽게 요약합니다.
- 언제부터, 얼마나 자주, 어떤 상황에서 심해지는지 등 빠진 정보를 체크합니다.
- 현재 응급 여부를 1차적으로 추정합니다. (단, 최종 응급 판단은 Medical Agent와 Triage Engine이 수행)
- 보호자가 다음에 무엇을 하면 좋을지 간단히 안내합니다.

[입력으로 받는 데이터]
- pet_profile: 반려동물 기본 정보
- user_description: 보호자가 입력한 자유 텍스트 증상 설명

반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}
- 나이: ${petData.age || '미등록'}세
${petData.weight ? `- 체중: ${petData.weight}kg` : ''}

보호자 증상 설명:
${symptomData.symptomText || '증상 정보 없음'}

${symptomData.images?.length > 0 ? `사진 ${symptomData.images.length}장이 첨부되었습니다.` : ''}

[출력 형식 - JSON ONLY]
다음 구조로만 출력하세요:

{
  "summary_kor": "보호자 설명을 기반으로 한 증상 요약 (한국어, 3~5문장)",
  "key_symptoms": ["핵심 증상 1", "핵심 증상 2"],
  "onset": "증상이 처음 나타난 시점에 대한 추정 (예: 3일 전, 오늘 아침부터 등)",
  "duration": "지속 기간 요약 (예: 3일째 지속, 간헐적으로 일어남 등)",
  "suspected_body_parts": ["귀", "피부", "소화기", "호흡기", "눈", "관절/다리" 중 해당되는 부위 리스트],
  "first_urgency_assessment": "low | moderate | high | emergency 중 하나",
  "missing_information": ["추가로 물어보고 싶은 질문 1", "추가로 물어보고 싶은 질문 2"],
  "next_step_brief": "사용자에게 보여줄, 한 문장짜리 다음 단계 안내"
}

규칙:
- 응급도가 애매할 경우, 과신하지 말고 'moderate'로 지정하세요.
- 출력은 반드시 JSON 하나만 반환하십시오.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      const result = JSON.parse(jsonMatch[0]);
      return {
        json: result,
        message: `안녕하세요, ${petData.petName} 보호자님.\n\n접수 완료했습니다.\n\n환자 정보:\n• 이름: ${petData.petName}\n• 종류: ${petData.species === 'dog' ? '개' : '고양이'}\n• 품종: ${petData.breed || '미등록'}\n\n증상 요약: ${result.summary_kor}\n\n→ Information Agent에게 전달합니다.`
      };
    }
    
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('CS Agent 오류:', error);
    // Fallback
    return {
      json: {
        summary_kor: `${petData.petName}의 증상 접수가 완료되었습니다.`,
        key_symptoms: [],
        onset: '알 수 없음',
        duration: '알 수 없음',
        suspected_body_parts: [],
        first_urgency_assessment: 'moderate',
        missing_information: [],
        next_step_brief: 'AI 수의사에게 종합 진단을 받아보는 것이 좋겠습니다.'
      },
      message: `안녕하세요, ${petData.petName} 보호자님.\n\n접수 완료했습니다.\n\n→ Information Agent에게 전달합니다.`
    };
  }
};
