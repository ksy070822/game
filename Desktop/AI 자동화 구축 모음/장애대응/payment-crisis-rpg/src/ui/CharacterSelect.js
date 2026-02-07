/**
 * 캐릭터 선택 UI 컴포넌트
 * 5명의 영웅 중 하나를 선택
 */
import { CHARACTERS, INTRO_ORDER } from '../data/characters.js';
import { HERO_SKILL_LINES } from './IntroSequence.js';

export class CharacterSelect {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.selectedId = null;
    this.element = null;
  }

  render() {
    if (!this.container) return;

    this.element = document.createElement('div');
    this.element.className = 'character-select-wrap';
    this.element.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 30;
      pointer-events: auto;
    `;

    const title = document.createElement('h2');
    title.className = 'character-select-title';
    title.textContent = '당신은 누구의 이야기를 이끌겠습니까?';
    title.style.cssText = `
      color: #fff;
      font-size: 24px;
      margin-bottom: 32px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    this.element.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'character-select-grid';
    grid.style.cssText = `
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-end;
      max-width: 1000px;
      padding: 20px 0;
    `;

    INTRO_ORDER.forEach((charId) => {
      const char = CHARACTERS[charId];
      if (!char) return;

      const skillInfo = HERO_SKILL_LINES[charId] || {};
      const card = this._createCharacterCard(char, skillInfo);
      grid.appendChild(card);
    });

    this.element.appendChild(grid);

    // 선택 버튼
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'character-select-confirm';
    confirmBtn.textContent = '선택 완료';
    confirmBtn.disabled = true;
    confirmBtn.style.cssText = `
      margin-top: 32px;
      padding: 12px 48px;
      font-size: 18px;
      background: #4a4a4a;
      color: #888;
      border: none;
      border-radius: 8px;
      cursor: not-allowed;
      transition: all 0.3s;
    `;
    confirmBtn.addEventListener('click', () => {
      if (this.selectedId && this.onSelect) {
        this.onSelect(this.selectedId);
      }
    });
    this.element.appendChild(confirmBtn);
    this._confirmBtn = confirmBtn;

    this.container.appendChild(this.element);
  }

  _createCharacterCard(char, skillInfo) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.charId = char.id;
    card.style.cssText = `
      width: 160px;
      min-width: 160px;
      max-width: 160px;
      padding: 16px;
      background: rgba(30, 30, 50, 0.9);
      border: 3px solid #444;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      transform: translateY(0) scale(1);
      transform-origin: center bottom;
      flex-shrink: 0;
    `;

    // 아이콘/이모지
    const iconMap = {
      communicator: '📢',
      techLeader: '⚙️',
      techCommunicator: '🔧',
      controlTower: '🧭',
      reporter: '⏱️',
    };

    const icon = document.createElement('div');
    icon.className = 'character-icon';
    icon.textContent = iconMap[char.id] || '👤';
    icon.style.cssText = `
      font-size: 48px;
      margin-bottom: 8px;
    `;
    card.appendChild(icon);

    // 초상화
    if (char.sprites?.portrait) {
      const portrait = document.createElement('img');
      portrait.src = char.sprites.portrait;
      portrait.alt = char.name;
      portrait.style.cssText = `
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid ${char.color || '#fff'};
        margin-bottom: 8px;
      `;
      portrait.onerror = () => { portrait.style.display = 'none'; };
      card.appendChild(portrait);
    }

    // 이름
    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = char.name;
    name.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      color: ${char.color || '#fff'};
      margin-bottom: 4px;
    `;
    card.appendChild(name);

    // 클래스
    const classEl = document.createElement('div');
    classEl.className = 'character-class';
    classEl.textContent = char.class || '';
    classEl.style.cssText = `
      font-size: 12px;
      color: #aaa;
      margin-bottom: 8px;
    `;
    card.appendChild(classEl);

    // 설명
    const desc = document.createElement('div');
    desc.className = 'character-desc';
    desc.textContent = char.description || '';
    desc.style.cssText = `
      font-size: 11px;
      color: #888;
      line-height: 1.4;
    `;
    card.appendChild(desc);

    // 호버/선택 효과
    card.addEventListener('mouseenter', () => {
      if (this.selectedId !== char.id) {
        card.style.borderColor = char.color || '#666';
        card.style.transform = 'translateY(-4px) scale(1)';
      }
    });
    card.addEventListener('mouseleave', () => {
      if (this.selectedId !== char.id) {
        card.style.borderColor = '#444';
        card.style.transform = 'translateY(0) scale(1)';
      }
    });
    card.addEventListener('click', () => {
      this._selectCharacter(char.id);
    });

    return card;
  }

  _selectCharacter(charId) {
    // 이전 선택 해제
    if (this.selectedId) {
      const prevCard = this.element.querySelector(`[data-char-id="${this.selectedId}"]`);
      if (prevCard) {
        prevCard.style.borderColor = '#444';
        prevCard.style.boxShadow = 'none';
        prevCard.style.transform = 'translateY(0) scale(1)';
      }
    }

    // 새 선택
    this.selectedId = charId;
    const card = this.element.querySelector(`[data-char-id="${charId}"]`);
    const char = CHARACTERS[charId];
    if (card && char) {
      card.style.borderColor = char.color || '#FFD700';
      card.style.boxShadow = `0 0 12px ${char.color || '#FFD700'}`;
      card.style.transform = 'translateY(-4px) scale(1)';
    }

    // 확인 버튼 활성화
    if (this._confirmBtn) {
      this._confirmBtn.disabled = false;
      this._confirmBtn.style.background = '#FFD700';
      this._confirmBtn.style.color = '#000';
      this._confirmBtn.style.cursor = 'pointer';
    }
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
