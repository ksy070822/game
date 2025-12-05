// Information Agent - GPT-4o Vision (이미지 기반 증상 분석 + 정보 수집)
import { COMMON_CONTEXT, getSpeciesDisplayName } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

// 보호자에게 물어볼 질문 생성
export const generateFollowUpQuestions = async (petData, symptomData, csSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);
  if (!apiKey) {
    // Fallback: 기본 질문
    return getDefaultQuestions(symptomData);
  }

  const prompt = `당신은 동물병원의 간호사입니다. 보호자가 설명한 증상을 바탕으로, 정확한 진단을 위해 추가로 확인해야 할 질문 2-3개를 생성해주세요.

[반려동물 정보]
- 이름: ${petData.petName}
- 종류: ${getSpeciesDisplayName(petData.species)}
- 품종: ${petData.breed || '미등록'}

[보호자가 설명한 증상]
${symptomData.symptomText || '증상 정보 없음'}

[출력 형식 - JSON ONLY]
{
  "questions": [
    {
      "question": "보호자에게 물어볼 질문 (친절하고 구체적으로)",
      "reason": "이 질문을 하는 이유 (내부용)"
    }
  ],
  "intro_message": "보호자에게 질문하기 전 간단한 인사말"
}

규칙:
- 질문은 2-3개만 생성하세요
- 질문은 예/아니오로 답할 수 있거나, 구체적인 정보를 요청하는 형태로
- 친근하고 이해하기 쉽게 작성`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
        console.error('[Information Agent] Gemini API 키가 유효하지 않습니다:', errorData.error?.message);
      }
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('질문 생성 오류:', error);
  }

  return getDefaultQuestions(symptomData);
};

// 기본 질문 (fallback)
const getDefaultQuestions = (symptomData) => {
  const symptomText = (symptomData?.symptomText || '').toLowerCase();
  const questions = [];

  if (symptomText.includes('구토') || symptomText.includes('설사')) {
    questions.push({
      question: "마지막으로 먹은 음식이 무엇인가요? 평소와 다른 음식을 먹었나요?",
      reason: "식이 관련 원인 파악"
    });
    questions.push({
      question: "구토/설사의 색깔이나 냄새에 특이한 점이 있나요?",
      reason: "증상 심각도 파악"
    });
  } else if (symptomText.includes('귀') || symptomText.includes('긁')) {
    questions.push({
      question: "귀에서 냄새가 나거나 분비물이 보이나요?",
      reason: "감염 여부 확인"
    });
    questions.push({
      question: "언제부터 귀를 긁기 시작했나요?",
      reason: "증상 기간 파악"
    });
  } else {
    questions.push({
      question: "증상이 언제부터 시작되었나요?",
      reason: "증상 기간 파악"
    });
    questions.push({
      question: "식욕과 활동량은 평소와 비교해서 어떤가요?",
      reason: "전반적 건강 상태 파악"
    });
  }

  return {
    questions: questions,
    intro_message: `${symptomData?.symptomText ? '말씀해주신 증상을 확인했습니다.' : ''} 정확한 진단을 위해 몇 가지 여쭤볼게요.`
  };
};

// 보호자 답변 분석 - GPT-4o Vision (이미지 분석 포함)
export const analyzeOwnerResponse = async (petData, symptomData, ownerResponses, csSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.OPENAI);

  const combinedSymptoms = `${symptomData.symptomText || ''}\n\n[보호자 추가 답변]\n${ownerResponses.map((r, i) => `Q${i+1}: ${r.question}\nA${i+1}: ${r.answer}`).join('\n')}`;

  if (!apiKey) {
    // Fallback
    return {
      json: {
        symptom_keywords: ['증상 확인됨'],
        body_part_focus: ['기타'],
        severity_hint: 'medium',
        possible_categories: ['일반 질환'],
        owner_responses_summary: ownerResponses.map(r => r.answer).join(', '),
        notes_for_medical_agent: `보호자 답변을 바탕으로 추가 정보가 수집되었습니다. ${ownerResponses.length}개의 질문에 답변을 받았습니다.`,
        visual_findings: null
      },
      message: `보호자님 답변 감사합니다.\n\n📋 수집된 정보를 정리했습니다.\n👨‍⚕️ 담당 수의사 선생님께 진료 의뢰드립니다.`
    };
  }

  const systemPrompt = `${COMMON_CONTEXT}

당신은 "Information Agent (증상 사전 상담실)"이며 GPT-4o Vision을 활용하여 이미지 기반 증상 분석을 수행합니다.

[역할]
- 보호자의 초기 증상 설명과 추가 질문에 대한 답변을 종합하여 정보를 구조화합니다.
- 제공된 이미지가 있다면 시각적으로 관찰 가능한 증상을 분석합니다.
- Medical Agent가 진단에 활용할 수 있도록 핵심 정보를 정리합니다.

[출력 형식 - JSON ONLY]
{
  "symptom_keywords": ["증상 키워드 1", "증상 키워드 2"],
  "body_part_focus": ["귀", "피부", "소화기" 등 관련 부위],
  "severity_hint": "low | medium | high",
  "possible_categories": ["질환 카테고리 1", "질환 카테고리 2"],
  "owner_responses_summary": "보호자 답변 요약 (한국어 2-3문장)",
  "notes_for_medical_agent": "Medical Agent가 참고할 핵심 포인트 (한국어 3-4문장)",
  "visual_findings": "이미지에서 발견된 시각적 소견 (이미지가 있을 경우, 한국어 2-3문장)"
}`;

  const userPrompt = `
반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${getSpeciesDisplayName(petData.species)}
- 품종: ${petData.breed || '미등록'}

CS Agent 요약:
${JSON.stringify(csSummary, null, 2)}

[보호자 증상 설명 및 답변]
${combinedSymptoms}`;

  try {
    // GPT-4o Vision 메시지 구성 (이미지 포함 가능)
    const messageContent = [
      { type: 'text', text: userPrompt }
    ];

    // 이미지가 있으면 추가
    if (symptomData.images && symptomData.images.length > 0) {
      for (const imageUrl of symptomData.images.slice(0, 3)) { // 최대 3개
        messageContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) throw new Error(`OpenAI API 오류: ${response.status}`);

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const content = JSON.parse(jsonMatch[0]);
      return {
        json: content,
        message: `보호자님 답변 감사합니다.\n\n📋 ${content.owner_responses_summary}\n\n${content.visual_findings ? `🔍 [이미지 분석] ${content.visual_findings}\n\n` : ''}${content.notes_for_medical_agent}\n\n👨‍⚕️ 담당 수의사 선생님께 진료 의뢰드립니다.`
      };
    }
  } catch (error) {
    console.error('GPT-4o Vision 분석 오류:', error);
  }

  // Fallback
  return {
    json: {
      symptom_keywords: ['증상 확인됨'],
      body_part_focus: ['기타'],
      severity_hint: 'medium',
      possible_categories: ['일반 질환'],
      owner_responses_summary: ownerResponses.map(r => r.answer).join(', '),
      notes_for_medical_agent: '보호자 답변을 바탕으로 추가 정보가 수집되었습니다.',
      visual_findings: null
    },
    message: `보호자님 답변 감사합니다.\n\n📋 수집된 정보를 정리했습니다.\n👨‍⚕️ 담당 수의사 선생님께 진료 의뢰드립니다.`
  };
};

// 기존 함수 (하위 호환용)
export const callInformationAgent = async (petData, symptomData, csSummary) => {
  const symptomText = (symptomData.symptomText || '').toLowerCase();
  const keywords = [];
  const bodyParts = [];
  const categories = [];

  if (symptomText.includes('귀') || symptomText.includes('이염')) {
    keywords.push('귀 문제');
    bodyParts.push('귀');
    categories.push('귀질환');
  }
  if (symptomText.includes('설사') || symptomText.includes('구토') || symptomText.includes('배변')) {
    keywords.push('소화기 문제');
    bodyParts.push('소화기');
    categories.push('소화기질환');
  }
  if (symptomText.includes('피부') || symptomText.includes('발진') || symptomText.includes('가려움')) {
    keywords.push('피부 문제');
    bodyParts.push('피부');
    categories.push('피부질환');
  }
  if (symptomText.includes('기침') || symptomText.includes('호흡')) {
    keywords.push('호흡기 문제');
    bodyParts.push('호흡기');
    categories.push('호흡기질환');
  }

  const severityHint = csSummary?.first_urgency_assessment === 'emergency' || csSummary?.first_urgency_assessment === 'high'
    ? 'high'
    : csSummary?.first_urgency_assessment === 'moderate'
    ? 'medium'
    : 'low';

  return {
    json: {
      symptom_keywords: keywords.length > 0 ? keywords : ['일반 증상'],
      body_part_focus: bodyParts.length > 0 ? bodyParts : ['기타'],
      severity_hint: severityHint,
      possible_categories: categories.length > 0 ? categories : ['일반 질환'],
      related_past_cases_summary: '',
      notes_for_medical_agent: `증상 패턴 분석 완료. ${keywords.join(', ')} 관련 증상이 확인되었습니다. Medical Agent의 종합 진단을 기다립니다.`
    },
    message: `증상 정보 수집을 완료했어요.\n\n${symptomData.images?.length > 0 ? '📷 이미지에서 증상 부위를 확인했습니다.\n' : ''}🔎 유사 케이스를 검색했습니다.\n📊 증상 패턴 분석을 마쳤습니다.\n\n담당 수의사 선생님께 진료를 요청할게요.`
  };
};
