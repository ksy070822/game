/**
 * DialogueBox (DOM) — 하단 고정 박스, portrait, speaker, text.
 * 타이핑 효과, 클릭/Space로 스킵 또는 advance. showText(speaker, text, portrait).
 */
export class DialogueBox {
  constructor(container) {
    this.container = container || document.body;
    this.el = null;
    this.onAdvance = null;
    this._resolveAdvance = null;
    this._typingId = null;
  }

  showText(speaker, text, portrait) {
    if (!this.el) this._create();
    const speakerEl = this.el.querySelector('.dialogue-speaker');
    const textEl = this.el.querySelector('.dialogue-text');
    const portraitEl = this.el.querySelector('.dialogue-portrait');
    if (speakerEl) speakerEl.textContent = speaker ?? '';
    if (portraitEl) {
      portraitEl.style.backgroundImage = portrait ? `url(${portrait})` : 'none';
      portraitEl.style.display = portrait ? 'block' : 'none';
    }
    textEl.textContent = '';
    this.el.style.display = 'block';
    if (this.container && !this.el.parentNode) this.container.appendChild(this.el);

    const fullText = String(text ?? '');
    const speed = 50;  // 글자당 50ms (느린 타이핑)
    let i = 0;
    if (this._typingId) clearTimeout(this._typingId);
    const type = () => {
      if (i < fullText.length) {
        textEl.textContent = fullText.slice(0, i + 1);
        i++;
        this._typingId = setTimeout(type, speed);
      }
    };
    type();
  }

  showTextInstant(speaker, text, portrait) {
    if (!this.el) this._create();
    const speakerEl = this.el.querySelector('.dialogue-speaker');
    const textEl = this.el.querySelector('.dialogue-text');
    const portraitEl = this.el.querySelector('.dialogue-portrait');
    if (speakerEl) speakerEl.textContent = speaker ?? '';
    if (portraitEl) {
      portraitEl.style.backgroundImage = portrait ? `url(${portrait})` : 'none';
      portraitEl.style.display = portrait ? 'block' : 'none';
    }
    textEl.textContent = text ?? '';
    this.el.style.display = 'block';
    if (this.container && !this.el.parentNode) this.container.appendChild(this.el);
  }

  advance() {
    if (this._resolveAdvance) {
      this._resolveAdvance();
      this._resolveAdvance = null;
    }
    if (this.onAdvance) this.onAdvance();
  }

  waitForAdvance() {
    return new Promise((resolve) => {
      this._resolveAdvance = resolve;
    });
  }

  hide() {
    if (this._typingId) clearTimeout(this._typingId);
    this._typingId = null;
    if (this.el) this.el.style.display = 'none';
    if (this._resolveAdvance) {
      this._resolveAdvance();
      this._resolveAdvance = null;
    }
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'dialogue-box';
    this.el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;min-height:120px;background:rgba(0,0,0,0.9);color:#fff;padding:16px;display:none;pointer-events:auto;z-index:30;';
    this.el.innerHTML = `
      <div class="dialogue-portrait" style="width:64px;height:64px;border-radius:8px;background-size:cover;display:none;float:left;margin-right:12px;"></div>
      <div class="dialogue-speaker" style="font-weight:700;margin-bottom:8px;"></div>
      <div class="dialogue-text" style="line-height:1.5;min-height:1.5em;"></div>
      <div class="dialogue-hint" style="margin-top:8px;font-size:12px;opacity:0.8;">클릭 또는 Space로 진행</div>
    `;
    this.el.addEventListener('click', () => this.advance());
    this.container.appendChild(this.el);
  }
}
