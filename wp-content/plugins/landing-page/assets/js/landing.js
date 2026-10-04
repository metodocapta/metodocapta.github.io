(function () {
    'use strict';

    // CORE — o essencial da navegação (menu, header, âncoras, form).
    // As interações visuais ficam em landing-interactions.js (defer).
    const root = document.querySelector('[data-fm-site]');
    if (!root) return;

    const header = root.querySelector('[data-fm-header]');
    const nav = root.querySelector('[data-fm-nav]');
    const menuToggle = root.querySelector('[data-fm-menu-toggle]');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function updateHeader() {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 14);
    }
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function () {
            const open = nav.classList.toggle('is-open');
            menuToggle.setAttribute('aria-expanded', String(open));
        });
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('is-open');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
        document.addEventListener('click', function (event) {
            if (!nav.classList.contains('is-open')) return;
            if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
            nav.classList.remove('is-open');
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    }

    root.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            const hash = link.getAttribute('href');
            if (!hash || hash === '#' || hash.length < 2) return; // ignora href="#" sem destino
            let target = null;
            try { target = root.querySelector(hash); } catch (error) { return; }
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        });
    });

    const form = root.querySelector('[data-fm-contact-form]');
    if (!form || typeof MetodoCaptaLanding === 'undefined') return;

    const status = form.querySelector('[data-fm-form-status]');
    const submit = form.querySelector('[data-fm-submit]');
    const originalLabel = MetodoCaptaLanding.submitLabel || 'Enviar mensagem';

    function setStatus(message, isError) {
        if (!status) return;
        status.textContent = message;
        status.classList.add('is-visible');
        status.classList.toggle('is-error', Boolean(isError));
    }

    function setSubmitLabel(label) {
        if (!submit) return;
        const svg = submit.querySelector('svg');
        submit.textContent = label;
        if (svg) submit.appendChild(svg);
    }

    form.addEventListener('submit', async function (event) {
        if (!window.fetch || !window.FormData) return;
        event.preventDefault();

        if (submit) submit.disabled = true;
        setSubmitLabel(MetodoCaptaLanding.sendingLabel || 'Enviando mensagem...');
        if (status) status.classList.remove('is-visible', 'is-error');

        const payload = new FormData(form);
        payload.set('action', MetodoCaptaLanding.ajaxAction || 'metodocapta_contact_ajax_submit');

        try {
            const response = await fetch(MetodoCaptaLanding.ajaxUrl, {
                method: 'POST',
                body: payload,
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            const message = data && data.data && data.data.message
                ? data.data.message
                : 'Não foi possível concluir o envio agora.';

            if (!response.ok || !data.success) {
                throw new Error(message);
            }

            setStatus(message, false);
            form.reset();
        } catch (error) {
            setStatus(error && error.message ? error.message : 'Não foi possível enviar. Tente novamente.', true);
        } finally {
            if (submit) submit.disabled = false;
            setSubmitLabel(originalLabel);
        }
    });
})();
