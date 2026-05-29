// kw-control-card.js — v1.0.0
// Uniform control card for lights, fans, media players, and cameras.
// Designed to inherit Frosted Glass Dark theme CSS variables automatically.
//
// USAGE:
//   type: custom:kw-control-card
//   entity: light.living_room
//   name: Living Room        # optional, overrides friendly name
//   icon: mdi:ceiling-light  # optional, overrides default icon
//   size: medium             # small | medium | large  (default: medium)
//   show_slider: true        # show brightness/volume slider (default: true)
//   fan_speeds:              # optional custom speed labels + percentages
//     - label: Low
//       pct: 14
//     - label: Med
//       pct: 57
//     - label: High
//       pct: 100

const KW_CARD_VERSION = '1.0.0';

// ─── Size presets ────────────────────────────────────────────────────────────
const SIZES = {
  small:  { iconWrap: 32, icon: 18, name: 12, sub: 10, pad: '10px 12px', controlGap: 8  },
  medium: { iconWrap: 40, icon: 22, name: 14, sub: 11, pad: '14px 16px', controlGap: 10 },
  large:  { iconWrap: 48, icon: 26, name: 16, sub: 13, pad: '18px 20px', controlGap: 12 },
};

// ─── Default icons per domain ────────────────────────────────────────────────
const DOMAIN_ICONS = {
  light:        'mdi:lightbulb',
  fan:          'mdi:fan',
  media_player: 'mdi:television',
  camera:       'mdi:cctv',
  switch:       'mdi:toggle-switch',
  input_boolean:'mdi:toggle-switch',
};

// ─── Shared CSS ──────────────────────────────────────────────────────────────
function baseStyles(sz) {
  return `
    :host { display: block; }

    /* ── Card shell ───────────────────────────────────── */
    .card {
      background: var(--ha-card-background, rgba(30, 32, 48, 0.55));
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border-radius: var(--ha-card-border-radius, 14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
      padding: ${sz.pad};
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: 0 6px 28px rgba(0, 0, 0, 0.4);
    }
    .card.unavailable { opacity: 0.45; pointer-events: none; }

    /* ── Header row ───────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icon-wrap {
      width: ${sz.iconWrap}px;
      height: ${sz.iconWrap}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
      cursor: pointer;
      transition: background 0.25s, box-shadow 0.25s;
    }
    .icon-wrap.on {
      background: rgba(var(--rgb-accent-color, 255, 200, 70), 0.18);
      box-shadow: 0 0 12px rgba(var(--rgb-accent-color, 255, 200, 70), 0.25);
    }
    ha-icon {
      --mdc-icon-size: ${sz.icon}px;
      color: var(--secondary-text-color, #9e9e9e);
      transition: color 0.25s;
      pointer-events: none;
    }
    .icon-wrap.on ha-icon { color: var(--accent-color, #ffcc46); }

    .info { flex: 1; min-width: 0; }
    .name {
      font-size: ${sz.name}px;
      font-weight: 600;
      color: var(--primary-text-color, #e8e8e8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .sub {
      font-size: ${sz.sub}px;
      color: var(--secondary-text-color, #9e9e9e);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Toggle pill ──────────────────────────────────── */
    .toggle {
      width: 42px;
      height: 25px;
      border-radius: 13px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.12);
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: background 0.25s, border-color 0.25s;
    }
    .toggle.on {
      background: var(--accent-color, #ffcc46);
      border-color: var(--accent-color, #ffcc46);
    }
    .toggle::after {
      content: '';
      position: absolute;
      width: 19px;
      height: 19px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      top: 2px;
      left: 2px;
      transition: transform 0.25s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 1px 5px rgba(0,0,0,0.35);
    }
    .toggle.on::after { transform: translateX(17px); }

    /* ── Divider ──────────────────────────────────────── */
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: ${sz.controlGap}px 0;
    }

    /* ── Range slider ─────────────────────────────────── */
    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type=range] {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--accent-color, #ffcc46);
      cursor: pointer;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
      transition: transform 0.1s;
    }
    input[type=range]:active::-webkit-slider-thumb { transform: scale(1.2); }
    input[type=range]::-moz-range-thumb {
      width: 18px; height: 18px;
      border-radius: 50%;
      background: var(--accent-color, #ffcc46);
      border: none;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
    }
    .slider-val {
      font-size: 11px;
      color: var(--secondary-text-color, #9e9e9e);
      min-width: 30px;
      text-align: right;
    }

    /* ── Fan speed buttons ────────────────────────────── */
    .speed-row {
      display: flex;
      gap: 6px;
    }
    .spd-btn {
      flex: 1;
      padding: 5px 0;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--secondary-text-color, #9e9e9e);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .spd-btn:hover { background: rgba(255,255,255,0.09); }
    .spd-btn.active {
      background: rgba(var(--rgb-accent-color, 255, 200, 70), 0.15);
      border-color: var(--accent-color, #ffcc46);
      color: var(--accent-color, #ffcc46);
    }

    /* ── Fan direction toggle ─────────────────────────── */
    .dir-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .dir-label {
      font-size: 10px;
      color: var(--secondary-text-color, #9e9e9e);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex: 1;
    }
    .dir-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--secondary-text-color, #9e9e9e);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s;
    }
    .dir-btn:hover { background: rgba(255,255,255,0.09); }
    .dir-btn ha-icon { --mdc-icon-size: 14px; pointer-events: none; }

    /* ── Media controls ───────────────────────────────── */
    .media-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .med-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #9e9e9e);
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .med-btn:hover {
      background: rgba(255,255,255,0.08);
      color: var(--primary-text-color, #e8e8e8);
    }
    .med-btn.play ha-icon { --mdc-icon-size: 30px; color: var(--accent-color, #ffcc46); }
    .mute-icon {
      --mdc-icon-size: 16px;
      color: var(--secondary-text-color, #9e9e9e);
      cursor: pointer;
    }

    /* ── Camera ───────────────────────────────────────── */
    .cam-wrap {
      position: relative;
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 14px);
      aspect-ratio: 16 / 9;
      background: rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .cam-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .cam-label {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 6px 10px;
      background: linear-gradient(transparent, rgba(0,0,0,0.65));
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }
    .cam-no-feed {
      display: flex; align-items: center; justify-content: center;
      height: 100%; padding: 32px 0;
    }
    .cam-no-feed ha-icon { --mdc-icon-size: 40px; color: rgba(255,255,255,0.2); }
  `;
}

// ─── Helper: gradient for range slider ───────────────────────────────────────
function sliderGrad(pct) {
  return `linear-gradient(to right, var(--accent-color,#ffcc46) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
}

// ─── The card class ──────────────────────────────────────────────────────────
class KWControlCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config  = null;
    this._hass    = null;
    this._dragging = false;
  }

  setConfig(config) {
    if (!config.entity) throw new Error('kw-control-card: `entity` is required');
    this._config = {
      size: 'medium',
      show_name: true,
      show_slider: true,
      fan_speeds: [
        { label: 'Low',  pct: 14  },
        { label: 'Med',  pct: 57  },
        { label: 'High', pct: 100 },
      ],
      show_direction: true,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._dragging) this._render();
  }

  getCardSize() { return 2; }

  get _entity()  { return this._hass?.states[this._config.entity]; }
  get _domain()  { return this._config.entity?.split('.')[0]; }
  get _isOn() {
    const s = this._entity?.state;
    return s === 'on' || s === 'playing' || s === 'paused';
  }
  get _name() {
    return this._config.name
      || this._entity?.attributes?.friendly_name
      || this._config.entity;
  }
  get _icon() {
    return this._config.icon
      || this._entity?.attributes?.icon
      || DOMAIN_ICONS[this._domain]
      || 'mdi:help-circle';
  }
  get _sz() { return SIZES[this._config.size] || SIZES.medium; }

  _svc(domain, service, data = {}) {
    this._hass.callService(domain, service, {
      entity_id: this._config.entity,
      ...data,
    });
  }

  _moreInfo() {
    const e = new Event('hass-more-info', { bubbles: true, composed: true });
    e.detail = { entityId: this._config.entity };
    this.dispatchEvent(e);
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._entity) {
      this.shadowRoot.innerHTML =
        `<div style="padding:12px;color:var(--error-color,#e74c3c);font-size:13px">
          Entity not found: <code>${this._config.entity}</code>
        </div>`;
      return;
    }
    const d = this._domain;
    if      (d === 'light')        this._renderLight();
    else if (d === 'fan')          this._renderFan();
    else if (d === 'media_player') this._renderMedia();
    else if (d === 'camera')       this._renderCamera();
    else                           this._renderGeneric();
  }

  _renderLight() {
    const attrs  = this._entity.attributes;
    const isOn   = this._isOn;
    const unavail = this._entity.state === 'unavailable';
    const bright  = attrs.brightness ? Math.round(attrs.brightness / 255 * 100) : 0;
    const showSlider = this._config.show_slider;
    const sz = this._sz;
    const colorTemp = attrs.color_temp_kelvin ? `${attrs.color_temp_kelvin}K` : '';
    const subText = unavail ? 'Unavailable' : isOn ? `${bright}%${colorTemp ? ' · ' + colorTemp : ''}` : 'Off';

    this.shadowRoot.innerHTML = `
      <style>${baseStyles(sz)}</style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="header">
          <div class="icon-wrap${isOn ? ' on' : ''}" id="icon-btn">
            <ha-icon icon="${this._icon}"></ha-icon>
          </div>
          ${this._config.show_name ? `
          <div class="info">
            <div class="name" id="name-btn">${this._name}</div>
            <div class="sub">${subText}</div>
          </div>` : '<div class="info"></div>'}
          <button class="toggle${isOn ? ' on' : ''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
        ${showSlider && isOn ? `
        <div class="divider"></div>
        <div class="slider-row">
          <input type="range" id="brightness" min="1" max="100" value="${bright}"
            style="${sliderGrad(bright)}">
          <span class="slider-val" id="bval">${bright}%</span>
        </div>` : ''}
      </div>`;

    this.shadowRoot.getElementById('toggle').onclick = (e) => { e.stopPropagation(); this._svc('light', 'toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = () => this._moreInfo();
    this.shadowRoot.getElementById('name-btn')?.addEventListener('click', () => this._moreInfo());
    const sl = this.shadowRoot.getElementById('brightness');
    if (sl) {
      sl.addEventListener('mousedown', () => this._dragging = true);
      sl.addEventListener('touchstart', () => this._dragging = true);
      sl.addEventListener('input', (e) => {
        this.shadowRoot.getElementById('bval').textContent = `${e.target.value}%`;
        sl.style.background = sliderGrad(e.target.value);
      });
      sl.addEventListener('change', (e) => {
        this._dragging = false;
        this._svc('light', 'turn_on', { brightness_pct: parseInt(e.target.value) });
      });
    }
  }

  _renderFan() {
    const attrs    = this._entity.attributes;
    const isOn     = this._isOn;
    const unavail  = this._entity.state === 'unavailable';
    const pct      = attrs.percentage || 0;
    const direction = attrs.direction || 'forward';
    const hasDir   = this._config.show_direction && (attrs.supported_features & 4);
    const presets  = attrs.preset_modes || [];
    const curPreset = attrs.preset_mode;
    const sz = this._sz;
    const speeds = this._config.fan_speeds;
    const activeSpd = isOn && !curPreset
      ? speeds.reduce((best, s) => Math.abs(s.pct - pct) < Math.abs(best.pct - pct) ? s : best, speeds[0])
      : null;
    const subText = unavail ? 'Unavailable' : !isOn ? 'Off'
      : curPreset ? curPreset.charAt(0).toUpperCase() + curPreset.slice(1)
      : activeSpd ? activeSpd.label : `${pct}%`;

    this.shadowRoot.innerHTML = `
      <style>${baseStyles(sz)}</style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="header">
          <div class="icon-wrap${isOn ? ' on' : ''}" id="icon-btn">
            <ha-icon icon="${isOn ? 'mdi:fan' : 'mdi:fan-off'}"></ha-icon>
          </div>
          ${this._config.show_name ? `
          <div class="info">
            <div class="name" id="name-btn">${this._name}</div>
            <div class="sub">${subText}</div>
          </div>` : '<div class="info"></div>'}
          <button class="toggle${isOn ? ' on' : ''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
        <div class="divider"></div>
        <div class="speed-row">
          ${speeds.map(s => `<button class="spd-btn${activeSpd?.pct === s.pct ? ' active' : ''}" data-pct="${s.pct}">${s.label}</button>`).join('')}
          ${presets.map(p => `<button class="spd-btn${curPreset === p ? ' active' : ''}" data-preset="${p}">${p.charAt(0).toUpperCase() + p.slice(1)}</button>`).join('')}
        </div>
        ${hasDir ? `
        <div class="dir-row">
          <span class="dir-label">Direction</span>
          <button class="dir-btn" id="dir-btn">
            <ha-icon icon="${direction === 'forward' ? 'mdi:rotate-right' : 'mdi:rotate-left'}"></ha-icon>
            ${direction.charAt(0).toUpperCase() + direction.slice(1)}
          </button>
        </div>` : ''}
      </div>`;

    this.shadowRoot.getElementById('toggle').onclick = (e) => { e.stopPropagation(); this._svc('fan', 'toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = () => this._moreInfo();
    this.shadowRoot.getElementById('name-btn')?.addEventListener('click', () => this._moreInfo());
    this.shadowRoot.querySelectorAll('.spd-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.preset) {
          this._svc('fan', 'set_preset_mode', { preset_mode: btn.dataset.preset });
        } else {
          this._svc('fan', 'turn_on', { percentage: parseInt(btn.dataset.pct) });
        }
      });
    });
    this.shadowRoot.getElementById('dir-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._svc('fan', 'set_direction', { direction: direction === 'forward' ? 'reverse' : 'forward' });
    });
  }

  _renderMedia() {
    const attrs    = this._entity.attributes;
    const state    = this._entity.state;
    const isOn     = this._isOn;
    const isPlaying = state === 'playing';
    const unavail  = state === 'unavailable';
    const vol      = attrs.volume_level != null ? Math.round(attrs.volume_level * 100) : 50;
    const muted    = attrs.is_volume_muted || false;
    const showSlider = this._config.show_slider;
    const sz = this._sz;
    const mediaTitle  = attrs.media_title  || '';
    const mediaArtist = attrs.media_artist || '';
    const subText = unavail ? 'Unavailable' : !isOn ? 'Off'
      : mediaArtist && mediaTitle ? `${mediaArtist} — ${mediaTitle}`
      : mediaTitle || state;
    const sf = attrs.supported_features || 0;
    const hasPrev   = !!(sf & 16);
    const hasNext   = !!(sf & 32);
    const hasVolume = !!(sf & 4) && showSlider;

    this.shadowRoot.innerHTML = `
      <style>${baseStyles(sz)}</style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="header">
          <div class="icon-wrap${isOn ? ' on' : ''}" id="icon-btn">
            <ha-icon icon="${this._icon}"></ha-icon>
          </div>
          ${this._config.show_name ? `
          <div class="info">
            <div class="name" id="name-btn">${this._name}</div>
            <div class="sub" title="${subText}">${subText}</div>
          </div>` : '<div class="info"></div>'}
          <button class="toggle${isOn ? ' on' : ''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
        ${isOn ? `
        <div class="divider"></div>
        <div class="media-row">
          ${hasPrev ? '<button class="med-btn" id="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></button>' : ''}
          <button class="med-btn play" id="playpause">
            <ha-icon icon="${isPlaying ? 'mdi:pause-circle' : 'mdi:play-circle'}"></ha-icon>
          </button>
          ${hasNext ? '<button class="med-btn" id="next"><ha-icon icon="mdi:skip-next"></ha-icon></button>' : ''}
        </div>
        ${hasVolume ? `
        <div class="slider-row" style="margin-top:${sz.controlGap}px">
          <ha-icon class="mute-icon" id="mute-btn" icon="mdi:volume-${muted ? 'off' : vol < 30 ? 'low' : 'medium'}"></ha-icon>
          <input type="range" id="volume" min="0" max="100" value="${vol}" style="${sliderGrad(vol)}">
          <span class="slider-val" id="vval">${vol}%</span>
        </div>` : ''}` : ''}
      </div>`;

    this.shadowRoot.getElementById('toggle').onclick = (e) => { e.stopPropagation(); this._svc('media_player', 'toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = () => this._moreInfo();
    this.shadowRoot.getElementById('name-btn')?.addEventListener('click', () => this._moreInfo());
    this.shadowRoot.getElementById('playpause')?.addEventListener('click', (e) => { e.stopPropagation(); this._svc('media_player', isPlaying ? 'media_pause' : 'media_play'); });
    this.shadowRoot.getElementById('prev')?.addEventListener('click', (e) => { e.stopPropagation(); this._svc('media_player', 'media_previous_track'); });
    this.shadowRoot.getElementById('next')?.addEventListener('click', (e) => { e.stopPropagation(); this._svc('media_player', 'media_next_track'); });
    this.shadowRoot.getElementById('mute-btn')?.addEventListener('click', (e) => { e.stopPropagation(); this._svc('media_player', 'volume_mute', { is_volume_muted: !muted }); });
    const vsl = this.shadowRoot.getElementById('volume');
    if (vsl) {
      vsl.addEventListener('mousedown', () => this._dragging = true);
      vsl.addEventListener('touchstart', () => this._dragging = true);
      vsl.addEventListener('input', (e) => { this.shadowRoot.getElementById('vval').textContent = `${e.target.value}%`; vsl.style.background = sliderGrad(e.target.value); });
      vsl.addEventListener('change', (e) => { this._dragging = false; this._svc('media_player', 'volume_set', { volume_level: parseInt(e.target.value) / 100 }); });
    }
  }

  _renderCamera() {
    const state   = this._entity.state;
    const pic     = this._entity.attributes?.entity_picture;
    const imgSrc  = pic ? (this._hass.hassUrl ? this._hass.hassUrl(pic) : pic) + `&t=${Date.now()}` : null;
    const sz = this._sz;
    this.shadowRoot.innerHTML = `
      <style>${baseStyles(sz)}</style>
      <div class="card" style="padding:0; cursor:pointer" id="cam-card">
        <div class="cam-wrap">
          ${imgSrc ? `<img class="cam-img" src="${imgSrc}" alt="${this._name}">` : '<div class="cam-no-feed"><ha-icon icon="mdi:camera-off"></ha-icon></div>'}
          <div class="cam-label">${this._name}</div>
        </div>
      </div>`;
    this.shadowRoot.getElementById('cam-card').onclick = () => this._moreInfo();
  }

  _renderGeneric() {
    const isOn   = this._isOn;
    const unavail = this._entity.state === 'unavailable';
    const sz = this._sz;
    this.shadowRoot.innerHTML = `
      <style>${baseStyles(sz)}</style>
      <div class="card${unavail ? ' unavailable' : ''}">
        <div class="header">
          <div class="icon-wrap${isOn ? ' on' : ''}" id="icon-btn">
            <ha-icon icon="${this._icon}"></ha-icon>
          </div>
          ${this._config.show_name ? `
          <div class="info">
            <div class="name" id="name-btn">${this._name}</div>
            <div class="sub">${unavail ? 'Unavailable' : isOn ? 'On' : 'Off'}</div>
          </div>` : '<div class="info"></div>'}
          <button class="toggle${isOn ? ' on' : ''}" id="toggle" aria-label="Toggle ${this._name}"></button>
        </div>
      </div>`;
    this.shadowRoot.getElementById('toggle').onclick = (e) => { e.stopPropagation(); this._svc(this._domain, 'toggle'); };
    this.shadowRoot.getElementById('icon-btn').onclick = () => this._moreInfo();
    this.shadowRoot.getElementById('name-btn')?.addEventListener('click', () => this._moreInfo());
  }
}

if (!customElements.get('kw-control-card')) {
  customElements.define('kw-control-card', KWControlCard);
  console.info('%c KW-CONTROL-CARD %c v' + KW_CARD_VERSION + ' ', 'color:#fff;background:#4a6fa5;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px', 'color:#4a6fa5;background:rgba(74,111,165,.15);font-weight:700;padding:2px 6px;border-radius:0 4px 4px 0');
}

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'kw-control-card')) {
  window.customCards.push({ type: 'kw-control-card', name: 'KW Control Card', description: 'Uniform control card for lights, fans, media players, and cameras. Designed for Frosted Glass Dark.', preview: false });
}
