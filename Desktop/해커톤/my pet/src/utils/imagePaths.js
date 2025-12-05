/**
 * 동물 이미지 경로 상수
 * 
 * 메인 화면: main-image 폴더 사용
 * 기타 영역: profile_background_less 폴더 사용
 */

// base 경로 가져오기 (vite.config.js의 base 설정)
const BASE_PATH = import.meta.env.BASE_URL || '/ai-factory/';

/**
 * 메인 화면용 이미지 (main-image 폴더)
 * @type {Record<string, string>}
 */
export const MAIN_CHARACTER_IMAGES = {
  dog: `${BASE_PATH}icon/main-image/dog_main-removebg-preview.png`,
  cat: `${BASE_PATH}icon/main-image/Cat_main-removebg-preview.png`,
  rabbit: `${BASE_PATH}icon/main-image/rabbit_main-removebg-preview.png`,
  hamster: `${BASE_PATH}icon/main-image/hamster_main-removebg-preview.png`,
  bird: `${BASE_PATH}icon/main-image/bird_main-removebg-preview.png`,
  hedgehog: `${BASE_PATH}icon/main-image/hedgehog_main-removebg-preview.png`,
  reptile: `${BASE_PATH}icon/main-image/reptile_main-removebg-preview.png`,
  etc: `${BASE_PATH}icon/main-image/etc_main-removebg-preview.png`,
  other: `${BASE_PATH}icon/main-image/etc_main-removebg-preview.png`
};

// 기타 영역용 이미지 (profile_background_less 폴더)
export const PROFILE_IMAGES = {
  dog: `${BASE_PATH}icon/profile_background_less/dog-removebg-preview.png`,
  cat: `${BASE_PATH}icon/profile_background_less/cat-removebg-preview.png`,
  rabbit: `${BASE_PATH}icon/profile_background_less/rabbit-removebg-preview.png`,
  hamster: `${BASE_PATH}icon/profile_background_less/hamster-removebg-preview.png`,
  bird: `${BASE_PATH}icon/profile_background_less/bird-removebg-preview.png`,
  hedgehog: `${BASE_PATH}icon/profile_background_less/hedgehog-removebg-preview.png`,
  reptile: `${BASE_PATH}icon/profile_background_less/reptile-removebg-preview.png`,
  etc: `${BASE_PATH}icon/profile_background_less/etc-removebg-preview.png`,
  other: `${BASE_PATH}icon/profile_background_less/etc-removebg-preview.png`
};

/**
 * 메인 화면용 이미지 가져오기
 */
export function getMainCharacterImage(species = 'dog') {
  return MAIN_CHARACTER_IMAGES[species] || MAIN_CHARACTER_IMAGES.other;
}

/**
 * 프로필/기타 영역용 이미지 가져오기
 */
export function getProfileImage(species = 'dog') {
  return PROFILE_IMAGES[species] || PROFILE_IMAGES.other;
}

/**
 * 반려동물 데이터에서 이미지 가져오기
 * - 기본값: 동물 종류에 따른 캐릭터 이미지 (main-image 또는 profile_background_less)
 * - 관리자가 별도로 입력한 유효한 URL이 있을 경우에만 해당 이미지 사용
 */
export function getPetImage(petData, useMainImage = false) {
  if (!petData) return useMainImage ? getMainCharacterImage() : getProfileImage();

  // 동물 종류에 따른 기본 이미지
  const species = petData.species || 'dog';
  const defaultImage = useMainImage ? getMainCharacterImage(species) : getProfileImage(species);

  // 관리자가 별도로 입력한 프로필 이미지가 있을 경우에만 해당 이미지 사용
  // 빈 문자열, null, undefined는 무시하고 기본 캐릭터 이미지 사용
  if (petData.profileImage &&
      typeof petData.profileImage === 'string' &&
      petData.profileImage.trim() !== '' &&
      (petData.profileImage.startsWith('http') || petData.profileImage.startsWith('data:'))) {
    return petData.profileImage;
  }

  return defaultImage;
}


