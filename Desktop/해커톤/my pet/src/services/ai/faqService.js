// FAQ 서비스 (FAQ Selection Service)
// 진단/증상 기반 추천 FAQ 제공 및 답변 생성
// Firebase owner_faq 컬렉션에서 FAQ 데이터 조회

import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { faqData as localFaqData, searchFAQ as localSearchFAQ } from '../../data/faqData';
import { FOLLOW_UP_QUESTIONS, SYMPTOM_TAGS, CONDITIONS } from '../../data/petMedicalData';

/**
 * Firebase에서 관련 FAQ 조회
 * @param {string} species - 반려동물 종류
 * @param {string} keywords - 검색 키워드
 * @returns {Promise<Array>} FAQ 목록
 */
async function fetchFAQsFromFirebase(species, keywords) {
  try {
    const faqRef = collection(db, 'owner_faq');

    // species 필터링 쿼리
    const q = query(
      faqRef,
      where('species_code', 'in', [species, 'all']),
      limit(30)
    );

    const snapshot = await getDocs(q);
    const allFAQs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 키워드로 관련성 높은 FAQ 필터링
    if (keywords) {
      // 2글자 이상의 키워드만 유효하게 처리
      const keywordList = keywords.toLowerCase().split(/[\s,]+/).filter(k => k && k.length >= 2);
      const scoredFAQs = allFAQs.map(faq => {
        let score = 0;
        const faqText = `${faq.question_ko || ''} ${faq.answer_ko || ''} ${faq.symptom_label_ko || ''} ${(faq.keywords || []).join(' ')}`.toLowerCase();

        keywordList.forEach(keyword => {
          if (faqText.includes(keyword)) {
            // 핵심 키워드(증상명, 진단명)는 가중치 부여
            if (faq.keywords?.some(k => k.toLowerCase().includes(keyword))) {
              score += 3; // FAQ 키워드에 직접 매칭
            } else if (faq.symptom_label_ko?.toLowerCase().includes(keyword)) {
              score += 2; // 증상 라벨에 매칭
            } else {
              score += 1; // 일반 텍스트에 매칭
            }
          }
        });

        return { ...faq, relevanceScore: score };
      });

      // 최소 점수 2 이상만 반환 (더 엄격한 필터링)
      return scoredFAQs
        .filter(faq => faq.relevanceScore >= 2)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
    }

    // 키워드 없으면 빈 배열 반환 (무관한 FAQ 방지)
    return [];
  } catch (error) {
    console.error('Firebase FAQ 조회 오류:', error);
    return [];
  }
}

/**
 * 진단 기반 추천 FAQ 생성 (비동기 - Firebase 사용)
 * 증상과 진단에 맞는 FAQ 3개를 선별하여 반환
 * @param {Object} medicalDiagnosis - Medical Agent 진단 결과
 * @param {Object} symptomData - 증상 데이터
 * @param {string} species - 반려동물 종류 ('dog', 'cat', etc.)
 * @returns {Promise<Array>} 추천 FAQ 목록 (최대 3개)
 */
export async function getRecommendedFAQs(medicalDiagnosis, symptomData, species = 'dog') {
  const diagnosis = medicalDiagnosis?.possible_diseases?.[0]?.name_kor || '';
  const symptoms = symptomData?.selectedSymptoms || [];
  const symptomText = symptomData?.symptomText || '';

  // 키워드 수집 (3글자 이상만 유효한 키워드로 처리)
  const keywords = [
    diagnosis,
    ...symptoms.map(s => typeof s === 'string' ? s : s?.name_kor || ''),
    ...symptomText.split(/[\s,]+/).filter(Boolean)
  ].filter(k => k && k.length >= 2);

  const keywordString = keywords.join(' ');

  // 중복 방지를 위한 Set (질문 텍스트 정규화하여 저장)
  const addedQuestions = new Set();
  const addedSymptomTags = new Set();

  // 질문 텍스트 정규화 함수 (공백, 특수문자 제거 후 비교)
  const normalizeQuestion = (q) => (q || '').replace(/[\s?.,!~]/g, '').toLowerCase();

  // Firebase에서 FAQ 조회 시도
  let relatedFAQs = [];
  try {
    const firebaseFAQs = await fetchFAQsFromFirebase(species, keywordString);

    // 관련성 점수가 2 이상인 것만 사용 (더 엄격한 필터링)
    firebaseFAQs.forEach(faq => {
      const normalizedQ = normalizeQuestion(faq.question_ko);
      if (faq.relevanceScore >= 2 && !addedQuestions.has(normalizedQ)) {
        addedQuestions.add(normalizedQ);
        if (faq.symptom_tag) addedSymptomTags.add(faq.symptom_tag);
        relatedFAQs.push(faq);
      }
    });

    console.log('Firebase FAQ 조회 성공:', relatedFAQs.length, '개');
  } catch (error) {
    console.warn('Firebase FAQ 조회 실패, 로컬 데이터 사용:', error);
  }

  // Firebase 결과가 부족하면 로컬 데이터로 보충 (관련성 높은 것만)
  if (relatedFAQs.length < 3) {
    const deptCode = getDepartmentFromDiagnosis(diagnosis);

    // 로컬 FAQ에서 관련성 점수 계산
    const scoredLocalFAQs = localFaqData
      .filter(faq => faq.species_code === species || faq.species_code === 'all')
      .map(faq => {
        let score = 0;
        const faqText = `${faq.question_ko} ${faq.answer_ko} ${faq.symptom_label_ko || ''} ${(faq.keywords || []).join(' ')}`.toLowerCase();

        // 키워드 매칭 점수
        keywords.forEach(keyword => {
          if (keyword.length >= 2 && faqText.includes(keyword.toLowerCase())) {
            score += 2;
          }
        });

        // 같은 진료과면 보너스
        if (faq.department_code === deptCode) {
          score += 1;
        }

        return { ...faq, relevanceScore: score };
      })
      .filter(faq => faq.relevanceScore >= 2) // 최소 관련성 점수 기준
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 중복 없이 추가
    scoredLocalFAQs.forEach(faq => {
      if (relatedFAQs.length >= 3) return;

      const normalizedQ = normalizeQuestion(faq.question_ko);
      // 질문 텍스트와 symptom_tag 모두 중복 체크
      if (!addedQuestions.has(normalizedQ) && !addedSymptomTags.has(faq.symptom_tag)) {
        addedQuestions.add(normalizedQ);
        if (faq.symptom_tag) addedSymptomTags.add(faq.symptom_tag);
        relatedFAQs.push(faq);
      }
    });
  }

  // 3개 미만이어도 관련 없는 FAQ는 추가하지 않음 (품질 우선)
  // 최소 1개 이상의 관련 FAQ가 있을 때만 반환
  if (relatedFAQs.length === 0) {
    console.log('관련 FAQ 없음 - 빈 배열 반환');
    return [];
  }

  // FAQ 형식 정리
  return relatedFAQs.slice(0, 3).map((faq, index) => ({
    id: faq.id || `faq_${index}_${faq.symptom_tag || 'general'}`,
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
