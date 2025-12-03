// 약물 안내 서비스 (Medication Guidance Service)
// 진단/증상에 따른 데이터 기반 약물 안내 제공

/**
 * 약물 종류별 정보 데이터
 * 실제 운영 시에는 Firebase medicationLogs에서 조회
 */
const MEDICATION_DATABASE = {
  // 소화기 관련
  digestive: {
    category: '소화기',
    medications: [
      {
        type: '위장관 보호제',
        examples: ['수크랄페이트', '오메프라졸'],
        usage: '식전 30분~1시간',
        duration: '보통 3~7일',
        description: '위 점막을 보호하고 위산 분비를 억제해요',
        caution: '다른 약과 시간 간격을 두고 복용하세요'
      },
      {
        type: '구토 억제제',
        examples: ['세레니아', '메토클로프라미드'],
        usage: '증상 발현 시 또는 식전',
        duration: '증상 완화까지 1~3일',
        description: '구역질과 구토를 억제해요',
        caution: '졸음이 올 수 있어요'
      },
      {
        type: '지사제/정장제',
        examples: ['스멕타', '프로바이오틱스'],
        usage: '1일 2~3회 식후',
        duration: '증상 완화까지 3~5일',
        description: '장 점막을 보호하고 장내 환경을 개선해요',
        caution: '수분 섭취를 충분히 해주세요'
      }
    ],
    symptoms: ['구토', '설사', '식욕부진', '위장염', '소화불량']
  },

  // 피부 관련
  dermatology: {
    category: '피부',
    medications: [
      {
        type: '항히스타민제',
        examples: ['아포퀼', '세티리진'],
        usage: '1일 1~2회',
        duration: '증상 완화까지 1~2주',
        description: '가려움과 알레르기 반응을 억제해요',
        caution: '졸음이 올 수 있어요'
      },
      {
        type: '외용 항균/항진균제',
        examples: ['클로르헥시딘 스프레이', '항진균 연고'],
        usage: '1일 2회 환부에 도포',
        duration: '2~4주',
        description: '피부 세균이나 곰팡이 감염을 치료해요',
        caution: '핥지 못하게 주의하세요'
      },
      {
        type: '스테로이드 (외용/경구)',
        examples: ['프레드니솔론', '하이드로코르티손 연고'],
        usage: '처방에 따라',
        duration: '단기간 사용 권장',
        description: '염증과 가려움을 빠르게 억제해요',
        caution: '장기 사용 시 부작용 주의, 수의사 지시 필수'
      }
    ],
    symptoms: ['가려움', '피부염', '알레르기', '탈모', '발진', '붓기', '비듬']
  },

  // 호흡기 관련
  respiratory: {
    category: '호흡기',
    medications: [
      {
        type: '항생제',
        examples: ['아목시실린', '독시사이클린'],
        usage: '1일 2회 식후',
        duration: '7~14일 (처방 완료까지)',
        description: '세균성 감염을 치료해요',
        caution: '처방된 기간 동안 끝까지 복용하세요'
      },
      {
        type: '기침 억제제',
        examples: ['부토르판올', '덱스트로메토르판'],
        usage: '증상 시 1일 2~3회',
        duration: '증상 완화까지',
        description: '기침을 억제해요',
        caution: '가래가 많을 때는 사용을 피하세요'
      },
      {
        type: '기관지 확장제',
        examples: ['테오필린', '알부테롤'],
        usage: '1일 2회',
        duration: '증상 조절 시까지',
        description: '기관지를 넓혀 호흡을 편하게 해요',
        caution: '심장 박동 증가가 있을 수 있어요'
      }
    ],
    symptoms: ['기침', '콧물', '재채기', '호흡곤란', '가래', '기관지염']
  },

  // 비뇨기 관련
  urinary: {
    category: '비뇨기',
    medications: [
      {
        type: '항생제 (요로 감염용)',
        examples: ['엔로플록사신', '아목시실린-클라불란산'],
        usage: '1일 1~2회',
        duration: '7~14일',
        description: '요로 세균 감염을 치료해요',
        caution: '충분한 수분 섭취가 중요해요'
      },
      {
        type: '요로 건강 보조제',
        examples: ['D-만노스', '크랜베리 추출물'],
        usage: '1일 1회',
        duration: '장기간 복용 가능',
        description: '요로 점막을 보호하고 세균 부착을 방지해요',
        caution: '약물이 아닌 보조제예요'
      },
      {
        type: '진경제',
        examples: ['프라조신', '페녹시벤자민'],
        usage: '1일 1~2회',
        duration: '증상 조절 시까지',
        description: '요도 근육을 이완시켜요',
        caution: '혈압 저하에 주의하세요'
      }
    ],
    symptoms: ['빈뇨', '혈뇨', '배뇨장애', '방광염', '요로결석']
  },

  // 정형외과/진통 관련
  orthopedic: {
    category: '정형외과',
    medications: [
      {
        type: '비스테로이드성 소염진통제 (NSAIDs)',
        examples: ['멜록시캄', '카프로펜', '데라콕시브'],
        usage: '1일 1회 식후',
        duration: '증상에 따라 단기~장기',
        description: '통증과 염증을 줄여요',
        caution: '위장장애 주의, 신장/간 기능 모니터링 필요'
      },
      {
        type: '관절 보조제',
        examples: ['글루코사민', '콘드로이틴', '초록입홍합'],
        usage: '1일 1회',
        duration: '장기간 복용',
        description: '관절 연골을 보호하고 재생을 도와요',
        caution: '효과는 4~6주 후부터 나타나요'
      }
    ],
    symptoms: ['절뚝거림', '관절통', '슬개골탈구', '관절염', '디스크']
  },

  // 감염/전신
  infection: {
    category: '감염/전신',
    medications: [
      {
        type: '광범위 항생제',
        examples: ['아목시실린-클라불란산', '세팔렉신'],
        usage: '1일 2회 식후',
        duration: '7~14일',
        description: '다양한 세균 감염을 치료해요',
        caution: '처방 기간 동안 빠짐없이 복용하세요'
      },
      {
        type: '해열/진통제',
        examples: ['멜록시캄 (강아지)', '온시오르 (고양이)'],
        usage: '1일 1회',
        duration: '증상 완화까지 단기간',
        description: '열과 통증을 낮춰요',
        caution: '고양이에게 사람 약 절대 금지!'
      },
      {
        type: '수액 요법',
        examples: ['링거 용액', '포도당'],
        usage: '병원에서 투여',
        duration: '탈수 교정까지',
        description: '탈수와 전해질 불균형을 교정해요',
        caution: '심한 경우 입원이 필요해요'
      }
    ],
    symptoms: ['발열', '무기력', '탈수', '감염', '패혈증']
  }
};

/**
 * 진단/증상에 따른 약물 카테고리 매핑
 */
const DIAGNOSIS_TO_MEDICATION_MAP = {
  // 소화기
  '위장염': 'digestive',
  '구토': 'digestive',
  '설사': 'digestive',
  '식욕부진': 'digestive',
  '소화불량': 'digestive',
  '장염': 'digestive',
  '급성 위장염': 'digestive',

  // 피부
  '피부염': 'dermatology',
  '알레르기': 'dermatology',
  '아토피': 'dermatology',
  '가려움': 'dermatology',
  '탈모': 'dermatology',
  '외이염': 'dermatology',
  '농피증': 'dermatology',
  '피부 감염': 'dermatology',
  '알레르기 피부염': 'dermatology',

  // 호흡기
  '기침': 'respiratory',
  '기관지염': 'respiratory',
  '폐렴': 'respiratory',
  '호흡기 감염': 'respiratory',
  '켄넬코프': 'respiratory',
  '상부 호흡기 감염': 'respiratory',

  // 비뇨기
  '방광염': 'urinary',
  '요로감염': 'urinary',
  '혈뇨': 'urinary',
  'FLUTD': 'urinary',
  '요로결석': 'urinary',
  '하부요로질환': 'urinary',

  // 정형외과
  '슬개골탈구': 'orthopedic',
  '관절염': 'orthopedic',
  '디스크': 'orthopedic',
  '골절': 'orthopedic',
  '절뚝거림': 'orthopedic',
  '관절 문제': 'orthopedic',

  // 감염
  '파보바이러스': 'infection',
  '범백': 'infection',
  '디스템퍼': 'infection',
  '발열': 'infection',
  '감염': 'infection'
};

/**
 * 진단명/증상에서 약물 카테고리 추출
 * @param {string} diagnosis - 진단명
 * @param {Array} symptoms - 증상 배열
 * @returns {Array} 매칭된 약물 카테고리들
 */
function findMedicationCategories(diagnosis, symptoms = []) {
  const categories = new Set();

  // 진단명에서 카테고리 찾기
  if (diagnosis) {
    const diagnosisLower = diagnosis.toLowerCase();
    for (const [key, category] of Object.entries(DIAGNOSIS_TO_MEDICATION_MAP)) {
      if (diagnosisLower.includes(key.toLowerCase()) || key.toLowerCase().includes(diagnosisLower)) {
        categories.add(category);
      }
    }
  }

  // 증상에서 카테고리 찾기
  symptoms.forEach(symptom => {
    const symptomLower = (typeof symptom === 'string' ? symptom : symptom?.name_kor || '').toLowerCase();
    for (const [categoryKey, data] of Object.entries(MEDICATION_DATABASE)) {
      if (data.symptoms.some(s => symptomLower.includes(s) || s.includes(symptomLower))) {
        categories.add(categoryKey);
      }
    }
  });

  return Array.from(categories);
}

/**
 * 약물 안내 정보 생성
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} symptomData - 증상 데이터
 * @returns {Object} 약물 안내 정보
 */
export function getMedicationGuidance(medicalDiagnosis, symptomData) {
  const diagnosis = medicalDiagnosis?.possible_diseases?.[0]?.name_kor ||
                   medicalDiagnosis?.primary_assessment_kor || '';
  const symptoms = symptomData?.selectedSymptoms || [];
  const symptomText = symptomData?.symptomText || '';

  // 증상 텍스트에서 키워드 추출
  const additionalSymptoms = symptomText.split(/[,\s]+/).filter(Boolean);

  // 약물 카테고리 찾기
  const categories = findMedicationCategories(diagnosis, [...symptoms, ...additionalSymptoms]);

  if (categories.length === 0) {
    return {
      hasMedicationGuidance: false,
      message: '현재 증상에 대한 일반적인 약물 정보가 없습니다. 수의사 선생님의 처방을 따라주세요.',
      medications: []
    };
  }

  // 약물 정보 수집
  const medicationInfo = [];
  categories.forEach(category => {
    const data = MEDICATION_DATABASE[category];
    if (data) {
      // 각 카테고리에서 가장 관련성 높은 약물 1~2개 선택
      const relevantMeds = data.medications.slice(0, 2);
      medicationInfo.push({
        category: data.category,
        medications: relevantMeds
      });
    }
  });

  // 사용자 친화적 메시지 생성
  const primaryMed = medicationInfo[0]?.medications[0];
  let friendlyMessage = '';

  if (primaryMed) {
    friendlyMessage = `${primaryMed.type} 종류의 약으로 호전될 수 있어요. ${primaryMed.description}`;
  }

  return {
    hasMedicationGuidance: true,
    message: friendlyMessage,
    medications: medicationInfo,
    disclaimer: '※ 위 정보는 일반적인 안내이며, 실제 처방은 반드시 수의사 선생님의 진료를 통해 받으세요.'
  };
}

/**
 * 약물 안내 메시지 포맷팅 (UI 표시용)
 * @param {Object} medicationGuidance - getMedicationGuidance 결과
 * @returns {string} 포맷된 메시지
 */
export function formatMedicationMessage(medicationGuidance) {
  if (!medicationGuidance.hasMedicationGuidance) {
    return medicationGuidance.message;
  }

  let message = `💊 ${medicationGuidance.message}\n\n`;

  medicationGuidance.medications.forEach(({ category, medications }) => {
    message += `📋 ${category} 관련 약물 안내:\n`;
    medications.forEach(med => {
      message += `\n• ${med.type}\n`;
      message += `  - 복용: ${med.usage}\n`;
      message += `  - 기간: ${med.duration}\n`;
      if (med.caution) {
        message += `  - 주의: ${med.caution}\n`;
      }
    });
    message += '\n';
  });

  message += `\n${medicationGuidance.disclaimer}`;

  return message;
}

/**
 * 간략한 약물 안내 (채팅 버블용)
 * @param {Object} medicationGuidance - getMedicationGuidance 결과
 * @returns {Object} 채팅 표시용 데이터
 */
export function getShortMedicationSummary(medicationGuidance) {
  if (!medicationGuidance.hasMedicationGuidance) {
    return null;
  }

  const allMeds = medicationGuidance.medications.flatMap(m => m.medications);
  const primaryMed = allMeds[0];

  return {
    title: `${primaryMed?.type || '약물'} 안내`,
    summary: medicationGuidance.message,
    details: allMeds.map(med => ({
      type: med.type,
      usage: med.usage,
      duration: med.duration
    })).slice(0, 3)
  };
}

export default {
  getMedicationGuidance,
  formatMedicationMessage,
  getShortMedicationSummary,
  MEDICATION_DATABASE
};
