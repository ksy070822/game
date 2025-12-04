# 테스트 환자 데이터 추가 가이드

## 방법 1: 브라우저 콘솔에서 실행 (권장)

1. 병원 모드로 로그인 (`clinic@happyvet.com`)
2. 브라우저 개발자 도구 콘솔 열기 (F12 또는 Cmd+Option+I)
3. 아래 코드를 복사해서 콘솔에 붙여넣고 Enter

```javascript
(async function() {
  const { db } = await import('/src/lib/firebase.js');
  const { collection, doc, setDoc, addDoc, getDocs, query, where, getDoc, serverTimestamp } = await import('firebase/firestore');
  
  const TEST_EMAIL = 'clinic@happyvet.com';
  const TEST_PATIENTS = [
    { petName: '초코', species: 'dog', speciesLabelKo: '강아지', breed: '말티즈', weight: 3.5, ownerName: '김철수', ownerPhone: '010-1234-5678' },
    { petName: '나비', species: 'cat', speciesLabelKo: '고양이', breed: '페르시안', weight: 4.2, ownerName: '이영희', ownerPhone: '010-2345-6789' },
    { petName: '루이', species: 'dog', speciesLabelKo: '강아지', breed: '골든리트리버', weight: 12.5, ownerName: '박민수', ownerPhone: '010-3456-7890' },
    { petName: '미미', species: 'cat', speciesLabelKo: '고양이', breed: '러시안블루', weight: 3.8, ownerName: '최지은', ownerPhone: '010-4567-8901' },
    { petName: '뽀삐', species: 'dog', speciesLabelKo: '강아지', breed: '비글', weight: 8.3, ownerName: '정수진', ownerPhone: '010-5678-9012' }
  ];

  try {
    const userQuery = query(collection(db, 'users'), where('email', '==', TEST_EMAIL));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) { console.error('❌ 사용자 정보를 찾을 수 없습니다.'); return; }
    
    const clinicId = userSnapshot.docs[0].data().defaultClinicId;
    if (!clinicId) { console.error('❌ clinicId를 찾을 수 없습니다.'); return; }
    
    const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
    const clinicName = clinicDoc.exists() ? clinicDoc.data().name : '행복 동물병원';
    
    console.log('🏥 병원 ID:', clinicId, '병원명:', clinicName);
    
    for (let i = 0; i < TEST_PATIENTS.length; i++) {
      const p = TEST_PATIENTS[i];
      const petId = `test_pet_${Date.now()}_${i}`;
      const patientDocId = `${clinicId}_${petId}`;
      
      const patientData = {
        clinicId, clinicName, petId, petName: p.petName, species: p.species,
        speciesLabelKo: p.speciesLabelKo, breed: p.breed, ownerUserId: `test_owner_${i}`,
        ownerName: p.ownerName, ownerPhone: p.ownerPhone,
        lastVisitDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lastDiagnosis: ['정상', '피부염', '소화불량', '감기', '예방접종'][Math.floor(Math.random() * 5)],
        lastTriageLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        lastWeightKg: p.weight, visitCount: Math.floor(Math.random() * 5) + 1,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'clinicPatients', patientDocId), patientData, { merge: true });
      console.log(`✅ ${p.petName} 추가 완료`);
      
      const visitCount = patientData.visitCount;
      for (let j = 0; j < visitCount; j++) {
        const visitDate = new Date(Date.now() - (visitCount - j - 1) * 7 * 24 * 60 * 60 * 1000);
        await addDoc(collection(db, 'clinicResults'), {
          clinicId, clinicName, petId, petName: p.petName,
          userId: patientData.ownerUserId, ownerId: patientData.ownerUserId,
          visitDate: visitDate.toISOString().split('T')[0],
          visitTime: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          mainDiagnosis: ['정상', '피부염', '소화불량', '감기', '예방접종'][Math.floor(Math.random() * 5)],
          triageScore: Math.floor(Math.random() * 5) + 1,
          soap: {
            subjective: `${p.petName}가 최근 ${['식욕이 좋지 않습니다', '기운이 없어 보입니다', '정상적으로 잘 지내고 있습니다', '가끔 기침을 합니다'][Math.floor(Math.random() * 4)]}`,
            objective: `체온: ${(38 + Math.random() * 0.5).toFixed(1)}°C, 심박수: ${Math.floor(100 + Math.random() * 40)}회/분`,
            assessment: `${p.petName}의 전반적인 건강 상태는 양호합니다.`,
            plan: `${['정기 검진', '약물 투여', '식이 조절', '운동 권장'][Math.floor(Math.random() * 4)]}을 권장합니다.`
          },
          sharedToGuardian: j === visitCount - 1,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      }
      console.log(`  📋 진료 기록 ${visitCount}건 추가 완료`);
    }
    
    console.log('✅ 테스트 환자 데이터 추가 완료! 페이지를 새로고침하세요.');
    alert('테스트 환자 데이터 추가 완료!');
  } catch (error) {
    console.error('❌ 오류:', error);
    alert('오류: ' + error.message);
  }
})();
```

## 방법 2: Node.js 스크립트 실행

```bash
cd "/Users/cobb.morning/Documents/ai-factory/Desktop/해커톤/my pet"
node scripts/addTestPatients.js
```

**주의**: `node_modules`가 설치되어 있어야 합니다. 설치되지 않은 경우:
```bash
npm install
```

## 추가된 기능

1. **환자 목록 카운트 제거**: "환자 목록 (0마리)" → "환자 목록"
2. **clinicPatients 컬렉션 직접 조회**: 예약 기록뿐만 아니라 `clinicPatients` 컬렉션에서도 환자 목록을 가져옵니다.
3. **진료 기록 표시**: 환자 클릭 시 예약 기록과 `clinicResults` 컬렉션의 진료 기록을 모두 표시합니다.

