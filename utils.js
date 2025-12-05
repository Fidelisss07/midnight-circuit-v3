// ⚠️ Se estiveres no Railway, deixa vazio ''. Se for no PC, usa 'http://localhost:3000'
const URL_SERVIDOR = 'https://midnight-circuit-v3-production.up.railway.app';

// 1. Sistema de Notificações (Toasts)
function showToast(msg, tipo = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
    }
    const t = document.createElement('div');
    const cl = tipo === 'success' ? 'text-green-500' : 'text-red-500';
    const ic = tipo === 'success' ? 'check_circle' : 'error';
    
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `<span class="material-symbols-outlined ${cl}">${ic}</span><span class="text-sm font-bold">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// 2. Segurança e Login
function verificarLogin() {
    const dados = localStorage.getItem('usuario_logado');
    if (!dados && !window.location.href.includes('login') && !window.location.href.includes('registro')) {
        window.location.href = 'login.html';
    }
    return JSON.parse(dados || '{}');
}

function logout() {
    localStorage.removeItem('usuario_logado');
    window.location.href = 'login.html';
}

// 3. NAVEGAÇÃO DE PERFIL (ESTA É A FUNÇÃO QUE TE FALTA!)
function verPerfil(emailAlvo) {
    if (!emailAlvo) return; // Proteção contra cliques vazios
    
    const usuarioLogado = verificarLogin();
    
    // Se clicar no próprio nome, vai para o perfil pessoal
    if (emailAlvo === usuarioLogado.email) {
        window.location.href = 'perfil.html';
    } else {
        // Se for outra pessoa, vai para o perfil de visitante
        window.location.href = `perfil-visitante.html?email=${emailAlvo}`;
    }
}

// 4. Temas e Loading
function setBtnLoading(id, load) {
    const btn = document.getElementById(id);
    if (btn) {
        if (load) btn.classList.add('btn-loading');
        else btn.classList.remove('btn-loading');
    }
}

(function aplicarTema() {
    const tema = localStorage.getItem('midnight_tema') || 'theme-red';
    if(document.body) document.body.classList.add(tema);
    else window.addEventListener('DOMContentLoaded', () => document.body.classList.add(tema));
})();
