/**
 * 캐릭터 생성 서비스 (Placeholder)
 * TODO: 실제 캐릭터 생성 로직 구현
 */

export async function generatePetCharacter(petData, style) {
  console.log('[CharacterGenerator] 캐릭터 생성 요청:', { petData, style });

  // Placeholder - 실제 구현 필요
  return {
    success: false,
    message: '캐릭터 생성 기능은 준비 중입니다.',
    imageUrl: null
  };
}

export default { generatePetCharacter };
