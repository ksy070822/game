/**
 * clinics 컬렉션에 animalHospitalId 필드 추가 스크립트
 * 
 * 목적: clinics와 animal_hospitals를 병원명으로 매칭하여 animalHospitalId 추가
 * 
 * 사용법:
 * node scripts/addAnimalHospitalIdToClinics.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc, limit } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드
dotenv.config({ path: join(__dirname, '../.env') });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * clinics에 animalHospitalId 추가
 */
async function addAnimalHospitalIdToClinics() {
  console.log('🔄 clinics에 animalHospitalId 추가 시작...\n');

  try {
    // 1. 모든 clinics 조회
    console.log('📋 모든 clinics 조회 중...');
    const clinicsSnapshot = await getDocs(collection(db, 'clinics'));
    console.log(`   총 ${clinicsSnapshot.size}개의 clinics 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // 2. 각 clinic에 대해 animal_hospitals에서 매칭
    for (const clinicDoc of clinicsSnapshot.docs) {
      const clinic = clinicDoc.data();
      const clinicId = clinicDoc.id;
      const clinicName = clinic.name;

      if (!clinicName) {
        console.log(`   ⚠ [${clinicId}] 병원명 없음, 스킵`);
        skippedCount++;
        continue;
      }

      // 이미 animalHospitalId가 있으면 스킵
      if (clinic.animalHospitalId) {
        console.log(`   ✓ [${clinicId}] 이미 animalHospitalId 있음: ${clinic.animalHospitalId}`);
        skippedCount++;
        continue;
      }

      // 병원명으로 animal_hospitals 찾기
      const hospitalsQuery = query(
        collection(db, 'animal_hospitals'),
        where('name', '==', clinicName),
        limit(1)
      );
      const hospitalsSnapshot = await getDocs(hospitalsQuery);

      if (!hospitalsSnapshot.empty) {
        const animalHospitalId = hospitalsSnapshot.docs[0].id;

        // clinics 업데이트
        await updateDoc(clinicDoc.ref, {
          animalHospitalId: animalHospitalId
        });

        console.log(`   ✅ [${clinicId}] ${clinicName}`);
        console.log(`      - animalHospitalId 추가: ${animalHospitalId}\n`);
        updatedCount++;
      } else {
        // 사업장명으로도 시도
        const hospitalsQuery2 = query(
          collection(db, 'animal_hospitals'),
          where('사업장명', '==', clinicName),
          limit(1)
        );
        const hospitalsSnapshot2 = await getDocs(hospitalsQuery2);

        if (!hospitalsSnapshot2.empty) {
          const animalHospitalId = hospitalsSnapshot2.docs[0].id;

          await updateDoc(clinicDoc.ref, {
            animalHospitalId: animalHospitalId
          });

          console.log(`   ✅ [${clinicId}] ${clinicName} (사업장명으로 매칭)`);
          console.log(`      - animalHospitalId 추가: ${animalHospitalId}\n`);
          updatedCount++;
        } else {
          console.log(`   ⚠ [${clinicId}] animal_hospitals에서 병원을 찾을 수 없음: ${clinicName}\n`);
          skippedCount++;
        }
      }
    }

    console.log('\n📊 업데이트 결과:');
    console.log(`   ✅ 업데이트: ${updatedCount}개`);
    console.log(`   ⏭ 스킵: ${skippedCount}개`);
    console.log('\n🎉 완료!');

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

// 실행
addAnimalHospitalIdToClinics()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

