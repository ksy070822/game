/**
 * 메인 게임 씬: PixiJS GameMap + Camera + Player(방향키/WASD 이동) + NPC(Space 대화) + 대화/선택
 */
import { Container, Sprite, Graphics } from 'pixi.js';
import { GameMap } from '../map/GameMap.js';
import { Camera } from '../map/Camera.js';
import { Player } from '../map/Player.js';
import { NPC } from '../map/NPC.js';
import { DialogueManager } from '../dialogue/DialogueManager.js';
import { DialogueBox } from '../dialogue/DialogueBox.js';
import { ChoicePanel } from '../dialogue/ChoicePanel.js';
import { EffectManager } from '../effects/EffectManager.js';
import { StageManager } from '../systems/StageManager.js';
import { RiskGauge } from '../systems/RiskGauge.js';
import { ChoiceSystem } from '../systems/ChoiceSystem.js';
import { AllySystem } from '../systems/AllySystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { EndingEvaluator } from '../systems/EndingEvaluator.js';
import { SCENARIO_STEPS } from '../data/scenarioSteps.js';
import { ROLES, ALLY_POSITIONS } from '../data/roles.js';
import { getItemImage, getVillageBg } from '../data/assetPaths.js';
import { CHARACTERS } from '../data/characters.js';

const PLAYER_SPEED = 10;
const PLAYER_HALF = 26;
const NEAR_DISTANCE = 90;

export class GameScene {
  constructor(engine) {
    this.engine = engine;
    this.stageManager = new StageManager(engine.state);
    this.riskGauge = new RiskGauge(engine.state);
    this.choiceSystem = new ChoiceSystem(engine.state);
    this.allySystem = new AllySystem(engine.state);
    this.itemSystem = new ItemSystem(engine.state);
    this.endingEvaluator = new EndingEvaluator(engine.state);
    this.stepIndex = 0;
    this.pendingCheckpoint = null;
    this.domRoot = null;
    this.bgContainer = null;
    this.playerX = 0;
    this.playerY = 0;
    this.keys = {};
    this._rightArea = null;
    this._villageWrap = null;
    this._playerEl = null;
    this._villLoopId = null;
    this.gameMap = null;
    this.player = null;
    this.camera = null;
    this.mapsData = null;
    this.npcs = [];
    this._nearestNPC = null;
    this._interactionHintEl = null;
  }

  async init() {
    return this;
  }

  _showLoadWarning(mapError, dialogueError) {
    const overlay = document.getElementById('dom-overlay');
    if (!overlay) return;

    const warning = document.createElement('div');
    warning.className = 'load-warning';
    warning.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      background: rgba(180, 80, 0, 0.9);
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 100;
      max-width: 300px;
      animation: fadeIn 0.3s ease-out;
    `;

    let msg = '일부 게임 데이터를 불러오지 못했습니다.';
    if (mapError && dialogueError) {
      msg = '맵과 대화 데이터를 불러오지 못했습니다. 기본 모드로 진행합니다.';
    } else if (mapError) {
      msg = '맵 데이터를 불러오지 못했습니다.';
    } else if (dialogueError) {
      msg = '대화 데이터를 불러오지 못했습니다.';
    }
    warning.textContent = msg;
    overlay.appendChild(warning);

    // 5초 후 자동 제거
    setTimeout(() => {
      warning.style.opacity = '0';
      warning.style.transition = 'opacity 0.3s';
      setTimeout(() => warning.remove(), 300);
    }, 5000);
  }

  async enter() {
    const job = this.engine.state.get('selectedJob');
    if (!job) {
      this.engine.sceneManager.goTo('title');
      return;
    }
    this.engine.state.set({
      stage: 1,
      internalChaos: 0,
      externalRisk: 0,
      confusionPeak: 0,
      promiseRiskCount: 0,
      scopeClarityScore: 0,
      items: [true, false, false, false, false],
      itemSources: [job, null, null, null, null],
      choiceLog: [],
      elapsedMinutes: 0,
      allies: [],
      guardianShownThisStage: false,
    });
    this.stepIndex = 0;
    this.pendingCheckpoint = null;
    this.playerX = 0;
    this.playerY = 0;
    this.keys = {};

    let stageNum = this.stageManager.getCurrentStage();
    const stageId = 'S' + stageNum;
    let mapLoadError = false;
    try {
      const res = await fetch('/data/maps.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.mapsData = await res.json();
    } catch (err) {
      console.warn('[GameScene] 맵 데이터 로드 실패:', err.message);
      mapLoadError = true;
      this.mapsData = { maps: {} };
    }
    const mapData = this.mapsData?.maps?.[stageId] ?? this.mapsData?.maps?.S1 ?? { width: 800, height: 600, playerStart: { x: 400, y: 500 }, npcs: [], objects: [] };
    mapData.background = getVillageBg(stageNum);
    this.gameMap = new GameMap(mapData);
    this.player = new Player(4, job);
    this.player.x = mapData.playerStart?.x ?? 400;
    this.player.y = mapData.playerStart?.y ?? 500;
    this.player.container.x = this.player.x;
    this.player.container.y = this.player.y;
    this.gameMap.playerLayer.addChild(this.player.container);
    this.camera = new Camera(this.engine.width, this.engine.height);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.applyTo(this.gameMap.container);

    const npcIdToChar = { tech_comm: 'techCommunicator', reporter: 'reporter', control_tower: 'controlTower', tech_lead: 'techLeader' };
    this.npcs = [];
    (mapData.npcs || []).forEach((npcData) => {
      const characterId = npcIdToChar[npcData.id] ?? null;
      const npc = new NPC({ ...npcData, characterId });
      this.gameMap.npcLayer.addChild(npc.sprite);
      this.npcs.push(npc);
    });

    let dialogueLoadError = false;
    try {
      const dialRes = await fetch('/data/dialogues.json');
      if (!dialRes.ok) throw new Error(`HTTP ${dialRes.status}`);
      this.dialoguesData = await dialRes.json();
    } catch (err) {
      console.warn('[GameScene] 대화 데이터 로드 실패:', err.message);
      dialogueLoadError = true;
      this.dialoguesData = { dialogues: {} };
    }

    // 데이터 로드 실패 시 사용자에게 알림
    if (mapLoadError || dialogueLoadError) {
      this._showLoadWarning(mapLoadError, dialogueLoadError);
    }
    this.dialogueManager = new DialogueManager(this.dialoguesData, this.engine.state);
    this.dialogueBox = new DialogueBox(null);
    this.choicePanel = new ChoicePanel(null);
    this.effectManager = new EffectManager(null);

    this._setupPixi();
    this._setupDOM();
    if (this.domRoot && this.dialogueBox && this.choicePanel) {
      this.dialogueBox.container = this.domRoot;
      this.choicePanel.container = this.domRoot;
      this.choicePanel.onChoiceSelected = (c) => this._onDialogueChoiceSelected(c);
    }
    this._setupVillage();
    if (!this.gameMap) this._showBottomSituation();
    this._bindKeys();
    this._startVillageLoop();
  }


  _setupPixi() {
    const stage = this.engine.pixi.stage;
    stage.removeChildren();
    if (this.gameMap) {
      stage.addChild(this.gameMap.container);
      return;
    }
    this.bgContainer = new Container();
    stage.addChild(this.bgContainer);
    const g = new Graphics();
    g.beginFill(0x1a1a2e);
    g.drawRect(0, 0, this.engine.width, this.engine.height);
    this.bgContainer.addChild(g);
    try {
      const bg = Sprite.from('/assets/backgrounds/village-bg.png');
      bg.anchor.set(0.5);
      bg.x = this.engine.width / 2;
      bg.y = this.engine.height / 2;
      const scale = Math.max(this.engine.width / (bg.width || 1), this.engine.height / (bg.height || 1));
      bg.scale.set(scale);
      this.bgContainer.addChild(bg);
    } catch (_) {}
  }

  _setupDOM() {
    const overlay = document.getElementById('dom-overlay');
    if (!overlay) return;
    const job = this.engine.state.get('selectedJob');
    if (!job) return;
    overlay.innerHTML = '';
    this.domRoot = document.createElement('div');
    this.domRoot.style.position = 'absolute';
    this.domRoot.style.inset = '0';
    this.domRoot.style.pointerEvents = 'none';
    this.domRoot.style.display = 'flex';
    this.domRoot.style.flexDirection = 'row';
    overlay.appendChild(this.domRoot);

    const role = ROLES.find((r) => r.id === job);
    const portraitSrc = role?.imagePath ?? '';
    const portraitHtml = portraitSrc
      ? `<img class="hero-portrait-img" src="${portraitSrc}" alt="${role?.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="hero-fallback-icon" style="display:none">${role?.icon ?? '📜'}</span>`
      : `<span class="hero-fallback-icon">${role?.icon ?? '📜'}</span>`;
    const items = this.engine.state.get('items') ?? [true, false, false, false, false];
    const itemSources = this.engine.state.get('itemSources') ?? [job, null, null, null, null];
    const itemSlotsHtml = this._renderItemSlots(items, itemSources, role);

    const leftPanel = document.createElement('div');
    leftPanel.className = 'game-left-panel';
    leftPanel.style.pointerEvents = 'auto';
    leftPanel.innerHTML = `
      <div class="character-panel">
        <div class="hero-portrait-wrap">${portraitHtml}</div>
        <div class="hero-name">${role?.name ?? job}</div>
        <div class="item-slots-label">획득 아이템 <span class="item-slots-hint">(동료 만날 때마다 쌓임)</span></div>
        <div class="item-slots" id="game-item-slots">${itemSlotsHtml}</div>
      </div>
    `;
    this.domRoot.appendChild(leftPanel);

    const rightArea = document.createElement('div');
    rightArea.className = 'game-right-area';
    rightArea.style.flex = '1';
    rightArea.style.display = 'flex';
    rightArea.style.flexDirection = 'column';
    rightArea.style.minWidth = '0';
    rightArea.style.position = 'relative';
    this.domRoot.appendChild(rightArea);
    this._rightArea = rightArea;

    if (this.gameMap) {
      const hint = document.createElement('div');
      hint.className = 'interaction-hint';
      hint.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:8px;font-size:14px;display:none;pointer-events:none;z-index:20;';
      hint.textContent = 'Space: 대화';
      this.domRoot.appendChild(hint);
      this._interactionHintEl = hint;
    }

    const hud = document.createElement('div');
    hud.className = 'game-hud';
    hud.style.pointerEvents = 'auto';
    const stageNum = this.stageManager.getCurrentStage();
    const stageName = this.stageManager.getStageName(stageNum);
    const chaos = this.riskGauge.getChaosLabel(this.engine.state.get('internalChaos'));
    const ext = this.riskGauge.getExternalLabel(this.engine.state.get('externalRisk'));
    const elapsed = this.engine.state.get('elapsedMinutes');
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    hud.innerHTML = `
      <div class="stage-bar" id="hud-stage-bar">
        ${[1, 2, 3, 4, 5].map((i) => `<span class="stage-dot ${i === stageNum ? 'active' : ''}" data-stage="${i}"></span>`).join('')}
      </div>
      <div class="elapsed-time" id="hud-time">경과 ${mm}:${ss}</div>
      <div class="stage-name" id="hud-stage-name">${stageName}</div>
      <div class="risk-hud">
        <div class="gauge chaos">
          <span class="label">조직 혼란</span>
          <span class="value" id="risk-chaos-label">${chaos}</span>
          <div class="bar-wrap"><div class="bar" id="risk-chaos-bar" style="width:0%"></div></div>
        </div>
        <div class="gauge external">
          <span class="label">대외 위험</span>
          <span class="value" id="risk-external-label">${ext}</span>
          <div class="bar-wrap"><div class="bar" id="risk-external-bar" style="width:0%"></div></div>
        </div>
      </div>
    `;
    rightArea.appendChild(hud);
    this._updateRiskBars();
  }

  _getRoleForItemSource(sourceId, isAlly) {
    if (!sourceId) return null;
    if (isAlly) {
      const allies = this.allySystem.getAllies();
      const ally = allies.find((a) => a.id === sourceId);
      if (!ally) return null;
      return ROLES.find((r) => r.name === ally.name) ?? null;
    }
    return ROLES.find((r) => r.id === sourceId) ?? null;
  }

  _renderItemSlots(items, itemSources, playerRole) {
    const sources = itemSources ?? [null, null, null, null, null];
    return items.map((filled, i) => {
      if (!filled) return `<div class="item-slot" data-slot="${i}"></div>`;
      const sourceId = sources[i];
      const isAlly = sourceId && sourceId !== this.engine.state.get('selectedJob');
      const role = this._getRoleForItemSource(sourceId, !!isAlly) ?? playerRole;
      const itemImg = sourceId ? getItemImage(sourceId, 0) : role?.itemImagePath;
      const icon = role?.icon ?? '📦';
      if (itemImg) {
        return `<div class="item-slot filled" data-slot="${i}"><img src="${itemImg}" alt="" class="item-slot-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="item-slot-icon" style="display:none">${icon}</span></div>`;
      }
      return `<div class="item-slot filled" data-slot="${i}"><span class="item-slot-icon">${icon}</span></div>`;
    }).join('');
  }

  _setupVillage() {
    if (this.gameMap) return;
    if (!this._rightArea) return;
    const job = this.engine.state.get('selectedJob');
    const role = ROLES.find((r) => r.id === job);
    const allies = this.allySystem.getAllies();
    const recruited = this.engine.state.get('allies') ?? [];
    const stageId = SCENARIO_STEPS[this.stepIndex]?.stageId ?? 'S1';
    const stageOrder = { S1: 1, S2: 2, S3: 3, S4: 4, S5: 5 };
    const currentOrder = stageOrder[stageId] ?? 1;

    const villageWrap = document.createElement('div');
    villageWrap.className = 'village-wrap';
    villageWrap.style.flex = '1';
    villageWrap.style.position = 'relative';
    villageWrap.style.minHeight = '200px';
    villageWrap.style.pointerEvents = 'auto';
    this._rightArea.appendChild(villageWrap);
    this._villageWrap = villageWrap;

    const rect = villageWrap.getBoundingClientRect();
    this.playerX = (villageWrap.offsetWidth || 400) / 2 - PLAYER_HALF;
    this.playerY = (villageWrap.offsetHeight || 300) / 2 - PLAYER_HALF;

    const playerSrc = role?.imagePath ?? '';
    const playerHtml = playerSrc
      ? `<img src="${playerSrc}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="player-icon" style="display:none">${role?.icon ?? '📜'}</span>`
      : `<span class="player-icon">${role?.icon ?? '📜'}</span>`;

    const player = document.createElement('div');
    player.className = 'player-sprite';
    player.id = 'game-player-sprite';
    player.innerHTML = playerHtml;
    player.style.left = this.playerX + 'px';
    player.style.top = this.playerY + 'px';
    villageWrap.appendChild(player);
    this._playerEl = player;

    const allyMap = { tech_comm: 0, reporter: 1, control_tower: 2, tech_lead: 3, biz_lead: 4 };
    allies.forEach((ally, i) => {
      const pos = ALLY_POSITIONS[i] ?? { left: 50, top: 50 };
      const roleAlly = ROLES.find((r) => r.name === ally.name);
      const imgPath = roleAlly?.imagePath ?? null;
      const allyOrder = stageOrder[ally.stageId] ?? 1;
      const unlocked = currentOrder >= allyOrder;
      const recruitedAlly = recruited.includes(ally.id);
      let cls = 'ally-npc';
      if (unlocked && !recruitedAlly) cls += ' unlocked';
      if (recruitedAlly) cls += ' recruited';
      const inner = imgPath
        ? `<img src="${imgPath}" alt="${ally.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="npc-icon" style="display:none">${roleAlly?.icon ?? '?'}</span>`
        : `<span class="npc-icon">${roleAlly?.icon ?? '?'}</span>`;
      const div = document.createElement('div');
      div.className = cls;
      div.id = `ally-npc-${i}`;
      div.dataset.allyIndex = String(i);
      div.style.left = pos.left + '%';
      div.style.top = pos.top + '%';
      div.innerHTML = `${inner}<span class="talk-hint" id="ally-hint-${i}">Space: 대화</span>`;
      villageWrap.appendChild(div);
    });

    const speechBubble = document.createElement('div');
    speechBubble.className = 'speech-bubble';
    speechBubble.id = 'ally-speech-bubble';
    speechBubble.style.display = 'none';
    speechBubble.innerHTML = '<span class="speech-bubble-text"></span>';
    villageWrap.appendChild(speechBubble);
    this._speechBubble = speechBubble;

    const hint = document.createElement('div');
    hint.className = 'village-keys-hint';
    hint.textContent = '← → ↑ ↓ 이동 · Space 대화';
    villageWrap.appendChild(hint);
  }

  _bindKeys() {
    const self = this;
    const keyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        self.keys[e.key] = true;
        if (e.key === ' ') self._onSpace();
      }
    };
    const keyUp = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        self.keys[e.key] = false;
      }
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    this._keyCleanup = () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }

  _guardianConditionMet(npc) {
    const cond = npc.guardianCondition;
    if (!cond) return true;
    const labels = ['안정', '경미', '병목', '혼선', '과부하'];
    const extLabels = ['낮음', '주의', '부담', '위험', '임계'];
    const chaosLabel = this.riskGauge.getChaosLabel(this.engine.state.get('internalChaos'));
    const extLabel = this.riskGauge.getExternalLabel(this.engine.state.get('externalRisk'));
    if (cond.internalChaosAtLeast) {
      const reqIdx = labels.indexOf(cond.internalChaosAtLeast);
      const curIdx = labels.indexOf(chaosLabel);
      if (reqIdx !== -1 && curIdx < reqIdx) return false;
    }
    if (cond.externalRiskAtLeast) {
      const reqIdx = extLabels.indexOf(cond.externalRiskAtLeast);
      const curIdx = extLabels.indexOf(extLabel);
      if (reqIdx !== -1 && curIdx < reqIdx) return false;
    }
    return true;
  }

  _updateNearestNPC() {
    if (!this.gameMap || !this.player || this.player.canMove === false) return;
    let nearest = null;
    let minDist = Infinity;
    for (const npc of this.npcs) {
      if (npc.hasSpoken) continue;
      if (npc.isGuardian && !this._guardianConditionMet(npc)) continue;
      if (!npc.isPlayerInRange(this.player.x, this.player.y)) continue;
      const dx = this.player.x - npc.x;
      const dy = this.player.y - npc.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        nearest = npc;
      }
    }
    this._nearestNPC = nearest;
    if (this._interactionHintEl) {
      this._interactionHintEl.style.display = nearest ? 'block' : 'none';
      if (nearest) this._interactionHintEl.textContent = `Space: ${nearest.name}와 대화`;
    }
  }

  _startDialogue(npc) {
    if (!npc || !this.player) return;
    this.player.canMove = false;
    this._nearestNPC = null;
    if (this._interactionHintEl) this._interactionHintEl.style.display = 'none';
    this._onNPCDialogueStart(npc);
  }

  _onNPCDialogueStart(npc) {
    if (!this.dialogueManager || !npc.dialogueId) {
      npc.onDialogueComplete();
      this.player.canMove = true;
      return;
    }
    this.dialogueManager.start(npc.dialogueId);
    this._runDialogueFlow(npc);
  }

  _getPortraitForSpeaker(speaker) {
    const role = ROLES.find((r) => r.name === speaker);
    return role?.imagePath ?? null;
  }

  async _runDialogueFlow(npc) {
    const dm = this.dialogueManager;
    const box = this.dialogueBox;
    const panel = this.choicePanel;
    const spaceHandler = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        box.advance();
      }
    };
    window.addEventListener('keydown', spaceHandler);

    try {
      while (!dm.isFinished()) {
        let step = dm.currentStep();
        if (!step) break;

        if (step.type === 'dialogue') {
          const portrait = this._getPortraitForSpeaker(step.speaker);
          box.showText(step.speaker, step.text, portrait);
          await box.waitForAdvance();
          dm.advance();
          box.hide();
          continue;
        }

        if (step.type === 'choice') {
          panel.show(step.choices);
          const choice = await new Promise((resolve) => {
            this._resolveChoice = resolve;
          });
          panel.hide();
          this._resolveChoice = null;
          if (choice?.checkpoint) {
            const ok = await this._confirmCheckpoint(choice);
            if (!ok) {
              continue;
            }
          }
          dm.selectChoice(choice);
          if (choice?.effects && (choice.effects.internalChaos > 0 || choice.effects.externalRisk > 0)) {
            this.effectManager?.play('DANGER_SPARK');
          }
          step = dm.currentStep();
          if (step?.type === 'response') {
            const resp = dm.getResponseForChoice(step);
            if (resp) {
              const portrait = this._getPortraitForSpeaker(resp.speaker);
              box.showTextInstant(resp.speaker, resp.text, portrait);
              await box.waitForAdvance();
              dm.advance();
            }
          }
          box.hide();
          this._updateRiskBars();
          continue;
        }

        if (step.type === 'response') {
          const resp = dm.getResponseForChoice(step);
          if (resp) {
            const portrait = this._getPortraitForSpeaker(resp.speaker);
            box.showTextInstant(resp.speaker, resp.text, portrait);
            await box.waitForAdvance();
          }
          dm.advance();
          box.hide();
          continue;
        }

        if (step.type === 'item_reward') {
          const itemId = step.itemId;
          const text = step.text ?? '아이템을 획득했습니다.';
          box.showTextInstant(npc.name, text, this._getPortraitForSpeaker(npc.name));
          await box.waitForAdvance();
          box.hide();
          if (itemId && this.itemSystem) {
            this.itemSystem.acquire(itemId, npc.id);
            this._updateItemSlots();
          }
          dm.advance();
          continue;
        }

        dm.advance();
      }
    } finally {
      window.removeEventListener('keydown', spaceHandler);
    }

    npc.onDialogueComplete();
    this.player.canMove = true;
    this.dialogueBox.hide();
    this.choicePanel.hide();
    this.stageManager.advanceTime(5);
    this._updateRiskBars();

    if (this.stageManager.checkStageComplete(this.npcs)) {
      await this._transitionToNextStage();
    }
  }

  async _transitionToNextStage() {
    const stageNum = this.stageManager.getCurrentStage();
    if (stageNum >= 5) {
      this._goToEnding();
      return;
    }
    const nextNum = stageNum + 1;
    const stageId = 'S' + nextNum;
    const mapData = this.mapsData?.maps?.[stageId];
    if (!mapData) {
      this._goToEnding();
      return;
    }
    const fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;transition:opacity 0.4s;z-index:100;pointer-events:none;';
    this.domRoot?.appendChild(fadeEl);
    fadeEl.style.opacity = '1';
    await new Promise((r) => setTimeout(r, 500));
    const label = document.createElement('div');
    label.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:24px;z-index:101;pointer-events:none;';
    label.textContent = `Stage ${nextNum} · ${this.stageManager.getStageName(nextNum)}`;
    this.domRoot?.appendChild(label);
    const elapsed = this.engine.state.get('elapsedMinutes') ?? 0;
    const nextElapsed = nextNum === 2 ? 15 : nextNum === 3 ? 50 : nextNum === 4 ? 95 : 200;
    this.engine.state.set({ elapsedMinutes: Math.max(elapsed, nextElapsed), stage: nextNum });
    const stageNumForBg = this.stageManager.getCurrentStage();
    mapData.background = getVillageBg(stageNumForBg);
    const oldMap = this.gameMap;
    this.gameMap = new GameMap(mapData);
    if (oldMap?.container?.parent) oldMap.container.parent.removeChild(oldMap.container);
    this.player.container.parent?.removeChild(this.player.container);
    const job = this.engine.state.get('selectedJob');
    this.player = new Player(4, job);
    this.player.x = mapData.playerStart?.x ?? 400;
    this.player.y = mapData.playerStart?.y ?? 500;
    this.player.container.x = this.player.x;
    this.player.container.y = this.player.y;
    this.gameMap.playerLayer.addChild(this.player.container);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.applyTo(this.gameMap.container);
    const npcIdToChar = { tech_comm: 'techCommunicator', reporter: 'reporter', control_tower: 'controlTower', tech_lead: 'techLeader' };
    this.npcs = [];
    (mapData.npcs || []).forEach((npcData) => {
      const characterId = npcIdToChar[npcData.id] ?? null;
      const npc = new NPC({ ...npcData, characterId });
      this.gameMap.npcLayer.addChild(npc.sprite);
      this.npcs.push(npc);
    });
    this.engine.pixi.stage.removeChildren();
    this.engine.pixi.stage.addChild(this.gameMap.container);
    this._updateRiskBars();
    await new Promise((r) => setTimeout(r, 800));
    label.remove();
    fadeEl.style.opacity = '0';
    await new Promise((r) => setTimeout(r, 400));
    fadeEl.remove();
  }

  _onDialogueChoiceSelected(choice) {
    if (this._resolveChoice) {
      this._resolveChoice(choice);
    }
  }

  async _confirmCheckpoint(choice) {
    return new Promise((resolve) => {
      const box = this._rightArea ?? this.domRoot;
      let overlay = box?.querySelector('.checkpoint-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'checkpoint-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:40;pointer-events:auto;';
        box?.appendChild(overlay);
      }
      const riskPreview = choice.riskPreview
        ? `조직 혼란: ${choice.riskPreview.internalChaos ?? '-'} / 대외 위험: ${choice.riskPreview.externalRisk ?? '-'}`
        : '예상 리스크 변화를 확인하세요.';
      overlay.innerHTML = `
        <div class="checkpoint-box" style="background:#222;padding:24px;border-radius:12px;max-width:400px;">
          <div class="title" style="font-weight:700;margin-bottom:12px;">결정 확인</div>
          <p class="risk-preview" style="margin-bottom:8px;">${riskPreview}</p>
          <p class="desc" style="font-size:14px;opacity:0.9;">이대로 진행할까요? 수정해도 불이익은 없습니다.</p>
          <div class="checkpoint-buttons" style="margin-top:16px;display:flex;gap:8px;">
            <button class="btn-edit" id="checkpoint-edit">다른 선택 검토</button>
            <button class="btn-confirm" id="checkpoint-confirm">이대로 진행</button>
          </div>
        </div>
      `;
      overlay.style.display = 'flex';
      overlay.querySelector('#checkpoint-edit').onclick = () => {
        overlay.style.display = 'none';
        resolve(false);
      };
      overlay.querySelector('#checkpoint-confirm').onclick = () => {
        overlay.style.display = 'none';
        resolve(true);
      };
    });
  }

  _onSpace() {
    if (!this._villageWrap || !this._playerEl) return;
    const playerRect = this._playerEl.getBoundingClientRect();
    const px = playerRect.left + playerRect.width / 2;
    const py = playerRect.top + playerRect.height / 2;
    const allies = this.allySystem.getAllies();
    for (let i = 0; i < allies.length; i++) {
      const el = this._villageWrap.querySelector(`#ally-npc-${i}`);
      if (!el || !el.classList.contains('unlocked') || el.classList.contains('recruited')) continue;
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
      if (dist < NEAR_DISTANCE) {
        this._showSpeechBubble(i, '무슨 일이요?');
        return;
      }
    }
  }

  _startVillageLoop() {
    const loop = () => {
      this._villLoopId = requestAnimationFrame(loop);
      if (this.engine.input) this.engine.input.clearJustPressed();
      if (this.gameMap && this.player && this.camera) {
        this.player.update(this.engine.input);
        const mw = this.gameMap.width;
        const mh = this.gameMap.height;
        const halfW = 12;
        const halfH = 32;
        this.player.x = Math.max(halfW, Math.min(mw - halfW, this.player.x));
        this.player.y = Math.max(halfH, Math.min(mh - halfH, this.player.y));
        this.player.container.x = this.player.x;
        this.player.container.y = this.player.y;
        this.camera.follow(this.player.x, this.player.y);
        this.camera.clamp(mw, mh);
        this.camera.applyTo(this.gameMap.container);
        this._updateNearestNPC();
        if (this.engine.input?.isKeyJustPressed('Space') && this._nearestNPC) {
          this._startDialogue(this._nearestNPC);
        }
      }
      if (this._villageWrap && this._playerEl) {
        const w = this._villageWrap.offsetWidth || 400;
        const h = this._villageWrap.offsetHeight || 300;
        if (this.keys['ArrowLeft']) this.playerX = Math.max(PLAYER_HALF, this.playerX - PLAYER_SPEED);
        if (this.keys['ArrowRight']) this.playerX = Math.min(w - PLAYER_HALF, this.playerX + PLAYER_SPEED);
        if (this.keys['ArrowUp']) this.playerY = Math.max(PLAYER_HALF, this.playerY - PLAYER_SPEED);
        if (this.keys['ArrowDown']) this.playerY = Math.min(h - PLAYER_HALF, this.playerY + PLAYER_SPEED);
        this._playerEl.style.left = this.playerX + 'px';
        this._playerEl.style.top = this.playerY + 'px';
        this._playerEl.classList.toggle('moving', this.keys['ArrowLeft'] || this.keys['ArrowRight'] || this.keys['ArrowUp'] || this.keys['ArrowDown']);
        this._updateNearHint();
      }
    };
    loop();
  }

  _updateNearHint() {
    if (!this._villageWrap || !this._playerEl) return;
    const playerRect = this._playerEl.getBoundingClientRect();
    const px = playerRect.left + playerRect.width / 2;
    const py = playerRect.top + playerRect.height / 2;
    const allies = this.allySystem.getAllies();
    for (let i = 0; i < allies.length; i++) {
      const hint = this._villageWrap.querySelector(`#ally-hint-${i}`);
      if (!hint) continue;
      const el = this._villageWrap.querySelector(`#ally-npc-${i}`);
      if (!el || !el.classList.contains('unlocked') || el.classList.contains('recruited')) {
        hint.classList.remove('near');
        continue;
      }
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
      hint.classList.toggle('near', dist < NEAR_DISTANCE);
    }
  }

  _showSpeechBubble(allyIndex, message) {
    const bubble = this._speechBubble;
    if (!bubble) return;
    const el = this._villageWrap?.querySelector(`#ally-npc-${allyIndex}`);
    if (el) {
      const r = el.getBoundingClientRect();
      const wrapRect = this._villageWrap.getBoundingClientRect();
      bubble.style.left = (r.left - wrapRect.left + r.width / 2) + 'px';
      bubble.style.top = (r.top - wrapRect.top - 8) + 'px';
      bubble.style.transform = 'translate(-50%, -100%)';
    }
    bubble.querySelector('.speech-bubble-text').textContent = message;
    bubble.style.display = 'block';
    clearTimeout(this._speechBubbleTimer);
    this._speechBubbleTimer = setTimeout(() => {
      bubble.style.display = 'none';
    }, 3000);
  }

  _updateRiskBars() {
    const c = this.engine.state.get('internalChaos') ?? 0;
    const e = this.engine.state.get('externalRisk') ?? 0;
    const chaosLabel = document.getElementById('risk-chaos-label');
    const extLabel = document.getElementById('risk-external-label');
    const chaosBar = document.getElementById('risk-chaos-bar');
    const extBar = document.getElementById('risk-external-bar');
    if (chaosLabel) chaosLabel.textContent = this.riskGauge.getChaosLabel(c);
    if (extLabel) extLabel.textContent = this.riskGauge.getExternalLabel(e);
    if (chaosBar) chaosBar.style.width = c + '%';
    if (extBar) extBar.style.width = e + '%';
    const stageNum = this.stageManager.getCurrentStage();
    const stageName = this.stageManager.getStageName(stageNum);
    const elapsed = this.engine.state.get('elapsedMinutes');
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    const timeEl = document.getElementById('hud-time');
    const nameEl = document.getElementById('hud-stage-name');
    if (timeEl) timeEl.textContent = `경과 ${mm}:${ss}`;
    if (nameEl) nameEl.textContent = stageName;
    this.domRoot?.querySelectorAll('.stage-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i + 1 === stageNum);
    });
  }

  _showBottomSituation() {
    if (this.stepIndex >= SCENARIO_STEPS.length) {
      this._goToEnding();
      return;
    }
    const step = SCENARIO_STEPS[this.stepIndex];
    const choices = step.choiceIds
      .map((id) => this.choiceSystem.getChoiceById(id))
      .filter(Boolean);

    let bottom = this._rightArea?.querySelector('.bottom-panel');
    if (!bottom) {
      bottom = document.createElement('div');
      bottom.className = 'bottom-panel';
      bottom.style.pointerEvents = 'auto';
      this._rightArea?.appendChild(bottom);
    }
    const elapsed = this.engine.state.get('elapsedMinutes');
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    bottom.innerHTML = `
      <div class="bottom-situation">
        <div class="bottom-title">${step.title}</div>
        <p class="bottom-desc">${step.narration}</p>
        <div class="bottom-meta">경과 ${mm}:${ss}분</div>
        <div class="choices-list" id="choices-list"></div>
      </div>
    `;
    const list = bottom.querySelector('#choices-list');
    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.dataset.choiceId = choice.id;
      btn.addEventListener('click', () => this._onChoice(choice.id));
      list.appendChild(btn);
    });
  }

  _onChoice(choiceId) {
    const choice = this.choiceSystem.getChoiceById(choiceId);
    if (!choice) return;
    if (choice.checkpoint && !this.pendingCheckpoint) {
      this.pendingCheckpoint = choiceId;
      this._showCheckpointOverlay(choice);
      return;
    }
    this._applyChoice(choiceId).catch(() => {});
  }

  _showCheckpointOverlay(choice) {
    const riskPreview = choice.riskPreview
      ? `조직 혼란: ${choice.riskPreview.internalChaos ?? '-'} / 대외 위험: ${choice.riskPreview.externalRisk ?? '-'}`
      : '예상 리스크 변화를 확인하세요.';
    const container = this._rightArea ?? this.domRoot;
    let box = container.querySelector('.checkpoint-overlay');
    if (!box) {
      box = document.createElement('div');
      box.className = 'checkpoint-overlay';
      box.style.pointerEvents = 'auto';
      container.appendChild(box);
    }
    box.innerHTML = `
      <div class="checkpoint-box">
        <div class="title">결정 확인</div>
        <p class="risk-preview">${riskPreview}</p>
        <p class="desc">이대로 진행할까요? 수정해도 불이익은 없습니다.</p>
        <div class="checkpoint-buttons">
          <button class="btn-edit" id="checkpoint-edit">결정 수정</button>
          <button class="btn-confirm" id="checkpoint-confirm">이대로 진행</button>
        </div>
      </div>
    `;
    box.style.display = 'flex';
    box.querySelector('#checkpoint-edit').addEventListener('click', () => {
      this.pendingCheckpoint = null;
      box.style.display = 'none';
    });
    box.querySelector('#checkpoint-confirm').addEventListener('click', () => {
      this.pendingCheckpoint = null;
      box.style.display = 'none';
      this._applyChoice(choice.id).catch(() => {});
    });
  }

  async _applyChoice(choiceId) {
    const result = this.choiceSystem.applyChoice(choiceId);
    if (!result) return;
    const { choice, internalDelta, externalDelta, promiseRisk } = result;
    this.choiceSystem.logChoice(choiceId, choice.text);
    if (choice.scopeClarity) {
      this.engine.state.set({
        scopeClarityScore: (this.engine.state.get('scopeClarityScore') ?? 0) + choice.scopeClarity,
      });
    }
    this.riskGauge.applyDelta(internalDelta, externalDelta, promiseRisk);
    this.stageManager.advanceTime(5);
    this._updateRiskBars();

    const triggered = this.allySystem.getTriggeredAllies(
      SCENARIO_STEPS[this.stepIndex].stageId,
      choiceId,
      this.engine.state.get('internalChaos'),
      this.engine.state.get('externalRisk')
    );
    const allies = this.allySystem.getAllies();
    const allyMap = { tech_comm: 0, reporter: 1, control_tower: 2, tech_lead: 3, biz_lead: 4 };

    if (triggered.length > 0) {
      const ally = triggered[0];
      const idx = allyMap[ally.id] ?? 0;
      this._showSpeechBubble(idx, ally.message);
      this.allySystem.recruit(ally.id);
      if (ally.effect?.internalChaos) this.riskGauge.applyDelta(ally.effect.internalChaos, 0, false);
      if (ally.effect?.externalRisk) this.riskGauge.applyDelta(0, ally.effect.externalRisk, false);
      this._updateRiskBars();
      this._updateItemSlots();
      await this._showAllyMeeting(ally);
    } else {
      const step = SCENARIO_STEPS[this.stepIndex];
      const firstForStage = allies.findIndex((a) => a.stageId === step.stageId);
      const respIdx = firstForStage >= 0 ? firstForStage : 0;
      this._showSpeechBubble(respIdx, '판단이 반영되었습니다.');
    }

    this.stepIndex++;
    this._showBottomSituation();
  }

  _getAllyImagePath(allyId) {
    const map = { tech_comm: 'techCommunicator', reporter: 'reporter', control_tower: 'controlTower', tech_lead: 'techLeader', biz_lead: 'bizLead' };
    const role = ROLES.find((r) => r.id === map[allyId]);
    return role?.imagePath ?? null;
  }

  _updateItemSlots() {
    const items = this.engine.state.get('items') ?? [true, false, false, false, false];
    const itemSources = this.engine.state.get('itemSources') ?? [null, null, null, null, null];
    const job = this.engine.state.get('selectedJob');
    const role = ROLES.find((r) => r.id === job);
    const container = this.domRoot?.querySelector('#game-item-slots');
    if (!container) return;
    container.innerHTML = this._renderItemSlots(items, itemSources, role);
  }

  _showAllyMeeting(ally) {
    return new Promise((resolve) => {
      const imgPath = this._getAllyImagePath(ally.id);
      const allyIcon = ROLES.find((r) => r.name === ally.name)?.icon ?? '🔮';
      const portraitHtml = imgPath
        ? `<img src="${imgPath}" alt="${ally.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span class="ally-fallback-icon" style="display:none">${allyIcon}</span>`
        : `<span class="ally-fallback-icon">${allyIcon}</span>`;
      const container = this._rightArea ?? this.domRoot;
      let box = container.querySelector('.ally-meeting-overlay');
      if (!box) {
        box = document.createElement('div');
        box.className = 'ally-meeting-overlay';
        box.style.pointerEvents = 'auto';
        container.appendChild(box);
      }
      box.style.display = 'flex';
      box.innerHTML = `
        <div class="ally-meeting-card">
          <div class="ally-portrait-wrap">${portraitHtml}</div>
          <div class="ally-meeting-name">${ally.name}</div>
          <p class="ally-meeting-message">${ally.message}</p>
          <div class="ally-item-get">
            <span class="ally-item-icon">${allyIcon}</span>
            <span>아이템을 획득했습니다!</span>
          </div>
          <button class="btn-confirm ally-close-btn">확인</button>
        </div>
      `;
      box.querySelector('.ally-close-btn').addEventListener('click', () => {
        box.style.display = 'none';
        resolve();
      });
    });
  }

  _goToEnding() {
    const grade = this.endingEvaluator.evaluate();
    this.engine.state.set({ endingGrade: grade });
    // 보스전 씬으로 먼저 이동
    this.engine.sceneManager.goTo('boss');
  }

  async exit() {
    if (this._villLoopId != null) cancelAnimationFrame(this._villLoopId);
    this._keyCleanup?.();
    clearTimeout(this._speechBubbleTimer);
    if (this.domRoot?.parentNode) this.domRoot.parentNode.removeChild(this.domRoot);
    this.engine.pixi.stage.removeChildren();
  }
}
