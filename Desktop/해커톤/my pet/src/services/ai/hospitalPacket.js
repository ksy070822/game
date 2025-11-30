// 병원 진단 패킷 생성 - Ops Agent 결과 활용
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

export const generateHospitalPacket = async (petData, diagnosisResult, symptomData) => {
  // 이미 Ops Agent에서 hospital_previsit_packet을 생성했으므로 그것을 사용
  if (diagnosisResult.hospitalPacket) {
    const packet = diagnosisResult.hospitalPacket;
    
    // 텍스트 형식으로 변환
    const packetText = `
=== ${packet.packet_title} ===

[환자 정보]
이름: ${packet.pet_profile_brief.name}
종류/품종: ${packet.pet_profile_brief.species === 'dog' ? '개' : '고양이'} / ${packet.pet_profile_brief.breed}
${packet.pet_profile_brief.age_info ? `나이: ${packet.pet_profile_brief.age_info}` : ''}
${packet.pet_profile_brief.sex_neutered ? `성별: ${packet.pet_profile_brief.sex_neutered}` : ''}

[수의사 요약]
${packet.for_vet_summary}

[방문 사유]
${packet.visit_reason}

[증상 타임라인]
${packet.symptom_timeline}

[AI 감별 진단]
${packet.ai_differential_diagnosis.map((d, idx) => 
  `${idx + 1}. ${d.name_kor} (확률: ${Math.round(d.probability * 100)}%)\n   ${d.note_for_vet || ''}`
).join('\n\n')}

[응급도 평가]
Triage Score: ${packet.triage_and_risk.triage_score}/5
응급도: ${packet.triage_and_risk.triage_level}
위험도: ${packet.triage_and_risk.risk_level}
시급성: ${packet.triage_and_risk.urgency_comment}

[권장 검사/조치]
${packet.requested_actions_for_hospital.map(a => `- ${a}`).join('\n')}
    `.trim();
    
    return {
      packet_text: packetText,
      packet_json: packet
    };
  }
  
  // Fallback: 기존 방식
  const apiKey = getApiKey(API_KEY_TYPES.ANTHROPIC);
  if (!apiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
  }

  const prompt = `당신은 동물병원을 위한 사전 진단 패킷을 생성하는 전문가입니다.

다음 정보를 바탕으로 병원에서 바로 활용할 수 있는 구조화된 진단 패킷을 만들어주세요.

환자 정보:
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}
- 나이: ${petData.age || '미등록'}세
${petData.weight ? `- 체중: ${petData.weight}kg` : ''}

증상:
${symptomData?.symptomText || '증상 정보 없음'}
${symptomData?.images?.length > 0 ? `\n사진 ${symptomData.images.length}장 첨부됨` : ''}

AI 진단 결과:
${JSON.stringify(diagnosisResult, null, 2)}

다음 형식으로 병원용 진단 패킷을 생성하세요:

=== AI 사전 진단 패킷 ===

[환자 정보]
이름: ${petData.petName}
종류/품종: ${petData.species === 'dog' ? '개' : '고양이'} / ${petData.breed || '미등록'}
나이/체중: ${petData.age || '미등록'}세 / ${petData.weight || '미등록'}kg

[증상 요약]
${symptomData?.symptomText || '증상 정보 없음'}

[AI 감별 진단 Top 3]
1. ${diagnosisResult.diagnosis || '일반 건강 이상'} (확률: ${diagnosisResult.probability || 60}%)
2. [추가 의심 질환]
3. [추가 의심 질환]

[응급도 평가]
${diagnosisResult.riskLevel || 'Moderate'} - ${diagnosisResult.emergency || 'medium'}

[권장 검사 항목]
- [검사 1]
- [검사 2]

[사진/영상]
${symptomData?.images?.length > 0 ? `증상 사진 ${symptomData.images.length}장 첨부` : '없음'}

[보호자 입력 히스토리]
${diagnosisResult.conversationHistory?.length > 0 ? diagnosisResult.conversationHistory.join('\n') : '없음'}

[즉시 조치 사항]
${diagnosisResult.actions?.map(a => `- ${a}`).join('\n') || '- 증상 관찰 지속'}

한국어로 전문적이고 깔끔하게 작성하세요.`;

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
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API 오류: ${response.status}`);
    }

    const data = await response.json();
    const packet = data.content[0].text;
    
    return {
      packet_text: packet,
      packet_json: {
        pet_name: petData.petName,
        species: petData.species,
        breed: petData.breed,
        diagnosis: diagnosisResult.diagnosis,
        risk_level: diagnosisResult.riskLevel,
        symptoms: symptomData?.symptomText,
        images_count: symptomData?.images?.length || 0,
        created_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('병원 패킷 생성 오류:', error);
    
    // Fallback
    return {
      packet_text: `=== AI 사전 진단 패킷 ===\n\n환자: ${petData.petName}\n증상: ${symptomData?.symptomText || '증상 정보 없음'}\n진단: ${diagnosisResult.diagnosis || '일반 건강 이상'}\n응급도: ${diagnosisResult.riskLevel || 'Moderate'}`,
      packet_json: {
        pet_name: petData.petName,
        diagnosis: diagnosisResult.diagnosis,
        risk_level: diagnosisResult.riskLevel
      }
    };
  }
};

