(function () {
  const api = window.RSVP || {};
  const { $, state, applyBasketSwap, restoreBasketImage, defaultBubbleText, sendEmail } = api;

  let filledBasket = null;
  let bubbleEl;
  let submitBtn;

 
  let helperShown = false;

 // ---- Mobile-safe drop sound (with pool + unlock) ----
// ---- Mobile-safe drop sound (pool + unlock) ----
const DROP_SRC = 'sounds/plop.mp3';
let audioUnlocked = false;
let dropPool = [];
let poolIndex = 0;

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Build & prime a small pool for the drop sound
  const POOL_SIZE = 4;
  dropPool = new Array(POOL_SIZE).fill(0).map(() => {
    const a = new Audio(DROP_SRC);
    a.preload = 'auto';
    a.playsInline = true;
    a.muted = true;
    return a;
  });

  // Prime them (play/pause) in response to this user gesture
  dropPool.forEach(a => {
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    }).catch(() => {});
  });

  // Also unlock typing & tada here
  primeTyping();
  primeTada();
}

// Attach unlock on first real gesture
['pointerdown','touchstart','click'].forEach(evt => {
  window.addEventListener(evt, unlockAudioOnce, { once: true, passive: true });
});

function playDrop() {
  if (!audioUnlocked || !dropPool.length) return;
  const a = dropPool[poolIndex++ % dropPool.length];
  try { a.currentTime = 0; } catch (_) {}
  a.play().catch(() => {});
}

// ---------- typing sound ----------
const typingSound = new Audio('sounds/avatar.mp3');
typingSound.loop = true;
typingSound.volume = 0.5;

function primeTyping() {
  typingSound.muted = true;
  typingSound.currentTime = 0;
  typingSound.play().then(() => {
    typingSound.pause();
    typingSound.currentTime = 0;
    typingSound.muted = false;
  }).catch(() => {});
}

// ---------- tada using <audio id="tadaAudio"> ----------
const tadaEl = document.getElementById('tadaAudio');

function primeTada() {
  if (!tadaEl) return;
  const wasMuted = tadaEl.muted;
  tadaEl.muted = true;
  tadaEl.play().then(() => {
    tadaEl.pause();
    tadaEl.currentTime = 0;
    tadaEl.muted = wasMuted;
  }).catch(() => {});
}

function playTada() {
  if (!tadaEl) return;
  try { tadaEl.currentTime = 0; } catch (_) {}
  tadaEl.play().catch(() => {});
}


document.addEventListener('click', () => {
  // unlock typing sound silently
  typingSound.muted = true;
  typingSound.currentTime = 0;
  typingSound.play().then(() => {
    typingSound.pause();
    typingSound.currentTime = 0;
    typingSound.muted = false; // ready for real use
  }).catch(() => {});

  // unlock drop sound silently
  const primedDrop = dropSound.cloneNode();
  primedDrop.muted = true;
  primedDrop.play().then(() => {
    primedDrop.pause();
    primedDrop.remove();
  }).catch(() => {});

  // unlock tada sound silently (optional)
  const primedTada = tadaSound.cloneNode();
  primedTada.muted = true;
  primedTada.play().then(() => {
    primedTada.pause();
    primedTada.remove();
  }).catch(() => {});
}, { once: true });

  // ---------- typing sound ----------

  // ---------- safe breze lookup + hide/show ----------
  function getBrezeImg() {
    return document.querySelector('img.brezel');
  }
  function hideBreze() {
    const img = getBrezeImg();
    if (img) img.style.visibility = 'hidden';
  }
  function showBreze() {
    const img = getBrezeImg();
    if (img) img.style.visibility = 'visible';
  }

  // ---------- typing effect that respects HTML tags & plays sound ----------
  function typeBubbleText(html, speed = 25) {
    bubbleEl = bubbleEl || document.querySelector('#step-sort .bubble');
    if (!bubbleEl) return;

    bubbleEl.innerHTML = ''; // clear
    bubbleEl.style.backgroundColor = '#fff';
    bubbleEl.style.transition = 'none';

    let i = 0;
    let isTag = false;
    let soFar = '';

    typingSound.currentTime = 0;
    typingSound.play().catch(() => {});

    (function tick() {
      if (i >= html.length) {
        typingSound.pause();
        typingSound.currentTime = 0;
        return;
      }
      const ch = html[i++];
      soFar += ch;
      bubbleEl.innerHTML = soFar;

      if (ch === '<') isTag = true;
      if (ch === '>') isTag = false;

      setTimeout(tick, isTag ? 0 : speed);
    })();
  }

  // expose typing for app-core initial bubble
  api.typeBubbleText = typeBubbleText;
  window.RSVP = api;

  // ---------- bubble + bottom button on choice ----------
  function onChoice(choice) {
    state.choice = choice;
    state.submittedAt = new Date().toISOString();

    const map = {
      yes: 'juhu, du kommst!',
      yes_plus_one: 'juhu, du kommst mit begleitung!',
      no: 'schade, vielleicht nächstes mal <3'
    };

    const msg = (map[choice] || '').trim();

    // helper text FIRST TIME ONLY
    const helperHtml = '<br><small>falls du den falschen korb gewählt hast, zieh die breze einfach rüber. andernfalls kannst du deine antwort mit dem button unten abschicken!</small>';
    const html = helperShown ? msg : (msg + helperHtml);
    helperShown = true;

    typeBubbleText(html, 25);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Abschicken';
      submitBtn.classList.remove('sent', 'sending');
    }
  }

  async function onSubmitChoice() {
    if (!state.choice || !submitBtn) return;

    state.name   = ($('#guestNameSpan')?.textContent || state.name || 'du').toLowerCase().trim();
    state.avatar = $('#avatarInput')?.value || state.avatar || '';
    state.submittedAt = new Date().toISOString();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Senden…';
    submitBtn.classList.add('sending');

    try {
      await sendEmail(state);

      submitBtn.textContent = 'Gesendet ✓';
      submitBtn.classList.remove('sending');
      submitBtn.classList.add('sent');

      const stepSort = document.getElementById('step-sort');
      const stepDone = document.getElementById('step-done');
      if (stepSort && stepDone) {
        stepSort.classList.add('hidden');
        stepDone.classList.remove('hidden');
      }

      playTada();

      if (window.confetti) {
        window.confetti({
          particleCount: 600,
          spread: 90,
          origin: { x: 0.5, y: 0.8 },
          colors: ['#005BBB', '#FFFFEC'],
        });
      }
    } catch (err) {
      console.error('sendEmail error:', err);
      submitBtn.textContent = 'Fehler – nochmal?';
      submitBtn.disabled = false;
      submitBtn.classList.remove('sending', 'sent');
    }
  }

  // ---------- Draggable wiring ----------
  document.addEventListener('DOMContentLoaded', () => {
    bubbleEl  = $('#step-sort .bubble');
    submitBtn = $('#submitChoiceBtn');
    submitBtn?.addEventListener('click', onSubmitChoice);

    // prevent native image drag
    getBrezeImg()?.setAttribute('draggable', 'false');

    const containers = document.querySelectorAll('.ticket-container, .basket .slot');
    if (!containers.length) {
      console.warn('[Drag] No containers found');
      return;
    }
    if (!(window.Draggable && Draggable.Sortable)) {
      console.warn('[Drag] Draggable.Sortable not available — include the UMD bundle.');
      return;
    }

    const sortable = new Draggable.Sortable(containers, {
      draggable: '.item',
      plugins: [Draggable.Plugins.SwapAnimation],
      mirror: {
        appendTo: document.body,
        constrainDimensions: true
      }
    });

    sortable.on('mirror:created', ({ mirror, source }) => {
      const rect = source.getBoundingClientRect();
      mirror.style.width  = rect.width + 'px';
      mirror.style.height = rect.height + 'px';
      const img = mirror.querySelector('img');
      if (img) { img.style.width = '100%'; img.style.height = 'auto'; }
    });

    sortable.on('sortable:start', ({ oldContainer, dragEvent }) => {
      const item = dragEvent?.source;
      if (!item) return;

      item.classList.remove('in-basket');
      showBreze();

      const fromBasket = oldContainer?.closest?.('.basket');
      if (fromBasket) {
        restoreBasketImage(fromBasket);
        if (filledBasket === fromBasket) filledBasket = null;
      }
    });

    sortable.on('sortable:stop', ({ newContainer, oldContainer, dragEvent }) => {
      const item = dragEvent?.source;
      if (!item) return;

      const toBasket = newContainer?.closest?.('.basket');
      const fromBasket = oldContainer?.closest?.('.basket');

      if (toBasket) {
        applyBasketSwap(toBasket);
        if (fromBasket && fromBasket !== toBasket) restoreBasketImage(fromBasket);

        hideBreze();
        item.classList.add('in-basket');
        filledBasket = toBasket;

        playDrop(); 
        onChoice(toBasket.dataset.choice);
      } else {
        item.classList.remove('in-basket');
        showBreze();

        if (filledBasket) {
          restoreBasketImage(filledBasket);
          filledBasket = null;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Abschicken';
          submitBtn.classList.remove('sending', 'sent');
        }
        if (bubbleEl) bubbleEl.textContent = defaultBubbleText;
      }
    });
  });
})();

