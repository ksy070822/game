/**
 * Central asset paths under public/assets.
 * Character IDs: communicator, techLeader, techCommunicator, controlTower, reporter.
 * Folder names: communicator, tech_leader, tech_communicator, control_tower, reporter.
 * 기본 이미지: idle.png (서 있는 모습)
 */
const BASE = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : '';
const A = `${BASE}/assets`;
const IMG = `${BASE}/image`;

// 영문 ID → 영문 폴더명 매핑
const CHAR_ID_TO_FOLDER = {
  communicator: 'communicator',
  techLeader: 'tech_leader',
  techCommunicator: 'tech_communicator',
  controlTower: 'control_tower',
  reporter: 'reporter',
};

export function getCharacterAssetDir(id) {
  const folder = CHAR_ID_TO_FOLDER[id] || id;
  return `${A}/characters/${folder}`;
}

/** 캐릭터 메인 이미지 (idle.png - 서 있는 모습) */
export function getCharacterMainImage(charId) {
  const folder = CHAR_ID_TO_FOLDER[charId];
  if (folder) {
    return `${A}/characters/${folder}/idle.png`;
  }
  return null;
}

/** 캐릭터 포즈별 스프라이트 URL */
export function getCharacterSpriteUrl(charId, pose) {
  const dir = getCharacterAssetDir(charId);
  const poseFiles = {
    idle: 'idle.png',
    portrait: 'portrait.png',
    walk_up: 'walk_up.png',
    walk_down: 'idle.png',
    walk_left: 'walk_left.png',
    walk_right: 'walk_right.png',
  };
  const file = poseFiles[pose] || 'idle.png';
  return `${dir}/${file}`;
}

/** stageLevel 1–5: 배경 이미지 (public/image/캐릭터/배경/) */
const VILLAGE_BG_FILES = {
  1: 'green_실내.jpeg',      // 평화로운 상태
  2: 'yellow_실내.jpeg',     // 주의 상태
  3: 'orenge_실내.jpeg',     // 위기 상태
  4: 'red_실내.jpeg',        // 심각 상태
  5: 'green-2_실내.jpeg',    // 복구 완료
};

export function getVillageBg(stageLevel = 1) {
  const file = VILLAGE_BG_FILES[Math.min(5, Math.max(1, stageLevel))] || 'green_실내.jpeg';
  return `${IMG}/캐릭터/배경/${file}`;
}

/** stageLevel 1–4 for guild (인트로용 배경) */
const GUILD_BG_FILES = {
  1: 'Green.jpg',
  2: 'yellow.jpeg',
  3: 'orenge.jpeg',
  4: 'red.jpeg',
};

export function getGuildBg(stageLevel = 1) {
  const file = GUILD_BG_FILES[Math.min(4, Math.max(1, stageLevel))] || 'Green.jpg';
  return `${IMG}/캐릭터/배경/${file}`;
}

/** riskLevel 0–3: idle, angry, weakened, defeated */
const BOSS_SPRITES = ['idle', 'angry', 'weakened', 'defeated'];

export function getBossSprite(riskLevel = 0) {
  const idx = Math.min(3, Math.max(0, Math.floor(riskLevel)));
  return `${A}/characters/boss/${BOSS_SPRITES[idx]}.png`;
}

/** Compute risk level 0–3 from state (internalChaos + externalRisk). */
export function getRiskLevel(state) {
  const chaos = state?.internalChaos ?? 0;
  const ext = state?.externalRisk ?? 0;
  const avg = (chaos + ext) / 2;
  return Math.min(3, Math.floor(avg / 25));
}

/** Compute stage level 1–5 from currentAllyIndex (0→1, 1→2, … 4→5 recovering). */
export function getStageLevelFromAllyIndex(currentAllyIndex) {
  return Math.min(5, Math.max(1, currentAllyIndex + 1));
}

// 영문 ID → 영문 폴더명 (items용)
const CHAR_ID_TO_ITEM_FOLDER = {
  communicator: 'communicator',
  techLeader: 'tech_leader',
  techCommunicator: 'tech_communicator',
  controlTower: 'control_tower',
  reporter: 'reporter',
};

const ITEM_BASE_NAMES = {
  communicator: 'base_scroll',
  tech_leader: 'base_tablet',
  tech_communicator: 'base_orb',
  control_tower: 'base_map',
  reporter: 'base_clock',
};

export function getItemImage(charId, slotIndex) {
  const folder = CHAR_ID_TO_ITEM_FOLDER[charId] || charId;
  if (slotIndex === 0) {
    const base = ITEM_BASE_NAMES[folder] || 'base_scroll';
    return `${A}/items/${folder}/${base}.png`;
  }
  return `${A}/items/${folder}/sub${Math.min(4, slotIndex)}.png`;
}

/** 타이틀 화면 메인 이미지 — public/assets/ui/title.png */
export const TITLE_IMAGE = `${A}/ui/title.png`;

/** 테크리더 move 폴더 내 GLB (public/assets/characters/tech_leader/move/*.glb) — 추후 3D 렌더 시 사용, 현재는 PNG 스프라이트 사용 */
export function getTechLeaderMoveGlbPath(filename = 'character.glb') {
  return `${A}/characters/tech_leader/move/${filename}`;
}
