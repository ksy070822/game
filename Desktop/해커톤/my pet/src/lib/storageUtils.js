/**
 * Firebase Storage 유틸리티 (Placeholder)
 */

export async function uploadImage(file, path) {
  console.log('[StorageUtils] 이미지 업로드 요청:', { file, path });

  // Placeholder - 실제 구현 필요
  return {
    success: false,
    url: null,
    error: 'Storage 기능은 준비 중입니다.'
  };
}

export function generateFileName(prefix = 'file') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

export default { uploadImage, generateFileName };
