(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    ready(function () {
        var portal = document.querySelector('[data-fmc-portal]');
        if (!portal) return;

        var tabs = portal.querySelectorAll('[data-fmc-tab]');
        var panels = portal.querySelectorAll('[data-fmc-panel]');
        tabs.forEach(function (button) {
            button.addEventListener('click', function () {
                var target = button.getAttribute('data-fmc-tab');
                tabs.forEach(function (item) { item.classList.toggle('is-active', item === button); });
                panels.forEach(function (panel) { panel.classList.toggle('is-active', panel.getAttribute('data-fmc-panel') === target); });
                try {
                    var url = new URL(window.location.href);
                    url.searchParams.set('fmc_tab', target);
                    url.searchParams.delete('fmc_notice');
                    url.searchParams.delete('fmc_type');
                    window.history.replaceState({}, '', url.toString());
                } catch (e) {}
            });
        });

        portal.querySelectorAll('[data-fmc-password-toggle]').forEach(function (button) {
            button.addEventListener('click', function () {
                var input = button.parentElement.querySelector('input');
                if (!input) return;
                var showing = input.type === 'text';
                input.type = showing ? 'password' : 'text';
                button.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
            });
        });

        function cnpjIsValid(raw) {
            var cnpj = String(raw || '').replace(/\D/g, '');
            if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
            for (var t = 12; t < 14; t++) {
                var d = 0;
                var p = 2;
                for (var c = t - 1; c >= 0; c--) {
                    d += parseInt(cnpj.charAt(c), 10) * p;
                    p = p === 9 ? 2 : p + 1;
                }
                d = ((10 * d) % 11) % 10;
                if (parseInt(cnpj.charAt(t), 10) !== d) return false;
            }
            return true;
        }

        portal.querySelectorAll('[data-fmc-cnpj]').forEach(function (input) {
            function formatAndValidate(showMessage) {
                var digits = input.value.replace(/\D/g, '').slice(0, 14);
                var value = digits;
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
                input.value = value;

                var complete = digits.length === 14;
                var valid = complete && cnpjIsValid(digits);
                var invalid = (showMessage && digits.length > 0 && !valid) || (complete && !valid);
                input.classList.toggle('is-invalid', invalid);
                input.setCustomValidity(invalid ? 'Informe um CNPJ válido.' : '');
            }
            input.addEventListener('input', function () { formatAndValidate(false); });
            input.addEventListener('blur', function () { formatAndValidate(true); });
        });
    });
})();
