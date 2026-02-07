/**
 * 엔딩 (v3) — 평화로운 마을, 등급(S/A/B/C) + 리포트, 다시 하기
 * GAME_SCRIPT.md 기반 엔딩 시퀀스
 */
import { CHARACTERS } from '../data/characters.js';
import { BACKGROUNDS } from '../data/stages.js';
import { getVillageBg } from '../data/assetPaths.js';

const ENDING_TEXTS = {
  S: {
    title: '완벽한 위기 대응',
    message: '훌륭했습니다. 당신들 덕분에 마을이 지켜졌어요. 신중하면서도 빠른 판단이었어요. 주민들의 신뢰를 지켰습니다.',
    stars: '⭐⭐⭐',
    ccoComment: '훌륭했습니다. 당신들 덕분에 마을이 지켜졌어요.',
    ctoComment: '신중하면서도 빠른 판단이었어요. 주민들의 신뢰를 지켰습니다.',
  },
  A: {
    title: '훌륭한 대응',
    message: '몇 가지 아쉬운 점은 있었지만, 전체적으로 훌륭한 대응이었습니다. 다음엔 더 잘할 수 있을 거예요.',
    stars: '⭐⭐',
    ccoComment: '다음엔 더 잘할 수 있을 거예요. 경험이 쌓였으니까요.',
  },
  B: {
    title: '무난한 대응',
    message: '위기는 넘겼지만, 몇 가지 개선점이 보입니다. 기록을 남겨두었어요. 다음엔 참고하세요.',
    stars: '⭐',
    reporterComment: '기록을 남겨두었어요. 다음엔 참고하세요.',
  },
  C: {
    title: '개선 필요',
    message: '위기 대응에 많은 개선점이 보입니다. 하지만 괜찮습니다. 이것도 경험입니다. 다음엔 제가 더 도와드릴게요.',
    stars: '',
    techCommComment: '다음엔 제가 더 도와드릴게요. 함께 성장하는 거예요.',
  },
};

export class EndingScene {
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
    const grade = this.game.state.get('endingGrade') ?? 'B';
    const ending = ENDING_TEXTS[grade] || ENDING_TEXTS.B;
    const jobId = this.game.state.get('selectedJob');
    const char = CHARACTERS[jobId];
    const chaos = this.game.state.get('internalChaos') ?? 0;
    const ext = this.game.state.get('externalRisk') ?? 0;

    // 마을 주민 반응
    const villagerReactions = [
      { icon: '🚕', text: '택시도 다시 잘 잡히네!' },
      { icon: '📦', text: '퀵 배달 왔다! 역시 빨라~' },
      { icon: '🏍️', text: '바이크 타고 출근해야지!' },
    ];

    this.domRoot = document.createElement('div');
    this.domRoot.className = 'ending-screen';
    this.domRoot.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,#1a2a1a 0%,#0f1a0f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;pointer-events:auto;overflow-y:auto;';

    const bgUrl = getVillageBg ? getVillageBg(1) : (BACKGROUNDS?.peacefulVillage || '');

    this.domRoot.innerHTML = `
      <div class="ending-bg" style="position:absolute;inset:0;background:url('${bgUrl}') center/cover no-repeat;opacity:0.4;"></div>

      <!-- 평화로운 마을 나레이션 -->
      <div class="ending-narration" style="text-align:center;margin-bottom:24px;max-width:600px;z-index:1;">
        <p style="font-size:16px;color:rgba(255,255,255,0.8);line-height:1.8;margin-bottom:16px;">
          결제 대란이 물러간 후...<br>
          카카오 T 마을에 다시 평화가 찾아왔습니다.
        </p>
      </div>

      <!-- 마을 주민 반응 -->
      <div class="ending-villagers" style="display:flex;gap:24px;margin-bottom:32px;z-index:1;">
        ${villagerReactions.map((v, i) => `
          <div class="villager-card" style="text-align:center;animation:fadeInUp 0.5s ease-out;animation-delay:${i * 0.2}s;animation-fill-mode:both;">
            <div class="villager-icon" style="font-size:2.5rem;margin-bottom:8px;">${v.icon}</div>
            <div class="villager-text" style="font-size:12px;color:rgba(255,255,255,0.7);max-width:100px;">${v.text}</div>
          </div>
        `).join('')}
      </div>

      <!-- 등급 및 결과 -->
      <div class="grade" style="font-size:4rem;font-weight:900;color:#FFD700;text-shadow:0 0 30px rgba(255,215,0,0.5);margin-bottom:8px;z-index:1;">${grade}</div>
      <div class="ending-stars" style="font-size:2rem;margin-bottom:16px;z-index:1;">${ending.stars || ''}</div>
      <div class="ending-title" style="font-size:1.8rem;color:#fff;margin-bottom:12px;z-index:1;">${ending.title}</div>

      <!-- 멘토 코멘트 -->
      <div class="mentor-comment" style="background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:12px;padding:16px 24px;max-width:500px;margin-bottom:24px;text-align:center;z-index:1;">
        ${ending.ccoComment ? `<p style="color:#FFD700;font-style:italic;margin-bottom:8px;">"${ending.ccoComment}"<br><span style="color:rgba(255,255,255,0.6);font-size:12px;">— CCO</span></p>` : ''}
        ${ending.ctoComment ? `<p style="color:#4CAF50;font-style:italic;margin-bottom:8px;">"${ending.ctoComment}"<br><span style="color:rgba(255,255,255,0.6);font-size:12px;">— CTO</span></p>` : ''}
        ${ending.reporterComment ? `<p style="color:#2196F3;font-style:italic;margin-bottom:8px;">"${ending.reporterComment}"<br><span style="color:rgba(255,255,255,0.6);font-size:12px;">— 리포터</span></p>` : ''}
        ${ending.techCommComment ? `<p style="color:#9C27B0;font-style:italic;">"${ending.techCommComment}"<br><span style="color:rgba(255,255,255,0.6);font-size:12px;">— 테크커뮤니케이터</span></p>` : ''}
      </div>

      <div class="ending-report" style="background:rgba(0,0,0,0.4);padding:16px 24px;border-radius:12px;margin-bottom:24px;font-size:14px;color:rgba(255,255,255,0.8);z-index:1;">
        조직 혼란: ${chaos}% · 대외 위험: ${ext}%
      </div>

      <!-- 에필로그 -->
      <p class="ending-epilogue" style="font-size:14px;color:rgba(255,255,255,0.7);text-align:center;max-width:400px;margin-bottom:24px;z-index:1;">
        결제 대란은 물러갔습니다.<br>
        하지만 영웅들은 알고 있습니다.<br>
        언제든 다시 올 수 있다는 것을.<br><br>
        그때까지, 마을은 평화롭습니다.
      </p>

      ${char ? `<p class="ending-role" style="color:rgba(255,255,255,0.6);margin-bottom:32px;z-index:1;">${char.name}으로 플레이했습니다.</p>` : ''}
      <button class="btn-restart" id="btn-restart">다시 도전</button>
    `;
    overlay.appendChild(this.domRoot);

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.game.state.reset();
      this.game.switchScene('title');
    });
  }

  async exit() {
    if (this.domRoot && this.domRoot.parentNode) {
      this.domRoot.parentNode.removeChild(this.domRoot);
    }
  }
}
