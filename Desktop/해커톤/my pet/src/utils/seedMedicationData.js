/**
 * 테스트 계정 보호자의 "뿌꾸" 반려동물에게 약물 처방 정보 추가 스크립트
 * 
 * 사용법:
 *   F12 → Console에서:
 *   
 *   // 테스트 계정 보호자로 로그인 후
 *   const user = window.auth.currentUser;
 *   await window.seedMedicationData(user.uid);
 */

import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

/**
 * 날짜 생성 헬퍼
 */
function getDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return Timestamp.fromDate(date);
}

/**
 * 약물 처방 정보 추가
 */
export async function seedMedicationData(guardianUid) {
  console.log(`\n💊 약물 처방 정보 추가 시작: ${guardianUid}\n`);

  try {
    // 1. 뿌꾸 반려동물 찾기
    console.log('🐾 뿌꾸 반려동물 찾는 중...');
    
    const petsQuery = query(
      collection(db, 'pets'),
      where('userId', '==', guardianUid)
    );
    const petsSnapshot = await getDocs(petsQuery);
    
    let 뿌꾸Id = null;
    let 뿌꾸Name = null;
    
    petsSnapshot.forEach(doc => {
      const petData = doc.data();
      if (petData.petName === '뿌꾸' || petData.petName === '뿌꾸' || petData.name === '뿌꾸') {
        뿌꾸Id = doc.id;
        뿌꾸Name = petData.petName || petData.name;
      }
    });
    
    if (!뿌꾸Id) {
      // 뿌꾸가 없으면 첫 번째 반려동물 사용
      if (!petsSnapshot.empty) {
        const firstPet = petsSnapshot.docs[0];
        뿌꾸Id = firstPet.id;
        뿌꾸Name = firstPet.data().petName || firstPet.data().name;
        console.log(`   ⚠️ 뿌꾸를 찾을 수 없어 첫 번째 반려동물 사용: ${뿌꾸Name} (ID: ${뿌꾸Id})`);
      } else {
        throw new Error('반려동물을 찾을 수 없습니다. 먼저 반려동물을 등록해주세요.');
      }
    } else {
      console.log(`   ✅ 뿌꾸 찾음: ${뿌꾸Name} (ID: ${뿌꾸Id})`);
    }

    // 2. 약물 처방 정보 10개 샘플 생성 (더미데이터 참고)
    console.log('\n💊 약물 처방 정보 생성 중...');
    
    const medications = [
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "항생제",
          dosage: "1일 1회",
          duration: "5일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(5),
        evaluation: {
          effectivenessRating: 5,
          sideEffectLevel: 2,
          effectComment: "약 먹고 약간 무기력해진 느낌이에요."
        },
        createdAt: getDate(5)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "위장보호제",
          dosage: "1일 2회",
          duration: "5일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(10),
        evaluation: {
          effectivenessRating: 4,
          sideEffectLevel: 0,
          effectComment: "증상이 많이 좋아졌어요."
        },
        createdAt: getDate(10)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "아포퀠정",
          dosage: "1일 1회",
          duration: "10일분",
          usage: "식후 30분"
        },
        administeredAt: getDate(15),
        evaluation: {
          effectivenessRating: 4,
          sideEffectLevel: 2,
          effectComment: "부작용 없이 잘 먹고 있어요."
        },
        createdAt: getDate(15)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "스테로이드 연고",
          dosage: "1일 1회",
          duration: "7일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(20),
        evaluation: {
          effectivenessRating: 3,
          sideEffectLevel: 2,
          effectComment: "증상이 많이 좋아졌어요."
        },
        createdAt: getDate(20)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "항생제",
          dosage: "1일 2회",
          duration: "7일분",
          usage: "식후 30분"
        },
        administeredAt: getDate(25),
        evaluation: {
          effectivenessRating: 5,
          sideEffectLevel: 1,
          effectComment: "부작용 없이 잘 먹고 있어요."
        },
        createdAt: getDate(25)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "위장보호제",
          dosage: "1일 3회",
          duration: "5일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(30),
        evaluation: {
          effectivenessRating: 4,
          sideEffectLevel: 0,
          effectComment: "조금 좋아졌지만 아직 남아있어요."
        },
        createdAt: getDate(30)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "아포퀠정",
          dosage: "1일 1회",
          duration: "7일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(35),
        evaluation: {
          effectivenessRating: 3,
          sideEffectLevel: 1,
          effectComment: "약 먹고 약간 무기력해진 느낌이에요."
        },
        createdAt: getDate(35)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "항히스타민제",
          dosage: "1일 1회",
          duration: "5일분",
          usage: "식후 30분"
        },
        administeredAt: getDate(40),
        evaluation: {
          effectivenessRating: 4,
          sideEffectLevel: 2,
          effectComment: "증상이 많이 좋아졌어요."
        },
        createdAt: getDate(40)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "소화제",
          dosage: "1일 2회",
          duration: "5일분",
          usage: "식전 30분"
        },
        administeredAt: getDate(45),
        evaluation: {
          effectivenessRating: 5,
          sideEffectLevel: 0,
          effectComment: "부작용 없이 잘 먹고 있어요."
        },
        createdAt: getDate(45)
      },
      {
        petId: 뿌꾸Id,
        petName: 뿌꾸Name,
        medication: {
          name: "진통제",
          dosage: "1일 1회",
          duration: "3일분",
          usage: "식후 30분"
        },
        administeredAt: getDate(50),
        evaluation: {
          effectivenessRating: 4,
          sideEffectLevel: 1,
          effectComment: "특별한 변화는 못 느꼈어요."
        },
        createdAt: getDate(50)
      }
    ];

    const medicationIds = [];
    for (const med of medications) {
      const ref = await addDoc(collection(db, 'medicationLogs'), {
        ...med,
        userId: guardianUid,
        createdAt: serverTimestamp()
      });
      medicationIds.push(ref.id);
      console.log(`   ✅ 약물 처방 추가: ${med.medication.name} (${med.medication.duration})`);
    }

    console.log(`\n✅ 약물 처방 정보 10개 추가 완료!`);
    return {
      success: true,
      petId: 뿌꾸Id,
      petName: 뿌꾸Name,
      medications: medicationIds.length
    };
  } catch (error) {
    console.error('❌ 약물 처방 정보 추가 오류:', error);
    throw error;
  }
}

// 브라우저 콘솔에서 사용할 수 있도록 전역 함수로 등록
if (typeof window !== 'undefined') {
  window.seedMedicationData = seedMedicationData;
}

