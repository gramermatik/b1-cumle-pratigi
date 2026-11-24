// ---------- Veri ----------
const SENTENCES = (window.S || []).map((line, i) => {
  const p = line.split('|').map(x => x.trim()).filter(Boolean);
  return { id: i, tr: p[0], en: p.slice(1) };
});
const WORDLIST = (window.W || []).map((line, i) => {
  const p = line.split('|').map(x => x.trim());
  return { id: i, en: p[0], pos: p[1], tr: p[2] };
});
const ROUND = 10;
const NAMES = { mc: 'Çoktan Seçmeli', write: 'Cümle Yaz', word: 'Kelime Testi' };

// ---------- Kayıt (tarayıcıda saklanır) ----------
const KEY = 'b1-pratik-v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}
let store = load() || { history: [], right: { mc: {}, write: {}, word: {} }, wrong: { mc: {}, write: {}, word: {} } };
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

// ---------- Yardımcılar ----------
const $ = id => document.getElementById(id);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
  if (id === 'home') renderHome();
  if (id === 'progress') renderProgress();
  window.scrollTo(0, 0);
}

// Cevap karşılaştırma: küçük harf, noktalama yok, kısaltmalar açılır
function norm(s) {
  s = ' ' + s.toLowerCase().replace(/[’‘`´]/g, "'") + ' ';
  const rep = [
    [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'],
    [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'m\b/g, ' am'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'],
    [/\b(he|she|it|that|there|what|where|who|how|here|this|everything|nobody|everyone|someone|nothing)'s\b/g, '$1 is'],
    [/\bcolour/g, 'color'], [/\bfavourite/g, 'favorite'], [/\bcentre/g, 'center'], [/\btheatre/g, 'theater'],
    [/\bneighbour/g, 'neighbor'], [/\bhonour/g, 'honor'], [/\btravell/g, 'travel'], [/\borganis/g, 'organiz'],
    [/\brealis/g, 'realiz'], [/\bapologis/g, 'apologiz'], [/\bok\b/g, 'okay'], [/\bmum\b/g, 'mom'],
  ];
  rep.forEach(([a, b]) => { s = s.replace(a, b); });
  return s.replace(/[^a-z0-9' ]/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// ---------- Test ----------
let state = {};
function pool(mode) { return mode === 'word' ? WORDLIST : SENTENCES; }

function startQuiz(mode) {
  const items = pool(mode);
  const wrongIds = Object.keys(store.wrong[mode]).map(Number);
  const fromWrong = pick(wrongIds, 3).map(id => items[id]).filter(Boolean);
  const unseen = items.filter(x => !store.right[mode][x.id] && !fromWrong.includes(x));
  const rest = pick(unseen.length >= ROUND ? unseen : items.filter(x => !fromWrong.includes(x)), ROUND - fromWrong.length);
  state = { mode, qs: shuffle(fromWrong.concat(rest)), i: 0, score: 0, answered: false };
  show('quiz');
  $('q-type').textContent = NAMES[mode];
  renderQ();
}

function renderQ() {
  const q = state.qs[state.i];
  state.answered = false;
  $('q-count').textContent = (state.i + 1) + ' / ' + state.qs.length;
  $('q-bar').style.width = (state.i / state.qs.length * 100) + '%';
  $('feedback').className = 'hidden';
  $('next-btn').classList.add('hidden');
  $('q-options').innerHTML = '';
  $('q-write').classList.add('hidden');

  if (state.mode === 'mc') {
    $('q-label').textContent = 'Bu cümlenin İngilizcesi hangisi?';
    $('q-text').textContent = q.tr;
    const len = q.en[0].length;
    const others = shuffle(SENTENCES.filter(s => s.id !== q.id)).sort((a, b) => Math.abs(a.en[0].length - len) - Math.abs(b.en[0].length - len)).slice(0, 12);
    const opts = shuffle([q.en[0]].concat(pick(others, 3).map(s => s.en[0])));
    renderOptions(opts, q.en[0]);
  } else if (state.mode === 'word') {
    const toTr = Math.random() < 0.6;
    const others = pick(WORDLIST.filter(w => w.id !== q.id && w.tr !== q.tr), 3);
    if (toTr) {
      $('q-label').textContent = 'Bu kelimenin Türkçe anlamı nedir?';
      $('q-text').innerHTML = esc(q.en) + ' <small class="muted">(' + esc(q.pos) + ')</small>';
      renderOptions(shuffle([q.tr].concat(others.map(w => w.tr))), q.tr);
    } else {
      $('q-label').textContent = 'Bu anlamın İngilizcesi hangisi?';
      $('q-text').textContent = q.tr;
      renderOptions(shuffle([q.en].concat(others.map(w => w.en))), q.en);
    }
  } else {
    $('q-label').textContent = 'Bu cümleyi İngilizceye çevir:';
    $('q-text').textContent = q.tr;
    $('q-write').classList.remove('hidden');
    $('check-btn').classList.remove('hidden');
    $('answer').value = '';
    $('answer').disabled = false;
    $('answer').focus();
  }
}

function renderOptions(opts, correct) {
  const box = $('q-options');
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.onclick = () => {
      if (state.answered) return;
      const ok = o === correct;
      [...box.children].forEach(c => { if (c.textContent === correct) c.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      finish(ok, ok ? 'Doğru! 🎉' : 'Yanlış. Doğrusu: <b>' + esc(correct) + '</b>');
    };
    box.appendChild(b);
  });
}

function checkWrite() {
  if (state.answered) return;
  const q = state.qs[state.i];
  const a = norm($('answer').value);
  if (!a) return;
  let ok = false, typo = false;
  for (const e of q.en) {
    const n = norm(e);
    if (n === a) { ok = true; break; }
    if (lev(n, a) <= Math.min(2, Math.floor(n.length / 15))) { ok = true; typo = true; }
  }
  const list = '<ul>' + q.en.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>';
  $('answer').disabled = true;
  $('check-btn').classList.add('hidden');
  finish(ok, (ok ? (typo ? 'Doğru! (küçük bir yazım hatası var) ✔️' : 'Doğru! 🎉') : 'Olmadı.') + '<br>Kabul edilen cevaplar:' + list);
}

function finish(ok, html) {
  state.answered = true;
  const q = state.qs[state.i], m = state.mode;
  if (ok) { state.score++; store.right[m][q.id] = (store.right[m][q.id] || 0) + 1; delete store.wrong[m][q.id]; }
  else { store.wrong[m][q.id] = 1; }
  save();
  const f = $('feedback'); f.className = ok ? 'ok' : 'bad'; f.innerHTML = html;
  $('next-btn').classList.remove('hidden');
  $('next-btn').focus();
}

function nextQ() {
  state.i++;
  if (state.i < state.qs.length) return renderQ();
  const { mode, score } = state, total = state.qs.length;
  store.history.unshift({ mode, score, total, date: new Date().toISOString() });
  store.history = store.history.slice(0, 50);
  save();
  show('result');
  $('r-score').textContent = score + ' / ' + total;
  const r = score / total;
  $('r-msg').textContent = r >= .9 ? 'Harika! Çok iyi gidiyorsun.' : r >= .6 ? 'Güzel! Biraz daha pratikle mükemmel olacak.' : 'Devam et, yanlışların sonraki turlarda tekrar gelecek.';
}

$('answer').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); state.answered ? nextQ() : checkWrite(); }
});

// ---------- Ana sayfa & Gelişim ----------
function renderHome() {
  const n = store.history.length;
  $('stats-line').textContent = SENTENCES.length + ' cümle · ' + WORDLIST.length + ' kelime · ' + (n ? n + ' tur tamamladın' : 'Henüz tur yok');
}

function renderProgress() {
  $('p-boxes').innerHTML = ['mc', 'write', 'word'].map(m => {
    const total = pool(m).length, learned = Object.keys(store.right[m]).length;
    const h = store.history.filter(x => x.mode === m);
    const acc = h.length ? Math.round(h.reduce((s, x) => s + x.score, 0) / h.reduce((s, x) => s + x.total, 0) * 100) : 0;
    return '<div class="box"><small>' + NAMES[m] + '</small><b>' + learned + ' / ' + total + '</b><small>doğru bilinen · başarı %' + acc + '</small></div>';
  }).join('');
  $('p-history').innerHTML = store.history.length ? store.history.slice(0, 10).map(h =>
    '<div class="hist">' + new Date(h.date).toLocaleString('tr-TR') + ' — ' + NAMES[h.mode] + ': <b>' + h.score + '/' + h.total + '</b></div>').join('')
    : '<p class="muted">Henüz tur yok.</p>';
  const wr = [];
  ['mc', 'write'].forEach(m => Object.keys(store.wrong[m]).forEach(id => { const s = SENTENCES[id]; if (s) wr.push('<div class="wrong-item">' + esc(s.tr) + '<br><i>' + esc(s.en[0]) + '</i></div>'); }));
  Object.keys(store.wrong.word).forEach(id => { const w = WORDLIST[id]; if (w) wr.push('<div class="wrong-item"><b>' + esc(w.en) + '</b> — ' + esc(w.tr) + '</div>'); });
  $('p-wrong').innerHTML = wr.length ? [...new Set(wr)].slice(0, 30).join('') : '<p class="muted">Tekrar edilecek bir şey yok. 👏</p>';
}

function resetAll() {
  if (!confirm('Tüm ilerleme silinsin mi?')) return;
  store = { history: [], right: { mc: {}, write: {}, word: {} }, wrong: { mc: {}, write: {}, word: {} } };
  save(); renderProgress();
}

show('home');
