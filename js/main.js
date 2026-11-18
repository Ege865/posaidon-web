/* Posaidon Web — etkileşimler, başvuru formu (Supabase) ve GSAP animasyonları */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reveal = () => root.classList.remove('pre');

  /* ---------- Saat ve yıl ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
    const tick = () => { clock.textContent = `istanbul ${fmt.format(new Date())}`; };
    tick(); setInterval(tick, 15000);
  }
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Menü ---------- */
  const nav = $('[data-nav]');
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr').textContent = open ? 'Menüyü kapat' : 'Menüyü aç';
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && window.gsap) gsap.from($$('.menu__links a', menu), { x: -50, autoAlpha: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' });
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
  matchMedia('(min-width: 721px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Tanıtım filmi ---------- */
  const film = $('[data-film]');
  const video = $('[data-video]');
  const play = $('[data-play]');
  play.addEventListener('click', () => {
    video.controls = true; video.muted = false; video.play();
    film.classList.add('is-playing'); video.focus();
  });
  video.addEventListener('ended', () => { film.classList.remove('is-playing'); video.controls = false; play.focus(); });

  /* ---------- Başvuru formu ---------- */
  const form = $('[data-form]');
  const status = $('[data-status]');
  const MAIL = 'posaidonweb@gmail.com';
  const WA = '905550459337';

  const rules = {
    ad: (v) => (v.trim().length < 2 ? 'Adınızı ve soyadınızı yazın.' : ''),
    eposta: (v) => (!v.trim() ? 'Size dönebilmemiz için e-posta adresinizi yazın.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'E-posta adresi eksik görünüyor; örnek: ornek@gmail.com' : ''),
    telefon: (v) => (v.trim() && v.replace(/\D/g, '').length < 10 ? 'Telefon numarası en az 10 haneli olmalı.' : ''),
    paket: (v) => (!v ? 'Bir paket seçin; emin değilseniz "Karar vermedim"i seçin.' : ''),
    kimin: (v) => (!v ? 'Sitenin kimin için olduğunu seçin.' : ''),
    tur: (v) => (!v ? 'Bir site türü seçin; emin değilseniz "Emin değilim"i seçin.' : ''),
    mesaj: (v) => (v.trim().length < 10 ? 'Birkaç cümleyle işinizden bahsedin.' : ''),
    onay: (v) => (v !== 'evet' ? 'Devam etmek için KVKK Aydınlatma Metni’ni okuduğunuzu onaylayın.' : ''),
  };
  const errId = { ad: 'e-ad', eposta: 'e-mail', telefon: 'e-tel', paket: 'e-paket', kimin: 'e-kimin', tur: 'e-tur', mesaj: 'e-mesaj', onay: 'e-onay' };
  const val = (n) => String(new FormData(form).get(n) || '');

  function check(name) {
    const msg = rules[name](val(name));
    const el = document.getElementById(errId[name]);
    el.textContent = msg;
    const field = el.closest('[data-field]');
    field.classList.toggle('has-error', !!msg);
    $$('input, textarea', field).forEach((i) => {
      i.setAttribute('aria-invalid', msg ? 'true' : 'false');
      i.setAttribute('aria-describedby', errId[name]);
    });
    return !msg;
  }
  function validate() {
    const bad = Object.keys(rules).filter((n) => !check(n));
    if (bad.length) {
      const first = form.querySelector(`[name="${bad[0]}"]`);
      first.focus();
      if (window.gsap) gsap.fromTo(first.closest('[data-field]'), { x: 0 }, { x: 8, duration: 0.5, ease: 'shake', clearProps: 'x' });
      status.textContent = '';
      return null;
    }
    return Object.fromEntries(new FormData(form));
  }
  const body = (d) => [
    `Ad soyad: ${d.ad}`, `E-posta: ${d.eposta}`, d.telefon ? `Telefon: ${d.telefon}` : null,
    `Paket: ${d.paket}`, `Kimin için: ${d.kimin}`, `Site türü: ${d.tur}`, '', 'Mesaj:', d.mesaj,
  ].filter((l) => l !== null).join('\n');

  Object.keys(rules).forEach((n) => {
    $$(`[name="${n}"]`, form).forEach((i) => i.addEventListener(i.type === 'radio' || i.type === 'checkbox' ? 'change' : 'blur', () => {
      if (i.type === 'radio' || i.type === 'checkbox' || i.closest('[data-field]').classList.contains('has-error') || i.value) check(n);
    }));
  });
  $$('[data-pick]').forEach((a) => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="paket"][value="${a.dataset.pick}"]`);
    if (r) { r.checked = true; check('paket'); }
  }));

  /* Başvuruyu Supabase'e kaydeder (js/config.js). Ayar yoksa e-posta uygulamasını açar. */
  const cfg = window.POSAIDON_CONFIG || {};
  const hasDb = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const submitBtn = form.querySelector('button[type="submit"]');

  async function saveToSupabase(d) {
    const row = {
      ad: d.ad.trim(), eposta: d.eposta.trim(), telefon: d.telefon ? d.telefon.trim() : null,
      paket: d.paket, kimin: d.kimin, tur: d.tur, mesaj: d.mesaj.trim(),
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1/basvurular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.supabaseAnonKey,
          // Eski "anon" anahtarı bir JWT'dir ve Authorization'da da gönderilir;
          // yeni "sb_publishable_" anahtarları yalnızca apikey başlığıyla kullanılır.
          ...(cfg.supabaseAnonKey.startsWith('sb_') ? {} : { Authorization: `Bearer ${cfg.supabaseAnonKey}` }),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = validate(); if (!d) return;
    if (d.website) return; // bot tuzağı doldurulmuşsa sessizce yok say
    delete d.website;
    delete d.onay;

    if (!hasDb) {
      const subject = `Web sitesi başvurusu: ${d.ad} (${d.paket})`;
      window.location.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(d))}`;
      status.textContent = `E-posta uygulamanız başvurunuzla birlikte açıldı; “Gönder”e basmanız yeterli. Açılmadıysa ${MAIL} adresine yazın.`;
      return;
    }

    const label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Gönderiliyor…';
    status.textContent = '';
    try {
      await saveToSupabase(d);
      form.reset();
      status.textContent = 'Başvurunuz bize ulaştı. İnceleyip en kısa sürede size dönüyoruz.';
      if (window.gsap) gsap.fromTo(status, { x: -20, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
    } catch (err) {
      console.error('Başvuru kaydedilemedi:', err);
      status.textContent = `Başvurunuz gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin ya da WhatsApp ile gönderin; dilerseniz ${MAIL} adresine de yazabilirsiniz.`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = label;
    }
  });

  $('[data-whatsapp]').addEventListener('click', () => {
    const d = validate(); if (!d) return;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent('Merhaba, Posaidon Web sitesinden yazıyorum.\n\n' + body(d))}`, '_blank', 'noopener');
    status.textContent = 'WhatsApp yeni sekmede açıldı; mesajınız hazır, göndermeniz yeterli.';
  });

  /* ---------- Hizmetler: seçilen hizmetin önizlemesi ---------- */
  const svcs = $$('[data-svc]');
  const stages = $$('[data-stage]');
  let svcIndex = 0;
  function showSvc(i) {
    if (i === svcIndex) return;
    const prev = stages[svcIndex];
    const next = stages[i];
    svcIndex = i;
    svcs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.killTweensOf([prev, next]);
      gsap.to(prev, { autoAlpha: 0, y: -16, duration: 0.3, ease: 'power2.in', onComplete: () => { prev.classList.remove('is-on'); gsap.set(prev, { clearProps: 'all' }); } });
      next.classList.add('is-on');
      gsap.fromTo(next, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', delay: 0.15 });
      gsap.from(next.children, { y: 30, scale: 0.96, duration: 0.8, ease: 'expo.out', stagger: 0.08, delay: 0.2 });
    } else {
      prev.classList.remove('is-on');
      next.classList.add('is-on');
    }
  }
  svcs.forEach((b, i) => {
    b.addEventListener('click', () => showSvc(i));
    b.addEventListener('focus', () => showSvc(i));
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) showSvc(i); });
  });

  /* ---------- GSAP ---------- */
  const steps = $$('[data-step]');
  if (!window.gsap) { reveal(); steps.forEach((s) => s.classList.add('is-done')); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, CustomWiggle);
  CustomWiggle.create('wiggle', { wiggles: 6, type: 'easeOut' });
  CustomWiggle.create('shake', { wiggles: 5, type: 'uniform' });

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: reduce)', () => { reveal(); steps.forEach((s) => s.classList.add('is-done')); });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const sk = document.querySelector('[data-sketch]');
    if (sk) gsap.fromTo(sk, { '--cut': '8%' }, { '--cut': '92%', ease: 'none',
      scrollTrigger: { trigger: sk, start: 'top 75%', end: 'bottom 30%', scrub: 0.6 } });
    /* --- Giriş: fotoğraf yavaşça yaklaşır, logo belirir, satırlar soldan ve sağdan gelir --- */
    document.fonts.ready.then(() => {
      const mark = $('[data-hero-mark]');
      const lines = $$('.hero__title .line');
      const splits = lines.map((l) => new SplitText(l, { type: 'chars,words' }));
      const wig = $('[data-wiggle]');

      gsap.set([mark, ...$$('[data-hero-fade]')], { autoAlpha: 0 });
      reveal();

      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from('.hero__photo', { scale: 1.12, duration: 2.6, ease: 'power3.out' }, 0)
        .from(nav, { yPercent: -100, duration: 0.9, clearProps: 'transform' }, 0.1)
        .fromTo(mark, { autoAlpha: 0, y: 24, scale: 0.7, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.4 }, 0.3)
        .from(splits[0].chars, { x: -80, autoAlpha: 0, duration: 1.1, stagger: 0.025 }, 0.6)
        .from(splits[1].chars, { x: 80, autoAlpha: 0, duration: 1.1, stagger: { each: 0.025, from: 'end' } }, 0.75)
        .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 1.35)
        .to(wig, { rotation: 4, y: -2, duration: 1, ease: 'wiggle' }, 1.7);

      const shakeIt = () => gsap.fromTo(wig, { rotation: 0 }, { rotation: 4, duration: 1, ease: 'wiggle' });
      gsap.delayedCall(6, function loop() { shakeIt(); gsap.delayedCall(7, loop); });
      wig.addEventListener('mouseenter', shakeIt);
    });

    /* --- Turuncu butonlar üzerine gelince titrer --- */
    $$('.chip--solid, .nav__cta, .btn--accent').forEach((b) => b.addEventListener('mouseenter', () => gsap.fromTo(b, { rotation: 0 }, { rotation: 1.6, duration: 0.55, ease: 'wiggle' })));

    /* --- Bölüm başlıkları: harfler sırayla soldan / sağdan --- */
    $$('[data-split]').forEach((h, i) => {
      const s = new SplitText(h, { type: 'chars,words' });
      const left = i % 2 === 0;
      gsap.from(s.chars, {
        x: left ? -60 : 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.018, from: left ? 'start' : 'end' },
        scrollTrigger: { trigger: h, start: 'top 86%', once: true },
      });
    });

    /* --- Tanıtım metni: kaydırdıkça kelimeler aydınlanır --- */
    const stmt = $('[data-highlight]');
    const ws = new SplitText(stmt, { type: 'words', wordsClass: 'w' });
    gsap.to(ws.words, { color: '#f2efe8', stagger: 0.1, ease: 'none', scrollTrigger: { trigger: stmt, start: 'top 78%', end: 'bottom 40%', scrub: 0.6 } });
    $$('[data-fact]').forEach((f, i) => {
      gsap.from(f.children, { x: i % 2 ? 60 : -60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: f, start: 'top 90%', once: true } });
    });

    /* --- Film çerçevesi kayarken açılır --- */
    gsap.fromTo(film, { clipPath: 'inset(8% 6% 8% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: film, start: 'top 95%', end: 'center 60%', scrub: 0.8 } });

    /* --- Akış paneli: çizgi çizilir, istek yazılır, adımlar sırayla tamamlanır, tekrar eder --- */
    const panel = $('[data-flow]');
    const askText = $('[data-ask-text]');
    const fullAsk = askText.textContent;
    const flowTl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.5 })
      .add(() => { steps.forEach((s) => s.classList.remove('is-done')); askText.textContent = ''; })
      .fromTo(panel, { '--line-p': 0 }, { '--line-p': 1, duration: 1.2, ease: 'power2.inOut' })
      .to({ n: 0 }, { n: fullAsk.length, duration: 1.6, ease: 'none', onUpdate() { askText.textContent = fullAsk.slice(0, Math.round(this.targets()[0].n)); } }, 0.2)
      .fromTo('.ask__send', { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1 }, 1.9);
    steps.forEach((s, i) => flowTl.add(() => s.classList.add('is-done'), 2.2 + i * 0.45));
    flowTl.fromTo('[data-preview]', { y: 20, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out' }, 2.2 + steps.length * 0.45);
    ScrollTrigger.create({ trigger: panel, start: 'top 75%', end: 'bottom top', onEnter: () => flowTl.play(), onEnterBack: () => flowTl.play(), onLeave: () => flowTl.pause(), onLeaveBack: () => flowTl.pause() });
    gsap.from(panel, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: panel, start: 'top 90%', once: true } });

    /* --- Paketler: satırlar sırayla soldan ve sağdan --- */
    gsap.from('.pack__head p', { x: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.pack__head', start: 'top 82%', once: true } });
    $$('[data-tier]').forEach((t, i) => {
      gsap.from(t.children, { x: i % 2 ? 70 : -70, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: t, start: 'top 90%', once: true } });
    });

    /* --- Örnek çalışmalar: çerçeveler yükselir --- */
    gsap.from('.work__head p', { x: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.work__head', start: 'top 82%', once: true } });
    ScrollTrigger.batch('[data-shot]', { start: 'top 90%', once: true, onEnter: (els) => gsap.from(els, { y: 70, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 }) });

    /* --- Başvuru: iletişim soldan, form sağdan --- */
    gsap.from('.apply__side > p', { x: -60, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.apply__side', start: 'top 75%', once: true } });
    gsap.from('[data-contact]', { x: -60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact', start: 'top 90%', once: true } });
    gsap.from($$('.form__title, [data-field], .form__foot', form), { x: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: form, start: 'top 82%', once: true } });

    /* --- Alt bilgi: logo yazısı soldan açılır --- */
    gsap.fromTo('.foot__word', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });

    /* --- Hizmetler --- */
    gsap.from('.services__head p', { x: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.services__head', start: 'top 82%', once: true } });
    gsap.from('.svc-list li', { x: -60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.svc-list', start: 'top 85%', once: true } });
    gsap.from('.svc-stage', { x: 80, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.svc-stage', start: 'top 85%', once: true } });
    gsap.to('.film-card__fill', { width: '100%', duration: 3.2, ease: 'none', repeat: -1, repeatDelay: 0.4 });

    /* --- Kapanış bandı: fotoğraf yavaşça yaklaşır --- */
    gsap.fromTo('.close__photo', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.close__body > p, .close .hero__actions', { y: 20, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.close__body', start: 'top 80%', once: true } });

    /* --- SSS: sorular sağdan gelir, açılan cevap kayarak belirir --- */
    gsap.from('[data-qa]', { x: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.faq__list', start: 'top 85%', once: true } });
    $$('[data-qa]').forEach((d) => d.addEventListener('toggle', () => {
      if (d.open) gsap.from($('p', d), { y: -8, autoAlpha: 0, duration: 0.5, ease: 'expo.out' });
    }));

    /* --- Tanıtım görseli: parçalar sağdan süzülür --- */
    gsap.from('.intro__art > *', { x: 90, y: 20, rotation: 3, autoAlpha: 0, duration: 1.3, ease: 'expo.out', stagger: 0.14, scrollTrigger: { trigger: '.intro__art', start: 'top 85%', once: true } });

    /* --- Bulutlar: kaydırdıkça farklı hızlarda süzülür, yavaşça yana kayar --- */
    $$('.cloud').forEach((c, i) => {
      gsap.to(c, { yPercent: -120 - (i % 3) * 60, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1 } });
      gsap.to(c, { x: i % 2 ? -80 : 80, duration: 18 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

    return () => reveal();
  });
})();
