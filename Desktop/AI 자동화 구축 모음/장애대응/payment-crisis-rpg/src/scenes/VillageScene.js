/**
 * 마을 맵 (v3) — 방향키 이동, 컨트롤센터 진입 시 controlCenter 씬으로
 */
import { CHARACTERS } from '../data/characters.js';
import { BACKGROUNDS } from '../data/stages.js';

const SPEED = 8;
const HALF = 24;
const ENTER_ZONE = 80;

export class VillageScene {
  constructor(game) {
    this.game = game;
    this.domRoot = null;
    this.playerEl = null;
    this.playerX = 0;
    this.playerY = 0;
    this.centerX = 0;
    this.centerY = 0;
    this._loopId = null;
    this._keys = {};
  }

  async enter() {
    const job = this.game.state.get('selectedJob');
    if (!job) {
      this.game.switchScene('title');
      return;
    }
    const char = CHARACTERS[job];
    const overlay = this.game.uiContainer;
    overlay.innerHTML = '';
    this.domRoot = document.createElement('div');
    this.domRoot.className = 'village-scene';
    this.domRoot.style.cssText =
      'position:absolute;inset:0;background:linear-gradient(180deg,#1a2a1a 0%,#0f1a0f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;';
    const w = this.game.width;
    const h = this.game.height;
    this.centerX = w / 2 - HALF;
    this.centerY = h / 2 - HALF - 60;
    this.playerX = w / 2 - HALF;
    this.playerY = h * 0.6 - HALF;
    this.domRoot.innerHTML = `
      <div class="village-bg" style="position:absolute;inset:0;background:url('${BACKGROUNDS.village}') center/cover no-repeat;background-color:#1a2a1a;"></div>
      <p class="village-hint" style="position:absolute;top:24px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.9);font-size:16px;">컨트롤센터로 이동하세요 (중앙 문)</p>
      <div class="control-center-zone" style="position:absolute;left:50%;top:35%;transform:translate(-50%,-50%);width:120px;height:80px;border:2px dashed rgba(255,229,0,0.5);border-radius:8px;pointer-events:none;"></div>
      <div class="village-player" id="village-player"></div>
      <p class="village-keys" style="position:absolute;bottom:24px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:14px;">← → ↑ ↓ 이동 · 문 앞에서 Space</p>
    `;
    this.playerEl = this.domRoot.querySelector('#village-player');
    this.playerEl.style.cssText = `position:absolute;left:${this.playerX}px;top:${this.playerY}px;width:64px;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;transition:left 0.05s, top 0.05s;pointer-events:none;`;
    this._playerShadow = document.createElement('div');
    this._playerShadow.className = 'village-player-shadow';
    this._playerShadow.style.cssText = 'position:absolute;bottom:-4px;width:40px;height:12px;background:radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%);border-radius:50%;';
    this.playerEl.appendChild(this._playerShadow);
    this._playerImg = document.createElement('img');
    this._playerImg.alt = char?.name || '';
    this._playerImg.className = 'village-player-sprite';
    this._playerImg.style.cssText = 'width:64px;height:96px;object-fit:contain;object-position:bottom;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));transition:transform 0.08s ease-out;';
    this._playerImg.onerror = () => { this._playerImg.style.display = 'none'; };
    this.playerEl.appendChild(this._playerImg);
    this._playerChar = char;
    this._facing = 'idle';
    this._moving = false;
    this._flipX = false;
    this._updatePlayerSprite();
    overlay.appendChild(this.domRoot);
    this._bindKeys();
    this._startLoop();
  }

  _updatePlayerSprite() {
    const char = this._playerChar;
    if (!char?.sprites || !this._playerImg) return;

    // 방향에 따른 스프라이트 키 결정
    let spriteKey = 'idle';
    this._flipX = false;

    if (this._facing !== 'idle') {
      if (this._facing === 'Up') {
        spriteKey = 'walkUp';
      } else if (this._facing === 'Down') {
        spriteKey = 'walkDown';  // 없으면 idle 폴백
      } else if (this._facing === 'Left') {
        // walk_left가 없으면 walk_right를 좌우반전
        if (char.sprites.walkLeft && char.sprites.walkLeft !== char.sprites.idle) {
          spriteKey = 'walkLeft';
        } else {
          spriteKey = 'walkRight';
          this._flipX = true;
        }
      } else if (this._facing === 'Right') {
        spriteKey = 'walkRight';
      }
    }

    const src = char.sprites[spriteKey] || char.sprites.idle;
    const currentSrc = (this._playerImg.src || '').split('#')[0].split('?')[0];
    const newSrc = src.split('#')[0].split('?')[0];

    if (currentSrc !== newSrc && !currentSrc.endsWith(newSrc)) {
      this._playerImg.src = src;
    }

    // 좌우반전 처리
    this._playerImg.style.transform = this._flipX ? 'scaleX(-1)' : '';

    // 이동 중일 때 bouncing 애니메이션 클래스 토글
    this.playerEl?.classList.toggle('village-player-moving', this._moving);
  }

  _bindKeys() {
    const keyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        this._keys[e.key] = true;
        if (e.key === ' ') this._tryEnter();
      }
    };
    const keyUp = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        this._keys[e.key] = false;
      }
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    this._keyCleanup = () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }

  _tryEnter() {
    const zoneLeft = this.game.width / 2 - 60;
    const zoneRight = this.game.width / 2 + 60;
    const zoneTop = this.game.height * 0.35 - 40;
    const zoneBottom = this.game.height * 0.35 + 40;
    if (
      this.playerX + HALF >= zoneLeft &&
      this.playerX - HALF <= zoneRight &&
      this.playerY + HALF >= zoneTop &&
      this.playerY - HALF <= zoneBottom
    ) {
      this.game.switchScene('controlCenter');
    }
  }

  _startLoop() {
    const w = this.game.width;
    const h = this.game.height;
    const half = 24;
    const loop = () => {
      this._loopId = requestAnimationFrame(loop);
      let dx = 0;
      let dy = 0;
      if (this._keys['ArrowLeft']) { dx = -1; this.playerX = Math.max(half, this.playerX - SPEED); }
      if (this._keys['ArrowRight']) { dx = 1; this.playerX = Math.min(w - half, this.playerX + SPEED); }
      if (this._keys['ArrowUp']) { dy = -1; this.playerY = Math.max(half, this.playerY - SPEED); }
      if (this._keys['ArrowDown']) { dy = 1; this.playerY = Math.min(h - half, this.playerY + SPEED); }
      this._moving = dx !== 0 || dy !== 0;
      if (dy < 0) this._facing = 'Up';
      else if (dy > 0) this._facing = 'Down';
      else if (dx < 0) this._facing = 'Left';
      else if (dx > 0) this._facing = 'Right';
      else this._facing = 'idle';
      this._updatePlayerSprite();
      if (this.playerEl) {
        this.playerEl.style.left = this.playerX + 'px';
        this.playerEl.style.top = this.playerY + 'px';
      }
    };
    loop();
  }

  async exit() {
    if (this._loopId != null) cancelAnimationFrame(this._loopId);
    this._keyCleanup?.();
    if (this.domRoot?.parentNode) this.domRoot.parentNode.removeChild(this.domRoot);
  }
}
