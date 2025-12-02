/**
 * 예약 데이터 마이그레이션 스크립트
 * 
 * 목적: animal_hospitals ID로 저장된 예약을 clinics ID로 업데이트
 * 
 * 사용법:
 * node scripts/migrateBookings.js
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
 * 예약 데이터 마이그레이션
 */
async function migrateBookings() {
  console.log('🔄 예약 데이터 마이그레이션 시작...\n');

  try {
    // 1. 모든 bookings 조회
    console.log('📋 모든 예약 조회 중...');
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    console.log(`   총 ${bookingsSnapshot.size}개의 예약 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. 각 예약에 대해 clinics ID 찾기
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;
      
      // 이미 clinics ID로 저장되어 있으면 스킵
      const currentClinicId = booking.clinicId;
      
      // clinics 컬렉션에서 해당 ID가 있는지 확인
      try {
        const clinicDoc = await getDoc(doc(db, 'clinics', currentClinicId));
        
        if (clinicDoc.exists()) {
          // 이미 clinics ID로 저장되어 있음
          console.log(`   ✓ [${bookingId}] 이미 clinics ID 사용: ${currentClinicId}`);
          skippedCount++;
          continue;
        }
      } catch (e) {
        // clinics에 없으면 animal_hospitals ID일 가능성
      }

      // animal_hospitals ID로 저장된 경우, clinics에서 찾기
      const clinicName = booking.clinicName || booking.hospital?.name;
      
      if (!clinicName) {
        console.log(`   ⚠ [${bookingId}] 병원명 없음, 스킵`);
        skippedCount++;
        continue;
      }

      // 병원명으로 clinics 찾기
      const clinicsQuery = query(
        collection(db, 'clinics'),
        where('name', '==', clinicName),
        limit(1)
      );
      const clinicsSnapshot = await getDocs(clinicsQuery);

      if (!clinicsSnapshot.empty) {
        const actualClinicId = clinicsSnapshot.docs[0].id;
        const animalHospitalId = currentClinicId; // 원본 ID 보관

        // 예약 업데이트
        await updateDoc(bookingDoc.ref, {
          clinicId: actualClinicId,
          animalHospitalId: animalHospitalId, // 원본 ID 보관
          hospitalId: animalHospitalId // 추가 필드
        });

        console.log(`   ✅ [${bookingId}] 업데이트 완료: ${clinicName}`);
        console.log(`      - 이전 clinicId: ${animalHospitalId}`);
        console.log(`      - 새 clinicId: ${actualClinicId}\n`);
        updatedCount++;
      } else {
        console.log(`   ⚠ [${bookingId}] clinics에서 병원을 찾을 수 없음: ${clinicName}`);
        console.log(`      - animalHospitalId로 보관: ${currentClinicId}\n`);
        
        // animalHospitalId 필드만 추가
        await updateDoc(bookingDoc.ref, {
          animalHospitalId: currentClinicId,
          hospitalId: currentClinicId
        });
        skippedCount++;
      }
    }

    console.log('\n📊 마이그레이션 결과:');
    console.log(`   ✅ 업데이트: ${updatedCount}개`);
    console.log(`   ⏭ 스킵: ${skippedCount}개`);
    console.log(`   ❌ 오류: ${errorCount}개`);
    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    throw error;
  }
}

// 실행
migrateBookings()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

