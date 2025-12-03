/**
 * 동물 이미지 경로 상수
 * 
 * 메인 화면: main-image 폴더 사용
 * 기타 영역: profile_background_less 폴더 사용
 */

// 메인 화면용 이미지 (main-image 폴더)
export const MAIN_CHARACTER_IMAGES = {
  dog: '/icon/main-image/dog_main-removebg-preview.png',
  cat: '/icon/main-image/Cat_main-removebg-preview.png',
  rabbit: '/icon/main-image/rabbit_main-removebg-preview.png',
  hamster: '/icon/main-image/hamster_main-removebg-preview.png',
  bird: '/icon/main-image/bird_main-removebg-preview.png',
  hedgehog: '/icon/main-image/hedgehog_main-removebg-preview.png',
  reptile: '/icon/main-image/reptile_main-removebg-preview.png',
  etc: '/icon/main-image/etc_main-removebg-preview.png',
  other: '/icon/main-image/etc_main-removebg-preview.png'
};

// 기타 영역용 이미지 (profile_background_less 폴더)
export const PROFILE_IMAGES = {
  dog: '/icon/profile_background_less/dog-removebg-preview.png',
  cat: '/icon/profile_background_less/cat-removebg-preview.png',
  rabbit: '/icon/profile_background_less/rabbit-removebg-preview.png',
  hamster: '/icon/profile_background_less/hamster-removebg-preview.png',
  bird: '/icon/profile_background_less/bird-removebg-preview.png',
  hedgehog: '/icon/profile_background_less/hedgehog-removebg-preview.png',
  reptile: '/icon/profile_background_less/reptile-removebg-preview.png',
  etc: '/icon/profile_background_less/etc-removebg-preview.png',
  other: '/icon/profile_background_less/etc-removebg-preview.png'
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
 * 반려동물 데이터에서 이미지 가져오기 (프로필 이미지 우선, 없으면 기본 이미지)
 */
export function getPetImage(petData, useMainImage = false) {
  if (!petData) return useMainImage ? getMainCharacterImage() : getProfileImage();
  
  // 사용자가 등록한 프로필 이미지가 있으면 우선 사용
  if (petData.profileImage) {
    return petData.profileImage;
  }
  
  // 기본 이미지 사용
  const species = petData.species || 'dog';
  return useMainImage ? getMainCharacterImage(species) : getProfileImage(species);
}


