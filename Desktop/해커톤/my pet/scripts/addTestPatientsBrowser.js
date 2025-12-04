/**
 * 브라우저 콘솔에서 실행할 수 있는 테스트 환자 데이터 추가 스크립트
 * 
 * 사용법:
 * 1. 병원 모드로 로그인 (clinic@happyvet.com)
 * 2. 브라우저 개발자 도구 콘솔 열기 (F12)
 * 3. 아래 코드 전체를 복사해서 콘솔에 붙여넣고 Enter
 */

(async function addTestPatientsInBrowser() {
  const { db } = await import('/src/lib/firebase.js');
  const { collection, doc, setDoc, addDoc, getDocs, query, where, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const TEST_EMAIL = 'clinic@happyvet.com';
  
  // 테스트 환자 데이터
  const TEST_PATIENTS = [
    {
      petName: '초코',
      species: 'dog',
      speciesLabelKo: '강아지',
      breed: '말티즈',
      weight: 3.5,
      ownerName: '김철수',
      ownerPhone: '010-1234-5678'
    },
    {
      petName: '나비',
      species: 'cat',
      speciesLabelKo: '고양이',
      breed: '페르시안',
      weight: 4.2,
      ownerName: '이영희',
      ownerPhone: '010-2345-6789'
    },
    {
      petName: '루이',
      species: 'dog',
      speciesLabelKo: '강아지',
      breed: '골든리트리버',
      weight: 12.5,
      ownerName: '박민수',
      ownerPhone: '010-3456-7890'
    },
    {
      petName: '미미',
      species: 'cat',
      speciesLabelKo: '고양이',
      breed: '러시안블루',
      weight: 3.8,
      ownerName: '최지은',
      ownerPhone: '010-4567-8901'
    },
    {
      petName: '뽀삐',
      species: 'dog',
      speciesLabelKo: '강아지',
      breed: '비글',
      weight: 8.3,
      ownerName: '정수진',
      ownerPhone: '010-5678-9012'
    }
  ];

  try {
    console.log('🔍 테스트 병원 계정 찾는 중...');
    
    // 사용자 정보에서 clinicId 찾기
    const userQuery = query(collection(db, 'users'), where('email', '==', TEST_EMAIL));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      console.error('❌ 사용자 정보를 찾을 수 없습니다.');
      return;
    }

    const userData = userSnapshot.docs[0].data();
    const clinicId = userData.defaultClinicId;
    
    if (!clinicId) {
      console.error('❌ clinicId를 찾을 수 없습니다.');
      return;
    }

    console.log('🏥 병원 ID:', clinicId);

    // clinics 컬렉션에서 병원명 확인
    const clinicDocRef = doc(db, 'clinics', clinicId);
    const clinicDoc = await getDoc(clinicDocRef);
    let clinicName = '행복 동물병원';
    if (clinicDoc.exists()) {
      clinicName = clinicDoc.data().name || clinicName;
    }
    console.log('🏥 병원명:', clinicName);

    // 기존 환자 확인
    const existingPatients = await getDocs(query(collection(db, 'clinicPatients'), where('clinicId', '==', clinicId)));
    console.log(`📋 기존 환자 수: ${existingPatients.size}명`);

    // 테스트 환자 추가
    console.log('\n📝 테스트 환자 추가 중...');
    const addedPatients = [];
    
    for (let i = 0; i < TEST_PATIENTS.length; i++) {
      const patientData = TEST_PATIENTS[i];
      const petId = `test_pet_${Date.now()}_${i}`;
      const patientDocId = `${clinicId}_${petId}`;
      
      // clinicPatients에 환자 추가
      const patientDataToSave = {
        clinicId: clinicId,
        clinicName: clinicName,
        petId: petId,
        petName: patientData.petName,
        species: patientData.species,
        speciesLabelKo: patientData.speciesLabelKo,
        breed: patientData.breed,
        ownerUserId: `test_owner_${i}`,
        ownerName: patientData.ownerName,
        ownerPhone: patientData.ownerPhone,
        lastVisitDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lastDiagnosis: ['정상', '피부염', '소화불량', '감기', '예방접종'][Math.floor(Math.random() * 5)],
        lastTriageLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        lastWeightKg: parseFloat(patientData.weight),
        visitCount: Math.floor(Math.random() * 5) + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'clinicPatients', patientDocId), patientDataToSave, { merge: true });
      console.log(`  ✅ ${patientData.petName} (${patientData.speciesLabelKo}) 추가 완료`);

      // 각 환자에 대한 진료 기록(clinicResults) 추가
      const visitCount = patientDataToSave.visitCount;
      for (let j = 0; j < visitCount; j++) {
        const visitDate = new Date(Date.now() - (visitCount - j - 1) * 7 * 24 * 60 * 60 * 1000);
        const resultData = {
          clinicId: clinicId,
          clinicName: clinicName,
          petId: petId,
          petName: patientData.petName,
          userId: patientDataToSave.ownerUserId,
          ownerId: patientDataToSave.ownerUserId,
          visitDate: visitDate.toISOString().split('T')[0],
          visitTime: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          mainDiagnosis: ['정상', '피부염', '소화불량', '감기', '예방접종'][Math.floor(Math.random() * 5)],
          triageScore: Math.floor(Math.random() * 5) + 1,
          soap: {
            subjective: `${patientData.petName}가 최근 ${['식욕이 좋지 않습니다', '기운이 없어 보입니다', '정상적으로 잘 지내고 있습니다', '가끔 기침을 합니다'][Math.floor(Math.random() * 4)]}`,
            objective: `체온: ${(38 + Math.random() * 0.5).toFixed(1)}°C, 심박수: ${Math.floor(100 + Math.random() * 40)}회/분`,
            assessment: `${patientData.petName}의 전반적인 건강 상태는 양호합니다.`,
            plan: `${['정기 검진', '약물 투여', '식이 조절', '운동 권장'][Math.floor(Math.random() * 4)]}을 권장합니다.`
          },
          sharedToGuardian: j === visitCount - 1, // 최근 방문만 공유됨
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'clinicResults'), resultData);
      }
      console.log(`    📋 진료 기록 ${visitCount}건 추가 완료`);

      addedPatients.push({ petId, ...patientDataToSave });
    }

    console.log(`\n✅ 총 ${addedPatients.length}명의 환자와 진료 기록 추가 완료!`);
    console.log('\n📊 추가된 환자 목록:');
    addedPatients.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.petName} (${p.speciesLabelKo}, ${p.breed}) - 방문 ${p.visitCount}회`);
    });
    
    alert('테스트 환자 데이터 추가 완료! 페이지를 새로고침하세요.');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    alert('오류 발생: ' + error.message);
  }
})();

