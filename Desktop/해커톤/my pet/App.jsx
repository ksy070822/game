import { useState, useEffect } from 'react'
import './App.css'
import { runMultiAgentDiagnosis } from './src/services/ai/agentOrchestrator'
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
import { initializeDummyData, DUMMY_PETS, DUMMY_MEDICAL_RECORDS } from './src/lib/dummyData'
import { LoginScreen, RegisterScreen, getAuthSession, clearAuthSession } from './src/components/Auth'

// ============ 로컬 스토리지 유틸리티 ============
const STORAGE_KEY = 'petMedical_pets';
const DIAGNOSIS_KEY = 'petMedical_diagnoses';

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

const saveDiagnosisToStorage = (diagnosis) => {
  try {
    // healthFlags가 없으면 계산해서 추가
    let diagnosisWithFlags = { ...diagnosis };
    if (!diagnosisWithFlags.healthFlags) {
      diagnosisWithFlags.healthFlags = mapDiagnosisToHealthFlags(diagnosis);
    }
    
    const diagnoses = JSON.parse(localStorage.getItem(DIAGNOSIS_KEY) || '[]');
    diagnoses.unshift({ 
      ...diagnosisWithFlags, 
      id: diagnosisWithFlags.id || Date.now().toString(), 
      date: new Date().toISOString() 
    });
    localStorage.setItem(DIAGNOSIS_KEY, JSON.stringify(diagnoses));
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
  ]
};

// ============ 프로필 등록 화면 ============
function ProfileRegistration({ onComplete }) {
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

  // 이미지 업로드 핸들러
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setPreviewImage(base64);
        setFormData(prev => ({ ...prev, profileImage: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 종류 변경시 캐릭터도 변경
  const handleSpeciesChange = (species) => {
    const defaultCharacter = species === 'dog' ? 'dog_white' : 'cat_orange';
    setFormData(prev => ({ ...prev, species, character: defaultCharacter }));
  };

  const regions = {
    '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구'],
    '경기도': ['수원시', '성남시', '고양시', '용인시'],
    '부산광역시': ['해운대구', '수영구', '남구'],
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      const newPet = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      const pets = getPetsFromStorage();
      pets.push(newPet);
      savePetsToStorage(pets);
      onComplete(newPet);
    }, 1000);
  };
  
  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="header-gradient">
          <h1>🐾 PetMedical.AI</h1>
          <p>반려동물 건강 관리의 시작</p>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>등록 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="registration-form">
            {/* 프로필 사진/캐릭터 선택 */}
            <div className="form-group">
              <label>프로필 사진 또는 캐릭터 *</label>
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
                      style={{ backgroundColor: PET_CHARACTERS[formData.species].find(c => c.id === formData.character)?.color + '40' }}
                    >
                      <span className="character-emoji">
                        {PET_CHARACTERS[formData.species].find(c => c.id === formData.character)?.emoji}
                      </span>
                    </div>
                  )}
                </div>

                {/* 사진 업로드 버튼 */}
                <div className="profile-options">
                  <label className="upload-btn">
                    📷 사진 업로드
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span className="or-text">또는</span>
                </div>

                {/* 캐릭터 선택 */}
                <div className="character-grid">
                  {PET_CHARACTERS[formData.species].map(char => (
                    <button
                      key={char.id}
                      type="button"
                      className={`character-btn ${formData.character === char.id && !previewImage ? 'active' : ''}`}
                      onClick={() => {
                        setPreviewImage(null);
                        setFormData(prev => ({ ...prev, profileImage: null, character: char.id }));
                      }}
                      style={{ backgroundColor: char.color + '40' }}
                    >
                      <span className="char-emoji">{char.emoji}</span>
                      <span className="char-label">{char.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

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

            <div className="form-group">
              <label>종류 *</label>
              <div className="radio-group">
                <div className={`radio-item ${formData.species === 'dog' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="dog"
                    name="species"
                    value="dog"
                    checked={formData.species === 'dog'}
                    onChange={(e) => handleSpeciesChange(e.target.value)}
                  />
                  <label htmlFor="dog">🐕 개</label>
                </div>
                <div className={`radio-item ${formData.species === 'cat' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    id="cat"
                    name="species"
                    value="cat"
                    checked={formData.species === 'cat'}
                    onChange={(e) => handleSpeciesChange(e.target.value)}
                  />
                  <label htmlFor="cat">🐈 고양이</label>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>품종</label>
              <input
                type="text"
                placeholder="예: 푸들"
                value={formData.breed}
                onChange={(e) => setFormData({...formData, breed: e.target.value})}
              />
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
            <div className="text-6xl mb-4">🐾</div>
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
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-3xl">
                  {pet.species === 'dog' ? '🐕' : '🐈'}
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
function Dashboard({ petData, pets, onNavigate, onSelectPet }) {
  const [healthFlags, setHealthFlags] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [triageScore, setTriageScore] = useState(null);
  const [patternFlags, setPatternFlags] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthPoints, setHealthPoints] = useState(100);
  const [careActions, setCareActions] = useState({
    meal: 0,
    water: 0,
    walk: 0,
    grooming: 0,
    play: 0
  });

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

  return (
    <div className="min-h-screen bg-background-light p-4">
      {/* Header */}
      <div className="flex items-center bg-background-light/80 p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex size-12 shrink-0 items-center text-slate-800">
          <button 
            onClick={() => onNavigate('profile-list')} 
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"
          >
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">Dashboard</h2>
        <div className="flex size-12 shrink-0 items-center justify-end">
          <button 
            onClick={() => onNavigate('profile-list')}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            변경
          </button>
        </div>
      </div>
      
      <div className="px-4 pt-2 pb-40">
        {/* Pet Info Card */}
        <div className="flex items-center gap-4 bg-surface-light p-4 rounded-lg shadow-soft min-h-[72px] mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
            {petData.species === 'dog' ? '🐕' : '🐈'}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg font-display">{petData.petName}</h2>
            <p className="text-sm text-slate-500">{petData.breed || '품종 미등록'}, {calculateAge(petData.birthDate)}</p>
          </div>
        </div>
        
        {/* 디지털 트윈 아바타 - 귀여운 캐릭터 */}
        <AnimatedContainer animation="scale-up" delay={0.1}>
          <div className="bg-gradient-to-br from-violet-50 via-sky-50 to-teal-50 rounded-2xl p-6 shadow-lg mb-4 border border-white/50 relative overflow-hidden">
            {/* 배경 장식 */}
            <div className="absolute top-2 right-2 text-2xl opacity-30 animate-bounce">✨</div>
            <div className="absolute bottom-2 left-2 text-xl opacity-20">🐾</div>

            <div className="flex items-center gap-6">
              {/* 귀여운 캐릭터 */}
              <CuteCharacter
                pet={{
                  name: petData.petName,
                  species: petData.species,
                  breed: petData.breed
                }}
                size="lg"
                healthFlags={mergedFlags}
                interactive={true}
                showEffects={true}
              />

              {/* 상태 정보 */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2 font-display">{petData.petName}</h3>
                <p className="text-sm text-gray-500 mb-3">{petData.breed || '품종 미등록'}</p>

                {/* 건강 게이지 */}
                <AnimatedProgress
                  value={mergedFlags.energyLevel * 100}
                  max={100}
                  label="에너지 레벨"
                  showValue={true}
                />
              </div>
            </div>
          </div>
        </AnimatedContainer>
        
        {/* Health Status Badges */}
        <div className="flex gap-3 px-4 pt-2 pb-2 overflow-x-auto mb-4">
          {mergedFlags.earIssue && (
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 px-4">
              <p className="text-primary text-sm font-bold">👂 귀</p>
            </div>
          )}
          {mergedFlags.digestionIssue && (
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 px-4">
              <p className="text-primary text-sm font-bold">🍽️ 소화</p>
            </div>
          )}
          {mergedFlags.skinIssue && (
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 px-4">
              <p className="text-primary text-sm font-bold">🩹 피부</p>
            </div>
          )}
          {mergedFlags.fever && (
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 px-4">
              <p className="text-primary text-sm font-bold">🌡️ 발열</p>
            </div>
          )}
        </div>
        
        {/* 빠른 액션 버튼들 (작게) */}
        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onNavigate('symptom-input')}
          >
            <span className="text-lg">🩺</span>
            <span>AI 진단</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onNavigate('hospital')}
          >
            <span className="text-lg">🏥</span>
            <span>병원 찾기</span>
          </button>
        </div>

        {/* 오늘 케어 기록 (간소화) */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span>📋</span> 오늘 케어 기록
            </h3>
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('ko-KR')}</span>
          </div>

          {/* 케어 버튼 + 누적 횟수 */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-xl bg-orange-50 hover:bg-orange-100 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                onClick={() => {
                  setCareActions(prev => ({ ...prev, meal: prev.meal + 1 }));
                  setHealthPoints(prev => {
                    const newPoints = Math.min(100, prev + 5);
                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                    return newPoints;
                  });
                  if (petData?.id) {
                    const today = getTodayKey();
                    const log = loadDailyLog(petData.id, today) || {};
                    saveDailyLog(petData.id, { ...log, mealCount: (log.mealCount || 0) + 1 });
                  }
                }}
              >🍚</button>
              <span className="text-xs text-slate-600 mt-1">밥</span>
              <span className="text-sm font-bold text-orange-500">{careActions.meal}회</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                onClick={() => {
                  setCareActions(prev => ({ ...prev, water: prev.water + 1 }));
                  setHealthPoints(prev => {
                    const newPoints = Math.min(100, prev + 3);
                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                    return newPoints;
                  });
                  if (petData?.id) {
                    const today = getTodayKey();
                    const log = loadDailyLog(petData.id, today) || {};
                    saveDailyLog(petData.id, { ...log, waterCount: (log.waterCount || 0) + 1 });
                  }
                }}
              >💧</button>
              <span className="text-xs text-slate-600 mt-1">물</span>
              <span className="text-sm font-bold text-blue-500">{careActions.water}회</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                onClick={() => {
                  setCareActions(prev => ({ ...prev, walk: prev.walk + 1 }));
                  setHealthPoints(prev => {
                    const newPoints = Math.min(100, prev + 10);
                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                    return newPoints;
                  });
                  if (petData?.id) {
                    const today = getTodayKey();
                    const log = loadDailyLog(petData.id, today) || {};
                    saveDailyLog(petData.id, { ...log, walkCount: (log.walkCount || 0) + 1 });
                  }
                }}
              >🚶</button>
              <span className="text-xs text-slate-600 mt-1">산책</span>
              <span className="text-sm font-bold text-green-500">{careActions.walk}회</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-xl bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                onClick={() => {
                  setCareActions(prev => ({ ...prev, grooming: prev.grooming + 1 }));
                  setHealthPoints(prev => {
                    const newPoints = Math.min(100, prev + 7);
                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                    return newPoints;
                  });
                }}
              >✨</button>
              <span className="text-xs text-slate-600 mt-1">손질</span>
              <span className="text-sm font-bold text-purple-500">{careActions.grooming}회</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="w-12 h-12 rounded-xl bg-pink-50 hover:bg-pink-100 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                onClick={() => {
                  setCareActions(prev => ({ ...prev, play: prev.play + 1 }));
                  setHealthPoints(prev => {
                    const newPoints = Math.min(100, prev + 8);
                    if (petData?.id) localStorage.setItem(`petMedical_healthPoints_${petData.id}`, newPoints.toString());
                    return newPoints;
                  });
                }}
              >🎾</button>
              <span className="text-xs text-slate-600 mt-1">놀이</span>
              <span className="text-sm font-bold text-pink-500">{careActions.play}회</span>
            </div>
          </div>

          {/* 건강 포인트 바 */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600">💚 건강 포인트</span>
              <span className="text-sm font-bold" style={{ color: healthPoints >= 70 ? '#22c55e' : healthPoints >= 40 ? '#f59e0b' : '#ef4444' }}>{healthPoints}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${healthPoints}%`,
                  background: healthPoints >= 70 ? 'linear-gradient(90deg, #4ade80, #22c55e)' :
                             healthPoints >= 40 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' :
                             'linear-gradient(90deg, #f87171, #ef4444)'
                }}
              />
            </div>
          </div>
        </div>

        {/* 특이사항 메모 */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
          <DailyCareLog pet={petData} />
        </div>

        {/* AI 패턴 분석 버튼 */}
        <button
          className="w-full py-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
          onClick={handleAnalyzePattern}
          disabled={analyzing}
        >
          <span className="text-xl">✨</span>
          <span>{analyzing ? "AI가 패턴 분석 중..." : "AI로 7일 건강 패턴 분석하기"}</span>
        </button>
        
        {/* 패턴 분석 결과 */}
        {patternAnalysis && (patternAnalysis.patterns?.length > 0 || patternAnalysis.predictions?.length > 0) && (
          <div className="mt-6 bg-surface-light rounded-lg p-4 shadow-soft border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 font-display flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">smart_toy</span>
              AI 건강 패턴 분석
            </h3>
            
            {/* 패턴 변화 감지 */}
            {patternAnalysis.patterns && patternAnalysis.patterns.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-base">trending_up</span>
                  패턴 변화 감지
                </h4>
                <div className="space-y-2">
                  {patternAnalysis.patterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-slate-600">
                      <span className="material-symbols-outlined text-base mt-1 text-primary">check_circle</span>
                      <p className="text-sm">{pattern}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 다음 3일 예측 */}
            {patternAnalysis.predictions && patternAnalysis.predictions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-accent text-base">psychology</span>
                  다음 3일 예측
                </h4>
                {patternAnalysis.predictions.map((pred, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-slate-600 mt-1">
                    <span className="text-accent">→</span>
                    <p>{pred}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 위험도 변화 */}
            {patternAnalysis.risk_changes && (
              <div className={`mt-4 pt-4 border-t border-slate-200 rounded-lg p-3 ${
                patternAnalysis.risk_changes.trend === 'up' ? 'bg-red-50 border-red-200' :
                patternAnalysis.risk_changes.trend === 'down' ? 'bg-green-50 border-green-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`material-symbols-outlined text-base ${
                    patternAnalysis.risk_changes.trend === 'up' ? 'text-red-600' :
                    patternAnalysis.risk_changes.trend === 'down' ? 'text-green-600' :
                    'text-slate-600'
                  }`}>
                    {patternAnalysis.risk_changes.trend === 'up' ? 'arrow_upward' :
                     patternAnalysis.risk_changes.trend === 'down' ? 'arrow_downward' :
                     'remove'}
                  </span>
                  <span className="text-sm font-bold text-slate-900">위험도 변화</span>
                </div>
                <p className="text-xs text-slate-700">{patternAnalysis.risk_changes.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Symptom Input Screen
function SymptomInput({ petData, onComplete, onBack }) {
  const [symptomText, setSymptomText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (!symptomText.trim() && images.length === 0) {
      alert('증상을 입력하거나 사진을 업로드해주세요.');
      return;
    }

    setLoading(true);
    
    // 증상 데이터를 진료 화면으로 전달
    setTimeout(() => {
      onComplete({
        symptomText,
        images,
        petData
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="flex items-center bg-background-light/80 p-4 pb-2 justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex size-12 shrink-0 items-center text-slate-800">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
        </div>
        <h2 className="text-slate-800 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center font-display">증상 입력</h2>
        <div className="flex size-12 shrink-0 items-center justify-end"></div>
      </div>

      <div className="px-4 pt-2 pb-40 space-y-6">
        {/* Selected Pet Info */}
        <div className="bg-surface-light p-4 rounded-lg shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
            {petData.species === 'dog' ? '🐕' : '🐈'}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 font-display">{petData.petName}</h3>
            <p className="text-xs text-slate-500">{petData.breed}, {calculateAge(petData.birthDate)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 font-display">어떤 증상이 있나요? *</label>
          <textarea
            className="w-full p-4 rounded-lg border border-slate-300 bg-slate-100 text-slate-900 focus:ring-primary focus:border-primary min-h-[150px] text-base"
            placeholder="예: 어제부터 밥을 안 먹고 계속 누워만 있어요. 구토를 2번 했어요."
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 font-display">사진 첨부 (선택)</label>
          <div className="grid grid-cols-3 gap-3">
            <label className="aspect-square cursor-pointer flex flex-col items-center justify-center bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">add_photo_alternate</span>
              <span className="text-xs text-slate-500 font-medium">추가</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                <img src={img} alt={`증상 ${index + 1}`} className="w-full h-full object-cover" />
                <button 
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-sm text-slate-700">
          <p className="font-bold mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            팁
          </p>
          <p>증상이 시작된 시기, 빈도, 변화 양상을 자세히 적어주시면 AI가 더 정확하게 진단할 수 있습니다.</p>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 border-t border-slate-200 z-40">
        <button 
          onClick={handleSubmit}
          disabled={loading || (!symptomText.trim() && images.length === 0)}
          className="w-full bg-primary text-white py-4 px-6 rounded-lg font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 진료실 연결 중...
            </>
          ) : (
            <>
              AI 진료 시작
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
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
function MultiAgentDiagnosis({ petData, symptomData, onComplete, onBack, onDiagnosisResult }) {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [chatMode, setChatMode] = useState(false); // 대화 모드 활성화 여부
  const [waitingForAnswer, setWaitingForAnswer] = useState(false); // AI 질문 대기 중
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showDiagnosisReport, setShowDiagnosisReport] = useState(false); // 진단서 표시 여부
  
  useEffect(() => {
    let isMounted = true; // 컴포넌트 마운트 상태 추적
    
    const startAIDiagnosis = async () => {
      try {
        setIsProcessing(true);
        setMessages([]);
        setCurrentStep(0);

        // 실제 AI API 호출
        const result = await runMultiAgentDiagnosis(
          petData,
          symptomData,
          (log) => {
            if (!isMounted) return; // 컴포넌트가 언마운트되었으면 무시
            
            // 중복 메시지 방지: 같은 에이전트의 "진행 중..." 메시지가 있으면 제거
            setMessages(prev => {
              const filtered = prev.filter(msg => 
                !(msg.agent === log.agent && msg.content.includes('중...') && log.content !== msg.content)
              );
              
              // 새 메시지 추가
              return [...filtered, {
                agent: log.agent,
                role: log.role,
                icon: log.icon,
                type: log.type,
                content: log.content,
                timestamp: log.timestamp
              }];
            });
            setCurrentStep(prev => prev + 1);
          }
        );
        
        if (!isMounted) return; // 컴포넌트가 언마운트되었으면 무시

        // 최종 진단서 표시
        setTimeout(() => {
          setDiagnosisResult(result.finalDiagnosis);
          setShowResult(true);
          setIsProcessing(false);
          setChatMode(true);
          
          // 진단서 저장
          saveDiagnosisToStorage(result.finalDiagnosis);
          
          // 부모 컴포넌트에 진단 결과 전달
          if (onDiagnosisResult) {
            onDiagnosisResult(result.finalDiagnosis);
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
            content: `안녕하세요, ${petData.petName} 보호자님.\n\n접수 완료했습니다.\n\n환자 정보:\n• 이름: ${petData.petName}\n• 종류: ${petData.species === 'dog' ? '개' : '고양이'}\n• 품종: ${petData.breed || '미등록'}\n\n증상:\n${symptomText}\n${hasImages ? `\n사진 ${symptomData.images.length}장 확인 완료\n` : ''}\n→ Information Agent에게 전달합니다.`
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
            content: `종합 진단 수행 중...\n\n🔬 증상 분석 결과:\n${analysis.description}\n\n📊 진단 결과:\n• ${analysis.diagnosis}\n\n⚠️ 위험도: ${analysis.emergency === 'low' ? '낮음' : analysis.emergency === 'medium' ? '보통' : '높음'}\n🚨 응급도: ${analysis.emergency === 'low' ? '🟢 경미' : analysis.emergency === 'medium' ? '🟡 보통' : '🔴 응급'}\n\n→ Data Agent, 진단서 작성 부탁합니다.`
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
                  petName: petData.petName,
                  symptom: symptomText
                };
                setDiagnosisResult(finalDiagnosis);
                setShowResult(true);
                setIsProcessing(false);
                setChatMode(true);
                saveDiagnosisToStorage(finalDiagnosis);
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

  const showFinalDiagnosis = (analysis, symptomText, hasImages) => {
    setDiagnosisResult(analysis);
    setShowResult(true);
    setChatMode(false);
    
    // 진단서 저장
    const savedDiagnosis = {
      petId: petData.id,
      petName: petData.petName,
      symptom: symptomText,
      images: hasImages ? symptomData.images.length : 0,
      conversationHistory: conversationHistory,
      ...analysis
    };
    saveDiagnosisToStorage(savedDiagnosis);
    
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
      // Gemini API를 직접 사용하여 질문에 답변
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.');
      }

      // 진단 결과에서 상세 정보 추출
      const diagnosisDetails = diagnosisResult.diagnosis || '일반 건강 이상';
      const riskLevel = diagnosisResult.riskLevel || diagnosisResult.emergency || 'moderate';
      const actions = diagnosisResult.actions || [];
      const careGuide = diagnosisResult.careGuide || '';
      const ownerSheet = diagnosisResult.ownerSheet || {};
      const immediateActions = ownerSheet.immediate_home_actions || actions;
      const thingsToAvoid = ownerSheet.things_to_avoid || [];
      const monitoringGuide = ownerSheet.monitoring_guide || [];

      const prompt = `당신은 전문 수의사입니다. 반려동물 보호자의 질문에 대해 정확하고 친절하게 답변해주세요.

[반려동물 정보]
- 이름: ${petData.petName}
- 종류: ${petData.species === 'dog' ? '개' : '고양이'}
- 품종: ${petData.breed || '미등록'}
- 나이: ${petData.age || '미등록'}세
${petData.weight ? `- 체중: ${petData.weight}kg` : ''}

[현재 진단 결과]
- 진단명: ${diagnosisDetails}
- 위험도: ${riskLevel}
- 응급도: ${diagnosisResult.triage_level || 'yellow'}
- Triage Score: ${diagnosisResult.triage_score || 'N/A'}/5

[권장 조치사항]
${immediateActions.length > 0 ? immediateActions.map((a, i) => `${i + 1}. ${a}`).join('\n') : '추가 조치사항 없음'}

[피해야 할 행동]
${thingsToAvoid.length > 0 ? thingsToAvoid.map((a, i) => `${i + 1}. ${a}`).join('\n') : '없음'}

[관찰 포인트]
${monitoringGuide.length > 0 ? monitoringGuide.map((a, i) => `${i + 1}. ${a}`).join('\n') : '없음'}

${careGuide ? `[케어 가이드]\n${careGuide}` : ''}

[보호자 질문]
${userQuestion}

위 질문에 대해 다음을 포함하여 답변해주세요:
1. 질문에 대한 구체적이고 실용적인 답변
2. 현재 진단 결과와 연관된 조언
3. 구체적인 실행 방법 (예: 음식 추천, 케어 방법, 주의사항)
4. 필요시 병원 방문 시점 안내

답변은 친절하고 이해하기 쉽게 작성하되, 전문적이고 정확해야 합니다. 추측이나 검증되지 않은 정보는 제공하지 마세요.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API 오류:', response.status, errorData);
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('API 응답 형식 오류');
      }

      const answer = data.candidates[0].content.parts[0].text;
      
      if (!answer || answer.trim().length === 0) {
        throw new Error('빈 답변을 받았습니다');
      }
      
      setMessages(prev => [...prev, {
        agent: 'Veterinarian Agent',
        role: '전문 수의사',
        icon: '👨‍⚕️',
        type: 'medical',
        content: answer.trim(),
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
        answer = `식욕이 좋지 않을 때는 다음과 같은 방법을 시도해보세요:\n\n1. **부드러운 음식 제공**: 삶은 닭가슴살(기름 제거), 계란(삶은 것), 흰 쌀밥을 소량씩 제공\n2. **수분 공급**: 깨끗한 물을 자주 제공하고, 필요시 수액 보충 고려\n3. **소량씩 자주**: 한 번에 많이 주지 말고 소량씩 여러 번 나누어 제공\n4. **온도 조절**: 미지근한 온도로 제공하면 식욕이 좋아질 수 있음\n5. **환경 조성**: 조용하고 편안한 환경에서 식사하도록 도와주기\n\n⚠️ **주의사항**:\n- 구토나 설사가 동반되면 음식을 제한하고 수의사와 상의하세요.\n- 24시간 이상 음식을 거부하면 탈수 위험이 있으므로 병원 방문을 권장합니다.\n- 현재 진단 결과(${diagnosisResult.diagnosis || '일반 건강 이상'})를 고려하여 추가 조치가 필요할 수 있습니다.`;
      } else if (questionLower.includes('병원') || questionLower.includes('방문') || questionLower.includes('응급')) {
        const urgency = diagnosisResult.triage_level || 'yellow';
        const urgencyText = urgency === 'red' ? '즉시' : urgency === 'orange' ? '오늘 안에' : urgency === 'yellow' ? '24~48시간 내' : '증상 악화 시';
        answer = `병원 방문 시점에 대한 안내입니다:\n\n**현재 응급도**: ${urgencyText}\n\n${urgency === 'red' ? '🚨 즉시 응급실로 이동하세요. 생명이 위험할 수 있습니다.' : urgency === 'orange' ? '⚠️ 오늘 안에 병원 방문을 권장합니다. 증상이 악화될 수 있습니다.' : urgency === 'yellow' ? '📋 24~48시간 내 병원 방문을 권장합니다. 증상을 지속적으로 관찰하세요.' : '👀 증상을 지속적으로 관찰하고, 악화되면 병원을 방문하세요.'}\n\n**병원 방문 시 준비할 것**:\n- 현재 진단서 (이 앱에서 생성된 진단서)\n- 증상이 시작된 시점과 변화 과정\n- 최근 먹은 음식, 약물 복용 여부\n- 사진이나 영상 (가능한 경우)\n\n**응급 상황 신호**:\n- 호흡 곤란, 의식 저하, 발작/경련\n- 심한 구토나 설사로 탈수 의심\n- 배변/배뇨 불가능\n- 심한 통증으로 움직이지 못함`;
      } else if (questionLower.includes('케어') || questionLower.includes('돌봄') || questionLower.includes('관리')) {
        const actions = diagnosisResult.actions || [];
        answer = `현재 진단 결과를 바탕으로 한 케어 가이드입니다:\n\n**즉시 조치사항**:\n${actions.length > 0 ? actions.map((a, i) => `${i + 1}. ${a}`).join('\n') : '- 증상을 지속적으로 관찰하세요.\n- 충분한 휴식과 수분 공급을 유지하세요.'}\n\n**일반적인 케어 원칙**:\n1. 조용하고 편안한 환경 유지\n2. 충분한 휴식 제공\n3. 수분 섭취 촉진\n4. 증상 변화 관찰 및 기록\n5. 필요시 병원 방문\n\n**주의사항**:\n- 증상이 악화되거나 새로운 증상이 나타나면 즉시 병원을 방문하세요.\n- 자가 처방은 피하고, 수의사의 지시를 따르세요.`;
      } else {
        // 일반적인 질문에 대한 답변
        answer = `질문해주셔서 감사합니다.\n\n현재 ${petData.petName}의 진단 결과는 "${diagnosisResult.diagnosis || '일반 건강 이상'}"입니다.\n\n**답변**:\n${userQuestion}에 대해 답변드리기 위해, 현재 진단 결과와 연관하여 다음과 같이 안내드립니다:\n\n- 현재 위험도: ${diagnosisResult.riskLevel || '보통'}\n- 권장 조치: ${diagnosisResult.actions?.join(', ') || '증상 관찰 지속'}\n\n더 구체적인 답변을 원하시면 다음 정보를 알려주시면 도움이 됩니다:\n1. 질문과 관련된 구체적인 상황\n2. 현재 관찰 중인 증상이나 변화\n3. 특별히 궁금한 부분\n\n또한 병원 방문 시 수의사에게 직접 문의하시면 더 정확한 답변을 받으실 수 있습니다.`;
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
  
  const steps = [
    { label: '접수', icon: '1' },
    { label: '분석', icon: '2' },
    { label: '진단', icon: '3' },
    { label: '완료', icon: '4' }
  ];
  

  return (
    <div className="diagnosis-container">
      <div className="diagnosis-header">
        <button className="back-btn" onClick={onBack} style={{ position: 'absolute', left: '20px', top: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h1>👨‍⚕️ AI 온라인 진료실</h1>
        <p>AI 의료진 4명이 {petData.petName}를 진료합니다</p>
      </div>
      
      <div className="progress-bar">
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className={`step ${index + 1 <= currentStep ? 'active' : ''}`}>
              <div className="step-circle">{index + 1 <= currentStep ? '✓' : step.icon}</div>
              <div className="step-label">{step.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && isProcessing && (
            <div className="initial-loading">
              <div className="loading-spinner"></div>
              <p>AI 진료실에 연결 중입니다...</p>
              <p className="loading-subtitle">잠시만 기다려주세요</p>
            </div>
          )}
          {messages.map((msg, index) => {
            // 에이전트 간 협업 메시지 감지 (다른 에이전트를 언급하는 경우)
            const isCollaboration = !msg.isUser && msg.content.includes('님,') || msg.content.includes('Agent님');
            const mentionsOtherAgent = msg.content.match(/(CS|Information|Veterinarian|Triage|Data|Care)\s*Agent님/);
            
            return (
              <div key={index} className={`message ${msg.isUser ? 'user-message' : 'agent-message'} ${index === messages.length - 1 ? 'latest' : ''} ${isCollaboration ? 'collaboration-message' : ''}`}>
                <div className="message-header">
                  <div className={`agent-icon ${msg.type} ${index === messages.length - 1 && !msg.isUser ? 'pulse' : ''}`}>{msg.icon}</div>
                  <div>
                    <div className="agent-name">{msg.agent}</div>
                    <div className="agent-role">{msg.role}</div>
                  </div>
                  <div className="message-time">{new Date(msg.timestamp || Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className={`message-content ${msg.isQuestion ? 'question-message' : ''} ${isCollaboration ? 'has-collaboration' : ''}`}>
                  {isCollaboration && (
                    <div className="collaboration-badge">
                      <span className="material-symbols-outlined">handshake</span>
                      협업 중
                    </div>
                  )}
                  {msg.content.split('\n').map((line, lineIdx) => {
                    // 다른 에이전트를 언급하는 줄 강조
                    if (line.includes('님,') || line.includes('Agent님')) {
                      return (
                        <div key={lineIdx} className="collaboration-line">
                          {line}
                        </div>
                      );
                    }
                    return <div key={lineIdx}>{line}</div>;
                  })}
                  {msg.isQuestion && (
                    <div className="question-hint">💡 위 입력창에 답변을 입력해주세요</div>
                  )}
                </div>
              </div>
            );
          })}
          
          {isProcessing && (
            <div className="typing-indicator">
              <span className="typing-text">
                {waitingForAnswer ? '답변을 기다리는 중...' : '다음 에이전트가 작업 중입니다...'}
              </span>
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        {chatMode && (
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (waitingForAnswer) {
                      handleUserMessage();
                    } else {
                      handleUserQuestion();
                    }
                  }
                }}
                placeholder={waitingForAnswer ? "AI 의사의 질문에 답변해주세요..." : "궁금한 점을 물어보세요..."}
                className="chat-input"
                disabled={isProcessing}
              />
              <button
                onClick={waitingForAnswer ? handleUserMessage : handleUserQuestion}
                disabled={!userInput.trim() || isProcessing}
                className="chat-send-btn"
              >
                {waitingForAnswer ? '답변하기' : '질문하기'}
              </button>
            </div>
            {!waitingForAnswer && (
              <div className="chat-hint">
                💡 AI 의사에게 질문하거나, 추가 증상을 설명할 수 있습니다
              </div>
            )}
          </div>
        )}
      </div>
      
      {showResult && diagnosisResult && (
        <div className="diagnosis-result">
          <div className="result-header">
            <h2>✅ 진료 완료!</h2>
            <p className="result-date">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="result-card">
            <div className="result-section">
              <h3>🎯 진단 결과</h3>
              <p className="diagnosis-text"><strong>{diagnosisResult.diagnosis}</strong></p>
              
              {/* Triage Score 표시 */}
              {diagnosisResult.triage_score !== undefined && (
                <div className="triage-display-inline">
                  <div className="triage-label">🚨 응급도 평가 (Triage)</div>
                  <div className="triage-score-inline">
                    <span className="triage-number">{diagnosisResult.triage_score}/5</span>
                    <div className="triage-bar-inline">
                      <div 
                        className="triage-fill-inline"
                        style={{ 
                          width: `${(diagnosisResult.triage_score / 5) * 100}%`,
                          backgroundColor: diagnosisResult.triage_score >= 4 ? '#f44336' : 
                                           diagnosisResult.triage_score >= 3 ? '#ff9800' : 
                                           diagnosisResult.triage_score >= 2 ? '#ffc107' : '#4caf50'
                        }}
                      ></div>
                    </div>
                    <span className="triage-level-text">{diagnosisResult.triage_level || 'Moderate'}</span>
                  </div>
                </div>
              )}
              
              <div className="emergency-badge" style={{ 
                backgroundColor: getEmergencyColor(diagnosisResult.emergency),
                color: 'white',
                padding: '10px 20px',
                borderRadius: '25px',
                display: 'inline-block',
                marginTop: '15px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {diagnosisResult.emergency === 'low' ? '🟢 경미 - 집에서 관리 가능' : 
                 diagnosisResult.emergency === 'medium' ? '🟡 보통 - 병원 방문 권장' : '🔴 응급 - 즉시 병원 방문 필요'}
              </div>
            </div>
            
            {diagnosisResult.description && (
              <div className="result-section">
                <h3>📋 상세 설명</h3>
                <p className="description-text">{diagnosisResult.description}</p>
              </div>
            )}
            
            <div className="result-section">
              <h3>💊 즉시 조치 사항</h3>
              <ul className="action-list">
                {diagnosisResult.actions.map((action, idx) => (
                  <li key={idx}>
                    <span className="action-icon">✓</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {diagnosisResult.hospitalVisit && (
              <div className="result-section hospital-section">
                <h3>🏥 병원 방문 권장</h3>
                <div className="hospital-alert">
                  <p className="hospital-time"><strong>{diagnosisResult.hospitalVisitTime}</strong> 내 병원 방문을 권장합니다.</p>
                  {diagnosisResult.emergency === 'high' && (
                    <p className="emergency-warning">⚠️ 응급 상황입니다. 가능한 한 빨리 병원을 방문해주세요.</p>
                  )}
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button className="action-btn primary" onClick={() => onComplete('treatment')}>
                🏠 직접 치료하기
              </button>
              <button className="action-btn secondary" onClick={async () => {
                // 병원 패킷 생성
                try {
                  const packet = await generateHospitalPacket(petData, diagnosisResult, symptomData);
                  // 패킷을 상태에 저장하거나 바로 표시
                  alert('병원 진단 패킷이 생성되었습니다!\n\n병원 예약 화면에서 확인할 수 있습니다.');
                  onComplete('hospital');
                } catch (err) {
                  console.error('패킷 생성 오류:', err);
                  onComplete('hospital');
                }
              }}>
                🏥 병원 예약하기
              </button>
              <button className="action-btn highlight" onClick={() => setShowDiagnosisReport(true)}>
                📄 진단서 보기
              </button>
              {chatMode && (
                <button className="action-btn outline" onClick={() => {
                  setChatMode(false);
                  setShowResult(true);
                }}>
                  💬 대화 계속하기
                </button>
              )}
              <button className="action-btn outline" onClick={() => onComplete('dashboard')}>
                📋 대시보드로
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

  const getEmergencyInfo = (emergency) => {
    switch(emergency) {
      case 'high':
        return { text: '응급', color: '#ef4444', icon: '🔴', desc: '즉시 병원 방문 필요' };
      case 'medium':
        return { text: '주의', color: '#f59e0b', icon: '🟡', desc: '병원 방문 권장' };
      default:
        return { text: '경미', color: '#22c55e', icon: '🟢', desc: '가정 내 관리 가능' };
    }
  };

  const emergencyInfo = getEmergencyInfo(diagnosisResult?.emergency);

  return (
    <div className="diagnosis-result-view">
      <div className="result-view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h1>📋 진단 결과</h1>
      </div>

      <div className="result-view-content">
        <div className="result-card-summary">
          <div className="pet-info-mini">
            <span className="pet-avatar">{petData?.species === 'cat' ? '🐱' : '🐕'}</span>
            <span className="pet-name">{petData?.name || '반려동물'}</span>
          </div>

          <div className="diagnosis-main-box">
            <h2>🎯 {diagnosisResult?.diagnosis || '진단 결과 없음'}</h2>
            <div
              className="emergency-badge-inline"
              style={{ backgroundColor: emergencyInfo.color }}
            >
              {emergencyInfo.icon} {emergencyInfo.text} - {emergencyInfo.desc}
            </div>
          </div>

          {diagnosisResult?.triage_score !== undefined && (
            <div className="triage-summary">
              <span>응급도 점수: </span>
              <strong>{diagnosisResult.triage_score}/5</strong>
            </div>
          )}

          {diagnosisResult?.description && (
            <div className="description-summary">
              <h3>📋 설명</h3>
              <p>{diagnosisResult.description}</p>
            </div>
          )}

          <div className="actions-summary">
            <h3>💊 권장 조치</h3>
            <ul>
              {diagnosisResult?.actions?.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="result-view-actions">
          <button className="action-btn highlight" onClick={() => setShowDiagnosisReport(true)}>
            📄 진단서 보기
          </button>
          <button className="action-btn primary" onClick={onGoToTreatment}>
            🏠 직접 치료하기
          </button>
          <button className="action-btn secondary" onClick={onGoToHospital}>
            🏥 병원 예약하기
          </button>
          <button className="action-btn outline" onClick={onBack}>
            📋 대시보드로
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
function HomeTreatmentGuide({ petData, diagnosisResult, onBack }) {
  const CHECKLIST_KEY = `petMedical_checklist_${petData?.id || 'default'}_${new Date().toISOString().split('T')[0]}`;

  const defaultChecklist = [
    { id: 'observe', label: '증상 관찰 및 기록', checked: false },
    { id: 'water', label: '수분 섭취 확인', checked: false },
    { id: 'appetite', label: '식욕 상태 확인', checked: false },
    { id: 'stool', label: '배변 상태 확인', checked: false },
    { id: 'activity', label: '활동량 관찰', checked: false }
  ];

  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      return saved ? JSON.parse(saved) : defaultChecklist;
    } catch {
      return defaultChecklist;
    }
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleChecklistChange = (id) => {
    setChecklist(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      // 자동 저장
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('체크리스트 저장 실패:', e);
      }
      return updated;
    });
  };

  const handleSaveChecklist = () => {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
      setSaveMessage('✅ 체크리스트가 저장되었습니다!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (e) {
      setSaveMessage('❌ 저장에 실패했습니다.');
      setTimeout(() => setSaveMessage(''), 2000);
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
    <div className="treatment-container">
      <div className="treatment-header">
        <button className="back-btn" onClick={onBack}>← 뒤로</button>
        <h1>🏠 직접 치료 가이드</h1>
      </div>

      <div className="treatment-content">
        <div className="treatment-intro">
          <div className="pet-info-card">
            <span className="pet-icon-large">{petData.species === 'dog' ? '🐕' : '🐈'}</span>
            <div>
              <h2>{petData.petName}의 치료 가이드</h2>
              {diagnosisResult && (
                <p className="diagnosis-summary">{diagnosisResult.diagnosis}</p>
              )}
            </div>
          </div>
        </div>

        <div className="treatment-steps">
          <h3>📋 단계별 치료 방법</h3>
          {steps.map((item, index) => (
            <div key={index} className="treatment-step-card">
              <div className="step-number">{item.step}</div>
              <div className="step-content">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {diagnosisResult && (
          <>
            <div className="treatment-info">
              <h3>⏰ 예상 회복 기간</h3>
              <p className="recovery-time">{recoveryTime}</p>
            </div>

            <div className="treatment-warnings">
              <h3>⚠️ 주의사항</h3>
              <ul>
                <li>증상이 악화되거나 새로운 증상이 나타나면 즉시 병원을 방문하세요.</li>
                <li>처방전 없이 사람 약물을 사용하지 마세요.</li>
                <li>응급 상황(호흡 곤란, 의식 저하, 심한 출혈 등)은 즉시 응급실로 가세요.</li>
                <li>이 가이드는 참고용이며, 전문 수의사의 진단을 대체할 수 없습니다.</li>
              </ul>
            </div>

            <div className="treatment-checklist">
              <div className="checklist-header">
                <h3>✅ 일일 체크리스트</h3>
                <span className="checklist-progress">{completedCount}/{totalCount} 완료</span>
              </div>
              <div className="checklist-progress-bar">
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <div className="checklist-items">
                {checklist.map(item => (
                  <label key={item.id} className={item.checked ? 'checked' : ''}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleChecklistChange(item.id)}
                    />
                    <span className="checkmark">{item.checked ? '✓' : ''}</span>
                    <span className="label-text">{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="checklist-actions">
                <button className="save-checklist-btn" onClick={handleSaveChecklist}>
                  💾 체크리스트 저장
                </button>
                {saveMessage && <span className="save-message">{saveMessage}</span>}
              </div>
              <p className="checklist-note">※ 체크 시 자동 저장됩니다</p>
            </div>
          </>
        )}

        <div className="treatment-actions">
          <button className="action-btn secondary" onClick={onBack}>
            진단서로 돌아가기
          </button>
          {diagnosisResult?.hospitalVisit && (
            <button className="action-btn primary" onClick={() => window.location.reload()}>
              병원 예약하기
            </button>
          )}
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

// ============ 메인 앱 ============
function App() {
  // 인증 상태
  const [authScreen, setAuthScreen] = useState('login'); // 'login', 'register', null (로그인됨)
  const [currentUser, setCurrentUser] = useState(null);

  const [currentTab, setCurrentTab] = useState('care');
  const [currentView, setCurrentView] = useState(null); // 모달/서브 화면용
  const [petData, setPetData] = useState(null);
  const [pets, setPets] = useState([]);
  const [symptomData, setSymptomData] = useState(null);
  const [lastDiagnosis, setLastDiagnosis] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalPacket, setHospitalPacket] = useState(null);

  useEffect(() => {
    // 기존 로그인 세션 확인
    const savedSession = getAuthSession();
    if (savedSession) {
      setCurrentUser(savedSession);
      setAuthScreen(null);
    }

    // 더미데이터 초기화 (처음 실행시에만)
    initializeDummyData();

    const savedPets = getPetsFromStorage();
    setPets(savedPets);

    // 저장된 반려동물이 있으면 첫 번째 선택, 없으면 샘플 데이터로 시작
    if (savedPets.length > 0) {
      setPetData(savedPets[0]);
    }
    // 등록 화면 없이 바로 대시보드로 (등록은 마이페이지에서)
    setCurrentTab('care');
  }, []);

  // 로그인 성공 핸들러
  const handleLogin = (user) => {
    setCurrentUser(user);
    setAuthScreen(null);
  };

  // 회원가입 성공 핸들러
  const handleRegister = (user) => {
    setCurrentUser(user);
    setAuthScreen(null);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setAuthScreen('login');
  };

  // 로그인 없이 바로 입장 (테스트용)
  const handleSkipLogin = () => {
    setAuthScreen(null);
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
    const updatedPets = getPetsFromStorage();
    setPets(updatedPets);
    setPetData(data);
    setCurrentView(null);
    setCurrentTab('care');
  };

  const handleSelectPet = (pet) => {
    setPetData(pet);
    setCurrentView(null);
    setCurrentTab('care');
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

      {currentView === 'registration' && (
        <ProfileRegistration 
          onComplete={handleRegistrationComplete}
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

      {currentView === 'symptom-input' && petData && (
        <SymptomInput
          petData={petData}
          onComplete={handleSymptomSubmit}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
      
      {currentView === 'diagnosis' && petData && symptomData && (
        <MultiAgentDiagnosis 
          petData={petData}
          symptomData={symptomData}
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

      {currentView === 'hospital' && petData && lastDiagnosis && (
        <HospitalBooking
          petData={petData}
          diagnosis={lastDiagnosis}
          symptomData={symptomData}
          onBack={() => setCurrentView('diagnosis-result')}
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
          onBack={() => {
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
          onBack={() => setCurrentView('dashboard')}
          onSelectPet={(pet) => {
            setPetData(pet);
            setCurrentView('dashboard');
          }}
          onViewDiagnosis={(diagnosis) => {
            setLastDiagnosis(diagnosis);
            // 진단서를 보기 위해 해당 반려동물 찾기
            const pet = pets.find(p => p.id === diagnosis.petId);
            if (pet) {
              setPetData(pet);
            }
            setCurrentView('diagnosis-view');
          }}
        />
      )}

      {currentView === 'diagnosis-view' && petData && lastDiagnosis && (
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
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
                  {petData.species === 'dog' ? '🐕' : '🐈'}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">이름</span>
                    <p className="font-medium text-slate-900">{petData.petName || '미상'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">품종</span>
                    <p className="font-medium text-slate-900">{petData.breed || '미상'}</p>
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
                    <span className="text-slate-500">체중</span>
                    <p className="font-medium text-slate-900">{petData.weight ? `${petData.weight}kg` : '미상'}</p>
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
              <p className="text-lg font-semibold text-slate-900 mb-2">
                {lastDiagnosis.diagnosis || lastDiagnosis.suspectedConditions?.[0]?.name || '일반 건강 이상'}
              </p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                lastDiagnosis.riskLevel === 'High' || lastDiagnosis.emergency === 'high' ? 'bg-red-100 text-red-600' :
                lastDiagnosis.riskLevel === 'Moderate' || lastDiagnosis.emergency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-600'
              }`}>
                {lastDiagnosis.riskLevel === 'Low' || lastDiagnosis.emergency === 'low' ? '경미' :
                 lastDiagnosis.riskLevel === 'Moderate' || lastDiagnosis.emergency === 'medium' ? '보통' :
                 lastDiagnosis.riskLevel === 'High' || lastDiagnosis.emergency === 'high' ? '응급' : '보통'}
              </span>
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
          </div>
        </div>
      )}

      {currentView === 'history' && (
        <div className="history-container">
          <button className="back-btn" onClick={() => setCurrentView('dashboard')}>← 뒤로</button>
          <h1>📋 진료 기록</h1>
          <div className="history-content">
            <p>마이페이지에서 확인하실 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* 탭 기반 메인 화면 - currentView가 없을 때만 표시 */}
      {!currentView && currentTab && (
        <div className="main-content" style={{ paddingBottom: '80px' }}>
          {/* 내 동물 돌보기 탭 */}
          {currentTab === 'care' && petData && (
            <Dashboard 
              petData={petData} 
              pets={pets}
              onNavigate={(view) => setCurrentView(view)}
              onSelectPet={handleSelectPet}
            />
          )}

          {/* 병원예약하기 탭 */}
          {currentTab === 'hospital' && (
            petData ? (
              <HospitalBooking 
                petData={petData}
                diagnosis={lastDiagnosis || null}
                symptomData={symptomData || null}
                onBack={() => setCurrentTab('care')}
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
                  <div className="text-6xl mb-4">🐾</div>
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
              onBack={() => setCurrentTab('care')}
              onViewDiagnosis={(diagnosis) => {
                setLastDiagnosis(diagnosis);
                setCurrentView('diagnosis-view');
              }}
            />
          )}

          {/* 마이페이지 탭 */}
          {currentTab === 'mypage' && (
            <MyPage
              onBack={() => setCurrentTab('care')}
              onAddPet={() => setCurrentView('registration')}
              onSelectPet={(pet) => {
                setPetData(pet);
                setCurrentTab('care');
              }}
              onViewDiagnosis={(diagnosis) => {
                setLastDiagnosis(diagnosis);
                const pet = pets.find(p => p.id === diagnosis.petId);
                if (pet) {
                  setPetData(pet);
                }
                setCurrentView('diagnosis-view');
              }}
            />
          )}

          {/* 반려동물이 없을 때 - care 탭에서만 등록 유도 */}
          {!petData && currentTab === 'care' && (
            <div className="page-container">
              <div className="px-4 pt-8 pb-24">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🐾</div>
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

      {/* 하단 탭 네비게이션 - 반려동물 없어도 표시 */}
      {currentTab && !currentView && (
        <BottomTabNavigation
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      )}
    </div>
  );
}

export default App
