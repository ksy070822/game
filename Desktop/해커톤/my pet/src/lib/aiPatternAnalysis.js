// Gemini를 이용한 케어 패턴 분석
import { getRecentCareLogs } from "./careLogs";
import { getApiKey, API_KEY_TYPES } from "../services/apiKeyManager";

/**
 * Gemini Flash를 사용하여 케어 패턴 분석 및 healthFlags 생성
 */
export async function analyzeCarePatternWithGemini(pet, days = 7) {
  const logs = getRecentCareLogs(pet.id, days);

  // 로그가 없으면 null
  if (!logs.length) {
    return null;
  }

  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);

  // API 키가 없으면 더미 값 반환
  if (!apiKey) {
    console.warn('Gemini API 키가 없습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
    return {
      earIssue: false,
      digestionIssue: logs.some((l) => l.poopCount >= 3),
      skinIssue: false,
      energyLevel: 0.7,
      fever: false,
    };
  }

  const systemPrompt = `당신은 반려동물 건강 패턴 분석 AI입니다.
아래 ${days}일치 케어 로그를 보고, 패턴 변화를 감지하고 건강상태 플래그와 예측을 JSON으로만 출력하세요.

출력 형식:
{
  "health_flags": {
    "earIssue": boolean,
    "digestionIssue": boolean,
    "skinIssue": boolean,
    "energyLevel": number,  // 0~1
    "fever": boolean
  },
  "patterns": [
    "패턴 변화 설명 1",
    "패턴 변화 설명 2"
  ],
  "predictions": [
    "다음 3일 예측 1",
    "다음 3일 예측 2"
  ],
  "risk_changes": {
    "description": "위험도 변화 설명",
    "trend": "up" | "down" | "stable"
  }
}

꼭 JSON만 출력하세요. 설명 문장은 쓰지 마세요.`;

  const userContent = `반려동물 정보:
- 이름: ${pet.petName || pet.name}
- 종: ${pet.species === 'dog' ? '개' : pet.species === 'cat' ? '고양이' : pet.species}
- 품종: ${pet.breed || "미입력"}

최근 ${logs.length}일 케어 로그:
${logs.map(l => `- ${l.date}: 밥 ${l.mealCount || 0}회, 물 ${l.waterCount || 0}회, 산책 ${l.walkCount || 0}회, 배변 ${l.poopCount || 0}회, 체중 ${l.weight || "?"}kg, 메모: ${l.note || "없음"}`).join("\n")}

위 로그를 분석하여:
1. 패턴 변화 감지 (예: "최근 3일간 활동량 20% 감소", "배변 패턴이 불규칙해짐")
2. 다음 3일 예측 (예: "활동량 증가 필요", "소화기 건강 주의")
3. health_flags 생성

JSON으로 출력하세요.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: userContent }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // health_flags를 최상위로 올리기 (하위에 있을 경우)
      if (parsed.health_flags) {
        return {
          ...parsed.health_flags,
          patterns: parsed.patterns || [],
          predictions: parsed.predictions || [],
          risk_changes: parsed.risk_changes || null
        };
      }
      return parsed;
    }
    
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('패턴 분석 오류:', error);
    
    // Fallback: 간단한 규칙 기반 분석
    const avgMeal = logs.reduce((sum, l) => sum + (l.mealCount || 0), 0) / logs.length;
    const avgWalk = logs.reduce((sum, l) => sum + (l.walkCount || 0), 0) / logs.length;
    const avgPoop = logs.reduce((sum, l) => sum + (l.poopCount || 0), 0) / logs.length;
    
    return {
      earIssue: false,
      digestionIssue: avgPoop > 3 || logs.some(l => (l.note || '').toLowerCase().includes('설사') || (l.note || '').toLowerCase().includes('구토')),
      skinIssue: logs.some(l => (l.note || '').toLowerCase().includes('가려움') || (l.note || '').toLowerCase().includes('피부')),
      energyLevel: Math.min(1, Math.max(0, (avgWalk / 3) * 0.5 + (avgMeal / 2) * 0.5)),
      fever: logs.some(l => (l.note || '').toLowerCase().includes('열') || (l.note || '').toLowerCase().includes('발열')),
    };
  }
}

