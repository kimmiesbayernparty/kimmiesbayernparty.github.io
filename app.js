// ===== Helpers =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// ===== DOM refs =====
const stepIdentity = $('#step-identity');
const stepSort     = $('#step-sort');
const stepDone     = $('#step-done');           // not used when staying on same screen
const identityForm = $('#identityForm');
const guestNameInput = $('#guestName');
const ticket       = $('#ticket');              // draggable brezel
const doneMessage  = $('#doneMessage');         // not used when staying on same screen
const undoBtn      = $('#undoBtn');             // if this lives in #step-done it won't show; consider moving it into #step-sort
const hp           = $('#hp_website');

const avatarImage  = $('#avatarImage');
const avatarLabel  = $('#avatarLabel');         // may be null
const avatarInput  = $('#avatarInput');

const baskets      = $$('.basket');

// In-place title management (first h2 = main title, second h2 = instruction)
const sortTitleMain = $('#step-sort h2:nth-of-type(1)');
const sortTitleInstr = $('#step-sort h2:nth-of-type(2)');
const defaultSortTitle = sortTitleMain ? sortTitleMain.textContent : '';
const defaultInstrTitle = sortTitleInstr ? sortTitleInstr.textContent : '';

// ===== App state =====
let state = {
  name: '',
  avatar: '',           // "girl" | "boy"
  choice: '',           // "yes" | "yes_plus_one" | "no"
  submittedAt: null
};

// Track which basket currently shows the "with breze" image
let filledBasket = null;

// ===== DEV toggle =====
const DEV_SKIP_REGISTRATION = false;
const DEV_DEFAULT_NAME   = 'Gast';
const DEV_DEFAULT_AVATAR = 'girl';

// ===== Avatars (carousel) =====
const avatars = [
  { value: "bunny",  label: "bunny", src: "img/avatars/bunny.png"  },
  { value: "frog", src: "img/avatars/frog.png"  },
  { value: "devil", src: "img/avatars/devil.png"  },
  { value: "monk", src: "img/avatars/monk.png"  },
  { value: "thingy", src: "img/avatars/thingy.png"  },
  { value: "cat", label: "cat",    src: "img/avatars/cat.png" },
];
let avatarIndex = 0;

$('.avatar-arrow.left')?.addEventListener('click', () => switchAvatar(-1));
$('.avatar-arrow.right')?.addEventListener('click', () => switchAvatar(1));

function switchAvatar(dir) {
  avatarIndex = (avatarIndex + dir + avatars.length) % avatars.length;
  const current = avatars[avatarIndex];
  if (avatarImage) avatarImage.src = current.src;
  if (avatarLabel) avatarLabel.textContent = current.label;
  if (avatarInput) avatarInput.value = current.value;
  state.avatar = current.value;
}

// ===== Init after DOM is ready =====
document.addEventListener('DOMContentLoaded', () => {
  if (DEV_SKIP_REGISTRATION) {
    state.name = DEV_DEFAULT_NAME;
    state.avatar = DEV_DEFAULT_AVATAR;
    stepIdentity?.classList.add('hidden');
    stepSort?.classList.remove('hidden');
    if (avatarInput) avatarInput.value = DEV_DEFAULT_AVATAR;
  }
});

// ===== Identity submit (only when not skipping) =====
if (!DEV_SKIP_REGISTRATION && identityForm) {
  identityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (hp?.value) return; // honeypot

    const name   = guestNameInput?.value.trim();
    const avatar = (new FormData(identityForm)).get('avatar');

    if (!name || !avatar) {
      alert('Bitte gib deinen Namen ein und wähle einen Avatar.');
      return;
    }
    state.name   = name;
    state.avatar = avatar;

    ticket?.setAttribute('aria-grabbed', 'false');
    stepIdentity?.classList.add('hidden');
    stepSort?.classList.remove('hidden');

    const saved = localStorage.getItem('kimmis_bayernparty_rsvp');
    if (saved) {
      const prev = JSON.parse(saved);
      if (prev.name === name) {
        state = prev;
        showDone();
      }
    }
  });
}

// ===== Drag & Drop: ticket -> basket =====
ticket?.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', 'rsvp-ticket');
  ticket.setAttribute('aria-grabbed', 'true');
});
ticket?.addEventListener('dragend', () => ticket.setAttribute('aria-grabbed', 'false'));

baskets.forEach(b => {
  b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('drag-over'); });
  b.addEventListener('dragleave', () => b.classList.remove('drag-over'));
  b.addEventListener('drop', (e) => {
    e.preventDefault();
    b.classList.remove('drag-over');

    applyBasketSwap(b);

    const choice = b.dataset.choice;
    onChoice(choice);
  });

  // Keyboard "drop"
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      applyBasketSwap(b);
      onChoice(b.dataset.choice);
    }
  });
});

// ===== Choice handling (stay on same screen) =====
function onChoice(choice) {
  state.choice = choice;
  state.submittedAt = new Date().toISOString();

  localStorage.setItem('kimmis_bayernparty_rsvp', JSON.stringify(state));

  sendEmail(state).catch(() => {/* ignore in UI */});

  showDone();
}

function showDone() {
  // build your inline done message
  const map1 = {
    yes: 'juhu',
    yes_plus_one: 'juhu',
    no: 'schade'
  };
  const map2 = {
    yes: '! du kommst.',
    yes_plus_one: '! du kommst mit begleitung. ',
    no: 'vielleicht nächstes mal <3'
  };
  const msg = `${map1[state.choice] || ''} ${state.name} ${map2[state.choice] || ''}`.trim();

  // replace the main title text
  if (sortTitleMain) sortTitleMain.textContent = msg;

  // optionally hide instruction line and the pretzel
  stepSort?.classList.add('is-done');
  if (sortTitleInstr) sortTitleInstr.style.display = 'none';
  if (ticket) {
    ticket.style.opacity = '.35';
    ticket.setAttribute('draggable', 'false');
  }
}

// ===== Undo (restores visuals + titles) =====
undoBtn?.addEventListener('click', () => {
  state.choice = '';
  state.submittedAt = null;
  localStorage.removeItem('kimmis_bayernparty_rsvp');

  // restore basket image if one was swapped
  if (filledBasket) {
    restoreBasketImage(filledBasket);
    filledBasket = null;
  }

  // restore pretzel
  if (ticket) {
    ticket.style.opacity = '1';
    ticket.setAttribute('draggable', 'true');
  }

  // restore titles and flags
  if (sortTitleMain)  sortTitleMain.textContent = defaultSortTitle;
  if (sortTitleInstr) sortTitleInstr.style.display = '';
  stepSort?.classList.remove('is-done');
});

// ===== Email integration (no-op in dev) =====
async function sendEmail(payload) {
  if (DEV_SKIP_REGISTRATION) return Promise.resolve('dev:skipped');

  if (window.EMAILJS) {
    return window.emailjs.send(
      EMAILJS.SERVICE_ID,
      EMAILJS.TEMPLATE_ID,
      {
        name: payload.name,
        avatar: payload.avatar,
        choice: payload.choice,
        submittedAt: payload.submittedAt,
        title: 'kimmis bayernparty'
      },
      { publicKey: EMAILJS.PUBLIC_KEY }
    );
  }

  return fetch('/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// ===== Basket image swap helpers =====
function applyBasketSwap(targetBasket) {
  if (filledBasket && filledBasket !== targetBasket) {
    restoreBasketImage(filledBasket);
  }

  const img = targetBasket.querySelector('img');
  if (!img) return;

  if (!img.dataset.originalSrc) {
    img.dataset.originalSrc = img.getAttribute('src');
  }

  const brezeSrc = img.dataset.brezeSrc || deriveBrezeSrc(img.dataset.originalSrc);
  if (brezeSrc) {
    img.src = brezeSrc;
    filledBasket = targetBasket;
  }

  if (ticket) {
    ticket.style.opacity = '.35';
    ticket.setAttribute('draggable', 'false');
  }
}

function restoreBasketImage(basket) {
  const img = basket.querySelector('img');
  if (!img) return;
  const original = img.dataset.originalSrc;
  if (original) img.src = original;
}

function deriveBrezeSrc(original) {
  // "img/basket1.png" -> "img/basket1breze.png"
  return original ? original.replace(/(\.[a-z]+)$/i, 'breze$1') : '';
}

