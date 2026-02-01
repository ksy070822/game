
import React from 'react';

export enum SkillType {
  AUTOMATION = '자동화 장착',
  API = '데이터 연동',
  BOT = '지능형 봇',
  AI = '제미나이 AI'
}

export interface SlideContent {
  id: number;
  title: string;
  subtitle?: string;
  category: string;
  content: React.ReactNode;
  levelUp?: SkillType;
  isEnding?: boolean;
  isBossBattle?: boolean;
  isSkillAcquisition?: boolean;
  bossData?: {
    name: string;
    hp: number;
    maxHp: number;
    problems: Array<{ name: string; hp: number; icon: string }>;
  };
}

export interface CharacterState {
  level: number;
  skills: SkillType[];
}
