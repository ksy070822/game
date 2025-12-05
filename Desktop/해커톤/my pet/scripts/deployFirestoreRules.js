// Firebase Admin SDK를 사용하여 Firestore 규칙 배포
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

async function deployRules() {
  console.log('🚀 Firestore 규칙 배포 중...\n');

  try {
    // 규칙 파일 읽기
    const rulesContent = readFileSync(join(__dirname, '../firestore.rules'), 'utf8');

    console.log('📄 배포할 규칙:');
    console.log('━'.repeat(50));
    console.log(rulesContent);
    console.log('━'.repeat(50));

    // Firestore Security Rules API 사용
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    });

    const authClient = await auth.getClient();

    // Firebase Rules API 호출
    const response = await authClient.request({
      url: `https://firebaserules.googleapis.com/v1/projects/ai-factory-c6d58/rulesets`,
      method: 'POST',
      data: {
        source: {
          files: [{
            name: 'firestore.rules',
            content: rulesContent
          }]
        }
      }
    });

    const rulesetName = response.data.name;
    console.log(`✅ Ruleset 생성됨: ${rulesetName}`);

    // Release 생성 (규칙 활성화)
    await authClient.request({
      url: `https://firebaserules.googleapis.com/v1/projects/ai-factory-c6d58/releases`,
      method: 'POST',
      data: {
        name: 'projects/ai-factory-c6d58/releases/cloud.firestore',
        rulesetName: rulesetName
      }
    });

    console.log('✅ Firestore 규칙이 성공적으로 배포되었습니다!');

  } catch (error) {
    if (error.response) {
      console.error('❌ API 오류:', error.response.data);
    } else {
      console.error('❌ 오류 발생:', error.message);
    }
  }

  process.exit(0);
}

deployRules();
