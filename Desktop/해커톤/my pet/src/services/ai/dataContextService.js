// AI 에이전트를 위한 데이터 컨텍스트 서비스
// Firestore에서 FAQ와 과거 진료기록을 가져와 프롬프트에 추가

import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc } from 'firebase/firestore';

/**
 * 보호자 FAQ 데이터 조회 (owner_faq 컬렉션)
 * @param {string} species - 반려동물 종류 ('dog', 'cat', 'all')
 * @param {string} symptomKeywords - 증상 관련 키워드
 * @returns {Array} 관련 FAQ 목록
 */
export async function fetchRelatedFAQs(species = 'dog', symptomKeywords = '') {
  try {
    const faqRef = collection(db, 'owner_faq');

    // species 필터링 쿼리
    const q = query(
      faqRef,
      where('species_code', 'in', [species, 'all']),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const allFAQs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 키워드로 관련성 높은 FAQ 필터링
    if (symptomKeywords) {
      const keywords = symptomKeywords.toLowerCase().split(/[\s,]+/);
      const scoredFAQs = allFAQs.map(faq => {
        let score = 0;
        const faqText = `${faq.question_ko || ''} ${faq.answer_ko || ''} ${(faq.keywords || []).join(' ')}`.toLowerCase();

        keywords.forEach(keyword => {
          if (keyword && faqText.includes(keyword)) {
            score += 1;
          }
        });

        return { ...faq, relevanceScore: score };
      });

      return scoredFAQs
        .filter(faq => faq.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
    }

    return allFAQs.slice(0, 5);
  } catch (error) {
    console.error('FAQ 조회 오류:', error);
    return [];
  }
}

/**
 * 반려동물의 과거 진단 기록 조회
 * @param {string} petId - 반려동물 ID
 * @returns {Array} 과거 진단 기록 목록
 */
export async function fetchPastDiagnoses(petId) {
  // petId가 문자열인지 확인 (객체나 undefined일 수 있음)
  const petIdStr = typeof petId === 'string' ? petId : petId?.toString?.() || null;
  if (!petIdStr) return [];

  try {
    const diagnosesRef = collection(db, 'diagnoses');
    // 복합 인덱스 필요 없이 단순 쿼리 후 클라이언트 정렬
    const q = query(
      diagnosesRef,
      where('petId', '==', petIdStr),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const diagnoses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 클라이언트 측에서 날짜순 정렬
    return diagnoses
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.created_at || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.created_at || 0);
        return dateB - dateA;
      })
      .slice(0, 5);
  } catch (error) {
    console.error('과거 진단 기록 조회 오류:', error);
    return [];
  }
}

/**
 * 유사 증상의 다른 반려동물 진단 기록 조회
 * @param {string} species - 반려동물 종류
 * @param {string} symptomKeywords - 증상 키워드
 * @returns {Array} 유사 케이스 목록
 */
export async function fetchSimilarCases(species, symptomKeywords) {
  try {
    const diagnosesRef = collection(db, 'diagnoses');
    const q = query(
      diagnosesRef,
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const snapshot = await getDocs(q);
    const allDiagnoses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 종과 증상 키워드로 유사 케이스 필터링
    const keywords = (symptomKeywords || '').toLowerCase().split(/[\s,]+/).filter(Boolean);

    const similarCases = allDiagnoses.filter(d => {
      // 같은 종인지 확인
      if (d.species && d.species !== species) return false;

      // 증상 키워드 매칭
      const diagnosisText = `${d.symptom || ''} ${d.diagnosis || ''} ${d.description || ''}`.toLowerCase();
      return keywords.some(keyword => keyword && diagnosisText.includes(keyword));
    });

    return similarCases.slice(0, 5).map(c => ({
      diagnosis: c.diagnosis,
      symptom: c.symptom,
      triage_score: c.triage_score,
      actions: c.actions,
      hospitalVisit: c.hospitalVisit
    }));
  } catch (error) {
    console.error('유사 케이스 조회 오류:', error);
    return [];
  }
}

/**
 * 반려동물의 최근 케어 로그 조회 (서브컬렉션)
 * @param {string} petId - 반려동물 ID
 * @param {number} days - 최근 며칠간의 로그 (기본 7일)
 * @returns {Array} 케어 로그 목록
 */
export async function fetchRecentCareLogs(petId, days = 7) {
  // petId가 문자열인지 확인 (객체나 undefined일 수 있음)
  const petIdStr = typeof petId === 'string' ? petId : petId?.toString?.() || null;
  if (!petIdStr) return [];

  try {
    // 서브컬렉션 경로: pets/{petId}/careLogs
    const careLogsRef = collection(db, 'pets', petIdStr, 'careLogs');
    const q = query(
      careLogsRef,
      orderBy('date', 'desc'),
      limit(days)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('케어 로그 조회 오류:', error);
    return [];
  }
}

/**
 * AI 프롬프트용 컨텍스트 문자열 생성
 * @param {Object} petData - 반려동물 정보
 * @param {Object} symptomData - 증상 정보
 * @returns {string} 프롬프트에 추가할 컨텍스트
 */
/**
 * 최근 7일 케어 로그 요약 텍스트 생성
 * @param {Array} careLogs - 케어 로그 배열
 * @returns {string} 요약 텍스트
 */
export function summarizeLast7DaysCare(careLogs) {
  if (!careLogs || careLogs.length === 0) return '';

  // date DESC 정렬
  const logs = [...careLogs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);

  let lines = ['[최근 7일 일일 케어 요약]'];
  let weights = [];

  for (const log of logs) {
    const moodText = {
      happy: '좋음',
      normal: '보통',
      tired: '피곤함',
      anxious: '불안함'
    }[log.mood] || log.mood;

    const line = `- ${log.date}: 식사 ${log.mealCount ?? '-'}회, 물 ${log.waterCount ?? '-'}회, 산책 ${log.walkCount ?? '-'}회, 배변 ${log.poopCount ?? '-'}회, 체중 ${log.weightKg ?? '미입력'}kg, 기분 ${moodText}`;
    lines.push(line);
    if (typeof log.weightKg === 'number') weights.push(log.weightKg);
  }

  if (weights.length >= 2) {
    const first = weights[weights.length - 1]; // 가장 오래된
    const last = weights[0];                   // 가장 최근
    const diff = +(last - first).toFixed(1);
    const trend =
      diff > 0.3 ? '체중이 다소 증가했습니다.'
      : diff < -0.3 ? '체중이 다소 감소했습니다.'
      : '체중 변화는 크지 않습니다.';
    lines.push(
      `※ 체중 변화: ${first}kg → ${last}kg (${diff > 0 ? '+' : ''}${diff}kg). ${trend}`
    );
  }

  return lines.join('\n');
}

export async function buildAIContext(petData, symptomData) {
  const species = petData?.species || 'dog';
  const symptomText = symptomData?.symptomText || symptomData?.description || '';
  const selectedSymptoms = (symptomData?.selectedSymptoms || []).join(', ');
  const keywords = `${symptomText} ${selectedSymptoms}`;

  // 병렬로 데이터 조회 (케어 로그 포함)
  const [faqs, pastDiagnoses, similarCases, careLogs] = await Promise.all([
    fetchRelatedFAQs(species, keywords),
    fetchPastDiagnoses(petData?.id),
    fetchSimilarCases(species, keywords),
    fetchRecentCareLogs(petData?.id, 7)
  ]);

  let context = '';

  // 과거 진단 기록 추가
  if (pastDiagnoses.length > 0) {
    context += '\n\n[이 반려동물의 과거 진료 기록]\n';
    pastDiagnoses.forEach((d, idx) => {
      const date = d.createdAt?.toDate?.() || new Date(d.created_at);
      context += `${idx + 1}. ${date.toLocaleDateString('ko-KR')} - ${d.diagnosis || '미상'}\n`;
      context += `   증상: ${d.symptom || '기록 없음'}\n`;
      if (d.triage_score) context += `   응급도: ${d.triage_score}/5\n`;
    });
  }

  // 유사 케이스 추가
  if (similarCases.length > 0) {
    context += '\n\n[유사 증상의 다른 진료 케이스 참고]\n';
    similarCases.forEach((c, idx) => {
      context += `${idx + 1}. 진단: ${c.diagnosis}\n`;
      context += `   증상: ${c.symptom}\n`;
      if (c.triage_score) context += `   응급도: ${c.triage_score}/5\n`;
      if (c.hospitalVisit) context += `   병원 방문 필요: 예\n`;
    });
  }

  // FAQ 참고 추가
  if (faqs.length > 0) {
    context += '\n\n[보호자 FAQ 참고 데이터]\n';
    faqs.forEach((faq, idx) => {
      context += `${idx + 1}. Q: ${faq.question_ko}\n`;
      context += `   A: ${faq.answer_ko}\n`;
    });
  }

  // 최근 7일 케어 로그 요약 추가
  const careSummary = summarizeLast7DaysCare(careLogs);
  if (careSummary) {
    context += '\n\n' + careSummary;
  }

  return context;
}

export default {
  fetchRelatedFAQs,
  fetchPastDiagnoses,
  fetchSimilarCases,
  fetchRecentCareLogs,
  summarizeLast7DaysCare,
  buildAIContext
};
