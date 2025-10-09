(function () {
    const api = window.RSVP || {};
    const { $, state, applyBasketSwap, restoreBasketImage, defaultBubbleText, sendEmail } = api;
  
    let filledBasket = null;
    let bubbleEl;
    let submitBtn;
  
    // ---------- safe breze lookup + hide/show ----------
    function getBrezeImg(itemEl) {
      console.log("Brezel found!");
      return document.querySelector('img.brezel');
    }
    function hideBreze(itemEl) {
      var img = getBrezeImg(itemEl);
      console.log("Brezel hidden!");
      img.style.visibility = 'hidden';
    }
    function showBreze(itemEl) {
      var img = getBrezeImg(itemEl);
      console.log("Brezel is back!");
      img.style.visibility = 'visible';
    }
  

    function typeBubbleText(html, speed = 25) {
      bubbleEl = bubbleEl || document.querySelector('#step-sort .bubble');
      if (!bubbleEl) return;
      bubbleEl.innerHTML = '';
  
      let i = 0;
      let isTag = false;
      let soFar = '';
  
      function tick() {
        if (i >= html.length) return;
        const ch = html[i++];
        soFar += ch;
        bubbleEl.innerHTML = soFar;
  
        if (ch === '<') isTag = true;
        if (ch === '>') isTag = false;
  
        setTimeout(tick, isTag ? 0 : speed);
      }
      tick();
    }
  
    // ---------- bubble + bottom button ----------
    function onChoice(choice) {
      state.choice = choice;
      state.submittedAt = new Date().toISOString();
  
      const map = {
        yes: 'juhu, du kommst!',
        yes_plus_one: 'juhu, du kommst mit begleitung!',
        no: 'schade, vielleicht nächstes mal <3'
      };
      const msg = (map[choice] || '').trim();
      const helper = `<br><small>falls du den falschen korb gewählt hast, zieh die breze einfach rüber. andernfalls kannst du deine antwort mit dem button unten abschicken!</small>`;
      const html = `${msg}${helper}`;
  
      typeBubbleText(html, 25);
  
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Abschicken';
        submitBtn.classList.remove('sent', 'sending');
      }
    }
  
    async function onSubmitChoice() {
      if (!state.choice || !submitBtn) return;
  
      // ensure identity is current
      state.name   = ($('#guestNameSpan')?.textContent || state.name || 'Gast').trim();
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
        // optional: lock dragging after send
        // document.querySelector('.item')?.classList.add('locked');
      } catch (err) {
        console.error('sendEmail error:', err);
        submitBtn.textContent = 'Fehler – nochmal?';
        submitBtn.disabled = false;
        submitBtn.classList.remove('sending', 'sent');
      }
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      bubbleEl = $('#step-sort .bubble');
      submitBtn = $('#submitChoiceBtn');
      submitBtn?.addEventListener('click', onSubmitChoice);
  
      // prevent native image drag
      const brezeInit = getBrezeImg(document.querySelector('.item'));
      brezeInit?.setAttribute('draggable', 'false');
  
      // Draggable wiring
      const containers = document.querySelectorAll('.ticket-container, .basket .slot');
      if (!containers.length) {
        console.warn('[Drag] No containers found');
        return;
      }
      if (!(window.Draggable && Draggable.Sortable)) {
        console.warn('[Drag] Draggable.Sortable not available — check the script tag (use UMD beta.12).');
        return;
      }
  
      const sortable = new Draggable.Sortable(containers, {
        draggable: '.item',
        mirror: { constrainDimensions: true },
        plugins: [Draggable.Plugins.SwapAnimation]
      });
  
      // start dragging
      sortable.on('sortable:start', ({ oldContainer, dragEvent }) => {
        const item = dragEvent?.source;
        if (!item) return;
  
        item.classList.remove('in-basket');
        showBreze(item);
  
        const fromBasket = oldContainer?.closest?.('.basket');
        if (fromBasket) {
          restoreBasketImage(fromBasket);
          if (filledBasket === fromBasket) filledBasket = null;
        }
      });
  
      // stop dragging
      sortable.on('sortable:stop', ({ newContainer, oldContainer, dragEvent }) => {
        const item = dragEvent?.source;
        if (!item) return;
  
        const toBasket = newContainer?.closest?.('.basket');
        const fromBasket = oldContainer?.closest?.('.basket');
  
        if (toBasket) {
          applyBasketSwap(toBasket);
          if (fromBasket && fromBasket !== toBasket) restoreBasketImage(fromBasket);
  
          hideBreze(item); // <- robust hide (no null style)
          item.classList.add('in-basket');
          filledBasket = toBasket;
  
          onChoice(toBasket.dataset.choice);
        } else {
          // back to source
          item.classList.remove('in-basket');
          showBreze(item);
  
          if (filledBasket) {
            restoreBasketImage(filledBasket);
            filledBasket = null;
          }
  
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Antwort senden';
            submitBtn.classList.remove('sending', 'sent');
          }
          if (bubbleEl) bubbleEl.textContent = defaultBubbleText;
        }
      });
    });

  })();