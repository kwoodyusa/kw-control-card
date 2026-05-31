// kw-control-card.js — v1.2.1
// Uniform control card for lights, fans, media players, and cameras.
// Designed to inherit Frosted Glass Dark theme CSS variables automatically.
//
// USAGE:
//   type: custom:kw-control-card
//   entity: light.living_room
//   name: Living Room        # optional
//   icon: mdi:ceiling-light  # optional
//   size: medium             # small | medium | large  (default: medium)
//   card_style: square       # square tiles for TVs (media_player only)
//   show_direction: true     # show fan direction toggle (default: true)
//   fan_speeds:
//     - label: Low
//       pct: 14
//     - label: Med
//       pct: 57
//     - label: High
//       pct: 100

const KW_CARD_VERSION = '1.2.1';

// ─── Size presets ───────────────────────────────────────────────────────────────────
const SIZES = {
  small:  { iconWrap: 28, icon: 16, name: 11, sub: 10, pad: '8px 10px',  controlGap: 6,  spd: 9  },
  medium: { iconWrap: 34, icon: 19, name: 13, sub: 11, pad: '10px 14px', controlGap: 7,  spd: 10 },
  large:  { iconWrap: 40, icon: 22, name: 15, sub: 12, pad: '13px 16px', controlGap: 9,  spd: 11 },
};

const DOMAIN_ICONS = {
  light:        'mdi:lightbulb',
  fan:          'mdi:fan',
  media_player: 'mdi:television',
  camera:       'mdi:cctv',
  switch:       'mdi:toggle-switch',
  input_boolean:'mdi:toggle-switch',
};

// ─── Base card shell styles (shared) ─────────────────────────────────────────
function shellStyles(sz) {
  return `
    :host { display: block; }
    .card {
      background: var(--ha-card-background, rgba(30, 32, 48, 0.55));
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border-radius: var(--ha-card-border-radius, 14px);
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      box-sizing: border-box;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .card:hover { border-color: rgba(255,255,255,0.13); }
    .card.unavailable { opacity: 0.4; pointer-events: none; }
    .toggle {
      width: 38px; height: 22px; border-radius: 11px;
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.12);
      position: relative; cursor: pointer; flex-shrink: 0; padding: 0;
      transition: background 0.25s, border-color 0.25s;
    }
    .toggle.on { background: var(--accent-color,#ffcc46); border-color: var(--accent-color,#ffcc46); }
    .toggle::after {
      content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
      background: rgba(255,255,255,0.92); top: 2px; left: 2px;
      transition: transform 0.22s cubic-bezier(.4,0,.2,1); box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .toggle.on::after { transform: translateX(16px); }
    .icon-wrap {
      width: ${sz.iconWrap}px; height: ${sz.iconWrap}px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); flex-shrink: 0; cursor: pointer;
      transition: background 0.22s, box-shadow 0.22s;
    }
    .icon-wrap.on { background: rgba(var(--rgb-accent-color,255,200,70),0.2); box-shadow: 0 0 10px rgba(var(--rgb-accent-color,255,200,70),0.25); }
    ha-icon { --mdc-icon-size: ${sz.icon}px; color: var(--secondary-text-color,#9e9e9e); transition: color 0.22s; pointer-events: none; }
    .icon-wrap.on ha-icon { color: var(--accent-color,#ffcc46); }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: ${sz.controlGap}px 0; }
  `;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function sliderGrad(pct) {
  return `linear-gradient(to right, var(--accent-color,#ffcc46) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
}

// ─── Card class ───────────────────────────────────────────────────────────────
class KWControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = null; this._hass = null;
    this._dragging = false; this._cleanupDrag = null;
  }

  setConfig(config) {
    if (!config.entity) throw new Error('kw-control-card: `entity` is required');
    this._config = {
      size: 'medium', show_name: true, card_style: 'auto', show_direction: true,
      fan_speeds: [{ label: 'Low', pct: 14 }, { label: 'Med', pct: 57 }, { label: 'High', pct: 100 }],
      ...config,
    };
    this._render();
  }

  set hass(hass) { this._hass = hass; if (!this._dragging) this._render(); }
  getCardSize() { return 1; }
  get _entity()  { return this._hass?.states[this._config.entity]; }
  get _domain()  { return this._config.entity?.split('.')[0]; }
  get _isOn()    { const s = this._entity?.state; return s === 'on' || s === 'playing' || s === 'paused'; }
  get _name()    { return this._config.name || this._entity?.attributes?.friendly_name || this._config.entity; }
  get _icon()    { return this._config.icon || this._entity?.attributes?.icon || DOMAIN_ICONS[this._domain] || 'mdi:help-circle'; }
  get _sz()      { return SIZES[this._config.size] || SIZES.medium; }

  _svc(domain, service, data = {}) { this._hass.callService(domain, service, { entity_id: this._config.entity, ...data }); }
  _moreInfo() { const e = new Event('hass-more-info', { bubbles: true, composed: true }); e.detail = { entityId: this._config.entity }; this.dispatchEvent(e); }
  _cleanup() { if (this._cleanupDrag) { this._cleanupDrag(); this._cleanupDrag = null; } }

  _render() {
    if (!this._config || !this._hass) return;
    this._cleanup();
    if (!this._entity) {
      this.shadowRoot.innerHTML = `<div style="padding:10px;color:var(--error-color,#e74c3c);font-size:12px">Entity not found: <code>${this._config.entity}</code></div>`;
      return;
    }
    const d = this._domain, style = this._config.card_style;
    if (d === 'light')                                    this._renderLight();
    else if (d === 'fan')                                 this._renderFan();
    else if (d === 'media_player' && style === 'square')  this._renderTVSquare();
    else if (d === 'media_player')                        this._renderMedia();
    else if (d === 'camera')                              this._renderCamera();
    else                                                  this._renderGeneric();
  }

  // ═══ LIGHT — pill track with name inside + glowing bulb thumb ════════════════
  _renderLight() {
    const attrs = this._entity.attributes;
    const isOn = this._isOn, unavail = this._entity.state === 'unavailable';
    const bright = attrs.brightness ? Math.round(attrs.brightness / 255 * 100) : 0;
    const val = isOn ? bright : 0, sz = this._sz;

    // Color: use light's rgb, or cool blue for white/tunable lights
    let lightColor;
    if (isOn && attrs.rgb_color) {
      const [r, g, b] = attrs.rgb_color;
      lightColor = `rgb(${r},${g},${b})`;
    } else {
      lightColor = '#6eb6ff';
    }

    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(sz)}
        .card { padding: ${sz.pad}; cursor: default; }
        .track {
          position: relative; height: 18px; border-radius: 9px;
          background: rgba(255,255,255,0.07);
          cursor: ew-resize; user-select: none;
        }
        .fill {
          position: absolute; left: 0; top: 0; bottom: 0;
          width: ${val}%; border-radius: 9px;
          background: ${lightColor};
          opacity: ${isOn ? 0.5 : 0};
          pointer-events: none;
        }
        .lbl {
          position: absolute; inset: 0;
          display: flex; align-items: center;
          padding: 0 22px;
          justify-content: center;
          font-size: ${sz.sub}px; font-weight: 600;
          color: var(--primary-text-color, #e8e8e8);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          pointer-events: none; z-index: 2;
        }
        .thumb {
          position: absolute; top: 50%;
          left: clamp(1px, calc(${val}% - 9px), calc(100% - 18px));
          transform: translateY(-50%);
          width: 16px; height: 16px; border-radius: 50%;
          background: rgba(15,17,28,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 3; pointer-events: none;
          box-shadow: ${isOn
            ? `0 0 6px ${lightColor}, 0 0 12px ${lightColor}55`
            : '0 1px 4px rgba(0,0,0,0.5)'};
        }
        .thumb ha-icon {
          --mdc-icon-size: 11px;
          color: ${isOn ? lightColor : 'rgba(255,255,255,0.25)'};
        }
      </style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="track" id="track">
          <div class="fill" id="fill"></div>
          <div class="lbl">${this._name}</div>
          <div class="thumb" id="thumb">
            <ha-icon icon="${this._icon}"></ha-icon>
          </div>
        </div>
      </div>`;

    const track = this.shadowRoot.getElementById('track');
    const fill  = this.shadowRoot.getElementById('fill');
    const thumb = this.shadowRoot.getElementById('thumb');

    const getPercent = (clientX) => {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(100, Math.round((clientX - rect.left) / rect.width * 100)));
    };
    const updateUI = (pct) => {
      fill.style.width = pct + '%';
      fill.style.opacity = pct > 0 ? '0.5' : '0';
      thumb.style.left = `clamp(1px, calc(${pct}% - 9px), calc(100% - 18px))`;
    };

    if (canDim) {
      // ── Dimmable: drag to set brightness ──────────────────────────────────
      let startX = 0, moved = false;
      const onMove = (clientX) => {
        if (Math.abs(clientX - startX) > 3) moved = true;
        if (!moved) return;
        this._dragging = true;
        updateUI(getPercent(clientX));
      };
      const onUp = (clientX) => {
        const pct = getPercent(clientX);
        if (pct === 0) this._svc('light', 'turn_off');
        else           this._svc('light', 'turn_on', { brightness_pct: pct });
        this._dragging = false; moved = false; cleanup();
      };
      const mmove = (e) => onMove(e.clientX);
      const mup   = (e) => onUp(e.clientX);
      const tmove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };
      const tup   = (e) => onUp(e.changedTouches[0].clientX);
      const cleanup = () => {
        document.removeEventListener('mousemove', mmove);
        document.removeEventListener('mouseup',   mup);
        document.removeEventListener('touchmove', tmove);
        document.removeEventListener('touchend',  tup);
      };
      this._cleanupDrag = cleanup;
      track.addEventListener('mousedown', (e) => {
        startX = e.clientX; moved = false;
        document.addEventListener('mousemove', mmove);
        document.addEventListener('mouseup',   mup);
      });
      track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX; moved = false;
        document.addEventListener('touchmove', tmove, { passive: false });
        document.addEventListener('touchend',  tup);
      }, { passive: true });
    } else {
      // ── Non-dimmable: tap to toggle, thumb snaps right(on)/left(off) ──────
      track.style.cursor = 'pointer';
      track.addEventListener('click', () => {
        if (isOn) this._svc('light', 'turn_off');
        else      this._svc('light', 'turn_on');
      });
    }
  }

  // ═══ FAN — pill speed slider with fan icon thumb ═════════════════════════════
  _renderFan() {
    const attrs   = this._entity.attributes;
    const isOn    = this._isOn;
    const unavail = this._entity.state === 'unavailable';
    const val     = isOn ? (attrs.percentage || 0) : 0;
    const sz      = this._sz;

    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(sz)}
        .card { padding: ${sz.pad}; cursor: default; }
        .track {
          position: relative; height: 18px; border-radius: 9px;
          background: rgba(255,255,255,0.07);
          cursor: ew-resize; user-select: none;
        }
        .fill {
          position: absolute; left: 0; top: 0; bottom: 0;
          width: ${val}%; border-radius: 9px;
          background: var(--accent-color, #ffcc46);
          opacity: ${isOn ? 0.5 : 0};
          pointer-events: none;
        }
        .lbl {
          position: absolute; inset: 0;
          display: flex; align-items: center;
          padding: 0 22px; justify-content: center;
          font-size: ${sz.sub}px; font-weight: 600;
          color: var(--primary-text-color, #e8e8e8);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          pointer-events: none; z-index: 2;
        }
        .thumb {
          position: absolute; top: 50%;
          left: clamp(1px, calc(${val}% - 9px), calc(100% - 18px));
          transform: translateY(-50%);
          width: 16px; height: 16px; border-radius: 50%;
          background: rgba(15,17,28,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 3; pointer-events: none;
          box-shadow: ${isOn
            ? '0 0 6px rgba(var(--rgb-accent-color,255,200,70),0.9), 0 0 12px rgba(var(--rgb-accent-color,255,200,70),0.4)'
            : '0 1px 3px rgba(0,0,0,0.5)'};
        }
        .thumb ha-icon {
          --mdc-icon-size: 11px;
          color: ${isOn ? 'var(--accent-color,#ffcc46)' : 'rgba(255,255,255,0.25)'};
        }
      </style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="track" id="track">
          <div class="fill" id="fill"></div>
          <div class="lbl">${this._name}</div>
          <div class="thumb" id="thumb">
            <ha-icon icon="mdi:fan"></ha-icon>
          </div>
        </div>
      </div>`;

    const track = this.shadowRoot.getElementById('track');
    const fill  = this.shadowRoot.getElementById('fill');
    const thumb = this.shadowRoot.getElementById('thumb');

    const getPercent = (clientX) => {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(100, Math.round((clientX - rect.left) / rect.width * 100)));
    };
    const updateUI = (pct) => {
      fill.style.width   = pct + '%';
      fill.style.opacity = pct > 0 ? '0.5' : '0';
      thumb.style.left   = `clamp(1px, calc(${pct}% - 9px), calc(100% - 18px))`;
    };
    let startX = 0, moved = false;
    const onMove = (clientX) => {
      if (Math.abs(clientX - startX) > 3) moved = true;
      if (!moved) return;
      this._dragging = true; updateUI(getPercent(clientX));
    };
    const onUp = (clientX) => {
      const pct = getPercent(clientX);
      if (pct === 0) this._svc('fan', 'turn_off');
      else           this._svc('fan', 'turn_on', { percentage: pct });
      this._dragging = false; moved = false; cleanup();
    };
    const mmove = (e) => onMove(e.clientX);
    const mup   = (e) => onUp(e.clientX);
    const tmove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };
    const tup   = (e) => onUp(e.changedTouches[0].clientX);
    const cleanup = () => {
      document.removeEventListener('mousemove', mmove);
      document.removeEventListener('mouseup',   mup);
      document.removeEventListener('touchmove', tmove);
      document.removeEventListener('touchend',  tup);
    };
    this._cleanupDrag = cleanup;
    track.addEventListener('mousedown', (e) => {
      startX = e.clientX; moved = false;
      document.addEventListener('mousemove', mmove);
      document.addEventListener('mouseup',   mup);
    });
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX; moved = false;
      document.addEventListener('touchmove', tmove, { passive: false });
      document.addEventListener('touchend',  tup);
    }, { passive: true });
  }

  // ═══ MEDIA PLAYER ════════════════════════════════════════════════════════════
  _renderMedia() {
    const attrs = this._entity.attributes, state = this._entity.state;
    const isOn = this._isOn, isPlaying = state==='playing', unavail = state==='unavailable';
    const vol = attrs.volume_level!=null ? Math.round(attrs.volume_level*100) : 50;
    const muted = attrs.is_volume_muted||false, sz = this._sz;
    const subText = unavail ? 'Unavailable' : !isOn ? 'Off' : (attrs.media_artist&&attrs.media_title) ? `${attrs.media_artist} — ${attrs.media_title}` : attrs.media_title||state;
    const sf = attrs.supported_features||0, hasPrev=!!(sf&16), hasNext=!!(sf&32), hasVol=!!(sf&4);

    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(sz)}
        .card { padding: ${sz.pad}; }
        .header { display: flex; align-items: center; gap: 8px; }
        .info { flex: 1; min-width: 0; }
        .name { font-size: ${sz.name}px; font-weight: 600; color: var(--primary-text-color,#e8e8e8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub { font-size: ${sz.sub}px; color: var(--secondary-text-color,#9e9e9e); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .media-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .med-btn { background: none; border: none; color: var(--secondary-text-color,#9e9e9e); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.12s, color 0.12s; }
        .med-btn:hover { background: rgba(255,255,255,0.08); color: var(--primary-text-color,#e8e8e8); }
        .med-btn.play ha-icon { --mdc-icon-size: 26px; color: var(--accent-color,#ffcc46); }
        .slider-row { display: flex; align-items: center; gap: 6px; }
        input[type=range] { flex: 1; -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; outline: none; cursor: pointer; background: rgba(255,255,255,0.1); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-color,#ffcc46); cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
        input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--accent-color,#ffcc46); border: none; }
        .vol-val { font-size: 10px; color: var(--secondary-text-color,#9e9e9e); min-width: 26px; text-align: right; }
        .mute-icon { --mdc-icon-size: 14px; color: var(--secondary-text-color,#9e9e9e); cursor: pointer; }
      </style>
      <div class="card${unavail?' unavailable':''}">
        <div class="header">
          <div class="icon-wrap${isOn?' on':''}" id="icon-btn"><ha-icon icon="${this._icon}"></ha-icon></div>
          <div class="info"><div class="name">${this._name}</div><div class="sub">${subText}</div></div>
          <button class="toggle${isOn?' on':''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
        ${isOn ? `
        <div class="divider"></div>
        <div class="media-row">
          ${hasPrev?`<button class="med-btn" id="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></button>`:''}
          <button class="med-btn play" id="playpause"><ha-icon icon="${isPlaying?'mdi:pause-circle':'mdi:play-circle'}"></ha-icon></button>
          ${hasNext?`<button class="med-btn" id="next"><ha-icon icon="mdi:skip-next"></ha-icon></button>`:''}
        </div>
        ${hasVol?`<div class="slider-row" style="margin-top:${sz.controlGap}px"><ha-icon class="mute-icon" id="mute-btn" icon="mdi:volume-${muted?'off':vol<30?'low':'medium'}"></ha-icon><input type="range" id="volume" min="0" max="100" value="${vol}" style="${sliderGrad(vol)}"><span class="vol-val" id="vval">${vol}%</span></div>`:''}
        ` : ''}
      </div>`;

    this.shadowRoot.getElementById('toggle').onclick = (e) => { e.stopPropagation(); this._svc('media_player','toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = (e) => { e.stopPropagation(); this._moreInfo(); };
    this.shadowRoot.getElementById('playpause')?.addEventListener('click',(e)=>{ e.stopPropagation(); this._svc('media_player',isPlaying?'media_pause':'media_play'); });
    this.shadowRoot.getElementById('prev')?.addEventListener('click',(e)=>{ e.stopPropagation(); this._svc('media_player','media_previous_track'); });
    this.shadowRoot.getElementById('next')?.addEventListener('click',(e)=>{ e.stopPropagation(); this._svc('media_player','media_next_track'); });
    this.shadowRoot.getElementById('mute-btn')?.addEventListener('click',(e)=>{ e.stopPropagation(); this._svc('media_player','volume_mute',{is_volume_muted:!muted}); });
    const vsl = this.shadowRoot.getElementById('volume');
    if (vsl) {
      vsl.addEventListener('mousedown',()=>this._dragging=true);
      vsl.addEventListener('touchstart',()=>this._dragging=true);
      vsl.addEventListener('input',(e)=>{ this.shadowRoot.getElementById('vval').textContent=`${e.target.value}%`; vsl.style.background=sliderGrad(e.target.value); });
      vsl.addEventListener('change',(e)=>{ this._dragging=false; this._svc('media_player','volume_set',{volume_level:parseInt(e.target.value)/100}); });
    }
  }

  // ═══ TV SQUARE ══════════════════════════════════════════════════════════════
  _renderTVSquare() {
    const isOn = this._isOn, unavail = this._entity.state==='unavailable', sz = this._sz;
    const iconSize = this._config.size==='small'?22:this._config.size==='large'?32:26;
    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(sz)}
        :host { display: block; }
        .card { width:100%; aspect-ratio:1/1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; padding:8px; cursor:pointer; }
        .sq-icon { width:${iconSize+10}px; height:${iconSize+10}px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.06); transition:background 0.25s,box-shadow 0.25s; flex-shrink:0; }
        .sq-icon.on { background:rgba(var(--rgb-accent-color,255,200,70),0.2); box-shadow:0 0 12px rgba(var(--rgb-accent-color,255,200,70),0.3); }
        .sq-icon ha-icon { --mdc-icon-size:${iconSize}px; color:var(--secondary-text-color,#9e9e9e); transition:color 0.25s; pointer-events:none; }
        .sq-icon.on ha-icon { color:var(--accent-color,#ffcc46); }
        .sq-name { font-size:9px; font-weight:600; color:var(--primary-text-color,#e8e8e8); text-align:center; line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; width:100%; }
      </style>
      <div class="card${unavail?' unavailable':''}" id="card">
        <div class="sq-icon${isOn?' on':''}" ><ha-icon icon="${this._icon}"></ha-icon></div>
        <div class="sq-name">${this._name}</div>
      </div>`;
    this.shadowRoot.getElementById('card').addEventListener('click',()=>this._svc('media_player','toggle'));
  }

  // ═══ CAMERA ══════════════════════════════════════════════════════════════
  _renderCamera() {
    const pic = this._entity.attributes?.entity_picture;
    const imgSrc = pic ? (this._hass.hassUrl?this._hass.hassUrl(pic):pic)+`&t=${Date.now()}` : null;
    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(this._sz)}
        .card { padding:0; cursor:pointer; }
        .cam-wrap { position:relative; overflow:hidden; border-radius:var(--ha-card-border-radius,14px); aspect-ratio:16/9; background:rgba(0,0,0,0.3); }
        .cam-img { width:100%; height:100%; object-fit:cover; display:block; }
        .cam-label { position:absolute; bottom:0; left:0; right:0; padding:5px 9px; background:linear-gradient(transparent,rgba(0,0,0,0.65)); font-size:11px; font-weight:600; color:#fff; }
        .cam-none { display:flex; align-items:center; justify-content:center; padding:28px 0; }
        .cam-none ha-icon { --mdc-icon-size:36px; color:rgba(255,255,255,0.2); }
      </style>
      <div class="card" id="cam"><div class="cam-wrap">${imgSrc?`<img class="cam-img" src="${imgSrc}" alt="${this._name}">`:`<div class="cam-none"><ha-icon icon="mdi:camera-off"></ha-icon></div>`}<div class="cam-label">${this._name}</div></div></div>`;
    this.shadowRoot.getElementById('cam').onclick = ()=>this._moreInfo();
  }

  // ═══ GENERIC ═════════════════════════════════════════════════════════════
  _renderGeneric() {
    const isOn = this._isOn, unavail = this._entity.state==='unavailable', sz = this._sz;
    this.shadowRoot.innerHTML = `
      <style>
        ${shellStyles(sz)}
        .card { padding:${sz.pad}; }
        .header { display:flex; align-items:center; gap:8px; }
        .info { flex:1; min-width:0; }
        .name { font-size:${sz.name}px; font-weight:600; color:var(--primary-text-color,#e8e8e8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sub  { font-size:${sz.sub}px; color:var(--secondary-text-color,#9e9e9e); margin-top:1px; }
      </style>
      <div class="card${unavail?' unavailable':''}">
        <div class="header">
          <div class="icon-wrap${isOn?' on':''}" id="icon-btn"><ha-icon icon="${this._icon}"></ha-icon></div>
          <div class="info"><div class="name">${this._name}</div><div class="sub">${unavail?'Unavailable':isOn?'On':'Off'}</div></div>
          <button class="toggle${isOn?' on':''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
      </div>`;
    this.shadowRoot.getElementById('toggle').onclick = (e)=>{ e.stopPropagation(); this._svc(this._domain,'toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = (e)=>{ e.stopPropagation(); this._moreInfo(); };
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
if (!customElements.get('kw-control-card')) {
  customElements.define('kw-control-card', KWControlCard);
  console.info(
    `%c KW-CONTROL-CARD %c v${KW_CARD_VERSION} `,
    'color:#fff;background:#4a6fa5;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px',
    'color:#4a6fa5;background:rgba(74,111,165,.15);font-weight:700;padding:2px 6px;border-radius:0 4px 4px 0',
  );
}
window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'kw-control-card')) {
  window.customCards.push({ type: 'kw-control-card', name: 'KW Control Card', description: 'Compact control card for lights, fans, media players, and cameras.', preview: false });
}
