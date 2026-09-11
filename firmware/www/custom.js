// Custom web UI for the roller blind.
// Embedded into the firmware via web_server: js_include (served at /0.js).
// ESPHome loads this as <script type=module>, so nothing leaks to the global
// scope — all handlers are wired through event delegation instead of inline
// onclick attributes.

// ── Head fixups ──────────────────────────────────────────────────
// The shell ESPHome generates has no viewport meta, so phones would render
// the page at desktop width. Inject the mobile meta tags ourselves.
for (const [name, content] of [
  ['viewport', 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover'],
  ['apple-mobile-web-app-capable', 'yes'],
  ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
]) {
  const m = document.createElement('meta');
  m.name = name;
  m.content = content;
  document.head.appendChild(m);
}
document.title = 'Blind';

// ── ESPHome entities ─────────────────────────────────────────────
// IMPORTANT: these are the entity *names* from roller-motor.yaml, NOT the
// YAML `id:` values. ESPHome routes REST URLs by name (or by the name-derived
// object_id, which is deprecated and removed in 2026.7.0) — the `id:` is only
// a C++ variable name and never reaches the network. Renaming an entity in the
// YAML breaks these; keep both sides in sync.
const NAME = {
  cover:    'Blind',
  swap:     'Swap Buttons',
  openTime: 'Open Duration',
  closeTime:'Close Duration',
  calOpen:  'Calibrate Open',
  calClose: 'Calibrate Closed',
  nudgeUp:  'Nudge Up',
  nudgeDn:  'Nudge Down',
  nudgeStep:'Nudge Step',
  durMax:   'Duration Range',
};

// SSE still reports the legacy `{domain}-{object_id}` id, and object_id is the
// name lowercased with every non-alphanumeric character turned into '_'.
const objectId = n => n.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
const COVER_ID  = 'cover-'  + objectId(NAME.cover);
const SWITCH_ID = 'switch-' + objectId(NAME.swap);
const NUM_OPEN  = 'number-' + objectId(NAME.openTime);
const NUM_CLOSE = 'number-' + objectId(NAME.closeTime);
const NUM_NUDGE = 'number-' + objectId(NAME.nudgeStep);
const NUM_DURMAX = 'number-' + objectId(NAME.durMax);

const path = (domain, name) => `/${domain}/${encodeURIComponent(name)}`;

// ── Markup ───────────────────────────────────────────────────────
const star = (l, t, s, dur, delay) =>
  `<div style="position:absolute;left:${l}px;top:${t}px;width:${s}px;height:${s}px;border-radius:50%;background:#fff;animation:twk ${dur}s ${delay}s infinite"></div>`;

const STARS = [
  [172, 336, 3, 3,   0  ], [236, 356, 2, 2.4, 0.5], [300, 330, 3, 3.6, 0.9],
  [200, 404, 2, 2.8, 0.2], [268, 430, 3, 3.2, 1.1], [320, 392, 2, 2.6, 0.7],
  [150, 452, 2, 3.4, 0.3], [228, 480, 3, 3,   1.3], [ 96, 470, 2, 2.5, 0.6],
  [300, 472, 2, 3.5, 1  ],
].map(a => star(...a)).join('');

document.body.innerHTML = `
<div id="app" class="theme-midnight">

  <div id="zone">
    <div class="mullion-v"></div>
    <div class="mullion-h"></div>

    <div id="sun">
      <div class="sun-glow"></div>
      <div class="sun-disk"></div>
    </div>

    <div id="night-sky">
      <div style="position:absolute;left:60px;top:340px;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 38% 34%, #f4f2ea 0%, #d9d6c6 70%, #c6c3b2 100%);box-shadow:0 0 32px rgba(214,221,240,.42)">
        <div style="position:absolute;left:14px;top:18px;width:11px;height:11px;border-radius:50%;background:rgba(150,148,134,.32)"></div>
        <div style="position:absolute;left:33px;top:30px;width:7px;height:7px;border-radius:50%;background:rgba(150,148,134,.28)"></div>
        <div style="position:absolute;left:24px;top:11px;width:5px;height:5px;border-radius:50%;background:rgba(150,148,134,.26)"></div>
      </div>
      ${STARS}
    </div>

    <div id="fabric">
      <div class="weave-h"></div>
      <div class="weave-v"></div>
      <div class="fab-shadow"></div>
    </div>

    <div id="handle"><div class="grip"></div></div>
  </div>

  <div id="header">
    <div>
      <div id="roomLabel">Blind</div>
      <div id="stateWord">connecting</div>
    </div>
    <div class="hdr-btns">
      <div id="onlineDot"></div>
      <button class="icon-btn" id="btnTheme">
        <svg width="17" height="17" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M12 3.8 a8.2 8.2 0 0 0 0 16.4 z" fill="currentColor"/>
        </svg>
      </button>
      <button class="icon-btn" id="btnLang">EN</button>
      <button class="icon-btn" id="btnSettings">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="8" x2="20" y2="8"/>
          <circle cx="15" cy="8" r="2.6" fill="var(--card)" stroke="currentColor" stroke-width="2"/>
          <line x1="4" y1="16" x2="20" y2="16"/>
          <circle cx="9" cy="16" r="2.6" fill="var(--card)" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  </div>

  <div id="posDisplay">
    <div class="pos-row">
      <span id="posNum">—</span>
      <span class="pos-unit">%</span>
    </div>
    <div id="posLabel">OPEN</div>
  </div>

  <div id="dock">
    <div class="presets">
      <button class="preset" data-pos="70"><span class="preset-name" data-i="morning">Morning</span><span class="preset-val">70</span></button>
      <button class="preset" data-pos="100"><span class="preset-name" data-i="day">Day</span><span class="preset-val">100</span></button>
      <button class="preset" data-pos="0"><span class="preset-name" data-i="night">Night</span><span class="preset-val">0</span></button>
      <button class="preset" data-pos="50"><span class="preset-name" data-i="half">Half</span><span class="preset-val">50</span></button>
    </div>

    <div class="slider-wrap">
      <div class="slider-labels">
        <span data-i="position">POSITION</span>
        <span id="sliderAccent">—%</span>
      </div>
      <input type="range" id="slider" min="0" max="100" value="0">
    </div>

    <div class="ctrl-btns">
      <button class="ctrl-btn ctrl-arrow" data-cmd="open">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 14 12 8 18 14"/></svg>
      </button>
      <button class="ctrl-btn ctrl-stop" data-cmd="stop">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><rect x="7" y="7" width="10" height="10" rx="2.6"/></svg>
      </button>
      <button class="ctrl-btn ctrl-arrow" data-cmd="close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 10 12 16 18 10"/></svg>
      </button>
    </div>
  </div>

  <div id="settings">
    <div class="stt-header">
      <span class="stt-title" data-i="settings">Settings</span>
      <button class="icon-btn" id="btnCloseSettings">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="stt-body">
      <div class="stt-row">
        <span class="stt-label" data-i="reverse">Reverse buttons</span>
        <div class="toggle" id="reverseToggle"></div>
      </div>
      <div class="stt-row">
        <span class="stt-label" data-i="openTime">Open time</span>
        <div class="stepper">
          <button class="step-btn" data-step="open" data-delta="-0.5">−</button>
          <span class="step-val" id="openTimeVal">— s</span>
          <button class="step-btn" data-step="open" data-delta="0.5">+</button>
        </div>
      </div>
      <div class="stt-row">
        <span class="stt-label" data-i="closeTime">Close time</span>
        <div class="stepper">
          <button class="step-btn" data-step="close" data-delta="-0.5">−</button>
          <span class="step-val" id="closeTimeVal">— s</span>
          <button class="step-btn" data-step="close" data-delta="0.5">+</button>
        </div>
      </div>
      <div class="stt-row">
        <span class="stt-label" data-i="durMax">Duration range</span>
        <div class="stepper">
          <button class="step-btn" data-step="durmax" data-delta="-5">−</button>
          <span class="step-val" id="durMaxVal">— s</span>
          <button class="step-btn" data-step="durmax" data-delta="5">+</button>
        </div>
      </div>
      <div class="nudge-hint" data-i="durMaxHint">Upper limit of the two sliders above. Changing it restarts the blind.</div>
      <div class="stt-row">
        <span class="stt-label" data-i="nudgeStep">Nudge step</span>
        <div class="stepper">
          <button class="step-btn" data-step="nudge" data-delta="-0.1">−</button>
          <span class="step-val" id="nudgeStepVal">— s</span>
          <button class="step-btn" data-step="nudge" data-delta="0.1">+</button>
        </div>
      </div>
      <div class="cal-cap" data-i="nudgeCap">MANUAL NUDGE</div>
      <div class="nudge-hint" data-i="nudgeHint">Moves the blind even at the ends. Hold to keep going.</div>
      <div class="cal-grid">
        <button class="cal-btn" data-nudge="up">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"><polyline points="6 14 12 8 18 14"/></svg>
          <span data-i="nudgeUp">Nudge up</span>
        </button>
        <button class="cal-btn" data-nudge="down">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"><polyline points="6 10 12 16 18 10"/></svg>
          <span data-i="nudgeDn">Nudge down</span>
        </button>
      </div>

      <div class="cal-cap" data-i="calCap">EDGE CALIBRATION</div>
      <div class="cal-grid">
        <button class="cal-btn" data-cal="open">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"><polyline points="6 14 12 8 18 14"/></svg>
          <span data-i="calTop">CAL top</span>
        </button>
        <button class="cal-btn" data-cal="close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"><polyline points="6 10 12 16 18 10"/></svg>
          <span data-i="calBottom">CAL bottom</span>
        </button>
      </div>
    </div>
    <button class="done-btn" id="btnDone" data-i="done">Done</button>
  </div>

  <div id="toast"></div>
</div>`;

// ── i18n ─────────────────────────────────────────────────────────
const DICT = {
  en: {
    morning:'Morning', day:'Day', night:'Night', half:'Half',
    position:'POSITION', settings:'Settings',
    reverse:'Reverse buttons', openTime:'Open time', closeTime:'Close time', sec:'s',
    calCap:'EDGE CALIBRATION', calTop:'CAL top', calBottom:'CAL bottom', done:'Done',
    nudgeCap:'MANUAL NUDGE', nudgeUp:'Nudge up', nudgeDn:'Nudge down', nudgeStep:'Nudge step',
    nudgeHint:'Moves the blind even at the ends. Hold to keep going.',
    durMax:'Duration range', durMaxHint:'Upper limit of the two sliders above. Changing it restarts the blind.',
    openCap:'OPEN', topSaved:'Top position saved', bottomSaved:'Bottom position saved', netError:'No response from device',
    st:{ opening:'opening', closing:'closing', adjusting:'adjusting', open:'open', closed:'closed', stopped:'stopped', connecting:'connecting' }
  },
  uk: {
    morning:'Ранок', day:'День', night:'Ніч', half:'Пів',
    position:'ПОЗИЦІЯ', settings:'Налаштування',
    reverse:'Реверс кнопок', openTime:'Час відкриття', closeTime:'Час закриття', sec:'с',
    calCap:'КАЛІБРУВАННЯ КРАЇВ', calTop:'CAL верх', calBottom:'CAL низ', done:'Готово',
    nudgeCap:'РУЧНЕ ПІДСУВАННЯ', nudgeUp:'Підняти', nudgeDn:'Опустити', nudgeStep:'Крок підсування',
    nudgeHint:'Рухає штору навіть у крайніх положеннях. Утримуй, щоб їхати далі.',
    durMax:'Діапазон часу', durMaxHint:'Верхня межа двох полів вище. Зміна перезавантажить штору.',
    openCap:'ВІДКРИТО', topSaved:'Верхню позицію збережено', bottomSaved:'Нижню позицію збережено', netError:'Пристрій не відповідає',
    st:{ opening:'відкривається', closing:'закривається', adjusting:'регулювання', open:'відкрито', closed:'закрито', stopped:'зупинено', connecting:'підключення' }
  }
};

// ── State ─────────────────────────────────────────────────────────
let lang = 'en';
let themeIdx = 0;
const THEMES = ['midnight', 'warm'];
let pos = 50;
let coverState = 'stopped';
let isDragging = false;
let openT = null, closeT = null, nudgeT = null, durMaxT = null;

// ── DOM refs ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const app    = $('app');
const fabric = $('fabric');
const handle = $('handle');
const zone   = $('zone');
const slider = $('slider');

// ── Handle band ───────────────────────────────────────────────────
function band(height) {
  const zh = height || zone.getBoundingClientRect().height || 582;
  return { top: zh * 0.369, bot: zh * 0.921 };
}

function railTop(posVal) {
  const b = band();
  return b.top + (1 - posVal / 100) * (b.bot - b.top);
}

// ── i18n helpers ─────────────────────────────────────────────────
const d = () => DICT[lang];

function applyLang() {
  document.querySelectorAll('[data-i]').forEach(el => {
    const v = d()[el.dataset.i];
    if (v) el.textContent = v;
  });
  $('posLabel').textContent = d().openCap;
  refreshTimeLabels();
  refreshStateWord();
}

function refreshStateWord() {
  const pct = Math.round(pos);
  const st = d().st;
  let word;
  if (coverState === 'opening')      word = st.opening;
  else if (coverState === 'closing') word = st.closing;
  else if (isDragging)               word = st.adjusting;
  else if (pct >= 99)                word = st.open;
  else if (pct <= 1)                 word = st.closed;
  else                               word = st.stopped;
  $('stateWord').textContent = word;
}

function refreshTimeLabels() {
  if (openT  !== null) $('openTimeVal').textContent  = openT.toFixed(1)  + ' ' + d().sec;
  if (closeT !== null) $('closeTimeVal').textContent = closeT.toFixed(1) + ' ' + d().sec;
  if (nudgeT !== null) $('nudgeStepVal').textContent = nudgeT.toFixed(1) + ' ' + d().sec;
  if (durMaxT !== null) $('durMaxVal').textContent = durMaxT.toFixed(0) + ' ' + d().sec;
}

// ── Visual update ─────────────────────────────────────────────────
function updateVisual(newPos) {
  pos = Math.max(0, Math.min(100, newPos));
  const pct = Math.round(pos);
  const rt  = railTop(pos);

  fabric.style.height = (rt + 16) + 'px';
  handle.style.top    = rt + 'px';

  $('posNum').textContent = pct;
  $('sliderAccent').textContent = pct + '%';
  if (!isDragging) slider.value = pct;
  refreshStateWord();
}

// ── API ───────────────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  try {
    const opts = { method };
    if (body) { opts.headers = {'Content-Type':'application/x-www-form-urlencoded'}; opts.body = body; }
    const r = await fetch(url, opts);
    if (!r.ok) {
      // A 404 here means the URL does not match any entity name — almost always
      // a mismatch between NAME above and the yaml. Never fail silently again.
      showToast(`${method} ${decodeURIComponent(url)} → ${r.status}`);
      console.error('ESPHome request failed:', method, url, r.status);
      return null;
    }
    return r.json().catch(() => ({}));
  } catch (e) {
    showToast(d().netError);
    console.error('ESPHome request error:', method, url, e);
    return null;
  }
}

const coverPath = path('cover', NAME.cover);

const setCover = val => api(`${coverPath}/set`, 'POST', `position=${(val / 100).toFixed(3)}`);

async function sendCmd(cmd) {
  await api(`${coverPath}/${cmd}`, 'POST');
}

async function setPos(val) {
  updateVisual(val);
  await setCover(val);
}

async function toggleReverse() {
  const on = $('reverseToggle').classList.contains('on');
  await api(`${path('switch', NAME.swap)}/${on ? 'turn_off' : 'turn_on'}`, 'POST');
}

async function calPosition(which) {
  const name = which === 'open' ? NAME.calOpen : NAME.calClose;
  await api(`${path('button', name)}/press`, 'POST');
  showToast(which === 'open' ? d().topSaved : d().bottomSaved);
}

// Limits are not hardcoded here: ESPHome reports min/max/step for every number
// in its SSE entity-info message, so the UI adopts whatever the firmware was
// built with. Change duration_max in the yaml and this follows automatically.
// The values below are only a fallback for the moment before the first event
// arrives.
const STEPPERS = {
  open:  { get: () => openT,  set: v => openT  = v, el: 'openTimeVal',  name: () => NAME.openTime,  id: () => NUM_OPEN,  min: 1,   max: 45, fallback: 21  },
  close: { get: () => closeT, set: v => closeT = v, el: 'closeTimeVal', name: () => NAME.closeTime, id: () => NUM_CLOSE, min: 1,   max: 45, fallback: 20  },
  nudge: { get: () => nudgeT, set: v => nudgeT = v, el: 'nudgeStepVal', name: () => NAME.nudgeStep, id: () => NUM_NUDGE, min: 0.1, max: 5,  fallback: 0.5 },
  durmax:{ get: () => durMaxT,set: v => durMaxT= v, el: 'durMaxVal',    name: () => NAME.durMax,    id: () => NUM_DURMAX,min: 20,  max: 120,fallback: 45  },
};

// Adopt the real limits announced by the device.
function applyNumberLimits(data) {
  const c = Object.values(STEPPERS).find(x => x.id() === data.id);
  if (!c) return;
  const min = parseFloat(data.min_value), max = parseFloat(data.max_value);
  if (Number.isFinite(min)) c.min = min;
  if (Number.isFinite(max)) c.max = max;
}

async function stepTime(which, delta) {
  const c = STEPPERS[which];
  if (!c) return;
  const cur  = c.get();
  const next = cur !== null ? Math.max(c.min, Math.min(c.max, +(cur + delta).toFixed(1))) : c.fallback;

  c.set(next);
  $(c.el).textContent = next.toFixed(which === 'durmax' ? 0 : 1) + ' ' + d().sec;

  await api(`${path('number', c.name())}/set`, 'POST', `value=${next}`);
}

// ── Manual nudge ──────────────────────────────────────────────────
// Each press fires the firmware's nudge script, which runs the motor for one
// step. That script uses mode:restart, so repeating faster than the step keeps
// the motor turning continuously — holding the button gives smooth travel that
// stops one step after release.
const NUDGE_REPEAT_MS = 250;
let nudgeTimer = null;

function nudgePress(dir) {
  api(`${path('button', dir === 'up' ? NAME.nudgeUp : NAME.nudgeDn)}/press`, 'POST');
}

function startNudge(dir) {
  stopNudge();
  nudgePress(dir);
  nudgeTimer = setInterval(() => nudgePress(dir), NUDGE_REPEAT_MS);
}

function stopNudge() {
  if (nudgeTimer !== null) { clearInterval(nudgeTimer); nudgeTimer = null; }
}

// ── SSE ───────────────────────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/events');
  es.addEventListener('state', e => {
    try {
      const data = JSON.parse(e.data);
      setOnline(true);
      if (data.max_value !== undefined) applyNumberLimits(data);
      if (data.id === COVER_ID) {
        coverState = data.state || coverState;
        if (data.value != null && !isDragging) updateVisual(data.value * 100);
        else refreshStateWord();
      }
      if (data.id === SWITCH_ID) {
        $('reverseToggle').classList.toggle('on', !!data.value);
      }
      if (data.id === NUM_OPEN)  { openT  = parseFloat(data.value); $('openTimeVal').textContent  = openT.toFixed(1)  + ' ' + d().sec; }
      if (data.id === NUM_CLOSE) { closeT = parseFloat(data.value); $('closeTimeVal').textContent = closeT.toFixed(1) + ' ' + d().sec; }
      if (data.id === NUM_NUDGE) { nudgeT = parseFloat(data.value); $('nudgeStepVal').textContent = nudgeT.toFixed(1) + ' ' + d().sec; }
      if (data.id === NUM_DURMAX) { durMaxT = parseFloat(data.value); $('durMaxVal').textContent = durMaxT.toFixed(0) + ' ' + d().sec; }
    } catch {}
  });
  // ESPHome sends its config JSON as the payload of the first `ping` event —
  // this is the only place the device name is exposed (GET / returns the HTML
  // shell, not JSON).
  es.addEventListener('ping', e => {
    setOnline(true);
    if (!e.data) return;
    try {
      const title = JSON.parse(e.data).title;
      if (title && title !== $('roomLabel').textContent) {
        $('roomLabel').textContent = title;
        document.title = title;
      }
    } catch {}
  });
  es.onerror = () => { setOnline(false); es.close(); setTimeout(connectSSE, 3000); };
}

function setOnline(on) {
  const dot = $('onlineDot');
  dot.style.animationPlayState = on ? 'running' : 'paused';
  dot.style.background = on ? '' : 'var(--muted)';
}

// ── Drag handle ───────────────────────────────────────────────────
handle.addEventListener('pointerdown', e => {
  e.preventDefault();
  isDragging = true;
  handle.classList.add('dragging');
  window.addEventListener('pointermove',   onDragMove);
  window.addEventListener('pointerup',     onDragUp);
  // A cancelled pointer (browser gesture, lost focus) never fires pointerup —
  // without this the UI would stay stuck in "adjusting" forever.
  window.addEventListener('pointercancel', onDragUp);
  onDragMove(e);
});

function onDragMove(e) {
  const r = zone.getBoundingClientRect();
  const b = band(r.height);
  const y = Math.max(b.top, Math.min(b.bot, e.clientY - r.top));
  updateVisual((1 - (y - b.top) / (b.bot - b.top)) * 100);
}

async function onDragUp() {
  if (!isDragging) return;
  isDragging = false;
  handle.classList.remove('dragging');
  window.removeEventListener('pointermove',   onDragMove);
  window.removeEventListener('pointerup',     onDragUp);
  window.removeEventListener('pointercancel', onDragUp);
  // Re-run now that isDragging is false so the slider and state word catch up
  // immediately instead of waiting for the device to echo the new position.
  updateVisual(pos);
  await setCover(pos);
}

// Nudge buttons are press-and-hold, so they are wired directly rather than
// through the click delegation used by the rest of the UI.
app.querySelectorAll('[data-nudge]').forEach(btn => {
  btn.addEventListener('pointerdown', e => { e.preventDefault(); startNudge(btn.dataset.nudge); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, stopNudge));
});
// A pointerup anywhere must stop it — releasing outside the button still ends
// the gesture, and leaving the motor running would be dangerous.
window.addEventListener('pointerup', stopNudge);

// ── Slider ────────────────────────────────────────────────────────
slider.addEventListener('input',  e => updateVisual(Number(e.target.value)));
slider.addEventListener('change', e => setCover(Number(e.target.value)));

// ── Delegated click handlers ──────────────────────────────────────
app.addEventListener('click', e => {
  const t = e.target.closest('[data-pos],[data-cmd],[data-cal],[data-step],#reverseToggle,#btnDone');
  if (!t) return;
  if (t.dataset.pos  !== undefined) return void setPos(Number(t.dataset.pos));
  if (t.dataset.cmd  !== undefined) return void sendCmd(t.dataset.cmd);
  if (t.dataset.cal  !== undefined) return void calPosition(t.dataset.cal);
  if (t.dataset.step !== undefined) return void stepTime(t.dataset.step, Number(t.dataset.delta));
  if (t.id === 'reverseToggle')     return void toggleReverse();
  if (t.id === 'btnDone')           return void closeSettings();
});

// ── Theme cycling ─────────────────────────────────────────────────
$('btnTheme').onclick = () => {
  themeIdx = (themeIdx + 1) % THEMES.length;
  app.className = `theme-${THEMES[themeIdx]}`;
};

// ── Language toggle ───────────────────────────────────────────────
$('btnLang').onclick = () => {
  lang = lang === 'en' ? 'uk' : 'en';
  $('btnLang').textContent = lang === 'en' ? 'EN' : 'UA';
  applyLang();
};

// ── Settings ──────────────────────────────────────────────────────
const openSettings  = () => $('settings').classList.add('open');
const closeSettings = () => $('settings').classList.remove('open');
$('btnSettings').onclick      = openSettings;
$('btnCloseSettings').onclick = closeSettings;

// ── Toast ─────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Keep the fabric aligned when the viewport changes ─────────────
window.addEventListener('resize', () => updateVisual(pos));

// ── Init ──────────────────────────────────────────────────────────
// The device name arrives with the first SSE `ping`, so there is nothing to
// fetch up front — just draw and connect.
updateVisual(pos);
connectSSE();
