/* =========================================================
   kimmis bayernparty — app-core.js
   ---------------------------------------------------------
   Responsibilities:
   - Global helpers ($, $$)
   - Initial visibility (step 1 vs step 2)
   - Global state (window.RSVP.state)
   - Avatar carousel + identity form
   - Hydrate step 2 (name + avatar)
   - Email sending (EmailJS)
   - Basket image swap helpers
   - Expose API on window.RSVP for drag-drop.js
   ========================================================= */

   (function () {
    // ---------- Utilities ----------
    const $  = (sel, ctx=document) => ctx.querySelector(sel);
    const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  
    // ---------- DOM refs ----------
    const stepIdentity   = $('#step-identity');
    const stepSort       = $('#step-sort');
    const identityForm   = $('#identityForm');
    const guestNameInput = $('#guestName');
    const hp             = $('#hp_website'); // honeypot (optional)
  
    const avatarImage    = $('#avatarImage'); // carousel preview
    const avatarLabel    = $('#avatarLabel'); // may be null
    const avatarInput    = $('#avatarInput'); // hidden avatar value (e.g. "cat")
  
    const chosenAvatar   = $('#chosenAvatar');     // shown in step 2
    const nameSpan       = $('#guestNameSpan');    // shown in step 2
    const bubbleEl       = $('#step-sort .bubble');// bubble text element
  
    const defaultBubbleText =
      (bubbleEl && bubbleEl.textContent.trim()) ||
      'zieh die breze in den passenden korb:';
  
    // ---------- State ----------
    const state = {
      name: '',
      avatar: '',
      choice: '',            // "yes" | "yes_plus_one" | "no"
      submittedAt: null
    };
  
    // Track which basket currently shows the “with breze” image
    let filledBasket = null;
  
    // ---------- Config (toggle dev mode) ----------
    const DEV_SKIP_REGISTRATION = true;  // true = start directly in step 2
    const DEV_DEFAULT_NAME   = 'Gast';
    const DEV_DEFAULT_AVATAR = 'thingy';
  
    // ---------- Avatar carousel (step 1) ----------
    const avatars = [
      { value: "bunny",  label: "bunny",  src: "img/avatars/bunny.png"  },
      { value: "frog",   label: "frog",   src: "img/avatars/frog.png"   },
      { value: "devil",  label: "devil",  src: "img/avatars/devil.png"  },
      { value: "monk",   label: "monk",   src: "img/avatars/monk.png"   },
      { value: "thingy", label: "thingy", src: "img/avatars/thingy.png" },
      { value: "cat",    label: "cat",    src: "img/avatars/cat2.png"   },
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
  
      // live reflect if step 2 is visible
      if (!stepSort?.classList.contains('hidden')) hydrateSortStep();
    }
  
    // ---------- Initial visibility ----------
    function setInitialVisibility() {
      // Ensure CSS has: .hidden { display:none !important; }
      if (DEV_SKIP_REGISTRATION) {
        stepIdentity?.classList.add('hidden');
        stepSort?.classList.remove('hidden');
      } else {
        stepIdentity?.classList.remove('hidden');
        stepSort?.classList.add('hidden');
      }
    }
  
    // ---------- Hydrate step 2 with chosen data ----------
    function hydrateSortStep() {
      if (nameSpan) nameSpan.textContent = state.name || 'Gast';
  
      const pickedValue = (avatarInput && avatarInput.value) || state.avatar;
      const match = avatars.find(a => a.value === pickedValue);
      if (match && chosenAvatar) {
        chosenAvatar.src = match.src;
        chosenAvatar.alt = `Avatar: ${match.label || match.value}`;
      }
    }
  
    // ---------- Email (EmailJS SDK required) ----------
    async function sendEmail(payload) {
      if (!window.EMAILJS || !window.emailjs) {
        throw new Error('EmailJS SDK or config not found');
      }
      const { SERVICE_ID, TEMPLATE_ID } = window.EMAILJS;
  
      const params = {
        name:        payload.name,
        avatar:      payload.avatar,
        choice:      payload.choice,
        submittedAt: payload.submittedAt,
        title:       'kimmis bayernparty'
      };
  
      return window.emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
    }
  
    // ---------- Basket image swap helpers ----------
    function applyBasketSwap(targetBasket) {
      if (filledBasket && filledBasket !== targetBasket) {
        restoreBasketImage(filledBasket);
      }
      const img = targetBasket.querySelector('img');
      if (!img) return;
      if (!img.dataset.originalSrc) img.dataset.originalSrc = img.getAttribute('src');
      const brezeSrc = img.dataset.brezeSrc || deriveBrezeSrc(img.dataset.originalSrc);
      if (brezeSrc) {
        img.src = brezeSrc;
        filledBasket = targetBasket;
      }
    }
  
    function restoreBasketImage(basket) {
      const img = basket?.querySelector('img');
      if (!img) return;
      const original = img.dataset.originalSrc;
      if (original) img.src = original;
    }
  
    function deriveBrezeSrc(original) {
      // "img/basket1.png" -> "img/basket1breze.png"
      return original ? original.replace(/(\.[a-z]+)$/i, 'breze$1') : '';
    }
  
    // ---------- Identity submit (only when not skipping) ----------
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
  
        hydrateSortStep();
        stepIdentity?.classList.add('hidden');
        stepSort?.classList.remove('hidden');
  
        // Optional: restore previous for same name
        const saved = localStorage.getItem('kimmis_bayernparty_rsvp');
        if (saved) {
          const prev = JSON.parse(saved);
          if (prev.name === name) {
            Object.assign(state, prev);
            // do not showDone() here; we stay on step-sort and let DnD drive UI
          }
        }
      });
    }
  
    // ---------- DEV boot ----------
    document.addEventListener('DOMContentLoaded', () => {
      setInitialVisibility();
  
      if (DEV_SKIP_REGISTRATION) {
        state.name = DEV_DEFAULT_NAME;
        state.avatar = DEV_DEFAULT_AVATAR;
        if (avatarInput) avatarInput.value = DEV_DEFAULT_AVATAR;
        hydrateSortStep();
      }
    });
  
    // ---------- Expose API for drag-drop.js ----------
    window.RSVP = {
      $, $$,
      state,
      hydrateSortStep,
      sendEmail,
      applyBasketSwap,
      restoreBasketImage,
      deriveBrezeSrc,
      defaultBubbleText,
    };
  })();
