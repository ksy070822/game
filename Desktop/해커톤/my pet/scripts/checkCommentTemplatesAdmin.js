// Firebase Admin SDK를 사용하여 commentTemplates 컬렉션 데이터 확인
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 서비스 계정 키 로드
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ai-factory-c6d58'
});

const db = admin.firestore();

async function checkCommentTemplates() {
  console.log('🔍 Firebase commentTemplates 컬렉션 확인 중 (Admin SDK)...\n');

  try {
    const templatesRef = db.collection('commentTemplates');
    const snapshot = await templatesRef.get();

    if (snapshot.empty) {
      console.log('❌ commentTemplates 컬렉션이 비어있거나 존재하지 않습니다.');
      process.exit(0);
      return;
    }

    console.log(`✅ 총 ${snapshot.size}개의 템플릿 발견\n`);

    // 카테고리별 통계
    const categoryStats = {};
    const templates = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({ id: doc.id, ...data });

      const category = data.category;
      if (!categoryStats[category]) {
        categoryStats[category] = 0;
      }
      categoryStats[category]++;
    });

    // 카테고리 이름 매핑
    const categoryNames = {
      1: '최근 병원/진료',
      2: '약/영양제 복용',
      4: '운동·산책',
      5: '식사·물 섭취',
      7: '배변·피부·일반 웰빙'
    };

    console.log('📊 카테고리별 통계:');
    console.log('━'.repeat(50));

    Object.keys(categoryStats).sort((a, b) => Number(a) - Number(b)).forEach((cat) => {
      const name = categoryNames[cat] || `카테고리 ${cat}`;
      console.log(`  카테고리 ${cat} (${name}): ${categoryStats[cat]}개`);
    });

    console.log('━'.repeat(50));
    console.log(`  합계: ${snapshot.size}개\n`);

    // 샘플 데이터 출력
    console.log('📝 샘플 템플릿 (카테고리별 첫 2개):');
    console.log('━'.repeat(50));

    const shownCategories = {};
    templates.sort((a, b) => a.category - b.category).forEach((template) => {
      const cat = template.category;
      if (!shownCategories[cat]) {
        shownCategories[cat] = 0;
      }
      if (shownCategories[cat] < 2) {
        console.log(`\n  [카테고리 ${cat}] ID: ${template.id}`);
        console.log(`  텍스트: ${template.text}`);
        if (template.createdAt) {
          const date = template.createdAt.toDate ? template.createdAt.toDate() : new Date(template.createdAt);
          console.log(`  생성일: ${date.toLocaleString('ko-KR')}`);
        }
        shownCategories[cat]++;
      }
    });

    console.log('\n' + '━'.repeat(50));
    console.log('✅ 확인 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  }

  process.exit(0);
}

checkCommentTemplates();
