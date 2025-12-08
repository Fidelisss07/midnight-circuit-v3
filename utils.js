// utils.js - Ferramentas Profissionais

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
    const cl = tipo === 'success' ? 'text-green-500' : 'text-red-500';
    const ic = tipo === 'success' ? 'check_circle' : 'error';
    
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `<span class="material-symbols-outlined ${cl}">${ic}</span><span class="text-sm font-bold text-white">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

// 2. Formatador de Números (Ex: 1200 -> 1.2k)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

// 3. Copiar Link (Share)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Link copiado!", "success");
    }).catch(() => {
        showToast("Erro ao copiar", "error");
    });
}

// 4. Feedback Botões
function setBtnLoading(id, load) {
    const btn = document.getElementById(id);
    if (btn) {
        if (load) {
            btn.dataset.originalText = btn.innerText;
            btn.classList.add('btn-loading');
            btn.innerText = "";
        } else {
            btn.classList.remove('btn-loading');
            btn.innerText = btn.dataset.originalText || "Enviar";
        }
    }
}

// 5. Segurança Login
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

// 6. Navegação Perfil
function verPerfil(emailAlvo) {
    if (!emailAlvo) return;
    const usuarioLogado = verificarLogin();
    if (emailAlvo === usuarioLogado.email) window.location.href = 'perfil.html';
    else window.location.href = `perfil-visitante.html?email=${emailAlvo}`;
}

// 7. Time Ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `há ${interval} anos`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `há ${interval} meses`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `há ${interval} dias`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `há ${interval} h`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `há ${interval} min`;
    return "agora mesmo";
}

// 8. Temas
(function aplicarTema() {
    const tema = localStorage.getItem('midnight_tema') || 'theme-red';
    if(document.body) document.body.classList.add(tema);
    else window.addEventListener('DOMContentLoaded', () => document.body.classList.add(tema));
})();
