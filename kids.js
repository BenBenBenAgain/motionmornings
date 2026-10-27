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
  const MAX_STEPS = 10, MAX_LINE = 8, MAX_FILM = 90;
  // boy, girl or neutral: neutral keeps the story to 'they'
  function sexOf(L) { return (L && L.sex) || (L && L.body === 'm' ? 'm' : 'f'); }

  // ---------------------------------------------------------------- state
  const MUSIC = [['none', 'No music'], ['morning-mood', 'Morning Mood'], ['italian-andante', 'Italian Andante'], ['vltava', 'Vltava'], ['figaro', 'Figaro']];
  const TEMPLATES = {
    playgroup: { label: 'Playgroup', blurb: 'Arriving, toys, other kids, going home', story: {
      title: '{child} Goes to Play Group', ending: 'Play group was fun!', steps: [
        { scene: 'goto', place: 'Play group', text: 'Today {adult} and {child} are going to play group.' },
        { scene: 'arrive', text: 'When they get there, {helper} will say hello.', say: { who: 'child', words: 'Hi {helper}!' } },
        { scene: 'blocks', text: '{child} can play with all the toys.' },
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
    siblings: { label: 'Brothers and sisters', blurb: 'Sharing, squabbles, a big breath, sorry', needs: 'sibling', story: {
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
    playdate: { label: 'A playdate', blurb: 'A friend\u2019s house, sharing, taking turns, a break', needs: 'friend', story: {
      title: '{child}\u2019s Playdate', ending: 'Playdates are fun!', steps: [
        { scene: 'goto', place: '{friend}\u2019s house', text: 'Today {child} is going to {friend}\u2019s house to play.' },
        { scene: 'share', with: 'friend', text: '{child} and {friend} can play with the toys together.', say: { who: 'friend', words: 'Hi {child}!' } },
        { scene: 'tug', with: 'friend', text: 'Sometimes they both want the same toy. That\u2019s OK.' },
        { scene: 'share', with: 'friend', text: 'They can take turns. First {friend}, then {child}.', say: { who: 'child', words: 'Your turn!' } },
        { scene: 'breathe', text: 'If {child} needs a break, {they} can find {adult} for a quiet minute.' },
        { scene: 'sorry', with: 'friend', glimpse: true, text: 'Friends look after each other.' }] } },
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
  const blankCast = () => ({ child: Object.assign({}, K.KID_DEF), adult: Object.assign({}, K.ADULT_DEF), helper: Object.assign({}, K.HELPER_DEF), helperOn: true, baby: Object.assign({}, K.BABY_DEF), babyOn: false, siblings: [], friends: [], pets: [] });
  let S = load() || { cast: blankCast(), story: null, music: 'morning-mood', step: 0, touched: false };
  migrate();
  if (!S.story) S.story = fromTemplate('playgroup');
  function migrate() {
    const c = S.cast;
    if (!c.baby) Object.assign(c, { baby: Object.assign({}, K.BABY_DEF), babyOn: false });
    if (!Array.isArray(c.siblings)) c.siblings = c.siblingOn && c.sibling ? [c.sibling] : [];
    if (!Array.isArray(c.friends)) c.friends = [];
    if (!Array.isArray(c.pets)) c.pets = [];
    delete c.sibling; delete c.siblingOn;
  }
  function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.cast && v.story ? v : null; } catch (e) { return null; } }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 250); }
  function castFor() { return { child: S.cast.child, adult: S.cast.adult, helper: S.cast.helperOn ? S.cast.helper : { name: '' }, siblings: S.cast.siblings || [], friends: S.cast.friends || [], pets: S.cast.pets || [], baby: S.cast.babyOn ? S.cast.baby : {} }; }
  function fromTemplate(key) {
    const need = TEMPLATES[key].needs;
    if (need === 'sibling' && !S.cast.siblings.length) S.cast.siblings.push(Object.assign({}, K.SIB_DEF));
    else if (need === 'friend' && !S.cast.friends.length) S.cast.friends.push(Object.assign({}, K.FRIEND_DEF));
    else if (need) S.cast[need] = true;
    const t = TEMPLATES[key].story, c = castFor(), boy = sexOf(S.cast.child) === 'm', girl = sexOf(S.cast.child) === 'f';
    const pro = s => s.replace(/\{their\}/g, boy ? 'his' : girl ? 'her' : 'their').replace(/\{they\}/g, boy ? 'he' : girl ? 'she' : 'they').replace(/\{s\}/g, boy || girl ? 's' : '').replace(/\{bigsib\}/g, boy ? 'brother' : girl ? 'sister' : 'helper').replace(/\{themself\}/g, boy ? 'himself' : girl ? 'herself' : 'themself');
    const n = s => s == null ? s : pro(K.names(s, c));
    const cap = x => x && x[0].toUpperCase() + x.slice(1);
    return { kind: key, endScene: t.endScene || '', title: cap(n(t.title)), ending: n(t.ending), steps: t.steps.map(st => ({ id: uid(), scene: st.scene, with: st.with || '', place: n(st.place || ''), time: st.time || '', text: n(st.text), glimpse: !!st.glimpse, say: st.say ? { who: st.say.who, words: n(st.say.words) } : { who: 'child', words: '' } })) };
  }
  // a shared link carries the cast and the story (never the recordings)
  function readShare() {
    const m = location.hash.match(/^#s[.=]([A-Za-z0-9_-]+)/); if (!m) return;
    try {
      const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
      const v = JSON.parse(json); if (v.cast && v.story) { S = Object.assign({ music: 'morning-mood', step: 0 }, v); migrate(); save(); }
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
  function capLine(buf) { if (!buf || buf.duration <= MAX_LINE + 0.3) return [buf, false]; return [slice(buf, 0, MAX_LINE), true]; }
  async function setVoice(id, buf) { let cut; [buf, cut] = capLine(buf); if (cut) micErr(`That line was longer than ${MAX_LINE} seconds, so the end was cut off. Try saying it a bit shorter.`); voices[id] = buf; await idbPut(id, buf ? wavBlob(buf) : null); refresh(); renderVoice(); }

  // ---------------------------------------------------------------- the film
  const stage = $('#stage'), sctx = stage.getContext('2d');
  let TL = null;
  const voiceLens = () => Object.fromEntries(Object.entries(voices).filter(([, b]) => b).map(([k, b]) => [k, b.duration]));
  function refresh() { TL = K.timeline(S.story, voiceLens()); $('#scrub').max = 1000; $('#lenMeta').textContent = `${fmt(TL.total)} long`; $('#storyMeta').textContent = `${S.story.steps.length} of ${MAX_STEPS} steps \u00b7 about ${fmt(TL.total)}${TL.total > MAX_FILM ? ` (over the ${fmt(MAX_FILM)} limit)` : ''}`; $('#storyMeta').classList.toggle('over', TL.total > MAX_FILM); $('#addStep').disabled = S.story.steps.length >= MAX_STEPS; $('#addCalm').disabled = S.story.steps.length > MAX_STEPS - 3; if (!playing) draw(pos); save(); }
  // ---- the demo films: a made-up mum and daughter, on the little phones at the top
  const DEMOS = K.DEMOS;
  for (const d of Object.values(DEMOS)) d.tl = K.timeline(d.story, d.voice ? Object.fromEntries(Object.entries(d.voice).map(([k, v]) => [k, v[1]])) : {});
  const minis = $$('.mini[data-demo]').map(b => ({ b, d: DEMOS[b.dataset.demo], cv: b.querySelector('canvas') }));
  let miniVis = true, still = false, miniT0 = performance.now();
  try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { new IntersectionObserver(es => { miniVis = es[0].isIntersecting; }).observe($('.duo')); } catch (e) {}
  // the two little phones take turns: one plays a scene while the other holds its last frame, then they swap.
  // each phone still plays its own film in order, scene by scene with straight cuts that skip the fades
  function sceneWins(tl) { return tl.items.slice(1, -1).map(i => [i.start + Math.min(i.kind === 'g' ? 1.6 : 1.1, i.d * 0.3), i.start + i.d - Math.min(0.35, i.d * 0.1)]); }
  function makeDuo(phones) {
    phones.forEach(p => { p.wins = sceneWins(p.tl); p.i = Math.min(p.from || 0, p.wins.length - 1); const w = p.wins[p.i]; p.tIn = Math.min(1.5, (w[1] - w[0]) * 0.4); p.hold = w[0] + p.tIn; });
    // every turn is the same length; a phone that hands over mid-scene picks up from the same spot next time
    let on = 0, turn = 0; const TURN = 5.5;
    const mark = () => phones.forEach((p, k) => p.el.classList.toggle('on', k === on));
    mark();
    return function step(dt) {
      const p = phones[on]; let w = p.wins[p.i];
      p.tIn += dt; turn += dt;
      if (w[0] + p.tIn >= w[1]) { p.i = (p.i + 1) % p.wins.length; p.tIn = 0; w = p.wins[p.i]; }
      p.hold = Math.min(w[0] + p.tIn, w[1]);
      if (turn >= TURN) { on = (on + 1) % phones.length; turn = 0; mark(); }
      phones.forEach(q => q.draw(q.hold));
    };
  }
  function drawDemo(ctx, cv, d, T) { ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); K.frame(ctx, d.cast, d.story, d.tl, Math.min(T, d.tl.total - 0.01)); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  let miniStep = null, miniLast = 0;
  function miniLoop(now) {
    if (!miniStep) miniStep = makeDuo(minis.map(m => ({ el: m.b, tl: m.d.tl, from: 2, draw: T => drawDemo(m.cv.getContext('2d'), m.cv, m.d, T) })));
    const dt = miniLast ? Math.min(0.1, (now - miniLast) / 1000) : 0; miniLast = now;
    if (miniVis && $('#watch').hidden) miniStep(still ? 0 : dt);
    if (!still) requestAnimationFrame(miniLoop);
  }
  // ---- little snapshots from the kids films, tilted like photos on the fridge
  const SNAPS = { hero: [['bike_ride', 'Learning to ride'], ['bath', 'Bath time'], ['haircut', 'First haircut'], ['dentist_chair', 'The dentist'], ['sleep', 'Bedtime']],
    foot: [['food_bite', 'Trying new food'], ['share', 'Taking turns'], ['baby_gentle', 'A new baby']] };
  const snapSrc = document.createElement('canvas'); snapSrc.width = 360; snapSrc.height = 640;
  $$('[data-snaps]').forEach(box => (SNAPS[box.dataset.snaps] || []).forEach(([key, label]) => {
    const fig = document.createElement('figure'); fig.className = 'snap';
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 400;
    const cap = document.createElement('figcaption'); cap.textContent = label; fig.append(cv, cap); box.append(fig);
    const sx = snapSrc.getContext('2d'); sx.setTransform(snapSrc.width / W, 0, 0, snapSrc.width / W, 0, 0);
    try { K.still(sx, DEMOS.playgroup.cast, key, '', 'friend'); } catch (e) {}
    sx.setTransform(1, 0, 0, 1, 0, 0);
    // the bottom of the frame, where the people are
    const cw = snapSrc.width * 0.84, ch = cw * 5 / 4; cv.getContext('2d').drawImage(snapSrc, (snapSrc.width - cw) / 2, snapSrc.height - ch - 34, cw, ch, 0, 0, cv.width, cv.height);
  }));

  // tapping a little phone opens it bigger, with music
  const dStage = $('#demoStage'), dctx = dStage.getContext('2d');
  let cur = DEMOS.playgroup, demoAt = 0, demoPlaying = false, demoDrag = false, demoLast = 0, demoMusic = null, demoT0 = 0, demoNodes = [];
  const demoVoiceBufs = {};
  async function loadDemoVoices(d) {
    if (!d.voice) return {}; const out = {};
    await Promise.all(Object.entries(d.voice).map(async ([id, [url]]) => {
      if (!demoVoiceBufs[url]) { try { const r = await fetch(url); demoVoiceBufs[url] = await decodeAB(await r.arrayBuffer()); } catch (e) { demoVoiceBufs[url] = null; } }
      out[id] = demoVoiceBufs[url];
    }));
    return out;
  }
  function demoLabel() { $('#demoPlay').textContent = demoPlaying ? 'Pause' : 'Play'; $('#demoSound').textContent = demoMusic ? 'Sound off' : '\ud83d\udd0a Sound on'; }
  function demoSoundOff() { demoNodes.forEach(n => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); demoNodes = []; demoMusic = null; demoLabel(); }
  // music plus any recorded voice, with the music dropping down while someone is talking; the film follows the audio clock
  async function demoSoundOn() {
    if (playing) stop();
    const ctx = ac(); await ctx.resume().catch(() => {});
    const d = cur, [mb, vb] = await Promise.all([loadMusic(d.music || 'morning-mood'), loadDemoVoices(d)]);
    if ($('#watch').hidden || d !== cur) { demoLabel(); return; }
    demoSoundOff();
    const from = demoAt, now = ctx.currentTime + 0.05; demoT0 = now - from;
    const tl = d.tl, voiced = Object.keys(vb).length > 0, base = 0.45;
    if (mb) {
      // with a voice, the music sits at one steady low level (evened out so it never swells over the voice) instead of dipping in and out
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = mb; src.loop = true;
      if (voiced) { const c = ctx.createDynamicsCompressor(); c.threshold.value = -30; c.knee.value = 10; c.ratio.value = 6; c.attack.value = 0.05; c.release.value = 0.4; src.connect(c); c.connect(g); demoNodes.push(c); } else src.connect(g);
      g.connect(ctx.destination); g.gain.setValueAtTime(voiced ? 0.22 : base, now);
      src.start(now, from % mb.duration); demoNodes.push(src, g);
    }
    tl.items.forEach(it => {
      const b = vb[it.id]; if (!b) return; const at = it.start + it.voiceAt, off = from - at; if (off >= b.duration) return;
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); off > 0 ? src.start(now, off) : src.start(demoT0 + at); demoNodes.push(src);
    });
    demoMusic = true; demoPlaying = true; demoLabel();
  }
  function watchLoop(now) {
    if ($('#watch').hidden) return;
    const dt = demoLast ? Math.min(0.1, (now - demoLast) / 1000) : 0; demoLast = now;
    if (demoPlaying && !demoDrag) {
      if (demoMusic) demoAt = ac().currentTime - demoT0; else demoAt += dt;
      if (demoAt >= cur.tl.total) { demoAt = 0; if (demoMusic) demoSoundOn(); }
    }
    drawDemo(dctx, dStage, cur, Math.max(0, demoAt));
    $('#demoBar').style.width = (100 * Math.min(1, Math.max(0, demoAt) / cur.tl.total)).toFixed(2) + '%';
    requestAnimationFrame(watchLoop);
  }
  function openWatch(key) {
    cur = DEMOS[key]; demoAt = 0; demoPlaying = true; demoLast = 0;
    $('#watchTitle').textContent = 'Demo film \u00b7 ' + ({ playgroup: 'Ava goes to playgroup', doctor: 'Theo goes to the doctor' }[key] || cur.story.title); $('#watch').hidden = false;
    demoLabel(); requestAnimationFrame(watchLoop); demoSoundOn();
  }
  function closeWatch() { $('#watch').hidden = true; demoPlaying = false; demoSoundOff(); }
  minis.forEach(m => m.b.addEventListener('click', () => openWatch(m.b.dataset.demo)));
  $('#watchClose').addEventListener('click', closeWatch);
  $('#watch').addEventListener('click', e => { if (e.target.id === 'watch') closeWatch(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#watch').hidden) closeWatch(); });
  $('#demoPlay').addEventListener('click', () => { if (demoPlaying) { demoPlaying = false; demoSoundOff(); } else { demoPlaying = true; demoSoundOn(); } demoLabel(); });
  $('#demoSound').addEventListener('click', () => { demoMusic ? demoSoundOff() : (demoPlaying = true, demoSoundOn()); });
  dStage.addEventListener('click', () => $('#demoPlay').click());
  function demoSeek(e) { const r = $('#demoSeek').getBoundingClientRect(); demoAt = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * cur.tl.total * 0.999; }
  $('#demoSeek').addEventListener('pointerdown', e => { demoDrag = true; $('#demoSeek').setPointerCapture(e.pointerId); demoSeek(e); });
  $('#demoSeek').addEventListener('pointermove', e => { if (demoDrag) demoSeek(e); });
  ['pointerup', 'pointercancel'].forEach(ev => $('#demoSeek').addEventListener(ev, () => { if (demoDrag && demoMusic) demoSoundOn(); demoDrag = false; }));
  $('#demoSeek').addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { demoAt = Math.max(0, Math.min(cur.tl.total - 0.1, demoAt + (e.key === 'ArrowRight' ? 3 : -3))); e.preventDefault(); } });

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
  async function play(from = pos, out = null) { if (from >= TL.total - 0.05) from = 0; stop(); demoSoundOff(); playing = true; pos = from; $('#playBtn').textContent = 'Pause'; await startAudio(from, out); raf = requestAnimationFrame(tick); }
  function stop() { playing = false; cancelAnimationFrame(raf); stopAudio(); $('#playBtn').textContent = 'Play'; }
  function showPos() { $('#scrub').value = Math.round(1000 * pos / TL.total); $('#timeLbl').textContent = fmt(pos); }
  $('#playBtn').addEventListener('click', () => { playing ? (stop(), draw(pos)) : play(); });
  $('#scrub').addEventListener('input', e => { const was = playing; stop(); pos = (e.target.value / 1000) * TL.total; draw(pos); showPos(); if (was) play(pos); });
  // jump the preview to a step while editing it
  function seekTo(id) { if (!TL) return; const it = TL.items.find(i => i.id === id); if (!it) return; stop(); pos = it.start + Math.min(2.4, it.d * 0.55); draw(pos); showPos(); }

  // ---------------------------------------------------------------- steps (the four panels)
  const STEP_NAMES = ['Who’s in it', 'The story', 'Your voice', 'Watch and save'];
  function go(n, quiet) {
    // like the grown-up builder: a step opens once the one before it is done
    n = Math.max(0, Math.min(3, n)); if (S.reached == null) S.reached = S.step || 0; if (n > S.reached) return;
    S.step = n; save();
    $$('#panels > .panel').forEach(p => p.hidden = +p.dataset.step !== S.step);
    $$('#steps button').forEach((b, i) => { b.setAttribute('aria-current', i === S.step ? 'step' : 'false'); b.disabled = i > S.reached; b.title = i > S.reached ? 'Finish the steps before this one first' : ''; b.classList.toggle('done', i < S.reached && i !== S.step); });
    if (S.step === 1) renderStory(); if (S.step === 2) renderVoice(); if (S.step === 0) renderCast();
    if (!quiet && window.innerWidth < 860) $('#steps').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  $('#steps').append(...STEP_NAMES.map((n, i) => el('button', { type: 'button', onclick: () => go(i) }, el('span', { class: 'n' }, String(i + 1)), n)));
  $$('[data-next]').forEach(b => b.addEventListener('click', () => { S.reached = Math.max(S.reached || 0, S.step + 1); go(S.step + 1); }));
  $$('[data-prev]').forEach(b => b.addEventListener('click', () => go(S.step - 1)));

  // ---------------------------------------------------------------- cast
  // fixed people (the child, who goes with them, someone they'll meet, a baby) and lists you can add to
  const ONE = [
    { key: 'child', kind: 'child', title: 'The child', q: 'Their name', ph: 'e.g. Noah' },
    { key: 'adult', kind: 'adult', title: 'Going with them', q: 'What the child calls them', ph: 'e.g. Mumma or Dad' },
    { key: 'helper', kind: 'helper', title: 'Someone they’ll meet', q: 'Their name', ph: 'e.g. Vicky, or Dr Lee', on: 'helperOn' },
    { key: 'baby', kind: 'baby', title: 'A baby', q: 'Their name', ph: 'e.g. Ollie', on: 'babyOn' }];
  const MANY = [
    { list: 'siblings', kind: 'sibling', title: 'Brothers and sisters', one: 'Brother or sister', add: 'Add a brother or sister', ph: 'e.g. Ruby', max: 4, make: () => Object.assign({}, K.SIB_DEF) },
    { list: 'friends', kind: 'friend', title: 'Friends', one: 'Friend', add: 'Add a friend', ph: 'e.g. Ava', max: 4, make: () => Object.assign({}, K.FRIEND_DEF, { hair: ['curly', 'short', 'ponytail', 'bun'][S.cast.friends.length % 4], top: ['#E9A23B', '#6FA8DC', '#9B6FB5', '#5FA88F'][S.cast.friends.length % 4] }) },
    { list: 'pets', kind: 'pet', title: 'Pets', one: 'Pet', add: 'Add a pet', ph: 'e.g. Pawsha', max: 3, make: () => ({ type: 'dog', name: '', coat: '#A14F26', ears: 'floppy', size: 'm', muzzle: 'dark' }) }];
  // age in years: 2 to 5 are drawn little, 6 to 11 as a kid, 12 and up as a teenager
  const AGES = Array.from({ length: 15 }, (_, i) => i + 2);
  const sizeFor = y => y <= 5 ? 'little' : y <= 11 ? 'kid' : 'teen';
  const ageOf = L => L.years || ({ little: 4, kid: 8, teen: 13 }[L.age] || 4);
  function setAge(L, y) { L.years = y; L.age = sizeFor(y); }
  const portraits = [];
  const isKid = kind => kind === 'child' || kind === 'sibling' || kind === 'friend';
  // one card: a picture to tap, a name, an age for kids, the look editor, and remove or include
  function personCard({ L, kind, title, q, ph, id, on, onRemove, roleKey }) {
    const off = on && !S.cast[on], cv = el('canvas', { width: 192, height: 240, role: 'button', tabindex: '0', 'aria-label': `Change how ${(L.name || title).toLowerCase()} looks` });
    const open = () => { if (!off) openLook(L, kind, title, roleKey); };
    cv.addEventListener('click', open); cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    const right = on ? el('label', { class: 'switch' }, el('input', { type: 'checkbox', id: on, checked: !!S.cast[on], onchange: e => { S.cast[on] = e.target.checked; renderCast(); refresh(); } }), 'Include')
      : onRemove ? el('button', { class: 'iconbtn', type: 'button', onclick: onRemove, 'aria-label': `Remove ${L.name || title}` }, 'Remove') : null;
    const card = el('div', { class: 'card' },
      el('div', { class: 'subhead' }, el('h3', {}, title), right),
      el('div', { class: 'who' }, cv, el('div', { class: 'fields' },
        el('label', { class: 'q' }, q || 'Their name', el('input', { type: 'text', id: `name-${id}`, value: L.name || '', placeholder: ph, maxlength: '24', disabled: off, oninput: e => { if (roleKey) renameIn(roleKey, L.name, e.target.value); L.name = e.target.value; refresh(); } })),
        isKid(kind) ? el('label', { class: 'q' }, 'Age', el('select', { id: `age-${id}`, disabled: off, onchange: e => { setAge(L, +e.target.value); refresh(); drawPortraits(0); } }, AGES.map(a => el('option', { value: a, selected: ageOf(L) === a }, a === 16 ? '16+' : String(a))))) : null,
        kind === 'pet' ? el('label', { class: 'q' }, 'Type', el('select', { id: `type-${id}`, onchange: e => { L.type = e.target.value; refresh(); drawPortraits(0); } }, [['dog', 'Dog'], ['cat', 'Cat']].map(([v, n]) => el('option', { value: v, selected: L.type === v }, n)))) : null,
        el('button', { class: 'linkbtn', type: 'button', onclick: open, disabled: off }, 'Change their look'))));
    if (off) card.style.opacity = '0.55';
    portraits.push([cv, L, kind]);
    return card;
  }
  function renderCast() {
    const box = $('#cast'); box.innerHTML = ''; portraits.length = 0;
    ONE.forEach(o => box.append(personCard({ L: S.cast[o.key], kind: o.kind, title: o.title, q: o.q, ph: o.ph, id: o.key, on: o.on, roleKey: o.key })));
    MANY.forEach(m => {
      const arr = S.cast[m.list];
      arr.forEach((L, i) => box.append(personCard({ L, kind: m.kind, title: arr.length > 1 ? `${m.one} ${i + 1}` : m.one, ph: m.ph, id: `${m.kind}${i}`, roleKey: m.kind === 'sibling' && i === 0 ? 'sibling' : null,
        onRemove: () => { arr.splice(i, 1); renderCast(); refresh(); } })));
    });
    box.append(el('div', { class: 'card addrow' }, el('h3', {}, 'Anyone else?'), el('p', { class: 'meta' }, 'Add the people and pets in the child’s life. Friends show up as the other kids in scenes like playgroup and kinder.'),
      el('div', { class: 'row' }, MANY.map(m => el('button', { class: 'btn ghost small', type: 'button', id: `add-${m.kind}`, disabled: S.cast[m.list].length >= m.max, onclick: () => { S.cast[m.list].push(m.make()); renderCast(); refresh(); const ins = $$(`#cast input[id^="name-${m.kind}"]`); if (ins.length) ins[ins.length - 1].focus(); } }, m.add)))));
    drawPortraits(0);
  }
  // a new name flows through the story: the old name (or the stand-in) is swapped wherever it appears
  const STAND_IN = { child: 'the child', adult: 'Mum', helper: 'a friend', baby: 'the baby' };
  const standIn = role => role === 'adult' ? ({ m: 'Dad', f: 'Mum', x: 'their grown-up' }[sexOf(S.cast.adult)]) : role === 'sibling' ? ({ m: 'their brother', f: 'their sister', x: 'their sibling' }[sexOf(S.cast.siblings[0] || {})]) : STAND_IN[role];
  function renameIn(role, oldName, newName) {
    const from = (oldName || '').trim() || standIn(role), to = newName.trim() || standIn(role);
    swapName(from, to);
  }
  function swapName(from, to) {
    if (!from || !to || from === to) return;
    const re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    const sw = t => typeof t === 'string' ? t.replace(re, m => (m[0] === m[0].toUpperCase() && to[0] ? to[0].toUpperCase() + to.slice(1) : to)) : t;
    S.story.title = sw(S.story.title); S.story.ending = sw(S.story.ending);
    S.story.steps.forEach(st => { st.text = sw(st.text); st.place = sw(st.place); if (st.say) st.say.words = sw(st.say.words); });
  }
  function drawPortraits(t) { portraits.forEach(([cv, L, kind]) => { const c = cv.getContext('2d'); K.portraitOf(c, cv.width, cv.height, L, kind, t); }); }

  // look editor
  const SKIN = ['#F6D7C3', '#F2CBAE', '#E8BA99', '#D6A27C', '#C98E66', '#A86F4C', '#8A5434', '#5E3A26'];
  const HAIRC = ['#1F1A17', '#3B2A20', '#6B4528', '#A47A55', '#C9A060', '#E2C27E', '#B5523A', '#9A9A9A'];
  const CLOTH = ['#D94B3F', '#E9A23B', '#F2C46F', '#5FA88F', '#4F86C6', '#30406E', '#9B6FB5', '#F7F3EC', '#2B2B30', '#4D6E9C'];
  const COATS = ['#A14F26', '#1F1A17', '#F2E6D0', '#C9A060', '#7A6A5A', '#E2C27E', '#9A9A9A', '#5E3A26'];
  const HAIR_KID = [['mop', 'Ear length'], ['short', 'Short'], ['curly', 'Curly'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['braids', 'Braids'], ['afro', 'Afro']];
  const HAIR_AD = [['long', 'Long'], ['wavy', 'Wavy'], ['curly', 'Curly'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['braids', 'Braids'], ['short', 'Short'], ['fade', 'Fade'], ['afro', 'Afro'], ['buzz', 'Buzz cut'], ['bald', 'Bald']];
  let lookRaf = 0;
  function openLook(L, kind, title, roleKey) {
    const kid = isKid(kind), f = $('#lookFields');
    $('#lookEdTitle').textContent = (L.name || title) + '’s look';
    const pressSet = e => e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    const seg = (label, key, opts, redraw) => el('div', { class: 'field' }, el('span', {}, label), el('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(([v, n]) => el('button', { type: 'button', 'aria-pressed': String((key === 'sex' ? sexOf(L) : L[key] || false) === v), onclick: e => { pressSet(e); set(key, v); if (redraw) fields(); } }, n))));
    const sw = (label, key, cols) => el('div', { class: 'field' }, el('span', {}, label), el('div', { class: 'sw' }, cols.map(c => el('button', { type: 'button', 'aria-label': c, 'aria-pressed': String((L[key] || '').toLowerCase() === c.toLowerCase()), style: `background:${c}`, onclick: e => { pressSet(e); set(key, c); } })), el('input', { type: 'color', value: L[key] || '#888888', 'aria-label': `Other ${label.toLowerCase()} colour`, oninput: e => set(key, e.target.value) })));
    function set(key, v) {
      if (key === 'sex') {
        const was = roleKey && roleKey !== 'child' && !(L.name || '').trim() ? standIn(roleKey) : null;
        L.sex = v; L.body = v === 'm' ? 'm' : 'f';
        if (v === 'm' && L.hair === 'long' && !kid) L.hair = 'short';
        if (v !== 'f' && L.outfit === 'dress') L.outfit = 'tee';
        if (v !== 'm') L.facial = 'none';
        if (was) swapName(was, standIn(roleKey));
      } else L[key] = v;
      if (key === 'hairCol') L.facialCol = v;
      if (key === 'facial') L.facialCol = L.hairCol;
      if (L.outfit === 'dress' && !kid) L.inner = L.top;
      refresh();
    }
    function fields() {
      const box = f.closest('.box'), top = box ? box.scrollTop : 0; f.innerHTML = '';
      if (kind === 'baby') { f.append(sw('Skin tone', 'skin', SKIN), sw('Hair colour', 'hairCol', HAIRC), sw('Blanket', 'blanket', CLOTH)); return; }
      if (kind === 'pet') {
        f.append(seg('Type', 'type', [['dog', 'Dog'], ['cat', 'Cat']], true), sw('Coat colour', 'coat', COATS));
        if (L.type !== 'cat') f.append(seg('Size', 'size', [['s', 'Small'], ['m', 'Medium'], [false, 'Large']]), seg('Ears', 'ears', [['floppy', 'Floppy'], ['up', 'Pointy'], ['big', 'Big']]), seg('Fur', 'fur', [[false, 'Short'], ['fluffy', 'Fluffy'], ['curly', 'Curly']]), seg('Markings', 'marking', [[false, 'None'], ['chest', 'White chest'], ['socks', 'White socks'], ['patches', 'Patches'], ['spots', 'Spots']]));
        else f.append(seg('Stripes', 'muzzle', [['dark', 'Stripes'], ['same', 'Plain']]));
        if (box) box.scrollTop = top; return;
      }
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
    const loop = now => { K.portraitOf(c, cv.width, cv.height, L, kind, (now - t0) / 1000); lookRaf = requestAnimationFrame(loop); }; lookRaf = requestAnimationFrame(loop);
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
  function sceneThumb(cv, key, place, st) { const c = cv.getContext('2d'); c.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); K.still(c, castFor(), key, place, st && st.with); c.setTransform(1, 0, 0, 1, 0, 0); }
  function renderStory() {
    $('#title').value = S.story.title || ''; $('#ending').value = S.story.ending || '';
    const list = $('#stepList'); list.innerHTML = '';
    const who = [['child', S.cast.child.name || 'The child'], ['adult', S.cast.adult.name || 'The grown-up']].concat(S.cast.helperOn ? [['helper', S.cast.helper.name || 'Their helper']] : []).concat(S.cast.siblings.length ? [['sibling', S.cast.siblings[0].name || 'Brother or sister']] : []).concat(S.cast.friends.length ? [['friend', S.cast.friends[0].name || 'Their friend']] : []);
    S.story.steps.forEach((st, i) => {
      const sc = K.SC[st.scene] || K.SC.goto, cv = el('canvas', { width: 168, height: 299 });
      const thumb = el('button', { class: 'thumb', type: 'button', 'aria-label': `Step ${i + 1} picture: ${sc.label}. Change it`, onclick: () => pickScene(st) }, cv, el('span', { class: 'chg' }, 'Change'));
      const extras = el('div', { class: 'extras' },
        sc.place ? el('label', {}, 'Sign on the building', el('input', { type: 'text', id: `place-${st.id}`, value: st.place || '', maxlength: '20', placeholder: 'e.g. Play group', oninput: e => { st.place = e.target.value; sceneThumb(cv, st.scene, st.place, st); refresh(); seekTo(st.id); } })) : null,
        el('label', {}, 'Clock shows a time', el('input', { type: 'text', id: `time-${st.id}`, value: st.time || '', maxlength: '8', placeholder: 'e.g. 9:00', inputmode: 'numeric', oninput: e => { st.time = e.target.value; refresh(); seekTo(st.id); } })),
        sc.pair && S.cast.friends.length && S.cast.siblings.length ? el('label', {}, 'The other child', el('select', { id: `with-${st.id}`, onchange: e => { st.with = e.target.value; sceneThumb(cv, st.scene, st.place, st); refresh(); seekTo(st.id); } }, [['sibling', S.cast.siblings[0].name || 'Brother or sister'], ['friend', S.cast.friends[0].name || 'Friend']].map(([v, n]) => el('option', { value: v, selected: (st.with || (S.cast.siblings.length ? 'sibling' : 'friend')) === v }, n)))) : null,
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
      sceneThumb(cv, st.scene, st.place, st);
    });
  }
  let pickFor = null;
  // which place each story belongs to, so the picture picker opens on the right scenes
  const STORY_PLACE = { playgroup: 'Playgroup room', kinder: 'Kinder or school', siblings: 'Brothers, sisters and babies', baby: 'Brothers, sisters and babies', playdate: 'Brothers, sisters and babies', doctor: 'The doctor', dentist: 'The dentist', haircut: 'Haircut', bedtime: 'Bedtime', bike: 'Learning to ride a bike', food: 'At home' };
  function pickScene(st, all) {
    pickFor = st; const g = $('#sceneGrid'); g.innerHTML = '';
    // stories made before this remembered their kind: use the place most of their steps are in
    const tally = {}; S.story.steps.forEach(x => K.PLACES.forEach(([w, keys]) => { if (w !== 'Getting there and home' && keys.includes(x.scene)) tally[w] = (tally[w] || 0) + 1; }));
    const home = STORY_PLACE[S.story.kind] || Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0], own = K.PLACES.filter(([w, keys]) => w === home || keys.includes(st.scene));
    const shown = all || !own.length ? K.PLACES : own, seen = new Set();
    shown.forEach(([where, keys]) => {
      const list = keys.filter(k => !seen.has(k) && !(k === 'arrive' && !S.cast.helperOn)); if (!list.length) return;
      g.append(el('h4', {}, where));
      list.forEach(key => {
        seen.add(key);
        const cv = el('canvas', { width: 180, height: 320 });
        g.append(el('button', { type: 'button', 'aria-pressed': String(st.scene === key), onclick: () => { st.scene = key; if (K.SC[key].place && !st.place) st.place = key === 'cafe' ? 'Cafe' : ''; $('#scenePick').hidden = true; renderStory(); refresh(); seekTo(st.id); } }, cv, el('span', {}, K.SC[key].label)));
        sceneThumb(cv, key, st.place || (key === 'cafe' ? 'Cafe' : key === 'goto' ? 'Play group' : ''), st);
      });
    });
    if (!all && shown !== K.PLACES) g.append(el('div', { class: 'more' }, el('button', { class: 'btn ghost', type: 'button', id: 'moreScenes', onclick: () => { pickScene(st, true); $('#scenePick .box').scrollTop = 0; } }, 'More scenes from other places')));
    g.append(el('div', { class: 'ask' }, el('p', {}, el('b', {}, 'Can\u2019t find the right picture?'), ' Suggest one for the library.'), el('button', { class: 'btn ghost small', type: 'button', onclick: () => openRequest(st) }, 'Suggest a new picture')));
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
    const what = $('#reqWhat').value.trim(), from = $('#reqEmail').value.trim(), st = $('#reqStatus');
    if (what.length < 12) { st.className = 'status err'; st.textContent = 'Tell us a little about the picture you\u2019d like.'; return; }
    if (from && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) { st.className = 'status err'; st.textContent = 'That email doesn\u2019t look quite right. Fix it, or leave it blank.'; return; }
    const who = [S.cast.child.name, S.cast.adult.name].filter(Boolean).join(', ') || 'not named yet';
    if (!window.MMContact) { st.className = 'status err'; st.textContent = `That didn\u2019t send. Please email ${REQ_TO}.`; return; }
    $('#reqSend').disabled = true; st.className = 'status'; st.textContent = 'Sending...';
    window.MMContact.send({ subject: 'Picture suggestion (Kids)', email: from, message: what, extra: { who: who } }).then(() => {
      st.className = 'status'; st.textContent = 'Thanks for the suggestion. We\u2019ll keep it in mind as we add new pictures.'; $('#reqWhat').value = ''; $('#reqSend').disabled = false;
    }).catch(() => { $('#reqSend').disabled = false; st.className = 'status err'; st.textContent = `That didn\u2019t send. Check your connection and try again, or email ${REQ_TO}.`; });
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
    // the easiest way: read along while the film plays, tapping Next at each new picture
    list.append(el('div', { class: 'card guidecard' },
      el('div', { class: 'subhead' }, el('h3', {}, 'Record along with the film')),
      el('p', { class: 'meta' }, 'Each picture comes up with its words underneath. Read them, tap Next, and the next picture appears. Your voice is matched to each picture as you go.'),
      el('div', { class: 'row' }, el('button', { class: 'btn coral', type: 'button', id: 'guideOpen', onclick: openGuide }, 'Record along with the film'))));
    // one recording of the whole story, split at the pauses
    list.append(el('div', { class: 'card' },
      el('div', { class: 'subhead' }, el('h3', {}, 'Already recorded it somewhere else?')),
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
    setTimeout(() => { if (recId === id) stopRec(); }, (MAX_LINE + 0.5) * 1000);
  }
  function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
  // ---- record along with the film: one recording, with a mark each time they tap Next
  let G = null;
  function openGuide() {
    stop(); micErr('');
    const ls = lines().filter(l => l.words && (l.id !== 'title' || S.titleRead));
    if (!ls.length) return;
    G = { ls, i: 0, marks: [], rec: null, chunks: [], t0: 0, shown: performance.now(), raf: 0, stream: null };
    $('#guide').hidden = false; guideShow(); $('#guideGo').textContent = 'Start recording'; $('#guideGo').focus();
    const cv = $('#guideStage'), c = cv.getContext('2d');
    const loop = now => { if (!G) return; const it = TL.items.find(x => x.id === G.ls[G.i].id) || TL.items[0]; const T = it.start + Math.min(it.d - 0.05, ((now - G.shown) / 1000) % Math.max(1, it.d)); c.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0); K.frame(c, castFor(), S.story, TL, T); c.setTransform(1, 0, 0, 1, 0, 0); G.raf = requestAnimationFrame(loop); };
    G.raf = requestAnimationFrame(loop);
  }
  function guideShow() {
    const l = G.ls[G.i];
    $('#guideCount').textContent = `Line ${G.i + 1} of ${G.ls.length} \u00b7 ${l.note}`;
    $('#guideLine').textContent = l.words;
    G.shown = performance.now();
  }
  function guideClose() { if (!G) return; cancelAnimationFrame(G.raf); if (G.rec && G.rec.state !== 'inactive') { G.cancel = true; G.rec.stop(); } if (G.stream) G.stream.getTracks().forEach(t => t.stop()); G = null; $('#guide').hidden = true; }
  $('#guideCancel').addEventListener('click', guideClose);
  $('#guideGo').addEventListener('click', async () => {
    if (!G) return; const btn = $('#guideGo');
    if (!G.rec) {
      try { G.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { $('#guideStatus').textContent = 'The microphone isn\u2019t available. Allow microphone access for this site, or upload a recording instead.'; return; }
      G.rec = new MediaRecorder(G.stream); G.rec.ondataavailable = e => e.data.size && G.chunks.push(e.data);
      G.rec.onstop = guideDone; G.rec.start(); G.t0 = performance.now(); G.marks = [0];
      $('#guideStatus').innerHTML = ''; $('#guideStatus').append(el('span', { class: 'recdot' }), ' Recording. Read the words, then tap Next.');
      guideShow(); btn.textContent = G.ls.length > 1 ? 'Next' : 'Finish'; return;
    }
    G.marks.push((performance.now() - G.t0) / 1000);
    if (G.i < G.ls.length - 1) { G.i++; guideShow(); btn.textContent = G.i === G.ls.length - 1 ? 'Finish' : 'Next'; }
    else { btn.disabled = true; $('#guideStatus').textContent = 'Saving your recording\u2026'; G.rec.stop(); }
  });
  async function guideDone() {
    const g = G; if (!g || g.cancel) return;
    if (g.stream) g.stream.getTracks().forEach(t => t.stop());
    let buf; try { buf = await decode(new Blob(g.chunks, { type: g.rec.mimeType })); } catch (e) { $('#guideStatus').textContent = 'That recording couldn\u2019t be read. Try again.'; $('#guideGo').disabled = false; return; }
    // the recorder can start a moment late, so marks are measured from the end of the audio backwards
    const shift = Math.max(0, g.marks[g.marks.length - 1] - buf.duration);
    let cutAny = false;
    for (let i = 0; i < g.ls.length; i++) {
      const a = Math.max(0, g.marks[i] - shift), b = Math.min(buf.duration, g.marks[i + 1] - shift);
      if (b - a < 0.2) continue;
      let line = trim(slice(buf, a, b)), cut; [line, cut] = capLine(line); cutAny = cutAny || cut;
      voices[g.ls[i].id] = line; await idbPut(g.ls[i].id, wavBlob(line));
    }
    cancelAnimationFrame(g.raf); G = null; $('#guide').hidden = true; $('#guideGo').disabled = false;
    refresh(); renderVoice();
    const st = $('#wholeStatus'); if (st) { st.className = 'status'; st.textContent = `Recorded ${g.ls.length} lines. Tap Listen on any line to check it, and redo it on its own if you need to.` + (cutAny ? ` Lines longer than ${MAX_LINE} seconds had their ends cut off.` : ''); }
  }

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
    let cutAny = false; for (let i = 0; i < n; i++) { const [a, b] = groups[i]; let cut; [voices[ls[i].id], cut] = capLine(slice(buf, Math.max(0, a - 0.12), Math.min(buf.duration, b + 0.25))); cutAny = cutAny || cut; await idbPut(ls[i].id, wavBlob(voices[ls[i].id])); }
    refresh(); renderVoice(); const s2 = $('#wholeStatus'); s2.textContent = `Split into ${n} lines. Tap Listen on each to check it.` + (cutAny ? ` One or more lines were longer than ${MAX_LINE} seconds, so their ends were cut off.` : '');
  }

  // ---------------------------------------------------------------- save the film
  let resultBlob = null, resultExt = 'webm';
  $('#recBtn').addEventListener('click', async () => {
    if (TL.total > MAX_FILM) { $('#recStatus').className = 'status err'; $('#recStatus').textContent = `Your film is ${fmt(TL.total)} long. Films can be up to ${fmt(MAX_FILM)}, so go back and remove a step or shorten a recording.`; return; }
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
    S.story = fromTemplate('blank'); S.reached = 1; go(1); refresh();
  }));
  $('#copyLink').addEventListener('click', async () => { const link = shareLink(), st = $('#copyStatus'); try { await navigator.clipboard.writeText(link); st.textContent = 'Copied.'; } catch (e) { st.textContent = link; } });

  // clear everything: people, story, recordings
  $('#resetAll').addEventListener('click', () => ask('Clear everything and start again?', 'This clears your people, your story and your recordings on this device. Videos you\u2019ve already saved aren\u2019t affected.', async () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    try { const all = await idbAll(); for (const id of Object.keys(all)) await idbPut(id, null); } catch (e) {}
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    location.reload();
  }));

  // ---------------------------------------------------------------- start
  readShare();
  (async () => {
    const saved = await idbAll();
    for (const [id, blob] of Object.entries(saved)) { try { voices[id] = await decode(blob); } catch (e) {} }
    if (document.fonts && document.fonts.load) { try { await Promise.race([Promise.all([document.fonts.load('700 50px Poppins'), document.fonts.load('italic 500 50px Poppins'), document.fonts.load('italic 400 50px Poppins')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} }
    refresh(); go(S.step || 0, true); requestAnimationFrame(miniLoop);
    pos = Math.min(2.6, TL.total); draw(pos); showPos();
    let t = 0; const idle = () => { t += 1 / 30; if (S.step === 0 && !$('#cast').hidden) drawPortraits(t); setTimeout(() => requestAnimationFrame(idle), 33); }; idle();
  })();
  window.MMKIDS = { state: () => S, refresh, shareLink, voices };
})();
