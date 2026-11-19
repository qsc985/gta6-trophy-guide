// Leonida Ledger — offline GTA 6 trophy tracker.
// Loads app/data/trophies.json (a file inside this app, never the network),
// keeps earned trophies in localStorage, and renders the checklist, the
// platinum roadmap and the missable watch-list from that one data file.
(function () {
  'use strict';

  var STORE_KEY = 'gta6-trophy-guide-01-progress-v1';
  var SPOILER_KEY = 'gta6-trophy-guide-01-spoiler-v1';

  var GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
  var KIND_LABELS = {
    story: 'Story', missable: 'Missable', collectibles: 'Collectibles',
    activities: 'Activities', online: 'Online', other: 'Other'
  };
  var STAGES = [
    { n: 1, title: 'Stage 1 — Play the story', note: 'Chapters 1–4 and the final mission. Do the Chapter 1 meditation before the chapter ends — it is the only missable step in the whole game. Keep a manual save at the start of every chapter.' },
    { n: 2, title: 'Stage 2 — Strangers & partners', note: 'Finish the stranger mission strands (Andy, Kenton, Billy, Randy, Tyrone and more) and the partner trophies that need Jason and Lucia together. Eight finished strands earn Strangers & Freaks.' },
    { n: 3, title: 'Stage 3 — Activities & challenges', note: 'Stunts, races, shooting ranges, drone races, fishing, bowling, robberies and the 50 challenges. Most of this feeds the 100% checklist, so it is the biggest chunk of the platinum.' },
    { n: 4, title: 'Stage 4 — Collectibles & exploration', note: 'Cards, WAiNK It spots, meditation spots, vehicles and exploring every corner of Leonida. Systematic, county by county, with the in-game progress counters as your checklist.' },
    { n: 5, title: 'Stage 5 — Money, cleanup & platinum', note: 'Launder the marked bills, buy the garages, finish the 100% completion checklist for A Long Road, and the platinum pops. Tie up the unconfirmed trophies last, once the guides have confirmed their methods.' }
  ];

  var trophies = [];
  var earned = new Set();
  var state = { view: 'list', grade: 'all', kind: 'all', query: '', unearnedOnly: false, spoiler: false };
  var openId = null;

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('trophyList'), missableEl = $('missableList'), roadmapEl = $('roadmapList');

  function loadStored() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(raw)) raw.forEach(function (id) { earned.add(Number(id)); });
    } catch (e) { earned = new Set(); }
    try { state.spoiler = localStorage.getItem(SPOILER_KEY) === 'on'; } catch (e) {}
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(earned).sort(function (a, b) { return a - b; })));
      localStorage.setItem(SPOILER_KEY, state.spoiler ? 'on' : 'off');
    } catch (e) {}
  }

  function isHidden(t) {
    return state.spoiler && t.kind === 'story' && !earned.has(t.id);
  }

  function matches(t) {
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.kind !== 'all') {
      if (state.kind === 'missable') { if (!t.missable) return false; }
      else if (t.kind !== state.kind) return false;
    }
    if (state.unearnedOnly && earned.has(t.id)) return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function badge(text, cls) {
    var s = document.createElement('span');
    s.className = 'badge ' + cls;
    s.textContent = text;
    return s;
  }

  function makeCard(t) {
    var li = document.createElement('li');
    li.className = 'trophy-card' + (earned.has(t.id) ? ' earned' : '');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('change', function () {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      persist();
      renderAll();
    });
    var mid = document.createElement('div');
    var name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
    var desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = isHidden(t) ? 'Spoiler mode is on — earn this trophy to reveal its name and description.' : t.description;
    var meta = document.createElement('div');
    meta.className = 'trophy-meta';
    meta.append(badge(GRADE_LABELS[t.grade] || t.grade, t.grade));
    meta.append(badge(KIND_LABELS[t.kind] || t.kind, 'kind'));
    if (t.missable) meta.append(badge('Missable', 'missable'));
    if (isHidden(t)) meta.append(badge('Hidden', 'hidden-name'));
    mid.append(name, desc, meta);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'guide-btn';
    btn.textContent = 'Guide';
    btn.addEventListener('click', function () { openDetail(t.id); });
    li.append(box, mid, btn);
    return li;
  }

  function renderList() {
    var shown = trophies.filter(matches);
    listEl.replaceChildren();
    shown.forEach(function (t) { listEl.append(makeCard(t)); });
    $('emptyNote').hidden = shown.length > 0;
    $('resultLine').textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
      (state.kind === 'online' ? ' — this list has no online trophies; all 55 are single-player.' : '') +
      (state.spoiler ? ' · Spoiler mode on: story names hidden until earned.' : '');
  }

  function renderMissables() {
    missableEl.replaceChildren();
    trophies.filter(function (t) { return t.missable; }).forEach(function (t) { missableEl.append(makeCard(t)); });
    $('missableBadge').textContent = String(trophies.filter(function (t) { return t.missable; }).length);
  }

  function renderRoadmap() {
    roadmapEl.replaceChildren();
    STAGES.forEach(function (stage) {
      var members = trophies.filter(function (t) { return t.roadmap === stage.n; });
      var done = members.filter(function (t) { return earned.has(t.id); }).length;
      var li = document.createElement('li');
      var h = document.createElement('h3');
      h.textContent = stage.title + ' ';
      var count = document.createElement('span');
      count.className = 'stage-count';
      count.textContent = '(' + done + '/' + members.length + ' earned)';
      h.append(count);
      var p = document.createElement('p');
      p.textContent = stage.note;
      var ul = document.createElement('ul');
      members.forEach(function (t) {
        var item = document.createElement('li');
        if (earned.has(t.id)) item.className = 'done';
        item.textContent = (earned.has(t.id) ? '✓ ' : '○ ') + (isHidden(t) ? 'Hidden story trophy' : t.name) +
          ' — ' + (GRADE_LABELS[t.grade] || t.grade) + (t.missable ? ' · MISSABLE' : '');
        ul.append(item);
      });
      li.append(h, p, ul);
      roadmapEl.append(li);
    });
  }

  function renderProgress() {
    var total = trophies.length || 55;
    var n = 0;
    trophies.forEach(function (t) { if (earned.has(t.id)) n++; });
    $('earnedCount').textContent = String(n);
    $('percentLabel').textContent = Math.round((n / total) * 100) + '%';
    $('progressFill').style.width = (total ? (n / total) * 100 : 0) + '%';
    var parts = ['platinum', 'gold', 'silver', 'bronze'].map(function (g) {
      var all = trophies.filter(function (t) { return t.grade === g; }).length;
      var got = trophies.filter(function (t) { return t.grade === g && earned.has(t.id); }).length;
      return GRADE_LABELS[g] + ' ' + got + '/' + all;
    });
    $('gradeCounts').textContent = parts.join(' · ');
  }

  function renderTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-view') === state.view);
    });
    $('view-list').hidden = state.view !== 'list';
    $('view-roadmap').hidden = state.view !== 'roadmap';
    $('view-missable').hidden = state.view !== 'missable';
  }

  function renderAll() {
    renderProgress();
    renderList();
    renderRoadmap();
    renderMissables();
    renderTabs();
    syncUrl();
  }

  function openDetail(id) {
    var t = null;
    trophies.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    openId = id;
    var body = $('detailBody');
    body.replaceChildren();
    var h = document.createElement('h2');
    h.textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
    var meta = document.createElement('div');
    meta.className = 'trophy-meta';
    meta.append(badge(GRADE_LABELS[t.grade] || t.grade, t.grade));
    meta.append(badge(KIND_LABELS[t.kind] || t.kind, 'kind'));
    if (t.missable) meta.append(badge('Missable — do not miss', 'missable'));
    var desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = isHidden(t) ? 'Spoiler mode is on — earn this trophy to reveal its official description.' : 'Official: ' + t.description;
    var guideTitle = document.createElement('h3');
    guideTitle.textContent = 'Guide';
    var guide = document.createElement('p');
    guide.textContent = t.guide;
    var srcTitle = document.createElement('h3');
    srcTitle.textContent = 'Sources';
    var srcList = document.createElement('ul');
    srcList.className = 'sources';
    (t.sources || []).forEach(function (s) {
      var item = document.createElement('li');
      item.textContent = s;
      srcList.append(item);
    });
    var earnRow = document.createElement('div');
    earnRow.className = 'earn-row';
    var label = document.createElement('label');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.addEventListener('change', function () {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      persist();
      renderAll();
      openDetail(t.id);
    });
    label.append(box, document.createTextNode(earned.has(t.id) ? 'Earned — ticked off' : 'Mark as earned'));
    earnRow.append(label);
    body.append(h, meta, desc, guideTitle, guide, srcTitle, srcList, earnRow);
    $('detailPanel').hidden = false;
    syncUrl();
  }

  function closeDetail() {
    openId = null;
    $('detailPanel').hidden = true;
    syncUrl();
  }

  function syncUrl() {
    try {
      var params = new URLSearchParams();
      if (state.view !== 'list') params.set('view', state.view);
      if (state.grade !== 'all') params.set('grade', state.grade);
      if (state.kind !== 'all') params.set('kind', state.kind);
      if (state.spoiler) params.set('spoiler', 'on');
      if (openId) params.set('trophy', String(openId));
      var qs = params.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    } catch (e) {}
  }

  function applyUrlParams() {
    var params = new URLSearchParams(location.search);
    var view = params.get('view');
    if (view === 'roadmap' || view === 'missable' || view === 'list') state.view = view;
    var grade = params.get('grade');
    if (grade && GRADE_LABELS[grade]) state.grade = grade;
    var kind = params.get('kind');
    if (kind && (KIND_LABELS[kind] || kind === 'missable')) state.kind = kind;
    if (params.get('spoiler') === 'on') state.spoiler = true;
    var trophy = params.get('trophy');
    if (trophy) openId = Number(trophy) || null;
  }

  function setChip(container, attr, value) {
    container.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.getAttribute(attr) === value);
    });
  }

  function bindControls() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.view = tab.getAttribute('data-view');
        renderAll();
      });
    });
    $('gradeFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-grade]');
      if (!chip) return;
      state.grade = chip.getAttribute('data-grade');
      setChip($('gradeFilters'), 'data-grade', state.grade);
      renderAll();
    });
    $('kindFilters').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-kind]');
      if (!chip) return;
      state.kind = chip.getAttribute('data-kind');
      setChip($('kindFilters'), 'data-kind', state.kind);
      renderAll();
    });
    $('searchInput').addEventListener('input', function (e) {
      state.query = e.target.value.trim().toLowerCase();
      renderList();
    });
    $('unearnedOnly').addEventListener('change', function (e) {
      state.unearnedOnly = e.target.checked;
      renderAll();
    });
    $('spoilerToggle').addEventListener('change', function (e) {
      state.spoiler = e.target.checked;
      persist();
      renderAll();
      if (openId) openDetail(openId);
    });
    $('detailClose').addEventListener('click', closeDetail);
    $('exportBtn').addEventListener('click', function () {
      var payload = {
        app: 'gta6-trophy-guide-01', exportedAt: new Date().toISOString(),
        earned: Array.from(earned).sort(function (a, b) { return a - b; })
      };
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      link.download = 'gta6-trophy-progress.json';
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    });
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          var ids = Array.isArray(data) ? data : data.earned;
          if (!Array.isArray(ids)) throw new Error('bad file');
          var next = new Set();
          ids.forEach(function (id) {
            var n = Number(id);
            if (trophies.some(function (t) { return t.id === n; })) next.add(n);
          });
          earned = next;
          persist();
          renderAll();
        } catch (err) {
          alert('That file could not be imported as trophy progress.');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
    $('resetBtn').addEventListener('click', function () {
      if (!confirm('Clear all earned trophies?')) return;
      earned = new Set();
      persist();
      renderAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDetail();
    });
  }

  function boot() {
    loadStored();
    applyUrlParams();
    bindControls();
    $('spoilerToggle').checked = state.spoiler;
    setChip($('gradeFilters'), 'data-grade', state.grade);
    setChip($('kindFilters'), 'data-kind', state.kind);
    fetch('data/trophies.json')
      .then(function (r) { return r.json(); })
      .then(function (doc) {
        trophies = doc.trophies || doc;
        renderAll();
        if (openId) openDetail(openId);
      })
      .catch(function () {
        $('resultLine').textContent = 'Could not load data/trophies.json. Open this app from its own files (for example, node serve.ts) so the data file loads.';
      });
  }

  boot();
})();
