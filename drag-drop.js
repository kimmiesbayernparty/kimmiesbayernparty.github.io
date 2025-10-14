/* =========================================================
   kimmis bayernparty — drag-drop.js
   ---------------------------------------------------------
   Responsibilities:
   - Prevent native img drag on the Breze
   - Init Shopify Draggable Sortable (UMD) between source & basket slots
   - Mirror sizing fix (avoid stretched mirror on mobile)
   - Hide the moving Breze when dropped (basket shows breze art)
   - Bubble typing effect with sound
   - Show helper only on first choice
   - Enable bottom "Abschicken" button
   - Send via EmailJS and then show "step-done" + confetti
   ========================================================= */

   (function () {
    const api = window.RSVP || {};
    const { $, state, applyBasketSwap, restoreBasketImage, defaultBubbleText, sendEmail } = api;
  
    let filledBasket = null;
    let bubbleEl;
    let submitBtn;
  
    // ----- helper shown only once -----
    let helperShown = false;
  
    // ---------- preload permission for iOS audio once ----------
    document.addEventListener('click', () => {
      const preload = new Audio('sounds/avatar.wav');
      preload.play().then(() => {
        preload.pause();
        preload.currentTime = 0;
      }).catch(() => {});
    }, { once: true });
  
    // ---------- typing sound ----------
    const typingSound = new Audio('sounds/avatar.mp3');
    typingSound.loop = true;
  
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
  
    // ---------- typing effect that respects HTML tags & plays sound ----------
    function typeBubbleText(html, speed = 25) {
      bubbleEl = bubbleEl || document.querySelector('#step-sort .bubble');
      if (!bubbleEl) return;
  
      bubbleEl.innerHTML = '';              // clear content
      bubbleEl.style.backgroundColor = '#fff';
      bubbleEl.style.transition = 'none';
  
      let i = 0;
      let isTag = false;
      let soFar = '';
  
      // start sound
      typingSound.currentTime = 0;
      typingSound.play().catch(() => {});
  
      function tick() {
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
      }
      tick();
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
  
      // ensure identity is current
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
  
        // switch to "done" section if present
        const stepSort = document.getElementById('step-sort');
        const stepDone = document.getElementById('step-done');
        if (stepSort && stepDone) {
          stepSort.classList.add('hidden');
          stepDone.classList.remove('hidden');
        }
  
        // confetti (if canvas-confetti is loaded)
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
      const brezeInit = getBrezeImg(document.querySelector('.item'));
      brezeInit?.setAttribute('draggable', 'false');
  
      const containers = document.querySelectorAll('.ticket-container, .basket .slot');
      if (!containers.length) {
        console.warn('[Drag] No containers found');
        return;
      }
  
      // UMD Draggable available?
      if (!(window.Draggable && Draggable.Sortable)) {
        console.warn('[Drag] Draggable.Sortable not available — include the UMD bundle.');
        return;
      }
  
      const sortable = new Draggable.Sortable(containers, {
        draggable: '.item',
        plugins: [Draggable.Plugins.SwapAnimation],
        mirror: {
          appendTo: document.body,         // avoid parent flex/grid effects
          constrainDimensions: true        // copy source width/height
        }
      });
  
      // keep mirror proportions (avoid stretched mirror)
      sortable.on('mirror:created', ({ mirror, source }) => {
        const rect = source.getBoundingClientRect();
        mirror.style.width  = rect.width + 'px';
        mirror.style.height = rect.height + 'px';
        const img = mirror.querySelector('img');
        if (img) {
          img.style.width  = '100%';
          img.style.height = 'auto';
        }
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
  
          hideBreze(item); // <- robust hide
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
            submitBtn.textContent = 'Abschicken';
            submitBtn.classList.remove('sending', 'sent');
          }
          if (bubbleEl) bubbleEl.textContent = defaultBubbleText;
        }
      });
    });
  })();


// (function () {
//     const api = window.RSVP || {};
//     const { $, state, applyBasketSwap, restoreBasketImage, defaultBubbleText, sendEmail } = api;
  
//     let filledBasket = null;
//     let bubbleEl;
//     let submitBtn;
  
//     // ---------- safe breze lookup + hide/show ----------
//     function getBrezeImg(itemEl) {
//       console.log("Brezel found!");
//       return document.querySelector('img.brezel');
//     }
//     function hideBreze(itemEl) {
//       var img = getBrezeImg(itemEl);
//       console.log("Brezel hidden!");
//       img.style.visibility = 'hidden';
//     }
//     function showBreze(itemEl) {
//       var img = getBrezeImg(itemEl);
//       console.log("Brezel is back!");
//       img.style.visibility = 'visible';
//     }
  

//     document.addEventListener('click', () => {
//       const preload = new Audio('sounds/avatar.wav');
//       preload.play().then(() => {
//         preload.pause();
//         preload.currentTime = 0;
//       }).catch(() => {});
//     }, { once: true });

    

//     // Load sound once
//     const typingSound = new Audio('sounds/avatar.mp3');
//     typingSound.loop = true;
    
//     function typeBubbleText(html, speed = 25) {
//       bubbleEl = bubbleEl || document.querySelector('#step-sort .bubble');
//       if (!bubbleEl) return;
    
//       bubbleEl.innerHTML = ""; // clear content before typing
//       bubbleEl.style.backgroundColor = '#fff';
//       bubbleEl.style.transition = 'none';
    
//       let i = 0;
//       let isTag = false;
//       let soFar = '';
    
//       // Start sound
//       typingSound.currentTime = 0;
//       typingSound.play().catch(() => {});
    
//       function tick() {
//         if (i >= html.length) {
//           // Stop sound
//           typingSound.pause();
//           typingSound.currentTime = 0;
//           return;
//         }
    
//         const ch = html[i++];
//         soFar += ch;
//         bubbleEl.innerHTML = soFar;
    
//         if (ch === '<') isTag = true;
//         if (ch === '>') isTag = false;
    
//         setTimeout(tick, isTag ? 0 : speed);
//       }
    
//       tick();
//     }


// // put this near the top of drag-drop.js (module scope)
// // ✅ Put this ONCE at the top (very first line) of drag-drop.js
// let helperShown = false;

// function onChoice(choice) {
//   state.choice = choice;
//   state.submittedAt = new Date().toISOString();

//   const map = {
//     yes: 'juhu, du kommst!',
//     yes_plus_one: 'juhu, du kommst mit begleitung!',
//     no: 'schade, vielleicht nächstes mal <3'
//   };

//   const msg = (map[choice] || '').trim();

//   // ✅ helper text FIRST TIME ONLY
//   const helperHtml = '<br><small>falls du den falschen korb gewählt hast, zieh die breze einfach rüber. andernfalls kannst du deine antwort mit dem button unten abschicken!</small>';
//   const html = helperShown ? msg : `${msg}${helperHtml}`;
//   helperShown = true; // mark as shown after first use

//   // ✅ type with sound
//   typeBubbleText(html, 25);

//   // ✅ enable submit
//   if (submitBtn) {
//     submitBtn.disabled = false;
//     submitBtn.textContent = 'Abschicken';
//     submitBtn.classList.remove('sent', 'sending');
//   }
// }

    
  
//     async function onSubmitChoice() {
//       if (!state.choice || !submitBtn) return;
  
//       // ensure identity is current
//       state.name   = ($('#guestNameSpan')?.textContent || state.name || 'Gast').trim()
//       state.avatar = $('#avatarInput')?.value || state.avatar || '';
//       state.submittedAt = new Date().toISOString();
  
//       submitBtn.disabled = true;
//       submitBtn.textContent = 'Senden…';
//       submitBtn.classList.add('sending');
  
//       try {
//         await sendEmail(state);
//         submitBtn.textContent = 'Gesendet ✓';
//         submitBtn.classList.remove('sending');
//         submitBtn.classList.add('sent');
//         const stepSort = document.getElementById('step-sort');
//       const stepDone = document.getElementById('step-done');
//       if (stepSort) stepSort.classList.add('hidden');
//       if (stepDone) stepDone.classList.remove('hidden');
//         confetti({
//           particleCount: 1000,
//           spread: 100,
//           origin: { x: 0.5, y: 0.8 },
//           colors: ['#005BBB', '#FFFFec'],
//         });
//       } catch (err) {
//         console.error('sendEmail error:', err);
//         submitBtn.textContent = 'Fehler – nochmal?';
//         submitBtn.disabled = false;
//         submitBtn.classList.remove('sending', 'sent');
//       }
//     }
  
//     document.addEventListener('DOMContentLoaded', () => {
//       bubbleEl = $('#step-sort .bubble');
//       submitBtn = $('#submitChoiceBtn');
//       submitBtn?.addEventListener('click', onSubmitChoice);
  
//       // prevent native image drag
//       const brezeInit = getBrezeImg(document.querySelector('.item'));
//       brezeInit?.setAttribute('draggable', 'false');
  
//       // Draggable wiring
//       const containers = document.querySelectorAll('.ticket-container, .basket .slot');
//       if (!containers.length) {
//         console.warn('[Drag] No containers found');
//         return;
//       }
//       if (!(window.Draggable && Draggable.Sortable)) {
//         console.warn('[Drag] Draggable.Sortable not available — check the script tag (use UMD beta.12).');
//         return;
//       }
  
//       const sortable = new Draggable.Sortable(containers, {
//         draggable: '.item',
//         plugins: [Draggable.Plugins.SwapAnimation],
//         mirror: {
//           appendTo: document.body,         // avoid parent flex/grid effects
//           constrainDimensions: true        // copy source width/height
//         }
//       });
      
//       sortable.on('mirror:created', ({ mirror, source }) => {
//         const rect = source.getBoundingClientRect();
//         mirror.style.width  = rect.width + 'px';
//         mirror.style.height = rect.height + 'px';
//         const img = mirror.querySelector('img');
//         if (img) { img.style.width = '100%'; img.style.height = 'auto'; }
//       });
  
//       // start dragging
//       sortable.on('sortable:start', ({ oldContainer, dragEvent }) => {
//         const item = dragEvent?.source;
//         if (!item) return;
  
//         item.classList.remove('in-basket');
//         showBreze(item);
  
//         const fromBasket = oldContainer?.closest?.('.basket');
//         if (fromBasket) {
//           restoreBasketImage(fromBasket);
//           if (filledBasket === fromBasket) filledBasket = null;
//         }
//       });
  
//       // stop dragging
//       sortable.on('sortable:stop', ({ newContainer, oldContainer, dragEvent }) => {
//         const item = dragEvent?.source;
//         if (!item) return;
  
//         const toBasket = newContainer?.closest?.('.basket');
//         const fromBasket = oldContainer?.closest?.('.basket');
  
//         if (toBasket) {
//           applyBasketSwap(toBasket);
//           if (fromBasket && fromBasket !== toBasket) restoreBasketImage(fromBasket);
  
//           hideBreze(item); // <- robust hide (no null style)
//           item.classList.add('in-basket');
//           filledBasket = toBasket;
  
//           onChoice(toBasket.dataset.choice);
//         } else {
//           // back to source
//           item.classList.remove('in-basket');
//           showBreze(item);
  
//           if (filledBasket) {
//             restoreBasketImage(filledBasket);
//             filledBasket = null;
//           }
  
//           if (submitBtn) {
//             submitBtn.disabled = true;
//             submitBtn.textContent = 'Antwort senden';
//             submitBtn.classList.remove('sending', 'sent');
//           }
//           if (bubbleEl) bubbleEl.textContent = defaultBubbleText;
//         }
//       });
//     });

//   })();