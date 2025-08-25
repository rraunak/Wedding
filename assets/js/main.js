(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Mobile nav toggle
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    // Close on link click (mobile)
    $$('#navMenu a').forEach(a => a.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  // Smooth scroll for anchor links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', id);
  });

  // Countdown
  const targetDate = new Date('2025-11-25T10:30:00+05:30');
  const cdEls = {
    days: $('#cd-days'),
    hours: $('#cd-hours'),
    mins: $('#cd-mins'),
    secs: $('#cd-secs')
  };
  function updateCountdown() {
    const now = new Date();
    let diff = Math.max(0, targetDate - now);
    const sec = 1000; const min = sec * 60; const hr = min * 60; const day = hr * 24;
    const days = Math.floor(diff / day); diff -= days * day;
    const hours = Math.floor(diff / hr); diff -= hours * hr;
    const mins = Math.floor(diff / min); diff -= mins * min;
    const secs = Math.floor(diff / sec);
    if (cdEls.days) cdEls.days.textContent = String(days).padStart(2, '0');
    if (cdEls.hours) cdEls.hours.textContent = String(hours).padStart(2, '0');
    if (cdEls.mins) cdEls.mins.textContent = String(mins).padStart(2, '0');
    if (cdEls.secs) cdEls.secs.textContent = String(secs).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Reveal on scroll
  const revealEls = $$('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  // Lightbox
  const lightbox = $('#lightbox');
  const lbImg = $('#lbImage');
  const lbClose = $('#lbClose');
  const lbPrev = $('#lbPrev');
  const lbNext = $('#lbNext');
  const galleryLinks = $$('#galleryGrid a');
  let currentIndex = -1;

  function openLightbox(index) {
    if (!lightbox || !lbImg) return;
    currentIndex = index;
    lbImg.src = galleryLinks[currentIndex].href;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  function show(delta) {
    if (currentIndex < 0) return;
    currentIndex = (currentIndex + delta + galleryLinks.length) % galleryLinks.length;
    lbImg.src = galleryLinks[currentIndex].href;
  }

  galleryLinks.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(i);
    });
  });
  lbClose && lbClose.addEventListener('click', closeLightbox);
  lbPrev && lbPrev.addEventListener('click', () => show(-1));
  lbNext && lbNext.addEventListener('click', () => show(1));
  lightbox && lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(-1);
    if (e.key === 'ArrowRight') show(1);
  });

  // RSVP: Google Form redirect button
  const rsvpOpenFormBtn = $('#rsvpOpenFormBtn');
  if (rsvpOpenFormBtn && typeof window !== 'undefined') {
    rsvpOpenFormBtn.addEventListener('click', () => {
      const url = window.RSVP_GOOGLE_FORM_URL || '';
      if (!url) {
        alert('Google Form URL is not set yet.');
        return;
      }
      window.open(url, '_blank', 'noopener');
    });
  }

  // RSVP form (legacy, if form still exists in DOM)
  const rsvpForm = $('#rsvpForm');
  const rsvpSuccess = $('#rsvpSuccess');
  const rsvpNote = $('#rsvpNote');
  if (typeof window !== 'undefined' && rsvpNote) {
    if (window.RSVP_ENDPOINT && String(window.RSVP_ENDPOINT).startsWith('http')) {
      rsvpNote.textContent = 'Your RSVP will be recorded securely to our guest list.';
    }
  }
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(rsvpForm);
      const data = Object.fromEntries(formData.entries());
      data.events = formData.getAll('events');

      // Save locally as a fallback
      try {
        const all = JSON.parse(localStorage.getItem('rsvps') || '[]');
        all.push({ ...data, ts: new Date().toISOString() });
        localStorage.setItem('rsvps', JSON.stringify(all));
      } catch {}

      const endpoint = window.RSVP_ENDPOINT || '';
      if (!endpoint) {
        alert('RSVP received locally. Host has not connected Google Sheets yet.');
        rsvpSuccess && (rsvpSuccess.hidden = false);
        rsvpForm.reset();
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('name', data.name || '');
        params.set('email', data.email || '');
        params.set('phone', data.phone || '');
        params.set('guests', data.guests || '');
        params.set('attendance', data.attendance || '');
        params.set('events', Array.isArray(data.events) ? data.events.join(', ') : (data.events || ''));
        params.set('message', data.message || '');
        params.set('submittedAt', new Date().toISOString());

        if (/script\.google\.com/.test(endpoint)) {
          // Redirect-proof: send as GET beacon so query survives 302 to usercontent host
          const beacon = new Image();
          beacon.src = `${endpoint}?${params.toString()}`;
          rsvpSuccess && (rsvpSuccess.hidden = false);
          rsvpForm.reset();
          window.scrollTo({ top: rsvpForm.offsetTop - 80, behavior: 'smooth' });
          return;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: params.toString()
        });
        rsvpSuccess && (rsvpSuccess.hidden = false);
        rsvpForm.reset();
        window.scrollTo({ top: rsvpForm.offsetTop - 80, behavior: 'smooth' });
      } catch (err) {
        alert('Could not submit to Google Sheets. Saved locally, please try again later.');
      }
    });
  }
})();


