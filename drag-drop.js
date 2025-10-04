/* =========================================================
   kimmis bayernparty — drag-drop.js
   ---------------------------------------------------------
   Responsibilities:
   - Prevent native img drag on the Breze
   - Init Shopify Draggable Sortable between source & basket slots
   - Update bubble text (with helper line)
   - Enable bottom "Antwort senden" button and send via EmailJS
   ========================================================= */

   (function () {
    const {
      $, state,
      applyBasketSwap,
      restoreBasketImage,
      defaultBubbleText,
      sendEmail,
    } = window.RSVP || {};
  
    let filledBasket = null; // local visual tracker
    let bubbleEl;
    let submitBtn;
  
    // Update bubble + enable submit (no email yet)
    function onChoice(choice) {
      state.choice = choice;
      state.submittedAt = new Date().toISOString();
  
      const map = {
        yes: 'juhu, du kommst!',
        yes_plus_one: 'juhu, du kommst mit begleitung!',
        no: 'schade, vielleicht nächstes mal <3'
      };
  
      const msg = (map[choice] || '').trim();
  
      // helper text on a new line
      const helper = `falls du den falschen korb gewählt hast, zieh die breze einfach rüber. ansonsten kannst du deine antwort mit dem button unten abschicken!`;
  
      bubbleEl = bubbleEl || $('#step-sort .bubble');
      if (bubbleEl) bubbleEl.innerHTML = `${msg}<br><small>${helper}</small>`;
  
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Abschicken';
      }
    }
  
    // Send the email when user clicks bottom button
    async function onSubmitChoice() {
      if (!state.choice) return;
  
      // ensure we send up-to-date identity
      state.name   = ($('#guestNameSpan')?.textContent || state.name || 'Gast').trim();
      state.avatar = $('#avatarInput')?.value || state.avatar || '';
      state.submittedAt = new Date().toISOString();
  
      submitBtn.disabled = true;
      submitBtn.textContent = 'Senden…';
  
      try {
        await sendEmail(state);
        submitBtn.textContent = 'Gesendet ✓';
        document.querySelector('.item')?.classList.add('locked');
      } catch (err) {
        console.error('sendEmail error:', err);
        submitBtn.textContent = 'Fehler – nochmal?';
        submitBtn.disabled = false;
      }
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      bubbleEl = $('#step-sort .bubble');
      submitBtn = $('#submitChoiceBtn');
      if (submitBtn) submitBtn.addEventListener('click', onSubmitChoice);
  
      // Prevent native image drag on the Breze (browser drag, not Shopify)
      const brezel = document.querySelector('.item img.brezel');
      if (brezel) brezel.setAttribute('draggable', 'false');
  
      // containers: source `.ticket-container` and each `.basket .slot`
      const containers = document.querySelectorAll('.ticket-container, .basket .slot');
      if (!containers.length || !window.Draggable || !Draggable.Sortable) {
        console.warn('[Drag] Missing containers or Draggable.Sortable not loaded.');
        return;
      }
  
      const sortable = new Draggable.Sortable(containers, {
        draggable: '.item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.SwapAnimation] // optional animation
      });
  
      // Leaving a basket: restore its art & show Breze again
      sortable.on('sortable:start', ({ oldContainer, dragEvent }) => {
        const fromBasket = oldContainer?.closest('.basket');
        const item = dragEvent.source;
  
        item.classList.remove('in-basket');
  
        const brezeImg = item.querySelector('.brezel');
        if (brezeImg) brezeImg.classList.remove('hidden');
  
        if (fromBasket) {
          restoreBasketImage(fromBasket);
          if (filledBasket === fromBasket) filledBasket = null;
        }
      });
  
      // Dropped somewhere
      sortable.on('sortable:stop', ({ newContainer, oldContainer, dragEvent }) => {
        const item = dragEvent.source;
        const toBasket = newContainer?.closest('.basket');
        const fromBasket = oldContainer?.closest?.('.basket');
  
        if (toBasket) {
          applyBasketSwap(toBasket);
          if (fromBasket && fromBasket !== toBasket) restoreBasketImage(fromBasket);
  
          // Hide the moving Breze to make it feel like it “stayed” in the basket art
          const brezeImg = item.querySelector('.brezel');
          if (brezeImg) brezeImg.classList.add('hidden');
  
          item.classList.add('in-basket');
          filledBasket = toBasket;
  
          onChoice(toBasket.dataset.choice); // enables bottom submit button
        } else {
          // back to source
          item.classList.remove('in-basket');
          const brezeImg = item.querySelector('.brezel');
          if (brezeImg) brezeImg.classList.remove('hidden');
  
          if (filledBasket) {
            restoreBasketImage(filledBasket);
            filledBasket = null;
          }
  
          // disable submit and restore bubble text
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Antwort senden';
          }
          if (bubbleEl) bubbleEl.textContent = defaultBubbleText;
        }
      });
    });
  })();