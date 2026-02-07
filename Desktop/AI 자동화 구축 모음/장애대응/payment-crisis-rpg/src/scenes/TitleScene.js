/**
 * 타이틀 화면 (v3) — 초기: 스토리 보기 → 인트로 / 인트로 후: 캐릭터 선택 → 마을
 */
import { CHARACTERS } from '../data/characters.js';
import { TITLE_IMAGE } from '../data/assetPaths.js';

/** 개발 중에는 캐시 무시해서 바뀐 타이틀 이미지가 바로 보이도록 */
function titleImageUrl() {
  const base = TITLE_IMAGE;
  const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  return dev ? `${base}?t=${Date.now()}` : base;
}

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.domRoot = null;
  }

  async init() {
    return this;
  }

  async enter() {
    const overlay = document.getElementById('dom-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    this.domRoot = document.createElement('div');
    this.domRoot.className = 'title-screen';
    this.domRoot.style.position = 'relative';
    this.domRoot.style.width = '100%';
    this.domRoot.style.height = '100%';
    this.domRoot.style.minHeight = '100%';
    const bgImg = document.createElement('img');
    bgImg.alt = '';
    bgImg.setAttribute('role', 'presentation');
    bgImg.src = titleImageUrl();
    bgImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;display:block;';
    this.domRoot.appendChild(bgImg);

    const introCompleted = this.game.state.get('introCompleted') === true;

    if (!introCompleted) {
      this._renderStartIntro();
    } else {
      this._renderCharacterSelect();
    }

    overlay.appendChild(this.domRoot);
  }

  /** 초기 화면: 스토리 보기(인트로) 버튼만 */
  _renderStartIntro() {
    const content = document.createElement('div');
    content.className = 'title-screen-content title-screen-start-intro';
    content.style.cssText = 'position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:48px;min-height:100%;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-start btn-start-intro';
    btn.textContent = '스토리 보기';
    btn.addEventListener('click', () => this.game.switchScene('intro'));
    content.appendChild(btn);
    this.domRoot.appendChild(content);
  }

  /** 인트로 후: 캐릭터 선택 + 시작하기 */
  _renderCharacterSelect() {
    const content = document.createElement('div');
    content.className = 'title-screen-content title-screen-character-select';
    content.style.cssText = 'position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 24px 32px;min-height:100%;box-sizing:border-box;';
    content.innerHTML = `
      <div class="character-grid" id="title-character-grid"></div>
      <button class="btn-start btn-start-village" id="btn-start-play" disabled>시작하기</button>
    `;
    this.domRoot.appendChild(content);

    const grid = document.getElementById('title-character-grid');
    const btnStart = document.getElementById('btn-start-play');
    const order = ['communicator', 'techLeader', 'techCommunicator', 'controlTower', 'reporter'];
    order.forEach((id) => {
      const char = CHARACTERS[id];
      if (!char) return;
      const card = document.createElement('div');
      card.className = 'character-card';
      card.dataset.roleId = char.id;
      const portraitUrl = char.sprites?.portrait || '';
      const portraitHtml = portraitUrl
        ? `<div class="character-portrait-wrap"><img class="character-portrait" src="${portraitUrl}" alt="${char.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="icon fallback-icon" style="display:none">${char.mainItem?.slice(0, 1) || '?'}</span></div>`
        : `<span class="icon">${char.mainItem?.slice(0, 1) || '?'}</span>`;
      card.innerHTML = `
        ${portraitHtml}
        <div class="name">${char.name}</div>
        <div class="desc">${char.class} · ${char.mainItem}</div>
      `;
      card.addEventListener('click', () => this.selectRole(char.id));
      grid.appendChild(card);
    });

    if (btnStart) btnStart.addEventListener('click', () => this.startGame());
  }

  selectRole(roleId) {
    this.domRoot.querySelectorAll('.character-card').forEach((c) => c.classList.remove('selected'));
    this.domRoot.querySelector(`[data-role-id="${roleId}"]`)?.classList.add('selected');
    this.game.state.set({ selectedJob: roleId });
    const btn = document.getElementById('btn-start-play');
    if (btn) btn.disabled = false;
  }

  startGame() {
    this.game.switchScene('game');
  }

  async exit() {
    if (this.domRoot && this.domRoot.parentNode) {
      this.domRoot.parentNode.removeChild(this.domRoot);
    }
  }
}
