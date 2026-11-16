(function () {

    // MENU PARA CELULAR

    const header = document.getElementById("pc-header");
    const toggle = document.getElementById("pc-menu-toggle");
    const menu = document.getElementById("pc-menu");
    const icon = document.getElementById("pc-menu-icon");

    if (header && toggle && menu && icon) {

        function fecharMenu() {
            menu.classList.remove("pc-open");

            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Abrir menu");

            icon.textContent = "☰";
        }

        toggle.addEventListener("click", function () {
            const aberto = menu.classList.toggle("pc-open");

            toggle.setAttribute("aria-expanded", String(aberto));

            toggle.setAttribute(
                "aria-label",
                aberto ? "Fechar menu" : "Abrir menu"
            );

            icon.textContent = aberto ? "✕" : "☰";
        });

        menu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", fecharMenu);
        });

        function atualizarCabecalho() {
            header.classList.toggle(
                "pc-scrolled",
                window.scrollY > 10
            );
        }

        window.addEventListener("scroll", atualizarCabecalho, {
            passive: true
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 850) {
                fecharMenu();
            }
        });

        atualizarCabecalho();
    }


    // FILTRO DAS CATEGORIAS DO CARDÁPIO

    const categorias = document.querySelectorAll(".categoria");
    const produtos = document.querySelectorAll(".produto");

    categorias.forEach(function (botao) {

        botao.addEventListener("click", function () {

            const categoriaSelecionada = botao.dataset.categoria;

            categorias.forEach(function (item) {
                item.classList.remove("ativa");
            });

            botao.classList.add("ativa");

            produtos.forEach(function (produto) {

                if (produto.dataset.tipo === categoriaSelecionada) {
                    produto.style.display = "block";
                } else {
                    produto.style.display = "none";
                }

            });

        });

    });

})();

/* =====================================================
   PIZZA CLUB — FUNCIONALIDADES ADICIONAIS
   (tema claro/escuro, busca, carrinho, cadastro, login,
    pedidos e perfil). Não altera o script.js/main.js.

   Observação: tudo é salvo no navegador (localStorage),
   pois o site ainda não tem servidor. Em produção, o
   cadastro/login e os pedidos devem ir para um back-end.
   ===================================================== */
(function () {
    'use strict';

    var K = {
        tema: 'pc_tema',
        users: 'pc_usuarios',
        sessao: 'pc_sessao',
        cart: 'pc_carrinho',
        pedidos: 'pc_pedidos'
    };

    var UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
        'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

    var TAXA_ENTREGA = 6;
    var FRETE_GRATIS = 100;
    var MAX_QTD = 20;

    /* ---------------------------------------------------
       Utilitários
    --------------------------------------------------- */
    function lerTexto(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function gravarTexto(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    function remover(k) { try { localStorage.removeItem(k); } catch (e) { } }

    function ler(k, padrao) {
        try {
            var v = localStorage.getItem(k);
            return v ? JSON.parse(v) : padrao;
        } catch (e) { return padrao; }
    }

    function gravar(k, v) { gravarTexto(k, JSON.stringify(v)); }

    function $(s, r) { return (r || document).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

    function digitos(v) { return String(v || '').replace(/\D/g, ''); }

    function brl(n) {
        return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function preco(t) {
        return parseFloat(String(t).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    function norm(t) {
        return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    }

    function slug(t) {
        return norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function pagina() {
        var p = location.pathname.split('/').pop();
        return p || 'index.html';
    }

    function param(nome) {
        try { return new URLSearchParams(location.search).get(nome); } catch (e) { return null; }
    }

    function destinoSeguro(d) { return /^[a-z]+\.html$/.test(d || '') ? d : null; }

    function formatarData(iso) {
        try {
            return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        } catch (e) { return iso; }
    }

    /* Hash simples apenas para não guardar a senha em texto puro
       no navegador. NÃO é seguro como autenticação real. */
    function hashSenha(email, senha) {
        var s = email.toLowerCase() + '|' + senha + '|pizzaclub', h = 5381;
        for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
        return String(h >>> 0);
    }

    /* ---------------------------------------------------
       Tema claro / escuro (aplicado já no carregamento)
    --------------------------------------------------- */
    var tema = lerTexto(K.tema);
    if (tema !== 'claro' && tema !== 'escuro') {
        tema = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'escuro' : 'claro';
    }
    document.documentElement.setAttribute('data-tema', tema);

    /* ---------------------------------------------------
       Aviso rápido
    --------------------------------------------------- */
    function toast(msg) {
        var t = $('#pc-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'pc-toast';
            t.className = 'pc-toast';
            t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('pc-toast-on');
        clearTimeout(toast.t);
        toast.t = setTimeout(function () { t.classList.remove('pc-toast-on'); }, 2800);
    }

    /* ---------------------------------------------------
       Usuários e sessão
    --------------------------------------------------- */
    function usuarios() { return ler(K.users, []); }

    function usuarioAtual() {
        var email = lerTexto(K.sessao);
        if (!email) return null;
        var l = usuarios();
        for (var i = 0; i < l.length; i++) { if (l[i].email === email) return l[i]; }
        return null;
    }

    function salvarUsuario(u) {
        var l = usuarios(), achou = false;
        for (var i = 0; i < l.length; i++) {
            if (l[i].email === u.email) { l[i] = u; achou = true; }
        }
        if (!achou) l.push(u);
        gravar(K.users, l);
    }

    function entrar(email) { gravarTexto(K.sessao, email); }
    function sair() { remover(K.sessao); }

    function exigirLogin() {
        if (!usuarioAtual()) {
            location.replace('login.html?voltar=' + pagina());
            return false;
        }
        return true;
    }

    function enderecoTexto(u) {
        return u.rua + ', ' + u.numero + (u.complemento ? ' - ' + u.complemento : '') +
            ' · ' + u.bairro + ' · ' + u.cidade + '/' + u.uf + ' · CEP ' + u.cep;
    }

    /* ---------------------------------------------------
       Carrinho
    --------------------------------------------------- */
    function carrinho() { return ler(K.cart, []); }

    function qtdTotal() {
        return carrinho().reduce(function (a, i) { return a + i.qtd; }, 0);
    }

    function atualizarBadge(animar) {
        var b = $('#pc-badge');
        if (!b) return;
        var n = qtdTotal();
        b.textContent = n;
        b.setAttribute('data-zero', n === 0 ? 'true' : 'false');
        if (animar) {
            b.classList.remove('pc-pulso');
            void b.offsetWidth;
            b.classList.add('pc-pulso');
        }
    }

    function salvarCarrinho(c, animar) {
        gravar(K.cart, c);
        atualizarBadge(animar);
    }

    function adicionar(item, qtd) {
        var c = carrinho(), achou = false;
        qtd = qtd || 1;
        c.forEach(function (i) {
            if (i.id === item.id) { i.qtd = Math.min(MAX_QTD, i.qtd + qtd); achou = true; }
        });
        if (!achou) {
            item.qtd = Math.min(MAX_QTD, qtd);
            c.push(item);
        }
        salvarCarrinho(c, true);
    }

    /* ---------------------------------------------------
       Máscaras e campos numéricos
    --------------------------------------------------- */
    var MASCARAS = {
        cpf: function (v) {
            var d = digitos(v).slice(0, 11);
            return d.replace(/^(\d{3})(\d)/, '$1.$2')
                .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1-$2');
        },
        telefone: function (v) {
            var d = digitos(v).slice(0, 11);
            if (d.length > 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
            if (d.length > 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
            if (d.length > 2) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
            if (d.length > 0) return '(' + d;
            return '';
        },
        cep: function (v) {
            var d = digitos(v).slice(0, 8);
            return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
        },
        data: function (v) {
            var d = digitos(v).slice(0, 8);
            if (d.length > 4) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
            if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
            return d;
        },
        numero: function (v) { return digitos(v); },
        uf: function (v) { return String(v).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2); },
        nome: function (v) {
            return String(v).replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').replace(/\s{2,}/g, ' ');
        }
    };

    var SOMENTE_NUMEROS = ['cpf', 'telefone', 'cep', 'data', 'numero'];

    function aplicarMascaras(raiz) {
        $$('[data-mascara]', raiz).forEach(function (el) {
            var nome = el.getAttribute('data-mascara');
            var f = MASCARAS[nome];
            if (!f) return;
            var numerico = SOMENTE_NUMEROS.indexOf(nome) > -1;
            if (numerico) el.setAttribute('inputmode', 'numeric');

            el.addEventListener('keypress', function (e) {
                if (numerico && e.key && e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                }
            });

            el.addEventListener('input', function () {
                var novo = f(el.value);
                if (novo !== el.value) el.value = novo;
            });

            if (el.value) el.value = f(el.value);
        });
    }

    /* ---------------------------------------------------
       Validações
    --------------------------------------------------- */
    function cpfValido(c) {
        c = digitos(c);
        if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
        for (var t = 9; t < 11; t++) {
            var s = 0;
            for (var i = 0; i < t; i++) s += parseInt(c[i], 10) * (t + 1 - i);
            var d = ((s * 10) % 11) % 10;
            if (d !== parseInt(c[t], 10)) return false;
        }
        return true;
    }

    function dataValida(s) {
        var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
        if (!m) return false;
        var d = +m[1], mo = +m[2], a = +m[3];
        var dt = new Date(a, mo - 1, d);
        if (dt.getFullYear() !== a || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return false;
        var hoje = new Date();
        if (a < 1900 || dt > hoje) return false;
        var idade = hoje.getFullYear() - a -
            ((hoje.getMonth() < mo - 1 || (hoje.getMonth() === mo - 1 && hoje.getDate() < d)) ? 1 : 0);
        return idade >= 14;
    }

    var REGRAS = {
        nome: function (v) {
            v = v.trim();
            if (v.length < 3) return 'Informe seu nome completo.';
            if (v.indexOf(' ') < 0) return 'Digite nome e sobrenome.';
        },
        email: function (v) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Informe um e-mail válido.';
        },
        cpf: function (v) { if (!cpfValido(v)) return 'CPF inválido.'; },
        telefone: function (v) {
            var d = digitos(v);
            if ((d.length !== 10 && d.length !== 11) || d[0] === '0') return 'Telefone inválido. Use DDD + número.';
        },
        nascimento: function (v) {
            if (!dataValida(v)) return 'Data inválida (é preciso ter 14 anos ou mais).';
        },
        cep: function (v) { if (digitos(v).length !== 8) return 'O CEP deve ter 8 números.'; },
        rua: function (v) { if (v.trim().length < 3) return 'Informe a rua.'; },
        numero: function (v) { if (!v) return 'Informe o número.'; },
        bairro: function (v) { if (v.trim().length < 2) return 'Informe o bairro.'; },
        cidade: function (v) { if (v.trim().length < 2) return 'Informe a cidade.'; },
        uf: function (v) { if (UFS.indexOf(v) < 0) return 'UF inválida.'; },
        senha: function (v) {
            if (v.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
            if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use letras e números na senha.';
        },
        confirmar: function (v, el) {
            if (v !== el.form.elements.senha.value) return 'As senhas não coincidem.';
        }
    };

    function setErro(el, msg) {
        var c = el.closest('.pc-campo');
        var s = c && $('.pc-erro', c);
        if (s) s.textContent = msg || '';
        el.setAttribute('aria-invalid', msg ? 'true' : 'false');
        el.classList.toggle('pc-invalido', !!msg);
        return !msg;
    }

    function validarCampo(el) {
        var v = el.value;
        var msg;
        if (el.required && !String(v).trim()) {
            msg = 'Campo obrigatório.';
        } else if (String(v).trim() && REGRAS[el.name]) {
            msg = REGRAS[el.name](v, el);
        }
        return setErro(el, msg);
    }

    function controles(form) {
        return $$('input, select, textarea', form).filter(function (el) {
            return el.name && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'hidden';
        });
    }

    function validarForm(form) {
        var primeiro = null;
        controles(form).forEach(function (el) {
            if (!validarCampo(el) && !primeiro) primeiro = el;
        });
        if (primeiro) primeiro.focus();
        return !primeiro;
    }

    function ligarValidacao(form) {
        controles(form).forEach(function (el) {
            el.addEventListener('blur', function () { if (el.value || el.required) validarCampo(el); });
            el.addEventListener('input', function () {
                if (el.getAttribute('aria-invalid') === 'true') validarCampo(el);
            });
        });
    }

    /* ---------------------------------------------------
       Campos reutilizáveis (cadastro e perfil)
    --------------------------------------------------- */
    function campo(o) {
        return '<div class="pc-campo' + (o.cls ? ' ' + o.cls : '') + '">' +
            '<label for="f-' + o.name + '">' + o.label + '</label>' +
            '<input id="f-' + o.name + '" name="' + o.name + '" type="' + (o.type || 'text') + '"' +
            (o.mascara ? ' data-mascara="' + o.mascara + '"' : '') +
            (o.max ? ' maxlength="' + o.max + '"' : '') +
            (o.ph ? ' placeholder="' + o.ph + '"' : '') +
            (o.auto ? ' autocomplete="' + o.auto + '"' : ' autocomplete="off"') +
            (o.req === false ? '' : ' required') + '>' +
            '<span class="pc-erro" role="alert"></span></div>';
    }

    function campoSenha(name, label, auto) {
        return '<div class="pc-campo"><label for="f-' + name + '">' + label + '</label>' +
            '<div class="pc-senha"><input id="f-' + name + '" name="' + name + '" type="password" ' +
            'maxlength="20" autocomplete="' + auto + '" required>' +
            '<button type="button" class="pc-olho" aria-label="Mostrar senha">👁</button></div>' +
            '<span class="pc-erro" role="alert"></span></div>';
    }

    function camposPessoais() {
        return '<div class="pc-grid-2">' +
            campo({ label: 'Nome completo', name: 'nome', mascara: 'nome', max: 60, ph: 'Nome e sobrenome', auto: 'name', cls: 'pc-full' }) +
            campo({ label: 'E-mail', name: 'email', type: 'email', max: 80, ph: 'voce@email.com', auto: 'email' }) +
            campo({ label: 'CPF', name: 'cpf', mascara: 'cpf', max: 14, ph: '000.000.000-00' }) +
            campo({ label: 'Telefone / WhatsApp', name: 'telefone', mascara: 'telefone', max: 15, ph: '(00) 00000-0000', auto: 'tel' }) +
            campo({ label: 'Data de nascimento', name: 'nascimento', mascara: 'data', max: 10, ph: 'dd/mm/aaaa' }) +
            '</div>' +
            '<h3 class="pc-sub">Endereço de entrega</h3>' +
            '<div class="pc-grid-2">' +
            campo({ label: 'CEP', name: 'cep', mascara: 'cep', max: 9, ph: '00000-000', auto: 'postal-code' }) +
            campo({ label: 'Rua', name: 'rua', max: 80, ph: 'Nome da rua', auto: 'address-line1' }) +
            campo({ label: 'Número', name: 'numero', mascara: 'numero', max: 6, ph: '123' }) +
            campo({ label: 'Complemento (opcional)', name: 'complemento', max: 30, ph: 'Apto, bloco...', req: false }) +
            campo({ label: 'Bairro', name: 'bairro', max: 40, ph: 'Bairro' }) +
            campo({ label: 'Cidade', name: 'cidade', max: 40, ph: 'Cidade', auto: 'address-level2' }) +
            campo({ label: 'UF', name: 'uf', mascara: 'uf', max: 2, ph: 'MG' }) +
            '</div>';
    }

    function ligarOlhos(raiz) {
        $$('.pc-senha', raiz).forEach(function (w) {
            var inp = $('input', w), b = $('.pc-olho', w);
            b.addEventListener('click', function () {
                var oculto = inp.type === 'password';
                inp.type = oculto ? 'text' : 'password';
                b.textContent = oculto ? '🙈' : '👁';
                b.setAttribute('aria-label', oculto ? 'Ocultar senha' : 'Mostrar senha');
            });
        });
    }

    /* preenche rua/bairro/cidade/UF pelo CEP (ViaCEP), se houver internet */
    function ligarCep(form) {
        var cep = form.elements.cep;
        if (!cep) return;
        cep.addEventListener('blur', function () {
            var d = digitos(cep.value);
            if (d.length !== 8 || !window.fetch) return;
            fetch('https://viacep.com.br/ws/' + d + '/json/')
                .then(function (r) { return r.json(); })
                .then(function (j) {
                    if (!j || j.erro) return;
                    var map = { rua: j.logradouro, bairro: j.bairro, cidade: j.localidade, uf: j.uf };
                    Object.keys(map).forEach(function (k) {
                        var el = form.elements[k];
                        if (el && !el.value && map[k]) {
                            el.value = MASCARAS[k] ? MASCARAS[k](map[k]) : map[k];
                            setErro(el, '');
                        }
                    });
                })
                .catch(function () { });
        });
    }

    function prepararForm(form) {
        aplicarMascaras(form);
        ligarOlhos(form);
        ligarValidacao(form);
        ligarCep(form);
    }

    function valoresPessoais(form) {
        var f = form.elements;
        return {
            nome: f.nome.value.trim(),
            email: f.email.value.trim().toLowerCase(),
            cpf: digitos(f.cpf.value),
            telefone: f.telefone.value,
            nascimento: f.nascimento.value,
            cep: f.cep.value,
            rua: f.rua.value.trim(),
            numero: f.numero.value,
            complemento: f.complemento.value.trim(),
            bairro: f.bairro.value.trim(),
            cidade: f.cidade.value.trim(),
            uf: f.uf.value
        };
    }

    /* ---------------------------------------------------
       Barra de ferramentas (busca, tema, carrinho, login)
    --------------------------------------------------- */
    function garantirMenuMobile() {
        if ($('#pc-menu-toggle')) return;
        var nav = $('nav.menu');
        var links = nav && $('.links', nav);
        if (!nav || !links) return;

        links.id = 'pc-menu';
        var b = document.createElement('button');
        b.className = 'pc-menu-toggle';
        b.type = 'button';
        b.setAttribute('aria-label', 'Abrir menu');
        b.setAttribute('aria-expanded', 'false');
        b.setAttribute('aria-controls', 'pc-menu');
        b.innerHTML = '<span>☰</span>';
        nav.insertBefore(b, links);

        b.addEventListener('click', function () {
            var aberto = links.classList.toggle('pc-open');
            b.setAttribute('aria-expanded', String(aberto));
            b.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
            b.firstChild.textContent = aberto ? '✕' : '☰';
        });
    }

    function injetarBarra() {
        var nav = $('nav.menu');
        if (!nav) return;
        var u = usuarioAtual();

        var barra = document.createElement('div');
        barra.className = 'pc-barra';
        barra.innerHTML =
            '<form class="pc-busca" id="pc-busca-form" role="search">' +
            '<input type="search" id="pc-busca-input" placeholder="Buscar sabores, massas, bebidas..." ' +
            'maxlength="40" autocomplete="off" aria-label="Buscar no cardápio">' +
            '<button type="submit" aria-label="Buscar">🔍</button></form>' +
            '<div class="pc-grupo" id="pc-grupo"></div>';
        nav.parentNode.insertBefore(barra, nav.nextSibling);

        var html =
            '<button type="button" class="pc-icone" id="pc-tema-btn"></button>' +
            '<a class="pc-icone" href="carrinho.html" aria-label="Carrinho de compras" title="Carrinho">🛒' +
            '<span class="pc-badge" id="pc-badge" data-zero="true">0</span></a>';

        if (u) {
            html += '<a class="pc-btn-sec" href="perfil.html" title="Meu perfil">👤 <span id="pc-nome"></span></a>' +
                '<a class="pc-btn-sec" href="pedidos.html">Meus pedidos</a>' +
                '<button type="button" class="pc-btn-sec" id="pc-sair">Sair</button>';
        } else {
            html += '<a class="pc-btn-sec" href="login.html">Login</a>' +
                '<a class="pc-btn-pri" href="cadastro.html">Cadastro</a>';
        }
        $('#pc-grupo').innerHTML = html;
        if (u) $('#pc-nome').textContent = u.nome.split(' ')[0];

        /* botão de tema */
        var tb = $('#pc-tema-btn');
        function rotular() {
            var escuro = document.documentElement.getAttribute('data-tema') === 'escuro';
            tb.textContent = escuro ? '☀️' : '🌙';
            var txt = escuro ? 'Ativar modo claro' : 'Ativar modo escuro';
            tb.setAttribute('aria-label', txt);
            tb.title = txt;
        }
        tb.addEventListener('click', function () {
            var novo = document.documentElement.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
            document.documentElement.setAttribute('data-tema', novo);
            gravarTexto(K.tema, novo);
            rotular();
        });
        rotular();

        var bs = $('#pc-sair');
        if (bs) bs.addEventListener('click', function () {
            sair();
            location.href = 'index.html';
        });

        /* busca: no cardápio filtra na hora; nas outras páginas leva ao cardápio */
        $('#pc-busca-form').addEventListener('submit', function (e) {
            e.preventDefault();
            if (pagina() !== 'cardapio.html') {
                var t = $('#pc-busca-input').value.trim();
                location.href = 'cardapio.html' + (t ? '?busca=' + encodeURIComponent(t) : '');
            }
        });

        atualizarBadge(false);
    }

    function ajustarLinks() {
        $$('.links a').forEach(function (a) {
            if (a.getAttribute('href') === pagina()) a.classList.add('pc-ativo');
        });
        /* "Fazer pedido" leva ao cardápio */
        $$('a.pedidos').forEach(function (a) { a.setAttribute('href', 'cardapio.html'); });
    }

    /* ---------------------------------------------------
       Cardápio: produtos extras, busca, ordenação
    --------------------------------------------------- */
    var EXTRAS = [
        { tipo: 'massas', emoji: '🍝', nome: 'Spaghetti à Bolonhesa', desc: 'Massa al dente com molho de carne e parmesão.', preco: 38 },
        { tipo: 'massas', emoji: '🧀', nome: 'Lasanha de Carne', desc: 'Camadas de massa, molho bolonhesa, presunto e mussarela.', preco: 44 },
        { tipo: 'massas', emoji: '🍝', nome: 'Fettuccine Alfredo', desc: 'Fettuccine com molho cremoso de queijos e parmesão.', preco: 42 },
        { tipo: 'massas', emoji: '🥔', nome: 'Nhoque ao Sugo', desc: 'Nhoque de batata artesanal com molho de tomate e manjericão.', preco: 36 },
        { tipo: 'bebidas', emoji: '🥤', nome: 'Refrigerante Lata', desc: 'Lata 350 ml. Consulte os sabores disponíveis.', preco: 6 },
        { tipo: 'bebidas', emoji: '🍾', nome: 'Refrigerante 2L', desc: 'Garrafa de 2 litros, ideal para dividir.', preco: 14 },
        { tipo: 'bebidas', emoji: '🍊', nome: 'Suco Natural', desc: 'Suco de laranja natural, 400 ml.', preco: 10 },
        { tipo: 'bebidas', emoji: '💧', nome: 'Água Mineral', desc: 'Água mineral sem gás, 500 ml.', preco: 4 },
        { tipo: 'combos', emoji: '💑', nome: 'Combo Casal', desc: '1 pizza grande à escolha + refrigerante 2L.', preco: 69.9 },
        { tipo: 'combos', emoji: '👨‍👩‍👧‍👦', nome: 'Combo Família', desc: '2 pizzas grandes + refrigerante 2L + 1 sobremesa.', preco: 119.9 },
        { tipo: 'combos', emoji: '🎉', nome: 'Combo Amigos', desc: '1 pizza grande + 1 massa + 2 refrigerantes lata.', preco: 89.9 }
    ];

    function initCardapio() {
        var grade = $('.grade-produtos');
        var secao = $('.produtos');
        if (!grade || !secao) return;

        EXTRAS.forEach(function (p) {
            var a = document.createElement('article');
            a.className = 'produto';
            a.setAttribute('data-tipo', p.tipo);
            a.innerHTML = '<div class="produto-emoji" aria-hidden="true">' + p.emoji + '</div>' +
                '<h3>' + esc(p.nome) + '</h3><p>' + esc(p.desc) + '</p>' +
                '<strong>' + brl(p.preco) + '</strong>' +
                '<a href="#" class="adicionar">Adicionar ↗</a>';
            grade.appendChild(a);
        });

        $$('.produto', grade).forEach(function (p, i) { p.setAttribute('data-ordem', i); });

        var barra = document.createElement('div');
        barra.className = 'pc-ferramentas';
        barra.innerHTML = '<span id="pc-contagem" aria-live="polite"></span>' +
            '<label>Ordenar por <select id="pc-ordem">' +
            '<option value="padrao">Padrão</option>' +
            '<option value="menor">Menor preço</option>' +
            '<option value="maior">Maior preço</option>' +
            '<option value="az">Nome (A–Z)</option></select></label>';
        secao.insertBefore(barra, grade);

        var vazio = document.createElement('div');
        vazio.id = 'pc-vazio';
        vazio.className = 'pc-vazio';
        vazio.hidden = true;
        vazio.innerHTML = '<span class="pc-emoji">🔍</span><h2>Nada encontrado</h2>' +
            '<p>Tente outro termo ou escolha uma categoria.</p>';
        secao.appendChild(vazio);

        var input = $('#pc-busca-input');

        function aplicar() {
            var ativa = $$('.categoria').filter(function (c) { return c.classList.contains('ativa'); })[0];
            var cat = ativa ? ativa.getAttribute('data-categoria') : 'pizzas';
            var termo = norm(input ? input.value : '');
            var itens = $$('.produto', grade);
            var visiveis = 0;

            itens.forEach(function (p) {
                var texto = norm($('h3', p).textContent + ' ' + $('p', p).textContent);
                var ok = termo ? texto.indexOf(termo) > -1 : p.getAttribute('data-tipo') === cat;
                p.style.display = ok ? 'flex' : 'none';
                if (ok) visiveis++;
            });

            var ordem = $('#pc-ordem').value;
            itens.sort(function (a, b) {
                if (ordem === 'menor') return preco($('strong', a).textContent) - preco($('strong', b).textContent);
                if (ordem === 'maior') return preco($('strong', b).textContent) - preco($('strong', a).textContent);
                if (ordem === 'az') return $('h3', a).textContent.localeCompare($('h3', b).textContent, 'pt-BR');
                return a.getAttribute('data-ordem') - b.getAttribute('data-ordem');
            }).forEach(function (p) { grade.appendChild(p); });

            vazio.hidden = visiveis > 0;
            $('#pc-contagem').textContent = termo
                ? visiveis + ' resultado(s) para "' + input.value.trim() + '" em todas as categorias'
                : visiveis + ' item(ns) em ' + (ativa ? ativa.textContent.trim() : 'Pizzas');
        }

        if (input) input.addEventListener('input', aplicar);
        $('#pc-ordem').addEventListener('change', aplicar);

        /* o filtro de categorias original continua funcionando; aqui só
           limpamos a busca e reaplicamos a regra com os novos produtos */
        $$('.categoria').forEach(function (c) {
            c.addEventListener('click', function () {
                if (input) input.value = '';
                aplicar();
            });
        });

        var q = param('busca');
        if (q && input) input.value = q.slice(0, 40);
        aplicar();
    }

    /* botão "Adicionar" (cardápio) */
    function ligarAdicionar() {
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('.adicionar');
            if (!a) return;
            e.preventDefault();
            var card = a.closest('.produto');
            if (!card) return;
            var nome = $('h3', card).textContent.trim();
            var img = $('img', card);
            var emoji = $('.produto-emoji', card);
            adicionar({
                id: slug(nome),
                nome: nome,
                preco: preco($('strong', card).textContent),
                img: img ? img.getAttribute('src') : '',
                emoji: emoji ? emoji.textContent : ''
            }, 1);
            toast(nome + ' adicionado ao carrinho 🛒');
        });
    }

    /* ---------------------------------------------------
       Cadastro
    --------------------------------------------------- */
    function initCadastro() {
        var form = $('#form-cadastro');
        if (!form) return;
        if (usuarioAtual()) { location.replace('perfil.html'); return; }

        $('#campos-pessoais').innerHTML = camposPessoais();
        $('#campos-senha').innerHTML = '<div class="pc-grid-2">' +
            campoSenha('senha', 'Senha (8 a 20 caracteres, com letras e números)', 'new-password') +
            campoSenha('confirmar', 'Confirmar senha', 'new-password') + '</div>';
        prepararForm(form);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = $('#cadastro-msg');
            msg.hidden = true;
            if (!validarForm(form)) return;

            var termos = form.elements.termos;
            var erroTermos = $('#erro-termos');
            erroTermos.textContent = termos.checked ? '' : 'Aceite os termos para continuar.';
            if (!termos.checked) { termos.focus(); return; }

            var u = valoresPessoais(form);
            var lista = usuarios();
            for (var i = 0; i < lista.length; i++) {
                if (lista[i].email === u.email) {
                    setErro(form.elements.email, 'Este e-mail já está cadastrado.');
                    form.elements.email.focus();
                    return;
                }
                if (lista[i].cpf === u.cpf) {
                    setErro(form.elements.cpf, 'Este CPF já está cadastrado.');
                    form.elements.cpf.focus();
                    return;
                }
            }

            u.senha = hashSenha(u.email, form.elements.senha.value);
            u.criadoEm = new Date().toISOString();
            salvarUsuario(u);
            entrar(u.email);
            toast('Conta criada com sucesso! Bem-vindo(a) ao clube 🍕');
            setTimeout(function () {
                location.href = destinoSeguro(param('voltar')) || 'cardapio.html';
            }, 1200);
        });
    }

    /* ---------------------------------------------------
       Login (usa a tela login.html já existente)
    --------------------------------------------------- */
    function initLogin() {
        var form = $('#form-login');
        if (!form) return;
        if (usuarioAtual()) { location.replace('perfil.html'); return; }

        var email = $('#email'), senha = $('#senha');
        email.setAttribute('maxlength', '80');
        email.setAttribute('autocomplete', 'email');
        senha.setAttribute('maxlength', '20');
        senha.setAttribute('autocomplete', 'current-password');

        var esqueci = $('.esqueci-senha');
        if (esqueci) esqueci.addEventListener('click', function (e) {
            e.preventDefault();
            toast('Recuperação de senha por e-mail em breve.');
        });
    }

    /* Captura o envio ANTES do alerta provisório da página */
    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || form.id !== 'form-login') return;
        e.preventDefault();
        e.stopPropagation();

        var email = $('#email').value.trim().toLowerCase();
        var senha = $('#senha').value;
        var msg = $('#pc-login-msg');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'pc-login-msg';
            msg.className = 'pc-alerta';
            msg.setAttribute('role', 'alert');
            form.insertBefore(msg, $('.btn-login', form));
        }

        if (REGRAS.email(email)) {
            msg.textContent = 'Informe um e-mail válido.';
            msg.hidden = false;
            return;
        }

        var achado = null;
        usuarios().forEach(function (u) { if (u.email === email) achado = u; });

        if (!achado || achado.senha !== hashSenha(email, senha)) {
            msg.textContent = 'E-mail ou senha incorretos.';
            msg.hidden = false;
            return;
        }

        entrar(email);
        location.href = destinoSeguro(param('voltar')) || 'index.html';
    }, true);

    /* ---------------------------------------------------
       Carrinho (página carrinho.html)
    --------------------------------------------------- */
    function initCarrinho() {
        var lista = $('#lista-carrinho');
        if (!lista) return;

        var obs = $('#obs'), contador = $('#obs-contador');
        var pagamento = $('#pagamento'), troco = $('#troco');

        function totais() {
            var sub = carrinho().reduce(function (a, i) { return a + i.preco * i.qtd; }, 0);
            var tipo = $('input[name="tipo"]:checked').value;
            var taxa = (tipo === 'entrega' && sub > 0 && sub < FRETE_GRATIS) ? TAXA_ENTREGA : 0;
            return { sub: sub, taxa: taxa, total: sub + taxa, tipo: tipo };
        }

        function resumo() {
            var t = totais();
            $('#r-sub').textContent = brl(t.sub);
            $('#r-taxa').textContent = t.tipo === 'retirada' ? 'Grátis (retirada)' : (t.taxa ? brl(t.taxa) : 'Grátis');
            $('#r-total').textContent = brl(t.total);
            var falta = FRETE_GRATIS - t.sub;
            $('#r-dica').textContent = (t.tipo === 'entrega' && falta > 0)
                ? 'Faltam ' + brl(falta) + ' para entrega grátis!'
                : '';
        }

        function render() {
            var c = carrinho();
            $('#carrinho-vazio').hidden = c.length > 0;
            $('#carrinho-conteudo').hidden = c.length === 0;
            if (!c.length) return;

            lista.innerHTML = c.map(function (i) {
                var thumb = i.img
                    ? '<img src="' + esc(i.img) + '" alt="">'
                    : '<span class="pc-thumb-emoji" aria-hidden="true">' + esc(i.emoji || '🍕') + '</span>';
                return '<li class="pc-item" data-id="' + esc(i.id) + '">' + thumb +
                    '<div class="pc-item-info"><strong>' + esc(i.nome) + '</strong><span>' + brl(i.preco) + ' cada</span></div>' +
                    '<div class="pc-qtd"><button type="button" data-acao="menos" aria-label="Diminuir quantidade">−</button>' +
                    '<output>' + i.qtd + '</output>' +
                    '<button type="button" data-acao="mais" aria-label="Aumentar quantidade">+</button></div>' +
                    '<strong class="pc-item-total">' + brl(i.preco * i.qtd) + '</strong>' +
                    '<button type="button" class="pc-remover" data-acao="remover" aria-label="Remover ' + esc(i.nome) + '">🗑</button></li>';
            }).join('');
            resumo();
        }

        lista.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-acao]');
            if (!b) return;
            var id = b.closest('.pc-item').getAttribute('data-id');
            var acao = b.getAttribute('data-acao');
            var c = carrinho().filter(function (i) {
                if (i.id !== id) return true;
                if (acao === 'mais') i.qtd = Math.min(MAX_QTD, i.qtd + 1);
                if (acao === 'menos') i.qtd = i.qtd - 1;
                if (acao === 'remover') return false;
                return i.qtd > 0;
            });
            salvarCarrinho(c);
            render();
        });

        $$('input[name="tipo"]').forEach(function (r) { r.addEventListener('change', resumo); });

        $('#btn-limpar').addEventListener('click', function () {
            if (confirm('Deseja esvaziar o carrinho?')) { salvarCarrinho([]); render(); }
        });

        obs.addEventListener('input', function () { contador.textContent = obs.value.length + '/120'; });

        pagamento.addEventListener('change', function () {
            $('#campo-troco').hidden = pagamento.value !== 'dinheiro';
        });

        troco.addEventListener('input', function () { troco.value = digitos(troco.value); });

        $('#btn-finalizar').addEventListener('click', function () {
            var aviso = $('#carrinho-msg');
            aviso.hidden = true;

            var u = usuarioAtual();
            if (!u) {
                toast('Faça login para finalizar o pedido.');
                setTimeout(function () { location.href = 'login.html?voltar=carrinho.html'; }, 1000);
                return;
            }

            var t = totais();
            if (!carrinho().length) return;

            var endereco = '';
            if (t.tipo === 'entrega') {
                if (!u.rua || !u.numero || !u.cep) {
                    aviso.innerHTML = 'Complete seu endereço no <a href="perfil.html">perfil</a> para receber o pedido.';
                    aviso.hidden = false;
                    return;
                }
                endereco = enderecoTexto(u);
            }

            var valorTroco = 0;
            if (pagamento.value === 'dinheiro' && troco.value) {
                valorTroco = parseInt(troco.value, 10);
                if (valorTroco < t.total) {
                    aviso.textContent = 'O valor do troco deve ser maior ou igual ao total do pedido (' + brl(t.total) + ').';
                    aviso.hidden = false;
                    troco.focus();
                    return;
                }
            }

            var pedido = {
                id: 'PC' + String(Date.now()).slice(-6),
                email: u.email,
                data: new Date().toISOString(),
                itens: carrinho(),
                subtotal: t.sub,
                taxa: t.taxa,
                total: t.total,
                tipo: t.tipo,
                pagamento: pagamento.value,
                troco: valorTroco,
                obs: obs.value.trim().slice(0, 120),
                endereco: endereco
            };

            var todos = ler(K.pedidos, []);
            todos.push(pedido);
            gravar(K.pedidos, todos);
            salvarCarrinho([]);
            location.href = 'pedidos.html?novo=' + pedido.id;
        });

        render();
    }

    /* ---------------------------------------------------
       Pedidos (página pedidos.html)
    --------------------------------------------------- */
    var ETAPAS = ['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue'];
    var PAGAMENTOS = { pix: 'Pix', cartao: 'Cartão na entrega/retirada', dinheiro: 'Dinheiro' };

    /* Demonstração: o status avança com o tempo (1, 3 e 5 minutos). */
    function statusDe(p) {
        var min = (Date.now() - new Date(p.data).getTime()) / 60000;
        var i = min < 1 ? 0 : min < 3 ? 1 : min < 5 ? 2 : 3;
        var nomes = ETAPAS.slice();
        if (p.tipo === 'retirada') nomes[2] = 'Pronto para retirada';
        return { i: i, nome: nomes[i] };
    }

    function initPedidos() {
        var box = $('#lista-pedidos');
        if (!box) return;
        if (!exigirLogin()) return;

        var u = usuarioAtual();
        var novo = param('novo');
        if (novo) {
            var ok = $('#pedido-ok');
            ok.textContent = 'Pedido ' + novo.replace(/[^A-Za-z0-9]/g, '') + ' realizado com sucesso! Acompanhe o andamento abaixo.';
            ok.hidden = false;
        }

        var filtro = $('#filtro-pedidos'), filtroStatus = $('#filtro-status');

        function render() {
            var termo = norm(filtro.value);
            var st = filtroStatus.value;
            var meus = ler(K.pedidos, []).filter(function (p) { return p.email === u.email; })
                .sort(function (a, b) { return new Date(b.data) - new Date(a.data); });

            $('#pedidos-vazio').hidden = meus.length > 0;
            $('#pedidos-filtros').hidden = meus.length === 0;

            var vis = meus.filter(function (p) {
                var s = statusDe(p);
                if (st !== 'todos' && String(s.i) !== st) return false;
                if (!termo) return true;
                var txt = norm(p.id + ' ' + p.itens.map(function (i) { return i.nome; }).join(' '));
                return txt.indexOf(termo) > -1;
            });

            $('#pedidos-nenhum').hidden = !(meus.length && !vis.length);

            box.innerHTML = vis.map(function (p) {
                var s = statusDe(p);
                var barras = [0, 1, 2, 3].map(function (n) { return '<i class="' + (n <= s.i ? 'on' : '') + '"></i>'; }).join('');
                var itens = p.itens.map(function (i) {
                    return '<li><span>' + i.qtd + '× ' + esc(i.nome) + '</span><span>' + brl(i.preco * i.qtd) + '</span></li>';
                }).join('');
                var local = p.tipo === 'retirada' ? 'Retirada no balcão' : 'Entrega: ' + esc(p.endereco);
                return '<article class="pc-card" data-id="' + esc(p.id) + '">' +
                    '<div class="pc-pedido-topo"><div><h2>Pedido ' + esc(p.id) + '</h2><small>' + formatarData(p.data) + '</small></div>' +
                    '<span class="pc-status' + (s.i === 3 ? ' pc-final' : '') + '">' + esc(s.nome) + '</span></div>' +
                    '<div class="pc-progresso" aria-hidden="true">' + barras + '</div>' +
                    '<ul class="pc-lista-itens">' + itens + '</ul>' +
                    '<div class="pc-meta">' + local + '<br>Pagamento: ' + esc(PAGAMENTOS[p.pagamento] || p.pagamento) +
                    (p.taxa ? ' · Taxa de entrega: ' + brl(p.taxa) : '') +
                    (p.obs ? '<br>Observações: ' + esc(p.obs) : '') + '</div>' +
                    '<div class="pc-pedido-rodape"><strong>Total: ' + brl(p.total) + '</strong>' +
                    '<button type="button" class="pc-botao pc-botao-sec" data-repetir="' + esc(p.id) + '">Pedir novamente</button></div></article>';
            }).join('');
        }

        box.addEventListener('click', function (e) {
            var b = e.target.closest('[data-repetir]');
            if (!b) return;
            var id = b.getAttribute('data-repetir');
            ler(K.pedidos, []).forEach(function (p) {
                if (p.id === id) {
                    p.itens.forEach(function (i) {
                        adicionar({ id: i.id, nome: i.nome, preco: i.preco, img: i.img, emoji: i.emoji }, i.qtd);
                    });
                }
            });
            toast('Itens adicionados ao carrinho!');
            setTimeout(function () { location.href = 'carrinho.html'; }, 700);
        });

        filtro.addEventListener('input', render);
        filtroStatus.addEventListener('change', render);
        setInterval(render, 20000);
        render();
    }

    /* ---------------------------------------------------
       Perfil (página perfil.html)
    --------------------------------------------------- */
    function initPerfil() {
        var form = $('#form-perfil');
        if (!form) return;
        if (!exigirLogin()) return;

        var u = usuarioAtual();
        $('#campos-pessoais').innerHTML = camposPessoais();

        Object.keys(u).forEach(function (k) {
            var el = form.elements[k];
            if (el && k !== 'senha') el.value = u[k];
        });

        /* e-mail e CPF identificam a conta e não podem ser alterados */
        form.elements.email.readOnly = true;
        form.elements.cpf.readOnly = true;
        prepararForm(form);

        function lateral() {
            $('#perfil-nome').textContent = u.nome;
            $('#perfil-email').textContent = u.email;
            $('#perfil-avatar').textContent = u.nome.trim().charAt(0).toUpperCase();
            $('#perfil-desde').textContent = u.criadoEm ? 'Membro desde ' + new Date(u.criadoEm).toLocaleDateString('pt-BR') : '';
            var meus = ler(K.pedidos, []).filter(function (p) { return p.email === u.email; });
            $('#perfil-qtd').textContent = meus.length;
            $('#perfil-gasto').textContent = brl(meus.reduce(function (a, p) { return a + p.total; }, 0));
        }
        lateral();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!validarForm(form)) return;
            var v = valoresPessoais(form);
            Object.keys(v).forEach(function (k) { u[k] = v[k]; });
            u.email = usuarioAtual().email;
            u.cpf = usuarioAtual().cpf;
            salvarUsuario(u);
            lateral();
            var ok = $('#perfil-msg');
            ok.textContent = 'Dados atualizados com sucesso!';
            ok.hidden = false;
            toast('Perfil salvo ✔');
        });

        /* troca de senha */
        var fs = $('#form-senha');
        $('#campos-trocar-senha').innerHTML = '<div class="pc-grid-2">' +
            campoSenha('atual', 'Senha atual', 'current-password') +
            '<div></div>' +
            campoSenha('senha', 'Nova senha', 'new-password') +
            campoSenha('confirmar', 'Confirmar nova senha', 'new-password') + '</div>';
        prepararForm(fs);

        fs.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = $('#senha-msg');
            msg.hidden = true;
            if (!validarForm(fs)) return;
            if (hashSenha(u.email, fs.elements.atual.value) !== u.senha) {
                setErro(fs.elements.atual, 'Senha atual incorreta.');
                fs.elements.atual.focus();
                return;
            }
            u.senha = hashSenha(u.email, fs.elements.senha.value);
            salvarUsuario(u);
            fs.reset();
            msg.textContent = 'Senha alterada com sucesso!';
            msg.hidden = false;
        });

        $('#btn-sair').addEventListener('click', function () {
            sair();
            location.href = 'index.html';
        });

        $('#btn-excluir').addEventListener('click', function () {
            if (!confirm('Tem certeza? Sua conta e seu histórico de pedidos serão apagados e isso não pode ser desfeito.')) return;
            salvarTodos(usuarios().filter(function (x) { return x.email !== u.email; }), ler(K.pedidos, []).filter(function (p) { return p.email !== u.email; }));
            sair();
            location.href = 'index.html';
        });

        function salvarTodos(us, ps) { gravar(K.users, us); gravar(K.pedidos, ps); }
    }

    /* ---------------------------------------------------
       Contato (formulário já existente): limites e confirmação
    --------------------------------------------------- */
    function initContato() {
        var form = $('.formulario');
        if (!form) return;
        var campos = $$('input, textarea', form);
        if (campos[0]) campos[0].setAttribute('maxlength', '60');
        if (campos[1]) campos[1].setAttribute('maxlength', '80');
        if (campos[2]) campos[2].setAttribute('maxlength', '500');

        if (campos[0]) campos[0].addEventListener('input', function () {
            campos[0].value = MASCARAS.nome(campos[0].value);
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            form.reset();
            toast('Mensagem enviada! Responderemos em até 24h.');
        });
    }

    /* ---------------------------------------------------
       Início
    --------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        garantirMenuMobile();
        injetarBarra();
        ajustarLinks();
        ligarAdicionar();
        initCardapio();
        initLogin();
        initCadastro();
        initCarrinho();
        initPedidos();
        initPerfil();
        initContato();
    });

    window.addEventListener('storage', function () { atualizarBadge(false); });
})();
