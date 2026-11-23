import './style.css';
import {
  BRAND, OWNER, IMAGES, SERVICES, WORKS, SKILLS, TOOLS, PACKS, PACK_NOTE, STATS, BACKGROUND, CAREER,
  PROCESS, REMINDERS, PAYMENT, LICENSE, PLEDGES, CONTACTS,
} from './config.js';
import { COUNTRIES, flag } from './countries.js';
import { auth, db, googleProvider } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, limitToLast,
  serverTimestamp, writeBatch, increment,
} from 'firebase/firestore';

/* ================================================================== helpers */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const ownerEmail = OWNER.email.trim().toLowerCase();
const toDate = (ts) => (ts && ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null);
const fmtTime = (ts) => {
  const d = toDate(ts); if (!d) return '';
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3400);
}
// A labeled box that shows WHERE to put an image until the file exists
function slot(src, extra = '') {
  return `<div class="slot"><div class="slot-ph"><b>Put your image here</b><code>public${esc(src)}</code></div><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />${extra}</div>`;
}
const STATUS = {
  inquiry: { label: 'Inquiry', title: 'We are talking about your project', hint: 'You sent an inquiry. I will reply in the chat soon.', next: 'Tell me what you want to create in the chat.' },
  ongoing: { label: 'Ongoing work', title: 'I am building your website', hint: 'Your website is being made. I build it first, so you pay nothing yet.', next: 'Watch the chat. I will show you the website and ask for your opinion.' },
  paid: { label: 'Paid', title: 'Payment received. Thank you!', hint: 'Your payment is confirmed.', next: 'Send me the email address for ownership. I will transfer the website to you.' },
  completed: { label: 'Handled', title: 'Your project is complete', hint: 'Everything is finished and handed over to you.', next: 'Please leave a review if I unlocked feedback for you.' },
};
const ORDER = ['inquiry', 'ongoing', 'paid', 'completed'];
const stOf = (c) => (STATUS[c?.status] ? c.status : 'inquiry');
function countTo(el, end, dec = 0) {
  if (!el) return;
  const t0 = performance.now(), from = parseFloat(el.dataset.v || '0'); el.dataset.v = end;
  (function step(now) {
    const p = Math.min((now - t0) / 900, 1), v = from + (end - from) * (1 - Math.pow(1 - p, 3));
    el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ================================================================== state */
let user = null, me = null, meLoaded = false, ready = false, isOwner = false, signingUp = false, ownerRetried = false;
let unsubs = [], shown = '', panelOpen = false, chatInView = false, feedbacks = [], authMode = 'login', fbRating = 0;
let customers = [], activeUid = null, unsubActive = null, regionF = 'all', statusF = 'all', unreadF = false;
const isOwnerEmail = () => (user?.email || '').toLowerCase() === ownerEmail;
const needsProfile = () => !!user && !isOwnerEmail() && meLoaded && !(me?.nickname && me?.countryCode);
const nick = () => me?.nickname || user?.displayName || (user?.email || 'Friend').split('@')[0];

/* ================================================================== sections + navigation */
const SECTIONS = [
  { id: 'sec-dashboard', label: 'Your dashboard', hint: 'Your status and chat with me', short: 'Dashboard', who: 'customer' },
  { id: 'sec-owner', label: 'Owner dashboard', hint: 'Customers, status and replies', short: 'Dashboard', who: 'owner' },
  { id: 'sec-about', label: 'Meet me', hint: 'Who I am and what I do', short: 'About' },
  { id: 'sec-skills', label: 'My skills', hint: 'What I can build for you' },
  { id: 'sec-works', label: 'My works', hint: 'Photos of my projects', short: 'Works' },
  { id: 'sec-rates', label: 'Rates and packages', hint: 'Pages, details and prices', short: 'Packages' },
  { id: 'sec-process', label: 'How we work', hint: 'The steps and important reminders', short: 'Process' },
  { id: 'sec-reviews', label: 'Reviews', hint: 'What customers say', short: 'Reviews' },
  { id: 'sec-career', label: 'Background and career', hint: 'My story so far' },
  { id: 'sec-payment', label: 'Payment', hint: 'Talk to me about payment' },
  { id: 'sec-trust', label: 'License and trust', hint: 'Why you can feel safe' },
  { id: 'sec-contact', label: 'Contact me', hint: 'Ways to reach me', short: 'Contact' },
];
const mySections = () => SECTIONS.filter((s) => !s.who || (s.who === 'owner') === isOwner);
function renderNav() {
  const list = mySections();
  $('#drawerNav').innerHTML = list.map((s, i) => `<a href="#" data-sec="${s.id}" style="--i:${i}"><b>${esc(s.label)}</b><small>${esc(s.hint)}</small></a>`).join('');
  $('#secNav').innerHTML = list.filter((s) => s.short).map((s) => `<a href="#" data-sec="${s.id}">${esc(s.short)}</a>`).join('');
}
function scrollToSec(id) {
  const el = $('#' + id); if (!el) return;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
let activeSec = '';
function setActiveSec(id) {
  activeSec = id;
  $$('[data-sec]').forEach((a) => { if (a.closest('#drawerNav, #secNav')) a.classList.toggle('active', a.dataset.sec === id); });
}
// "Go to the chat" buttons: scroll to the chat log and fill in a starter message
function goChat(prefill) {
  if (!user) return showAuth('signup');
  if (isOwner) return toast('This button is for customers. Your customers appear in your dashboard.');
  $('#chatCard').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  if (prefill) dashComposer.setText(prefill);
  setTimeout(() => dashComposer.focus(), reduceMotion ? 0 : 600);
}
document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-sec]');
  if (s) { e.preventDefault(); closeDrawer(); scrollToSec(s.dataset.sec); return; }
  const c = e.target.closest('[data-chat]');
  if (c) { e.preventDefault(); goChat(c.dataset.chat); }
});

/* ================================================================== static content */
function renderStatic() {
  $('#heroWord').innerHTML = [...BRAND.name].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join('');

  $('#aboutPhoto').innerHTML = slot(IMAGES.profile);
  $('#aboutText').innerHTML = `<h3>Hi, I'm ${esc(OWNER.firstName)}</h3><p>${esc(OWNER.intro)}</p>` + OWNER.bio.map((p) => `<p>${esc(p)}</p>`).join('') +
    `<div class="chips">${OWNER.roles.map((r) => `<span>${esc(r)}</span>`).join('')}</div>`;
  $('#services').innerHTML = SERVICES.map((s, i) => `<div class="glass service tilt reveal"><div class="num">${i + 1}</div><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`).join('');

  $('#skillBars').innerHTML = '<h3>What I am good at</h3>' + SKILLS.map((s) => `<div class="bar"><div class="bar-top"><span>${esc(s.name)}</span><span>${s.level}%</span></div><div class="track"><div class="fill" data-w="${s.level}"></div></div></div>`).join('');
  $('#tools').innerHTML = TOOLS.map((t) => `<span>${esc(t)}</span>`).join('');

  const cats = ['All', ...new Set(WORKS.map((w) => w.category))];
  $('#filters').innerHTML = cats.map((c, i) => `<button class="chip-btn ${i ? '' : 'active'}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  $('#gallery').innerHTML = WORKS.map((w, i) => `<button class="photo reveal" data-i="${i}" data-cat="${esc(w.category)}" aria-label="View ${esc(w.title)}">
    ${slot(w.image, `<div class="photo-cap"><b>${esc(w.title)}</b><span>${esc(w.category)}</span></div>`)}</button>`).join('');

  $('#packNote').textContent = PACK_NOTE;
  $('#packs').innerHTML = PACKS.map((p) => `<article class="rate glass tilt reveal ${p.popular ? 'popular' : ''}">${p.popular ? '<span class="pop">Most chosen</span>' : ''}
    <h3>${esc(p.name)}</h3><p class="rate-sum">${esc(p.summary)}</p>
    <div class="price">${esc(p.price)}</div><div class="per">starting price</div>
    <dl class="facts"><div><dt>Pages</dt><dd>${esc(p.pages)}</dd></div><div><dt>Best for</dt><dd>${esc(p.best)}</dd></div><div><dt>Delivery</dt><dd>${esc(p.delivery)}</dd></div></dl>
    <h4>Pages included</h4><ul>${p.pagesList.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <h4>What you get</h4><ul class="grow">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <button class="btn ${p.popular ? 'primary' : ''}" data-chat="${esc(`Hi! I am interested in the ${p.name} package (${p.pages}). I want to discuss what I want to create.`)}">Discuss this package</button></article>`).join('');

  $('#processSteps').innerHTML = PROCESS.map((s, i) => `<div class="glass p-step reveal"><div class="p-num">${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('');
  $('#reminders').innerHTML = REMINDERS.map((r) => `<aside class="glass reminder reveal ${r.important ? 'important' : ''}"><span class="tag">${esc(r.tag)}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></aside>`).join('');

  $('#bgPhoto').innerHTML = slot(IMAGES.background);
  $('#careerPhoto').innerHTML = slot(IMAGES.career);
  $('#bgTimeline').innerHTML = BACKGROUND.map((b) => `<div class="glass t-item reveal"><span class="yr">${esc(b.year)}</span><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p></div>`).join('');
  $('#careerTimeline').innerHTML = CAREER.map((b) => `<div class="glass t-item reveal"><span class="yr">${esc(b.year)} · ${esc(b.place)}</span><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p></div>`).join('');

  $('#payCard').innerHTML = `<h3>Talk to the owner about payment</h3><p>${esc(PAYMENT.intro)}</p><ul>${PAYMENT.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <button class="btn primary" data-chat="${esc(PAYMENT.message)}">${esc(PAYMENT.button)}</button>`;

  $('#trustIntro').textContent = LICENSE.intro;
  $('#licenseSlot').innerHTML = slot(IMAGES.license);
  $('#licenseInfo').innerHTML = `<h3>License and registration</h3><div class="lic-list">${LICENSE.items.map((i) => `<div><span>${esc(i.label)}</span><strong>${esc(i.value)}</strong></div>`).join('')}</div>`;
  $('#pledges').innerHTML = PLEDGES.map((p) => `<div class="glass pledge reveal"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('');

  $('#contacts').innerHTML = CONTACTS.map((c) => `<a class="glass contact-card reveal" href="${esc(c.href)}" target="_blank" rel="noopener"><div class="ini">${esc(c.label[0])}</div><div><small>${esc(c.label)}</small><strong>${esc(c.value)}</strong></div></a>`).join('');
  $('#footText').textContent = `© ${new Date().getFullYear()} ${BRAND.name} · ${BRAND.tagline}`;
  const av = `${esc(initials(OWNER.name))}<img src="${esc(IMAGES.profile)}" alt="" onerror="this.remove()" />`;
  $('#panelAvatar').innerHTML = av; $('#cdOwnerAvatar').innerHTML = av;
  renderNav();
}

/* ================================================================== router: home, auth, app (one long page) */
const currentRoute = () => (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
addEventListener('hashchange', route);
function route() {
  if (!ready) return;
  let r = currentRoute();
  if (!user) { if (r !== 'home' && r !== 'auth') r = r === 'app' ? 'auth' : 'home'; }
  else if (needsProfile()) r = 'auth';
  else r = 'app';
  if (location.hash !== '#/' + r) history.replaceState(null, '', '#/' + r);
  if (r === shown) return;
  shown = r;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'v-' + r));
  scrollTo({ top: 0, behavior: 'instant' }); closeDrawer(); observeReveals(); updateChrome();
}
function updateChrome() {
  const loggedIn = !!user && !needsProfile();
  const b = document.body;
  b.classList.toggle('is-owner', loggedIn && isOwner);
  b.classList.toggle('is-customer', loggedIn && !isOwner);
  $('#menuBtn').hidden = !loggedIn;
  $('#secNav').hidden = !loggedIn;
  $('#chatFab').hidden = !(loggedIn && !isOwner);
  $('#brandLink').setAttribute('href', loggedIn ? '#/app' : '#/home');
  if (!loggedIn) closeDrawer();
}
const openDrawer = () => { $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); setActiveSec(activeSec); };
function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); }
$('#menuBtn').onclick = openDrawer; $('#drawerClose').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
$('#drawerLogout').onclick = () => logout();
async function logout() { await signOut(auth); toast('You are logged out.'); }

/* ================================================================== photo viewer */
function openLightbox(src, cap = '') {
  $('#lbImg').src = src; $('#lbCap').textContent = cap;
  $('#imgModal').classList.add('open'); document.body.classList.add('lock');
}
function closeLightbox() { $('#imgModal').classList.remove('open'); document.body.classList.remove('lock'); $('#lbImg').removeAttribute('src'); }
$('#imgModal').addEventListener('click', (e) => { if (e.target.id === 'imgModal' || e.target.closest('[data-close]')) closeLightbox(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeDrawer(); setPanel(false); } });
document.addEventListener('click', (e) => {
  const img = e.target.closest('.chat-img'); if (img) openLightbox(img.src, 'Photo from the chat');
});
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('.chip-btn'); if (!b) return;
  $$('.chip-btn', $('#filters')).forEach((x) => x.classList.toggle('active', x === b));
  $$('.photo').forEach((w) => w.classList.toggle('hide', b.dataset.cat !== 'All' && w.dataset.cat !== b.dataset.cat));
});
$('#gallery').addEventListener('click', (e) => {
  const card = e.target.closest('.photo'); if (!card) return;
  const w = WORKS[card.dataset.i], im = $('img', card);
  if (im) openLightbox(im.src, w.title); else toast(`Add the photo at public${w.image} to show it here.`);
});

/* ================================================================== country picker */
function countryPicker(root) {
  root.innerHTML = '<div class="cp"><input type="text" placeholder="Search your country..." autocomplete="off" role="combobox" aria-expanded="false" /><ul class="cp-list" role="listbox" hidden></ul></div>';
  const input = $('input', root), list = $('ul', root);
  let sel = null, idx = -1, items = [];
  function render() {
    const q = input.value.trim().toLowerCase();
    items = COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
    idx = items.length ? 0 : -1;
    list.innerHTML = items.length ? items.map((c, i) => `<li role="option" data-i="${i}" class="${i === idx ? 'on' : ''}">${flag(c.code)}&nbsp; ${esc(c.name)}</li>`).join('') : '<li class="empty">No country found</li>';
  }
  const open = () => { render(); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.value = sel ? sel.name : ''; };
  const choose = (c) => { sel = c; input.value = c.name; list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const mark = () => $$('li', list).forEach((li, i) => { li.classList.toggle('on', i === idx); if (i === idx) li.scrollIntoView({ block: 'nearest' }); });
  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('input', () => { sel = null; open(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); idx = Math.min(idx + 1, items.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); mark(); }
    else if (e.key === 'Enter' && !list.hidden && items[idx]) { e.preventDefault(); choose(items[idx]); }
    else if (e.key === 'Escape') { list.hidden = true; }
  });
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
  return { get value() { return sel; }, set(code) { const c = COUNTRIES.find((x) => x.code === code); if (c) choose(c); }, clear() { sel = null; input.value = ''; } };
}
const picker = countryPicker($('#countryPicker'));

/* ================================================================== auth page */
function setAuthMode(m) {
  authMode = m;
  const profile = m === 'profile', signup = m === 'signup';
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === m));
  $('#authTabs').hidden = profile;
  $('#nickField').hidden = !(signup || profile);
  $('#countryField').hidden = !(signup || profile);
  $('#emailField').hidden = profile; $('#passField').hidden = profile;
  $('#googleBox').hidden = profile; $('#forgot').hidden = m !== 'login';
  $('#authBack').hidden = profile;
  $('#authSubmit').textContent = profile ? 'Save and continue' : signup ? 'Create my account' : 'Log in';
  $('#authTitle').textContent = profile ? 'Almost there!' : signup ? 'Create your account' : 'Welcome back';
  $('#authNote').textContent = profile ? 'Tell me your nickname and country to see everything.' : signup ? 'Pick a nickname and your country, then you can see everything.' : 'Log in to see my works, packages and chat with me.';
  $('#authPass').autocomplete = signup ? 'new-password' : 'current-password';
  $('#authErr').textContent = '';
}
$$('.tab').forEach((t) => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));
function showAuth(m) { setAuthMode(m); shown = ''; location.hash = '#/auth'; route(); }
$('#getStarted').onclick = () => showAuth('signup');
$('#authBack').onclick = () => { location.hash = '#/home'; };

const errText = (e) => ({
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/email-already-in-use': 'This email already has an account. Try logging in instead.',
  'auth/invalid-credential': 'Wrong email or password. Check them and try again.',
  'auth/user-not-found': 'No account with this email. Sign up first.',
  'auth/wrong-password': 'Wrong email or password. Check them and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-closed-by-user': '', 'auth/cancelled-popup-request': '',
  'auth/unauthorized-domain': 'This website address is not allowed yet. Add it in Firebase > Authentication > Settings > Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method is off. Turn it on in Firebase > Authentication > Sign-in method.',
  'permission-denied': 'Firestore blocked this. Publish the rules from firestore.rules in the Firebase console.',
}[e.code] ?? 'Something went wrong. Please try again.');

$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#authErr'), btn = $('#authSubmit'); err.textContent = '';
  const nickname = $('#authNick').value.trim(), country = picker.value;
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
  if (authMode !== 'login') {
    if (nickname.length < 2) { err.textContent = 'Enter a nickname (at least 2 letters).'; return; }
    if (!country) { err.textContent = 'Pick your country from the list.'; return; }
  }
  btn.disabled = true;
  try {
    if (authMode === 'profile') {
      await updateDoc(doc(db, 'users', user.uid), { nickname, country: country.name, countryCode: country.code });
      await updateProfile(user, { displayName: nickname });
      toast(`Welcome, ${nickname}!`);
    } else if (authMode === 'signup') {
      signingUp = true;
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: nickname });
      await ensureUserDoc(cred.user, { nickname, country: country.name, countryCode: country.code });
      if (cred.user.email.toLowerCase() === ownerEmail) await sendEmailVerification(cred.user).catch(() => {});
      signingUp = false;
      toast(`Welcome, ${nickname}!`);
      await handleUser(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
      toast('Logged in. Welcome back!');
    }
    $('#authForm').reset(); picker.clear();
  } catch (ex) { signingUp = false; console.error(ex); err.textContent = errText(ex); }
  btn.disabled = false;
});
$('#googleBtn').addEventListener('click', async () => {
  try { await signInWithPopup(auth, googleProvider); } catch (ex) { $('#authErr').textContent = errText(ex); }
});
$('#forgot').addEventListener('click', async () => {
  const email = $('#authEmail').value.trim();
  if (!email) { $('#authErr').textContent = 'Type your email above, then tap "Forgot password?".'; return; }
  try { await sendPasswordResetEmail(auth, email); toast('Password reset email sent.'); }
  catch (ex) { $('#authErr').textContent = errText(ex); }
});
// Creates the customer record once. Status starts as "inquiry"; only the owner can change it.
async function ensureUserDoc(u, extra = {}) {
  const ref = doc(db, 'users', u.uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, { uid: u.uid, email: u.email || '', photo: u.photoURL || '', status: 'inquiry', feedbackAllowed: false, createdAt: serverTimestamp(), ...extra });
}

/* ================================================================== top bar user chip */
function renderTop() {
  const a = $('#topRight'), loggedIn = !!user && !needsProfile();
  if (!user) {
    a.innerHTML = '<button class="btn small" id="tLogin">Log in</button><button class="btn small primary" id="tSignup">Sign up</button>';
    $('#tLogin').onclick = () => showAuth('login'); $('#tSignup').onclick = () => showAuth('signup');
    $('#drawerUser').innerHTML = ''; return;
  }
  const name = isOwner ? OWNER.name : nick();
  const av = `${esc(initials(name))}${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" onerror="this.remove()" />` : ''}`;
  a.innerHTML = `<button class="user-btn" id="userBtn" aria-haspopup="true"><span class="avatar">${av}</span><span>${esc(name)}</span></button>
    <div class="drop glass frost" id="userDrop"><span class="role">${isOwner ? 'Owner' : 'Customer'}</span><small>${esc(user.email)}</small><button class="btn small wide" id="logoutBtn">Log out</button></div>`;
  $('#userBtn').onclick = (e) => { e.stopPropagation(); $('#userDrop').classList.toggle('open'); };
  $('#logoutBtn').onclick = logout;
  $('#drawerUser').innerHTML = loggedIn ? `<span class="avatar">${av}</span><div><strong>${esc(name)}</strong><small>${isOwner ? 'Owner account' : `${flag(me?.countryCode)} ${esc(me?.country || 'Customer')}`}</small></div>` : '';
}
document.addEventListener('click', (e) => { if (!e.target.closest('.top-right')) $('#userDrop')?.classList.remove('open'); });

/* ================================================================== session */
const stopAll = () => { unsubs.forEach((u) => u()); unsubs = []; unsubActive?.(); unsubActive = null; };
onAuthStateChanged(auth, (u) => { if (!signingUp) handleUser(u); });
const resetBoxes = () => $$('.msgs').forEach((b) => { b.dataset.key = ''; });

async function handleUser(u) {
  stopAll(); resetBoxes();
  const wasIn = !!user;
  user = u; me = null; meLoaded = false; shown = ''; activeUid = null; customers = []; panelOpen = false;
  $('#chatPanel').classList.remove('open');
  const emailMatch = !!u && (u.email || '').toLowerCase() === ownerEmail;
  let verified = false;
  if (emailMatch) {
    // A refreshed page can hold an old "not verified" value. Ask Firebase for the fresh one,
    // and use the same token Firestore will check.
    try { await u.reload(); verified = (await u.getIdTokenResult(true)).claims.email_verified === true; }
    catch (e) { console.warn('verify check', e); verified = !!u.emailVerified; }
  }
  isOwner = emailMatch && verified;
  ownerRetried = false;
  $('#verifyBanner').hidden = !(emailMatch && !verified);
  renderNav();
  if (!u) {
    if (wasIn) { history.replaceState(null, '', '#/home'); setAuthMode('login'); }
    ready = true; renderTop(); updateChrome(); finishBoot(); route(); return;
  }
  try { await ensureUserDoc(u); } catch (e) { console.warn('user doc', e); }
  unsubs.push(onSnapshot(doc(db, 'users', u.uid), (s) => {
    me = s.exists() ? s.data({ serverTimestamps: 'estimate' }) : {};
    meLoaded = true; ready = true;
    renderTop(); onMeChange(); finishBoot(); route(); updateChrome();
    if (needsProfile()) { setAuthMode('profile'); if (!$('#authNick').value) $('#authNick').value = (u.displayName || '').split(' ')[0].slice(0, 24); }
  }, (e) => { console.error(e); me = {}; meLoaded = true; ready = true; toast(errText(e)); finishBoot(); route(); }));
  unsubs.push(onSnapshot(query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(60)), (snap) => {
    feedbacks = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    renderFeedback();
  }, (e) => console.warn('feedback', e)));
  if (isOwner) startOwner(); else startCustomer(u);
}
const finishBoot = () => $('#boot').classList.add('gone');
$('#resendVerify').onclick = async () => { try { await sendEmailVerification(auth.currentUser); toast('Verification email sent.'); } catch { toast('Wait a moment before resending.'); } };
$('#checkVerify').onclick = async () => {
  await auth.currentUser.reload(); await handleUser(auth.currentUser);
  toast(isOwner ? 'Verified. Owner dashboard unlocked.' : 'Not verified yet. Open the link in your email first.');
};

/* ================================================================== messages (text + photos) */
async function ownerRetry(fn) {
  try { return await fn(); }
  catch (e) {
    if (e.code !== 'permission-denied') throw e;
    await auth.currentUser?.getIdToken(true);
    return await fn();
  }
}
const ruleHelp = 'Blocked by Firestore rules. Check the owner email in firestore.rules, publish the rules, then log out and log in again.';

async function sendMessage(uid, raw, sender, image) {
  const text = (raw || '').trim().slice(0, 1000); if (!text && !image) return;
  const batch = writeBatch(db);
  const msg = { text, sender, createdAt: serverTimestamp() };
  if (image) msg.image = image;
  batch.set(doc(collection(db, 'users', uid, 'messages')), msg);
  const meta = { lastMessage: (text || 'Sent a photo').slice(0, 80), lastMessageAt: serverTimestamp() };
  if (sender === 'customer') meta.unreadOwner = increment(1); else meta.unreadCustomer = increment(1);
  batch.set(doc(db, 'users', uid), meta, { merge: true });
  await batch.commit();
}
// Photos are shrunk on the device first, so they upload fast and use little data.
const MAX_IMG = 380000;
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}
async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const img = await loadImage(file);
  let max = 960, q = 0.72;
  for (let i = 0; i < 6; i++) {
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    const url = c.toDataURL('image/jpeg', q);
    if (url.length <= MAX_IMG) return url;
    max = Math.round(max * 0.8); q = Math.max(0.45, q - 0.07);
  }
  throw new Error('too big');
}
// Fast chat drawing: the first snapshot draws the list, later ones only add or update what changed
function msgEl(id, m, mySender) {
  const el = document.createElement('div');
  el.className = 'msg ' + (m.sender === mySender ? 'me' : 'them'); el.dataset.id = id;
  if (m.image && String(m.image).startsWith('data:image/')) {
    const im = document.createElement('img'); im.className = 'chat-img'; im.src = m.image; im.alt = 'Photo in the chat'; im.loading = 'lazy'; im.decoding = 'async'; el.append(im);
  }
  if (m.text) { const t = document.createElement('span'); t.textContent = m.text; el.append(t); }
  const t = document.createElement('time'); t.textContent = fmtTime(m.createdAt); el.append(t);
  return el;
}
function syncMsgs(boxes, snap, mySender, intro, key) {
  boxes.filter(Boolean).forEach((box) => {
    if (box.dataset.key !== key) {
      box.dataset.key = key; box.textContent = '';
      const first = intro || (snap.empty ? 'No messages yet. Say hello below.' : '');
      if (first) { const s = document.createElement('div'); s.className = 'msg sys' + (intro ? '' : ' empty'); s.textContent = first; box.append(s); }
      const frag = document.createDocumentFragment();
      snap.docs.forEach((d) => frag.append(msgEl(d.id, d.data({ serverTimestamps: 'estimate' }), mySender)));
      box.append(frag);
    } else {
      snap.docChanges().forEach((ch) => {
        const m = ch.doc.data({ serverTimestamps: 'estimate' });
        if (ch.type === 'added') {
          $('.sys.empty', box)?.remove();
          const list = $$('.msg[data-id]', box);
          box.insertBefore(msgEl(ch.doc.id, m, mySender), list[ch.newIndex] || null);
        } else if (ch.type === 'modified') {
          const el = box.querySelector(`[data-id="${ch.doc.id}"]`); const t = el && $('time', el); if (t) t.textContent = fmtTime(m.createdAt);
        } else if (ch.type === 'removed') box.querySelector(`[data-id="${ch.doc.id}"]`)?.remove();
      });
    }
    box.scrollTop = box.scrollHeight;
  });
}
// Message box with a photo button. send(text, imageDataUrl) does the sending.
function initComposer(form, send) {
  const input = $('.c-text', form), file = $('.c-file', form), prev = $('.preview', form);
  let pending = null;
  const showPrev = () => { prev.hidden = !pending; prev.innerHTML = pending ? `<div class="thumb"><img src="${pending}" alt="Photo to send" /><button type="button" aria-label="Remove photo">×</button></div>` : ''; };
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.value = ''; if (!f) return;
    toast('Preparing your photo...');
    try { pending = await compressImage(f); showPrev(); }
    catch (ex) { console.warn(ex); pending = null; showPrev(); toast('That photo could not be used. Try a JPG or PNG.'); }
  });
  prev.addEventListener('click', (e) => { if (e.target.closest('button')) { pending = null; showPrev(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim(), img = pending; if (!text && !img) return;
    input.value = ''; pending = null; showPrev();
    try { await send(text, img); }
    catch (ex) { console.error(ex); input.value = text; pending = img; showPrev(); toast(ex.code === 'permission-denied' ? ruleHelp : 'Message not sent. Please try again.'); }
  });
  return { setText(v) { input.value = v; }, focus() { input.focus({ preventScroll: true }); } };
}
const customerSend = (text, img) => (user && !isOwner ? sendMessage(user.uid, text, 'customer', img) : Promise.resolve());
const dashComposer = initComposer($('#dashForm'), customerSend);
const panelComposer = initComposer($('#panelForm'), customerSend);
const ownerComposer = initComposer($('#ownerForm'), (text, img) => (activeUid ? ownerRetry(() => sendMessage(activeUid, text, 'owner', img)) : Promise.resolve()));

/* ================================================================== customer side */
const chatVisible = () => panelOpen || chatInView;
function startCustomer(u) {
  const q = query(collection(db, 'users', u.uid, 'messages'), orderBy('createdAt', 'asc'), limitToLast(100));
  unsubs.push(onSnapshot(q, (snap) => {
    syncMsgs([$('#dashMsgs'), $('#panelMsgs')], snap, 'customer', `Hi ${nick()}! Tell me about your project. You can send photos too. Only you and ${OWNER.firstName} can read this chat.`, u.uid);
  }, (e) => { console.error(e); toast(errText(e)); }));
}
function markCustomerRead() {
  if (!user || isOwner || !me?.unreadCustomer) return;
  updateDoc(doc(db, 'users', user.uid), { unreadCustomer: 0 }).catch(() => {});
}
function onMeChange() {
  if (isOwner || !me) return;
  const n = me.unreadCustomer || 0, b = $('#fabBadge');
  if (n && chatVisible()) markCustomerRead();
  b.textContent = n; b.hidden = !n || chatVisible();
  renderCustomerDash(); renderFeedbackForm();
}
function renderCustomerDash() {
  const st = stOf(me), S = STATUS[st], name = nick();
  $('#cdAvatar').innerHTML = `${esc(initials(name))}${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" onerror="this.remove()" />` : ''}`;
  $('#cdHello').textContent = `Hi, ${name}!`;
  $('#cdWhere').textContent = me?.country ? `${flag(me.countryCode)} ${me.country}` : 'Welcome to Webbins';
  $('#statusCard').className = `status-card glass st-${st}`;
  $('#statusCard').innerHTML = `<div class="lbl">Your project status</div><h3>${esc(S.label)}: ${esc(S.title)}</h3><p>${esc(S.hint)}</p><div class="next"><b>What to do next:</b> ${esc(S.next)}</div>`;
  const at = ORDER.indexOf(st);
  $('#tracker').innerHTML = ORDER.map((k, i) => `<div class="step st-${k} ${i <= at ? 'done' : ''} ${i === at ? 'now' : ''}"><div class="orb">${i + 1}</div><strong>${esc(STATUS[k].label)}</strong><small>${i === at ? 'You are here' : i < at ? 'Done' : 'Next'}</small></div>`).join('');
  const allowed = !!me?.feedbackAllowed;
  $('#fbAction').classList.toggle('locked', !allowed);
  $('#fbActionText').textContent = allowed ? 'I unlocked it for you. Tap to review me.' : 'Unlocked by me when your project is done';
}
function setPanel(open) {
  if (isOwner || !user) return;
  panelOpen = open; $('#chatPanel').classList.toggle('open', open);
  if (open) { $('#fabBadge').hidden = true; markCustomerRead(); setTimeout(() => panelComposer.focus(), 300); }
}
$('#chatFab').onclick = () => { if (chatInView) dashComposer.focus(); else setPanel(!panelOpen); };
$('#chatClose').onclick = () => setPanel(false);

/* ================================================================== reviews + ratings */
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
function renderFeedback() {
  const n = feedbacks.length, avg = n ? feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / n : 0;
  const sat = feedbacks.filter((f) => f.rating >= 4).length + (STATS.extraSatisfied || 0);
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, c: feedbacks.filter((f) => f.rating === s).length }));
  $('#ratingBox').innerHTML = `<div class="big-score"><strong>${n ? avg.toFixed(1) : '–'}</strong><div class="stars">${stars(avg)}</div><small>${n} review${n === 1 ? '' : 's'}</small></div>
    <div class="dist">${dist.map((d) => `<div><span>${d.s}★</span><div class="track"><div class="fill" style="width:${n ? (d.c / n) * 100 : 0}%"></div></div><span>${d.c}</span></div>`).join('')}</div>`;
  $('#clientStats').innerHTML = `<div class="glass stat-card pl-local"><strong data-k="sat">0</strong><span>Satisfied customers</span></div>
    <div class="glass stat-card pl-local"><strong data-k="avg">0</strong><span>Average rating (out of 5)</span></div>
    <div class="glass stat-card pl-local"><strong data-k="proj">0</strong><span>Projects delivered</span></div>`;
  countTo($('[data-k=sat]'), sat); countTo($('[data-k=avg]'), avg, 1); countTo($('[data-k=proj]'), STATS.projectsDone || 0);
  $('#fbWall').innerHTML = n ? feedbacks.map((f) => `<article class="glass fb"><header><div class="avatar">${esc(initials(f.nickname))}</div>
    <div><strong>${esc(f.nickname || 'Customer')}</strong><small>${flag(f.countryCode)} ${esc(f.country || '')} · ${fmtTime(f.createdAt)}</small></div><span class="stars">${stars(f.rating)}</span></header>
    <p>${esc(f.text)}</p>${isOwner ? `<button class="del" data-del="${esc(f.id)}">Remove this review</button>` : ''}</article>`).join('')
    : '<div class="glass pad"><p class="sub">No reviews yet. The first one will appear here.</p></div>';
  renderFeedbackForm();
}
$('#fbWall').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]'); if (!b || !isOwner) return;
  if (confirm('Remove this review?')) { try { await deleteDoc(doc(db, 'feedback', b.dataset.del)); toast('Review removed.'); } catch { toast('Could not remove it.'); } }
});
function renderFeedbackForm() {
  const card = $('#fbFormCard'); if (!card) return;
  if (isOwner) { card.dataset.sig = 'owner'; card.innerHTML = '<h3>Owner view</h3><p class="lock">You can remove a review with the button on its card. Use "Allow feedback" in your dashboard to let a customer review you.</p>'; return; }
  const mine = feedbacks.find((f) => f.id === user?.uid);
  const sig = [!!me?.feedbackAllowed, mine?.rating, mine?.text].join('|');
  if (card.dataset.sig === sig) return;
  card.dataset.sig = sig;
  if (!me?.feedbackAllowed && !mine) { card.innerHTML = '<h3>Feedback is locked</h3><p class="lock">After your project, I will unlock feedback for you here. Then you can rate my work and write a review.</p>'; return; }
  if (!me?.feedbackAllowed && mine) { card.innerHTML = `<h3>Thank you!</h3><p class="lock">Your review is on the wall: ${stars(mine.rating)}</p>`; return; }
  fbRating = mine?.rating || fbRating || 0;
  card.innerHTML = `<h3>${mine ? 'Edit your review' : 'Rate my work'}</h3><p class="lock" style="margin-bottom:14px">${mine ? 'You can change your review any time.' : 'Your nickname and country will show with your review.'}</p>
    <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-s="${n}" class="${n <= fbRating ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
    <label class="field"><span>Your feedback</span><textarea id="fbText" maxlength="500" placeholder="How was working with Webbins?">${esc(mine?.text || '')}</textarea></label>
    <p class="err" id="fbErr"></p><button class="btn primary wide" id="fbSubmit">${mine ? 'Update review' : 'Send review'}</button>`;
}
$('#fbFormCard').addEventListener('click', async (e) => {
  const s = e.target.closest('[data-s]');
  if (s) { fbRating = +s.dataset.s; $$('#starInput button').forEach((b) => b.classList.toggle('on', +b.dataset.s <= fbRating)); return; }
  if (!e.target.closest('#fbSubmit')) return;
  const text = $('#fbText').value.trim(), err = $('#fbErr');
  if (!fbRating) { err.textContent = 'Tap the stars to give a rating.'; return; }
  if (text.length < 3) { err.textContent = 'Write a short feedback.'; return; }
  try {
    await setDoc(doc(db, 'feedback', user.uid), { uid: user.uid, nickname: me.nickname, country: me.country, countryCode: me.countryCode, rating: fbRating, text, createdAt: serverTimestamp() });
    toast('Thank you for your review!'); err.textContent = '';
  } catch (ex) { console.error(ex); err.textContent = 'Could not send. Ask me to allow feedback again.'; }
});

/* ================================================================== owner dashboard */
function startOwner() {
  unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
    customers = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).filter((c) => (c.email || '').toLowerCase() !== ownerEmail);
    customers.sort((a, b) => (toDate(b.lastMessageAt || b.createdAt)?.getTime() || 0) - (toDate(a.lastMessageAt || a.createdAt)?.getTime() || 0));
    renderOwner();
  }, (e) => {
    if (e.code === 'permission-denied' && !ownerRetried) {
      ownerRetried = true;
      auth.currentUser?.getIdToken(true).then(() => { if (isOwner) startOwner(); });
      return;
    }
    showOwnerError(e);
  }));
}
function showOwnerError(e) {
  console.error(e);
  const msg = e.code === 'permission-denied'
    ? 'Firestore blocked the customer list. Check that the owner email in firestore.rules is exactly your login email, that the rules are published, and that your email is verified. Then log out and log in again.'
    : 'Could not load customers. Check your internet connection and reload the page.';
  $('#custList').innerHTML = `<li class="none">${esc(msg)}</li>`;
  toast('Cannot load customers.');
}
const isLocal = (c) => c.countryCode === 'PH';
function renderOwner() {
  const cnt = (f) => customers.filter(f).length;
  const card = (type, k, n, label, cls, sel) => `<button class="glass stat-card ${cls} ${sel ? 'sel' : ''}" data-${type}="${k}"><strong>${n}</strong><span>${label}</span></button>`;
  const unread = customers.reduce((n, c) => n + (c.unreadOwner || 0), 0);
  $('#statAttn').innerHTML = card('unread', 'on', unread, 'Unread messages', 'pl-attn', unreadF);
  $('#statPlace').innerHTML = [['all', customers.length, 'All customers'], ['local', cnt(isLocal), 'Local (Philippines)'], ['intl', cnt((c) => !isLocal(c)), 'International']]
    .map(([k, n, l]) => card('region', k, n, l, `pl-${k}`, regionF === k)).join('');
  $('#statWork').innerHTML = ORDER.map((s) => card('status', s, cnt((c) => stOf(c) === s), s === 'inquiry' ? 'Inquiries' : STATUS[s].label, `st-${s}`, statusF === s)).join('');

  $$('#regionSeg button').forEach((b) => b.classList.toggle('active', b.dataset.region === regionF));
  const inRegion = customers.filter((c) => regionF === 'all' || (regionF === 'local') === isLocal(c));
  $('#statusTabs').innerHTML = [['all', 'All'], ...ORDER.map((s) => [s, STATUS[s].label])].map(([k, l]) =>
    `<button class="stab ${k === 'all' ? 'pl-all' : `st-${k}`} ${statusF === k ? 'active' : ''}" data-status="${k}">${l}<b>${k === 'all' ? inRegion.length : inRegion.filter((c) => stOf(c) === k).length}</b></button>`).join('');
  const term = $('#custSearch').value.trim().toLowerCase();
  const list = inRegion.filter((c) => (statusF === 'all' || stOf(c) === statusF) && (!unreadF || c.unreadOwner) &&
    (!term || [c.nickname, c.country, c.email].some((v) => (v || '').toLowerCase().includes(term))));
  const parts = [regionF === 'local' ? 'Local' : regionF === 'intl' ? 'International' : '', statusF !== 'all' ? STATUS[statusF].label : '', unreadF ? 'Unread' : ''].filter(Boolean);
  $('#filterSummary').innerHTML = `<span>Showing ${list.length} of ${customers.length}${parts.length ? ': ' + esc(parts.join(', ')) : ''}</span>${parts.length ? '<button id="clearFilters">Clear filters</button>' : ''}`;
  $('#custList').innerHTML = list.length ? list.map((c) => `<li class="cust st-${stOf(c)} ${c.id === activeUid ? 'active' : ''} ${c.unreadOwner ? 'unread' : ''}" data-uid="${esc(c.id)}" tabindex="0">
    <div class="avatar">${esc(initials(c.nickname || c.email))}</div>
    <div class="info"><div class="row"><strong>${esc(c.nickname || (c.email || 'Customer').split('@')[0])}</strong><time>${fmtTime(c.lastMessageAt || c.createdAt)}</time></div>
    <div class="meta"><span>${flag(c.countryCode)} ${esc(c.country || 'No country yet')}</span><span class="chip st-${stOf(c)}">${STATUS[stOf(c)].label}</span></div>
    <p>${esc(c.lastMessage || 'No messages yet')}</p></div>${c.unreadOwner ? `<span class="n">${c.unreadOwner}</span>` : ''}</li>`).join('')
    : `<li class="none">${customers.length ? 'No customers match these filters.' : 'No customers yet. They appear here when they sign up.'}</li>`;
  if (activeUid) renderControls();
}
// stat cards, place buttons and status tabs all filter the same list
document.addEventListener('click', (e) => {
  if (!isOwner) return;
  if (e.target.closest('#clearFilters')) { regionF = 'all'; statusF = 'all'; unreadF = false; $('#custSearch').value = ''; return renderOwner(); }
  const r = e.target.closest('[data-region]'), s = e.target.closest('[data-status]'), u = e.target.closest('[data-unread]');
  if (!r && !s && !u) return;
  if (r) regionF = r.dataset.region;
  if (s) statusF = statusF === s.dataset.status && s.classList.contains('stat-card') ? 'all' : s.dataset.status;
  if (u) unreadF = !unreadF;
  renderOwner();
});
$('#custSearch').addEventListener('input', renderOwner);
const pick = (e) => { const li = e.target.closest('.cust'); if (li) openConversation(li.dataset.uid); };
$('#custList').addEventListener('click', pick);
$('#custList').addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(e); });

function renderControls() {
  const c = customers.find((x) => x.id === activeUid); if (!c) return;
  const st = stOf(c);
  $('#oName').textContent = c.nickname || c.email || 'Customer';
  $('#oMeta').textContent = `${flag(c.countryCode)} ${c.country || 'No country yet'} · ${c.email || ''}`;
  $('#oAvatar').textContent = initials(c.nickname || c.email);
  $('#oControls').innerHTML = `<span class="lbl">Work status:</span>${ORDER.map((k) => `<button class="sbtn st-${k} ${st === k ? 'active' : ''}" data-set="${k}">${STATUS[k].label}</button>`).join('')}
    <button class="allow ${c.feedbackAllowed ? 'on' : ''}" id="allowBtn">${c.feedbackAllowed ? 'Feedback allowed' : 'Allow feedback'}</button>`;
}
$('#oControls').addEventListener('click', async (e) => {
  if (!activeUid) return;
  const c = customers.find((x) => x.id === activeUid); if (!c) return;
  const set = e.target.closest('[data-set]'), allow = e.target.closest('#allowBtn');
  try {
    if (set) { await ownerRetry(() => updateDoc(doc(db, 'users', activeUid), { status: set.dataset.set })); toast(`Marked as ${STATUS[set.dataset.set].label}.`); }
    if (allow) { await ownerRetry(() => updateDoc(doc(db, 'users', activeUid), { feedbackAllowed: !c.feedbackAllowed })); toast(c.feedbackAllowed ? 'Feedback turned off for this customer.' : 'This customer can now leave feedback.'); }
  } catch (ex) { console.error(ex); toast(ex.code === 'permission-denied' ? ruleHelp : 'Could not save. Please try again.'); }
});
function openConversation(uid) {
  if (!customers.find((x) => x.id === uid)) return;
  activeUid = uid; unsubActive?.(); $('#ownerMsgs').dataset.key = '';
  $('#dashEmpty').hidden = true; $('#ownerChat').hidden = false; $('#ownerGrid').classList.add('show-chat');
  renderControls(); renderOwner();
  const q = query(collection(db, 'users', uid, 'messages'), orderBy('createdAt', 'asc'), limitToLast(100));
  unsubActive = onSnapshot(q, (snap) => {
    syncMsgs([$('#ownerMsgs')], snap, 'owner', '', uid);
    if (snap.docs.length && customers.find((c) => c.id === uid)?.unreadOwner) updateDoc(doc(db, 'users', uid), { unreadOwner: 0 }).catch(() => {});
  }, (e) => { console.error(e); toast(e.code === 'permission-denied' ? ruleHelp : 'Could not load this chat.'); });
  setTimeout(() => ownerComposer.focus(), 250);
}
$('#ownerBack').onclick = () => $('#ownerGrid').classList.remove('show-chat');

/* ================================================================== effects (light on the device) */
let io;
function observeReveals() {
  io ||= new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.1 });
  $$('.reveal:not(.in)').forEach((el) => io.observe(el));
}
function initEffects() {
  // cursor glow + card tilt: one animation frame at a time, only on devices with a mouse
  if (matchMedia('(hover:hover)').matches) {
    const glow = $('#glow'); let px = 0, py = 0, busy = false, tiltEl = null;
    addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY; tiltEl = e.target.closest?.('.tilt') || null;
      if (busy) return; busy = true;
      requestAnimationFrame(() => {
        glow.style.opacity = 1; glow.style.transform = `translate3d(${px - 210}px,${py - 210}px,0)`;
        if (tiltEl) {
          const r = tiltEl.getBoundingClientRect(), x = (px - r.left) / r.width - 0.5, y = (py - r.top) / r.height - 0.5;
          tiltEl.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
        }
        busy = false;
      });
    }, { passive: true });
    document.addEventListener('pointerout', (e) => { const t = e.target.closest?.('.tilt'); if (t) t.style.transform = ''; }, { passive: true });
  }
  // skill bars fill when you scroll to them
  new IntersectionObserver((en, o) => en.forEach((x) => { if (x.isIntersecting) { $$('.fill', x.target).forEach((f) => (f.style.width = f.dataset.w + '%')); o.unobserve(x.target); } }), { threshold: 0.3 }).observe($('#skillBars'));
  // highlight the section you are reading in the menu
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) setActiveSec(en.target.id); }), { rootMargin: '-35% 0px -60% 0px' });
  $$('#v-app .sec').forEach((s) => spy.observe(s));
  // know when the dashboard chat is on screen
  new IntersectionObserver((en) => {
    chatInView = en[0].isIntersecting;
    if (chatInView) { markCustomerRead(); $('#fabBadge').hidden = true; }
  }, { threshold: 0.4 }).observe($('#chatCard'));
}

/* ================================================================== go */
renderStatic(); initEffects(); setAuthMode('login'); renderTop();
setTimeout(() => { if (!ready) { ready = true; finishBoot(); route(); } }, 6000); // never hang on a slow connection
