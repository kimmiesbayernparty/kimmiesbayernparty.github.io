// ===== Helpers =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// ===== DOM refs =====
const stepIdentity   = $('#step-identity');
const stepSort       = $('#step-sort');
const identityForm   = $('#identityForm');
const guestNameInput = $('#guestName');
const hp             = $('#hp_website');

const avatarImage    = $('#avatarImage');   // carousel preview in step 1
const avatarLabel    = $('#avatarLabel');   // may be null
const avatarInput    = $('#avatarInput');   // hidden input in step 1

const chosenAvatar   = $('#chosenAvatar');  // avatar shown in step 2
const nameSpan       = $('#guestNameSpan'); // name inside step 2 bubble
const bubbleEl       = $('#step-sort .bubble');
const defaultBubble  = bubbleEl ? bubbleEl.textContent : '';

const baskets        = $$('.basket');       // dropzones
const ticketContainer= $('.ticket-container'); // container holding the .brezel
const undoBtn        = $('#undoBtn');       // optional

// ===== App state =====
let state = {
  name: '',
  avatar: '',
  choice: '',            // "yes" | "yes_plus_one" | "no"
  submittedAt: null
};

// Track which basket currently shows the "with breze" image
let filledBasket = null;

// ===== DEV toggle =====
const DEV_SKIP_REGISTRATION = false;   // turn false for real flow
const DEV_DEFAULT_NAME   = 'Gast';
const DEV_DEFAULT_AVATAR = 'cat';     // must exist in avatars[].value

// ===== Avatars (carousel) =====
const avatars = [
  { value: "bunny",  label: "bunny",  src: "img/avatars/bunny.png"  },
  { value: "frog",   label: "frog",   src: "img/avatars/frog.png"   },
  { value: "devil",  label: "devil",  src: "img/avatars/devil.png"  },
  { value: "monk",   label: "monk",   src: "img/avatars/monk.png"   },
  { value: "thingy", label: "thingy", src: "img/avatars/thingy.png" },
  { value: "cat",    label: "cat",    src: "img/avatars/cat2.png"    },
];
let avatarIndex = 0;

$('.avatar-arrow.left')?.addEventListener('click', () => switchAvatar(-1));
$('.avatar-arrow.right')?.addEventListener('click', () => switchAvatar(1));

function switchAvatar(dir) {
  avatarIndex = (avatarIndex + dir + avatars.length) % avatars.length;
  const current = avatars[avatarIndex];
  if (avatarImage) avatarImage.src = current.src;
  if (avatarLabel) avatarLabel.textContent = current.label || '';
  if (avatarInput) avatarInput.value = current.value;
  state.avatar = current.value;
}

// ===== Init after DOM is ready =====
document.addEventListener('DOMContentLoaded', () => {
  // Ensure the pretzel img exists and is safe for mobile (no native drag)
  let brezel = document.querySelector('.ticket-container .brezel');
  if (!brezel) {
    brezel = new Image();
    brezel.className = 'brezel';
    brezel.src = 'img/brezel.png';
    brezel.alt = 'Breze';
    document.querySelector('.ticket-container')?.appendChild(brezel);
  }
  brezel.setAttribute('draggable', 'false'); // prevent native image drag

  if (DEV_SKIP_REGISTRATION) {
    state.name = DEV_DEFAULT_NAME;
    state.avatar = DEV_DEFAULT_AVATAR;
    if (avatarInput) avatarInput.value = DEV_DEFAULT_AVATAR;

    hydrateSortStep();                 // fill avatar + name in step 2
    stepIdentity?.classList.add('hidden');
    stepSort?.classList.remove('hidden');
  }

  initDroppable(); // Shopify Draggable init
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

    hydrateSortStep();                 // fill avatar + name in step 2
    stepIdentity?.classList.add('hidden');
    stepSort?.classList.remove('hidden');

    // (Optional) Restore previous for same name
    const saved = localStorage.getItem('kimmis_bayernparty_rsvp');
    if (saved) {
      const prev = JSON.parse(saved);
      if (prev.name === name) {
        state = prev;
        showDone(); // will update bubble & visuals
      }
    }
  });
}

// ===== Hydrate step 2 with chosen data =====
function hydrateSortStep() {
  if (nameSpan) nameSpan.textContent = state.name || 'Gast';

  const pickedValue = (avatarInput && avatarInput.value) || state.avatar;
  const match = avatars.find(a => a.value === pickedValue);
  if (match && chosenAvatar) {
    chosenAvatar.src = match.src;
    chosenAvatar.alt = `Avatar: ${match.label || match.value}`;
  }
}

// ===== Shopify Droppable init =====
function initDroppable() {
  const DroppableCtor =
    (window.Draggable && window.Draggable.Droppable) ||
    (window.Droppable && window.Droppable.default);

  if (!DroppableCtor) {
    console.error('Shopify Draggable Droppable not found. Check your CDN script.');
    return;
  }

  const droppable = new DroppableCtor(
    document.querySelectorAll('.ticket-container'), // sources live in these containers
    {
      draggable: '.brezel',  // the pretzel image
      dropzone: '.basket'    // targets
    }
  );

  // hover styles
  droppable.on('droppable:over', (e) => {
    e.dropzone.classList.add('drag-over');
  });
  droppable.on('droppable:out', (e) => {
    e.dropzone.classList.remove('drag-over');
  });

  // handle the drop
  droppable.on('droppable:dropped', (e) => {
    const basket = e.dropzone;
    const choice = basket.dataset.choice;

    // swap basket image to the "...breze" version
    applyBasketSwap(basket);

    // lock/dim the pretzel
    e.source.style.opacity = '0.35';
    e.source.style.pointerEvents = 'none';

    onChoice(choice);
  });
}

// ===== Choice handling (stay on same screen) =====
function onChoice(choice) {
  state.choice = choice;
  state.submittedAt = new Date().toISOString();
  localStorage.setItem('kimmis_bayernparty_rsvp', JSON.stringify(state));

  sendEmail(state).catch(() => {/* ignore in UI */});
  showDone();
}

function showDone() {
  // your inline done message
  const map1 = { yes: 'juhu', yes_plus_one: 'juhu', no: 'schade' };
  const map2 = {
    yes: '! du kommst.',
    yes_plus_one: '! du kommst mit begleitung. ',
    no: 'vielleicht nächstes mal <3'
  };
  const msg = `${map1[state.choice] || ''} ${state.name} ${map2[state.choice] || ''}`.trim();

  if (bubbleEl) bubbleEl.textContent = msg;

  stepSort?.classList.add('is-done'); // optional: used by your CSS to tone down notes etc.
}

// ===== Undo (optional) =====
undoBtn?.addEventListener('click', () => {
  state.choice = '';
  state.submittedAt = null;
  localStorage.removeItem('kimmis_bayernparty_rsvp');

  if (filledBasket) {
    restoreBasketImage(filledBasket);
    filledBasket = null;
  }

  // re-enable pretzel
  const brezel = document.querySelector('.ticket-container .brezel');
  if (brezel) {
    brezel.style.opacity = '1';
    brezel.style.pointerEvents = '';
  }

  if (bubbleEl) bubbleEl.textContent = defaultBubble;
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


