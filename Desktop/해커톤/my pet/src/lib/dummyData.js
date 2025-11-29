// src/lib/dummyData.js
// 더미 데이터 - 반려동물 및 진료기록

// 유저 목록
export const DUMMY_USERS = [
  { id: 'user_001', name: '김민수', email: 'minsu.kim@email.com', phone: '010-1234-5678' },
  { id: 'user_002', name: '이영희', email: 'younghee.lee@email.com', phone: '010-2345-6789' },
  { id: 'user_003', name: '박지훈', email: 'jihoon.park@email.com', phone: '010-3456-7890' },
  { id: 'user_004', name: '최수연', email: 'sooyeon.choi@email.com', phone: '010-4567-8901' },
  { id: 'user_005', name: '정현우', email: 'hyunwoo.jung@email.com', phone: '010-5678-9012' },
];

// 반려동물 목록 (50개)
export const DUMMY_PETS = [
  // 강아지
  { id: 'pet_001', userId: 'user_001', petName: '콩이', species: 'dog', breed: '말티즈', birthDate: '2020-03-15', sex: 'M', neutered: true, weight: 3.5, profileImage: null, character: 'dog_white' },
  { id: 'pet_002', userId: 'user_001', petName: '밤이', species: 'dog', breed: '포메라니안', birthDate: '2021-07-20', sex: 'F', neutered: true, weight: 2.8, profileImage: null, character: 'dog_brown' },
  { id: 'pet_003', userId: 'user_002', petName: '초코', species: 'dog', breed: '푸들', birthDate: '2019-11-05', sex: 'M', neutered: true, weight: 5.2, profileImage: null, character: 'dog_black' },
  { id: 'pet_004', userId: 'user_002', petName: '모카', species: 'dog', breed: '비숑프리제', birthDate: '2022-01-10', sex: 'F', neutered: false, weight: 4.1, profileImage: null, character: 'dog_white' },
  { id: 'pet_005', userId: 'user_003', petName: '뽀삐', species: 'dog', breed: '시츄', birthDate: '2018-05-25', sex: 'F', neutered: true, weight: 5.8, profileImage: null, character: 'dog_mixed' },
  { id: 'pet_006', userId: 'user_003', petName: '태양이', species: 'dog', breed: '골든리트리버', birthDate: '2020-09-12', sex: 'M', neutered: true, weight: 28.5, profileImage: null, character: 'dog_golden' },
  { id: 'pet_007', userId: 'user_004', petName: '별이', species: 'dog', breed: '웰시코기', birthDate: '2021-04-08', sex: 'F', neutered: true, weight: 12.3, profileImage: null, character: 'dog_corgi' },
  { id: 'pet_008', userId: 'user_004', petName: '달이', species: 'dog', breed: '진돗개', birthDate: '2019-02-14', sex: 'M', neutered: true, weight: 18.7, profileImage: null, character: 'dog_jindo' },
  { id: 'pet_009', userId: 'user_005', petName: '하루', species: 'dog', breed: '사모예드', birthDate: '2022-06-30', sex: 'M', neutered: false, weight: 22.1, profileImage: null, character: 'dog_white' },
  { id: 'pet_010', userId: 'user_005', petName: '해피', species: 'dog', breed: '비글', birthDate: '2020-12-25', sex: 'F', neutered: true, weight: 9.8, profileImage: null, character: 'dog_beagle' },

  // 고양이
  { id: 'pet_011', userId: 'user_001', petName: '나비', species: 'cat', breed: '코리안숏헤어', birthDate: '2021-02-28', sex: 'F', neutered: true, weight: 4.2, profileImage: null, character: 'cat_gray' },
  { id: 'pet_012', userId: 'user_002', petName: '호두', species: 'cat', breed: '러시안블루', birthDate: '2020-08-15', sex: 'M', neutered: true, weight: 5.1, profileImage: null, character: 'cat_gray' },
  { id: 'pet_013', userId: 'user_002', petName: '치즈', species: 'cat', breed: '스코티쉬폴드', birthDate: '2022-03-10', sex: 'M', neutered: true, weight: 4.8, profileImage: null, character: 'cat_orange' },
  { id: 'pet_014', userId: 'user_003', petName: '구름', species: 'cat', breed: '페르시안', birthDate: '2019-06-20', sex: 'F', neutered: true, weight: 5.5, profileImage: null, character: 'cat_white' },
  { id: 'pet_015', userId: 'user_004', petName: '달콤', species: 'cat', breed: '랙돌', birthDate: '2021-11-11', sex: 'F', neutered: true, weight: 4.9, profileImage: null, character: 'cat_ragdoll' },
  { id: 'pet_016', userId: 'user_004', petName: '도토리', species: 'cat', breed: '아비시니안', birthDate: '2020-04-05', sex: 'M', neutered: true, weight: 4.3, profileImage: null, character: 'cat_tabby' },
  { id: 'pet_017', userId: 'user_005', petName: '솜이', species: 'cat', breed: '터키쉬앙고라', birthDate: '2022-09-18', sex: 'F', neutered: false, weight: 3.8, profileImage: null, character: 'cat_white' },
  { id: 'pet_018', userId: 'user_005', petName: '까미', species: 'cat', breed: '봄베이', birthDate: '2021-07-07', sex: 'M', neutered: true, weight: 5.0, profileImage: null, character: 'cat_black' },

  // 추가 반려동물 (더 다양한 품종)
  { id: 'pet_019', userId: 'user_001', petName: '루루', species: 'dog', breed: '요크셔테리어', birthDate: '2023-01-20', sex: 'F', neutered: false, weight: 2.3, profileImage: null, character: 'dog_yorkie' },
  { id: 'pet_020', userId: 'user_002', petName: '몽이', species: 'dog', breed: '치와와', birthDate: '2022-05-15', sex: 'M', neutered: true, weight: 1.8, profileImage: null, character: 'dog_chihuahua' },
];

// 진료기록 생성 함수
const generateMedicalRecords = () => {
  const hospitals = [
    { name: '행복한동물병원', address: '서울시 강남구 역삼동 123-45', phone: '02-1234-5678' },
    { name: '24시 강남동물의료센터', address: '서울시 강남구 논현동 456-78', phone: '02-2345-6789' },
    { name: '사랑동물병원', address: '서울시 서초구 서초동 789-12', phone: '02-3456-7890' },
    { name: '펫프렌즈 동물병원', address: '서울시 송파구 잠실동 321-54', phone: '02-4567-8901' },
    { name: '우리동물클리닉', address: '서울시 마포구 합정동 654-32', phone: '02-5678-9012' },
  ];

  const diagnoses = [
    { type: '피부질환', diagnosis: '아토피성 피부염', treatment: '약물 치료 및 약용 샴푸', medications: ['아포퀠정 16mg', '피부영양제', '소염연고'] },
    { type: '소화기질환', diagnosis: '급성 장염', treatment: '수액 치료 및 식이 조절', medications: ['프로바이오틱스', '장영양제', '지사제'] },
    { type: '정기검진', diagnosis: '건강상태 양호', treatment: '특별 조치 불필요', medications: [] },
    { type: '호흡기질환', diagnosis: '기관지염', treatment: '항생제 및 기침억제제 처방', medications: ['항생제', '기침억제제', '거담제'] },
    { type: '눈질환', diagnosis: '결막염', treatment: '점안액 처방', medications: ['항생제 점안액', '인공눈물'] },
    { type: '귀질환', diagnosis: '외이염', treatment: '귀세정 및 연고 처방', medications: ['귀세정제', '귀연고'] },
    { type: '치과질환', diagnosis: '치석 제거', treatment: '스케일링 시술', medications: ['소염제', '항생제'] },
    { type: '관절질환', diagnosis: '슬개골 탈구 의심', treatment: '추가 검사 권고', medications: ['관절영양제'] },
    { type: '예방접종', diagnosis: '정기 예방접종', treatment: '종합백신 접종', medications: [] },
    { type: '심장질환', diagnosis: '심잡음 발견', treatment: '정밀검사 권고', medications: ['심장보조제'] },
  ];

  const records = [];
  let recordId = 1;

  // 각 반려동물에 대해 2~5개의 진료기록 생성
  DUMMY_PETS.forEach(pet => {
    const numRecords = Math.floor(Math.random() * 4) + 2; // 2~5개

    for (let i = 0; i < numRecords; i++) {
      const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];
      const diagnosisInfo = diagnoses[Math.floor(Math.random() * diagnoses.length)];

      // 랜덤 날짜 생성 (최근 2년 내)
      const daysAgo = Math.floor(Math.random() * 730);
      const recordDate = new Date();
      recordDate.setDate(recordDate.getDate() - daysAgo);

      const triageScores = [1, 1, 1, 2, 2, 3, 4]; // 대부분 경미, 일부 심각
      const triageScore = triageScores[Math.floor(Math.random() * triageScores.length)];

      records.push({
        id: `record_${String(recordId++).padStart(4, '0')}`,
        petId: pet.id,
        userId: pet.userId,
        petName: pet.petName,
        species: pet.species,
        breed: pet.breed,
        age: calculateAge(pet.birthDate),
        date: recordDate.toISOString().split('T')[0],
        hospitalName: hospital.name,
        hospitalAddress: hospital.address,
        hospitalPhone: hospital.phone,
        type: diagnosisInfo.type,
        diagnosis: diagnosisInfo.diagnosis,
        treatment: diagnosisInfo.treatment,
        medications: diagnosisInfo.medications,
        triage_score: triageScore,
        triage_note: getTriageNote(triageScore),
        weight: pet.weight + (Math.random() * 0.4 - 0.2), // 약간의 체중 변화
        notes: generateNotes(diagnosisInfo.type),
        created_at: recordDate.toISOString(),
        possible_diseases: generatePossibleDiseases(diagnosisInfo.type),
      });
    }
  });

  return records.sort((a, b) => new Date(b.date) - new Date(a.date)); // 최신순 정렬
};

// 나이 계산 함수
const calculateAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// 응급도 노트 생성
const getTriageNote = (score) => {
  switch (score) {
    case 4: return '즉시 응급 처치가 필요합니다.';
    case 3: return '빠른 시일 내 병원 방문을 권장합니다.';
    case 2: return '증상이 악화되면 병원 방문이 필요합니다.';
    default: return '건강 상태가 양호합니다.';
  }
};

// 진료 노트 생성
const generateNotes = (type) => {
  const notes = {
    '피부질환': '알레르기 원인 파악을 위해 식이 관리가 필요합니다. 사료 변경 검토 권장.',
    '소화기질환': '며칠간 소화가 잘되는 음식으로 식이 관리가 필요합니다.',
    '정기검진': '전반적인 건강 상태 양호. 다음 정기검진은 6개월 후 권장.',
    '호흡기질환': '실내 환기 및 습도 관리가 필요합니다.',
    '눈질환': '하루 2~3회 점안 필요. 비비지 않도록 주의.',
    '귀질환': '주 2회 귀 청소 필요. 귀에 물이 들어가지 않도록 주의.',
    '치과질환': '정기적인 치아 관리 및 덴탈 츄 급여 권장.',
    '관절질환': '과도한 점프나 계단 오르내리기 자제 필요.',
    '예방접종': '다음 접종 일정 확인 필요.',
    '심장질환': '정기적인 심장 모니터링이 필요합니다.',
  };
  return notes[type] || '특이사항 없음.';
};

// 감별진단 생성
const generatePossibleDiseases = (type) => {
  const diseasesByType = {
    '피부질환': [
      { name: '아토피성 피부염', probability: 65, related_area: '피부' },
      { name: '접촉성 알레르기', probability: 25, related_area: '피부' },
      { name: '세균성 피부염', probability: 10, related_area: '피부' },
    ],
    '소화기질환': [
      { name: '급성 장염', probability: 70, related_area: '소화기' },
      { name: '소화불량', probability: 20, related_area: '소화기' },
      { name: '췌장염', probability: 10, related_area: '소화기' },
    ],
    '호흡기질환': [
      { name: '기관지염', probability: 60, related_area: '호흡기' },
      { name: '폐렴', probability: 25, related_area: '호흡기' },
      { name: '켄넬코프', probability: 15, related_area: '호흡기' },
    ],
    '눈질환': [
      { name: '결막염', probability: 75, related_area: '눈' },
      { name: '각막염', probability: 20, related_area: '눈' },
      { name: '유루증', probability: 5, related_area: '눈' },
    ],
  };
  return diseasesByType[type] || [];
};

// 진료기록 데이터
export const DUMMY_MEDICAL_RECORDS = generateMedicalRecords();

// 예방접종 기록 생성
export const generateVaccinationRecords = (petId) => {
  const vaccines = [
    { name: '종합백신 (DHPPL)', interval: 365 },
    { name: '광견병 백신', interval: 365 },
    { name: '심장사상충 예방', interval: 30 },
    { name: '켄넬코프 백신', interval: 365 },
    { name: '구충제', interval: 90 },
  ];

  return vaccines.map((vaccine, idx) => {
    const daysAgo = Math.floor(Math.random() * vaccine.interval);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const nextDue = new Date(date);
    nextDue.setDate(nextDue.getDate() + vaccine.interval);

    return {
      id: `vac_${petId}_${idx}`,
      petId,
      name: vaccine.name,
      date: date.toISOString().split('T')[0],
      nextDue: nextDue.toISOString().split('T')[0],
      hospitalName: '행복한동물병원',
      status: 'completed',
    };
  });
};

// 건강검진 기록 생성
export const generateCheckupRecords = (petId) => {
  const checkupTypes = ['종합건강검진', '기본건강검진', '노령견 검진', '심장 검진'];
  const records = [];

  for (let i = 0; i < 2; i++) {
    const daysAgo = Math.floor(Math.random() * 365) + 90;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    records.push({
      id: `checkup_${petId}_${i}`,
      petId,
      date: date.toISOString().split('T')[0],
      hospitalName: i === 0 ? '행복한동물병원' : '24시 강남동물의료센터',
      type: checkupTypes[Math.floor(Math.random() * checkupTypes.length)],
      results: [
        { item: '혈액검사', status: Math.random() > 0.2 ? 'normal' : 'caution', note: '수치 확인' },
        { item: '소변검사', status: 'normal', note: '정상' },
        { item: '체중측정', status: Math.random() > 0.7 ? 'caution' : 'normal', note: '체중 기록' },
      ],
      overallStatus: Math.random() > 0.3 ? '건강' : '주의',
    });
  }

  return records;
};

// 로컬스토리지에 더미데이터 저장
export const initializeDummyData = () => {
  // 이미 데이터가 있으면 스킵
  const existing = localStorage.getItem('dummyDataInitialized');
  if (existing) return;

  // 진료기록 저장
  localStorage.setItem('petMedical_diagnoses', JSON.stringify(DUMMY_MEDICAL_RECORDS));

  // 더미데이터 초기화 완료 표시
  localStorage.setItem('dummyDataInitialized', 'true');

  console.log('더미데이터가 초기화되었습니다.');
  console.log(`- 유저: ${DUMMY_USERS.length}명`);
  console.log(`- 반려동물: ${DUMMY_PETS.length}마리`);
  console.log(`- 진료기록: ${DUMMY_MEDICAL_RECORDS.length}건`);
};

// 데이터 요약 통계
export const getDataSummary = () => ({
  totalUsers: DUMMY_USERS.length,
  totalPets: DUMMY_PETS.length,
  totalRecords: DUMMY_MEDICAL_RECORDS.length,
  dogCount: DUMMY_PETS.filter(p => p.species === 'dog').length,
  catCount: DUMMY_PETS.filter(p => p.species === 'cat').length,
  recordsByType: DUMMY_MEDICAL_RECORDS.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {}),
});
