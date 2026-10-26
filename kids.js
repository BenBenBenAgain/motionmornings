// ===== Motion Mornings Kids: the page that builds a social-story film =====
// Who's in it -> the story, step by step -> the grown-up's voice -> watch and save.
// Everything stays on this device: the cast and story in localStorage, recordings in IndexedDB.
(() => {
  const K = LSN.KIDS, W = LSN.W, H = LSN.H;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v === true) n.setAttribute(k, ''); else if (v !== false && v != null) n.setAttribute(k, v); });
    kids.flat().forEach(c => c != null && n.append(c.nodeType ? c : document.createTextNode(c)));
    return n;
  };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const fmt = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const KEY = 'mmkids.v1';
  // boy, girl or neutral: neutral keeps the story to 'they'
  function sexOf(L) { return (L && L.sex) || (L && L.body === 'm' ? 'm' : 'f'); }

  // ---------------------------------------------------------------- state
  const MUSIC = [['none', 'No music'], ['morning-mood', 'Morning Mood'], ['italian-andante', 'Italian Andante'], ['vltava', 'Vltava'], ['figaro', 'Figaro']];
  const TEMPLATES = {
    playgroup: { label: 'Playgroup', blurb: 'Arriving, toys, other kids, going home', story: {
      title: '{child} Goes to Play Group', ending: 'Play group was fun!', steps: [
        { scene: 'goto', place: 'Play group', text: 'Today {adult} and {child} are going to play group.' },
        { scene: 'arrive', text: 'When they get there, {helper} will say hello.', say: { who: 'child', words: 'Hi {helper}!' } },
        { scene: 'bounce', text: '{child} can play with all the toys.' },
        { scene: 'others', text: 'Other kids and grown-ups will come too.' },
        { scene: 'hello', text: '{child} can say hi if {they} want{s} to.', say: { who: 'child', words: 'Hi, my name is {child}!' } },
        { scene: 'playball', text: '{child} can play with the other kids, or with {adult}.' },
        { scene: 'leave', text: 'When {child} is ready, they say bye and go home.', say: { who: 'child', words: 'Bye!' } }] } },
    kinder: { label: 'Kinder or school', blurb: 'Bag on the hook, goodbye, the day, pick-up', story: {
      title: '{child}\u2019s Day at Kinder', ending: 'Kinder was fun!', steps: [
        { scene: 'goto', place: 'Kinder', text: 'In the morning, {adult} will take {child} to kinder.' },
        { scene: 'hook', text: '{child} hangs {their} bag on the hook.' },
        { scene: 'goodbye', text: '{adult} says goodbye, and {helper} looks after {child}.', say: { who: 'adult', words: 'See you after lunch!' } },
        { scene: 'goodbye', glimpse: true, text: '{adult} always comes back.' },
        { scene: 'mattime', text: 'There is story time on the mat with the other kids.' },
        { scene: 'lunch', text: 'Then everyone has lunch together.' },
        { scene: 'pickup', text: 'After lunch, {adult} comes back to pick {child} up!', say: { who: 'child', words: '{adult}!' } }] } },
    siblings: { label: 'Brothers and sisters', blurb: 'Sharing, squabbles, a big breath, sorry', needs: 'siblingOn', story: {
      title: '{child} and {sibling}', ending: 'We\u2019re a good team!', steps: [
        { scene: 'share', text: '{child} and {sibling} like playing together.' },
        { scene: 'tug', text: 'Sometimes they both want the same toy, and they feel cross.' },
        { scene: 'breathe', text: 'When {child} feels cross, {they} can stop and take a big breath.' },
        { scene: 'share', text: 'Then they can take turns. First {sibling}, then {child}.', say: { who: 'child', words: 'Your turn!' } },
        { scene: 'sorry', text: 'If someone gets hurt or sad, they can say sorry and have a hug.', say: { who: 'child', words: 'Sorry!' } },
        { scene: 'sorry', glimpse: true, text: 'Brothers and sisters look after each other.' }] } },
    baby: { label: 'A new baby', blurb: 'Gentle hands, quiet time, helping', needs: 'babyOn', story: {
      title: '{child} Is a Big Helper', ending: '{baby} loves {child}!', steps: [
        { scene: 'baby_gentle', text: '{baby} is very little, so {child} uses gentle hands.' },
        { scene: 'baby_gentle', text: '{child} can softly stroke {baby}\u2019s head.' },
        { scene: 'baby_quiet', text: 'When {baby} is sleeping, {child} uses a quiet voice.', say: { who: 'child', words: 'Shhh!' } },
        { scene: 'breathe', text: 'Sometimes {baby} cries a lot. {child} can take a big breath and ask {adult} for a cuddle.' },
        { scene: 'baby_gentle', glimpse: true, text: '{child} is a great big {bigsib}.' }] } },
    doctor: { label: 'The doctor', blurb: 'Waiting, a check-up, a quick needle, a sticker', story: {
      title: '{child} Goes to the Doctor', ending: '{child} was so brave!', steps: [
        { scene: 'goto', place: 'Doctor', text: 'Today {adult} and {child} are going to see the doctor.' },
        { scene: 'waiting', text: 'First they wait in the waiting room. There might be fish to look at!' },
        { scene: 'checkup', text: 'The doctor listens to {their} heart and looks in {their} ears.', say: { who: 'helper', words: 'Hello {child}!' } },
        { scene: 'needle', text: 'Sometimes {child} needs a quick needle. {child} can hold {adult}\u2019s hand and take a big breath.' },
        { scene: 'needle', glimpse: true, text: 'It\u2019s over very quickly.' },
        { scene: 'sticker', text: 'Then it\u2019s all done! {child} might get a sticker.', say: { who: 'child', words: 'I did it!' } }] } },
    dentist: { label: 'The dentist', blurb: 'The big chair, counting teeth, a sticker', story: {
      title: '{child} Goes to the Dentist', ending: 'Strong, shiny teeth!', steps: [
        { scene: 'goto', place: 'Dentist', text: 'Today {adult} and {child} are going to the dentist.' },
        { scene: 'waiting', text: 'They wait in the waiting room until it\u2019s {child}\u2019s turn.' },
        { scene: 'dentist_chair', text: '{child} sits in the big chair. It leans back slowly, like a ride!' },
        { scene: 'teeth_count', text: 'The dentist counts {child}\u2019s teeth with a little mirror.' },
        { scene: 'dentist_chair', glimpse: true, text: '{child} can put up a hand if {they} need{s} a break.' },
        { scene: 'sticker', text: 'All done! {child} might get a sticker.', say: { who: 'child', words: 'I did it!' } }] } },
    haircut: { label: 'A haircut', blurb: 'The cape, snip snip, buzzy clippers, the mirror', story: {
      title: '{child} Gets a Haircut', ending: 'Looking good!', steps: [
        { scene: 'goto', place: 'Hairdresser', text: '{adult} and {child} are going to get a haircut.' },
        { scene: 'haircut', text: '{child} sits in the big chair and wears a cape.' },
        { scene: 'haircut', text: 'The hairdresser snips with the scissors. Snip, snip!' },
        { scene: 'clippers', text: 'Sometimes the clippers buzz. They tickle a little bit.' },
        { scene: 'clippers', glimpse: true, text: '{child} can hold still, and it\u2019s over soon.' },
        { scene: 'mirror', text: 'All done! {child} looks in the mirror.', say: { who: 'child', words: 'I look great!' } }] } },
    bedtime: { label: 'Bedtime', blurb: 'Bath, teeth, a story, lights out', endScene: 'sleep', story: {
      title: '{child}\u2019s Bedtime', ending: 'Sweet dreams, {child}.', endScene: 'sleep', steps: [
        { scene: 'bath', text: 'At night, {child} has a bath.' },
        { scene: 'brushteeth', text: 'Then {child} puts on pyjamas and brushes {their} teeth.' },
        { scene: 'bedtime', text: '{adult} reads a story in bed.' },
        { scene: 'sleep', text: '{adult} says goodnight. The little light stays on.', say: { who: 'adult', words: 'Goodnight!' } },
        { scene: 'sleep', glimpse: true, text: '{child} stays in bed all night, and {adult} is close by.' }] } },
    bike: { label: 'Riding a bike', blurb: 'Helmet, a hand on the seat, wobbles, riding', kind: 'skill', story: {
      title: '{child} Learns to Ride', ending: 'A little bit of practice every day!', endScene: 'bike_ride', steps: [
        { scene: 'helmet', text: 'First, helmet on. Click!' },
        { scene: 'bike_held', text: '{adult} holds the seat while {child} pedals.' },
        { scene: 'bike_wobble', text: 'Wobbling is OK. Everyone wobbles when they\u2019re learning.' },
        { scene: 'bike_held', text: 'Pedal, pedal, and look ahead.' },
        { scene: 'bike_ride', glimpse: true, text: 'One day {child} will ride all by {themself}!' }] } },
    food: { label: 'Trying a new food', blurb: 'Looking, one little bite, feeling proud', story: {
      title: '{child} Tries Something New', ending: 'Trying new things is brave!', steps: [
        { scene: 'food_look', text: 'Tonight {child} will try something new for dinner.' },
        { scene: 'food_look', text: 'It might look a bit different. That’s OK.' },
        { scene: 'food_bite', text: '{child} can take one little bite.' },
        { scene: 'food_ok', text: 'Even one bite is brave. {adult} is so proud!', say: { who: 'child', words: 'I tried it!' } }] } },
    blank: { label: 'Something else', blurb: 'Start with an empty story', story: { title: '{child}’s Big Day', ending: 'We did it!', steps: [{ scene: 'goto', place: '', text: '' }] } }
  };
  const blankCast = () => ({ child: Object.assign({}, K.KID_DEF), adult: Object.assign({}, K.ADULT_DEF), helper: Object.assign({}, K.HELPER_DEF), helperOn: true, sibling: Object.assign({}, K.SIB_DEF), siblingOn: false, baby: Object.assign({}, K.BABY_DEF), babyOn: false });
  let S = load() || { cast: blankCast(), story: null, music: 'morning-mood', step: 0 };
  if (!S.cast.sibling) Object.assign(S.cast, { sibling: Object.assign({}, K.SIB_DEF), siblingOn: false, baby: Object.assign({}, K.BABY_DEF), babyOn: false });
  if (!S.story) S.story = fromTemplate('playgroup');
  function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.cast && v.story ? v : null; } catch (e) { return null; } }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 250); }
  function castFor() { return { child: S.cast.child, adult: S.cast.adult, helper: S.cast.helperOn ? S.cast.helper : { name: '' }, sibling: S.cast.sibling || {}, baby: S.cast.baby || {} }; }
  function fromTemplate(key) {
    if (TEMPLATES[key].needs) S.cast[TEMPLATES[key].needs] = true;
    const t = TEMPLATES[key].story, c = castFor(), boy = sexOf(S.cast.child) === 'm', girl = sexOf(S.cast.child) === 'f';
    const pro = s => s.replace(/\{their\}/g, boy ? 'his' : girl ? 'her' : 'their').replace(/\{they\}/g, boy ? 'he' : girl ? 'she' : 'they').replace(/\{s\}/g, boy || girl ? 's' : '').replace(/\{bigsib\}/g, boy ? 'brother' : girl ? 'sister' : 'helper').replace(/\{themself\}/g, boy ? 'himself' : girl ? 'herself' : 'themself');
    const n = s => s == null ? s : pro(K.names(s, c));
    const cap = x => x && x[0].toUpperCase() + x.slice(1);
    return { endScene: t.endScene || '', title: cap(n(t.title)), ending: n(t.ending), steps: t.steps.map(st => ({ id: uid(), scene: st.scene, place: st.place || '', time: st.time || '', text: n(st.text), glimpse: !!st.glimpse, say: st.say ? { who: st.say.who, words: n(st.say.words) } : { who: 'child', words: '' } })) };
  }
  // a shared link carries the cast and the story (never the recordings)
  function readShare() {
    const m = location.hash.match(/^#s[.=]([A-Za-z0-9_-]+)/); if (!m) return;
    try {
      const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
      const v = JSON.parse(json); if (v.cast && v.story) { S = Object.assign({ music: 'morning-mood', step: 0 }, v); save(); }
    } catch (e) {}
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  function shareLink() {
    const json = JSON.stringify({ cast: S.cast, story: S.story, music: S.music });
    const b = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.origin + location.pathname + '#s.' + b;
  }

  // ---------------------------------------------------------------- recordings (IndexedDB, this device only)
  const voices = {}; // id -> AudioBuffer (already trimmed to the speech)
  let AC = null;
  const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('mmkids', 1); r.onupgradeneeded = () => r.result.createObjectStore('voices'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbPut(id, blob) { try { const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction('voices', 'readwrite'); blob ? tx.objectStore('voices').put(blob, id) : tx.objectStore('voices').delete(id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) {} }
  async function idbAll() { try { const db = await idb(); return await new Promise(res => { const out = {}; const tx = db.transaction('voices'); const cur = tx.objectStore('voices').openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); }; cur.onerror = () => res(out); }); } catch (e) { return {}; } }
  function wavBlob(buf) {
    const ch = buf.getChannelData(0), n = ch.length, sr = buf.sampleRate, dv = new DataView(new ArrayBuffer(44 + n * 2));
    const ws = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, ch[i])) * 0x7fff, true);
    return new Blob([dv], { type: 'audio/wav' });
  }
  function slice(buf, a, b) {
    const sr = buf.sampleRate, i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(buf.length, Math.ceil(b * sr));
    const out = ac().createBuffer(1, Math.max(1, i1 - i0), sr), o = out.getChannelData(0);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = i0; i < i1; i++) o[i - i0] += d[i] / buf.numberOfChannels; }
    return out;
  }
  // loudness every 20ms, and where speech is
  function envelope(buf) {
    const d = buf.getChannelData(0), hop = Math.round(buf.sampleRate * 0.02), e = [];
    for (let i = 0; i + hop <= d.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += d[j] * d[j]; e.push(Math.sqrt(s / hop)); }
    const sorted = [...e].sort((a, b) => a - b), noise = sorted[Math.floor(sorted.length * 0.1)] || 0, peak = sorted[Math.floor(sorted.length * 0.98)] || 0;
    return { e, hop: 0.02, thr: noise + (peak - noise) * 0.12 };
  }
  function speechSpans(buf, minGap = 0.3) {
    const { e, hop, thr } = envelope(buf), spans = []; let on = -1, last = -1;
    e.forEach((v, i) => { if (v > thr) { if (on < 0) on = i; last = i; } else if (on >= 0 && (i - last) * hop > minGap) { spans.push([on * hop, (last + 1) * hop]); on = -1; } });
    if (on >= 0) spans.push([on * hop, (last + 1) * hop]);
    return spans.filter(([a, b]) => b - a > 0.12);
  }
  function trim(buf) {
    const sp = speechSpans(buf); if (!sp.length) return buf;
    return slice(buf, Math.max(0, sp[0][0] - 0.12), Math.min(buf.duration, sp[sp.length - 1][1] + 0.25));
  }
  const decodeAB = ab => new Promise((res, rej) => { const p = ac().decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(() => {}); });
  async function decode(blob) { return await decodeAB(await blob.arrayBuffer()); }
  async function setVoice(id, buf) { voices[id] = buf; await idbPut(id, buf ? wavBlob(buf) : null); refresh(); renderVoice(); }

  // ---------------------------------------------------------------- the film
  const stage = $('#stage'), sctx = stage.getContext('2d');
  let TL = null;
  const voiceLens = () => Object.fromEntries(Object.entries(voices).filter(([, b]) => b).map(([k, b]) => [k, b.duration]));
  function refresh() { TL = K.timeline(S.story, voiceLens()); $('#scrub').max = 1000; $('#lenMeta').textContent = `${fmt(TL.total)} long`; $('#storyMeta').textContent = `${S.story.steps.length} step${S.story.steps.length === 1 ? '' : 's'} · about ${fmt(TL.total)}`; if (!playing) draw(pos); save(); }
  function draw(T, ctx = sctx, w = stage.width) { ctx.setTransform(w / W, 0, 0, w / W, 0, 0); K.frame(ctx, castFor(), S.story, TL, T); ctx.setTransform(1, 0, 0, 1, 0, 0); }

  // music, ducked under the voice
  const musicBufs = {};
  async function loadMusic(key) {
    if (key === 'none') return null; if (musicBufs[key]) return musicBufs[key];
    try { const r = await fetch(`music/${key}.mp3`); if (!r.ok) return null; const ab = await r.arrayBuffer(); musicBufs[key] = await decodeAB(ab); } catch (e) { return null; }
    return musicBufs[key];
  }
  let playing = false, pos = 0, t0 = 0, nodes = [], raf = 0, recDest = null;
  function stopAudio() { nodes.forEach(n => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); nodes = []; }
  async function startAudio(from, out) {
    const ctx = ac(); await ctx.resume().catch(() => {});
    const now = ctx.currentTime + 0.08; t0 = now - from;
    const master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination); if (out) master.connect(out); nodes.push({ stop() {}, disconnect: () => master.disconnect() });
    const mb = await loadMusic(S.music);
    if (mb) {
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = mb; src.loop = true; src.connect(g); g.connect(master);
      const base = 0.42, duck = 0.13, gp = g.gain; gp.setValueAtTime(0, now); gp.linearRampToValueAtTime(base, now + Math.min(1.2, Math.max(0.05, 1.2 - from)));
      TL.items.forEach(it => { if (!voices[it.id]) return; const a = t0 + it.start + it.voiceAt, b = a + voices[it.id].duration; if (b < now) return; gp.setTargetAtTime(duck, Math.max(now, a - 0.35), 0.12); gp.setTargetAtTime(base, Math.max(now, b + 0.15), 0.35); });
      const endT = t0 + TL.total; gp.setTargetAtTime(0, Math.max(now, endT - 2.2), 0.6);
      src.start(now, from % mb.duration); src.stop(endT + 0.2); nodes.push(src);
    }
    TL.items.forEach(it => {
      const b = voices[it.id]; if (!b) return;
      const at = it.start + it.voiceAt, off = from - at; if (off >= b.duration) return;
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(master);
      off > 0 ? src.start(now, off) : src.start(t0 + at); nodes.push(src);
    });
  }
  function tick() {
    if (!playing) return;
    pos = ac().currentTime - t0;
    if (pos >= TL.total) { pos = Math.max(0, TL.total - 1.2); stop(); draw(pos); showPos(); if (onEnd) { const f = onEnd; onEnd = null; f(); } return; }
    draw(pos); showPos(); if (onFrame) onFrame(pos);
    raf = requestAnimationFrame(tick);
  }
  let onEnd = null, onFrame = null;
  async function play(from = pos, out = null) { if (from >= TL.total - 0.05) from = 0; stop(); playing = true; pos = from; $('#playBtn').textContent = 'Pause'; await startAudio(from, out); raf = requestAnimationFrame(tick); }
  function stop() { playing = false; cancelAnimationFrame(raf); stopAudio(); $('#playBtn').textContent = 'Play'; }
  function showPos() { $('#scrub').value = Math.round(1000 * pos / TL.total); $('#timeLbl').textContent = fmt(pos); }
  $('#playBtn').addEventListener('click', () => playing ? (stop(), draw(pos)) : play());
  $('#scrub').addEventListener('input', e => { const was = playing; stop(); pos = (e.target.value / 1000) * TL.total; draw(pos); showPos(); if (was) play(pos); });
  // jump the preview to a step while editing it
  function seekTo(id) { if (!TL) return; const it = TL.items.find(i => i.id === id); if (!it) return; stop(); pos = it.start + Math.min(2.4, it.d * 0.55); draw(pos); showPos(); }

  // ---------------------------------------------------------------- steps (the four panels)
  const STEP_NAMES = ['Who’s in it', 'The story', 'Your voice', 'Watch and save'];
  function go(n) {
    S.step = Math.max(0, Math.min(3, n)); save();
    $$('#panels > .panel').forEach(p => p.hidden = +p.dataset.step !== S.step);
    $$('#steps button').forEach((b, i) => b.setAttribute('aria-current', i === S.step ? 'step' : 'false'));
    if (S.step === 1) renderStory(); if (S.step === 2) renderVoice(); if (S.step === 0) renderCast();
    if (window.innerWidth < 860) $('#steps').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  $('#steps').append(...STEP_NAMES.map((n, i) => el('button', { type: 'button', onclick: () => go(i) }, el('span', { class: 'n' }, String(i + 1)), n)));
  $$('[data-next]').forEach(b => b.addEventListener('click', () => go(S.step + 1)));
  $$('[data-prev]').forEach(b => b.addEventListener('click', () => go(S.step - 1)));

  // ---------------------------------------------------------------- cast
  const ROLES = [
    ['child', 'Your child', 'Their name', 'e.g. Hunter'],
    ['adult', 'Going with them', 'What your child calls them', 'e.g. Mumma or Dad'],
    ['helper', 'Someone they’ll meet', 'Their name', 'e.g. Vicky'],
    ['sibling', 'Brother or sister', 'Their name', 'e.g. Ruby'],
    ['baby', 'A baby', 'Their name', 'e.g. Ollie']];
  const OPTIONAL = { helper: 'helperOn', sibling: 'siblingOn', baby: 'babyOn' };
  // age in years: 2 to 5 are drawn little, 6 to 11 as a kid, 12 and up as a teenager
  const AGES = Array.from({ length: 15 }, (_, i) => i + 2);
  const sizeFor = y => y <= 5 ? 'little' : y <= 11 ? 'kid' : 'teen';
  const ageOf = L => L.years || ({ little: 4, kid: 8, teen: 13 }[L.age] || 4);
  function setAge(L, y) { L.years = y; L.age = sizeFor(y); }
  const portraits = [];
  function renderCast() {
    const box = $('#cast'); box.innerHTML = ''; portraits.length = 0;
    ROLES.forEach(([role, title, q, ph]) => {
      const L = S.cast[role], cv = el('canvas', { width: 192, height: 240, role: 'button', tabindex: '0', 'aria-label': `Change how ${title.toLowerCase()} looks` });
      cv.addEventListener('click', () => openLook(role)); cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLook(role); } });
      const on = OPTIONAL[role], off = on && !S.cast[on];
      const card = el('div', { class: 'card' },
        el('div', { class: 'subhead' }, el('h3', {}, title), on ? el('label', { class: 'switch' }, el('input', { type: 'checkbox', id: on, checked: !!S.cast[on], onchange: e => { S.cast[on] = e.target.checked; renderCast(); refresh(); } }), 'Include') : null),
        el('div', { class: 'who' }, cv, el('div', { class: 'fields' },
          el('label', { class: 'q' }, q, el('input', { type: 'text', id: `name-${role}`, value: L.name || '', placeholder: ph, maxlength: '24', disabled: off, oninput: e => { renameIn(role, L.name, e.target.value); L.name = e.target.value; refresh(); } })),
          role === 'child' || role === 'sibling' ? el('label', { class: 'q' }, 'Age', el('select', { id: `age-${role}`, disabled: off, onchange: e => { setAge(L, +e.target.value); refresh(); drawPortraits(0); } }, AGES.map(a => el('option', { value: a, selected: ageOf(L) === a }, a === 16 ? '16+' : String(a))))) : null,
          el('button', { class: 'linkbtn', type: 'button', onclick: () => openLook(role), disabled: off }, 'Change their look'))));
      if (off) card.style.opacity = '0.55';
      box.append(card); portraits.push([cv, role]);
    });
    drawPortraits(0);
  }
  // a new name flows through the story: the old name (or the stand-in) is swapped wherever it appears
  const STAND_IN = { child: 'your child', adult: 'Mum', helper: 'a friend', baby: 'the baby' };
  const standIn = role => role === 'adult' ? ({ m: 'Dad', f: 'Mum', x: 'their grown-up' }[sexOf(S.cast.adult)]) : role === 'sibling' ? ({ m: 'their brother', f: 'their sister', x: 'their sibling' }[sexOf(S.cast.sibling)]) : STAND_IN[role];
  function renameIn(role, oldName, newName) {
    const from = (oldName || '').trim() || standIn(role), to = newName.trim() || standIn(role);
    swapName(from, to);
  }
  function swapName(from, to) {
    if (!from || !to || from === to) return;
    const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    const sw = t => typeof t === 'string' ? t.replace(re, m => (m[0] === m[0].toUpperCase() && to[0] ? to[0].toUpperCase() + to.slice(1) : to)) : t;
    S.story.title = sw(S.story.title); S.story.ending = sw(S.story.ending);
    S.story.steps.forEach(st => { st.text = sw(st.text); if (st.say) st.say.words = sw(st.say.words); });
  }
  function drawPortraits(t) { portraits.forEach(([cv, role]) => { const c = cv.getContext('2d'); K.portraitOf(c, cv.width, cv.height, S.cast[role], role, t); }); }

  // look editor
  const SKIN = ['#F6D7C3', '#F2CBAE', '#E8BA99', '#D6A27C', '#C98E66', '#A86F4C', '#8A5434', '#5E3A26'];
  const HAIRC = ['#1F1A17', '#3B2A20', '#6B4528', '#A47A55', '#C9A060', '#E2C27E', '#B5523A', '#9A9A9A'];
  const CLOTH = ['#D94B3F', '#E9A23B', '#F2C46F', '#5FA88F', '#4F86C6', '#30406E', '#9B6FB5', '#F7F3EC', '#2B2B30', '#4D6E9C'];
  const HAIR_KID = [['mop', 'Ear length'], ['short', 'Short'], ['curly', 'Curly'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['braids', 'Braids'], ['afro', 'Afro']];
  const HAIR_AD = [['long', 'Long'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['braids', 'Braids'], ['short', 'Short'], ['fade', 'Fade'], ['afro', 'Afro'], ['buzz', 'Buzz cut'], ['bald', 'Bald']];
  let lookRole = null, lookRaf = 0;
  function openLook(role) {
    if (OPTIONAL[role] && !S.cast[OPTIONAL[role]]) return;
    lookRole = role; const L = S.cast[role], kid = role === 'child' || role === 'sibling', f = $('#lookFields');
    $('#lookEdTitle').textContent = (L.name || ROLES.find(r => r[0] === role)[1]) + '\u2019s look';
    const pressSet = (e, sel) => e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    const seg = (label, key, opts, redraw) => el('div', { class: 'field' }, el('span', {}, label), el('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(([v, n]) => el('button', { type: 'button', 'aria-pressed': String((key === 'sex' ? sexOf(L) : L[key] || false) === v), onclick: e => { pressSet(e); set(key, v); if (redraw) fields(); } }, n))));
    const sw = (label, key, cols) => el('div', { class: 'field' }, el('span', {}, label), el('div', { class: 'sw' }, cols.map(c => el('button', { type: 'button', 'aria-label': c, 'aria-pressed': String((L[key] || '').toLowerCase() === c.toLowerCase()), style: `background:${c}`, onclick: e => { pressSet(e); set(key, c); } })), el('input', { type: 'color', value: L[key] || '#888888', 'aria-label': `Other ${label.toLowerCase()} colour`, oninput: e => set(key, e.target.value) })));
    function set(key, v) {
      if (key === 'sex') {
        const was = !(L.name || '').trim() && role !== 'child' ? standIn(role) : null;
        L.sex = v; L.body = v === 'm' ? 'm' : 'f';
        if (v === 'm' && L.hair === 'long' && !kid) L.hair = 'short';
        if (v !== 'f' && L.outfit === 'dress') L.outfit = 'tee';
        if (v !== 'm') L.facial = 'none';
        if (was) swapName(was, standIn(role));
      } else L[key] = v;
      if (key === 'hairCol') L.facialCol = v;
      if (key === 'facial') L.facialCol = L.hairCol;
      if (L.outfit === 'dress' && !kid) L.inner = L.top;
      refresh();
    }
    function fields() {
      const box = f.closest('.box'), top = box ? box.scrollTop : 0; f.innerHTML = '';
      if (role === 'baby') { f.append(sw('Skin tone', 'skin', SKIN), sw('Hair colour', 'hairCol', HAIRC), sw('Blanket', 'blanket', CLOTH)); return; }
      f.append(seg('Look', 'sex', kid ? [['m', 'Boy'], ['f', 'Girl'], ['x', 'Neutral']] : [['f', 'Woman'], ['m', 'Man'], ['x', 'Neutral']], true));
      f.append(sw('Skin tone', 'skin', SKIN));
      f.append(seg('Headwear', 'hat', [[false, 'None'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['scarf', 'Headscarf']], true));
      if (L.hat) f.append(sw('Headwear colour', 'hatCol', CLOTH));
      if (L.hat !== 'scarf') f.append(seg('Hair', 'hair', kid ? HAIR_KID : HAIR_AD), sw('Hair colour', 'hairCol', HAIRC));
      if (!kid) f.append(seg('Facial hair', 'facial', [['none', 'None'], ['stubble', 'Stubble'], ['moustache', 'Moustache'], ['beard', 'Beard']]));
      f.append(seg('Glasses', 'glasses', [[false, 'None'], [true, 'Round'], ['square', 'Square'], ['sun', 'Sunglasses']]),
        seg('Earrings', 'earrings', [[false, 'None'], ['studs', 'Studs'], ['hoops', 'Hoops']]),
        seg('Freckles', 'freckles', [[false, 'No'], [true, 'Yes']]),
        seg('Height', 'height', [['short', kid ? 'Smaller' : 'Shorter'], [false, 'Average'], ['tall', 'Taller']]),
        seg('Build', 'build', [['slim', 'Slim'], [false, 'Average'], ['big', 'Bigger']]),
        seg('Uses a wheelchair', 'chair', [[false, 'No'], [true, 'Yes']]),
        seg('Wearing', 'outfit', kid ? [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['dress', 'Dress']] : [['tee', 'T-shirt'], ['shirt', 'Shirt'], ['hoodie', 'Hoodie'], ['jacket', 'Jacket'], ['dress', 'Dress']], true),
        sw('Top colour', 'top', CLOTH));
      if (L.outfit === 'jacket') f.append(sw('Shirt under jacket', 'inner', CLOTH));
      if (L.outfit !== 'dress') f.append(sw('Pants colour', 'pants', CLOTH));
      if (kid) f.append(el('div', { class: 'field' }, el('span', {}, 'On their top'), el('input', { type: 'text', id: 'printIn', maxlength: '4', placeholder: 'e.g. OK', value: L.print || '', oninput: e => { L.print = e.target.value.toUpperCase(); refresh(); } })));
      if (box) box.scrollTop = top;
    }
    fields();
    $('#lookEd').hidden = false; const cv = $('#lookCanvas'), c = cv.getContext('2d'); const t0 = performance.now();
    cancelAnimationFrame(lookRaf);
    const loop = now => { K.portraitOf(c, cv.width, cv.height, L, role, (now - t0) / 1000); lookRaf = requestAnimationFrame(loop); }; lookRaf = requestAnimationFrame(loop);
  }
  function closeLook() { cancelAnimationFrame(lookRaf); $('#lookEd').hidden = true; renderCast(); refresh(); }
  $('#lookDone').addEventListener('click', closeLook);
  $('#lookEd').addEventListener('click', e => { if (e.target.id === 'lookEd') closeLook(); });

  // ---------------------------------------------------------------- story
  const tplButton = ([k, t]) => el('button', { class: 'tpl', type: 'button', onclick: () => ask(`Start from “${t.label}”?`, 'This replaces the steps you have now. Your people stay the same.', () => { S.story = fromTemplate(k); renderStory(); refresh(); }) }, el('b', {}, t.label), el('span', {}, t.blurb));
  const tplAll = Object.entries(TEMPLATES), tplEnd = tplAll.filter(([k]) => k === 'blank');
  $('#templates').append(el('h4', {}, 'Getting ready for something'), ...tplAll.filter(([k, t]) => t.kind !== 'skill' && k !== 'blank').map(tplButton),
    el('h4', {}, 'Learning to do something'), ...tplAll.filter(([, t]) => t.kind === 'skill').map(tplButton), el('h4', {}, 'Or start from scratch'), ...tplEnd.map(tplButton));
  $('#title').addEventListener('input', e => { S.story.title = e.target.value; refresh(); });
  $('#ending').addEventListener('input', e => { S.story.ending = e.target.value; refresh(); });
  // a plan for when it gets too much, for any story: it goes in before the last step
  const CALM = [
    { scene: 'busy', text: 'Sometimes it gets busy and loud. That\u2019s OK.' },
    { scene: 'ears', text: 'If it\u2019s too loud, {child} can cover {their} ears and hold {adult}\u2019s hand.' },
    { scene: 'mumplay', glimpse: true, text: '{child} can always stay with {adult}.' }];
  $('#addCalm').addEventListener('click', () => {
    const c = castFor(), boy = sexOf(S.cast.child) === 'm', girl = sexOf(S.cast.child) === 'f';
    const n = t => K.names(t, c).replace(/\{their\}/g, boy ? 'his' : girl ? 'her' : 'their');
    const add = CALM.map(st => ({ id: uid(), scene: st.scene, place: '', time: '', glimpse: !!st.glimpse, text: n(st.text), say: { who: 'child', words: '' } }));
    const at = Math.max(0, S.story.steps.length - 1); S.story.steps.splice(at, 0, ...add); renderStory(); refresh(); seekTo(add[0].id);
  });
  $('#addStep').addEventListener('click', () => { const last = S.story.steps[S.story.steps.length - 1]; S.story.steps.push({ id: uid(), scene: last ? last.scene : 'goto', place: '', time: '', text: '', say: { who: 'child', words: '' } }); renderStory(); refresh(); const ta = $$('#stepList textarea').pop(); if (ta) ta.focus(); });
  function sceneThumb(cv, key, place) { const c = cv.getContext('2d'); c.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); K.still(c, castFor(), key, place); c.setTransform(1, 0, 0, 1, 0, 0); }
  function renderStory() {
    $('#title').value = S.story.title || ''; $('#ending').value = S.story.ending || '';
    const list = $('#stepList'); list.innerHTML = '';
    const who = [['child', S.cast.child.name || 'Your child'], ['adult', S.cast.adult.name || 'The grown-up']].concat(S.cast.helperOn ? [['helper', S.cast.helper.name || 'Their helper']] : []).concat(S.cast.siblingOn ? [['sibling', S.cast.sibling.name || 'Brother or sister']] : []);
    S.story.steps.forEach((st, i) => {
      const sc = K.SC[st.scene] || K.SC.goto, cv = el('canvas', { width: 168, height: 299 });
      const thumb = el('button', { class: 'thumb', type: 'button', 'aria-label': `Step ${i + 1} picture: ${sc.label}. Change it`, onclick: () => pickScene(st) }, cv, el('span', { class: 'chg' }, 'Change'));
      const extras = el('div', { class: 'extras' },
        sc.place ? el('label', {}, 'Sign on the building', el('input', { type: 'text', id: `place-${st.id}`, value: st.place || '', maxlength: '20', placeholder: 'e.g. Play group', oninput: e => { st.place = e.target.value; sceneThumb(cv, st.scene, st.place); refresh(); seekTo(st.id); } })) : null,
        el('label', {}, 'Clock shows a time', el('input', { type: 'text', id: `time-${st.id}`, value: st.time || '', maxlength: '8', placeholder: 'e.g. 9:00', inputmode: 'numeric', oninput: e => { st.time = e.target.value; refresh(); seekTo(st.id); } })),
        el('label', { class: 'switch glimpse' }, el('input', { type: 'checkbox', id: `glimpse-${st.id}`, checked: !!st.glimpse, onchange: e => { st.glimpse = e.target.checked; refresh(); seekTo(st.id); } }), 'Show as big calm words'));
      st.say = st.say || { who: 'child', words: '' };
      const say = el('div', { class: 'sayrow' },
        el('select', { 'aria-label': 'Who says it', id: `who-${st.id}`, onchange: e => { st.say.who = e.target.value; refresh(); seekTo(st.id); } }, who.map(([v, n]) => el('option', { value: v, selected: st.say.who === v }, n))),
        el('input', { type: 'text', id: `say-${st.id}`, value: st.say.words || '', maxlength: '48', placeholder: 'Speech bubble, if they say something', oninput: e => { st.say.words = e.target.value; refresh(); seekTo(st.id); } }));
      const ctl = el('div', { class: 'stepctl' },
        el('button', { class: 'iconbtn', type: 'button', disabled: i === 0, 'aria-label': 'Move up', onclick: () => { S.story.steps.splice(i - 1, 0, S.story.steps.splice(i, 1)[0]); renderStory(); refresh(); } }, 'Up'),
        el('button', { class: 'iconbtn', type: 'button', disabled: i === S.story.steps.length - 1, 'aria-label': 'Move down', onclick: () => { S.story.steps.splice(i + 1, 0, S.story.steps.splice(i, 1)[0]); renderStory(); refresh(); } }, 'Down'),
        el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Remove step', onclick: () => ask('Remove this step?', st.text || 'This step has no words yet.', () => { S.story.steps.splice(i, 1); renderStory(); refresh(); }) }, 'Remove'));
      list.append(el('div', { class: 'stepcard' }, thumb, el('div', { class: 'stepbody' },
        el('div', { class: 'row between' }, el('span', { class: 'stepnum' }, `Step ${i + 1} · ${sc.label}`), ctl),
        el('textarea', { id: `text-${st.id}`, rows: '2', maxlength: '140', placeholder: 'What happens, in a sentence', 'aria-label': `Step ${i + 1} words`, onfocus: () => seekTo(st.id), oninput: e => { st.text = e.target.value; refresh(); } }, st.text || ''),
        extras, say)));
      sceneThumb(cv, st.scene, st.place);
    });
  }
  let pickFor = null;
  function pickScene(st) {
    pickFor = st; const g = $('#sceneGrid'); g.innerHTML = '';
    K.PLACES.forEach(([where, keys]) => {
      g.append(el('h4', {}, where));
      keys.forEach(key => {
        if (key === 'arrive' && !S.cast.helperOn) return;
        const cv = el('canvas', { width: 180, height: 320 });
        g.append(el('button', { type: 'button', 'aria-pressed': String(st.scene === key), onclick: () => { st.scene = key; if (K.SC[key].place && !st.place) st.place = key === 'cafe' ? 'Cafe' : ''; $('#scenePick').hidden = true; renderStory(); refresh(); seekTo(st.id); } }, cv, el('span', {}, K.SC[key].label)));
        sceneThumb(cv, key, st.place || (key === 'cafe' ? 'Cafe' : key === 'goto' ? 'Play group' : ''));
      });
    });
    g.append(el('div', { class: 'ask' }, el('p', {}, el('b', {}, 'Can\u2019t find the right picture?'), ' Ask for it and we\u2019ll draw it.'), el('button', { class: 'btn ghost small', type: 'button', onclick: () => openRequest(st) }, 'Request a new picture')));
    $('#scenePick').hidden = false;
  }
  // asking for a picture we haven't drawn yet: each new scene is created individually, so it isn't instant
  const REQ_TO = 'hello@motionmornings.com';
  function openRequest(st) {
    $('#scenePick').hidden = true;
    $('#reqWhat').value = st && st.text ? `For the step: \u201c${st.text}\u201d\n\nThe picture should show: ` : 'The picture should show: ';
    $('#reqStatus').textContent = ''; $('#reqBox').hidden = false; $('#reqWhat').focus();
  }
  $('#reqCancel').addEventListener('click', () => $('#reqBox').hidden = true);
  $('#reqTop').addEventListener('click', () => openRequest(pickFor));
  $('#reqSend').addEventListener('click', () => {
    const what = $('#reqWhat').value.trim(), from = $('#reqEmail').value.trim();
    if (what.length < 12) { $('#reqStatus').className = 'status err'; $('#reqStatus').textContent = 'Tell us a little about the picture you need.'; return; }
    const body = `${what}\n\nWho's in it: ${[S.cast.child.name, S.cast.adult.name].filter(Boolean).join(', ') || 'not named yet'}\nReply to: ${from || '(no email given)'}`;
    location.href = `mailto:${REQ_TO}?subject=${encodeURIComponent('New picture request (Kids)')}&body=${encodeURIComponent(body)}`;
    $('#reqStatus').className = 'status'; $('#reqStatus').textContent = `Your email app should open with the request ready to send. If it doesn\u2019t, copy what you wrote and email it to ${REQ_TO}.`;
  });
  $('#scenePickClose').addEventListener('click', () => $('#scenePick').hidden = true);
  $('#scenePick').addEventListener('click', e => { if (e.target.id === 'scenePick') $('#scenePick').hidden = true; });

  // confirm box
  let askYes = null;
  function ask(title, text, yes) { $('#confirmTitle').textContent = title; $('#confirmText').textContent = text; askYes = yes; $('#confirmBox').hidden = false; $('#confirmYes').focus(); }
  $('#confirmYes').addEventListener('click', () => { $('#confirmBox').hidden = true; const f = askYes; askYes = null; if (f) f(); });
  $('#confirmNo').addEventListener('click', () => { $('#confirmBox').hidden = true; askYes = null; });

  // ---------------------------------------------------------------- voice
  const lines = () => [{ id: 'title', words: S.story.title, note: 'The title (optional)' }]
    .concat(S.story.steps.filter(s => (s.text || '').trim() || (s.say && s.say.words)).map((s, i) => ({ id: s.id, words: [s.text, s.say && s.say.words ? `“${s.say.words}”` : ''].filter(Boolean).join(' '), note: `Step ${i + 1}` })))
    .concat([{ id: 'end', words: S.story.ending, note: 'The ending' }]);
  let rec = null, recId = null, recChunks = [], recStream = null;
  function renderVoice() {
    const list = $('#voiceList'); list.innerHTML = '';
    // one recording of the whole story, split at the pauses
    list.append(el('div', { class: 'card' },
      el('div', { class: 'subhead' }, el('h3', {}, 'Already recorded the whole thing?')),
      el('p', { class: 'meta' }, 'Upload one recording of you reading every line in order, with a short pause between lines. It gets split at the pauses. Check each line below and redo any that landed in the wrong place.'),
      el('div', { class: 'row' }, el('label', { class: 'btn ghost small', for: 'wholeFile', style: 'cursor:pointer' }, 'Upload one recording'), el('input', { type: 'file', id: 'wholeFile', accept: 'audio/*,video/*', hidden: true, onchange: e => e.target.files[0] && splitWhole(e.target.files[0]) }),
        el('label', { class: 'switch' }, el('input', { type: 'checkbox', id: 'titleRead', checked: !!S.titleRead, onchange: e => { S.titleRead = e.target.checked; save(); } }), 'I read the title too')),
      el('p', { class: 'status', id: 'wholeStatus' })));
    lines().forEach(l => {
      const has = !!voices[l.id], recording = recId === l.id;
      const ctl = el('div', { class: 'vctl' },
        has ? el('span', { class: 'vlen' }, `${voices[l.id].duration.toFixed(1)}s`) : null,
        has ? el('button', { class: 'btn ghost small', type: 'button', onclick: () => playClip(l.id) }, 'Listen') : null,
        recording ? el('button', { class: 'btn rec small', type: 'button', onclick: stopRec }, el('span', { class: 'recdot' }), 'Stop') : el('button', { class: 'btn small' + (has ? ' ghost' : ''), type: 'button', disabled: !!recId, onclick: () => startRec(l.id) }, has ? 'Redo' : 'Record'),
        !has && !recording ? el('label', { class: 'linkbtn', for: `up-${l.id}`, style: 'cursor:pointer' }, 'or upload') : null,
        el('input', { type: 'file', id: `up-${l.id}`, accept: 'audio/*,video/*', hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { await setVoice(l.id, trim(await decode(f))); } catch (err) { micErr('That file couldn’t be read. Try an audio file like .m4a, .mp3 or .wav.'); } } }),
        has ? el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Remove recording', onclick: () => setVoice(l.id, null) }, 'Remove') : null);
      list.append(el('div', { class: 'vline' }, el('div', { class: 'words' }, l.words || el('em', {}, '(no words yet)'), el('small', {}, l.note)), ctl));
    });
    const seg = $('#musicSeg'); seg.innerHTML = '';
    MUSIC.forEach(([k, n]) => seg.append(el('button', { type: 'button', 'aria-pressed': String(S.music === k), onclick: () => { S.music = k; save(); renderVoice(); loadMusic(k); } }, n)));
  }
  function micErr(msg) { const p = $('#micErr'); p.textContent = msg; p.hidden = !msg; }
  function playClip(id) { stop(); const ctx = ac(); ctx.resume(); const s = ctx.createBufferSource(); s.buffer = voices[id]; s.connect(ctx.destination); s.start(); }
  async function startRec(id) {
    micErr('');
    try { recStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { micErr('The microphone isn’t available. Allow microphone access for this site in your browser settings, or upload a recording instead.'); return; }
    recChunks = []; recId = id; rec = new MediaRecorder(recStream);
    rec.ondataavailable = e => e.data.size && recChunks.push(e.data);
    rec.onstop = async () => { recStream.getTracks().forEach(t => t.stop()); const blob = new Blob(recChunks, { type: rec.mimeType }); const was = recId; recId = null; try { await setVoice(was, trim(await decode(blob))); } catch (e) { micErr('That recording couldn’t be read. Try again.'); renderVoice(); } };
    rec.start(); renderVoice();
  }
  function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
  // split one long recording into its lines: the biggest pauses are the gaps between lines
  async function splitWhole(file) {
    const st = $('#wholeStatus'); st.className = 'status'; st.textContent = 'Listening for the pauses…';
    let buf; try { buf = await decode(file); } catch (e) { st.className = 'status err'; st.textContent = 'That file couldn’t be read. Try an audio or video file from your phone.'; return; }
    const ls = lines().filter(l => l.id !== 'title' || S.titleRead), n = ls.length;
    let spans = speechSpans(buf, 0.25);
    if (spans.length < n) spans = speechSpans(buf, 0.15);
    if (spans.length < n) { st.className = 'status err'; st.textContent = `Found ${spans.length} pieces of talking but there are ${n} lines. Leave a clear pause between lines, or record them one at a time below.`; return; }
    const gaps = spans.slice(1).map((s, i) => ({ i, g: s[0] - spans[i][1] })).sort((a, b) => b.g - a.g).slice(0, n - 1).map(x => x.i).sort((a, b) => a - b);
    let from = 0; const groups = [];
    gaps.forEach(gi => { groups.push([spans[from][0], spans[gi][1]]); from = gi + 1; }); groups.push([spans[from][0], spans[spans.length - 1][1]]);
    for (let i = 0; i < n; i++) { const [a, b] = groups[i]; voices[ls[i].id] = slice(buf, Math.max(0, a - 0.12), Math.min(buf.duration, b + 0.25)); await idbPut(ls[i].id, wavBlob(voices[ls[i].id])); }
    refresh(); renderVoice(); const s2 = $('#wholeStatus'); s2.textContent = `Split into ${n} lines. Tap Listen on each to check it.`;
  }

  // ---------------------------------------------------------------- save the film
  let resultBlob = null, resultExt = 'webm';
  $('#recBtn').addEventListener('click', async () => {
    if (!window.MediaRecorder || !stage.captureStream) { $('#recStatus').className = 'status err'; $('#recStatus').textContent = 'This browser can’t save video. Try Safari on iPhone or Chrome.'; return; }
    const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    resultExt = /mp4/.test(mime) ? 'mp4' : 'webm';
    const ctx = ac(); await ctx.resume().catch(() => {}); const dest = ctx.createMediaStreamDestination();
    const stream = new MediaStream([...stage.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    let r; try { r = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined); } catch (e) { r = new MediaRecorder(stream); }
    const chunks = []; r.ondataavailable = e => e.data.size && chunks.push(e.data);
    r.onstop = () => { resultBlob = new Blob(chunks, { type: r.mimeType || mime || 'video/webm' }); $('#resultVideo').src = URL.createObjectURL(resultBlob); $('#result').hidden = false; $('#recBar').hidden = true; $('#recBtn').disabled = false; $('#recStop').hidden = true; $('#recStatus').className = 'status'; $('#recStatus').textContent = 'Done. Watch it below, then save it.'; };
    $('#recBtn').disabled = true; $('#recStop').hidden = false; $('#recBar').hidden = false; $('#result').hidden = true; $('#recStatus').className = 'status'; $('#recStatus').textContent = 'Making your video. Keep this screen open…';
    onFrame = T => { $('#recBar i').style.width = (100 * T / TL.total).toFixed(1) + '%'; };
    onEnd = () => { onFrame = null; setTimeout(() => r.state !== 'inactive' && r.stop(), 250); };
    draw(0); r.start(500); await play(0, dest);
  });
  $('#recStop').addEventListener('click', () => { onEnd = null; onFrame = null; stop(); $('#recBtn').disabled = false; $('#recStop').hidden = true; $('#recBar').hidden = true; $('#recStatus').textContent = 'Stopped.'; });
  $('#saveBtn').addEventListener('click', async () => {
    if (!resultBlob) return; const name = ((S.story.title || 'my-film').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'my-film') + '.' + resultExt, st = $('#saveStatus');
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (dl) { try { await dl.save({ filename: name, data: resultBlob }); st.textContent = 'Saved.'; } catch (e) { st.textContent = e && e.code === 'declined' ? 'Not saved.' : 'Saving isn’t available here.'; } return; }
    const file = new File([resultBlob], name, { type: resultBlob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: S.story.title }); st.textContent = 'Shared. Choose Save Video to keep it in Photos.'; return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = el('a', { href: URL.createObjectURL(resultBlob), download: name }); document.body.append(a); a.click(); a.remove(); st.textContent = 'Downloading.';
  });
  $('#newStory').addEventListener('click', () => ask('Start a new story?', 'Your people stay the same. This story and its recordings are cleared.', async () => {
    for (const id of Object.keys(voices)) { delete voices[id]; await idbPut(id, null); }
    S.story = fromTemplate('blank'); go(1); refresh();
  }));
  $('#copyLink').addEventListener('click', async () => { const link = shareLink(), st = $('#copyStatus'); try { await navigator.clipboard.writeText(link); st.textContent = 'Copied.'; } catch (e) { st.textContent = link; } });

  // ---------------------------------------------------------------- start
  readShare();
  (async () => {
    const saved = await idbAll();
    for (const [id, blob] of Object.entries(saved)) { try { voices[id] = await decode(blob); } catch (e) {} }
    if (document.fonts && document.fonts.load) { try { await Promise.race([Promise.all([document.fonts.load('700 50px Poppins'), document.fonts.load('italic 500 50px Poppins'), document.fonts.load('italic 400 50px Poppins')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} }
    refresh(); go(S.step || 0); pos = Math.min(2.6, TL.total); draw(pos); showPos();
    let t = 0; const idle = () => { t += 1 / 30; if (S.step === 0 && !$('#cast').hidden) drawPortraits(t); setTimeout(() => requestAnimationFrame(idle), 33); }; idle();
  })();
  window.MMKIDS = { state: () => S, refresh, shareLink, voices };
})();
