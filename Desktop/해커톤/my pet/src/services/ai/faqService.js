// FAQ 서비스 (FAQ Selection Service)
// 진단/증상 기반 추천 FAQ 제공 및 답변 생성

import { faqData, searchFAQ } from '../../data/faqData';
import { FOLLOW_UP_QUESTIONS, SYMPTOM_TAGS, CONDITIONS } from '../../data/petMedicalData';

/**
 * 진단 기반 추천 FAQ 생성
 * 증상과 진단에 맞는 FAQ 3개를 선별하여 반환
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} symptomData - 증상 데이터
 * @param {string} species - 반려동물 종류 ('dog', 'cat', etc.)
 * @returns {Array} 추천 FAQ 목록 (최대 3개)
 */
export function getRecommendedFAQs(medicalDiagnosis, symptomData, species = 'dog') {
  const diagnosis = medicalDiagnosis?.possible_diseases?.[0]?.name_kor || '';
  const symptoms = symptomData?.selectedSymptoms || [];
  const symptomText = symptomData?.symptomText || '';

  // 키워드 수집
  const keywords = [
    diagnosis,
    ...symptoms.map(s => typeof s === 'string' ? s : s?.name_kor || ''),
    ...symptomText.split(/[\s,]+/).filter(Boolean)
  ].filter(Boolean);

  // searchFAQ 사용하여 관련 FAQ 찾기
  const keywordString = keywords.join(' ');
  let relatedFAQs = searchFAQ(keywordString, species);

  // 결과가 부족하면 일반 FAQ도 추가
  if (relatedFAQs.length < 3) {
    const generalFAQs = faqData.filter(faq =>
      (faq.species_code === species || faq.species_code === 'all') &&
      !relatedFAQs.some(r => r.question_ko === faq.question_ko)
    );

    // 진단과 관련된 부서의 FAQ 우선
    const deptCode = getDepartmentFromDiagnosis(diagnosis);
    const deptFAQs = generalFAQs.filter(faq => faq.department_code === deptCode);
    const otherFAQs = generalFAQs.filter(faq => faq.department_code !== deptCode);

    relatedFAQs = [...relatedFAQs, ...deptFAQs, ...otherFAQs].slice(0, 3);
  }

  // FAQ 형식 정리
  return relatedFAQs.slice(0, 3).map((faq, index) => ({
    id: `faq_${index}_${faq.symptom_tag || 'general'}`,
    question: faq.question_ko,
    answer: faq.answer_ko,
    category: faq.department_label_ko || '일반',
    symptomTag: faq.symptom_tag,
    keywords: faq.keywords || []
  }));
}

/**
 * 진단명으로부터 진료과 코드 추출
 * @param {string} diagnosis - 진단명
 * @returns {string} 진료과 코드
 */
function getDepartmentFromDiagnosis(diagnosis) {
  const diagnosisLower = (diagnosis || '').toLowerCase();

  const deptMap = {
    '피부': 'dermatology',
    '알레르기': 'dermatology',
    '가려움': 'dermatology',
    '탈모': 'dermatology',
    '구토': 'internal_medicine',
    '설사': 'internal_medicine',
    '위장': 'internal_medicine',
    '식욕': 'internal_medicine',
    '눈': 'ophthalmology',
    '충혈': 'ophthalmology',
    '다리': 'orthopedics',
    '절뚝': 'orthopedics',
    '관절': 'orthopedics',
    '소변': 'urology',
    '배뇨': 'urology',
    '방광': 'urology'
  };

  for (const [keyword, dept] of Object.entries(deptMap)) {
    if (diagnosisLower.includes(keyword)) {
      return dept;
    }
  }

  return 'internal_medicine'; // 기본값
}

/**
 * 동적 추천 질문 생성
 * 현재 진단 상황에 맞는 추가 질문 생성
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} symptomData - 증상 데이터
 * @param {string} species - 반려동물 종류
 * @returns {Array} 추천 질문 목록
 */
export function generateFollowUpQuestions(medicalDiagnosis, symptomData, species = 'dog') {
  const diagnosis = medicalDiagnosis?.possible_diseases?.[0]?.name_kor || '';
  const riskLevel = medicalDiagnosis?.risk_level || 'moderate';
  const needHospital = medicalDiagnosis?.need_hospital_visit || false;

  const questions = [];

  // 1. 홈케어 관련 질문 (위험도 낮을 때)
  if (riskLevel === 'low' || !needHospital) {
    questions.push({
      id: 'homecare_food',
      question: '집에서 먹여도 되는 음식이 있나요?',
      type: 'homecare'
    });
    questions.push({
      id: 'homecare_watch',
      question: '어떤 증상이 나타나면 병원에 가야 하나요?',
      type: 'homecare'
    });
  }

  // 2. 병원 관련 질문 (병원 방문 필요 시)
  if (needHospital) {
    questions.push({
      id: 'hospital_timing',
      question: '언제까지 병원에 가야 하나요?',
      type: 'hospital'
    });
    questions.push({
      id: 'hospital_prepare',
      question: '병원 가기 전에 준비할 것이 있나요?',
      type: 'hospital'
    });
  }

  // 3. 진단 관련 질문
  questions.push({
    id: 'diagnosis_cause',
    question: '이 증상의 원인이 무엇일까요?',
    type: 'diagnosis'
  });

  // 4. 예방 관련 질문
  questions.push({
    id: 'prevention',
    question: '재발을 막으려면 어떻게 해야 하나요?',
    type: 'prevention'
  });

  // 상위 3개만 반환
  return questions.slice(0, 3);
}

/**
 * FAQ 답변 생성
 * 선택된 FAQ에 대한 상세 답변 생성
 * @param {Object} selectedFAQ - 선택된 FAQ 객체
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} petData - 반려동물 정보
 * @returns {Object} 답변 정보
 */
export function generateFAQAnswer(selectedFAQ, medicalDiagnosis, petData) {
  const petName = petData?.petName || petData?.name || '반려동물';
  const baseAnswer = selectedFAQ.answer;

  // 답변 개인화
  let personalizedAnswer = baseAnswer;

  // 진단 상황에 따라 추가 정보 제공
  const riskLevel = medicalDiagnosis?.risk_level || 'moderate';
  let additionalNote = '';

  if (riskLevel === 'emergency' || riskLevel === 'high') {
    additionalNote = `\n\n⚠️ ${petName}의 현재 상태를 고려하면 빠른 병원 방문을 권장드려요.`;
  } else if (riskLevel === 'low') {
    additionalNote = `\n\n✅ ${petName}의 상태는 경미해 보이니 위 안내를 참고해서 집에서 관찰해 주세요.`;
  }

  return {
    id: selectedFAQ.id,
    question: selectedFAQ.question,
    answer: personalizedAnswer + additionalNote,
    category: selectedFAQ.category
  };
}

/**
 * 복수 FAQ 선택에 대한 답변 생성
 * @param {Array} selectedFAQIds - 선택된 FAQ ID 배열
 * @param {Array} availableFAQs - 사용 가능한 FAQ 목록
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} petData - 반려동물 정보
 * @returns {Array} 답변 배열
 */
export function generateMultipleFAQAnswers(selectedFAQIds, availableFAQs, medicalDiagnosis, petData) {
  const answers = [];

  selectedFAQIds.forEach(faqId => {
    const faq = availableFAQs.find(f => f.id === faqId);
    if (faq) {
      answers.push(generateFAQAnswer(faq, medicalDiagnosis, petData));
    }
  });

  return answers;
}

/**
 * FAQ 선택 UI용 데이터 포맷
 * @param {Array} faqs - FAQ 목록
 * @returns {Object} UI 컴포넌트용 데이터
 */
export function formatFAQsForUI(faqs) {
  return {
    title: '추가로 궁금하신 점이 있으신가요?',
    subtitle: '궁금한 질문을 선택해 주세요 (복수 선택 가능)',
    faqs: faqs.map(faq => ({
      id: faq.id,
      question: faq.question,
      category: faq.category,
      selected: false
    })),
    allowMultiple: true,
    skipOption: {
      id: 'skip',
      label: '괜찮아요, 진단서를 확인할게요'
    }
  };
}

/**
 * FAQ 답변 메시지 포맷팅
 * @param {Array} answers - 답변 배열
 * @returns {string} 포맷된 메시지
 */
export function formatFAQAnswersMessage(answers) {
  if (!answers || answers.length === 0) {
    return '';
  }

  let message = '📚 질문에 대한 답변을 드릴게요!\n\n';

  answers.forEach((answer, index) => {
    message += `❓ ${answer.question}\n`;
    message += `💬 ${answer.answer}\n`;
    if (index < answers.length - 1) {
      message += '\n---\n\n';
    }
  });

  return message;
}

export default {
  getRecommendedFAQs,
  generateFollowUpQuestions,
  generateFAQAnswer,
  generateMultipleFAQAnswers,
  formatFAQsForUI,
  formatFAQAnswersMessage
};
