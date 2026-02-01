/**
 * 인트로 시네마틱 시퀀스 설정 — 장면별 배경, 텍스트, 효과, 지속 시간
 */
import { getVillageBg, getGuildBg, TITLE_IMAGE } from '../data/assetPaths.js';
import { CHARACTERS } from '../data/characters.js';

const INTRO_PORTRAIT_ORDER = ['communicator', 'techLeader', 'techCommunicator', 'reporter', 'controlTower'];

export const INTRO_SCENES = [
  {
    id: 0,
    duration: 4000,
    background: getVillageBg(1),
    text: '평화로운 카카오 T 마을...',
    effect: 'fadeIn',
  },
  {
    id: 1,
    duration: 4500,
    background: getVillageBg(2),
    text: '어느 날, 심상치 않은 기운이 감지되었다.',
    effect: 'darken',
  },
  {
    id: 2,
    duration: 4500,
    background: getVillageBg(3),
    text: '결제 대란... 그것이 다가오고 있었다.',
    effect: 'shake',
  },
  {
    id: 3,
    duration: 4000,
    background: getGuildBg(1),
    text: '다섯 영웅들이 소집되었다.',
    effect: null,
  },
  {
    id: 4,
    duration: 6000,
    background: getGuildBg(1),
    text: '그들의 힘이 필요한 때가 왔다.',
    effect: 'portraits',
    portraitIds: INTRO_PORTRAIT_ORDER,
  },
  {
    id: 5,
    duration: 0,
    background: TITLE_IMAGE,
    text: '결제 대란 RPG',
    effect: 'title',
    isTitle: true,
  },
];

export function getPortraitUrl(charId) {
  const char = CHARACTERS[charId];
  return char?.sprites?.portrait ?? '';
}

export const FADE_BLACK_MS = 600;
export const TYPING_SPEED_MS = 40;
