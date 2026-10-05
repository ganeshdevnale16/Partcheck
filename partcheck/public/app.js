/* PartCheck AI – mobile-first front end (no framework, no build step) */
(() => {
  'use strict';

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const splitLines = (s) => String(s || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmtDate = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'inspection';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  const MAX_SIDE = 1024;   // photo size sent to the AI (keeps under Vercel's 4.5 MB limit)
  const JPEG_Q = 0.72;
  const THUMB_SIDE = 480;  // photo size kept in history

  // ---------- icons ----------
  const ICONS = {
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H7l1.6-2.2h6.8L17 6h1.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-5-5L5 21"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="m8.5 12.2 2.5 2.5 4.5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.4 13.3 7.2 4.4M15.6 6.3l-7.2 4.4"/>',
    save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
    sparkles: '<path d="M11 3l1.7 4.6L17.3 9.3l-4.6 1.7L11 15.6l-1.7-4.6L4.7 9.3l4.6-1.7z"/><path d="M18.5 14.5l.8 2.1 2.2.9-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.9z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A16.5 16.5 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
    file: '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    question: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3M12 17.5v.1"/>',
    alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.1"/>',
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  function hydrateIcons(root = document) { $$('i[data-icon]', root).forEach((el) => { el.outerHTML = icon(el.dataset.icon); }); }

  // ---------- sample items ----------
  const DEFAULT_TEMPLATES = [
    {
      id: 'tpl-panel', name: 'Electrical control panel', description: 'Wall-mounted LT control panel',
      angles: [
        { name: 'Front (door closed)', guidance: 'Whole front face in frame, door closed', parts: ['Door handle / lock', 'Indicator lamps', 'Emergency stop button', 'Danger warning sticker'] },
        { name: 'Inside (door open)', guidance: 'Open the door, capture all components', parts: ['MCBs / breakers', 'Contactor', 'Terminal block', 'Earthing wire', 'Wire ferrules / labels'] },
        { name: 'Left side', guidance: 'Full left side panel', parts: ['Ventilation louvers', 'Cable gland'] },
        { name: 'Right side', guidance: 'Full right side panel', parts: ['Ventilation louvers'] },
      ],
      general_parts: ['Nameplate / serial label'],
    },
    {
      id: 'tpl-laptop', name: 'Laptop (handover check)', description: 'Company laptop returned by employee',
      angles: [
        { name: 'Lid closed', guidance: 'Top of the closed lid, whole laptop visible', parts: ['Brand logo'] },
        { name: 'Open: screen and keyboard', guidance: 'Lid open, screen and keyboard fully visible', parts: ['Screen (no cracks)', 'Keyboard with all keys', 'Touchpad', 'Webcam'] },
        { name: 'Left side', guidance: 'Close-up of all left-side ports', parts: ['Charging port', 'USB port'] },
        { name: 'Right side', guidance: 'Close-up of all right-side ports', parts: ['USB port', 'Audio jack'] },
        { name: 'Bottom', guidance: 'Flip the laptop, whole base visible', parts: ['Rubber feet', 'Base screws'] },
      ],
      general_parts: ['Serial number / service tag label', 'Charger adapter'],
    },
    {
      id: 'tpl-pump', name: 'Water pump with motor', description: 'Monoblock pump set',
      angles: [
        { name: 'Front', guidance: 'Pump casing and inlet facing the camera', parts: ['Pump casing', 'Suction inlet', 'Nameplate'] },
        { name: 'Top', guidance: 'From above, outlet and priming plug visible', parts: ['Delivery outlet', 'Priming plug'] },
        { name: 'Motor side', guidance: 'Full motor body side view', parts: ['Motor body', 'Fan cover', 'Terminal box'] },
        { name: 'Base', guidance: 'Mounting base and bolts', parts: ['Mounting base', 'Foundation bolts'] },
      ],
      general_parts: [],
    },
  ];

  // ---------- state ----------
  const state = {
    templates: LS.get('pc_templates', null) || clone(DEFAULT_TEMPLATES),
    tplId: LS.get('pc_tpl', null),
    editingId: null,
    server: {},
    view: null,
    backTo: null,
    cur: null,
    angleIdx: 0,
    stream: null,
    liveTimer: null,
    spinTimer: null,
    resultTab: 'checklist',
    histFilter: 'ALL',
    installEvt: null,
  };
  if (!LS.get('pc_templates', null)) LS.set('pc_templates', state.templates);

  // ---------- toast / loading ----------
  let toastTimer;
  function toast(msg, isErr = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('err', isErr);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), isErr ? 5000 : 2600);
  }
  function loading(on, text = 'Working…') {
    $('#loading').hidden = !on;
    $('#loadingText').textContent = text;
  }

  // ---------- bottom sheet ----------
  function openSheet(html, bind) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false;
    $('#sheetBackdrop').hidden = false;
    requestAnimationFrame(() => { $('#sheet').classList.add('open'); $('#sheetBackdrop').classList.add('open'); });
    if (bind) bind($('#sheetBody'));
  }
  function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#sheetBackdrop').classList.remove('open');
    setTimeout(() => { $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true; }, 220);
  }
  $('#sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  const sheetItem = (act, ic, label, cls = '') => `<button type="button" class="sheet-item ${cls}" data-act="${act}">${icon(ic)}<span>${label}</span></button>`;

  // ---------- navigation ----------
  const SCREENS = {
    home: { title: 'New inspection', tab: 'home', action: 'logout' },
    editor: { title: 'Item', back: 'home' },
    result: { title: 'Result', back: 'home', actionbar: true },
    history: { title: 'History', tab: 'history', action: 'more' },
  };

  function go(view, opts = {}) {
    state.view = view;
    closeSheetIfOpen();
    if (view === 'capture') {
      $('#shell').hidden = true;
      $('#v-capture').hidden = false;
      document.body.classList.add('cam-open');
      document.body.classList.remove('has-tabbar', 'has-actionbar');
      return;
    }
    $('#v-capture').hidden = true;
    document.body.classList.remove('cam-open');
    stopCamera();
    if (view !== 'result') stopSpin();
    $('#shell').hidden = false;
    ['home', 'editor', 'result', 'history'].forEach((v) => { $(`#v-${v}`).hidden = v !== view; });
    const cfg = SCREENS[view];
    $('#barTitle').textContent = opts.title || cfg.title;
    state.backTo = 'back' in opts ? opts.back : cfg.back || null;
    $('#barBack').style.visibility = state.backTo ? 'visible' : 'hidden';
    setBarAction(cfg.action);
    $('#tabbar').hidden = !cfg.tab;
    document.body.classList.toggle('has-tabbar', Boolean(cfg.tab));
    document.body.classList.toggle('has-actionbar', Boolean(cfg.actionbar));
    $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === cfg.tab));
    window.scrollTo(0, 0);
  }
  function closeSheetIfOpen() { if (!$('#sheet').hidden) closeSheet(); }

  function setBarAction(kind) {
    const b = $('#barAction');
    b.dataset.kind = kind || '';
    b.style.visibility = kind ? 'visible' : 'hidden';
    b.innerHTML = kind ? icon(kind === 'logout' ? 'logout' : 'more') : '';
    b.setAttribute('aria-label', kind === 'logout' ? 'Log out' : 'More options');
  }

  $('#barBack').addEventListener('click', () => {
    if (state.view === 'result' && state.cur && !state.cur.saved && !state.cur.fromHistory) {
      openSheet(`<h3>Leave without saving?</h3><p>This result is not in History yet.</p>
        <div class="sheet-btns"><button type="button" class="btn primary big" data-act="save">${icon('save')}Save and leave</button>
        <button type="button" class="btn ghost big" data-act="leave">Leave without saving</button></div>`, (el) => {
        $('[data-act="save"]', el).addEventListener('click', async () => { closeSheet(); if (await saveToHistory(state.cur)) goBack(); });
        $('[data-act="leave"]', el).addEventListener('click', () => { closeSheet(); goBack(); });
      });
      return;
    }
    goBack();
  });
  function goBack() {
    const to = state.backTo || 'home';
    if (to === 'history') renderHistory();
    if (to === 'home') renderHome();
    go(to);
  }

  $('#barAction').addEventListener('click', () => {
    const k = $('#barAction').dataset.kind;
    if (k === 'logout') {
      openSheet(`<h3>Log out?</h3><p>You will need the password to open the app again.</p>
        <div class="sheet-btns"><button type="button" class="btn primary big" data-act="out">${icon('logout')}Log out</button>
        <button type="button" class="btn ghost big" data-act="cancel">Cancel</button></div>`, (el) => {
        $('[data-act="out"]', el).addEventListener('click', () => { closeSheet(); logout(); });
        $('[data-act="cancel"]', el).addEventListener('click', closeSheet);
      });
    } else if (k === 'more') {
      openSheet(`<h3>History</h3>
        ${sheetItem('export', 'download', 'Export all inspections (JSON)')}
        ${sheetItem('clear', 'trash', 'Delete all history', 'danger')}`, (el) => {
        $('[data-act="export"]', el).addEventListener('click', () => { closeSheet(); exportAll(); });
        $('[data-act="clear"]', el).addEventListener('click', () => {
          closeSheet();
          if (!confirm('Delete ALL saved inspections from this phone?')) return;
          LS.set('pc_history', []); renderHistory(); toast('History deleted');
        });
      });
    }
  });

  $$('#tabbar button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.tab === 'history') renderHistory(); else renderHome();
    go(b.dataset.tab);
  }));

  // ---------- lock / login ----------
  function showLock({ msg = '', config = false } = {}) {
    stopCamera();
    $('#shell').hidden = true;
    $('#v-capture').hidden = true;
    document.body.classList.remove('cam-open', 'has-tabbar', 'has-actionbar');
    $('#lock').hidden = false;
    $('#lockChecking').hidden = true;
    if (config) {
      $('#lockForm').hidden = true;
      $('#lockMsg').hidden = false;
      $('#lockMsg').innerHTML = `<p><b>The app password is not set on the server.</b></p>
        <ol><li>Vercel → your project → Settings → Environment Variables</li>
        <li>Add <b>APP_PASSWORD</b> with your password</li>
        <li>Deployments → ⋯ → <b>Redeploy</b>, then reopen this page</li></ol>`;
      return;
    }
    $('#lockMsg').hidden = true;
    $('#lockForm').hidden = false;
    $('#lockErr').textContent = msg;
    $('#lockPw').value = '';
    setTimeout(() => $('#lockPw').focus(), 50);
  }

  async function login(password) {
    let r;
    try {
      r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    } catch {
      return { ok: false, error: 'Cannot reach the server. Check your internet.' };
    }
    const data = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true };
    return { ok: false, code: data.code, error: data.error || `Login failed (${r.status}).` };
  }

  $('#lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#lockPw').value.trim();
    if (!pw) { $('#lockErr').textContent = 'Enter the password.'; return; }
    $('#lockBtn').disabled = true;
    $('#lockErr').textContent = '';
    const res = await login(pw);
    $('#lockBtn').disabled = false;
    if (res.ok) { LS.set('pc_pw', pw); enterApp(); return; }
    if (res.code === 'NO_PASSWORD') { showLock({ config: true }); return; }
    $('#lockErr').textContent = res.error;
    $('#lockPw').select();
  });

  $('#pwToggle').addEventListener('click', () => {
    const inp = $('#lockPw');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#pwToggle').innerHTML = icon(show ? 'eyeoff' : 'eye');
    $('#pwToggle').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  function logout() {
    LS.del('pc_pw');
    state.cur = null;
    showLock();
  }

  function enterApp() {
    $('#lock').hidden = true;
    const s = state.server;
    const banner = $('#setupBanner');
    if (s.missing?.length) {
      banner.hidden = false;
      banner.innerHTML = `<b>Setup incomplete:</b> add ${esc(s.missing.join(', '))} in Vercel environment variables, then Redeploy.`;
    } else banner.hidden = true;
    renderHome();
    go('home');
  }

  // ---------- API ----------
  async function api(path, body) {
    const headers = { 'Content-Type': 'application/json', 'x-app-password': LS.get('pc_pw', '') };
    let r;
    try {
      r = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error('Cannot reach the server. Check your internet connection.');
    }
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { LS.del('pc_pw'); showLock({ msg: 'Please enter the password again.' }); throw new Error('Password needed.'); }
    if (r.status === 503 && data.code === 'NO_PASSWORD') { showLock({ config: true }); throw new Error(data.error); }
    if (r.status === 413) throw new Error('Photos are too large to send. Remove extra views and try again.');
    if (r.status === 504) throw new Error('The AI took too long. Try again with fewer photos.');
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status}).`);
    return data;
  }

  // ---------- HOME ----------
  const getTpl = (id) => state.templates.find((t) => t.id === id);
  const saveTemplates = () => LS.set('pc_templates', state.templates);
  const partCount = (t) => t.angles.reduce((n, a) => n + a.parts.length, 0) + (t.general_parts?.length || 0);

  function renderHome() {
    if (!getTpl(state.tplId)) state.tplId = state.templates[0]?.id || null;
    const list = $('#itemList');
    if (!state.templates.length) {
      list.innerHTML = '<p class="hint">No items yet. Create your first item below.</p>';
    } else {
      list.innerHTML = state.templates.map((t) => {
        const sel = t.id === state.tplId;
        const detail = sel ? `<div class="item-detail">${t.angles.map((a, i) => `<div><span class="n">${i + 1}</span><span>${esc(a.name)}<span>${a.parts.length ? ': ' + esc(a.parts.join(', ')) : ': photo only'}</span></span></div>`).join('')}
          ${t.general_parts?.length ? `<div><span class="n">+</span><span>Any view<span>: ${esc(t.general_parts.join(', '))}</span></span></div>` : ''}</div>` : '';
        return `<div class="item ${sel ? 'sel' : ''}" role="radio" aria-checked="${sel}" tabindex="0" data-id="${esc(t.id)}">
          <span class="item-ic">${icon(sel ? 'check' : 'box')}</span>
          <span class="item-txt"><b>${esc(t.name)}</b><small>${plural(t.angles.length, 'view')}, ${plural(partCount(t), 'part')}</small></span>
          <button type="button" class="item-edit" data-edit="${esc(t.id)}" aria-label="Edit ${esc(t.name)}">${icon('edit')}</button>
          ${detail}
        </div>`;
      }).join('');
    }
    $$('.item', list).forEach((el) => {
      const pick = () => { state.tplId = el.dataset.id; LS.set('pc_tpl', state.tplId); renderHome(); };
      el.addEventListener('click', (e) => { if (!e.target.closest('[data-edit]')) pick(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    $$('[data-edit]', list).forEach((b) => b.addEventListener('click', () => openEditor(getTpl(b.dataset.edit))));
    $('#btnStart').disabled = !getTpl(state.tplId);
  }

  $('#btnNewItem').addEventListener('click', () => openEditor(null));
  $('#mInspector').value = LS.get('pc_inspector', '');

  $('#btnStart').addEventListener('click', () => {
    const tpl = getTpl(state.tplId);
    if (!tpl) { toast('Choose an item first.', true); return; }
    LS.set('pc_inspector', $('#mInspector').value.trim());
    state.cur = {
      id: uid(),
      createdAt: new Date().toISOString(),
      item: tpl.name,
      description: tpl.description || '',
      angles: clone(tpl.angles),
      general_parts: clone(tpl.general_parts || []),
      meta: {
        inspector: $('#mInspector').value.trim(),
        serial: $('#mSerial').value.trim(),
        location: $('#mLocation').value.trim(),
        notes: $('#mNotes').value.trim(),
        gps: null,
      },
      shots: {},
      result: null,
      render3d: null,
      override: { status: '', remarks: '' },
      saved: false,
    };
    state.angleIdx = 0;
    if ($('#mGps').checked) getGps();
    openCamera();
  });

  function getGps() {
    if (!navigator.geolocation) { toast('GPS is not available on this device.', true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { if (state.cur) state.cur.meta.gps = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }; },
      () => toast('Location permission denied. Photos will not have GPS.', true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ---------- EDITOR ----------
  function viewRow(a = { name: '', guidance: '', parts: [] }) {
    const div = document.createElement('div');
    div.className = 'ed-view';
    div.innerHTML = `
      <div class="ed-head">
        <span class="ed-num"></span>
        <input class="aname" placeholder="View name, e.g. Front" maxlength="60" value="${esc(a.name)}" aria-label="View name" />
        <button type="button" class="ed-del" aria-label="Remove view">${icon('trash')}</button>
      </div>
      <input class="guide" placeholder="How to frame the photo (optional)" maxlength="200" value="${esc(a.guidance || '')}" aria-label="Photo guidance" />
      <textarea class="aparts" rows="3" placeholder="Parts that must be visible, one per line" aria-label="Required parts">${esc((a.parts || []).join('\n'))}</textarea>`;
    $('.ed-del', div).addEventListener('click', () => { div.remove(); numberViews(); });
    return div;
  }
  function numberViews() { $$('#edAngles .ed-num').forEach((n, i) => { n.textContent = i + 1; }); }

  function fillViews(angles) {
    const box = $('#edAngles');
    box.innerHTML = '';
    angles.forEach((a) => box.appendChild(viewRow(a)));
    numberViews();
  }

  function openEditor(tpl) {
    state.editingId = tpl?.id || null;
    $('#edName').value = tpl?.name || '';
    $('#edDesc').value = tpl?.description || '';
    $('#edGeneral').value = (tpl?.general_parts || []).join('\n');
    fillViews(tpl?.angles?.length ? tpl.angles : ['Front', 'Back', 'Left side', 'Right side'].map((n) => ({ name: n, guidance: '', parts: [] })));
    $('#btnDeleteItem').hidden = !tpl;
    go('editor', { title: tpl ? 'Edit item' : 'New item' });
    if (!tpl) setTimeout(() => $('#edName').focus(), 100);
  }

  function readEditor() {
    const name = $('#edName').value.trim();
    const angles = $$('#edAngles .ed-view').map((row) => ({
      name: $('.aname', row).value.trim(),
      guidance: $('.guide', row).value.trim(),
      parts: splitLines($('.aparts', row).value),
    })).filter((a) => a.name);
    const names = angles.map((a) => a.name.toLowerCase());
    if (!name) throw new Error('Enter an item name.');
    if (!angles.length) throw new Error('Add at least one view.');
    if (new Set(names).size !== names.length) throw new Error('Each view needs a different name.');
    return { id: state.editingId || 'tpl-' + uid(), name, description: $('#edDesc').value.trim(), angles, general_parts: splitLines($('#edGeneral').value) };
  }

  $('#btnAddAngle').addEventListener('click', () => {
    const r = viewRow();
    $('#edAngles').appendChild(r);
    numberViews();
    $('.aname', r).focus();
  });

  $('#btnSaveItem').addEventListener('click', () => {
    try {
      const t = readEditor();
      const i = state.templates.findIndex((x) => x.id === t.id);
      if (i >= 0) state.templates[i] = t; else state.templates.push(t);
      saveTemplates();
      state.tplId = t.id;
      LS.set('pc_tpl', t.id);
      renderHome();
      go('home');
      toast('Item saved');
    } catch (e) { toast(e.message, true); }
  });

  $('#btnDeleteItem').addEventListener('click', () => {
    if (!state.editingId || !confirm('Delete this item and its checklist?')) return;
    state.templates = state.templates.filter((t) => t.id !== state.editingId);
    saveTemplates();
    renderHome();
    go('home');
    toast('Item deleted');
  });

  $('#btnSuggest').addEventListener('click', async () => {
    const item = $('#edName').value.trim();
    if (!item) { toast('Type the item name first.', true); $('#edName').focus(); return; }
    loading(true, 'AI is building a checklist…');
    try {
      const out = await api('/api/suggest', { item, description: $('#edDesc').value.trim() });
      fillViews(out.angles);
      $('#edGeneral').value = out.general_parts.join('\n');
      toast('Checklist ready. Check it, then save.');
    } catch (e) { toast(e.message, true); }
    finally { loading(false); }
  });

  // ---------- CAMERA ----------
  const video = $('#video');

  function openCamera() {
    go('capture');
    renderCapture();
    startCamera();
  }

  async function startCamera() {
    if (state.stream) { startLiveCheck(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { noCamera(); return; }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      if (state.view !== 'capture') { stopCamera(); return; }
      video.srcObject = state.stream;
      await video.play().catch(() => {});
      $('#btnShoot').disabled = false;
      startLiveCheck();
      renderCapture();
    } catch {
      noCamera();
      toast('Camera blocked. Allow camera access, or use Upload.', true);
    }
  }
  function noCamera() { $('#btnShoot').disabled = true; renderCapture(); }

  function stopCamera() {
    clearInterval(state.liveTimer);
    state.liveTimer = null;
    if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; }
    video.srcObject = null;
  }

  // brightness + sharpness check (like the "too dark / hold steady" hints in face KYC)
  const qCanvas = document.createElement('canvas');
  function analyze(src, sw, sh) {
    const w = 256, h = Math.max(1, Math.round((sh / sw) * 256));
    qCanvas.width = w; qCanvas.height = h;
    const ctx = qCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    let sum = 0;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) { g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += g[j]; }
    const brightness = sum / g.length;
    let n = 0, m = 0, m2 = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      n++; const delta = lap - m; m += delta / n; m2 += delta * (lap - m);
    }
    const sharpness = n > 1 ? m2 / (n - 1) : 0;
    const issues = [];
    if (brightness < 55) issues.push('Too dark');
    else if (brightness > 215) issues.push('Too bright');
    if (sharpness < 40) issues.push('Blurry');
    return { brightness: Math.round(brightness), sharpness: Math.round(sharpness), ok: !issues.length, issues };
  }

  function qualityPills(q) {
    if (!q) return '';
    const light = q.brightness < 55 ? ['bad', 'Too dark'] : q.brightness > 215 ? ['bad', 'Too bright'] : ['good', 'Light OK'];
    const sharp = q.sharpness < 40 ? ['bad', 'Hold steady'] : ['good', 'Sharp'];
    return [light, sharp].map(([c, t]) => `<span class="qpill ${c}">${icon(c === 'good' ? 'check' : 'alert')}${t}</span>`).join('');
  }

  function startLiveCheck() {
    clearInterval(state.liveTimer);
    state.liveTimer = setInterval(() => {
      if (state.view !== 'capture' || !state.cur || !video.videoWidth) return;
      const a = state.cur.angles[state.angleIdx];
      if (state.cur.shots[a?.name]) return;
      $('#qbar').innerHTML = qualityPills(analyze(video, video.videoWidth, video.videoHeight));
    }, 600);
  }

  function watermark(ctx, w, h, angleName) {
    const strip = Math.max(18, Math.round(h * 0.034));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, h - strip, w, strip);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(strip * 0.6)}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    const gps = state.cur.meta.gps ? `  |  ${state.cur.meta.gps.lat}, ${state.cur.meta.gps.lng}` : '';
    ctx.fillText(`${state.cur.item}  |  ${angleName}  |  ${new Date().toLocaleString()}${gps}`, Math.round(strip * 0.4), h - strip / 2, w - strip);
  }

  function processImage(src, sw, sh) {
    const a = state.cur.angles[state.angleIdx];
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.round(sw * scale), h = Math.round(sh * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, w, h);
    const quality = analyze(c, w, h);
    watermark(ctx, w, h, a.name);
    state.cur.shots[a.name] = { dataUrl: c.toDataURL('image/jpeg', JPEG_Q), quality, ts: new Date().toISOString() };
    state.cur.result = null;
    state.cur.saved = false;
    if (!quality.ok) toast(`${quality.issues.join(' and ')}. Retake for a better result.`, true);
    renderCapture();
  }

  $('#btnShoot').addEventListener('click', () => {
    if (!video.videoWidth) { toast('Camera is starting…'); return; }
    const f = $('#flash');
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 60);
    if (navigator.vibrate) navigator.vibrate(30);
    processImage(video, video.videoWidth, video.videoHeight);
  });

  $('#fileInput').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('Choose an image file.', true); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { processImage(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
    img.onerror = () => { toast('Could not read that image. Use JPG or PNG.', true); URL.revokeObjectURL(url); };
    img.src = url;
  });

  $('#btnRetake').addEventListener('click', () => {
    delete state.cur.shots[state.cur.angles[state.angleIdx].name];
    state.cur.result = null;
    renderCapture();
  });

  const nextMissing = () => {
    const A = state.cur.angles;
    const after = A.findIndex((a, i) => i > state.angleIdx && !state.cur.shots[a.name]);
    return after >= 0 ? after : A.findIndex((a) => !state.cur.shots[a.name]);
  };

  $('#btnUse').addEventListener('click', () => {
    const n = nextMissing();
    if (n < 0) { evaluate(); return; }
    state.angleIdx = n;
    renderCapture();
  });

  $('#btnEval').addEventListener('click', evaluate);

  $('#camClose').addEventListener('click', () => {
    const shots = Object.keys(state.cur?.shots || {}).length;
    if (shots && !state.cur.result && !confirm('Close the camera? Your photos will be lost.')) return;
    if (state.cur?.result) { renderResult(); go('result'); return; }
    renderHome();
    go('home');
  });

  $('#camAddView').addEventListener('click', () => {
    const name = prompt('Name for the extra view (e.g. "Close-up of damage"):');
    if (!name?.trim()) return;
    if (state.cur.angles.some((a) => a.name.toLowerCase() === name.trim().toLowerCase())) { toast('A view with that name already exists.', true); return; }
    state.cur.angles.push({ name: name.trim().slice(0, 60), guidance: 'Extra evidence photo', parts: [], extra: true });
    state.angleIdx = state.cur.angles.length - 1;
    renderCapture();
  });

  function renderCapture() {
    const cur = state.cur;
    if (!cur) return;
    const a = cur.angles[state.angleIdx];
    const shot = cur.shots[a.name];
    const total = cur.angles.length;
    const done = cur.angles.filter((x) => cur.shots[x.name]).length;

    $('#camView').textContent = a.name;
    $('#camCount').textContent = `View ${state.angleIdx + 1} of ${total}, ${done} done`;

    $('#camChips').innerHTML = cur.angles.map((x, i) => {
      const s = cur.shots[x.name];
      const mark = s ? icon(s.quality.ok ? 'check' : 'alert') : '<span class="dot"></span>';
      return `<button type="button" role="tab" class="cam-chip ${i === state.angleIdx ? 'cur' : ''}" data-i="${i}" aria-selected="${i === state.angleIdx}">${mark}${esc(x.name)}</button>`;
    }).join('');
    $$('#camChips .cam-chip').forEach((b) => b.addEventListener('click', () => { state.angleIdx = +b.dataset.i; renderCapture(); }));
    $('#camChips .cam-chip.cur')?.scrollIntoView({ inline: 'center', block: 'nearest' });

    const guide = a.guidance ? `<div class="g">${esc(a.guidance)}</div>` : '';
    $('#camParts').innerHTML = guide + (a.parts.length
      ? a.parts.map((p) => `<span class="cp">${esc(p)}</span>`).join('')
      : '<div class="g">Extra photo. No required parts.</div>');

    $('#preview').hidden = !shot;
    if (shot) $('#preview').src = shot.dataUrl;
    $('#camFrame').classList.toggle('off', Boolean(shot));
    $('#nocam').hidden = Boolean(shot) || Boolean(state.stream);
    $('#ctlLive').hidden = Boolean(shot);
    $('#ctlReview').hidden = !shot;
    $('#qbar').innerHTML = shot ? qualityPills(shot.quality) : '';

    const allDone = done === total;
    $('#useLabel').textContent = allDone ? 'Evaluate photos' : 'Next view';
    $('#btnEval').disabled = done === 0;
    $('#evalLabel').textContent = `Evaluate ${done}/${total}`;
    $('#evalRing').classList.toggle('ready', allDone);
  }

  // ---------- EVALUATE ----------
  async function evaluate() {
    const cur = state.cur;
    const missingViews = cur.angles.filter((a) => !cur.shots[a.name] && a.parts.length);
    if (missingViews.length && !confirm(`${plural(missingViews.length, 'view')} not photographed: ${missingViews.map((a) => a.name).join(', ')}.\nTheir parts will count as missing. Evaluate anyway?`)) return;

    const payload = {
      item: cur.item,
      description: cur.description,
      general_parts: cur.general_parts,
      angles: cur.angles.map((a) => ({ name: a.name, guidance: a.guidance || '', parts: a.parts, image: cur.shots[a.name]?.dataUrl || null })),
    };
    const sizeMb = JSON.stringify(payload).length / 1048576;
    if (sizeMb > 4.2 && !confirm(`Upload is ${sizeMb.toFixed(1)} MB and may be too large. Continue?`)) return;

    loading(true, 'AI is inspecting your photos…');
    try {
      cur.result = await api('/api/evaluate', payload);
      cur.override = { status: '', remarks: '' };
      cur.render3d = null;
      cur.saved = false;
      state.resultTab = 'checklist';
      renderResult();
      go('result');
      if (navigator.vibrate) navigator.vibrate(cur.result.status === 'PASS' ? 40 : [60, 60, 60]);
    } catch (e) {
      toast(e.message, true);
    } finally {
      loading(false);
    }
  }

  // ---------- RESULT ----------
  const STATUS_TEXT = { present: 'Present', missing: 'Missing', unclear: 'Not sure' };
  const STATUS_ICON = { present: 'check', missing: 'x', unclear: 'question' };
  const ORDER = { missing: 0, unclear: 1, present: 2 };
  const finalStatus = (rec) => rec.override?.status || rec.result.status;

  function partRow(c) {
    const where = c.group === 'Any view' && c.foundIn ? `, seen in ${c.foundIn}` : '';
    const note = c.note ? `. ${c.note}` : '';
    return `<li>
      <span class="ic ${c.status}">${icon(STATUS_ICON[c.status])}</span>
      <span><span class="pn">${esc(c.part)}</span><span class="pnote">${esc(STATUS_TEXT[c.status] + where + note)}</span></span>
      <span class="pc">${Math.round((c.confidence || 0) * 100)}%</span>
    </li>`;
  }

  function renderResult() {
    const rec = state.cur;
    const r = rec.result;
    const ai = r.ai || {};
    const st = finalStatus(rec);
    const shotAngles = rec.angles.filter((a) => rec.shots[a.name]);
    const findAi = (name, i) => (ai.angles || []).find((x) => norm(x.angle) === norm(name)) || null;

    // checklist tab
    const groups = [...rec.angles.map((a) => a.name), 'Any view'];
    const groupHtml = groups.map((g) => {
      const rows = r.checklist.filter((c) => c.group === g).sort((x, y) => ORDER[x.status] - ORDER[y.status]);
      if (!rows.length) return '';
      const ok = rows.filter((c) => c.status === 'present').length;
      return `<div class="box"><div class="group-head"><h3>${esc(g)}</h3><span>${ok}/${rows.length}</span></div><ul class="plist">${rows.map(partRow).join('')}</ul></div>`;
    }).join('');
    const defects = ai.defects || [];
    const metaLine = [rec.meta.location, rec.meta.gps && `GPS ${rec.meta.gps.lat}, ${rec.meta.gps.lng}`].filter(Boolean).join(', ');

    const tabChecklist = `
      <div class="box">
        <h3>Summary</h3>
        ${ai.item_matches === false ? `<div class="warn-box">The photos look like <b>${esc(ai.item_identified)}</b>, not ${esc(rec.item)}.</div>` : ''}
        <p>${esc(ai.summary || 'No summary.')}</p>
        ${metaLine ? `<p class="muted">${esc(metaLine)}</p>` : ''}
        ${rec.meta.notes ? `<p class="muted">Notes: ${esc(rec.meta.notes)}</p>` : ''}
      </div>
      ${groupHtml}
      ${defects.length ? `<div class="box"><h3>Damage and defects</h3>${defects.map((d) => `<div class="defect"><span class="sev ${esc(d.severity)}">${esc(d.severity)}</span><span>${esc(d.description)}</span><small>${esc(d.angle)}</small></div>`).join('')}</div>` : ''}
      ${ai.recommendations?.length ? `<div class="box"><h3>What to do next</h3><ul class="obs">${ai.recommendations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <p class="hint center">Checked by ${esc(r.provider === 'azure' ? 'Azure OpenAI' : r.provider)} (${esc(r.model)}). Parts under ${Math.round((r.minConfidence || 0) * 100)}% confidence count as not sure.</p>`;

    // photos tab
    const tabPhotos = rec.angles.map((a, i) => {
      const shot = rec.shots[a.name];
      const aa = findAi(a.name, i);
      const q = aa?.image_quality;
      return `<article class="photo">
        ${shot ? `<img src="${shot.dataUrl}" alt="${esc(a.name)} photo" data-zoom loading="lazy" />` : '<div class="noimg">Not photographed</div>'}
        <div class="photo-body">
          <div class="photo-head"><h3>${esc(a.name)}</h3>${q ? `<span class="badge ${esc(q)}">Photo ${esc(q)}</span>` : ''}</div>
          ${aa && aa.correct_view === false ? '<p class="warn-box">This photo does not show the requested view.</p>' : ''}
          ${aa?.quality_issues?.length ? `<p class="muted">${esc(aa.quality_issues.join('. '))}</p>` : ''}
          ${aa?.observations?.length ? `<ul class="obs">${aa.observations.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
        </div>
      </article>`;
    }).join('');

    // 3D tab
    const render = rec.render3d
      ? `<img src="${rec.render3d}" alt="AI 3D render of ${esc(rec.item)}" data-zoom />`
      : state.server.renderEnabled
        ? '<p>Create one 3D-style product image from your photos.</p>'
        : '<p>AI 3D render is off. Deploy gpt-image-1 in Azure and set AZURE_OPENAI_IMAGE_DEPLOYMENT to turn it on.</p>';
    const tab3d = `
      ${shotAngles.length ? `<div class="box">
        <h3>360° view</h3>
        <div class="spin" id="spin"><img id="spinImg" alt="Rotating view of the item" /><span class="spin-label" id="spinLabel"></span></div>
        <div class="spin-ctrl">
          <button type="button" class="btn ghost" id="spinPrev" aria-label="Previous view">${icon('left')}</button>
          <button type="button" class="btn ghost" id="spinPlay">${icon('play')}Auto-rotate</button>
          <button type="button" class="btn ghost" id="spinNext" aria-label="Next view">${icon('right')}</button>
        </div>
        <p class="hint center">Swipe the photo sideways to turn the item.</p>
      </div>` : ''}
      <div class="box">
        <h3>AI 3D render</h3>
        <div class="render-box">${render}</div>
        <div class="sheet-btns">
          <button type="button" class="btn primary big" id="btnRender" ${state.server.renderEnabled && shotAngles.length ? '' : 'disabled'}>${icon('sparkles')}${rec.render3d ? 'Generate again' : 'Generate 3D render'}</button>
          ${rec.render3d ? `<a class="btn ghost big" download="${esc(slug(rec.item))}-3d.png" href="${rec.render3d}">${icon('download')}Download image</a>` : ''}
        </div>
      </div>`;

    const metaTop = [rec.meta.serial && `#${rec.meta.serial}`, rec.meta.inspector].filter(Boolean).join(', ');
    $('#v-result').innerHTML = `
      <div class="tag">
        <div class="tag-item">${esc(rec.item)}</div>
        ${metaTop ? `<div class="tag-meta">${esc(metaTop)}</div>` : ''}
        <div class="tag-meta">${esc(fmtDate(r.evaluatedAt || rec.createdAt))}</div>
        <span class="stamp ${st}">${st}</span>
        <div class="meter-label"><span>Checklist complete</span><span>${r.completion}%</span></div>
        <div class="meter" role="progressbar" aria-label="Checklist complete" aria-valuenow="${r.completion}" aria-valuemin="0" aria-valuemax="100"><div style="width:${r.completion}%"></div></div>
        <div class="counts">
          <div><b style="color:var(--pass)">${r.counts.present}</b><small>Present</small></div>
          <div><b style="color:var(--fail)">${r.counts.missing}</b><small>Missing</small></div>
          <div><b style="color:var(--review)">${r.counts.unclear}</b><small>Not sure</small></div>
        </div>
        <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>

      <div class="seg" role="tablist" aria-label="Result sections">
        <button type="button" role="tab" data-tab="checklist">Checklist</button>
        <button type="button" role="tab" data-tab="photos">Photos</button>
        <button type="button" role="tab" data-tab="3d">3D view</button>
      </div>
      <div class="tabpane" data-pane="checklist">${tabChecklist}</div>
      <div class="tabpane" data-pane="photos">${tabPhotos}</div>
      <div class="tabpane" data-pane="3d">${tab3d}</div>

      <div class="box">
        <h3>Inspector decision</h3>
        <div class="ov" role="radiogroup" aria-label="Final status">
          <button type="button" class="auto" data-ov="">AI: ${esc(r.status)}</button>
          <button type="button" class="PASS" data-ov="PASS">PASS</button>
          <button type="button" class="FAIL" data-ov="FAIL">FAIL</button>
          <button type="button" class="REVIEW" data-ov="REVIEW">REVIEW</button>
        </div>
        <label class="fld"><span>Remarks</span><textarea id="ovRemarks" rows="2" maxlength="500" placeholder="Reason for change, follow-up action">${esc(rec.override.remarks)}</textarea></label>
      </div>

      <div class="actionbar">
        <button type="button" class="btn primary" id="btnSave">${icon(rec.saved ? 'check' : 'save')}${rec.saved ? 'Saved' : 'Save'}</button>
        <button type="button" class="btn ghost" id="btnShare">${icon('share')}Share</button>
        <button type="button" class="btn ghost" id="btnMore">${icon('more')}More</button>
      </div>`;

    // tabs
    const setTab = (t) => {
      state.resultTab = t;
      $$('#v-result .seg button').forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      $$('#v-result .tabpane').forEach((p) => { p.hidden = p.dataset.pane !== t; });
      if (t !== '3d') stopSpin();
    };
    $$('#v-result .seg button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    setTab(state.resultTab);

    // override
    $$('#v-result [data-ov]').forEach((b) => {
      const on = b.dataset.ov === (rec.override.status || '');
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
      b.addEventListener('click', () => { rec.override.status = b.dataset.ov; rec.saved = false; renderResult(); });
    });
    $('#ovRemarks').addEventListener('input', (e) => { rec.override.remarks = e.target.value; rec.saved = false; });

    $('#btnSave').addEventListener('click', () => saveToHistory(rec));
    $('#btnShare').addEventListener('click', () => shareResult(rec));
    $('#btnMore').addEventListener('click', () => resultMenu(rec));
    $('#btnRender')?.addEventListener('click', () => generateRender(rec));
    $$('#v-result [data-zoom]').forEach((img) => img.addEventListener('click', () => zoom(img.src)));
    if (shotAngles.length) setupSpin(shotAngles.map((a) => ({ name: a.name, src: rec.shots[a.name].dataUrl })));
  }

  function resultMenu(rec) {
    const canRetake = !rec.fromHistory;
    openSheet(`<h3>More options</h3>
      ${sheetItem('pdf', 'file', 'Print or save as PDF')}
      ${sheetItem('csv', 'download', 'Download checklist (CSV)')}
      ${sheetItem('json', 'download', 'Download full data (JSON)')}
      ${canRetake ? sheetItem('retake', 'camera', 'Retake photos') : ''}
      ${sheetItem('new', 'plus', 'New inspection')}`, (el) => {
      const on = (a, fn) => $(`[data-act="${a}"]`, el)?.addEventListener('click', () => { closeSheet(); fn(); });
      on('pdf', () => setTimeout(() => window.print(), 250));
      on('csv', () => download(`${slug(rec.item)}-${rec.id}.csv`, buildCsv(rec), 'text/csv;charset=utf-8'));
      on('json', () => download(`${slug(rec.item)}-${rec.id}.json`, JSON.stringify(exportable(rec), null, 2), 'application/json'));
      on('retake', () => openCamera());
      on('new', () => { state.cur = null; $('#mSerial').value = ''; $('#mNotes').value = ''; renderHome(); go('home'); });
    });
  }

  function zoom(src) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<img src="${src}" alt="Enlarged photo" />`;
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }

  function setupSpin(frames) {
    let idx = 0;
    const img = $('#spinImg'), label = $('#spinLabel'), box = $('#spin');
    const draw = () => { img.src = frames[idx].src; label.textContent = `${frames[idx].name} (${idx + 1}/${frames.length})`; };
    const step = (d) => { idx = (idx + d + frames.length) % frames.length; draw(); };
    draw();
    $('#spinPrev').addEventListener('click', () => step(-1));
    $('#spinNext').addEventListener('click', () => step(1));
    $('#spinPlay').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (state.spinTimer) { stopSpin(); btn.innerHTML = `${icon('play')}Auto-rotate`; }
      else { state.spinTimer = setInterval(() => step(1), 900); btn.innerHTML = `${icon('pause')}Stop`; }
    });
    let startX = null;
    box.addEventListener('pointerdown', (e) => { startX = e.clientX; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) { step(dx > 0 ? -1 : 1); startX = e.clientX; }
    });
    const end = () => { startX = null; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
  }
  function stopSpin() { clearInterval(state.spinTimer); state.spinTimer = null; }

  async function generateRender(rec) {
    const images = rec.angles.filter((a) => rec.shots[a.name]).slice(0, 6).map((a) => rec.shots[a.name].dataUrl);
    loading(true, 'Creating 3D render… up to a minute');
    try {
      const out = await api('/api/render3d', { item: rec.item, images });
      rec.render3d = out.image;
      rec.saved = false;
      renderResult();
      toast('3D render ready');
    } catch (e) { toast(e.message, true); }
    finally { loading(false); }
  }

  // ---------- export / share ----------
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  function exportable(rec) {
    const { fromHistory, saved, ...rest } = rec;
    return { ...rest, finalStatus: finalStatus(rec) };
  }

  function buildCsv(rec) {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Item', 'Serial', 'Inspector', 'Date', 'Final status', 'AI status', 'Completion %', 'View', 'Part', 'Status', 'Confidence %', 'Note', 'Remarks'];
    const rows = rec.result.checklist.map((c) => [
      rec.item, rec.meta.serial, rec.meta.inspector, fmtDate(rec.result.evaluatedAt), finalStatus(rec), rec.result.status,
      rec.result.completion, c.group, c.part, c.status, Math.round(c.confidence * 100), c.note, rec.override?.remarks,
    ]);
    return '\uFEFF' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  }

  async function shareResult(rec) {
    const st = finalStatus(rec);
    const missing = rec.result.checklist.filter((c) => c.status === 'missing').map((c) => `- ${c.part} (${c.group})`);
    const text = [
      `${rec.item}${rec.meta.serial ? ' #' + rec.meta.serial : ''}: ${st}`,
      `Checklist ${rec.result.completion}% complete`,
      missing.length ? `Missing:\n${missing.join('\n')}` : '',
      rec.override?.remarks ? `Remarks: ${rec.override.remarks}` : '',
      `Inspected ${fmtDate(rec.result.evaluatedAt)}${rec.meta.inspector ? ' by ' + rec.meta.inspector : ''}`,
    ].filter(Boolean).join('\n');
    const file = new File([buildCsv(rec)], `${slug(rec.item)}-${rec.id}.csv`, { type: 'text/csv' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Inspection: ${rec.item}`, text, files: [file] });
      else if (navigator.share) await navigator.share({ title: `Inspection: ${rec.item}`, text });
      else { await navigator.clipboard.writeText(text); toast('Summary copied. Paste it in WhatsApp or email.'); }
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Could not share from this browser.', true);
    }
  }

  // ---------- HISTORY ----------
  function shrink(dataUrl, side = THUMB_SIDE, qual = 0.6) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qual));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async function saveToHistory(rec) {
    const small = { ...clone({ ...rec, shots: {}, render3d: null }), saved: true, fromHistory: false };
    for (const [name, s] of Object.entries(rec.shots)) small.shots[name] = { ...s, dataUrl: await shrink(s.dataUrl) };
    if (rec.render3d) small.render3d = await shrink(rec.render3d, 512, 0.7);

    const hist = LS.get('pc_history', []).filter((h) => h.id !== rec.id);
    hist.unshift(small);
    let ok = LS.set('pc_history', hist);
    let dropped = 0;
    while (!ok && hist.length > 1) { hist.pop(); dropped++; ok = LS.set('pc_history', hist); }
    if (!ok) { toast('Phone storage is full. Export and delete old history first.', true); return false; }
    rec.saved = true;
    if (state.view === 'result') renderResult();
    toast(dropped ? `Saved. ${plural(dropped, 'old inspection')} removed to make space.` : 'Saved to History');
    return true;
  }

  function renderHistory() {
    const hist = LS.get('pc_history', []);
    const statusOf = (h) => h.override?.status || h.result.status;
    const counts = { ALL: hist.length, PASS: 0, FAIL: 0, REVIEW: 0 };
    hist.forEach((h) => { counts[statusOf(h)]++; });
    $('#histFilters').innerHTML = ['ALL', 'PASS', 'FAIL', 'REVIEW'].map((f) =>
      `<button type="button" role="tab" class="filter ${state.histFilter === f ? 'on' : ''}" data-f="${f}" aria-selected="${state.histFilter === f}">${f === 'ALL' ? 'All' : f} (${counts[f]})</button>`).join('');
    $$('#histFilters .filter').forEach((b) => b.addEventListener('click', () => { state.histFilter = b.dataset.f; renderHistory(); }));

    const list = $('#historyList');
    const shown = hist.filter((h) => state.histFilter === 'ALL' || statusOf(h) === state.histFilter);
    if (!hist.length) {
      list.innerHTML = `<div class="empty">${icon('clock')}<h3>No inspections yet</h3><p>Finish an inspection and tap Save.</p>
        <button type="button" class="btn primary" id="emptyStart">${icon('camera')}Start an inspection</button></div>`;
      $('#emptyStart').addEventListener('click', () => { renderHome(); go('home'); });
      return;
    }
    if (!shown.length) { list.innerHTML = `<div class="empty"><p>No ${esc(state.histFilter)} inspections.</p></div>`; return; }
    list.innerHTML = shown.map((h) => {
      const first = Object.values(h.shots)[0];
      const st = statusOf(h);
      return `<button type="button" class="hcard" data-open="${esc(h.id)}">
        ${first?.dataUrl ? `<img src="${first.dataUrl}" alt="" loading="lazy" />` : '<span class="ph"></span>'}
        <span><b>${esc(h.item)}</b>
          <small>${h.meta.serial ? '#' + esc(h.meta.serial) + ', ' : ''}${h.result.completion}% complete</small>
          <small>${esc(fmtDate(h.result.evaluatedAt || h.createdAt))}</small></span>
        <span class="hstat ${st}">${st}</span>
      </button>`;
    }).join('');
    $$('[data-open]', list).forEach((b) => b.addEventListener('click', () => {
      const rec = LS.get('pc_history', []).find((h) => h.id === b.dataset.open);
      if (!rec) return;
      state.cur = { ...rec, fromHistory: true, saved: true };
      state.resultTab = 'checklist';
      renderResult();
      go('result', { back: 'history' });
    }));
  }

  function exportAll() {
    const hist = LS.get('pc_history', []);
    if (!hist.length) { toast('Nothing to export yet.'); return; }
    download(`partcheck-history-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(hist, null, 2), 'application/json');
  }

  // ---------- install as app ----------
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function maybeShowInstall() {
    if (isStandalone() || LS.get('pc_install_x', false)) return;
    if (state.installEvt) { $('#installCard').hidden = false; $('#btnInstall').hidden = false; $('#installHint').textContent = 'Opens full screen like a normal app.'; }
    else if (isIos) { $('#installCard').hidden = false; $('#btnInstall').hidden = true; $('#installHint').textContent = 'Tap Share, then "Add to Home Screen".'; }
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installEvt = e; maybeShowInstall(); });
  $('#btnInstall').addEventListener('click', async () => {
    if (!state.installEvt) return;
    state.installEvt.prompt();
    await state.installEvt.userChoice.catch(() => {});
    state.installEvt = null;
    $('#installCard').hidden = true;
  });
  $('#btnInstallX').addEventListener('click', () => { LS.set('pc_install_x', true); $('#installCard').hidden = true; });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

  window.addEventListener('beforeunload', (e) => {
    if (state.cur && Object.keys(state.cur.shots).length && !state.cur.saved) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- boot ----------
  async function boot() {
    hydrateIcons();
    $('#barBack').style.visibility = 'hidden';
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      state.server = await r.json();
    } catch {
      state.server = {};
    }
    maybeShowInstall();
    if (state.server.passwordConfigured === false) { showLock({ config: true }); return; }
    const saved = LS.get('pc_pw', '');
    if (saved) {
      const res = await login(saved);
      if (res.ok) { enterApp(); return; }
      if (res.code === 'NO_PASSWORD') { showLock({ config: true }); return; }
      LS.del('pc_pw');
      showLock({ msg: res.code === 'BAD_PASSWORD' ? 'Password changed. Enter the new password.' : res.error });
      return;
    }
    showLock();
  }

  boot();
})();
