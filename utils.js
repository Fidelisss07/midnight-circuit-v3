// utils.js - Ferramentas Profissionais Midnight Circuit

// ⚠️ No Railway: Deixa vazio ''. No PC: 'http://localhost:3000'
const URL_SERVIDOR = window.location.hostname.includes('localhost') 
    ? 'http://localhost:3000' 
    : ''; 

// 1. Sistema de Notificações (Toasts)
function showToast(msg, tipo = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
    }
    const t = document.createElement('div');
    const ic = tipo === 'success' ? 'check_circle' : 'error';
    const cl = tipo === 'success' ? 'text-green-500' : 'text-red-500';
    
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `<span class="material-symbols-outlined ${cl}">${ic}</span><span class="text-sm font-bold text-white">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

// 2. Feedback Botões
function setBtnLoading(id, load) {
    const btn = document.getElementById(id);
    if (btn) {
        if (load) btn.classList.add('btn-loading');
        else btn.classList.remove('btn-loading');
    }
}

// 3. Segurança Login
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

// 4. Navegação Inteligente
function verPerfil(emailAlvo) {
    if (!emailAlvo) return;
    const usuarioLogado = verificarLogin();
    if (emailAlvo === usuarioLogado.email) {
        window.location.href = 'perfil.html';
    } else {
        window.location.href = `perfil-visitante.html?email=${emailAlvo}`;
    }
}

// 5. NOVO: Formatação de Tempo Profissional (Ex: "Há 2 horas")
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `há ${interval} anos`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `há ${interval} meses`;
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `há ${interval} dias`;
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `há ${interval} horas`;
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `há ${interval} min`;
    
    return "agora mesmo";
}

// 6. Temas
(function aplicarTema() {
    const tema = localStorage.getItem('midnight_tema') || 'theme-red';
    if(document.body) document.body.classList.add(tema);
    else window.addEventListener('DOMContentLoaded', () => document.body.classList.add(tema));
})();
