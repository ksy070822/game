/**
 * 보스전 씬 — 결제 대란 격파
 * 5개 아이템을 모아 보스를 물리치는 연출
 */
import { CHARACTERS, INTRO_ORDER } from '../data/characters.js';
import { getVillageBg } from '../data/assetPaths.js';

const BOSS_DIALOGUES = [
  { speaker: '결제 대란', text: '크윽... 영웅들... 네놈들...' },
  { speaker: '나레이터', text: '영웅들이 모은 아이템들이 빛을 발합니다!' },
];

const HERO_SHOUT = '카카오 T의 힘으로, 혼란을 물리쳐라!';

// 각 페이즈별 최소 지속시간 (ms)
const PHASE_MIN_DURATION = [
  1500,  // phase 0: 보스 대사
  1200,  // phase 1: 나레이터
  2000,  // phase 2: 영웅들 등장 (애니메이션 시간)
  1500,  // phase 3: 아이템 합체
  1500,  // phase 4: 영웅들의 외침
  1500,  // phase 5: 보스 격파
  2000,  // phase 6: 승리
];

export class BossScene {
  constructor(game) {
    this.game = game;
    this.domRoot = null;
    this._phase = 0;
    this._keyHandler = null;
    this._phaseStartTime = 0;
    this._canAdvance = true;
  }

  async init() {
    return this;
  }

  async enter() {
    const overlay = this.game.uiContainer;
    if (!overlay) return;
    overlay.innerHTML = '';

    this._phase = 0;
    this._buildDOM();
    this._bindKeys();
    this._showPhase(0);
  }

  _buildDOM() {
    const overlay = this.game.uiContainer;
    this.domRoot = document.createElement('div');
    this.domRoot.className = 'boss-scene';
    this.domRoot.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #1a0a0a 0%, #0f0505 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      z-index: 20;
    `;

    this.domRoot.innerHTML = `
      <div class="boss-bg" id="boss-bg" style="
        position: absolute;
        inset: 0;
        background: url('${getVillageBg(1)}') center/cover no-repeat;
        opacity: 0.3;
        filter: saturate(0.5);
      "></div>
      <div class="boss-monster" id="boss-monster" style="
        position: relative;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, #8B0000 0%, #000 70%);
        border-radius: 50%;
        box-shadow: 0 0 60px #FF0000, 0 0 100px rgba(255,0,0,0.5);
        margin-bottom: 32px;
        animation: bossPulse 2s infinite;
      "></div>
      <div class="boss-dialogue" id="boss-dialogue" style="
        background: rgba(0,0,0,0.9);
        border: 2px solid #d4af37;
        border-radius: 12px;
        padding: 20px 32px;
        max-width: 600px;
        text-align: center;
        margin-bottom: 24px;
      ">
        <div class="boss-speaker" id="boss-speaker" style="
          color: #FF4444;
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 8px;
        "></div>
        <div class="boss-text" id="boss-text" style="
          color: #fff;
          font-size: 18px;
          line-height: 1.6;
        "></div>
      </div>
      <div class="boss-heroes" id="boss-heroes" style="
        display: none;
        gap: 16px;
        margin-bottom: 24px;
      "></div>
      <div class="boss-items" id="boss-items" style="
        display: none;
        gap: 12px;
        margin-bottom: 24px;
      "></div>
      <div class="boss-shout" id="boss-shout" style="
        display: none;
        font-size: 24px;
        font-weight: 700;
        color: #FFD700;
        text-shadow: 0 0 20px rgba(255,215,0,0.8);
        margin-bottom: 24px;
      "></div>
      <div class="boss-hint" style="
        position: absolute;
        bottom: 24px;
        font-size: 14px;
        color: rgba(255,255,255,0.6);
      ">클릭 또는 Space로 진행</div>
    `;

    overlay.appendChild(this.domRoot);
    this.domRoot.addEventListener('click', () => this._advance());
  }

  _bindKeys() {
    this._keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        this._advance();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _unbindKeys() {
    window.removeEventListener('keydown', this._keyHandler);
  }

  _showPhase(phase) {
    // 페이즈 시작 시간 기록
    this._phaseStartTime = Date.now();
    this._canAdvance = false;

    // 최소 지속시간 후 진행 가능하도록 설정
    const minDuration = PHASE_MIN_DURATION[phase] ?? 1000;
    setTimeout(() => {
      this._canAdvance = true;
    }, minDuration);

    const speakerEl = document.getElementById('boss-speaker');
    const textEl = document.getElementById('boss-text');
    const monsterEl = document.getElementById('boss-monster');
    const heroesEl = document.getElementById('boss-heroes');
    const itemsEl = document.getElementById('boss-items');
    const shoutEl = document.getElementById('boss-shout');

    if (phase === 0) {
      // 보스 대사 1
      speakerEl.textContent = BOSS_DIALOGUES[0].speaker;
      textEl.textContent = BOSS_DIALOGUES[0].text;
    } else if (phase === 1) {
      // 나레이터
      speakerEl.textContent = BOSS_DIALOGUES[1].speaker;
      speakerEl.style.color = '#d4af37';
      textEl.textContent = BOSS_DIALOGUES[1].text;
    } else if (phase === 2) {
      // 영웅들 등장
      speakerEl.textContent = '';
      textEl.textContent = '5명의 영웅이 힘을 모읍니다!';
      heroesEl.style.display = 'flex';

      INTRO_ORDER.forEach((charId, i) => {
        const char = CHARACTERS[charId];
        setTimeout(() => {
          const heroDiv = document.createElement('div');
          heroDiv.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 3px solid ${char?.color || '#FFD700'};
            background: ${char?.color || '#FFD700'}20;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            animation: fadeInUp 0.5s ease-out;
            box-shadow: 0 0 15px ${char?.color || '#FFD700'};
          `;
          const iconMap = {
            communicator: '📢',
            techLeader: '⚙️',
            techCommunicator: '🔧',
            controlTower: '🧭',
            reporter: '⏱️',
          };
          heroDiv.textContent = iconMap[charId] || '👤';
          heroesEl.appendChild(heroDiv);
        }, i * 300);
      });
    } else if (phase === 3) {
      // 아이템 합체
      textEl.textContent = '아이템들이 빛의 검으로 합쳐집니다!';
      itemsEl.style.display = 'flex';

      const itemIcons = ['📜', '💻', '🔮', '🗺️', '⏱️'];
      itemIcons.forEach((icon, i) => {
        setTimeout(() => {
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255,215,0,0.2);
            border: 2px solid #FFD700;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            animation: fadeInUp 0.3s ease-out;
          `;
          itemDiv.textContent = icon;
          itemsEl.appendChild(itemDiv);
        }, i * 200);
      });
    } else if (phase === 4) {
      // 영웅들의 외침
      textEl.textContent = '';
      shoutEl.style.display = 'block';
      shoutEl.textContent = `"${HERO_SHOUT}"`;

      // 보스 공격 효과
      monsterEl.style.animation = 'none';
      monsterEl.style.transition = 'all 0.5s';
      monsterEl.style.boxShadow = '0 0 100px #FFD700, 0 0 200px rgba(255,215,0,0.8)';
    } else if (phase === 5) {
      // 보스 격파
      speakerEl.textContent = '결제 대란';
      speakerEl.style.color = '#FF4444';
      textEl.textContent = '크아아아... 이번엔... 졌다...';
      shoutEl.style.display = 'none';

      monsterEl.style.opacity = '0.3';
      monsterEl.style.transform = 'scale(0.5)';
      monsterEl.style.filter = 'grayscale(1)';
    } else if (phase === 6) {
      // 승리
      speakerEl.textContent = '나레이터';
      speakerEl.style.color = '#d4af37';
      textEl.textContent = '결제 대란이 해소되었습니다!';

      monsterEl.style.opacity = '0';

      // 금빛 파티클 효과
      this._createParticles();
    } else {
      // 엔딩으로 전환
      this._goToEnding();
      return;
    }
  }

  _createParticles() {
    const container = this.domRoot;
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #FFD700;
        border-radius: 50%;
        left: ${50 + (Math.random() - 0.5) * 30}%;
        top: ${40 + (Math.random() - 0.5) * 20}%;
        animation: particleFade 2s ease-out forwards;
        opacity: 0;
      `;
      particle.style.animationDelay = `${i * 50}ms`;
      container.appendChild(particle);
    }
  }

  _advance() {
    // 최소 지속시간이 지나지 않았으면 무시
    if (!this._canAdvance) return;

    this._phase++;
    this._showPhase(this._phase);
  }

  _goToEnding() {
    this._unbindKeys();
    this.game.switchScene('ending');
  }

  async exit() {
    this._unbindKeys();
    if (this.domRoot?.parentNode) {
      this.domRoot.parentNode.removeChild(this.domRoot);
    }
  }
}
