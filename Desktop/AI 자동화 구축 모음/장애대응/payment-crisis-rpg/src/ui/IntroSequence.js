/**
 * 인트로 시네마틱 시퀀스 설정 — 장면별 배경, 텍스트, 효과, 지속 시간
 * GAME_SCRIPT.md 기반 6개 장면 구현
 */
import { getVillageBg, getGuildBg, TITLE_IMAGE } from '../data/assetPaths.js';
import { CHARACTERS } from '../data/characters.js';

const INTRO_PORTRAIT_ORDER = ['communicator', 'techLeader', 'techCommunicator', 'controlTower', 'reporter'];

// 마을 주민 대사
export const VILLAGER_LINES = {
  scene1: [
    { speaker: '주민 A', text: '오늘도 택시 잘 탔어!' },
    { speaker: '주민 B', text: '퀵 배달 5분 만에 왔어, 세상 좋아졌다~' },
    { speaker: '주민 C', text: '바이크 타고 출근하니까 너무 편해!' },
  ],
  scene2: [
    { speaker: '주민 D', text: '어...? 저거 뭐야?' },
    { speaker: '주민 E', text: '바람이 왜 이렇게 차갑지...' },
    { speaker: '주민 F', text: '하늘 좀 봐... 뭔가 이상해...' },
  ],
  scene3: [
    { speaker: '결제 대란', text: '크르르르... 모든 거래를... 멈춰라...' },
    { speaker: '주민들', text: '뭐야 저거?! / 도망쳐! / 택시가 안 잡혀! / 결제가 안 돼!' },
  ],
};

// 영웅 스킬 대사
export const HERO_SKILL_LINES = {
  communicator: {
    skillName: '황금 스크롤',
    skillLine: '황금 스크롤이여, 진실을 전하라!',
    introLine: '상황을 전파해야 해요. 제가 공지를 준비할게요!',
  },
  techLeader: {
    skillName: '복구의 태블릿',
    skillLine: '복구의 태블릿이여, 연결을 되살려라!',
    introLine: '원인을 찾겠습니다. 시스템을 점검합니다!',
  },
  techCommunicator: {
    skillName: '번역의 수정구',
    skillLine: '번역의 수정구여, 이해의 빛을 비춰라!',
    introLine: '기술 상황을 쉽게 번역해드릴게요!',
  },
  controlTower: {
    skillName: '계약의 지도',
    skillLine: '계약의 지도여, 길을 보여라!',
    introLine: '전체 상황을 지휘하겠습니다!',
  },
  reporter: {
    skillName: '황금 시계',
    skillLine: '황금 시계여, 시간의 진실을 보여라!',
    introLine: '시간을 기록합니다. 타이밍이 중요해요!',
  },
};

export const INTRO_SCENES = [
  // 장면 1: 평화로운 카카오 T 마을
  {
    id: 0,
    duration: 8000,  // 8초 (텍스트 읽을 시간 충분히)
    background: getVillageBg(1),
    text: '여기는 카카오 T 마을.\n택시가 달리고, 퀵이 오가고, 바이크가 누비는...\n모든 것이 순조로운 어느 날의 이야기입니다.',
    effect: 'fadeIn',
    villagerLines: VILLAGER_LINES.scene1,
  },
  // 장면 2: 심상치 않은 기운
  {
    id: 1,
    duration: 8000,  // 8초
    background: getVillageBg(1),
    text: '그러나...\n스산한 바람이 불기 시작했습니다.\n하늘 저편에서 무언가가 다가오고 있었습니다.',
    effect: 'darken',
    villagerLines: VILLAGER_LINES.scene2,
  },
  // 장면 3: 결제 대란의 접근
  {
    id: 2,
    duration: 8000,  // 8초
    background: getVillageBg(2),
    text: '결제 대란.\n모든 결제를 삼키는 거대한 혼돈의 존재.\n마을에 그림자가 다가오고 있었습니다.',
    effect: 'shake',
    villagerLines: VILLAGER_LINES.scene3,
    showBoss: true,
  },
  // 장면 4: 다섯 영웅의 소집
  {
    id: 3,
    duration: 10000,  // 10초 (영웅들 등장 시간)
    background: getGuildBg(1),
    text: '위기의 순간,\n다섯 영웅이 나타났습니다.',
    effect: 'portraits',
    portraitIds: INTRO_PORTRAIT_ORDER,
    showSkillLines: true,
  },
  // 장면 5: 캐릭터 선택 화면
  {
    id: 4,
    duration: 0,  // 수동 진행 (캐릭터 선택)
    background: getGuildBg(1),
    text: '당신은 누구의 이야기를 이끌겠습니까?',
    effect: 'characterSelect',
    isCharacterSelect: true,
  },
  // 장면 6: 컨트롤센터 집결 (캐릭터 선택 후)
  {
    id: 5,
    duration: 5000,  // 5초
    background: getGuildBg(2),
    text: '영웅들이 컨트롤센터에 모였습니다.\n위기 대응이 시작됩니다.',
    effect: 'fadeIn',
    isControlCenter: true,
  },
];

export function getPortraitUrl(charId) {
  const char = CHARACTERS[charId];
  return char?.sprites?.portrait ?? '';
}

export const FADE_BLACK_MS = 600;
export const TYPING_SPEED_MS = 80;  // 글자당 80ms (느린 타이핑)
