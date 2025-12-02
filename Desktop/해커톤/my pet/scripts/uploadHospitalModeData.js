// Firestore에 병원 모드 데이터 업로드 스크립트
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAMubJk9qXmaz_V3uHiCGs0hRe6FSu9ji4",
  authDomain: "ai-factory-c6d58.firebaseapp.com",
  projectId: "ai-factory-c6d58",
  storageBucket: "ai-factory-c6d58.firebasestorage.app",
  messagingSenderId: "213197152130",
  appId: "1:213197152130:web:7c19f9c3c88bea7cc1399b",
  measurementId: "G-4D82WS9H7K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 데이터 파일 경로
const DATA_DIR = join(__dirname, '../data/hospitalMode');

// 업로드할 컬렉션 목록
const COLLECTIONS = [
  { name: 'users', file: 'users_seed_300_hospitalMode.json', idField: 'uid' },
  { name: 'clinics', file: 'clinics_seed_3.json', idField: 'id' },
  { name: 'clinicStaff', file: 'clinicStaff_seed_6.json', idField: 'id' },
  { name: 'bookings', file: 'bookings_seed_130_hospitalMode.json', idField: 'id' },
  { name: 'clinicResults', file: 'clinicResults_seed_110_hospitalMode.json', idField: 'id' },
  { name: 'clinicPatients', file: 'clinicPatients_seed_84_hospitalMode.json', idField: 'id' },
  { name: 'vaccinations', file: 'vaccinations_seed_300_hospitalMode.json', idField: 'id' },
  { name: 'pets', file: 'pets_seed_316.json', idField: 'id' },
  { name: 'diagnoses', file: 'diagnoses_seed_180.json', idField: 'id' },
  { name: 'dailyCareLogs', file: 'dailyCareLogs_v2_seed_1460.json', idField: 'id' },
  { name: 'owner_faq', file: 'owner_faq_seed_260.json', idField: 'id' }
];

// 배치 업로드 함수 (Firestore 500개 제한 고려)
async function uploadCollection(collectionName, data, idField) {
  console.log(`\n📤 업로드 시작: ${collectionName} (${data.length}개 문서)`);

  let uploadedCount = 0;
  const batchSize = 500; // Firestore 배치 제한

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = data.slice(i, i + batchSize);

    chunk.forEach((item) => {
      const docId = item[idField];
      if (!docId) {
        console.warn(`⚠️  ID 필드 없음 (${idField}):`, item);
        return;
      }

      const docRef = doc(db, collectionName, String(docId));
      batch.set(docRef, item);
    });

    try {
      await batch.commit();
      uploadedCount += chunk.length;
      console.log(`  ✅ ${uploadedCount}/${data.length} 업로드 완료`);
    } catch (error) {
      console.error(`  ❌ 배치 업로드 실패 (${i}-${i + batchSize}):`, error);
      throw error;
    }
  }

  console.log(`✅ ${collectionName} 업로드 완료 (총 ${uploadedCount}개)`);
  return uploadedCount;
}

// 메인 업로드 함수
async function uploadAllData() {
  console.log('🚀 병원 모드 데이터 업로드 시작...\n');
  console.log('📂 데이터 디렉토리:', DATA_DIR);

  const results = [];

  for (const { name, file, idField } of COLLECTIONS) {
    try {
      const filePath = join(DATA_DIR, file);
      console.log(`\n📖 파일 읽기: ${file}`);

      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      if (!Array.isArray(data)) {
        console.error(`❌ 배열이 아님: ${file}`);
        continue;
      }

      const count = await uploadCollection(name, data, idField);
      results.push({ collection: name, count, status: 'success' });

    } catch (error) {
      console.error(`\n❌ ${name} 업로드 실패:`, error.message);
      results.push({ collection: name, count: 0, status: 'failed', error: error.message });
    }
  }

  // 최종 결과 요약
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 업로드 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(({ collection, count, status, error }) => {
    const emoji = status === 'success' ? '✅' : '❌';
    console.log(`${emoji} ${collection.padEnd(20)} ${count.toString().padStart(4)}개`);
    if (error) {
      console.log(`   └─ 오류: ${error}`);
    }
  });

  const totalCount = results.reduce((sum, r) => sum + r.count, 0);
  const successCount = results.filter(r => r.status === 'success').length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ 총 ${totalCount}개 문서 업로드 완료`);
  console.log(`✅ 성공: ${successCount}/${results.length} 컬렉션`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 실행
uploadAllData()
  .then(() => {
    console.log('🎉 업로드 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 업로드 중 오류 발생:', error);
    process.exit(1);
  });
