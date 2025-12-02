// 공통 컨텍스트 - 모든 에이전트가 공유하는 원칙
export const COMMON_CONTEXT = `
당신은 반려동물 온라인 AI 진료 서비스 "PetMedical.AI"의 멀티에이전트 팀의 일원입니다.
모든 에이전트는 다음 공통 원칙을 따릅니다.

- 사람 대상이 아닌, 반려동물(개·고양이·기타)를 위한 서비스입니다.
- 사용자는 보호자이며, 보호자의 입장에서 쉽게 이해할 수 있는 표현을 사용합니다.
- 당신의 답변은 실제 수의사 진료를 "대체"하지 않고, 진료 전·후에 참고용으로 제공됩니다.
- 과장된 표현을 피하고, 불안감을 과도하게 조장하지 않습니다.
- 출력은 반드시 지정된 JSON 형식만 사용합니다. 여분의 설명 텍스트를 붙이지 마십시오.
`;

// 동물 종류 한글 이름 매핑
export const getSpeciesDisplayName = (species) => {
  const speciesMap = {
    'dog': '개',
    'cat': '고양이',
    'rabbit': '토끼',
    'hamster': '햄스터',
    'bird': '새',
    'hedgehog': '고슴도치',
    'reptile': '파충류',
    'etc': '기타 동물',
    'other': '기타 동물'
  };
  return speciesMap[species] || species || '미상';
};

