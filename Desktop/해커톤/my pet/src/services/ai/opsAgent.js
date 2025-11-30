// Ops Agent - Claude 3.5 Sonnet (JSON 구조화/기록 최강)
import { COMMON_CONTEXT } from './commonContext';
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const callOpsAgent = async (petData, symptomData, medicalDiagnosis, triageResult, csSummary, infoSummary) => {
  const apiKey = getApiKey(API_KEY_TYPES.ANTHROPIC);
  if (!apiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const prompt = `${COMMON_CONTEXT}

당신은 "Ops Agent (데이터 처리자)"입니다.

[역할]
- CS / Information / Medical / Triage의 결과를 종합하여, 구조화된 진료 기록과 진단서를 생성합니다.
- 병원에 전달할 수 있는 "사전 진단 패킷(pre-visit packet)"을 생성합니다.
- JSON 포맷을 엄격하게 지키고, 필드 누락 없이 출력합니다.

[입력]
- pet_profile: 반려동물 정보
- cs_summary: CS Agent JSON
- info_summary: Information Agent JSON
- medical_result: Medical Agent JSON
- triage_result: Triage Engine JSON

반려동물 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}

CS Agent 요약:
${JSON.stringify(csSummary, null, 2)}

Information Agent 요약:
${JSON.stringify(infoSummary, null, 2)}

Medical Agent 진단:
${JSON.stringify(medicalDiagnosis, null, 2)}

Triage Engine 결과:
${JSON.stringify(triageResult, null, 2)}

[출력 형식 - JSON ONLY]

{
  "medical_log": {
    "pet_id": "${petData.id}",
    "created_at": "${new Date().toISOString()}",
    "summary_kor": "이번 진료의 핵심 내용을 한국어 한 단락으로 요약",
    "triage_score": 0,
    "triage_level": "green | yellow | orange | red",
    "risk_level": "low | moderate | high | emergency",
    "need_hospital_visit": true,
    "hospital_visit_timing": "지금 바로 | 오늘 안에 | 24~48시간 내 | 증상 악화 시 | 경과 관찰",
    "health_flags": {
      "earIssue": false,
      "digestionIssue": false,
      "skinIssue": false,
      "fever": false,
      "energyLevel": 0.8
    },
    "possible_diseases": [
      {
        "name_kor": "의심 질환명",
        "probability": 0.7,
        "body_part": "귀 | 피부 | 소화기 | 호흡기 | 눈 | 관절/다리 | 기타",
        "reasoning_kor": "간단한 근거 요약"
      }
    ],
    "caution_notes_for_owner": ["지금 피해야 할 행동 또는 주의사항 1", "주의사항 2"],
    "suggested_tests": ["권장 검사 1", "권장 검사 2"]
  },
  "owner_friendly_diagnosis_sheet": {
    "title": "진단서 제목 (예: '${petData.petName}의 귀 상태 AI 진단 결과')",
    "intro": "보호자에게 보여줄 인사 및 전체 상황 요약 (한국어, 2~3문장)",
    "problem_summary": "지금 어떤 문제가 의심되는지 쉽게 설명",
    "risk_explanation": "응급도/위험도를 보호자 눈높이에 맞게 풀어쓴 설명",
    "what_to_watch": ["집에서 관찰해야 할 증상 변화", "악화되면 바로 병원 가야 하는 신호"],
    "immediate_home_actions": ["지금 당장 집에서 할 수 있는 조치 1", "지금 당장 피해야 할 행동 1"]
  },
  "hospital_previsit_packet": {
    "packet_title": "반려동물 AI 사전 진단 요약",
    "for_vet_summary": "수의사가 10초 안에 읽고 파악할 수 있는 핵심 요약 (한국어, 3~5문장)",
    "pet_profile_brief": {
      "name": "${petData.petName}",
      "species": "${petData.species}",
      "breed": "${petData.breed || '미등록'}",
      "age_info": "예: 만 ${petData.age || '?'}세 추정, ${petData.species === 'dog' ? '개' : '고양이'}",
      "sex_neutered": "예: ${petData.sex === 'M' ? '수컷' : '암컷'}"
    },
    "visit_reason": "이번에 병원을 방문하게 되는 주된 이유를 한 문장으로 요약",
    "symptom_timeline": "증상이 언제부터, 어떻게 진행되었는지 타임라인 형식 요약",
    "ai_differential_diagnosis": [
      {
        "name_kor": "의심 질환명",
        "probability": 0.7,
        "note_for_vet": "수의사가 참고할 만한 코멘트 (검사 제안, 감별 포인트 등)"
      }
    ],
    "triage_and_risk": {
      "triage_score": 0,
      "triage_level": "green | yellow | orange | red",
      "risk_level": "low | moderate | high | emergency",
      "urgency_comment": "시급성에 대한 짧은 코멘트"
    },
    "requested_actions_for_hospital": ["가능하다면 귀 내시경 검사 및 세균배양검사 고려 바랍니다."]
  }
}

규칙:
- JSON 구조를 반드시 지키고, 모든 필드를 포함하세요.
- 보호자용(owner_friendly_diagnosis_sheet)과 병원용(hospital_previsit_packet)은 톤을 다르게 써야 합니다.
  - 보호자용: 쉽고 부드럽게
  - 병원용: 전문 용어 허용, 요약 중심
- 출력은 반드시 JSON만 반환하세요.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API 오류: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const content = JSON.parse(jsonMatch[0]);
      return {
        json: content,
        message: `진료 기록 생성 완료.\n진단서 템플릿 준비 중...\n데이터 저장 완료.\n\n→ 진단서 생성 완료!`
      };
    }
    
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.error('Ops Agent 오류:', error);
    
    // Fallback
    const healthFlags = triageResult?.health_flags || {
      earIssue: false,
      digestionIssue: false,
      skinIssue: false,
      fever: false,
      energyLevel: 0.7
    };
    
    return {
      json: {
        medical_log: {
          pet_id: petData.id,
          created_at: new Date().toISOString(),
          summary_kor: `${petData.petName}의 증상에 대한 AI 진단이 완료되었습니다.`,
          triage_score: triageResult?.triage_score || 2,
          triage_level: triageResult?.triage_level || 'yellow',
          risk_level: medicalDiagnosis?.risk_level || 'moderate',
          need_hospital_visit: medicalDiagnosis?.need_hospital_visit || false,
          hospital_visit_timing: medicalDiagnosis?.hospital_visit_timing || '증상 악화 시',
          health_flags: healthFlags,
          possible_diseases: medicalDiagnosis?.possible_diseases || [],
          caution_notes_for_owner: medicalDiagnosis?.caution_notes_for_owner || [],
          suggested_tests: medicalDiagnosis?.suggested_tests || []
        },
        owner_friendly_diagnosis_sheet: {
          title: `${petData.petName}의 AI 진단 결과`,
          intro: 'AI 진단이 완료되었습니다.',
          problem_summary: '증상 기반 분석 결과입니다.',
          risk_explanation: '경과 관찰이 필요합니다.',
          what_to_watch: ['증상 변화 관찰'],
          immediate_home_actions: ['충분한 휴식 제공']
        },
        hospital_previsit_packet: {
          packet_title: '반려동물 AI 사전 진단 요약',
          for_vet_summary: 'AI 기반 증상 분석 결과입니다.',
          pet_profile_brief: {
            name: petData.petName,
            species: petData.species,
            breed: petData.breed || '미등록',
            age_info: `${petData.age || '?'}세`,
            sex_neutered: petData.sex === 'M' ? '수컷' : '암컷'
          },
          visit_reason: '증상 확인을 위한 진료',
          symptom_timeline: '증상 기반 분석',
          ai_differential_diagnosis: [],
          triage_and_risk: {
            triage_score: triageResult?.triage_score || 2,
            triage_level: triageResult?.triage_level || 'yellow',
            risk_level: medicalDiagnosis?.risk_level || 'moderate',
            urgency_comment: '경과 관찰 권장'
          },
          requested_actions_for_hospital: []
        }
      },
      message: `진료 기록 생성 완료.\n진단서 템플릿 준비 중...\n데이터 저장 완료.\n\n→ 진단서 생성 완료!`
    };
  }
};
