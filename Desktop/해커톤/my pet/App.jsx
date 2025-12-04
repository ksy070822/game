import { useState, useEffect, useRef } from 'react'
import './App.css'
// 백엔드 API 사용 안 함 - 프론트엔드 모드만 사용
// import { runMultiAgentDiagnosisViaBackend } from './src/services/api/backendAPI'
import { requestQuestionAnswer } from './src/services/api/backendAPI'
import { MyPage } from './src/components/MyPage'
import { Avatar } from './src/components/Avatar'
import { AvatarLayered } from './src/components/AvatarLayered'
import { CuteCharacter } from './src/components/CuteCharacter'
import { FloatingBackground, AnimatedCard, AnimatedButton, AnimatedContainer, StaggerList, CuteLoader, AnimatedProgress } from './src/components/AnimatedUI'
import { DailyCareTracker, getDailyLogs } from './src/components/DailyCareTracker'
import { DailyCareLog } from './src/components/DailyCareLog'
import { analyzeHealthPattern } from './src/services/ai/patternAnalyzer'
import { calculateTriageScore } from './src/services/ai/triageEngine'
import { generateHospitalPacket } from './src/services/ai/hospitalPacket'
import { HospitalBooking } from './src/components/HospitalBooking'
import { HospitalPacketReview } from './src/components/HospitalPacketReview'
import { PacketSentSummary } from './src/components/PacketSentSummary'
import { RecordsView } from './src/components/RecordsView'
import { mapDiagnosisToHealthFlags, convertHealthFlagsFormat } from './src/utils/healthFlagsMapper'
import { analyzeCarePatternWithGemini } from './src/lib/aiPatternAnalysis'
import { BottomTabNavigation } from './src/components/BottomTabNavigation'
import { callCareAgent } from './src/services/ai/careAgent'
import { CareActionButton } from './src/components/CareActionButton'
import { loadDailyLog, saveDailyLog, getTodayKey } from './src/lib/careLogs'
import DiagnosisReport from './src/components/DiagnosisReport'
import { getApiKey, API_KEY_TYPES } from './src/services/apiKeyManager'
// 더미 데이터 비활성화 - 실제 서비스용
// import { initializeDummyData, DUMMY_PETS, DUMMY_MEDICAL_RECORDS } from './src/lib/dummyData'
import { LoginScreen, RegisterScreen, getAuthSession, clearAuthSession } from './src/components/Auth'
import { OCRUpload } from './src/components/OCRUpload'
import { ClinicAdmin } from './src/components/ClinicAdmin'
import { seedGuardianData, seedClinicData } from './src/utils/seedTestDataUtils'
import { seedMedicationData } from './src/utils/seedMedicationData'
import { auth } from './src/lib/firebase'
import { ClinicDashboard } from './src/components/ClinicDashboard'
import { AICareConsultation } from './src/components/AICareConsultation'
import { getFAQContext } from './src/data/faqData'
import { diagnosisService, bookingService, petService, commentTemplateService, clinicResultService } from './src/services/firestore'
import { requestPushPermission, setupForegroundMessageHandler } from './src/services/pushNotificationService'
import { getUserClinics } from './src/services/clinicService'
import { getSpeciesDisplayName } from './src/services/ai/commonContext'
// 동물 이미지 경로 유틸리티 import
import { getMainCharacterImage, getPetImage, PROFILE_IMAGES } from './src/utils/imagePaths'
// AI 캐릭터 생성 관련 import
import { CharacterStyleModal } from './src/components/CharacterStyleModal'
import { CharacterResultModal } from './src/components/CharacterResultModal'
import { generatePetCharacter } from './src/services/ai/characterGenerator'
import { uploadImage, generateFileName } from './src/lib/storageUtils'
// 동적 import 대신 정적 import로 변경 (빌드 시 chunk 분리로 인한 404 오류 방지)
import { runMultiAgentDiagnosis } from './src/services/ai/agentOrchestrator'

// 동물 종류 한글 매핑
const SPECIES_LABELS_APP = {
  dog: '강아지',
  cat: '고양이',
  rabbit: '토끼',
  hamster: '햄스터',
  bird: '조류',
  hedgehog: '고슴도치',
  reptile: '파충류',
  etc: '기타',
  other: '기타'
};

// ============ 로컬 스토리지 유틸리티 ============
const STORAGE_KEY = 'petMedical_pets';
const DIAGNOSIS_KEY = 'petMedical_diagnoses';

// 사용자별 반려동물 키
const getUserPetsKey = (userId) => `petMedical_pets_${userId}`;
const getUserDiagnosesKey = (userId) => `petMedical_diagnoses_${userId}`;

// 사용자별 반려동물 데이터 가져오기
const getPetsForUser = (userId) => {
  if (!userId) return [];
  try {
    const data = localStorage.getItem(getUserPetsKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// 사용자별 반려동물 데이터 저장
const savePetsForUser = async (userId, pets, newPetData = null) => {
  if (!userId) return;
  try {
    localStorage.setItem(getUserPetsKey(userId), JSON.stringify(pets));

    // 새로운 반려동물이 추가된 경우 Firestore에도 저장
    if (newPetData) {
      try {
        const result = await petService.addPet(userId, {
          petName: newPetData.petName || newPetData.name,
          species: newPetData.species || 'dog',
          breed: newPetData.breed || '',
          sex: newPetData.sex || '',
          birthDate: newPetData.birthDate || null,
          weight: newPetData.weight || null,
          neutered: newPetData.neutered || false,
          character: newPetData.character || null,
          profileImage: newPetData.profileImage || null,
          originalPhoto: newPetData.originalPhoto || null,
          characters: newPetData.characters || [],
          sido: newPetData.sido || null,
          sigungu: newPetData.sigungu || null
        });
        if (result.success) {
          console.log('반려동물 Firestore 저장 완료:', result.id);
        }
      } catch (firestoreError) {
        console.warn('반려동물 Firestore 저장 실패 (로컬 저장은 완료):', firestoreError);
      }
    }
  } catch (error) {
    console.error('Failed to save pets:', error);
  }
};

// 기존 호환용 (마이그레이션용)
const getPetsFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const savePetsToStorage = (pets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
  } catch (error) {
    console.error('Failed to save pets:', error);
  }
};

const saveDiagnosisToStorage = async (diagnosis, userId = null) => {
  try {
    // healthFlags가 없으면 계산해서 추가
    let diagnosisWithFlags = { ...diagnosis };
    if (!diagnosisWithFlags.healthFlags) {
      diagnosisWithFlags.healthFlags = mapDiagnosisToHealthFlags(diagnosis);
    }
    
    const diagnosisData = {
      ...diagnosisWithFlags, 
      id: diagnosisWithFlags.id || Date.now().toString(), 
      date: new Date().toISOString() 
    };

    // localStorage에도 저장 (오프라인 지원)
    const diagnoses = JSON.parse(localStorage.getItem(DIAGNOSIS_KEY) || '[]');
    diagnoses.unshift(diagnosisData);
    localStorage.setItem(DIAGNOSIS_KEY, JSON.stringify(diagnoses));

    // Firestore에 저장 (userId가 있으면)
    try {
      const firestoreData = {
        ...diagnosisData,
        userId: userId || diagnosisData.userId || null,
        petId: diagnosisData.petId || null,
        symptom: diagnosisData.symptom || diagnosisData.description || '',
        species: diagnosisData.species || 'dog',
        created_at: new Date().toISOString()
      };
      const result = await diagnosisService.saveDiagnosis(firestoreData);
      if (result.success) {
        console.log('진단 결과 Firestore 저장 완료:', result.id);
      }
    } catch (firestoreError) {
      console.warn('Firestore 저장 실패 (로컬 저장은 완료):', firestoreError);
    }
  } catch (error) {
    console.error('Failed to save diagnosis:', error);
  }
};

// 최근 진단 기록 가져오기
const getLatestDiagnosisRecord = (petId) => {
  try {
    const diagnoses = JSON.parse(localStorage.getItem(DIAGNOSIS_KEY) || '[]');
    const petDiagnoses = diagnoses.filter(d => d.petId === petId);
    if (petDiagnoses.length === 0) return null;
    // 가장 최근 기록 반환 (첫 번째가 가장 최신)
    return petDiagnoses[0];
  } catch (error) {
    console.error('Failed to get latest diagnosis:', error);
    return null;
  }
};

const calculateAge = (birthDate) => {
  if (!birthDate) return '나이 미등록';
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  return `${age}세`;
};

// ============ 캐릭터 옵션 ============
const PET_CHARACTERS = {
  dog: [
    { id: 'dog_white', emoji: '🐶', label: '흰색 강아지', color: '#F5F5F5' },
    { id: 'dog_brown', emoji: '🐕', label: '갈색 강아지', color: '#8B4513' },
    { id: 'dog_golden', emoji: '🦮', label: '골든 리트리버', color: '#DAA520' },
    { id: 'dog_poodle', emoji: '🐩', label: '푸들', color: '#FFB6C1' },
    { id: 'dog_shiba', emoji: '🐕‍🦺', label: '시바이누', color: '#D2691E' },
    { id: 'dog_husky', emoji: '🐺', label: '허스키', color: '#708090' },
  ],
  cat: [
    { id: 'cat_orange', emoji: '🐱', label: '치즈 고양이', color: '#FFA500' },
    { id: 'cat_black', emoji: '🐈‍⬛', label: '검은 고양이', color: '#2C2C2C' },
    { id: 'cat_white', emoji: '🐈', label: '흰 고양이', color: '#FFFAFA' },
    { id: 'cat_gray', emoji: '😺', label: '회색 고양이', color: '#808080' },
    { id: 'cat_calico', emoji: '😸', label: '삼색 고양이', color: '#FFE4B5' },
    { id: 'cat_siamese', emoji: '😻', label: '샴 고양이', color: '#D2B48C' },
  ],
  bird: [
    { id: 'bird_parrot', emoji: '🦜', label: '앵무새', color: '#32CD32' },
    { id: 'bird_canary', emoji: '🐦', label: '카나리아', color: '#FFD700' },
    { id: 'bird_budgie', emoji: '🐤', label: '잉꼬', color: '#87CEEB' },
  ],
  hamster: [
    { id: 'hamster_gold', emoji: '🐹', label: '골든햄스터', color: '#F4A460' },
    { id: 'hamster_dwarf', emoji: '🐹', label: '드워프햄스터', color: '#D3D3D3' },
  ],
  rabbit: [
    { id: 'rabbit_white', emoji: '🐰', label: '흰 토끼', color: '#FFFAF0' },
    { id: 'rabbit_brown', emoji: '🐇', label: '갈색 토끼', color: '#A0522D' },
  ],
  hedgehog: [
    { id: 'hedgehog_normal', emoji: '🦔', label: '고슴도치', color: '#8B7355' },
    { id: 'hedgehog_white', emoji: '🦔', label: '백설 고슴도치', color: '#FFFAFA' },
  ],
  reptile: [
    { id: 'reptile_lizard', emoji: '🦎', label: '도마뱀', color: '#228B22' },
    { id: 'reptile_turtle', emoji: '🐢', label: '거북이', color: '#3CB371' },
    { id: 'reptile_snake', emoji: '🐍', label: '뱀', color: '#556B2F' },
  ],
  other: [
    { id: 'other_pet', emoji: '🐾', label: '기타', color: '#808080' },
  ]
};

// 동물 종류 옵션 - PROFILE_IMAGES 사용하여 배포 환경 호환
const SPECIES_OPTIONS = [
  { id: 'dog', label: '강아지', emoji: '🐕', icon: PROFILE_IMAGES.dog },
  { id: 'cat', label: '고양이', emoji: '🐈', icon: PROFILE_IMAGES.cat },
  { id: 'rabbit', label: '토끼', emoji: '🐰', icon: PROFILE_IMAGES.rabbit },
  { id: 'hamster', label: '햄스터', emoji: '🐹', icon: PROFILE_IMAGES.hamster },
  { id: 'bird', label: '새', emoji: '🦜', icon: PROFILE_IMAGES.bird },
  { id: 'hedgehog', label: '고슴도치', emoji: '🦔', icon: PROFILE_IMAGES.hedgehog },
  { id: 'reptile', label: '파충류', emoji: '🦎', icon: PROFILE_IMAGES.reptile },
  { id: 'other', label: '기타', emoji: '🐾', icon: PROFILE_IMAGES.etc },
];

// Base URL for GitHub Pages deployment
const BASE_URL = import.meta.env.BASE_URL || '/ai-factory/';

// 동물 종류별 메인 캐릭터 이미지 (프로필 배너용)
const MAIN_CHARACTER_IMAGES = {
  dog: `${BASE_URL}icon/main-image/dog_main-removebg-preview.png`,
  cat: `${BASE_URL}icon/main-image/Cat_main-removebg-preview.png`,
  rabbit: `${BASE_URL}icon/main-image/rabbit_main-removebg-preview.png`,
  hamster: `${BASE_URL}icon/main-image/hamster_main-removebg-preview.png`,
  bird: `${BASE_URL}icon/main-image/bird_main-removebg-preview.png`,
  hedgehog: `${BASE_URL}icon/main-image/hedgehog_main-removebg-preview.png`,
  reptile: `${BASE_URL}icon/main-image/reptile_main-removebg-preview.png`,
  other: `${BASE_URL}icon/main-image/etc_main-removebg-preview.png`
};

// 동물 종류별 프로필 아이콘 이미지 (원형 배경 포함)
const PROFILE_ICON_IMAGES = {
  dog: `${BASE_URL}icon/dog.png`,
  cat: `${BASE_URL}icon/cat.png`,
  rabbit: `${BASE_URL}icon/rabbit.png`,
  hamster: `${BASE_URL}icon/hamster.png`,
  bird: `${BASE_URL}icon/bird.png`,
  hedgehog: `${BASE_URL}icon/hedgehog.png`,
  reptile: `${BASE_URL}icon/reptile.png`,
  other: `${BASE_URL}icon/etc.png`
};

// 개/고양이 대표 품종 목록
const DOG_BREEDS = [
  '믹스견', '말티즈', '푸들', '포메라니안', '치와와', '시츄', '요크셔테리어',
  '비숑프리제', '골든리트리버', '래브라도리트리버', '사모예드', '웰시코기',
  '진돗개', '시바이누', '비글', '프렌치불독', '불독', '닥스훈트', '슈나우저', '기타'
];

const CAT_BREEDS = [
  '믹스묘', '코리안숏헤어', '러시안블루', '페르시안', '브리티시숏헤어',
  '스코티시폴드', '먼치킨', '노르웨이숲', '메인쿤', '랙돌', '아비시니안',
  '뱅갈', '샴', '버만', '터키시앙고라', '아메리칸숏헤어', '기타'
];

// 토끼 품종
const RABBIT_BREEDS = ['흰 토끼', '갈색 토끼', '네덜란드드워프', '롭이어', '렉스', '앙고라', '기타'];

// 햄스터 품종
const HAMSTER_BREEDS = ['골든햄스터', '드워프햄스터', '로보로브스키', '캠벨', '윈터화이트', '기타'];

// 새 품종
const BIRD_BREEDS = ['앵무새', '카나리아', '잉꼬', '사랑앵무', '코카티엘', '문조', '십자매', '기타'];

// 고슴도치 품종
const HEDGEHOG_BREEDS = ['아프리카피그미', '백설고슴도치', '솔트앤페퍼', '시나몬', '알비노', '기타'];

// 파충류 품종
const REPTILE_BREEDS = ['도마뱀', '거북이', '뱀', '카멜레온', '이구아나', '레오파드게코', '크레스티드게코', '기타'];

// 기타 동물
const OTHER_BREEDS = ['기타'];

// 종류별 품종 매핑
const BREED_OPTIONS = {
  dog: DOG_BREEDS,
  cat: CAT_BREEDS,
  rabbit: RABBIT_BREEDS,
  hamster: HAMSTER_BREEDS,
  bird: BIRD_BREEDS,
  hedgehog: HEDGEHOG_BREEDS,
  reptile: REPTILE_BREEDS,
  other: OTHER_BREEDS
};

// ============ 프로필 등록 화면 ============
function ProfileRegistration({ onComplete, userId }) {
  const [formData, setFormData] = useState({
    petName: '',
    species: 'dog',
    breed: '',
    birthDate: '',
    sex: 'M',
    neutered: true,
    sido: '',
    sigungu: '',
    profileImage: null,
    character: 'dog_white'
  });

  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null); // Firebase Storage URL
  const [generatedCharacter, setGeneratedCharacter] = useState(null); // 생성된 캐릭터 URL
  const [characterStyle, setCharacterStyle] = useState(null);
  const [converting, setConverting] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // 이미지 업로드 핸들러
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }

      setLoading(true);
      
      // base64로 변환 (빠르게 처리, Firebase Storage 업로드 없음)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setPreviewImage(base64);
        setFormData(prev => ({ ...prev, profileImage: base64 }));
        
        // base64 변환이 완료되면 즉시 로딩 종료
        setLoading(false);
        
        // Firebase Storage 업로드는 CORS 문제로 인해 비활성화
        // base64로 저장하여 프로필 등록은 정상 작동
        // TODO: Firebase Storage CORS 설정 완료 후 다시 활성화
        // originalImageUrl은 null로 유지 (base64만 사용)
        setOriginalImageUrl(null);
      };
      
      reader.onerror = () => {
        console.error('이미지 읽기 오류');
        alert('이미지를 읽을 수 없습니다.');
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
      
      // 기존 캐릭터 리셋
      setGeneratedCharacter(null);
      setCharacterStyle(null);
    }
  };

  // 캐릭터 변환 시작
  const handleConvertClick = () => {
    // originalImageUrl이 없어도 base64 이미지가 있으면 진행
    if (!originalImageUrl && !previewImage) {
      alert('먼저 반려동물 사진을 업로드해주세요.');
      return;
    }
    setShowStyleModal(true);
  };

  // 스타일 선택 후 변환 시작
  const handleStyleSelect = async (style) => {
    setShowStyleModal(false);
    setConverting(true);

    try {
      // originalImageUrl이 없으면 base64 이미지를 사용
      const imageUrl = originalImageUrl || previewImage;
      if (!imageUrl) {
        alert('이미지가 없습니다. 다시 업로드해주세요.');
        setConverting(false);
        return;
      }

      const result = await generatePetCharacter(
        imageUrl,
        userId || 'temp',
        'temp',
        style
      );

      if (result.success) {
        setGeneratedCharacter(result.characterUrl);
        setCharacterStyle(style);
        setShowResultModal(true);
      } else {
        alert(result.error || '캐릭터 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('캐릭터 생성 오류:', error);
      alert('캐릭터 생성 중 오류가 발생했습니다.');
    } finally {
      setConverting(false);
    }
  };

  // 캐릭터 저장만 (프로필에는 반영 안함)
  const handleSaveCharacter = () => {
    setShowResultModal(false);
    alert('캐릭터가 저장되었습니다!');
    // TODO: Firestore에 저장된 캐릭터 목록에 추가
  };

  // 캐릭터를 프로필로 설정
  const handleSetAsProfile = () => {
    if (generatedCharacter) {
      // base64로 변환하여 프로필 이미지로 설정
      fetch(generatedCharacter)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target.result;
            setPreviewImage(base64);
            setFormData(prev => ({ ...prev, profileImage: base64 }));
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error('이미지 변환 오류:', err);
          // 실패 시 URL 직접 사용
          setPreviewImage(generatedCharacter);
          setFormData(prev => ({ ...prev, profileImage: generatedCharacter }));
        });
    }
    setShowResultModal(false);
    alert('프로필 사진이 변경되었습니다!');
  };

  // 종류 변경시 캐릭터와 품종도 변경
  const handleSpeciesChange = (species) => {
    // 각 종류별 기본 캐릭터 설정
    const defaultCharacters = {
      dog: 'dog_white',
      cat: 'cat_orange',
      bird: 'bird_parrot',
      hamster: 'hamster_gold',
      rabbit: 'rabbit_white',
      hedgehog: 'hedgehog_normal',
      reptile: 'reptile_lizard',
      other: 'other_pet'
    };
    const defaultCharacter = defaultCharacters[species] || 'other_pet';
    // 개/고양이가 아닌 경우 품종 초기화
    const shouldClearBreed = species !== 'dog' && species !== 'cat';
    setFormData(prev => ({
      ...prev,
      species,
      character: defaultCharacter,
      breed: shouldClearBreed ? '' : prev.breed
    }));
  };

  const regions = {
    '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
    '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
    '인천광역시': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
    '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
    '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
    '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
    '세종특별자치시': ['세종시'],
    '경기도': ['가평군', '고양시 덕양구', '고양시 일산동구', '고양시 일산서구', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시 분당구', '성남시 수정구', '성남시 중원구', '수원시 권선구', '수원시 영통구', '수원시 장안구', '수원시 팔달구', '시흥시', '안산시 단원구', '안산시 상록구', '안성시', '안양시 동안구', '안양시 만안구', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시 기흥구', '용인시 수지구', '용인시 처인구', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
    '강원도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
    '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시 상당구', '청주시 서원구', '청주시 청원구', '청주시 흥덕구', '충주시'],
    '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시 동남구', '천안시 서북구', '청양군', '태안군', '홍성군'],
    '전라북도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시 덕진구', '전주시 완산구', '정읍시', '진안군'],
    '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
    '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시 남구', '포항시 북구'],
    '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시 마산합포구', '창원시 마산회원구', '창원시 성산구', '창원시 의창구', '창원시 진해구', '통영시', '하동군', '함안군', '함양군', '합천군'],
    '제주특별자치도': ['서귀포시', '제주시'],
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newPet = {
        ...formData,
        id: Date.now(),
        userId: userId, // 소유자 ID 저장
        createdAt: new Date().toISOString(),
        // 원본 사진과 생성된 캐릭터 정보 포함
        originalPhoto: originalImageUrl || null,
        characters: generatedCharacter ? [{
          url: generatedCharacter,
          style: characterStyle,
          createdAt: new Date().toISOString()
        }] : []
      };

      // 사용자별로 저장
      if (userId) {
        const pets = getPetsForUser(userId);
        pets.push(newPet);
        // Firestore 저장 완료까지 대기
        await savePetsForUser(userId, pets, newPet);
      } else {
        // 호환성 유지
        const pets = getPetsFromStorage();
        pets.push(newPet);
        savePetsToStorage(pets);
      }

      onComplete(newPet);
    } catch (error) {
      console.error('반려동물 등록 오류:', error);
      alert('반려동물 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="registration-container">
      <div className="registration-card">
        <header className="bg-gradient-to-r from-sky-500 to-sky-600 text-white px-4 pt-8 pb-8 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}icon/login/logo_red.png`}
                alt="PetMedical.AI"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="text-center ml-4">
              <h1 className="text-3xl font-bold tracking-tight">PetMedical.AI</h1>
              <p className="text-sky-100 text-base font-medium">반려동물 건강 관리의 시작</p>
            </div>
          </div>
        </header>
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>등록 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="registration-form">
            {/* 1. 종류 선택 - 가장 먼저 */}
            <div className="form-group">
              <label>종류 *</label>
              <div className="species-grid">
                {SPECIES_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={`species-btn ${formData.species === option.id ? 'active' : ''}`}
                    onClick={() => handleSpeciesChange(option.id)}
                  >
                    <img 
                      src={option.icon} 
                      alt={option.label}
                      className="species-icon"
                      onError={(e) => {
                        // 이미지 로드 실패 시 이모지로 대체
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'inline';
                      }}
                    />
                    <span className="species-emoji" style={{ display: 'none' }}>{option.emoji}</span>
                    <span className="species-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 프로필 사진 */}
            <div className="form-group">
              <label>프로필 사진</label>
              <div className="profile-selector">
                {/* 프로필 이미지 미리보기 */}
                <div className="profile-preview-container">
                  {previewImage ? (
                    <div className="profile-preview">
                      <img src={previewImage} alt="프로필 미리보기" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => {
                          setPreviewImage(null);
                          setFormData(prev => ({ ...prev, profileImage: null }));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className="profile-preview character"
                      style={{ backgroundColor: '#e0f2fe' }}
                    >
                      {(() => {
                        const selectedSpecies = SPECIES_OPTIONS.find(opt => opt.id === formData.species);
                        const iconPath = selectedSpecies?.icon || null;
                        return iconPath ? (
                          <img
                            src={iconPath}
                            alt={selectedSpecies.label}
                            className="profile-species-icon"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<span class="character-emoji">${selectedSpecies?.emoji || '🐾'}</span>`;
                            }}
                          />
                        ) : (
                          <span className="character-emoji">{selectedSpecies?.emoji || '🐾'}</span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* 사진 업로드 및 캐릭터 변환 버튼 */}
                <div className="profile-options" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <label className="upload-btn" style={{
                    opacity: loading ? 0.6 : 1,
                    flex: previewImage ? '1' : 'none',
                    minWidth: previewImage ? '120px' : 'auto',
                    maxWidth: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '40px',
                    margin: 0
                  }}>
                    {loading ? '⏳ 업로드 중...' : '📷 사진 업로드'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      disabled={loading}
                    />
                  </label>

                  {/* 캐릭터 변환 버튼 - base64 이미지가 있으면 표시 (originalImageUrl 없어도 가능) */}
                  {previewImage && (
                    <button
                      type="button"
                      onClick={handleConvertClick}
                      disabled={converting}
                      className="upload-btn"
                      style={{
                        flex: '1',
                        minWidth: '160px',
                        maxWidth: '200px',
                        height: '40px',
                        background: '#7dd3fc',
                        color: '#0c4a6e',
                        border: 'none',
                        opacity: converting ? 0.6 : 1,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600'
                      }}
                    >
                      {converting
                        ? '🎨 생성 중...'
                        : `✨ 캐릭터로 변환하기`
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. 반려동물 이름 */}
            <div className="form-group">
              <label>반려동물 이름 *</label>
              <input
                type="text"
                required
                placeholder="예: 초코"
                value={formData.petName}
                onChange={(e) => setFormData({...formData, petName: e.target.value})}
              />
            </div>

            {/* 4. 품종 - 모든 동물에 표시 */}
            <div className="form-group">
              <label>품종</label>
              <select
                value={formData.breed}
                onChange={(e) => setFormData({...formData, breed: e.target.value})}
                className="breed-select"
              >
                <option value="">품종을 선택하세요</option>
                {(BREED_OPTIONS[formData.species] || OTHER_BREEDS).map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>생년월일 *</label>
              <input
                type="date"
                required
                value={formData.birthDate}
                onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>성별 *</label>
              <div className="radio-group">
                <div className={`radio-item ${formData.sex === 'M' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="male"
                    name="sex"
                    value="M"
                    checked={formData.sex === 'M'}
                    onChange={(e) => setFormData({...formData, sex: e.target.value})}
                  />
                  <label htmlFor="male">♂ 수컷</label>
                </div>
                <div className={`radio-item ${formData.sex === 'F' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="female"
                    name="sex"
                    value="F"
                    checked={formData.sex === 'F'}
                    onChange={(e) => setFormData({...formData, sex: e.target.value})}
                  />
                  <label htmlFor="female">♀ 암컷</label>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>중성화 여부 *</label>
              <div className="radio-group">
                <div className={`radio-item ${formData.neutered === true ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="neutered-yes"
                    name="neutered"
                    checked={formData.neutered === true}
                    onChange={() => setFormData({...formData, neutered: true})}
                  />
                  <label htmlFor="neutered-yes">✓ 완료</label>
                </div>
                <div className={`radio-item ${formData.neutered === false ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="neutered-no"
                    name="neutered"
                    checked={formData.neutered === false}
                    onChange={() => setFormData({...formData, neutered: false})}
                  />
                  <label htmlFor="neutered-no">✗ 미완료</label>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>거주 지역 *</label>
              <select
                required
                value={formData.sido}
                onChange={(e) => setFormData({...formData, sido: e.target.value, sigungu: ''})}
              >
                <option value="">시/도 선택</option>
                {Object.keys(regions).map(sido => (
                  <option key={sido} value={sido}>{sido}</option>
                ))}
              </select>
            </div>
            
            {formData.sido && (
              <div className="form-group">
                <select
                  required
                  value={formData.sigungu}
                  onChange={(e) => setFormData({...formData, sigungu: e.target.value})}
                >
                  <option value="">시/군/구 선택</option>
                  {regions[formData.sido]?.map(sigungu => (
                    <option key={sigungu} value={sigungu}>{sigungu}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button type="submit" className="submit-btn">등록 완료</button>
          </form>
        )}
      </div>

      {/* 스타일 선택 모달 */}
      {showStyleModal && (
        <CharacterStyleModal
          onClose={() => setShowStyleModal(false)}
          onStyleSelect={handleStyleSelect}
          originalImageUrl={originalImageUrl}
          petName={formData.petName || '반려동물'}
        />
      )}

      {/* 결과 모달 */}
      {showResultModal && generatedCharacter && characterStyle && (
        <CharacterResultModal
          onClose={() => setShowResultModal(false)}
          characterUrl={generatedCharacter}
          style={characterStyle}
          onSave={handleSaveCharacter}
          onSetAsProfile={handleSetAsProfile}
          saving={false}
        />
      )}
    </div>
  );
}

// Profile List Screen
function ProfileList({ pets, onSelectPet, onAddNew, onNavigate }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center px-4 z-50">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">나의 반려동물</h1>
          <button 
            className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors"
            onClick={onAddNew}
          >
            + 새 등록
          </button>
        </div>
      </div>
      
      <div className="pt-20 p-4 max-w-md mx-auto space-y-4">
        {pets.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
              <img src={PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">등록된 반려동물이 없습니다</h2>
            <p className="text-gray-500 mb-6">새 반려동물을 등록해주세요</p>
            <button 
              className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
              onClick={onAddNew}
            >
              반려동물 등록하기
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {pets.map(pet => (
              <div 
                key={pet.id} 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
                onClick={() => onSelectPet(pet)}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img src={PROFILE_ICON_IMAGES[pet.species] || PROFILE_ICON_IMAGES.other} alt={pet.petName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">{pet.petName}</h3>
                  <p className="text-sm text-gray-500">{pet.breed || '품종 미등록'}</p>
                  <p className="text-xs text-gray-400">{pet.sido} {pet.sigungu}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                  →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Dashboard Screen
function Dashboard({ petData, pets, onNavigate, onSelectPet, onLogout }) {
  const [healthFlags, setHealthFlags] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [triageScore, setTriageScore] = useState(null);
  const [patternFlags, setPatternFlags] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthPoints, setHealthPoints] = useState(100);
  const [todayWeight, setTodayWeight] = useState('');
  const [careSaved, setCareSaved] = useState(false);
  const [careActions, setCareActions] = useState({
    meal: 0,
    water: 0,
    walk: 0,
    treats: 0,
    grooming: 0,
    play: 0
  });
  const [latestBooking, setLatestBooking] = useState(null);
  const [randomMessage, setRandomMessage] = useState(null);

  // 랜덤 유의사항 메시지 로드
  useEffect(() => {
    const loadRandomMessage = async () => {
      if (!petData?.id) return;
      const petName = petData?.petName || petData?.name || '반려동물';

      try {
        // 조건에 따라 랜덤 메시지 가져오기 (getByPetId 오류 방지를 위해 직접 템플릿 조회)
        const result = await commentTemplateService.getRandomTemplate(false, true);

        if (result.success && result.data) {
          // {name} 플레이스홀더를 실제 이름으로 교체
          const messageText = result.data.text.replace(/{name}/g, petName);
          setRandomMessage({
            ...result.data,
            displayText: messageText
          });
        } else {
          // 기본 케어 메시지 설정
          setRandomMessage({
            displayText: `${petName}의 건강한 하루를 위해 충분한 물과 규칙적인 식사를 챙겨주세요! 🐾`
          });
        }
      } catch (error) {
        console.error('랜덤 메시지 로드 오류:', error);
        // 오류 시 기본 케어 메시지 설정
        setRandomMessage({
          displayText: `${petName}의 건강한 하루를 위해 충분한 물과 규칙적인 식사를 챙겨주세요! 🐾`
        });
      }
    };

    loadRandomMessage();
  }, [petData?.id]);

  // 오늘 케어 기록 저장
  const saveTodayCare = () => {
    if (!petData?.id) return;

    const todayKey = new Date().toISOString().split('T')[0];
    const careRecord = {
      date: todayKey,
      petId: petData.id,
      weight: todayWeight ? parseFloat(todayWeight) : null,
      actions: careActions,
      savedAt: new Date().toISOString()
    };

    // localStorage에 저장
    const existingRecords = JSON.parse(localStorage.getItem(`petMedical_careRecords_${petData.id}`) || '[]');
    const todayIndex = existingRecords.findIndex(r => r.date === todayKey);
    if (todayIndex >= 0) {
      existingRecords[todayIndex] = careRecord;
    } else {
      existingRecords.unshift(careRecord);
    }
    // 최근 30일만 보관
    const recentRecords = existingRecords.slice(0, 30);
    localStorage.setItem(`petMedical_careRecords_${petData.id}`, JSON.stringify(recentRecords));

    setCareSaved(true);
    setTimeout(() => setCareSaved(false), 2000);
  };

  // 오늘 케어 기록 불러오기
  useEffect(() => {
    if (!petData?.id) return;

    const todayKey = new Date().toISOString().split('T')[0];
    const existingRecords = JSON.parse(localStorage.getItem(`petMedical_careRecords_${petData.id}`) || '[]');
    const todayRecord = existingRecords.find(r => r.date === todayKey);

    if (todayRecord) {
      if (todayRecord.weight) setTodayWeight(todayRecord.weight.toString());
      if (todayRecord.actions) setCareActions(todayRecord.actions);
    }
  }, [petData?.id]);

  useEffect(() => {
    if (!petData) return;
    
    // localStorage에서 건강 포인트 불러오기
    try {
      const saved = localStorage.getItem(`petMedical_healthPoints_${petData.id}`);
      if (saved) {
        setHealthPoints(parseInt(saved));
      }
    } catch (error) {
      console.error('건강 포인트 불러오기 오류:', error);
    }
  }, [petData]);

  useEffect(() => {
    if (!petData) return;
    
    // 일일 로그 불러오기
    const logs = getDailyLogs(petData.id);
    setDailyLogs(logs);
    
    // 최근 진단서에서 healthFlags와 triageScore 가져오기 (우선순위 1)
    const latestDiagnosis = getLatestDiagnosisRecord(petData.id);
    if (latestDiagnosis) {
      if (latestDiagnosis.healthFlags) {
        // healthFlags 형식 변환
        const convertedFlags = convertHealthFlagsFormat(latestDiagnosis.healthFlags);
        setHealthFlags(convertedFlags);
      }
      // Triage Score 가져오기
      if (latestDiagnosis.triage_score !== undefined) {
        setTriageScore(latestDiagnosis.triage_score);
      }
    }
    
    // 패턴 분석 (최근 7일 데이터가 있으면) - healthFlags가 없을 때만 사용
    if (logs.length >= 3 && !latestDiagnosis?.healthFlags) {
      analyzeHealthPattern(petData, logs)
        .then(result => {
          setPatternAnalysis(result);
          // 패턴 분석 결과는 보조적으로만 사용, 진단 결과가 우선
          if (result.health_flags) {
            const convertedFlags = convertHealthFlagsFormat(result.health_flags);
            setPatternFlags(convertedFlags);
          }
        })
        .catch(err => console.error('패턴 분석 오류:', err));
    }
  }, [petData]);

  // 최신 예약 정보 불러오기
  useEffect(() => {
    const loadLatestBooking = async () => {
      if (!petData?.userId) return;

      try {
        const result = await bookingService.getBookingsByUser(petData.userId);
        const bookingData = result?.data || result || [];
        if (bookingData && bookingData.length > 0) {
          // 미래 예약만 필터링하고 가장 가까운 것 선택
          const now = new Date();
          const futureBookings = bookingData.filter(b => {
            const bookingDate = b.date ? new Date(b.date) : (b.bookingDate ? new Date(b.bookingDate) : null);
            return bookingDate && bookingDate >= now;
          }).sort((a, b) => new Date(a.date || a.bookingDate) - new Date(b.date || b.bookingDate));

          if (futureBookings.length > 0) {
            setLatestBooking(futureBookings[0]);
          } else if (bookingData.length > 0) {
            // 미래 예약이 없으면 가장 최근 예약 표시
            const sortedBookings = [...bookingData].sort((a, b) =>
              new Date(b.date || b.bookingDate) - new Date(a.date || a.bookingDate)
            );
            setLatestBooking(sortedBookings[0]);
          }
        }
      } catch (error) {
        console.error('예약 정보 불러오기 오류:', error);
      }
    };

    loadLatestBooking();
  }, [petData?.userId]);

  const handleLogUpdate = async (newLog) => {
    if (!petData) return;
    
    const logs = getDailyLogs(petData.id);
    const updatedLogs = [...logs, newLog].slice(-7); // 최근 7일만 유지
    
    // 패턴 분석 업데이트
    if (updatedLogs.length >= 3) {
      try {
        const result = await analyzeHealthPattern(petData, updatedLogs);
        setPatternAnalysis(result);
        if (result.health_flags) {
          const convertedFlags = convertHealthFlagsFormat(result.health_flags);
          setHealthFlags(convertedFlags);
        }
      } catch (err) {
        console.error('패턴 분석 오류:', err);
      }
    }
  };

  // 더미 패턴 분석 데이터 생성 (테스트용)
  const generateMockPatternAnalysis = () => {
    return {
      patterns: [
        '최근 3일간 식사량이 평소보다 20% 감소했습니다.',
        '산책 횟수가 주 2회로 감소하여 활동량이 부족합니다.',
        '물 섭취량은 정상 범위를 유지하고 있습니다.',
        '배변 패턴이 불규칙해지고 있습니다.'
      ],
      predictions: [
        '다음 주 식욕 저하가 지속될 가능성이 있습니다.',
        '활동량 증가를 위해 산책 횟수를 늘리는 것을 권장합니다.',
        '소화기 건강을 위해 식이 조절이 필요할 수 있습니다.'
      ],
      health_flags: {
        ear_issue: false,
        digestion_issue: true,
        skin_issue: false,
        fever: false,
        energy_level: 0.5
      }
    };
  };

  const handleAnalyzePattern = async () => {
    if (!petData) return;
    setAnalyzing(true);
    
    try {
      const logs = getDailyLogs(petData.id);
      
      // 테스트 모드: 로그가 3일 미만이어도 더미 데이터로 분석
      if (logs.length < 3) {
        // 2초 대기 (로딩 효과)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 더미 데이터 생성
        const mockResult = generateMockPatternAnalysis();
        const convertedFlags = convertHealthFlagsFormat(mockResult.health_flags);
        
        setPatternAnalysis({
          patterns: mockResult.patterns,
          predictions: mockResult.predictions
        });
        setPatternFlags(convertedFlags);
        setHealthFlags(convertedFlags);
        
        setAnalyzing(false);
        return;
      }
      
      // 실제 데이터가 있을 때는 실제 분석 수행
      const result = await analyzeCarePatternWithGemini(petData, logs);
      if (result && result.health_flags) {
        const convertedFlags = convertHealthFlagsFormat(result.health_flags);
        setPatternFlags(convertedFlags);
        setHealthFlags(convertedFlags);
        
        // 패턴 분석 결과도 설정
        if (result.patterns || result.predictions) {
          setPatternAnalysis({
            patterns: result.patterns || [],
            predictions: result.predictions || []
          });
        }
      }
    } catch (err) {
      console.error('패턴 분석 오류:', err);
      // 에러 발생 시에도 더미 데이터로 표시 (테스트용)
      const mockResult = generateMockPatternAnalysis();
      const convertedFlags = convertHealthFlagsFormat(mockResult.health_flags);
      setPatternAnalysis({
        patterns: mockResult.patterns,
        predictions: mockResult.predictions
      });
      setPatternFlags(convertedFlags);
    } finally {
      setAnalyzing(false);
    }
  };

  // healthFlags와 patternFlags 병합 (진단 결과 우선)
  // Triage Score가 있으면 energyLevel 조정
  const baseFlags = healthFlags || patternFlags || {
    earIssue: false,
    digestionIssue: false,
    skinIssue: false,
    fever: false,
    energyLevel: 0.7
  };

  // Triage Score를 energyLevel에 반영 (점수가 높을수록 energyLevel 낮음)
  let mergedFlags = { ...baseFlags };
  if (triageScore !== null && triageScore !== undefined) {
    // Triage Score 0-5를 energyLevel 1-0으로 매핑
    const adjustedEnergy = Math.max(0, Math.min(1, 1 - (triageScore / 5) * 0.5));
    mergedFlags.energyLevel = adjustedEnergy;
  }

  // 건강 포인트를 energyLevel에 반영 (포인트가 높을수록 energyLevel 높음)
  if (healthPoints !== null && healthPoints !== undefined) {
    const pointsEnergy = healthPoints / 100;
    // 기존 energyLevel과 건강 포인트를 평균 (케어 행동의 효과 반영)
    mergedFlags.energyLevel = (mergedFlags.energyLevel + pointsEnergy) / 2;
  }

  // 현재 반려동물의 메인 캐릭터 이미지 가져오기
  const getMainCharacterImagePath = () => {
    if (!petData) {
      return getMainCharacterImage('dog');
    }

    // 동물 종류에 따라 기본 이미지 반환 (기본값)
    const species = petData.species || 'dog';
    const defaultImage = getMainCharacterImage(species);

    // 관리자가 별도로 입력한 프로필 이미지가 있을 경우에만 해당 이미지 사용
    // 빈 문자열, null, undefined는 무시하고 기본 캐릭터 이미지 사용
    if (petData.profileImage &&
        typeof petData.profileImage === 'string' &&
        petData.profileImage.trim() !== '' &&
        (petData.profileImage.startsWith('http') || petData.profileImage.startsWith('data:'))) {
      return petData.profileImage;
    }

    return defaultImage;
  };

  // 동물 분류 표시 (강아지/고양이는 품종, 나머지는 대분류)
  const getSpeciesDisplay = () => {
    if (!petData) return '';
    if (petData.species === 'dog' || petData.species === 'cat') {
      return petData.breed || (petData.species === 'dog' ? '강아지' : '고양이');
    }
    const speciesOption = SPECIES_OPTIONS.find(s => s.id === petData.species);
    return speciesOption?.label || '기타';
  };

  // 성별 표시
  const getSexDisplay = () => {
    if (!petData?.sex) return null;
    return petData.sex === 'M' ? '♂' : '♀';
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* PC 레이아웃 (임시 비활성화) */}
      <div className="hidden">
        {/* 좌측: 모바일 화면 미리보기 */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="relative w-[430px] h-[932px] rounded-[3rem] shadow-2xl border-8 border-gray-800 overflow-hidden bg-white">
            {/* 모바일 컨텐츠 */}
            <div className="h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-sky-50 to-white pb-20">
              {/* Header */}
              <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-4 shadow-lg">
                <div className="flex items-center justify-center gap-2 relative">
                  <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
                    <img src={PROFILE_ICON_IMAGES[petData?.species] || PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold tracking-tight">PetMedical.AI</h1>
                    <p className="text-sky-100 text-xs font-medium">AI 기반 반려동물 건강 관리 서비스</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('로그아웃 하시겠습니까?')) {
                        onLogout && onLogout();
                      }
                    }}
                    className="absolute right-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="로그아웃"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </header>

              <div className="px-4 pt-4 pb-4">
                {/* 반려동물 등록 카드 */}
                {!petData ? (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">반려동물을 등록해주세요</h3>
                    <p className="text-sm text-slate-500 mb-4">사용자님만의 반려동물 정보를 등록하면 맞춤형 건강을 시작하세요</p>
                    <button
                      onClick={() => onNavigate('profile-registration')}
                      className="w-full py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      반려동물 등록하기
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Pet Profile Banner */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 relative overflow-hidden mb-4">
                      {/* 배경 장식 제거 - 깔끔한 흰색 배경 */}

                      <div className="relative flex items-stretch gap-3">
                        <div className="flex-shrink-0 w-28 h-36 rounded-2xl overflow-hidden">
                          <img
                            src={getMainCharacterImagePath()}
                            alt="Pet Character"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // 무한 루프 방지: 이미 한 번 시도했으면 더 이상 시도하지 않음
                              if (e.target.dataset.retryAttempted === 'true') {
                                console.warn('이미지 로드 최종 실패, 기본 이미지 사용 중단');
                                e.target.style.display = 'none';
                                return;
                              }
                              
                              console.error('이미지 로드 실패:', e.target.src);
                              e.target.dataset.retryAttempted = 'true';
                              
                              // 동물 종류에 따라 기본 이미지 설정
                              const species = petData?.species || 'dog';
                              const fallbackImage = getMainCharacterImage(species);
                              
                              // 다른 이미지로 시도
                              if (e.target.src !== fallbackImage) {
                                e.target.src = fallbackImage;
                              } else {
                                // 이미 fallback 이미지인데도 실패하면 숨김
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-2">
                          <div className="flex flex-col items-center justify-center text-center w-full">
                            <span className="inline-block bg-sky-400 text-white text-sm font-bold px-4 py-1.5 rounded-lg shadow-md mb-2">
                              AI 전문 의료진 24시간 대기
                            </span>
                            <p className="text-xl font-display font-bold text-gray-900 mt-1.5 w-full">{petData?.petName || petData?.name || '반려동물'} 지켜줄게요 ❤️</p>
                            <p className="text-lg font-semibold text-sky-600 mt-2.5 w-full">
                              오늘도 든든한 케어 시작!
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                            <span className="text-[11px] text-sky-700 font-semibold bg-sky-100 px-2.5 py-1 rounded-full border border-sky-200">
                              {getSpeciesDisplay()}
                            </span>
                            {getSexDisplay() && (
                              <span className="text-[11px] text-sky-700 font-semibold bg-sky-100 px-2.5 py-1 rounded-full border border-sky-200">
                                {getSexDisplay()}
                              </span>
                            )}
                            <span className="text-[11px] text-sky-700 font-semibold bg-sky-100 px-2.5 py-1 rounded-full border border-sky-200">
                              {calculateAge(petData.birthDate)}
                            </span>
                            <button
                              onClick={() => onNavigate('profile-list')}
                              className="text-[11px] text-amber-800 font-semibold bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 hover:bg-amber-200 transition-colors"
                            >
                              동물변경
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('symptom-input')}
                        className="w-full mt-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-sm py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        PetMedical.AI 종합의료센터 바로 방문 &gt;
                      </button>
                    </div>

                    {/* AI 건강 문진 카드 */}
                    <div className="bg-amber-50 rounded-2xl p-3 shadow-lg border-2 border-amber-200 relative overflow-hidden mb-4">
                      <div className="relative flex items-center justify-center gap-2 mb-2">
                        <span className="text-2xl">🤖</span>
                        <h3 className="text-gray-900 font-display font-bold text-base">AI 건강 문진</h3>
                      </div>
                      <button
                        onClick={() => onNavigate('ai-consultation')}
                        className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-bold text-sm py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        7일 케어기록으로 AI 문진하기 &gt;
                      </button>
                    </div>

                    {/* 케어 주요 알림 섹션 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔔</span>
                          <h3 className="text-base font-bold text-gray-800">{petData?.petName || petData?.name || '반려동물'} 케어 주요알림</h3>
                        </div>
                        <button
                          onClick={() => onNavigate('records')}
                          className="text-xs text-sky-600 font-semibold"
                        >
                          전체보기 &gt;
                        </button>
                      </div>

                      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                        {/* 병원 예약일 - 페이지 랜딩 기능 제거 */}
                        <div className="w-full flex items-center gap-3 py-3 border-b border-gray-100">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">📅</span>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-bold text-gray-800 mb-0.5">병원 예약일</h4>
                            {latestBooking ? (
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <p className="font-medium text-gray-700">{latestBooking.clinicName || latestBooking.hospitalName || '병원'}</p>
                                <p>{new Date(latestBooking.bookingDate || latestBooking.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} {latestBooking.bookingTime || latestBooking.time || ''}</p>
                                {(latestBooking.symptomText || latestBooking.aiDiagnosis || latestBooking.diagnosis) && (
                                  <p className="text-blue-600">
                                    {latestBooking.symptomText || latestBooking.aiDiagnosis ||
                                      (typeof latestBooking.diagnosis === 'string' ? latestBooking.diagnosis : latestBooking.diagnosis?.name || '')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">예약된 진료가 없습니다</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 py-3 bg-yellow-50 rounded-xl px-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">💡</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-yellow-800 mb-0.5">오늘의 케어 팁</h4>
                            <p className="text-xs text-yellow-700">
                              {randomMessage?.displayText || '오늘도 함께 건강한 하루 보내세요!'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 오늘의 기록 */}
                    <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">오늘의 기록</h3>
                        <span className="text-xs text-gray-400">{new Date().toISOString().split('T')[0]}</span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {[
                          { icon: '🍚', label: '식사', key: 'meal' },
                          { icon: '💧', label: '물', key: 'water' },
                          { icon: '🩴', label: '산책', key: 'walk' },
                          { icon: '🍖', label: '간식', key: 'treats' },
                          { icon: '🗑️', label: '배변', key: 'grooming' }
                        ].map(item => (
                          <div key={item.key} className="flex flex-col items-center">
                            <div className="relative">
                              <button
                                className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                                onClick={() => {
                                  setCareActions(prev => ({ ...prev, [item.key]: prev[item.key] + 1 }));
                                  setHealthPoints(prev => {
                                    const newPoints = Math.min(100, prev + 5);
                                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                                    return newPoints;
                                  });
                                }}
                              >
                                <span className="text-xl">{item.icon}</span>
                              </button>
                              {careActions[item.key] > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                                  {careActions[item.key]}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 확장된 컨텐츠 뷰 */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* PC용 헤더 */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                {petData ? `${petData?.petName || petData?.name || '반려동물'}의 건강 대시보드` : '반려동물을 등록해주세요'}
              </h2>
              <p className="text-gray-500 mt-2 text-lg">AI가 24시간 함께하는 스마트 건강관리</p>
            </div>

            {/* 컨텐츠 영역 */}
            <div className="space-y-6">
              {!petData ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                      <img src={PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">반려동물을 등록해주세요</h3>
                    <p className="text-gray-500 mb-6">맞춤형 AI 건강관리 서비스를 시작하세요</p>
                    <button
                      onClick={() => onNavigate('profile-registration')}
                      className="px-8 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      반려동물 등록하기
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 빠른 액션 카드 */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => onNavigate('symptom-input')}
                      className="bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
                    >
                      <span className="text-3xl mb-3 block">🏥</span>
                      <h3 className="text-lg font-bold">AI 종합진료센터</h3>
                      <p className="text-sky-100 text-sm mt-1">증상을 입력하고 AI 진단받기</p>
                    </button>
                    <button
                      onClick={() => onNavigate('ai-consultation')}
                      className="bg-gradient-to-br from-amber-400 to-yellow-500 text-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
                    >
                      <span className="text-3xl mb-3 block">🤖</span>
                      <h3 className="text-lg font-bold">AI 건강 문진</h3>
                      <p className="text-amber-800 text-sm mt-1">7일 케어기록 기반 분석</p>
                    </button>
                  </div>

                  {/* 케어 주요알림 + 오늘의 기록 */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* 케어 주요알림 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <span>🔔</span> 케어 주요알림
                        </h3>
                        <button onClick={() => onNavigate('records')} className="text-sm text-sky-600 font-medium">
                          전체보기 &gt;
                        </button>
                      </div>
                      <div className="space-y-3">
                        {/* 병원 예약일 - 페이지 랜딩 기능 제거 */}
                        <div className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-left">
                          <span className="text-2xl">📅</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">병원 예약일</p>
                            {latestBooking ? (
                              <div className="text-sm text-gray-500 space-y-0.5">
                                <p className="font-medium text-gray-700">{latestBooking.clinicName || latestBooking.hospitalName || '병원'}</p>
                                <p>{new Date(latestBooking.bookingDate || latestBooking.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} {latestBooking.bookingTime || latestBooking.time || ''}</p>
                                {(latestBooking.symptomText || latestBooking.aiDiagnosis || latestBooking.diagnosis) && (
                                  <p className="text-blue-600">
                                    {latestBooking.symptomText || latestBooking.aiDiagnosis ||
                                      (typeof latestBooking.diagnosis === 'string' ? latestBooking.diagnosis : latestBooking.diagnosis?.name || '')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">예약된 진료가 없습니다</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">💡</span>
                          </div>
                          <div>
                            <p className="font-medium text-yellow-800">오늘의 케어 팁</p>
                            <p className="text-sm text-yellow-700">
                              {randomMessage?.displayText || '오늘도 함께 건강한 하루 보내세요!'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 오늘의 기록 */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">오늘의 기록</h3>
                        <span className="text-sm text-gray-400">{new Date().toISOString().split('T')[0]}</span>
                      </div>

                      <div className="grid grid-cols-5 gap-3 mb-4">
                        {[
                          { icon: '🍚', label: '식사', key: 'meal', bg: 'bg-gray-50', points: 5 },
                          { icon: '💧', label: '물', key: 'water', bg: 'bg-sky-50', points: 3 },
                          { icon: '🩴', label: '산책', key: 'walk', bg: 'bg-yellow-50', points: 10 },
                          { icon: '🍖', label: '간식', key: 'treats', bg: 'bg-orange-50', points: 2 },
                          { icon: '🗑️', label: '배변', key: 'grooming', bg: 'bg-amber-50', points: 7 }
                        ].map(item => (
                          <div key={item.key} className="flex flex-col items-center">
                            <button
                              className={`w-12 h-12 ${item.bg} rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm relative`}
                              onClick={() => {
                                setCareActions(prev => ({ ...prev, [item.key]: prev[item.key] + 1 }));
                                setHealthPoints(prev => {
                                  const newPoints = Math.min(100, prev + item.points);
                                  if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                                  return newPoints;
                                });
                              }}
                            >
                              <span className="text-xl">{item.icon}</span>
                              {careActions[item.key] > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                  {careActions[item.key]}
                                </span>
                              )}
                            </button>
                            <span className="text-xs text-gray-500 mt-1">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">오늘 몸무게 (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="5.2"
                            value={todayWeight}
                            onChange={(e) => setTodayWeight(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-sky-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={saveTodayCare}
                          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                            careSaved
                              ? 'bg-green-500 text-white'
                              : 'bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:shadow-lg'
                          }`}
                        >
                          {careSaved ? '저장 완료!' : `오늘 ${petData?.petName || petData?.name || '반려동물'} 케어 완료`}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 태블릿/모바일 레이아웃 (lg 미만) */}
      <div className="lg:hidden md:flex md:items-center md:justify-center md:p-8 md:min-h-screen">
        {/* 모바일 프레임 (태블릿에서만 보임) */}
        <div className="hidden md:block fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-sky-100 to-blue-200"></div>
        </div>

        <div className="relative md:w-[430px] md:h-[932px] md:rounded-[3rem] md:shadow-2xl md:border-8 md:border-gray-800 overflow-hidden">
          {/* 노치 (태블릿에서만) */}
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-2xl z-50"></div>

          <div className="h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-sky-50 to-white pb-20">
      {/* Header - 회사명 가운데 정렬 */}
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
            <img src={PROFILE_ICON_IMAGES[petData?.species] || PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">PetMedical.AI</h1>
            <p className="text-sky-100 text-xs font-medium">AI 기반 반려동물 건강 관리 서비스</p>
          </div>
          <button
            onClick={() => {
              if (confirm('로그아웃 하시겠습니까?')) {
                onLogout && onLogout();
              }
            }}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="로그아웃"
          >
            <span className="material-symbols-outlined text-white text-2xl">logout</span>
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 pb-4">
        {/* 반려동물 등록 카드 */}
        {!petData ? (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">반려동물을 등록해주세요</h3>
            <p className="text-sm text-slate-500 mb-4">사용자님만의 반려동물 정보를 등록하면 맞춤형 건강을 시작하세요</p>
            <button
              onClick={() => onNavigate('profile-registration')}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              반려동물 등록하기
            </button>
          </div>
        ) : (
          <>
            {/* Pet Profile Banner - 캐릭터 이미지 포함 */}
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 relative overflow-hidden mb-4">
              {/* 배경 장식 제거 - 깔끔한 흰색 배경 */}

              <div className="relative flex items-stretch gap-3">
                {/* 캐릭터 이미지 - 세로로 길게, 가로 좁게, 여백없이 */}
                <div className="flex-shrink-0 w-28 h-36 rounded-2xl overflow-hidden">
                  <img
                    src={getMainCharacterImagePath()}
                    alt="Pet Character"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 무한 루프 방지: 이미 한 번 시도했으면 더 이상 시도하지 않음
                      if (e.target.dataset.retryAttempted === 'true') {
                        console.warn('이미지 로드 최종 실패, 기본 이미지 사용 중단');
                        e.target.style.display = 'none';
                        return;
                      }
                      
                      console.error('이미지 로드 실패:', e.target.src);
                      e.target.dataset.retryAttempted = 'true';
                      
                      // 동물 종류에 따라 기본 이미지 설정
                      const species = petData?.species || 'dog';
                      const fallbackImage = getMainCharacterImage(species);
                      
                      // 다른 이미지로 시도
                      if (e.target.src !== fallbackImage) {
                        e.target.src = fallbackImage;
                      } else {
                        // 이미 fallback 이미지인데도 실패하면 숨김
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between py-2 min-w-0">
                  <div className="flex flex-col items-center justify-center text-center w-full">
                    <span className="inline-block bg-sky-400 text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full shadow-md mb-2">
                      AI 전문 의료진 24시간 대기
                    </span>
                    <p className="text-base sm:text-lg font-display font-bold text-gray-900 mt-1.5 w-full leading-tight truncate">{petData?.petName || petData?.name || '반려동물'} 지켜줄게요 ❤️</p>
                    <p className="text-sm sm:text-base font-semibold text-sky-600 mt-2.5 w-full">
                      오늘도 든든한 케어 시작!
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap mt-2 justify-center">
                    <span className="text-[10px] sm:text-[11px] text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      {getSpeciesDisplay()}
                    </span>
                    {getSexDisplay() && (
                      <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        petData?.sex === 'F'
                          ? 'text-red-600 bg-red-100 border-red-200'
                          : 'text-sky-700 bg-sky-100 border-sky-200'
                      }`}>
                        {getSexDisplay()}
                      </span>
                    )}
                    <span className="text-[10px] sm:text-[11px] text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      {calculateAge(petData.birthDate)}
                    </span>
                    <button
                      onClick={() => onNavigate('profile-list')}
                      className="text-[10px] sm:text-[11px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 hover:bg-amber-200 transition-colors"
                    >
                      동물변경
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('symptom-input')}
                className="w-full mt-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                PetMedical.AI 종합의료센터 바로 방문 &gt;
              </button>
            </div>

            {/* AI 건강 문진 카드 - 컴팩트 레이아웃 */}
            <div className="bg-amber-50 rounded-2xl p-3 shadow-lg border-2 border-amber-200 relative overflow-hidden mb-4">
              <div className="relative flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <h3 className="text-gray-800 font-bold text-base">AI 건강 문진</h3>
              </div>
              <button
                onClick={() => onNavigate('ai-consultation')}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-bold text-sm py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                7일 케어기록으로 AI 문진하기 &gt;
              </button>
            </div>

            {/* 케어 주요 알림 섹션 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔔</span>
                  <h3 className="text-base font-bold text-gray-800">{petData?.petName || petData?.name || '반려동물'} 케어 주요알림</h3>
                </div>
                <button
                  onClick={() => onNavigate('records')}
                  className="text-xs text-sky-600 font-semibold"
                >
                  전체보기 &gt;
                </button>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
                {/* 병원 예약일 - 페이지 랜딩 기능 제거 */}
                <div className="w-full flex items-center gap-3 py-3 border-b border-gray-100">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-sm font-bold text-gray-800 mb-0.5">병원 예약일</h4>
                    {latestBooking ? (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p className="font-medium text-gray-700">{latestBooking.clinicName || latestBooking.hospitalName || '병원'}</p>
                        <p>{new Date(latestBooking.bookingDate || latestBooking.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} {latestBooking.bookingTime || latestBooking.time || ''}</p>
                        {(latestBooking.symptomText || latestBooking.aiDiagnosis || latestBooking.diagnosis) && (
                          <p className="text-blue-600">
                            {latestBooking.symptomText || latestBooking.aiDiagnosis ||
                              (typeof latestBooking.diagnosis === 'string' ? latestBooking.diagnosis : latestBooking.diagnosis?.name || '')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">예약된 진료가 없습니다</p>
                    )}
                  </div>
                </div>

                {/* 오늘의 케어 팁 */}
                <div className="flex items-center gap-3 py-3 bg-yellow-50 rounded-xl px-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💡</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-yellow-800 mb-0.5">오늘의 케어 팁</h4>
                    <p className="text-xs text-yellow-700">
                      {randomMessage?.displayText || '오늘도 함께 건강한 하루 보내세요!'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 오늘의 기록 - 원형 아이콘 */}
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">오늘의 기록</h3>
                <span className="text-xs text-gray-400">{new Date().toISOString().split('T')[0]}</span>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                      onClick={() => {
                        setCareActions(prev => ({ ...prev, meal: prev.meal + 1 }));
                        setHealthPoints(prev => {
                          const newPoints = Math.min(100, prev + 5);
                          if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                          return newPoints;
                        });
                      }}
                    >
                      <span className="text-xl">🍚</span>
                    </button>
                    {careActions.meal > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                        {careActions.meal}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">식사</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                      onClick={() => {
                        setCareActions(prev => ({ ...prev, water: prev.water + 1 }));
                        setHealthPoints(prev => {
                          const newPoints = Math.min(100, prev + 3);
                          if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                          return newPoints;
                        });
                      }}
                    >
                      <span className="text-xl">💧</span>
                    </button>
                    {careActions.water > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                        {careActions.water}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">물</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                      onClick={() => {
                        setCareActions(prev => ({ ...prev, walk: prev.walk + 1 }));
                        setHealthPoints(prev => {
                          const newPoints = Math.min(100, prev + 10);
                          if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                          return newPoints;
                        });
                      }}
                    >
                      <span className="text-xl">🩴</span>
                    </button>
                    {careActions.walk > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                        {careActions.walk}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">산책</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                      onClick={() => {
                        setCareActions(prev => ({ ...prev, treats: prev.treats + 1 }));
                        setHealthPoints(prev => {
                          const newPoints = Math.min(100, prev + 2);
                          if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                          return newPoints;
                        });
                      }}
                    >
                      <span className="text-xl">🍖</span>
                    </button>
                    {careActions.treats > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                        {careActions.treats}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">간식</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative">
                    <button
                      className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                      onClick={() => {
                        setCareActions(prev => ({ ...prev, grooming: prev.grooming + 1 }));
                        setHealthPoints(prev => {
                          const newPoints = Math.min(100, prev + 7);
                          if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                          return newPoints;
                        });
                      }}
                    >
                      <span className="text-xl">🗑️</span>
                    </button>
                    {careActions.grooming > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                        {careActions.grooming}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 mt-1">배변</span>
                </div>
              </div>

              {/* 체중 입력 */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">오늘 몸무게 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="5.2"
                  value={todayWeight}
                  onChange={(e) => setTodayWeight(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-sky-400 focus:outline-none text-sm"
                />
              </div>

              {/* 한줄 메모 - 추가 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">한줄 메모</label>
                <input
                  type="text"
                  placeholder="오늘의 특이사항을 기록하세요"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-sky-400 focus:outline-none text-sm"
                />
              </div>

              <button
                onClick={saveTodayCare}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  careSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:shadow-lg'
                }`}
              >
                {careSaved ? '저장 완료!' : `오늘 ${petData?.petName || petData?.name || '반려동물'} 케어 완료`}
              </button>
            </div>
          </>
        )}
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Symptom Input Screen
function SymptomInput({ petData, onComplete, onBack, onRegister }) {
  const [symptomText, setSymptomText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  // 진료과목 정보 (아이콘, 설명 포함)
  const DEPARTMENT_INFO = {
    '정형외과': { icon: '🦴', desc: '뼈, 관절, 근육 문제' },
    '피부과': { icon: '🐾', desc: '피부, 털, 알레르기' },
    '소화기과': { icon: '🐟', desc: '소화, 위장 문제' },
    '호흡기과': { icon: '🫁', desc: '기침, 호흡 문제' },
    '감염내과': { icon: '💉', desc: '감염, 바이러스' },
    '내과': { icon: '💊', desc: '전반적 건강 문제' },
    '외과': { icon: '🩹', desc: '상처, 수술 필요' },
    '안과': { icon: '👁️', desc: '눈, 시력 문제' },
    '치과': { icon: '🦷', desc: '치아, 잇몸 문제' },
    '비뇨기과': { icon: '💧', desc: '배뇨, 신장 문제' },
    '신경과': { icon: '🧠', desc: '발작, 마비, 행동이상' },
    '종양과': { icon: '🔬', desc: '혹, 종양, 암' },
    '조류 전문': { icon: '🐦', desc: '새 전문 진료' },
    '특수동물과': { icon: '🦔', desc: '특수동물 전문' },
    '파충류 전문': { icon: '🦎', desc: '파충류 전문 진료' }
  };

  // 동물별 진료과목
  const DEPARTMENTS = {
    dog: ['정형외과', '피부과', '소화기과', '호흡기과', '감염내과', '안과', '치과', '비뇨기과', '신경과', '종양과'],
    cat: ['내과', '외과', '피부과', '안과', '치과', '정형외과', '비뇨기과', '신경과', '종양과'],
    rabbit: ['내과', '피부과', '치과', '안과', '소화기과'],
    hamster: ['내과', '피부과', '치과', '종양과'],
    bird: ['조류 전문', '내과', '피부과', '호흡기과'],
    hedgehog: ['특수동물과', '피부과', '내과', '감염내과'],
    reptile: ['파충류 전문', '피부과', '내과', '호흡기과'],
    other: ['특수동물과', '내과', '외과', '피부과']
  };

  // 동물별/진료과별 대표 증상
  const SYMPTOMS_BY_DEPT = {
    dog: {
      '내과': ['식욕 감소', '구토', '설사', '무기력', '체중 감소'],
      '외과': ['절뚝거림', '통증(만지면 싫어함)', '상처/출혈', '행동 변화', '움직임 감소'],
      '피부과': ['가려움증', '피부 발적', '털 빠짐', '비듬/각질', '피부 악취'],
      '안과': ['눈 충혈', '눈곱 증가', '눈물 과다', '눈 찡그림', '시력 저하 의심'],
      '치과': ['입 냄새', '딱딱한 음식 거부', '침 흘림', '잇몸 붉어짐', '입 주변 만지면 싫어함'],
      '정형외과': ['절뚝거림', '관절 뻣뻣함', '뛰기/계단 거부', '뒷다리 약화', '갑자기 앉아버림'],
      '비뇨기과': ['소변 자주 봄', '소변 줄기 약함', '배뇨 시 통증', '소변에 피', '화장실 자주 감'],
      '신경과': ['뒤뚱거림', '발을 끌고 걷기', '경련/발작', '방향 감각 상실', '과도한 무기력'],
      '종양과': ['만져지는 혹', '체중 감소', '식욕 감소', '피곤/무기력', '혈변'],
      '소화기과': ['구토', '설사', '복부 팽만', '식욕 감소', '변비'],
      '호흡기과': ['기침', '호흡 곤란', '코 분비물', '재채기', '숨소리 이상'],
      '감염내과': ['발열', '무기력', '식욕 감소', '구토/설사', '림프절 부종']
    },
    cat: {
      '내과': ['식욕 감소', '구토', '설사', '체중 감소', '탈수'],
      '외과': ['절뚝거림', '점프 회피', '만지면 아파함', '상처/출혈', '활동량 급감'],
      '피부과': ['가려움증', '털 빠짐', '비듬', '피부 발적', '과도한 그루밍'],
      '안과': ['눈물/눈곱', '눈 충혈', '눈 부어보임', '눈 찡그림', '빛에 민감'],
      '치과': ['침 흘림', '턱 만지면 싫어함', '입 냄새', '딱딱한 사료 거부', '한쪽으로 씹기'],
      '정형외과': ['절뚝거림', '점프 감소', '뒷다리 약화', '계속 누워있음', '움직임 둔화'],
      '비뇨기과': ['화장실 자주 감', '소변 잘 안 나옴', '소변할 때 울음', '소변에 피', '배 만지면 싫어함'],
      '신경과': ['뒤뚱거리며 걸음', '균형 잃음', '비틀거림', '발작/경련', '숨고 이상행동'],
      '종양과': ['만져지는 혹', '체중 감소', '식욕 감소', '핏빛 변/소변', '무기력']
    },
    rabbit: {
      '내과': ['식욕 감소', '무기력', '체중 감소', '배변 감소', '코 분비물'],
      '피부과': ['털 빠짐', '피부 각질', '귀 가려움', '발바닥 염증', '진드기'],
      '치과': ['식욕 감소', '침 흘림', '턱 부종', '이갈이', '음식 흘림'],
      '안과': ['눈물 과다', '눈곱', '눈 충혈', '눈꺼풀 부종', '눈 찡그림'],
      '소화기과': ['설사', '변비', '복부 팽만', '식욕 감소', '이상한 변']
    },
    hamster: {
      '내과': ['식욕 감소', '무기력', '체중 감소', '털 푸석', '숨기만 함'],
      '피부과': ['털 빠짐', '피부 발적', '가려움', '딱지', '진드기'],
      '치과': ['식욕 감소', '침 흘림', '이빨 과다성장', '입 주변 젖음', '음식 못 먹음'],
      '종양과': ['만져지는 혹', '복부 팽만', '체중 감소', '무기력', '출혈']
    },
    bird: {
      '조류 전문': ['깃털 빠짐', '식욕 감소', '무기력', '호흡 이상', '배변 이상'],
      '내과': ['식욕 감소', '구토', '설사', '체중 감소', '무기력'],
      '피부과': ['깃털 뽑기', '깃털 이상', '피부 발적', '발 이상', '부리 이상'],
      '호흡기과': ['호흡 곤란', '입 벌리고 숨쉼', '코 분비물', '재채기', '소리 변화']
    },
    hedgehog: {
      '특수동물과': ['식욕 감소', '무기력', '가시 빠짐', '피부 문제', '배변 이상'],
      '피부과': ['가시 빠짐', '피부 각질', '진드기', '곰팡이', '피부 발적'],
      '내과': ['식욕 감소', '체중 감소', '무기력', '설사', '구토'],
      '감염내과': ['발열', '무기력', '식욕 감소', '콧물', '눈곱']
    },
    reptile: {
      '파충류 전문': ['식욕 감소', '탈피 문제', '무기력', '호흡 이상', '배변 이상'],
      '피부과': ['탈피 불완전', '피부 변색', '종기', '진드기', '곰팡이'],
      '내과': ['식욕 감소', '체중 감소', '무기력', '구토', '설사'],
      '호흡기과': ['입 벌리고 숨쉼', '콧물', '거품', '호흡음 이상', '무기력']
    },
    other: {
      '특수동물과': ['식욕 감소', '무기력', '배변 이상', '피부 문제', '호흡 이상'],
      '내과': ['식욕 감소', '구토', '설사', '무기력', '체중 감소'],
      '외과': ['상처', '출혈', '부종', '통증', '움직임 이상'],
      '피부과': ['털/피부 이상', '가려움', '발적', '탈모', '각질']
    }
  };

  // 반려동물 등록 확인
  if (!petData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center max-w-sm">
          <div className="w-20 h-20 bg-sky-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">🐾</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">반려동물을 등록해주세요</h2>
          <p className="text-sm text-slate-500 mb-6">
            사랑하는 반려동물 정보를 입력해주시면<br/>
            맞춤형 AI 진단 서비스를 이용할 수 있어요
          </p>
          <button
            onClick={() => onRegister ? onRegister() : onBack()}
            className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
          >
            반려동물 등록하기
          </button>
          <button
            onClick={onBack}
            className="w-full mt-3 py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentDepartments = DEPARTMENTS[petData.species] || DEPARTMENTS.other;
  const animalSymptoms = SYMPTOMS_BY_DEPT[petData.species] || SYMPTOMS_BY_DEPT.other;
  const currentSymptoms = selectedDepartment ? (animalSymptoms[selectedDepartment] || []) : [];

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(previews => {
      setImages(prev => [...prev, ...previews]);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedDepartment) {
      alert('진료과목을 선택해주세요.');
      return;
    }
    if (selectedSymptoms.length === 0 && !symptomText.trim() && images.length === 0) {
      alert('증상을 선택하거나 설명해주세요.');
      return;
    }

    setLoading(true);

    // 선택된 증상과 텍스트 증상 합치기
    const allSymptoms = [...selectedSymptoms];
    if (symptomText.trim()) {
      allSymptoms.push(symptomText.trim());
    }
    const combinedSymptomText = allSymptoms.join(', ');
    
    // 증상 데이터를 진료 화면으로 전달
    setTimeout(() => {
      onComplete({
        symptomText: combinedSymptomText,
        selectedSymptoms,
        userDescription: symptomText,
        department: selectedDepartment,
        images,
        petData
      });
    }, 500);
  };

  // 증상 토글 핸들러
  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  // 진료과목 선택 핸들러
  const handleDepartmentSelect = (dept) => {
    if (selectedDepartment === dept) {
      setSelectedDepartment('');
    } else {
      setSelectedDepartment(dept);
      setSelectedSymptoms([]); // 과목 바꾸면 증상 초기화
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-3 sm:px-4 py-3 sm:py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <button onClick={onBack} className="text-slate-600">
            <span className="text-xs sm:text-sm">← 돌아가기</span>
          </button>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">AI 증상 진단</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">{petData.petName || petData.name || '반려동물'}의 증상을 알려주세요</p>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">
        {/* 진료과목 선택 */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-0.5 sm:mb-1 text-xs sm:text-sm">어디가 불편해 보이나요? *</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3">진료과목을 선택해주세요</p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {currentDepartments.map(dept => {
              const info = DEPARTMENT_INFO[dept] || { icon: '🏥', desc: '일반 진료' };
              const isSelected = selectedDepartment === dept;
              return (
                <button
                  key={dept}
                  onClick={() => handleDepartmentSelect(dept)}
                  className={`p-2 sm:p-3 rounded-xl text-left transition-all border-2 ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className="text-base sm:text-lg">{info.icon}</span>
                    <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-sky-700' : 'text-slate-800'}`}>
                      {dept}
                    </span>
          </div>
                  <p className={`text-[10px] sm:text-xs ${isSelected ? 'text-sky-600' : 'text-slate-500'} leading-tight`}>
                    {info.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 증상 선택 - 진료과목 선택 후 표시 */}
        {selectedDepartment && currentSymptoms.length > 0 && (
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-0.5 sm:mb-1 text-xs sm:text-sm">
              {selectedDepartment} 관련 증상
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3">해당하는 증상을 모두 선택해주세요</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {currentSymptoms.map(symptom => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border ${
                    selectedSymptoms.includes(symptom)
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
            {selectedSymptoms.length > 0 && (
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-sky-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-sky-700 font-medium leading-relaxed">
                  ✓ 선택됨: {selectedSymptoms.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 증상 상세 설명 */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-0.5 sm:mb-1 text-xs sm:text-sm">증상 상세 설명</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3">추가로 설명하고 싶은 내용이 있다면 적어주세요</p>
          <textarea
            className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 min-h-[70px] sm:min-h-[80px] text-xs sm:text-sm resize-none"
            placeholder="예: 3일 전부터 밥을 잘 안 먹고, 자꾸 구석에 숨어요..."
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
          />
        </div>

        {/* 사진 업로드 */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-2 sm:mb-3 text-xs sm:text-sm">증상 사진 첨부 (선택)</h3>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative shrink-0">
                <img src={img} alt={`증상 사진 ${idx + 1}`} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full text-[10px] sm:text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition-all">
              <span className="text-xl sm:text-2xl text-slate-400">📷</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">추가</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
              </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2">피부, 눈, 귀 등 증상 부위 사진을 첨부하면 더 정확한 진단이 가능해요</p>
        </div>
        </div>

      {/* Bottom Button - 내비게이션바 위에 배치 */}
      <div className="fixed bottom-16 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-[430px] bg-white/95 backdrop-blur-sm border-t border-slate-100 p-4 z-40">
        <button 
          onClick={handleSubmit}
          disabled={loading || (selectedSymptoms.length === 0 && !symptomText.trim() && images.length === 0)}
          className="w-full bg-sky-500 text-white py-3 px-6 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-600 active:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-base font-bold">AI 분석 중...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">psychology</span>
              <span className="text-base font-bold">AI 분석하기</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============ 진단 로직 (증상 기반) ============
const analyzeSymptom = (symptomText) => {
  const text = symptomText.toLowerCase();
  
  // 증상 키워드 기반 진단
  if (text.includes('귀') || text.includes('ear')) {
    return {
      diagnosis: '외이염 (확률 75%)',
      emergency: 'medium',
      actions: [
        '귀 긁는 것 방지 (넥카라 사용 권장)',
        '귀 세정 금지 (병원에서 전문 세정 필요)',
        '청결한 환경 유지',
        '습도 관리 (과도한 습도 피하기)'
      ],
      hospitalVisit: true,
      hospitalVisitTime: '24시간 내',
      description: '귀를 자주 긁거나 흔들면 외이염 가능성이 높습니다. 전문적인 귀 세정과 약물 처방이 필요할 수 있습니다.'
    };
  } else if (text.includes('기침') || text.includes('cough') || text.includes('콧물')) {
    return {
      diagnosis: '상기도 감염 의심 (확률 70%)',
      emergency: 'medium',
      actions: [
        '충분한 휴식 제공',
        '수분 섭취 촉진',
        '실내 온도 유지 (20-22도)',
        '증상 악화 시 즉시 병원 방문'
      ],
      hospitalVisit: true,
      hospitalVisitTime: '48시간 내',
      description: '기침과 콧물이 지속되면 상기도 감염 가능성이 있습니다. 호흡 곤란 시 즉시 응급실 방문이 필요합니다.'
    };
  } else if (text.includes('식욕') || text.includes('밥') || text.includes('먹') || text.includes('appetite')) {
    return {
      diagnosis: '식욕부진 (확률 65%)',
      emergency: text.includes('구토') || text.includes('설사') ? 'high' : 'medium',
      actions: [
        '신선한 물 제공',
        '부드러운 음식 제공 (닭가슴살, 계란 등)',
        '스트레스 요인 제거',
        '구토/설사 동반 시 즉시 병원 방문'
      ],
      hospitalVisit: text.includes('구토') || text.includes('설사'),
      hospitalVisitTime: text.includes('구토') || text.includes('설사') ? '즉시' : '24시간 내',
      description: '식욕부진은 다양한 원인이 있을 수 있습니다. 구토나 설사가 동반되면 탈수 위험이 있어 즉시 병원 방문이 필요합니다.'
    };
  } else if (text.includes('설사') || text.includes('diarrhea') || text.includes('변')) {
    return {
      diagnosis: '소화기 장애 (확률 70%)',
      emergency: 'high',
      actions: [
        '수분 공급 (탈수 방지)',
        '식이 제한 (12-24시간)',
        '청결한 환경 유지',
        '즉시 병원 방문 권장'
      ],
      hospitalVisit: true,
      hospitalVisitTime: '즉시',
      description: '설사가 지속되면 탈수 위험이 높습니다. 특히 어린 반려동물은 빠르게 악화될 수 있어 즉시 병원 방문이 필요합니다.'
    };
  } else if (text.includes('발작') || text.includes('경련') || text.includes('seizure')) {
    return {
      diagnosis: '신경계 이상 의심 (확률 80%)',
      emergency: 'high',
      actions: [
        '안전한 장소로 이동',
        '물체에 부딪히지 않도록 주변 정리',
        '입에 손이나 물건 넣지 않기',
        '즉시 응급실 방문'
      ],
      hospitalVisit: true,
      hospitalVisitTime: '즉시',
      description: '발작이나 경련은 즉각적인 응급 처치가 필요합니다. 발작이 5분 이상 지속되거나 반복되면 생명이 위험할 수 있습니다.'
    };
  } else {
    // 기본 진단
    return {
      diagnosis: '일반 건강 이상 (확률 60%)',
      emergency: 'low',
      actions: [
        '증상 관찰 지속',
        '충분한 휴식 제공',
        '수분 섭취 촉진',
        '증상 악화 시 병원 방문'
      ],
      hospitalVisit: false,
      hospitalVisitTime: '증상 악화 시',
      description: '증상을 지속적으로 관찰하고, 악화되거나 새로운 증상이 나타나면 병원 방문을 권장합니다.'
    };
  }
};

// ============ AI 질문 생성 로직 ============
const generateAIQuestion = (symptomText, conversationHistory) => {
  const text = symptomText.toLowerCase();
  const hasHistory = conversationHistory.length > 0;
  
  // 증상에 따라 추가 질문 생성
  if (text.includes('귀')) {
    if (!hasHistory || !conversationHistory.some(h => h.includes('언제'))) {
      return {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        question: '증상이 언제부터 시작되었나요? (예: 며칠 전부터, 오늘 아침부터)',
        questionType: 'symptom_duration'
      };
    }
    if (!conversationHistory.some(h => h.includes('냄새'))) {
      return {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        question: '귀에서 냄새가 나나요? 또는 분비물이 있나요?',
        questionType: 'ear_smell'
      };
    }
  } else if (text.includes('기침') || text.includes('콧물')) {
    if (!hasHistory || !conversationHistory.some(h => h.includes('언제'))) {
      return {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        question: '기침은 언제부터 시작되었나요? 하루에 몇 번 정도 기침하나요?',
        questionType: 'cough_frequency'
      };
    }
    if (!conversationHistory.some(h => h.includes('열'))) {
      return {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        question: '체온이 높아 보이나요? 또는 코가 건조한가요?',
        questionType: 'fever'
      };
    }
  } else if (text.includes('식욕') || text.includes('밥')) {
    if (!hasHistory || !conversationHistory.some(h => h.includes('언제'))) {
      return {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        question: '식욕이 없어진 지 얼마나 되었나요? 완전히 안 먹나요, 아니면 조금만 먹나요?',
        questionType: 'appetite_detail'
      };
    }
  }
  
  // 기본 질문
  return {
    agent: 'Veterinarian Agent',
    role: '전문 수의사',
    icon: '👨‍⚕️',
    type: 'medical',
    question: '추가로 관찰하신 증상이나 변화가 있으신가요?',
    questionType: 'additional_symptoms'
  };
};

// ============ 멀티에이전트 진료 (핵심!) ============
function MultiAgentDiagnosis({ petData, symptomData, onComplete, onBack, onDiagnosisResult, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState({
    medical: true,  // 전문진료실 - 기본 펼침
    triage: true,   // 응급도판정실 - 기본 펼침
    care: true      // 처방약물관리실 - 기본 펼침
  }); // 완료된 룸의 상세보기 확장 상태
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [chatMode, setChatMode] = useState(false); // 대화 모드 활성화 여부
  const [waitingForAnswer, setWaitingForAnswer] = useState(false); // AI 질문 대기 중
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showDiagnosisReport, setShowDiagnosisReport] = useState(false); // 진단서 표시 여부
  const messagesEndRef = useRef(null); // 자동 스크롤을 위한 ref

  // 보호자 응답 관련 상태
  const [guardianQuestions, setGuardianQuestions] = useState([]); // 현재 질문들
  const [guardianResponses, setGuardianResponses] = useState({}); // 보호자 응답
  const [isWaitingForGuardian, setIsWaitingForGuardian] = useState(false); // 보호자 응답 대기 중
  const [additionalComment, setAdditionalComment] = useState(''); // 추가 코멘트
  const guardianResolveRef = useRef(null); // Promise resolve 함수 저장

  // FAQ 선택 관련 상태
  const [isFAQPhase, setIsFAQPhase] = useState(false); // FAQ 선택 단계
  const [faqUIData, setFaqUIData] = useState(null); // FAQ UI 데이터
  const [selectedFAQs, setSelectedFAQs] = useState([]); // 선택된 FAQ IDs
  const faqResolveRef = useRef(null); // FAQ Promise resolve 함수 저장

  // 자동 스크롤: 메시지가 추가될 때마다 맨 아래로 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    let isMounted = true; // 컴포넌트 마운트 상태 추적
    
    const startAIDiagnosis = async () => {
      try {
        setIsProcessing(true);
        setMessages([]);
        setCurrentStep(0);

        // 보호자 응답 대기 콜백 함수 (질문 단계 또는 FAQ 단계)
        const handleWaitForGuardianResponse = (data, phaseType = 'questions') => {
          return new Promise((resolve) => {
            if (!isMounted) {
              resolve(phaseType === 'faq' ? [] : {});
              return;
            }

            if (phaseType === 'faq') {
              // FAQ 선택 단계
              setFaqUIData(data);
              setSelectedFAQs([]);
              setIsFAQPhase(true);
              faqResolveRef.current = resolve;
            } else {
              // 일반 질문 단계
              setGuardianQuestions(data);
              setGuardianResponses({});
              setIsWaitingForGuardian(true);
              setAdditionalComment('');
              guardianResolveRef.current = resolve;
            }
          });
        };

        // 백엔드 API 호출 (단계별 로그 시뮬레이션)
        const stepMessages = [
          { agent: 'CS Agent', role: '접수 · 예약 센터', icon: '🏥', type: 'cs', content: '안녕하세요, 접수센터입니다. 진료 접수 도와드리겠습니다.', delay: 0 },
          { agent: 'Information Agent', role: '증상 사전 상담실', icon: '💉', type: 'info', content: '네, 접수 확인했습니다. 증상 정보를 분석 중입니다.', delay: 1500 },
          { agent: 'Veterinarian Agent', role: '전문 수의사', icon: '👨‍⚕️', type: 'medical', content: '종합 진단 수행 중...', delay: 3000 },
          { agent: 'Triage Engine', role: '응급도 판정실', icon: '🚨', type: 'triage', content: '응급도 평가 중...', delay: 4500 },
          { agent: 'Care Agent', role: '처방 · 약물 관리실', icon: '💊', type: 'care', content: '케어 플랜 작성 중...', delay: 6000 },
        ];

        // 단계별 메시지 표시
        stepMessages.forEach((msg, index) => {
          setTimeout(() => {
            if (!isMounted) return;
            setMessages(prev => [...prev, {
              agent: msg.agent,
              role: msg.role,
              icon: msg.icon,
              type: msg.type,
              content: msg.content,
              timestamp: Date.now()
            }]);
            setCurrentStep(index + 1);
          }, msg.delay);
        });

        // 프론트엔드 모드로 직접 실행 (백엔드 API 사용 안 함)
        console.log('[MultiAgentDiagnosis] 프론트엔드 모드로 진단 시작');
        
        if (!isMounted) return;

        // 프론트엔드 모드로 실행 (agentOrchestrator 사용)
        // 정적 import로 변경됨 - 파일 상단에서 import
        try {
          const frontendResult = await runMultiAgentDiagnosis(
            petData,
            symptomData,
            (log) => {
              // 로그를 메시지로 변환
              setMessages(prev => [...prev, {
                agent: log.agent || 'System',
                role: log.role || '시스템',
                icon: log.icon || '💬',
                type: log.type || 'cs',
                content: log.content || log.message || '',
                isQuestionPhase: log.isQuestionPhase || false,
                questions: log.questions || null,
                timestamp: Date.now()
              }]);
            },
            handleWaitForGuardianResponse // 보호자 응답 대기 콜백 추가
          );
          
          if (frontendResult && frontendResult.finalDiagnosis) {
            setDiagnosisResult(frontendResult.finalDiagnosis);
            setShowResult(true);
            setIsProcessing(false);
            setChatMode(true);
            saveDiagnosisToStorage(frontendResult.finalDiagnosis, currentUser?.uid);
            if (onDiagnosisResult) {
              onDiagnosisResult(frontendResult.finalDiagnosis);
            }
            return;
          } else {
            throw new Error('진단 결과를 생성하지 못했습니다.');
          }
        } catch (error) {
          console.error('[MultiAgentDiagnosis] 프론트엔드 모드 실행 실패:', error);
          setMessages(prev => [...prev, {
            agent: 'System',
            role: '시스템',
            icon: '❌',
            type: 'error',
            content: `진단 중 오류가 발생했습니다: ${error.message}`,
            timestamp: Date.now()
          }]);
          setIsProcessing(false);
          throw error;
        }
        
        if (!isMounted) return; // 컴포넌트가 언마운트되었으면 무시

        // 최종 진단서 표시
        console.log('[MultiAgentDiagnosis] 결과 수신:', result);
        console.log('[MultiAgentDiagnosis] finalDiagnosis:', result?.finalDiagnosis);
        
        if (!result || !result.finalDiagnosis) {
          console.error('[MultiAgentDiagnosis] 결과가 올바르지 않습니다:', result);
          setIsProcessing(false);
          alert('진단 결과를 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.');
          return;
        }

        setTimeout(() => {
          try {
            setDiagnosisResult(result.finalDiagnosis);
            setShowResult(true);
            setIsProcessing(false);
            setChatMode(true);
            
            // 진단서 저장
            saveDiagnosisToStorage(result.finalDiagnosis, currentUser?.uid);
            
            // 부모 컴포넌트에 진단 결과 전달
            if (onDiagnosisResult) {
              onDiagnosisResult(result.finalDiagnosis);
            }
            
            console.log('[MultiAgentDiagnosis] 진단서 표시 완료');
          } catch (displayError) {
            console.error('[MultiAgentDiagnosis] 진단서 표시 오류:', displayError);
            setIsProcessing(false);
            alert('진단서를 표시하는 중 오류가 발생했습니다.');
          }
        }, 1500);

      } catch (error) {
        console.error('AI 진단 오류:', error);
        // Fallback: 기존 로직 사용
        const symptomText = symptomData?.symptomText || '증상 정보 없음';
        const hasImages = symptomData?.images?.length > 0;
        const analysis = analyzeSymptom(symptomText);
        
        const agentMessages = [
          {
            agent: 'CS Agent',
            role: '상담 간호사',
            icon: '💬',
            type: 'cs',
            content: `안녕하세요, ${petData?.petName || petData?.name || '반려동물'} 보호자님.\n\n접수 완료했습니다.\n\n환자 정보:\n• 이름: ${petData?.petName || petData?.name || '미상'}\n• 종류: ${getSpeciesDisplayName(petData.species)}\n• 품종: ${petData.breed || '미등록'}\n\n증상:\n${symptomText}\n${hasImages ? `\n사진 ${symptomData.images.length}장 확인 완료\n` : ''}\n→ Information Agent에게 전달합니다.`
          },
          {
            agent: 'Information Agent',
            role: '정보수집가',
            icon: '🔍',
            type: 'info',
            content: `증상 정보 수집 및 분석 중...\n\n${hasImages ? '📷 이미지 분석: 증상 부위 확인 중...\n' : ''}🔎 유사 케이스 검색: 데이터베이스 검색 중...\n📋 이전 진료 기록: 관련 기록 확인 중...\n📊 증상 패턴 분석: AI 모델 분석 중...\n\n→ 분석 완료. Veterinarian Agent에게 전달합니다.`
          },
          {
            agent: 'Veterinarian Agent',
            role: '전문 수의사',
            icon: '👨‍⚕️',
            type: 'medical',
            content: `종합 진단 수행 중...\n\n🔬 증상 분석 결과:\n${analysis.description}\n\n📊 진단 결과:\n• ${typeof analysis.diagnosis === 'string' ? analysis.diagnosis : (analysis.diagnosis?.name || '진단 분석 중')}\n\n⚠️ 위험도: ${analysis.emergency === 'low' ? '낮음' : analysis.emergency === 'medium' ? '보통' : '높음'}\n🚨 응급도: ${analysis.emergency === 'low' ? '🟢 경미' : analysis.emergency === 'medium' ? '🟡 보통' : '🔴 응급'}\n\n→ Data Agent, 진단서 작성 부탁합니다.`
          },
          {
            agent: 'Data Agent',
            role: '데이터 처리자',
            icon: '💾',
            type: 'data',
            content: `진료 기록 생성 중...\n\n✅ 진단서 템플릿 작성 완료\n✅ 데이터 구조화 완료\n✅ 로컬 스토리지 저장 완료\n✅ 진단서 PDF 생성 준비 완료\n\n→ 진단서 생성 완료!`
          }
        ];
        
        agentMessages.forEach((msg, index) => {
          setTimeout(() => {
            setMessages(prev => [...prev, msg]);
            setCurrentStep(index + 1);
            
            if (index === agentMessages.length - 1) {
              setTimeout(() => {
                const finalDiagnosis = {
                  ...analysis,
                  id: Date.now().toString(),
                  created_at: Date.now(),
                  petId: petData.id,
                  petName: petData?.petName || petData?.name || '미상',
                  symptom: symptomText
                };
                setDiagnosisResult(finalDiagnosis);
                setShowResult(true);
                setIsProcessing(false);
                setChatMode(true);
                saveDiagnosisToStorage(finalDiagnosis, currentUser?.uid);
                if (onDiagnosisResult) {
                  onDiagnosisResult(finalDiagnosis);
                }
              }, 1500);
            }
          }, index * 3000);
        });
      }
    };

    startAIDiagnosis();
    
    // cleanup 함수
    return () => {
      isMounted = false;
    };
  }, [petData?.id, symptomData?.symptomText]); // 의존성 배열 최적화

  // 보호자 응답 선택 핸들러
  const handleGuardianOptionSelect = (questionId, option, isMultiple) => {
    setGuardianResponses(prev => {
      if (isMultiple) {
        const currentSelections = prev[questionId] || [];
        if (currentSelections.includes(option)) {
          // 이미 선택된 경우 제거
          return { ...prev, [questionId]: currentSelections.filter(o => o !== option) };
        } else {
          // 없음 선택시 다른 옵션 제거
          if (option === '없음') {
            return { ...prev, [questionId]: ['없음'] };
          }
          // 다른 옵션 선택시 없음 제거
          const filtered = currentSelections.filter(o => o !== '없음');
          return { ...prev, [questionId]: [...filtered, option] };
        }
      } else {
        return { ...prev, [questionId]: option };
      }
    });
  };

  // 보호자 응답 제출 핸들러
  const handleGuardianResponseSubmit = () => {
    // 모든 질문에 답변했는지 확인
    const allAnswered = guardianQuestions.every(q => {
      const response = guardianResponses[q.id];
      if (q.type === 'multiple') {
        return response && response.length > 0;
      }
      return response && response.length > 0;
    });

    if (!allAnswered) {
      alert('모든 질문에 답변해 주세요.');
      return;
    }

    // 추가 코멘트가 있으면 응답에 추가
    const finalResponses = {
      ...guardianResponses,
      additionalComment: additionalComment.trim() || ''
    };

    // 보호자 응답 메시지를 채팅에 추가
    const responsesSummary = guardianQuestions.map(q => {
      const response = guardianResponses[q.id];
      const responseText = Array.isArray(response) ? response.join(', ') : response;
      return `• ${q.question}\n  → ${responseText}`;
    }).join('\n\n');

    setMessages(prev => [...prev, {
      agent: '사용자',
      role: '보호자',
      icon: '👤',
      type: 'user',
      content: `📝 증상 문진 응답\n\n${responsesSummary}${additionalComment ? `\n\n💬 추가 정보: ${additionalComment}` : ''}`,
      isUser: true,
      timestamp: Date.now()
    }]);

    // Promise resolve 호출하여 진행 재개
    if (guardianResolveRef.current) {
      guardianResolveRef.current(finalResponses);
      guardianResolveRef.current = null;
    }

    setIsWaitingForGuardian(false);
    setGuardianQuestions([]);
  };

  // FAQ 선택 핸들러
  const handleFAQSelect = (faqId) => {
    setSelectedFAQs(prev => {
      if (prev.includes(faqId)) {
        // 이미 선택된 경우 제거
        return prev.filter(id => id !== faqId);
      } else {
        // 새로 선택
        return [...prev, faqId];
      }
    });
  };

  // FAQ 선택 완료 핸들러
  const handleFAQSubmit = () => {
    // 선택된 FAQ가 없어도 진행 가능 (skip처럼 동작)
    if (faqResolveRef.current) {
      faqResolveRef.current(selectedFAQs.length > 0 ? selectedFAQs : ['skip']);
      faqResolveRef.current = null;
    }
    setIsFAQPhase(false);
    setFaqUIData(null);
    setSelectedFAQs([]);
  };

  // FAQ 스킵 핸들러
  const handleFAQSkip = () => {
    if (faqResolveRef.current) {
      faqResolveRef.current(['skip']);
      faqResolveRef.current = null;
    }
    setIsFAQPhase(false);
    setFaqUIData(null);
    setSelectedFAQs([]);
  };

  const showFinalDiagnosis = (analysis, symptomText, hasImages) => {
    setDiagnosisResult(analysis);
    setShowResult(true);
    setChatMode(false);
    
    // 진단서 저장
    const savedDiagnosis = {
      petId: petData.id,
      petName: petData?.petName || petData?.name || '미상',
      symptom: symptomText,
      images: hasImages ? symptomData.images.length : 0,
      conversationHistory: conversationHistory,
      ...analysis
    };
    saveDiagnosisToStorage(savedDiagnosis, currentUser?.uid);
    
    // 부모 컴포넌트에 진단 결과 전달
    if (onDiagnosisResult) {
      onDiagnosisResult(analysis);
    }
  };

  const handleUserMessage = () => {
    if (!userInput.trim() || !waitingForAnswer) return;

    const userMessage = userInput.trim();
    
    // 사용자 메시지 추가
    setMessages(prev => [...prev, {
      agent: '사용자',
      role: '보호자',
      icon: '👤',
      type: 'user',
      content: userMessage,
      isUser: true
    }]);

    // 대화 히스토리에 추가
    setConversationHistory(prev => [...prev, userMessage]);
    
    setUserInput('');
    setWaitingForAnswer(false);
    setIsProcessing(true);

    // AI가 답변 처리
    setTimeout(() => {
      const updatedAnalysis = analyzeSymptom(symptomData.symptomText + ' ' + userMessage);
      
      setMessages(prev => [...prev, {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        content: `답변 감사합니다. 정보를 반영하여 진단을 업데이트하겠습니다.\n\n${updatedAnalysis.description}\n\n추가 질문이 있으시면 언제든지 물어보세요.`,
        isResponse: true
      }]);

      // 추가 질문이 필요한지 확인
      setTimeout(() => {
        const updatedHistory = [...conversationHistory, userMessage];
        const nextQuestion = generateAIQuestion(symptomData.symptomText, updatedHistory);
        if (nextQuestion && updatedHistory.length < 3) { // 최대 3번까지 질문
          setMessages(prev => [...prev, {
            ...nextQuestion,
            content: `추가로 확인하고 싶은 것이 있습니다.\n\n${nextQuestion.question}`,
            isQuestion: true
          }]);
          setWaitingForAnswer(true);
        } else {
          // 더 이상 질문이 없으면 최종 진단서 표시
          showFinalDiagnosis(updatedAnalysis, symptomData.symptomText + ' ' + userMessage, symptomData.images?.length > 0);
        }
        setIsProcessing(false);
      }, 2000);
    }, 1500);
  };

  const handleUserQuestion = async () => {
    if (!userInput.trim() || !diagnosisResult) return;

    const userQuestion = userInput.trim();
    
    // 사용자 질문 추가
    setMessages(prev => [...prev, {
      agent: '사용자',
      role: '보호자',
      icon: '👤',
      type: 'user',
      content: `질문: ${userQuestion}`,
      isUser: true,
      isQuestion: true
    }]);

    setUserInput('');
    setIsProcessing(true);

    try {
      // 백엔드 API 호출
      const result = await requestQuestionAnswer({
        user_question: userQuestion,
        pet_data: {
          petName: petData?.petName || petData?.name || '미상',
          species: petData.species || 'dog',
          breed: petData.breed || '미등록',
          age: petData.age || '미상',
          weight: petData.weight || null,
        },
        diagnosis_result: diagnosisResult,
      });

      if (!result.success) {
        throw new Error(result.error || '답변 생성에 실패했습니다.');
      }

      setMessages(prev => [...prev, {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        content: result.answer || '답변을 생성할 수 없습니다.',
        isResponse: true,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('질문 답변 오류:', error);
      
      // 에러 타입에 따라 다른 fallback 답변 제공
      let answer = '';
      
      // 질문 키워드 기반으로 더 구체적인 fallback 답변
      const questionLower = userQuestion.toLowerCase();
      
      if (questionLower.includes('음식') || questionLower.includes('먹이') || questionLower.includes('식욕') || questionLower.includes('밥')) {
        answer = `식욕이 좋지 않을 때는 다음과 같은 방법을 시도해보세요:\n\n1. **부드러운 음식 제공**: 삶은 닭가슴살(기름 제거), 계란(삶은 것), 흰 쌀밥을 소량씩 제공\n2. **수분 공급**: 깨끗한 물을 자주 제공하고, 필요시 수액 보충 고려\n3. **소량씩 자주**: 한 번에 많이 주지 말고 소량씩 여러 번 나누어 제공\n4. **온도 조절**: 미지근한 온도로 제공하면 식욕이 좋아질 수 있음\n5. **환경 조성**: 조용하고 편안한 환경에서 식사하도록 도와주기\n\n⚠️ **주의사항**:\n- 구토나 설사가 동반되면 음식을 제한하고 수의사와 상의하세요.\n- 24시간 이상 음식을 거부하면 탈수 위험이 있으므로 병원 방문을 권장합니다.\n- 현재 진단 결과(${typeof diagnosisResult.diagnosis === 'string' ? diagnosisResult.diagnosis : (diagnosisResult.diagnosis?.name || '일반 건강 이상')})를 고려하여 추가 조치가 필요할 수 있습니다.`;
      } else if (questionLower.includes('병원') || questionLower.includes('방문') || questionLower.includes('응급')) {
        const urgency = diagnosisResult.triage_level || 'yellow';
        const urgencyText = urgency === 'red' ? '즉시' : urgency === 'orange' ? '오늘 안에' : urgency === 'yellow' ? '24~48시간 내' : '증상 악화 시';
        answer = `병원 방문 시점에 대한 안내입니다:\n\n**현재 응급도**: ${urgencyText}\n\n${urgency === 'red' ? '🚨 즉시 응급실로 이동하세요. 생명이 위험할 수 있습니다.' : urgency === 'orange' ? '⚠️ 오늘 안에 병원 방문을 권장합니다. 증상이 악화될 수 있습니다.' : urgency === 'yellow' ? '📋 24~48시간 내 병원 방문을 권장합니다. 증상을 지속적으로 관찰하세요.' : '👀 증상을 지속적으로 관찰하고, 악화되면 병원을 방문하세요.'}\n\n**병원 방문 시 준비할 것**:\n- 현재 진단서 (이 앱에서 생성된 진단서)\n- 증상이 시작된 시점과 변화 과정\n- 최근 먹은 음식, 약물 복용 여부\n- 사진이나 영상 (가능한 경우)\n\n**응급 상황 신호**:\n- 호흡 곤란, 의식 저하, 발작/경련\n- 심한 구토나 설사로 탈수 의심\n- 배변/배뇨 불가능\n- 심한 통증으로 움직이지 못함`;
      } else if (questionLower.includes('케어') || questionLower.includes('돌봄') || questionLower.includes('관리')) {
        const actions = diagnosisResult.actions || [];
        answer = `현재 진단 결과를 바탕으로 한 케어 가이드입니다:\n\n**즉시 조치사항**:\n${actions.length > 0 ? actions.map((a, i) => `${i + 1}. ${a}`).join('\n') : '- 증상을 지속적으로 관찰하세요.\n- 충분한 휴식과 수분 공급을 유지하세요.'}\n\n**일반적인 케어 원칙**:\n1. 조용하고 편안한 환경 유지\n2. 충분한 휴식 제공\n3. 수분 섭취 촉진\n4. 증상 변화 관찰 및 기록\n5. 필요시 병원 방문\n\n**주의사항**:\n- 증상이 악화되거나 새로운 증상이 나타나면 즉시 병원을 방문하세요.\n- 자가 처방은 피하고, 수의사의 지시를 따르세요.`;
      } else {
        // 일반적인 질문에 대한 답변
        answer = `질문해주셔서 감사합니다.\n\n현재 ${petData.petName}의 진단 결과는 "${typeof diagnosisResult.diagnosis === 'string' ? diagnosisResult.diagnosis : (diagnosisResult.diagnosis?.name || '일반 건강 이상')}"입니다.\n\n**답변**:\n${userQuestion}에 대해 답변드리기 위해, 현재 진단 결과와 연관하여 다음과 같이 안내드립니다:\n\n- 현재 위험도: ${typeof diagnosisResult.riskLevel === 'string' ? diagnosisResult.riskLevel : '보통'}\n- 권장 조치: ${diagnosisResult.actions?.join(', ') || '증상 관찰 지속'}\n\n더 구체적인 답변을 원하시면 다음 정보를 알려주시면 도움이 됩니다:\n1. 질문과 관련된 구체적인 상황\n2. 현재 관찰 중인 증상이나 변화\n3. 특별히 궁금한 부분\n\n또한 병원 방문 시 수의사에게 직접 문의하시면 더 정확한 답변을 받으실 수 있습니다.`;
      }
      
      setMessages(prev => [...prev, {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        content: answer,
        isResponse: true,
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 사용자 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // 진단이 완료된 경우 기존 handleUserQuestion 사용
    if (diagnosisResult && !isProcessing) {
      handleUserQuestion();
      return;
    }

    // 진단 진행 중일 때는 메시지만 추가
    const userMessage = userInput.trim();
    setMessages(prev => [...prev, {
      agent: '사용자',
      role: '보호자',
      icon: '👤',
      type: 'user',
      content: userMessage,
      isUser: true,
      timestamp: Date.now()
    }]);

    setUserInput('');

    // 진단 진행 중이면 간단한 안내 메시지 추가
    if (isProcessing) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          agent: 'CS Agent',
          role: '접수 · 예약 센터',
          icon: '🏥',
          type: 'cs',
          content: '네, 보호자님. 증상 정보 감사합니다. AI 의료진이 모든 정보를 종합하여 정밀 진단을 진행하고 있습니다. 조금만 기다려주세요!',
          timestamp: Date.now()
        }]);
      }, 500);
    }
  };

  // 에이전트별 색상 테마
  const getAgentColor = (type) => {
    const colors = {
      cs: { bg: '#EFF6FF', icon: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: '#BFDBFE' },
      info: { bg: '#F0FDF4', icon: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '#BBF7D0' },
      medical: { bg: '#F5F3FF', icon: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: '#DDD6FE' },
      triage: { bg: '#FEF2F2', icon: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: '#FECACA' },
      data: { bg: '#FFF7ED', icon: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: '#FED7AA' },
      care: { bg: '#ECFEFF', icon: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', border: '#A5F3FC' },
      summary: { bg: '#F8FAFC', icon: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', border: '#E2E8F0' }
    };
    return colors[type] || colors.cs;
  };

  // 에이전트 룸 정의 (카드 형태 UI용) - 병원 분위기 반영
  const agentRooms = [
    { id: 'cs', name: '접수 · 예약 센터', icon: '🏥', role: 'Front Desk', agentKey: 'CS Agent', description: '진료 접수 및 안내' },
    { id: 'info', name: '증상 사전 상담실', icon: '💉', role: 'Triage 간호팀', agentKey: 'Information Agent', description: '증상 청취 및 초기 평가' },
    { id: 'medical', name: '전문 진료실', icon: '👨‍⚕️', role: '담당 수의사', agentKey: 'Veterinarian Agent', description: '전문 진찰 및 진단' },
    { id: 'triage', name: '응급도 판정실', icon: '🚨', role: '응급의학팀', agentKey: 'Triage Engine', description: '위급도 평가 및 분류' },
    { id: 'data', name: '치료 계획 수립실', icon: '📋', role: '의료진 협진', agentKey: 'Data Agent', description: '치료 방향 설정' },
    { id: 'care', name: '처방 · 약물 관리실', icon: '💊', role: 'Pet 약국', agentKey: 'Care Agent', description: '처방약 안내 및 복용법' },
    { id: 'summary', name: '진료 요약 · 관리실', icon: '📄', role: 'Care Summary', agentKey: 'summary', description: '주의사항 및 케어 플랜' }
  ];

  // 각 에이전트 룸의 상태 (pending, processing, completed)
  const getAgentRoomStatus = (room) => {
    const agentMessages = messages.filter(m => m.agent === room.agentKey || m.type === room.id);
    if (agentMessages.length === 0) {
      // 이전 룸이 완료되었는지 확인
      const roomIndex = agentRooms.findIndex(r => r.id === room.id);
      if (roomIndex === 0) return 'processing';
      const prevRoom = agentRooms[roomIndex - 1];
      const prevMessages = messages.filter(m => m.agent === prevRoom.agentKey || m.type === prevRoom.id);
      if (prevMessages.length > 0) return 'processing';
      return 'pending';
    }
    // 다음 룸에 메시지가 있으면 완료된 것
    const roomIndex = agentRooms.findIndex(r => r.id === room.id);
    if (roomIndex < agentRooms.length - 1) {
      const nextRoom = agentRooms[roomIndex + 1];
      const nextMessages = messages.filter(m => m.agent === nextRoom.agentKey || m.type === nextRoom.id);
      if (nextMessages.length > 0) return 'completed';
    }
    // summary 룸이고 showResult가 true면 완료
    if (room.id === 'summary' && showResult) return 'completed';
    return agentMessages.length > 0 ? 'processing' : 'pending';
  };

  // 에이전트 룸의 마지막 메시지 가져오기
  const getAgentRoomMessage = (room) => {
    const agentMessages = messages.filter(m => m.agent === room.agentKey || m.type === room.id);
    if (agentMessages.length === 0) return null;
    return agentMessages[agentMessages.length - 1];
  };

  // 에이전트 룸의 모든 메시지 가져오기
  const getAgentRoomMessages = (room) => {
    return messages.filter(m => m.agent === room.agentKey || m.type === room.id);
  };
  
  const steps = [
    { label: '접수', icon: '1' },
    { label: '분석', icon: '2' },
    { label: '진단', icon: '3' },
    { label: '완료', icon: '4' }
  ];
  

  return (
    <div className="diagnosis-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 상단 헤더 - 컴팩트 스타일 */}
      <div style={{
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #bae6fd',
        position: 'relative'
      }}>
        <button onClick={onBack} style={{
          position: 'absolute',
          left: '12px',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#0369a1'
        }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0c4a6e' }}>
            🐾 PetMedical.AI 진료실
          </div>
        </div>
      </div>
      
      {/* 채팅창 UI */}
      <div className="chat-messages-container" style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        overflowY: 'auto',
        background: '#f8fafc'
      }}>
          {messages.length === 0 && isProcessing && (
          <div className="initial-loading" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            gap: '16px'
          }}>
              <div className="loading-spinner"></div>
            <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>AI 진료실에 연결 중입니다...</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>잠시만 기다려주세요</p>
            </div>
          )}

        {/* 채팅 메시지 리스트 */}
          {messages.map((msg, index) => {
          const isUserMessage = msg.agent === '사용자' || msg.isUser;
          const isSystemMessage = msg.type === 'system';
          const agentColors = getAgentColor(msg.type);

          // 시스템 메시지 (에이전트 간 전환 메시지 등)
          if (isSystemMessage) {
            return (
              <div key={index} style={{
                textAlign: 'center',
                padding: '8px 16px',
                margin: '4px 0',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                {msg.content}
                  </div>
            );
          }

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: isUserMessage ? 'row-reverse' : 'row',
                gap: '8px',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}
            >
              {/* 에이전트 아이콘 */}
              {!isUserMessage && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '50%',
                  background: agentColors.icon,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  {msg.icon || '🏥'}
                </div>
              )}

              {/* 메시지 말풍선 */}
              <div style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {/* 에이전트 이름 / 역할 */}
                {!isUserMessage && (
                  <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: '600',
                    paddingLeft: '12px'
                  }}>
                    {msg.role || msg.agent}
                    </div>
                  )}

                {/* 메시지 내용 */}
                <div style={{
                  background: isUserMessage
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : agentColors.bg,
                  color: isUserMessage ? 'white' : '#1e293b',
                  borderRadius: isUserMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: !isUserMessage ? `1px solid ${agentColors.border}` : 'none',
                  wordBreak: 'break-word'
                }}>
                  {msg.content.split('\n').map((line, lineIdx) => (
                    <div key={lineIdx} style={{
                      marginBottom: line ? '4px' : '0',
                      whiteSpace: 'pre-wrap'
                    }}>
                          {line}
                        </div>
                  ))}

                  {/* 질문 옵션 버튼 */}
                  {msg.isQuestion && msg.questionData && !msg.answered && (
                    <div style={{
                      marginTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {msg.questionData.options.map((option, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => {
                            // 보호자 응답 추가
                            setMessages(prev => {
                              const updated = [...prev];
                              const msgIndex = updated.findIndex(m => m.timestamp === msg.timestamp);
                              if (msgIndex !== -1) {
                                updated[msgIndex] = { ...updated[msgIndex], answered: true };
                              }
                              return updated;
                            });

                            // 응답 메시지 추가
                            setMessages(prev => [...prev, {
                              agent: '사용자',
                              role: '보호자',
                              icon: '👤',
                              type: 'user',
                              content: option,
                              isUser: true,
                              timestamp: Date.now()
                            }]);
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            color: '#1e293b',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f1f5f9';
                            e.target.style.borderColor = '#94a3b8';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#cbd5e1';
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 타임스탬프 */}
                <div style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  paddingLeft: isUserMessage ? '0' : '12px',
                  paddingRight: isUserMessage ? '12px' : '0',
                  textAlign: isUserMessage ? 'right' : 'left'
                }}>
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* 사용자 아이콘 */}
              {isUserMessage && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  👤
                </div>
              )}
              </div>
            );
          })}
          
        {/* 타이핑 인디케이터 */}
        {isProcessing && messages.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}>
              💭
            </div>
            <div style={{
              background: 'white',
              borderRadius: '16px 16px 16px 4px',
              padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0.2s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0.4s'
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* 보호자 응답 폼 */}
        {isWaitingForGuardian && guardianQuestions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '16px',
            padding: '20px',
            margin: '12px 0',
            border: '2px solid #0ea5e9',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>📋</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0369a1' }}>
                  증상 문진
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#0284c7' }}>
                  정확한 진단을 위해 아래 질문에 답변해 주세요
                </p>
              </div>
            </div>

            {guardianQuestions.map((question, qIndex) => {
              const isMultiple = question.type === 'multiple';
              const currentResponse = guardianResponses[question.id] || (isMultiple ? [] : '');

              return (
                <div key={question.id} style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      background: '#0ea5e9',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {qIndex + 1}
              </span>
                    <div>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {question.question}
                      </p>
                      {isMultiple && (
                        <span style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginTop: '4px',
                          display: 'block'
                        }}>
                          복수 선택 가능
                        </span>
                      )}
              </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {question.options.map((option, optIndex) => {
                      const isSelected = isMultiple
                        ? currentResponse.includes(option)
                        : currentResponse === option;

                      return (
                        <button
                          key={optIndex}
                          onClick={() => handleGuardianOptionSelect(question.id, option, isMultiple)}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '20px',
                            border: isSelected ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                            background: isSelected ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'white',
                            color: isSelected ? 'white' : '#475569',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none'
                          }}
                        >
                          {isSelected && <span style={{ marginRight: '4px' }}>✓</span>}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 추가 코멘트 입력 */}
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px'
              }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  추가로 알려주실 내용이 있나요? (선택사항)
                </p>
              </div>
              <textarea
                value={additionalComment}
                onChange={(e) => setAdditionalComment(e.target.value)}
                placeholder="예: 어제 산책 중에 풀을 많이 먹었어요 / 최근 사료를 바꿨어요 등"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleGuardianResponseSubmit}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>답변 제출 후 진료 계속</span>
              <span style={{ fontSize: '16px' }}>→</span>
            </button>
            </div>
          )}

        {/* FAQ 선택 UI */}
        {isFAQPhase && faqUIData && (
          <div style={{
            background: 'linear-gradient(135deg, #FFF9DB 0%, #FEF3C7 100%)',
            borderRadius: '16px',
            padding: '20px',
            margin: '12px 0',
            border: '2px solid #FCD34D',
            boxShadow: '0 4px 12px rgba(252, 211, 77, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>📚</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#92400E' }}>
                  {faqUIData.title}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#B45309' }}>
                  {faqUIData.subtitle}
                </p>
              </div>
            </div>

            {/* FAQ 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {faqUIData.faqs && faqUIData.faqs.map((faq) => {
                const isSelected = selectedFAQs.includes(faq.id);
                return (
                  <button
                    key={faq.id}
                    onClick={() => handleFAQSelect(faq.id)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #F59E0B' : '2px solid #e2e8f0',
                      background: isSelected ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'white',
                      color: isSelected ? 'white' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: isSelected ? 'none' : '2px solid #cbd5e1',
                      background: isSelected ? 'white' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {isSelected && <span style={{ color: '#F59E0B', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                    </span>
                    <div>
                      <div style={{ marginBottom: '4px' }}>{faq.question}</div>
                      {faq.category && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(255,255,255,0.3)' : '#FEF3C7',
                          color: isSelected ? 'white' : '#92400E'
                        }}>
                          {faq.category}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 버튼 영역 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleFAQSkip}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {faqUIData.skipOption?.label || '건너뛰기'}
              </button>
              <button
                onClick={handleFAQSubmit}
                disabled={selectedFAQs.length === 0}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: selectedFAQs.length > 0
                    ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                    : '#e2e8f0',
                  color: selectedFAQs.length > 0 ? 'white' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: selectedFAQs.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedFAQs.length > 0 ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                }}
              >
                {selectedFAQs.length > 0
                  ? `선택한 질문 ${selectedFAQs.length}개 확인하기`
                  : '질문을 선택해주세요'}
              </button>
            </div>
          </div>
        )}

        {/* 자동 스크롤을 위한 참조 지점 */}
        <div ref={messagesEndRef} />
        </div>

      {/* 하단 영역 */}
      {!showResult && !isWaitingForGuardian && !isFAQPhase && (
        <div style={{ marginTop: 'auto' }}>
          {/* AI 진단 중 메시지 */}
          {isProcessing && (
            <div style={{
              padding: '12px 16px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#3b82f6',
                animation: 'pulse 1.5s infinite'
              }}></div>
              <span style={{ fontSize: '14px', color: '#64748b' }}>AI가 진단 중입니다...</span>
            </div>
          )}

          {/* 하단 하늘색 배너 */}
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
            padding: '14px 20px',
            textAlign: 'center'
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              전문 AI 의료진들이 함께 진료 중입니다.
            </span>
          </div>
        </div>
      )}
      
      {showResult && diagnosisResult && (
        <div className="diagnosis-result-redesign" style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'white',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => onComplete('home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0891b2',
                fontWeight: '600',
                fontSize: '15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ← 이전으로
            </button>
            <button
              onClick={() => onComplete('home')}
              style={{
                color: '#9ca3af',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '24px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* 스크롤 가능한 본문 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            paddingBottom: '180px'
          }}>
            {/* 진단명 헤더 카드 */}
            <div style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>!</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>상세 진단</span>
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0 0 8px 0',
                lineHeight: '1.3'
              }}>
                {typeof diagnosisResult.diagnosis === 'string' ? diagnosisResult.diagnosis : (diagnosisResult.diagnosis?.name || '진단 결과')}
              </h2>
              <p style={{
                fontSize: '13px',
                opacity: 0.9,
                margin: 0
              }}>
                AI 기반 멀티 에이전트 분석 결과
              </p>
            </div>

            {/* 상세 설명 카드 */}
            {diagnosisResult.description && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📋 상세 설명
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* 설명을 문장 단위로 분리하여 표시 */}
                  {diagnosisResult.description.split(/[.!?]\s+/).filter(s => s.trim()).map((sentence, idx) => (
                    <p key={idx} style={{
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: '1.6',
                      background: '#f8fafc',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      margin: 0,
                      borderLeft: '3px solid #e2e8f0'
                    }}>
                      {sentence.trim()}{sentence.trim().match(/[.!?]$/) ? '' : '.'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 권장 조치사항 카드 */}
            {diagnosisResult.actions && diagnosisResult.actions.length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#22d3ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
                  </span>
                  권장 조치사항
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {diagnosisResult.actions.map((action, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #a5f3fc'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: '#334155',
                        lineHeight: '1.5',
                        margin: 0,
                        flex: 1
                      }}>
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 중요 안내사항 */}
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              border: '2px solid #fbbf24',
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '20px' }}>!</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#9a3412',
                    margin: '0 0 8px 0'
                  }}>
                    ⚠️ 중요 안내사항
                  </h4>
                  <p style={{
                    fontSize: '13px',
                    color: '#c2410c',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    본 진단서는 AI가 분석한 참고자료입니다.
                    증상이 지속되거나 악화될 경우 반드시 전문 수의사의 진료를 받으시기 바랍니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 푸터 로고 */}
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '6px'
              }}>
                <span style={{ color: '#06b6d4', fontSize: '16px' }}>❤️</span>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#475569' }}>PetMedical.AI</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                반려동물 건강 관리의 새로운 기준
              </p>
            </div>
          </div>

          {/* 하단 고정 버튼 영역 */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #e2e8f0',
            zIndex: 100
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <button
                onClick={() => onComplete('treatment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                ❤️ 직접 치료하기
              </button>
              <button
                onClick={() => onComplete('hospital')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                }}
              >
                📅 병원 예약하기
              </button>
              <button
                onClick={() => setShowDiagnosisReport(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                📄 진단서 보기
              </button>
              <button
                onClick={() => onComplete('home')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(71, 85, 105, 0.3)'
                }}
              >
                🏠 홈으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진단서 페이퍼 모달 */}
      {showDiagnosisReport && diagnosisResult && (
        <DiagnosisReport
          petData={petData}
          diagnosisResult={diagnosisResult}
          symptomData={symptomData}
          onClose={() => setShowDiagnosisReport(false)}
          onGoToHospital={() => {
            setShowDiagnosisReport(false);
            onComplete('hospital');
          }}
          onGoToTreatment={() => {
            setShowDiagnosisReport(false);
            onComplete('treatment');
          }}
        />
      )}
    </div>
  );
}

// ============ 진단 결과 보기 화면 (재진단 없이) ============
function DiagnosisResultView({ petData, diagnosisResult, symptomData, onGoToTreatment, onGoToHospital, onBack }) {
  const [showDiagnosisReport, setShowDiagnosisReport] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0891b2',
            fontWeight: '600',
            fontSize: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ← 이전으로
        </button>
        <button
          onClick={onBack}
          style={{
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* 스크롤 가능한 본문 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        paddingBottom: '180px'
      }}>
        {/* 진단명 헤더 카드 */}
        <div style={{
          background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>!</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>상세 진단</span>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            lineHeight: '1.3'
          }}>
            {typeof diagnosisResult?.diagnosis === 'string' ? diagnosisResult.diagnosis : (diagnosisResult?.diagnosis?.name || '진단 결과')}
          </h2>
          <p style={{
            fontSize: '13px',
            opacity: 0.9,
            margin: 0
          }}>
            AI 기반 멀티 에이전트 분석 결과
          </p>
        </div>

        {/* 상세 설명 카드 */}
        {diagnosisResult?.description && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1e293b',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 상세 설명
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diagnosisResult.description.split(/[.!?]\s+/).filter(s => s.trim()).map((sentence, idx) => (
                <p key={idx} style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: '1.6',
                  background: '#f8fafc',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  margin: 0,
                  borderLeft: '3px solid #e2e8f0'
                }}>
                  {sentence.trim()}{sentence.trim().match(/[.!?]$/) ? '' : '.'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 권장 조치사항 카드 */}
        {diagnosisResult?.actions && diagnosisResult.actions.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1e293b',
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#22d3ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '14px' }}>✓</span>
              </span>
              권장 조치사항
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diagnosisResult.actions.map((action, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #a5f3fc'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#334155',
                    lineHeight: '1.5',
                    margin: 0,
                    flex: 1
                  }}>
                    {action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 중요 안내사항 */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          border: '2px solid #fbbf24',
          boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: 'white', fontSize: '20px' }}>!</span>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#9a3412',
                margin: '0 0 8px 0'
              }}>
                ⚠️ 중요 안내사항
              </h4>
              <p style={{
                fontSize: '13px',
                color: '#c2410c',
                lineHeight: '1.6',
                margin: 0
              }}>
                본 진단서는 AI가 분석한 참고자료입니다.
                증상이 지속되거나 악화될 경우 반드시 전문 수의사의 진료를 받으시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 로고 */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '6px'
          }}>
            <span style={{ color: '#06b6d4', fontSize: '16px' }}>❤️</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#475569' }}>PetMedical.AI</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            반려동물 건강 관리의 새로운 기준
          </p>
        </div>
      </div>

      {/* 하단 고정 버튼 영역 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e2e8f0',
        zIndex: 100
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <button
            onClick={onGoToTreatment}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            ❤️ 직접 치료하기
          </button>
          <button
            onClick={onGoToHospital}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}
          >
            📅 병원 예약하기
          </button>
          <button
            onClick={() => setShowDiagnosisReport(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            📄 진단서 보기
          </button>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(71, 85, 105, 0.3)'
            }}
          >
            🏠 홈으로
          </button>
        </div>
      </div>

      {/* 진단서 모달 */}
      {showDiagnosisReport && (
        <DiagnosisReport
          petData={petData}
          diagnosisResult={diagnosisResult}
          symptomData={symptomData}
          onClose={() => setShowDiagnosisReport(false)}
          onGoToHospital={() => {
            setShowDiagnosisReport(false);
            onGoToHospital();
          }}
          onGoToTreatment={() => {
            setShowDiagnosisReport(false);
            onGoToTreatment();
          }}
        />
      )}
    </div>
  );
}

// ============ 직접 치료 가이드 화면 ============
function HomeTreatmentGuide({ petData, diagnosisResult, onBack, onGoToHospital }) {
  const CHECKLIST_KEY = `petMedical_checklist_${petData?.id || 'default'}_${new Date().toISOString().split('T')[0]}`;

  const defaultChecklist = [
    { id: 'observe', label: '증상 관찰 및 기록', checked: false },
    { id: 'water', label: '수분 섭취 확인', checked: false },
    { id: 'appetite', label: '식욕 상태 확인', checked: false },
    { id: 'stool', label: '배변 상태 확인', checked: false },
    { id: 'activity', label: '활동량 관찰', checked: false }
  ];

  const [checklist, setChecklist] = useState(() => {
    // 항상 체크되지 않은 상태로 시작
    return defaultChecklist;
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleChecklistChange = (id) => {
    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('체크리스트 저장 실패:', e);
      }
      return updated;
    });
  };

  const handleGoToHospital = () => {
    if (onGoToHospital) {
      onGoToHospital();
    }
  };

  const completedCount = checklist.filter(item => item.checked).length;
  const totalCount = checklist.length;

  const getTreatmentSteps = () => {
    if (!diagnosisResult) {
      return [
        { step: 1, title: '증상 관찰', description: '반려동물의 증상을 지속적으로 관찰하세요.' },
        { step: 2, title: '안전한 환경', description: '편안하고 안전한 환경을 제공하세요.' },
        { step: 3, title: '수분 공급', description: '충분한 깨끗한 물을 제공하세요.' }
      ];
    }

    const emergency = diagnosisResult.emergency;
    const baseSteps = [
      { step: 1, title: '즉시 조치', description: diagnosisResult.actions[0] || '증상 관찰' },
      { step: 2, title: '환경 관리', description: '청결하고 편안한 환경을 유지하세요.' },
      { step: 3, title: '수분 및 영양', description: '충분한 수분과 부드러운 음식을 제공하세요.' }
    ];

    if (emergency === 'low') {
      return [
        ...baseSteps,
        { step: 4, title: '관찰 기간', description: '24-48시간 동안 증상을 관찰하세요.' },
        { step: 5, title: '재진료 시점', description: '증상이 개선되지 않거나 악화되면 병원 방문하세요.' }
      ];
    } else {
      return [
        ...baseSteps,
        { step: 4, title: '주의사항', description: '증상이 악화되면 즉시 병원을 방문하세요.' },
        { step: 5, title: '응급 상황', description: '호흡 곤란, 의식 저하, 심한 구토/설사 시 즉시 응급실로 가세요.' }
      ];
    }
  };

  const steps = getTreatmentSteps();
  const recoveryTime = diagnosisResult?.emergency === 'low' ? '3-5일' :
                       diagnosisResult?.emergency === 'medium' ? '5-7일' : '병원 치료 후 확인';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0891b2',
            fontWeight: '600',
            fontSize: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ← 이전으로
        </button>
        <button
          onClick={onBack}
          style={{
            color: '#9ca3af',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* 스크롤 가능한 본문 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        paddingBottom: '100px'
      }}>
        {/* 타이틀 헤더 카드 */}
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <img
                src={PROFILE_IMAGES[petData?.species] || PROFILE_IMAGES.dog}
                alt={petData?.species || 'pet'}
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 4px 0',
              lineHeight: '1.3'
            }}>
              {petData?.petName || petData?.name || '반려동물'}의 치료 가이드
            </h2>
            {diagnosisResult && (
              <p style={{
                fontSize: '13px',
                opacity: 0.9,
                margin: 0
              }}>
                {typeof diagnosisResult.diagnosis === 'string' ? diagnosisResult.diagnosis : (diagnosisResult.diagnosis?.name || '')}
              </p>
            )}
          </div>
        </div>

        {/* 단계별 치료 방법 */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1e293b',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#0ea5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontSize: '12px' }}>📋</span>
            </span>
            단계별 치료 방법
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #7dd3fc'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {item.step}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0369a1',
                    margin: '0 0 4px 0'
                  }}>
                    {item.title}
                  </h4>
                  <p style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {diagnosisResult && (
          <>
            {/* 예상 회복 기간 */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#64748b',
                margin: '0 0 8px 0'
              }}>
                예상 회복 기간
              </h3>
              <p style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#0ea5e9',
                margin: 0
              }}>
                {recoveryTime}
              </p>
            </div>

            {/* 주의사항 */}
            <div style={{
              background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              border: '2px solid #facc15',
              boxShadow: '0 2px 8px rgba(250, 204, 21, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#eab308',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '16px' }}>!</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#a16207',
                    margin: '0 0 8px 0'
                  }}>
                    주의사항
                  </h4>
                  <div style={{
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <p style={{ fontSize: '13px', color: '#854d0e', lineHeight: '1.5', margin: 0 }}>
                      증상이 악화되거나 새로운 증상이 나타나면 즉시 병원을 방문하세요.
                    </p>
                    <p style={{ fontSize: '13px', color: '#854d0e', lineHeight: '1.5', margin: 0 }}>
                      처방전 없이 사람 약물을 사용하지 마세요.
                    </p>
                    <p style={{ fontSize: '13px', color: '#854d0e', lineHeight: '1.5', margin: 0 }}>
                      응급 상황(호흡 곤란, 의식 저하, 심한 출혈 등)은 즉시 응급실로 가세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 일일 체크리스트 */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  margin: 0
                }}>
                  일일 체크리스트
                </h3>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0ea5e9'
                }}>
                  {completedCount}/{totalCount} 완료
                </span>
              </div>

              {/* 진행 막대 */}
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e2e8f0',
                borderRadius: '4px',
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checklist.map(item => (
                  <label key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: item.checked ? '#e0f2fe' : '#f8fafc',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: item.checked ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      border: item.checked ? 'none' : '2px solid #cbd5e1',
                      background: item.checked ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.checked && (
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleChecklistChange(item.id)}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: item.checked ? '#0369a1' : '#475569',
                      textDecoration: item.checked ? 'line-through' : 'none',
                      flex: 1
                    }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>

              {saveMessage && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#e0f2fe',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#0ea5e9',
                  fontWeight: '500'
                }}>
                  {saveMessage}
                </div>
              )}

              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                textAlign: 'center',
                margin: '12px 0 0 0'
              }}>
                체크 시 자동 저장됩니다
              </p>
            </div>
          </>
        )}

        {/* 푸터 로고 */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <img
              src={`${import.meta.env.BASE_URL}icon/login/logo.png`}
              alt="PetMedical.AI"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#475569' }}>PetMedical.AI</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            반려동물 건강 관리의 새로운 기준
          </p>
        </div>
      </div>

      {/* 하단 고정 버튼 영역 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e2e8f0',
        zIndex: 100
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(71, 85, 105, 0.3)'
            }}
          >
            ← 진단서로 돌아가기
          </button>
          <button
            onClick={handleGoToHospital}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
          >
            🏥 병원 예약하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 유틸리티 함수 ============
const getEmergencyColor = (emergency) => {
  switch(emergency) {
    case 'low':
    case 'Low': return '#4caf50';
    case 'medium':
    case 'Moderate': return '#ff9800';
    case 'high':
    case 'High':
    case 'Emergency': return '#f44336';
    default: return '#666';
  }
};

// ============ 테스트 모드 체크 ============
// ============ 메인 앱 ============
function App() {
  // 인증 상태
  const [authScreen, setAuthScreen] = useState('login'); // 'login', 'register', null (로그인됨)
  const [currentUser, setCurrentUser] = useState(null);
  const [userMode, setUserMode] = useState('guardian'); // 'guardian' or 'clinic'
  const [hasClinicAccess, setHasClinicAccess] = useState(false); // 실제 병원 데이터 접근 가능 여부

  const [currentTab, setCurrentTab] = useState('care');
  const [currentView, setCurrentView] = useState(null); // 모달/서브 화면용
  const [petData, setPetData] = useState(null);
  const [diagnosisMode, setDiagnosisMode] = useState('ai'); // 'ai' | 'clinic'
  const [pets, setPets] = useState([]);
  const [symptomData, setSymptomData] = useState(null);
  const [lastDiagnosis, setLastDiagnosis] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalPacket, setHospitalPacket] = useState(null);

  // 모드 변경 함수
  const handleModeSwitch = (mode) => {
    setUserMode(mode);
    setCurrentView(null);
    setCurrentTab('care');
    // userMode를 localStorage에 저장
    localStorage.setItem('petMedical_userMode', mode);
    if (currentUser) {
      const updatedUser = { ...currentUser, userMode: mode };
      setCurrentUser(updatedUser);
    }
  };

  // 홈으로 이동 함수
  const handleGoHome = () => {
    setCurrentView(null);
    setCurrentTab('care');
  };

  useEffect(() => {
    // 기존 로그인 세션 확인
    const loadSession = async () => {
      const savedSession = await getAuthSession();
    if (savedSession) {
      setCurrentUser(savedSession);

        // 실제 병원 데이터가 있는지 확인
        let mode = savedSession.userMode || 'guardian';
        let clinicAccess = false;

        if ((savedSession.roles && savedSession.roles.length > 0) || savedSession.defaultClinicId) {
          try {
            const userClinics = await getUserClinics(savedSession.uid);
            clinicAccess = userClinics && userClinics.length > 0;

            if (clinicAccess) {
              mode = 'clinic';
            } else {
              console.warn('사용자에게 roles는 있지만 실제 병원 데이터가 없습니다. guardian 모드로 유지합니다.');
            }
          } catch (error) {
            console.error('병원 정보 확인 실패:', error);
            clinicAccess = false;
          }
        }

        setHasClinicAccess(clinicAccess);

        // localStorage에서 userMode 복원 (우선순위: localStorage > 자동감지 > 기본값)
        // 단, 병원 모드로 전환하려면 실제 병원 데이터가 있어야 함
        const savedUserMode = localStorage.getItem('petMedical_userMode');
        if (savedUserMode === 'clinic' && !clinicAccess) {
          console.warn('저장된 모드는 clinic이지만 병원 데이터가 없어 guardian 모드로 전환합니다.');
          setUserMode('guardian');
        } else {
          setUserMode(savedUserMode || mode);
        }

      setAuthScreen(null);

      // 로그인된 사용자의 반려동물 데이터 로드
      const userPets = getPetsForUser(savedSession.uid);
      setPets(userPets);
      if (userPets.length > 0) {
        setPetData(userPets[0]);
        }
      }
    }
    // 등록 화면 없이 바로 대시보드로 (등록은 마이페이지에서)
    setCurrentTab('care');

    // 브라우저 콘솔용 테스트 데이터 시드 함수 등록
    window.auth = auth;
    window.seedGuardianData = async (uid, email) => {
      try {
        const result = await seedGuardianData(uid, email);
        console.log('✅ 시드 완료:', result);
        return result;
      } catch (error) {
        console.error('❌ 시드 오류:', error);
        throw error;
      }
    };
    window.seedClinicData = async (uid, email) => {
      try {
        const result = await seedClinicData(uid, email);
        console.log('✅ 시드 완료:', result);
        return result;
      } catch (error) {
        console.error('❌ 시드 오류:', error);
        throw error;
      }
    };
    window.seedMedicationData = async (uid) => {
      try {
        const result = await seedMedicationData(uid);
        console.log('✅ 약물 처방 정보 추가 완료:', result);
        return result;
      } catch (error) {
        console.error('❌ 약물 처방 정보 추가 오류:', error);
        throw error;
      }
    };
    
    // 테스트 계정 반려동물 정리 함수 (뿌꾸, 몽미, 도마만 유지)
    window.cleanupTestPets = async (userId = null) => {
      try {
        const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
        const { db } = await import('./src/lib/firebase');
        
        const targetUserId = userId || currentUser?.uid;
        if (!targetUserId) {
          console.error('❌ 사용자 ID가 필요합니다.');
          return;
        }
        
        const KEEP_PETS = ['뿌꾸', '몽미', '도마'];
        const petsRef = collection(db, 'pets');
        const petsQuery = query(petsRef, where('userId', '==', targetUserId));
        const petsSnapshot = await getDocs(petsQuery);
        
        if (petsSnapshot.empty) {
          console.log('✅ 삭제할 반려동물이 없습니다.');
          return;
        }
        
        console.log(`\n📋 총 ${petsSnapshot.size}마리의 반려동물 발견\n`);
        
        const petsToDelete = [];
        petsSnapshot.forEach((petDoc) => {
          const petData = petDoc.data();
          const petName = petData.petName || petData.name || '';
          const petId = petDoc.id;
          
          if (!KEEP_PETS.includes(petName)) {
            petsToDelete.push({ id: petId, name: petName });
            console.log(`  ❌ 삭제 예정: ${petName} (${petData.species || '종류 미상'})`);
          } else {
            console.log(`  ✅ 유지: ${petName} (${petData.species || '종류 미상'})`);
          }
        });
        
        if (petsToDelete.length > 0) {
          console.log(`\n🗑️  ${petsToDelete.length}마리 삭제 중...\n`);
          for (const pet of petsToDelete) {
            try {
              await deleteDoc(doc(db, 'pets', pet.id));
              console.log(`  ✅ 삭제 완료: ${pet.name}`);
            } catch (error) {
              console.error(`  ❌ 삭제 실패: ${pet.name}`, error.message);
            }
          }
          console.log(`\n✅ 정리 완료!`);
        } else {
          console.log(`\n✅ 삭제할 반려동물이 없습니다.`);
        }
      } catch (error) {
        console.error('❌ 정리 오류:', error);
        throw error;
      }
    };
    
    console.log('💡 테스트 데이터 시드 함수가 등록되었습니다.');
    console.log('   사용법: const user = window.auth.currentUser; await window.seedGuardianData(user.uid, user.email);');
    console.log('   약물 처방 정보 추가: await window.seedMedicationData(user.uid);');
    console.log('   반려동물 정리 (뿌꾸, 몽미, 도마만 유지): await window.cleanupTestPets();');
  }, []);

  // 로그인 성공 핸들러
  const handleLogin = async (user) => {
    // 실제 병원 데이터가 있는지 확인
    let mode = user.userMode || 'guardian';
    let clinicAccess = false;

    if ((user.roles && user.roles.length > 0) || user.defaultClinicId) {
      try {
        const userClinics = await getUserClinics(user.uid);
        clinicAccess = userClinics && userClinics.length > 0;

        if (clinicAccess) {
          mode = 'clinic';
        } else {
          console.warn('로그인: 사용자에게 roles는 있지만 실제 병원 데이터가 없습니다. guardian 모드로 유지합니다.');
        }
      } catch (error) {
        console.error('병원 정보 확인 실패:', error);
        clinicAccess = false;
      }
    }

    setHasClinicAccess(clinicAccess);
    setCurrentUser(user);
    setUserMode(mode);
    setAuthScreen(null);

    // userMode를 localStorage에 저장
    localStorage.setItem('petMedical_userMode', mode);

    // 로그인한 사용자의 반려동물 데이터 로드
    const userPets = getPetsForUser(user.uid);
    setPets(userPets);
    if (userPets.length > 0) {
      setPetData(userPets[0]);
    } else {
      setPetData(null);
    }

    // 푸시 알림 권한 요청 및 토큰 저장
    try {
      await requestPushPermission(user.uid);
      console.log('✅ 푸시 알림 설정 완료');
    } catch (error) {
      console.warn('푸시 알림 설정 실패:', error);
    }

    // 포그라운드 메시지 핸들러 설정
    setupForegroundMessageHandler((payload) => {
      console.log('포그라운드 푸시 알림 수신:', payload);
      // 브라우저 알림 표시
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.notification?.title || payload.data?.title || '알림', {
          body: payload.notification?.body || payload.data?.body || '',
          icon: PROFILE_IMAGES.dog,
          tag: payload.data?.type || 'notification',
          data: payload.data || {}
        });
      }
    });
  };

  // 회원가입 성공 핸들러
  const handleRegister = async (user) => {
    // 실제 병원 데이터가 있는지 확인
    let mode = user.userMode || 'guardian';
    let clinicAccess = false;

    if ((user.roles && user.roles.length > 0) || user.defaultClinicId) {
      try {
        const userClinics = await getUserClinics(user.uid);
        clinicAccess = userClinics && userClinics.length > 0;

        if (clinicAccess) {
          mode = 'clinic';
        } else {
          console.warn('회원가입: 사용자에게 roles는 있지만 실제 병원 데이터가 없습니다. guardian 모드로 유지합니다.');
        }
      } catch (error) {
        console.error('병원 정보 확인 실패:', error);
        clinicAccess = false;
      }
    }

    setHasClinicAccess(clinicAccess);
    setCurrentUser(user);
    setUserMode(mode);
    setAuthScreen(null);

    // 새 사용자는 데이터 초기화
    setPets([]);
    setPetData(null);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    clearAuthSession();
    localStorage.removeItem('petMedical_userMode');
    setCurrentUser(null);
    setUserMode('guardian');
    setHasClinicAccess(false);
    setPets([]);
    setPetData(null);
    setAuthScreen('login');
  };

  // 로그인 없이 바로 입장 (테스트용) - 선택한 모드의 테스트 계정으로 자동 로그인
  const handleSkipLogin = async (selectedMode = 'guardian') => {
    
    // 선택한 모드에 따라 테스트 계정 정보 설정
    const testAccounts = {
      guardian: {
        email: 'guardian@test.com',
        password: 'test1234',
        displayName: '테스트 보호자'
      },
      clinic: {
        email: 'clinic@happyvet.com',
        password: 'test1234',
        displayName: '테스트 병원'
      }
    };

    const testAccount = testAccounts[selectedMode] || testAccounts.guardian;

    try {
      // 테스트 계정으로 자동 로그인
      const { authService } = await import('./src/services/firebaseAuth');
      const loginResult = await authService.login(testAccount.email, testAccount.password);

      if (loginResult.success) {
        // 로그인 성공 - handleLogin과 동일한 로직 사용
        const user = loginResult.user;
        
        // 실제 병원 데이터가 있는지 확인
        let mode = user.userMode || selectedMode;
        let clinicAccess = false;

        if ((user.roles && user.roles.length > 0) || user.defaultClinicId) {
          try {
            const userClinics = await getUserClinics(user.uid);
            clinicAccess = userClinics && userClinics.length > 0;

            if (clinicAccess) {
              mode = 'clinic';
            } else {
              console.warn('테스트 로그인: 사용자에게 roles는 있지만 실제 병원 데이터가 없습니다. guardian 모드로 유지합니다.');
            }
          } catch (error) {
            console.error('병원 정보 확인 실패:', error);
            clinicAccess = false;
          }
        }

        setHasClinicAccess(clinicAccess);
        setCurrentUser(user);
        setUserMode(mode);
        setAuthScreen(null);

        // userMode를 localStorage에 저장
        localStorage.setItem('petMedical_userMode', mode);

        // 로그인한 사용자의 반려동물 데이터 로드 (Firestore 우선)
        let userPets = [];
        try {
          // Firestore에서 동물 데이터 가져오기
          const petsResult = await petService.getPetsByUser(user.uid);
          if (petsResult.success && petsResult.data && petsResult.data.length > 0) {
            userPets = petsResult.data;
            // localStorage에도 저장 (오프라인 지원)
            savePetsForUser(user.uid, userPets);
            console.log(`✅ Firestore에서 ${userPets.length}마리 반려동물 로드 완료`);
          } else {
            // Firestore에 데이터가 없으면 localStorage 확인
            userPets = getPetsForUser(user.uid);
            
            // 보호자 모드이고 동물 데이터가 없으면 시드 데이터 생성
            // 단, Firestore에서도 확인하여 정말 없을 때만 생성 (중복 생성 방지)
            if (mode === 'guardian' && userPets.length === 0) {
              // Firestore에서 다시 한 번 확인 (localStorage와 동기화 문제 방지)
              try {
                const firestoreCheck = await petService.getPetsByUser(user.uid);
                if (firestoreCheck.success && firestoreCheck.data && firestoreCheck.data.length > 0) {
                  console.log(`✅ Firestore에서 ${firestoreCheck.data.length}마리 반려동물 발견, 시드 데이터 생성 스킵`);
                  userPets = firestoreCheck.data;
                  savePetsForUser(user.uid, userPets);
                } else {
                  // 정말 없을 때만 시드 데이터 생성
                  console.log('🐾 보호자 테스트 계정: 동물 데이터 자동 생성 중...');
                  await seedGuardianData(user.uid, user.email);
                  // 시드 데이터 생성 후 다시 Firestore에서 가져오기
                  const seedResult = await petService.getPetsByUser(user.uid);
                  if (seedResult.success && seedResult.data && seedResult.data.length > 0) {
                    userPets = seedResult.data;
                    savePetsForUser(user.uid, userPets);
                    console.log(`✅ 시드 데이터 생성 완료: ${userPets.length}마리 반려동물`);
                  }
                }
              } catch (seedError) {
                console.warn('시드 데이터 생성 실패:', seedError);
              }
            }
          }
        } catch (error) {
          console.warn('동물 데이터 로드 실패, localStorage 확인:', error);
          userPets = getPetsForUser(user.uid);
        }

        // 테스트 계정 보호자: 불필요한 반려동물 자동 정리 (뿌꾸, 몽미, 도마만 유지)
        // 반려동물이 있든 없든 항상 실행 (조건 밖으로 이동)
        if (mode === 'guardian' && (user.email === 'guardian@test.com' || user.email?.includes('test'))) {
          // 백그라운드에서 비동기로 실행 (UI 블로킹 방지)
          (async () => {
            try {
              const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
              const { db } = await import('./src/lib/firebase');
              
              const KEEP_PETS = ['뿌꾸', '몽미', '도마'];
              const petsRef = collection(db, 'pets');
              const petsQuery = query(petsRef, where('userId', '==', user.uid));
              const petsSnapshot = await getDocs(petsQuery);
              
              if (!petsSnapshot.empty) {
                const petsToDelete = [];
                petsSnapshot.forEach((petDoc) => {
                  const petData = petDoc.data();
                  const petName = petData.petName || petData.name || '';
                  if (!KEEP_PETS.includes(petName)) {
                    petsToDelete.push({ id: petDoc.id, name: petName });
                  }
                });
                
                if (petsToDelete.length > 0) {
                  console.log(`🧹 테스트 계정 반려동물 정리: ${petsToDelete.length}마리 삭제 중...`);
                  for (const pet of petsToDelete) {
                    try {
                      await deleteDoc(doc(db, 'pets', pet.id));
                      console.log(`  ✅ 삭제 완료: ${pet.name}`);
                    } catch (error) {
                      console.warn(`  ⚠️ 삭제 실패: ${pet.name}`, error.message);
                    }
                  }
                  console.log(`✅ 반려동물 정리 완료 (뿌꾸, 몽미, 도마만 유지)`);
                  
                  // 삭제 후 반려동물 목록 다시 로드
                  const updatedPetsResult = await petService.getPetsByUser(user.uid);
                  if (updatedPetsResult.success && updatedPetsResult.data) {
                    const updatedPets = updatedPetsResult.data;
                    setPets(updatedPets);
                    savePetsForUser(user.uid, updatedPets);
                    if (updatedPets.length > 0) {
                      setPetData(updatedPets[0]);
                    } else {
                      setPetData(null);
                    }
                  }
                } else {
                  // 삭제할 것이 없으면 기존 데이터 그대로 사용
                  setPets(userPets);
                  if (userPets.length > 0) {
                    setPetData(userPets[0]);
                  } else {
                    setPetData(null);
                  }
                }
              } else {
                // 반려동물이 없으면 기존 데이터 그대로 사용
                setPets(userPets);
                setPetData(null);
              }
            } catch (cleanupError) {
              console.warn('반려동물 정리 실패:', cleanupError);
              // 오류 발생 시 기존 데이터 그대로 사용
              setPets(userPets);
              if (userPets.length > 0) {
                setPetData(userPets[0]);
              } else {
                setPetData(null);
              }
            }
          })();
        } else {
          // 테스트 계정이 아니면 기존 로직 그대로
          setPets(userPets);
          if (userPets.length > 0) {
            setPetData(userPets[0]);
          } else {
            setPetData(null);
          }
        }
        
        // 테스트 계정 보호자: 약물 정보 자동 추가
        if (mode === 'guardian' && (user.email === 'guardian@test.com' || user.email?.includes('test'))) {
          // 약물 정보 조회는 백그라운드에서 비동기로 실행 (프로필 등록 블로킹 방지)
          (async () => {
            try {
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              const { db } = await import('./src/lib/firebase');
              const medicationQuery = query(
                collection(db, 'medicationLogs'),
                where('userId', '==', user.uid)
              );
              const medicationSnapshot = await getDocs(medicationQuery);
              
              // 약물 정보가 10개 미만일 때만 자동 추가 (불필요한 조회 방지)
              if (medicationSnapshot.size < 10) {
                console.log('💊 테스트 계정: 약물 처방 정보 자동 추가 중...');
                await seedMedicationData(user.uid);
                console.log('✅ 약물 처방 정보 추가 완료');
              } else {
                console.log(`✅ 기존 약물 처방 정보 ${medicationSnapshot.size}개 확인됨`);
              }
            } catch (medError) {
              console.warn('약물 처방 정보 확인/추가 실패:', medError);
            }
          })();
        }

        // 푸시 알림 권한 요청 및 토큰 저장
        try {
          await requestPushPermission(user.uid);
          console.log('✅ 푸시 알림 설정 완료');
        } catch (error) {
          console.warn('푸시 알림 설정 실패:', error);
        }
      } else {
        // 로그인 실패 시 게스트 모드로 fallback
        console.warn('테스트 계정 로그인 실패, 게스트 모드로 전환:', loginResult.error);
        const guestUser = {
          uid: `guest_${selectedMode}_${Date.now()}`,
          email: `guest@test.com`,
          displayName: testAccount.displayName,
          userMode: selectedMode
        };
        setCurrentUser(guestUser);
        setUserMode(selectedMode);
        setAuthScreen(null);
      }
    } catch (error) {
      console.error('테스트 계정 로그인 오류:', error);
      // 오류 발생 시 게스트 모드로 fallback
      const guestUser = {
        uid: `guest_${selectedMode}_${Date.now()}`,
        email: `guest@test.com`,
        displayName: testAccount.displayName,
        userMode: selectedMode
      };
      setCurrentUser(guestUser);
      setUserMode(selectedMode);
      setAuthScreen(null);
    }
  };

  // 인증 화면 렌더링
  if (authScreen === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoToRegister={() => setAuthScreen('register')}
        onSkipLogin={handleSkipLogin}
      />
    );
  }

  if (authScreen === 'register') {
    return (
      <RegisterScreen
        onRegister={handleRegister}
        onGoToLogin={() => setAuthScreen('login')}
      />
    );
  }

  const handleRegistrationComplete = (data) => {
    // 현재 사용자의 반려동물 데이터 로드
    if (currentUser?.uid) {
      const updatedPets = getPetsForUser(currentUser.uid);
      setPets(updatedPets);
    }
    setPetData(data);
    setCurrentView(null);
    setCurrentTab('care');
  };

  const handleSelectPet = (pet) => {
    setPetData(pet);
    setCurrentView(null);
    setCurrentTab('care');

    // 해당 반려동물의 최신 진단 기록 로드
    if (pet?.id) {
      try {
        const stored = localStorage.getItem(DIAGNOSIS_KEY);
        if (stored) {
          const allDiagnoses = JSON.parse(stored);
          const petDiagnoses = allDiagnoses
            .filter(d => d.petId === pet.id)
            .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
          if (petDiagnoses.length > 0) {
            setLastDiagnosis(petDiagnoses[0]);
          }
        }
      } catch (err) {
        console.error('진단 기록 로드 실패:', err);
      }
    }
  };

  const handleSymptomSubmit = (data) => {
    setSymptomData(data);
    setCurrentView('diagnosis');
    setCurrentTab(null); // 진단 중에는 탭 숨김
  };

  const handleDiagnosisComplete = (action, diagnosisResult) => {
    if (diagnosisResult) {
      setLastDiagnosis(diagnosisResult);
    }
    if (action === 'treatment') {
      setCurrentView('treatment');
    } else if (action === 'hospital') {
      setCurrentTab('hospital');
      setCurrentView(null);
    } else {
      setCurrentView(null);
      setCurrentTab('care');
    }
  };

  const handleTabChange = (tabId) => {
    setCurrentView(null);
    
    // 탭별 초기화
    if (tabId === 'diagnosis') {
      setCurrentView('symptom-input');
      setCurrentTab(null);
    } else {
      setCurrentTab(tabId);
    }
    // hospital 탭은 조건 없이 항상 표시 (내부에서 lastDiagnosis 체크)
  };
  
  return (
    <div className="App app-root">
      {/* 플로팅 배경 효과 */}
      <FloatingBackground variant="default" />

      {/* 병원 모드일 때 ClinicDashboard 표시 */}
      {userMode === 'clinic' && !currentView && currentUser && (
        <ClinicDashboard
          currentUser={currentUser}
          onBack={() => {
            // 보호자 모드로 전환
            handleModeSwitch('guardian');
          }}
          onLogout={() => {
            handleLogout();
          }}
          onModeSwitch={() => handleModeSwitch('guardian')}
          onHome={handleGoHome}
        />
      )}

      {/* 보호자 모드 또는 특정 뷰가 있을 때 */}
      {(userMode === 'guardian' || currentView) && (
        <>
      {currentView === 'registration' && (
        <ProfileRegistration
          onComplete={handleRegistrationComplete}
          userId={currentUser?.uid}
        />
      )}
      
      {currentView === 'profile-list' && (
        <ProfileList
          pets={pets}
          onSelectPet={handleSelectPet}
          onAddNew={() => setCurrentView('registration')}
          onNavigate={(view) => setCurrentView(view)}
        />
      )}
      
      {/* dashboard는 탭 기반으로 이동 */}

      {currentView === 'symptom-input' && (
        <SymptomInput
          petData={petData}
          onComplete={handleSymptomSubmit}
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onRegister={() => setCurrentView('registration')}
        />
      )}
      
      {currentView === 'diagnosis' && petData && symptomData && (
        <MultiAgentDiagnosis 
          petData={petData}
          symptomData={symptomData}
          currentUser={currentUser}
          onComplete={(action) => handleDiagnosisComplete(action, lastDiagnosis)}
          onBack={() => setCurrentView('symptom-input')}
          onDiagnosisResult={(result) => setLastDiagnosis(result)}
        />
      )}

      {currentView === 'treatment' && petData && (
        <HomeTreatmentGuide
          petData={petData}
          diagnosisResult={lastDiagnosis}
          onBack={() => setCurrentView('diagnosis-result')}
          onGoToHospital={() => {
            setCurrentView(null);
            setCurrentTab('hospital');
          }}
        />
      )}

      {/* 진단 결과만 보기 (재진단 없이) */}
      {currentView === 'diagnosis-result' && petData && lastDiagnosis && (
        <DiagnosisResultView
          petData={petData}
          diagnosisResult={lastDiagnosis}
          symptomData={symptomData}
          onGoToTreatment={() => setCurrentView('treatment')}
          onGoToHospital={() => {
            setCurrentTab('hospital');
            setCurrentView(null);
          }}
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
        />
      )}

      {currentView === 'hospital' && petData && (
        <HospitalBooking
          petData={petData}
          diagnosis={lastDiagnosis || null}
          symptomData={symptomData || null}
          currentUser={currentUser}
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onHome={handleGoHome}
          onGoToMyBookings={() => {
            setCurrentView(null);
            setCurrentTab('mypage');
            localStorage.setItem('mypage_initialTab', 'bookings');
            setTimeout(() => {
              const event = new CustomEvent('mypage-set-tab', { detail: 'bookings' });
              window.dispatchEvent(event);
            }, 100);
          }}
          onSelectHospital={async (hospital) => {
            setSelectedHospital(hospital);
            if (lastDiagnosis) {
              try {
                const packet = await generateHospitalPacket(petData, lastDiagnosis, symptomData);
                setHospitalPacket(packet);
                setCurrentView('hospital-review');
              } catch (error) {
                console.error('패킷 생성 오류:', error);
              }
            }
          }}
        />
      )}

      {/* 진단서 검토 화면 */}
      {currentView === 'hospital-review' && petData && lastDiagnosis && selectedHospital && hospitalPacket && (
        <HospitalPacketReview
          petData={petData}
          diagnosis={lastDiagnosis}
          hospital={selectedHospital}
          hospitalPacket={hospitalPacket}
          onBack={() => setCurrentView('hospital')}
          onEdit={() => setCurrentView('hospital')}
          onSend={(packet) => {
            // 패킷 전송 로직 (실제로는 API 호출)
            console.log('패킷 전송:', packet);
            setCurrentView('hospital-sent');
          }}
          onSave={(packet) => {
            // 진단서만 저장
            console.log('진단서 저장:', packet);
            setCurrentView(null);
            setCurrentTab('care');
          }}
        />
      )}

      {/* 전송 완료 화면 */}
      {currentView === 'hospital-sent' && petData && selectedHospital && (
        <PacketSentSummary
          petData={petData}
          hospital={selectedHospital}
          bookingDate={selectedHospital.bookingDate}
          bookingTime={selectedHospital.bookingTime}
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
            setSelectedHospital(null);
            setHospitalPacket(null);
          }}
          onHome={() => {
            setCurrentView(null);
            setCurrentTab('care');
            setSelectedHospital(null);
            setHospitalPacket(null);
          }}
          onGetDirections={() => {
            // 카카오맵 길찾기 열기
            const url = `https://map.kakao.com/link/to/${selectedHospital.name},${selectedHospital.lat},${selectedHospital.lng}`;
            window.open(url, '_blank');
          }}
        />
      )}

      {currentView === 'mypage' && (
        <MyPage
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onHome={handleGoHome}
          onSelectPet={(pet) => {
            setPetData(pet);
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onViewDiagnosis={(diagnosis) => {
            setLastDiagnosis(diagnosis);
            // source에 따라 mode 설정
            if (diagnosis.source === 'clinic') {
              setDiagnosisMode('clinic');
            } else {
              setDiagnosisMode('ai');
            }
            // 진단서를 보기 위해 해당 반려동물 찾기
            const pet = diagnosis.pet || pets.find(p => p.id === diagnosis.petId);
            if (pet) {
              setPetData(pet);
            }
            setCurrentView('diagnosis-view');
          }}
          onClinicMode={() => setCurrentView('clinic-admin')}
          userId={currentUser?.uid}
          onPetsUpdate={(updatedPets) => {
            setPets(updatedPets);
            // 현재 선택된 반려동물도 업데이트
            if (petData?.id) {
              const updatedPet = updatedPets.find(p => p.id === petData.id);
              if (updatedPet) {
                setPetData(updatedPet);
              }
            }
          }}
        />
      )}

      {currentView === 'diagnosis-view' && petData && lastDiagnosis && (
        <DiagnosisReport
          petData={petData}
          diagnosisResult={lastDiagnosis}
          symptomData={symptomData}
          userData={currentUser}
          mode={diagnosisMode}
          onClose={() => setCurrentView('mypage')}
          onGoToHospital={() => {
            setSymptomData({ symptomText: lastDiagnosis.symptom || lastDiagnosis.description });
            setCurrentTab('hospital');
            setCurrentView(null);
          }}
          onGoToTreatment={() => {
            setCurrentTab('care');
            setCurrentView(null);
          }}
        />
      )}

      {/* 기존 커스텀 UI는 제거하고 DiagnosisReport 사용 */}
      {false && currentView === 'diagnosis-view-old' && petData && lastDiagnosis && (
        <div className="page-container">
          {/* Header */}
          <div className="page-header">
            <div className="flex size-12 shrink-0 items-center">
              <button onClick={() => setCurrentView('mypage')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
                <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
              </button>
            </div>
            <h2 className="text-slate-800 text-lg font-bold flex-1 text-center">진단서 상세</h2>
            <div className="flex size-12 shrink-0 items-center justify-end"></div>
          </div>

          <div className="px-4 pt-4 pb-24 space-y-4">
            {/* 진단 날짜 */}
            <div className="text-center text-sm text-slate-500">
              {new Date(lastDiagnosis.created_at || lastDiagnosis.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>

            {/* 반려동물 정보 카드 */}
            <div className="bg-surface-light rounded-lg p-4 shadow-soft border border-slate-200">
              <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                <span className="material-symbols-outlined text-primary">pets</span>
                반려동물 정보
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 overflow-hidden">
                  <img
                    src={getPetImage(petData, false)}
                    alt={petData.petName || '반려동물'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">이름</span>
                    <p className="font-medium text-slate-900">{petData.petName || '미상'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">나이</span>
                    <p className="font-medium text-slate-900">
                      {petData.birthDate ? (() => {
                        const birth = new Date(petData.birthDate);
                        const today = new Date();
                        const age = today.getFullYear() - birth.getFullYear();
                        return `${age}세`;
                      })() : '미상'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">대표동물종류</span>
                    <p className="font-medium text-slate-900">{SPECIES_LABELS_APP[petData.species] || '기타'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">세부동물종류</span>
                    <p className="font-medium text-slate-900">{petData.breed || '미상'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 진단 결과 카드 */}
            <div className="bg-surface-light rounded-lg p-4 shadow-soft border border-slate-200">
              <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                <span className="material-symbols-outlined text-primary">diagnosis</span>
                진단 결과
              </h3>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-slate-900 flex-1">
                  {typeof lastDiagnosis.diagnosis === 'string'
                    ? lastDiagnosis.diagnosis
                    : (lastDiagnosis.diagnosis?.name || lastDiagnosis.suspectedConditions?.[0]?.name || '일반 건강 이상')}
                </p>
                <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
                  lastDiagnosis.riskLevel === 'High' || lastDiagnosis.emergency === 'high' ? 'bg-red-100 text-red-600' :
                  lastDiagnosis.riskLevel === 'Moderate' || lastDiagnosis.emergency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-600'
                }`}>
                  {lastDiagnosis.riskLevel === 'Low' || lastDiagnosis.emergency === 'low' ? '경미' :
                   lastDiagnosis.riskLevel === 'Moderate' || lastDiagnosis.emergency === 'medium' ? '보통' :
                   lastDiagnosis.riskLevel === 'High' || lastDiagnosis.emergency === 'high' ? '응급' : '보통'}
                </span>
              </div>
            </div>

            {/* 상세 설명 */}
            {lastDiagnosis.description && (
              <div className="bg-surface-light rounded-lg p-4 shadow-soft border border-slate-200">
                <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                  <span className="material-symbols-outlined text-primary">description</span>
                  상세 설명
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">{lastDiagnosis.description}</p>
              </div>
            )}

            {/* 조치 사항 */}
            {lastDiagnosis.actions && lastDiagnosis.actions.length > 0 && (
              <div className="bg-surface-light rounded-lg p-4 shadow-soft border border-slate-200">
                <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                  <span className="material-symbols-outlined text-primary">medication</span>
                  즉시 조치 사항
                </h3>
                <ul className="space-y-2">
                  {lastDiagnosis.actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="material-symbols-outlined text-green-500 text-base mt-0.5">check_circle</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 병원 방문 권장 */}
            {lastDiagnosis.hospitalVisit && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h3 className="flex items-center gap-2 text-orange-800 font-bold mb-2">
                  <span className="material-symbols-outlined">local_hospital</span>
                  병원 방문 권장
                </h3>
                <p className="text-orange-700 text-sm">
                  <strong>{lastDiagnosis.hospitalVisitTime || '24시간 내'}</strong> 병원 방문을 권장합니다.
                </p>
              </div>
            )}

            {/* 병원 예약 버튼 - 병원에 가지 않은 AI 진단인 경우 표시 */}
            {(!lastDiagnosis.visitedHospital) && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                  <span className="material-symbols-outlined text-primary">event_available</span>
                  병원 예약
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  AI 진단 결과를 바탕으로 가까운 동물병원에 예약하세요. 진단서가 자동으로 전송됩니다.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSymptomData({ symptomText: lastDiagnosis.symptom || lastDiagnosis.description });
                      setCurrentTab('hospital');
                      setCurrentView(null);
                    }}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                  >
                    <span className="material-symbols-outlined">local_hospital</span>
                    병원 예약
                  </button>
                  <a
                    href="https://service.kakaomobility.com/launch/kakaot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-[#1E1B4B] text-white font-bold rounded-lg hover:bg-[#2d2a5a] transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-[#FACC15] font-black text-lg">T</span>
                    펫택시
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'history' && (
        <div className="history-container">
          <button className="back-btn" onClick={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}>← 뒤로</button>
          <h1>📋 진료 기록</h1>
          <div className="history-content">
            <p>마이페이지에서 확인하실 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* OCR 문서 스캔 화면 */}
      {currentView === 'ocr' && (
        <OCRUpload
          petData={petData}
          onBack={() => setCurrentView(null)}
          onSaveRecord={(record) => {
            console.log('의료 기록 저장됨:', record);
            // 필요시 상태 업데이트
          }}
        />
      )}

      {/* AI 케어 문진 화면 */}
      {currentView === 'ai-consultation' && petData && (
        <AICareConsultation
          petData={petData}
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onHome={handleGoHome}
        />
      )}

      {/* 병원 어드민 화면 */}
      {currentView === 'clinic-admin' && (
        <ClinicAdmin
          onBack={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onLogout={() => {
            setCurrentView(null);
            setCurrentTab('care');
          }}
          onModeSwitch={() => handleModeSwitch('guardian')}
          onHome={handleGoHome}
        />
      )}


      {/* 탭 기반 메인 화면 - 보호자 모드이고 currentView가 없을 때만 표시 */}
      {userMode === 'guardian' && !currentView && currentTab && (
        <div className="main-content" style={{ paddingBottom: '80px' }}>
          {/* 내 동물 돌보기 탭 */}
          {currentTab === 'care' && petData && (
            <Dashboard
              petData={petData}
              pets={pets}
              onNavigate={(view) => {
                // 'hospital', 'records'는 탭으로 이동
                if (view === 'hospital' || view === 'records') {
                  setCurrentTab(view);
                } else {
                  setCurrentView(view);
                }
              }}
              onSelectPet={handleSelectPet}
              onLogout={handleLogout}
            />
          )}

          {/* 병원예약하기 탭 */}
          {currentTab === 'hospital' && (
            petData ? (
              <HospitalBooking
                petData={petData}
                diagnosis={lastDiagnosis || null}
                symptomData={symptomData || null}
                currentUser={currentUser}
                onBack={() => setCurrentTab('care')}
                onHome={handleGoHome}
                onGoToMyBookings={() => {
                  setCurrentTab('mypage');
                  localStorage.setItem('mypage_initialTab', 'bookings');
                  setTimeout(() => {
                    const event = new CustomEvent('mypage-set-tab', { detail: 'bookings' });
                    window.dispatchEvent(event);
                  }, 100);
                }}
                onSelectHospital={async (hospital) => {
                  setSelectedHospital(hospital);
                  if (lastDiagnosis) {
                    try {
                      const packet = await generateHospitalPacket(petData, lastDiagnosis, symptomData);
                      setHospitalPacket(packet);
                      setCurrentView('hospital-review');
                    } catch (error) {
                      console.error('패킷 생성 오류:', error);
                    }
                  }
                }}
              />
            ) : (
              <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                    <img src={PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">반려동물을 등록해주세요</h2>
                  <button
                    onClick={() => setCurrentView('registration')}
                    className="mt-4 bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                  >
                    반려동물 등록하기
                  </button>
                </div>
              </div>
            )
          )}

          {/* 기록보기 탭 */}
          {currentTab === 'records' && petData && (
            <RecordsView
              petData={petData}
              pets={pets}
              onBack={() => setCurrentTab('care')}
              onHome={handleGoHome}
              onViewDiagnosis={(diagnosis) => {
                setLastDiagnosis(diagnosis);
                setCurrentView('diagnosis-view');
              }}
              onOCR={() => setCurrentView('ocr')}
              onHospitalBooking={() => setCurrentTab('hospital')}
              onSelectPet={handleSelectPet}
            />
          )}

          {/* 마이페이지 탭 */}
          {currentTab === 'mypage' && (
            <MyPage
              onBack={() => setCurrentTab('care')}
              onHome={handleGoHome}
              onAddPet={() => setCurrentView('registration')}
              onSelectPet={(pet) => {
                setPetData(pet);
                setCurrentTab('care');
              }}
              onViewDiagnosis={(diagnosis) => {
                setLastDiagnosis(diagnosis);
                // 메인에서 선택된 동물 유지 (데이터 일치를 위해 pet 변경하지 않음)
                localStorage.setItem('mypage_initialTab', 'records');
                setCurrentView('diagnosis-view-from-tab');
              }}
              onClinicMode={() => setCurrentView('clinic-admin')}
              userId={currentUser?.uid}
              onPetsUpdate={(updatedPets) => {
                setPets(updatedPets);
                // 현재 선택된 반려동물도 업데이트
                if (petData?.id) {
                  const updatedPet = updatedPets.find(p => p.id === petData.id);
                  if (updatedPet) {
                    setPetData(updatedPet);
                  }
                }
              }}
            />
          )}

          {/* 반려동물이 없을 때 - care 탭에서만 등록 유도 */}
          {!petData && currentTab === 'care' && (
            <div className="page-container">
              <div className="px-4 pt-8 pb-24">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                    <img src={PROFILE_ICON_IMAGES.other} alt="Pet" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">환영합니다!</h2>
                  <p className="text-slate-600">반려동물을 등록하고 AI 건강 관리를 시작하세요</p>
                </div>

                {/* 기능 소개 카드들 */}
                <div className="space-y-4 mb-8">
                  <div className="bg-surface-light p-4 rounded-lg shadow-soft border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">smart_toy</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">AI 증상 진단</h3>
                        <p className="text-sm text-slate-600">증상을 입력하면 AI가 분석해드려요</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-light p-4 rounded-lg shadow-soft border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-accent">local_hospital</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">병원 예약</h3>
                        <p className="text-sm text-slate-600">주변 동물병원 검색 및 예약</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-light p-4 rounded-lg shadow-soft border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">monitor_heart</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">건강 기록</h3>
                        <p className="text-sm text-slate-600">일일 케어 및 건강 상태 추적</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentView('registration')}
                  className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30"
                >
                  반려동물 등록하기
                </button>
              </div>
            </div>
          )}

          {/* 반려동물 없이 다른 탭 접근 시 */}
          {!petData && currentTab && currentTab !== 'care' && (
            <div className="page-container flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-5xl mb-4">🐾</div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">반려동물을 먼저 등록해주세요</h2>
                <button
                  onClick={() => setCurrentView('registration')}
                  className="mt-4 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  등록하러 가기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 하단 탭 네비게이션 - 보호자 모드에서 항상 표시 */}
      {userMode === 'guardian' && currentTab && (
        <BottomTabNavigation
          currentTab={currentTab}
          onTabChange={handleTabChange}
          onModeSwitch={() => handleModeSwitch('clinic')}
          showModeSwitch={!!currentUser}
          hideInDiagnosis={false}
        />
      )}
        </>
      )}
    </div>
  );
}

export default App
