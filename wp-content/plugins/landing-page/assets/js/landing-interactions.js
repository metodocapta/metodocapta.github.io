(function () {
    'use strict';

    // Interações não-críticas (reveals, observadores, tilt, parallax).
    // Carregado com defer, separado do core para não competir com a 1ª pintura.
    const root = document.querySelector('[data-fm-site]');
    if (!root) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const reveals = root.querySelectorAll('.fm-reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
        reveals.forEach(function (item) { item.classList.add('is-visible'); });
    } else {
        const revealObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.11, rootMargin: '0px 0px -5% 0px' });
        reveals.forEach(function (item) { revealObserver.observe(item); });
    }

    const navLinks = Array.from(root.querySelectorAll('.fm-nav a[href^="#"]')).filter(function (link) {
        const hash = link.getAttribute('href');
        return hash && hash.length > 1; // descarta href="#"
    });
    const navTargets = navLinks.map(function (link) {
        try { return root.querySelector(link.getAttribute('href')); } catch (error) { return null; }
    }).filter(Boolean);
    if ('IntersectionObserver' in window && navTargets.length) {
        const sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                navLinks.forEach(function (link) {
                    link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-32% 0px -58% 0px', threshold: 0 });
        navTargets.forEach(function (section) { sectionObserver.observe(section); });
    }

    const journeySteps = Array.from(root.querySelectorAll('.fm-journey-step'));
    if ('IntersectionObserver' in window && journeySteps.length) {
        const journeyObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                journeySteps.forEach(function (step) { step.classList.remove('is-active'); });
                entry.target.classList.add('is-active');
            });
        }, { rootMargin: '-38% 0px -44% 0px', threshold: 0.15 });
        journeySteps.forEach(function (step) { journeyObserver.observe(step); });
    }

    if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
        root.querySelectorAll('[data-fm-tilt]').forEach(function (box) {
            const target = box.querySelector('.fm-stage-media') || box.querySelector('img');
            if (!target) return;
            const base = target.classList.contains('fm-stage-media') ? 'rotateY(-5deg) rotateX(2deg)' : '';
            box.addEventListener('pointermove', function (event) {
                const rect = box.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                target.style.transition = 'transform 80ms linear';
                if (target.classList.contains('fm-stage-media')) {
                    target.style.transform = 'rotateY(' + (-5 + x * 4) + 'deg) rotateX(' + (2 - y * 4) + 'deg) translate3d(' + (x * 4) + 'px,' + (y * 4) + 'px,0)';
                } else {
                    target.style.transform = 'translate3d(' + (x * 7) + 'px,' + (y * 7) + 'px,0) scale(1.008)';
                }
            });
            box.addEventListener('pointerleave', function () {
                target.style.transition = 'transform 420ms cubic-bezier(.2,.75,.25,1)';
                target.style.transform = base;
            });
        });
    }

    if (!reduceMotion) {
        const parallaxItems = Array.from(root.querySelectorAll('[data-fm-parallax]'));
        let ticking = false;
        function renderParallax() {
            const vh = window.innerHeight || 800;
            parallaxItems.forEach(function (item) {
                const img = item.querySelector('img');
                if (!img) return;
                const rect = item.getBoundingClientRect();
                if (rect.bottom < 0 || rect.top > vh) return;
                const strength = parseFloat(item.getAttribute('data-fm-parallax')) || 0.04;
                const progress = ((rect.top + rect.height / 2) - vh / 2) / vh;
                img.style.transform = 'scale(1.055) translate3d(0,' + (-progress * vh * strength) + 'px,0)';
            });
            ticking = false;
        }
        function requestParallax() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(renderParallax);
        }
        renderParallax();
        window.addEventListener('scroll', requestParallax, { passive: true });
        window.addEventListener('resize', requestParallax, { passive: true });
    }
})();
