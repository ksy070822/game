// OCR 서비스 - Gemini Vision을 사용한 문서 구조화
import { getApiKey, API_KEY_TYPES } from '../apiKeyManager';

/**
 * 이미지를 base64로 변환
 */
export const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:image/jpeg;base64,... 형태에서 base64 부분만 추출
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * OCR 문서 타입 정의
 */
export const OCR_DOCUMENT_TYPES = {
  RECEIPT: 'receipt',           // 진료비 영수증
  PRESCRIPTION: 'prescription', // 처방전
  DIAGNOSIS: 'diagnosis',       // 진단서
  VACCINATION: 'vaccination',   // 예방접종 증명서
  TEST_RESULT: 'test_result',   // 검사 결과지
};

/**
 * Gemini Vision API를 사용하여 의료 문서 OCR 및 구조화
 */
export async function parseVetDocument(imageBase64, documentType = 'auto', mimeType = 'image/jpeg') {
  const apiKey = getApiKey(API_KEY_TYPES.GEMINI);

  if (!apiKey) {
    console.warn('Gemini API 키가 없습니다. 마이페이지 > API 설정에서 키를 입력해주세요.');
    return generateDummyResult(documentType);
  }

  const systemPrompt = buildOCRPrompt(documentType);

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
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64
                }
              },
              { text: systemPrompt }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          }
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
      return {
        success: true,
        data: parsed,
        rawText: text,
      };
    }

    return {
      success: false,
      error: 'JSON 파싱 실패',
      rawText: text,
    };
  } catch (error) {
    console.error('OCR 처리 오류:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 문서 타입별 OCR 프롬프트 생성
 */
function buildOCRPrompt(documentType) {
  const basePrompt = `당신은 동물병원 의료 문서 OCR 전문가입니다.
이미지에서 텍스트를 추출하고 구조화된 JSON으로 변환하세요.

중요 규칙:
1. 이미지에서 보이는 모든 텍스트를 정확히 추출하세요
2. 날짜 형식은 YYYY-MM-DD로 통일하세요
3. 금액은 숫자만 추출하세요 (원 단위)
4. 약품명, 용량, 용법은 정확히 구분하세요
5. 확실하지 않은 내용은 "확인 필요"로 표시하세요

`;

  const typePrompts = {
    receipt: `진료비 영수증 분석:
{
  "documentType": "receipt",
  "hospital": {
    "name": "병원명",
    "address": "주소",
    "phone": "전화번호",
    "businessNumber": "사업자번호"
  },
  "patient": {
    "petName": "환자명(동물명)",
    "species": "종류",
    "ownerName": "보호자명"
  },
  "visitDate": "YYYY-MM-DD",
  "items": [
    {
      "category": "항목 분류 (진찰료/검사료/처치료/약제비 등)",
      "name": "항목명",
      "quantity": 수량,
      "unitPrice": 단가,
      "amount": 금액
    }
  ],
  "summary": {
    "subtotal": 소계,
    "discount": 할인,
    "total": 총액,
    "paid": 결제금액,
    "paymentMethod": "결제수단"
  },
  "notes": "비고사항"
}`,

    prescription: `처방전 분석:
{
  "documentType": "prescription",
  "hospital": {
    "name": "병원명",
    "vetName": "수의사명",
    "licenseNumber": "면허번호"
  },
  "patient": {
    "petName": "환자명",
    "species": "종류",
    "breed": "품종",
    "weight": "체중(kg)",
    "age": "나이"
  },
  "prescriptionDate": "YYYY-MM-DD",
  "diagnosis": "진단명",
  "medications": [
    {
      "name": "약품명",
      "dosage": "용량",
      "frequency": "복용 횟수",
      "duration": "투약 기간",
      "instructions": "복용 방법",
      "warnings": "주의사항"
    }
  ],
  "nextVisit": "다음 내원일",
  "notes": "특이사항"
}`,

    diagnosis: `진단서 분석:
{
  "documentType": "diagnosis",
  "hospital": {
    "name": "병원명",
    "vetName": "수의사명"
  },
  "patient": {
    "petName": "환자명",
    "species": "종류",
    "breed": "품종",
    "birthDate": "생년월일",
    "sex": "성별",
    "ownerName": "보호자명"
  },
  "visitDate": "YYYY-MM-DD",
  "chiefComplaint": "주증상",
  "symptoms": ["증상1", "증상2"],
  "diagnosis": {
    "primary": "주진단명",
    "secondary": ["부진단1", "부진단2"]
  },
  "testResults": [
    {
      "testName": "검사명",
      "result": "결과",
      "normalRange": "정상범위",
      "interpretation": "해석"
    }
  ],
  "treatment": {
    "procedures": ["처치1", "처치2"],
    "medications": ["처방약1", "처방약2"]
  },
  "prognosis": "예후",
  "followUp": "추후 관리사항"
}`,

    vaccination: `예방접종 증명서 분석:
{
  "documentType": "vaccination",
  "hospital": {
    "name": "병원명",
    "vetName": "수의사명"
  },
  "patient": {
    "petName": "환자명",
    "species": "종류",
    "breed": "품종",
    "birthDate": "생년월일",
    "microchipNumber": "마이크로칩번호"
  },
  "vaccinations": [
    {
      "vaccineName": "백신명",
      "manufacturer": "제조사",
      "lotNumber": "제조번호",
      "administrationDate": "접종일",
      "nextDueDate": "다음 접종 예정일",
      "vetSignature": "수의사 서명 여부"
    }
  ],
  "issuedDate": "발급일"
}`,

    test_result: `검사 결과지 분석:
{
  "documentType": "test_result",
  "hospital": {
    "name": "병원명"
  },
  "patient": {
    "petName": "환자명",
    "species": "종류"
  },
  "testDate": "YYYY-MM-DD",
  "testType": "검사 종류 (혈액검사/영상검사/소변검사 등)",
  "results": [
    {
      "item": "검사 항목",
      "value": "측정값",
      "unit": "단위",
      "normalRange": "정상범위",
      "status": "정상/높음/낮음"
    }
  ],
  "interpretation": "종합 소견",
  "recommendations": "권고사항"
}`,

    auto: `이 문서의 종류를 자동으로 판별하고 적절한 형식으로 분석하세요.
먼저 문서 종류를 파악한 후, 해당 문서에 맞는 구조로 JSON을 출력하세요.
documentType 필드에는 다음 중 하나를 사용: receipt, prescription, diagnosis, vaccination, test_result

{
  "documentType": "감지된 문서 종류",
  ... 해당 문서 타입에 맞는 필드들 ...
}`
  };

  return basePrompt + (typePrompts[documentType] || typePrompts.auto) + `

JSON만 출력하세요. 다른 설명은 포함하지 마세요.`;
}

/**
 * 더미 결과 생성 (API 키 없을 때)
 */
function generateDummyResult(documentType) {
  const dummyData = {
    receipt: {
      documentType: 'receipt',
      hospital: {
        name: '행복한 동물병원',
        address: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        businessNumber: '123-45-67890'
      },
      patient: {
        petName: '초코',
        species: '개',
        ownerName: '김철수'
      },
      visitDate: new Date().toISOString().split('T')[0],
      items: [
        { category: '진찰료', name: '일반 진찰', quantity: 1, unitPrice: 15000, amount: 15000 },
        { category: '검사료', name: '혈액검사', quantity: 1, unitPrice: 35000, amount: 35000 },
        { category: '약제비', name: '항생제', quantity: 7, unitPrice: 2000, amount: 14000 },
      ],
      summary: {
        subtotal: 64000,
        discount: 0,
        total: 64000,
        paid: 64000,
        paymentMethod: '카드'
      },
      notes: ''
    },
    prescription: {
      documentType: 'prescription',
      hospital: {
        name: '행복한 동물병원',
        vetName: '박수의',
        licenseNumber: '12345'
      },
      patient: {
        petName: '초코',
        species: '개',
        breed: '푸들',
        weight: '5.2',
        age: '3세'
      },
      prescriptionDate: new Date().toISOString().split('T')[0],
      diagnosis: '경미한 피부염',
      medications: [
        {
          name: '세파렉신',
          dosage: '250mg',
          frequency: '1일 2회',
          duration: '7일',
          instructions: '식후 복용',
          warnings: ''
        }
      ],
      nextVisit: '',
      notes: ''
    }
  };

  return {
    success: true,
    data: dummyData[documentType] || dummyData.receipt,
    isDummy: true,
  };
}

/**
 * 구조화된 데이터를 의료 기록으로 변환
 */
export function convertToMedicalRecord(ocrData, petId) {
  const baseRecord = {
    id: `record_${Date.now()}`,
    petId,
    source: 'ocr',
    createdAt: new Date().toISOString(),
    originalDocument: ocrData.documentType,
  };

  switch (ocrData.documentType) {
    case 'receipt':
      return {
        ...baseRecord,
        type: 'visit',
        date: ocrData.visitDate,
        hospital: ocrData.hospital?.name,
        items: ocrData.items,
        totalCost: ocrData.summary?.total,
        notes: ocrData.notes,
      };
    case 'prescription':
      return {
        ...baseRecord,
        type: 'prescription',
        date: ocrData.prescriptionDate,
        hospital: ocrData.hospital?.name,
        veterinarian: ocrData.hospital?.vetName,
        diagnosis: ocrData.diagnosis,
        medications: ocrData.medications,
        nextVisit: ocrData.nextVisit,
      };
    case 'diagnosis':
      return {
        ...baseRecord,
        type: 'diagnosis',
        date: ocrData.visitDate,
        hospital: ocrData.hospital?.name,
        symptoms: ocrData.symptoms,
        diagnosis: ocrData.diagnosis,
        treatment: ocrData.treatment,
        testResults: ocrData.testResults,
        prognosis: ocrData.prognosis,
      };
    case 'vaccination':
      return {
        ...baseRecord,
        type: 'vaccination',
        date: ocrData.issuedDate,
        hospital: ocrData.hospital?.name,
        vaccinations: ocrData.vaccinations,
      };
    case 'test_result':
      return {
        ...baseRecord,
        type: 'test',
        date: ocrData.testDate,
        hospital: ocrData.hospital?.name,
        testType: ocrData.testType,
        results: ocrData.results,
        interpretation: ocrData.interpretation,
      };
    default:
      return {
        ...baseRecord,
        type: 'other',
        rawData: ocrData,
      };
  }
}

/**
 * 의료 기록 저장
 */
export function saveMedicalRecord(record) {
  const RECORDS_KEY = 'petMedical_records';
  try {
    const existing = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    existing.unshift(record);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(existing));
    return true;
  } catch (error) {
    console.error('의료 기록 저장 실패:', error);
    return false;
  }
}

/**
 * 펫별 의료 기록 조회
 */
export function getMedicalRecords(petId) {
  const RECORDS_KEY = 'petMedical_records';
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
    return petId ? records.filter(r => r.petId === petId) : records;
  } catch (error) {
    console.error('의료 기록 조회 실패:', error);
    return [];
  }
}
