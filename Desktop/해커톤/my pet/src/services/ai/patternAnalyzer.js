// 건강 패턴 분석 - Gemini Flash 활용
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const analyzeHealthPattern = async (petData, dailyLogs) => {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  // 최근 7일 데이터만 사용
  const recentLogs = dailyLogs.slice(-7);
  
  if (recentLogs.length < 3) {
    // 데이터가 부족하면 기본값 반환
    return {
      patterns: [],
      predictions: [],
      health_flags: {
        energy_level: 0.8,
        ear_issue: false,
        digestion_issue: false,
        skin_issue: false
      },
      recommendations: ['더 많은 데이터를 기록해주세요.']
    };
  }

  const prompt = `당신은 반려동물 건강 패턴 분석 전문가입니다.

반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}

최근 7일 건강 기록:
${JSON.stringify(recentLogs, null, 2)}

다음 JSON 형식으로 분석 결과를 제공하세요:
{
  "patterns": [
    "패턴 설명 1",
    "패턴 설명 2"
  ],
  "predictions": [
    "예측된 건강 변화 1",
    "예측된 건강 변화 2"
  ],
  "health_flags": {
    "energy_level": 0.0-1.0,
    "ear_issue": true/false,
    "digestion_issue": true/false,
    "skin_issue": true/false
  },
  "recommendations": [
    "권장 사항 1",
    "권장 사항 2"
  ]
}

한국어로 응답하세요.`;

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
    
    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('패턴 분석 오류:', error);
    
    // Fallback: 간단한 패턴 분석
    const avgFood = recentLogs.reduce((sum, log) => sum + (log.food_count || 0), 0) / recentLogs.length;
    const avgActivity = recentLogs.reduce((sum, log) => sum + (log.activity_level || 5), 0) / recentLogs.length;
    
    const patterns = [];
    const predictions = [];
    const health_flags = {
      energy_level: Math.min(1, avgActivity / 10),
      ear_issue: false,
      digestion_issue: avgFood < 2,
      skin_issue: false
    };
    
    if (avgFood < 2) {
      patterns.push('최근 식사 횟수가 평소보다 적습니다.');
      predictions.push('식욕 부진이 지속될 수 있습니다.');
    }
    
    if (avgActivity < 5) {
      patterns.push('활동량이 감소하고 있습니다.');
      predictions.push('에너지 저하가 예상됩니다.');
    }
    
    return {
      patterns,
      predictions,
      health_flags,
      recommendations: ['정기적인 건강 관찰을 계속해주세요.']
    };
  }
};

