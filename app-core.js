
   
   
   
      document.addEventListener('DOMContentLoaded', () => {
        const soundHint = document.getElementById('sound-hint');
        const soundBtn = document.querySelector('#sound-hint .btn3');
      
        if (soundBtn && soundHint) {
          soundBtn.addEventListener('click', () => {
            soundHint.classList.add('hide');
            setTimeout(() => soundHint.remove(), 500); // remove fully after fade
          });
        }
      });
      
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
  
    // keep the original bubble text/template to be able to reset
    const defaultBubbleText =
      (bubbleEl && bubbleEl.getAttribute('data-initial')) ||
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
    const DEV_SKIP_REGISTRATION = false;  // true = start directly in step 2
    const DEV_DEFAULT_NAME   = 'du';
    const DEV_DEFAULT_AVATAR = 'cat';
  
    // ---------- Avatar carousel (step 1) ----------
    const avatars = [
      { value: "bunny",      label: "bunny",      src: "img/avatars/bunny.png" },
      { value: "snail",      label: "snail",      src: "img/avatars/snail.png" },
      { value: "thingy",     label: "thingy",     src: "img/avatars/thingy.png" },
      { value: "devil",      label: "devil",      src: "img/avatars/devil.png" },
      { value: "frog",       label: "frog",       src: "img/avatars/frog.png" },
      { value: "lion",       label: "lion",       src: "img/avatars/lion.png" },
      { value: "plant",      label: "plant",      src: "img/avatars/plant.png" },
      { value: "prince",     label: "prince",     src: "img/avatars/prince.png" },
      { value: "rabbit",     label: "rabbit",     src: "img/avatars/rabbit.png" },
      { value: "trumpet",    label: "trumpet",    src: "img/avatars/trumpet.png" },
      { value: "kp",         label: "kp",         src: "img/avatars/kp.png" },
      { value: "bat",        label: "bat",        src: "img/avatars/bat.png" },
      { value: "dicky",      label: "dicky",      src: "img/avatars/dicky.png" },
      { value: "wursti",     label: "wursti",     src: "img/avatars/wursti.png" },
      { value: "dachshund",  label: "dachshund",  src: "img/avatars/dachshund.png" },
      { value: "kindl",      label: "kindl",      src: "img/avatars/kindl.png" },
      { value: "fairy",      label: "fairy",      src: "img/avatars/fairy.png" },
      { value: "cheburashka",label: "cheburashka",src: "img/avatars/cheburashka.png" },
      { value: "mischa",     label: "mischa",     src: "img/avatars/mischa.png" },
      { value: "clippy",     label: "clippy",     src: "img/avatars/clippy.png" },
      { value: "cat",        label: "cat",        src: "img/avatars/cat.png" },
      { value: "drink",      label: "drink",      src: "img/avatars/drink.png" },
      { value: "puke",       label: "puke",       src: "img/avatars/puke.png" },
      { value: "monk",       label: "monk",       src: "img/avatars/monk.png" },
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
  
    // ---------- Hydrate step 2 with chosen data (and type bubble once) ----------
    function hydrateSortStep() {
      if (nameSpan) nameSpan.textContent = (state.name || 'du').toLowerCase();
  
      const pickedValue = (avatarInput && avatarInput.value) || state.avatar;
      const match = avatars.find(a => a.value === pickedValue);
      if (match && chosenAvatar) {
        chosenAvatar.src = match.src;
        chosenAvatar.alt = `Avatar: ${match.label || match.value}`;
      }
  
      // Initial bubble typing — only once
      const bubble = document.querySelector('#step-sort .bubble');
      if (bubble && !bubble.dataset.typedOnce) {
        const template =
          bubble.getAttribute('data-initial') ||
          bubble.textContent ||
          defaultBubbleText;
  
        const name = (state.name || 'du').toLowerCase();
        const text = template.replace(/__NAME__/g, name);
  
        bubble.dataset.typedOnce = 'true';
        if (window.RSVP?.typeBubbleText) {
          window.RSVP.typeBubbleText(text, 25); // use shared typer (with sound)
        } else {
          bubble.textContent = text;
        }
      }
    }

    
  
    // ---------- Email (EmailJS SDK required) ----------
    async function sendEmail(payload) {
      if (!(window.emailjs && window.EMAILJS)) {
        throw new Error('EmailJS SDK or config not found');
      }
  
      const { SERVICE_ID, TEMPLATE_ID } = window.EMAILJS;
  
      // Map to readable label if you prefer (template still uses {{choice}})
      const choiceLabel = {
        yes: 'Ja',
        yes_plus_one: 'Ja, mit Begleitung',
        no: 'Nein',
      }[payload.choice] || payload.choice || '';
  
      // ⚠️ keys MUST match your EmailJS template ({{name}}, {{avatar}}, {{choice}})
      const params = {
        name:   payload.name,
        avatar: payload.avatar,
        choice: choiceLabel,
      };
  
      // Helpful log while debugging:
      console.log('[EmailJS] sending', { SERVICE_ID, TEMPLATE_ID, params });
  
      return emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
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
          alert('Bitte gib deinen Namen ein.');
          return;
        }
  
        state.name   = name.toLowerCase();
        state.avatar = avatar;
  
        hydrateSortStep();
        stepIdentity?.classList.add('hidden');
        stepSort?.classList.remove('hidden');
  
        // (Optional) restore previous for same name
        const saved = localStorage.getItem('kimmis_bayernparty_rsvp');
        if (saved) {
          const prev = JSON.parse(saved);
          if (prev.name === name) {
            Object.assign(state, prev);
            // we stay on step-sort and let DnD drive the UI
          }
        }
      });
    }
  
    // ---------- Back button on step 2 ----------
    document.addEventListener('DOMContentLoaded', () => {
      setInitialVisibility();
  
      if (DEV_SKIP_REGISTRATION) {
        state.name = DEV_DEFAULT_NAME;
        state.avatar = DEV_DEFAULT_AVATAR;
        if (avatarInput) avatarInput.value = DEV_DEFAULT_AVATAR;
        hydrateSortStep();
      }

   

      

  
  
      const backBtn = $('#backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          stepIdentity?.classList.remove('hidden');
          stepSort?.classList.add('hidden');
  
          // reset bubble to original template
          const bubble = $('#step-sort .bubble');
          if (bubble) {
            bubble.textContent = defaultBubbleText;
            delete bubble.dataset.typedOnce;
          }
  
          // visually reset any basket art if needed
          if (filledBasket) {
            restoreBasketImage(filledBasket);
            filledBasket = null;
          }
  
          // show Breze again
          const brezel = document.querySelector('.item img.brezel');
          if (brezel) brezel.style.visibility = 'visible';
  
          // disable submit
          const submitBtn = $('#submitChoiceBtn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Abschicken';
            submitBtn.classList.remove('sending', 'sent');
          }
        });
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
      // drag-drop.js will add: typeBubbleText
    };
  })();