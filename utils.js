// utils.js
// Deixe vazio! Assim ele usa o endereço automático do Railway.
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
    
    // Ícones e Cores baseados no tipo
    const ic = tipo === 'success' ? 'check_circle' : 'error';
    const cl = tipo === 'success' ? 'text-green-500' : 'text-red-500';
    const borda = tipo === 'success' ? 'border-green-500' : 'border-red-500';
    
    t.className = `toast`; 
    t.style.borderLeft = `4px solid ${tipo === 'success' ? '#22c55e' : '#ef4444'}`;
    
    t.innerHTML = `
        <span class="material-symbols-outlined ${cl}">${ic}</span>
        <span class="text-sm font-bold text-white">${msg}</span>
    `;
    
    c.appendChild(t);
    
    // Remove após 3 segundos
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 3000);
}

// 2. Feedback de Carregamento nos Botões
function setBtnLoading(id, load) {
    const btn = document.getElementById(id);
    if (btn) {
        if (load) btn.classList.add('btn-loading');
        else btn.classList.remove('btn-loading');
    }
}

// 3. Segurança de Login Global
function verificarLogin() {
    const dados = localStorage.getItem('usuario_logado');
    // Se não houver dados e não estivermos na pag de login ou registo, chuta para fora
    if (!dados && !window.location.href.includes('login') && !window.location.href.includes('registro')) {
        window.location.href = 'login.html';
    }
    // Retorna os dados do utilizador ou um objeto vazio para não dar erro
    return JSON.parse(dados || '{}');
}

// 4. Logout Global
function logout() {
    localStorage.removeItem('usuario_logado');
    window.location.href = 'login.html';
}

// 5. Aplicar Tema Automaticamente
(function aplicarTema() {
    const tema = localStorage.getItem('midnight_tema') || 'theme-red';
    if (document.body) {
        document.body.classList.add(tema);
    } else {
        window.addEventListener('DOMContentLoaded', () => document.body.classList.add(tema));
    }

    // --- NAVEGAÇÃO PARA PERFIS ---
function verPerfil(emailAlvo) {
    const usuarioLogado = verificarLogin();
    
    // Se cliquei no meu próprio nome, vai para o meu perfil editável
    if (emailAlvo === usuarioLogado.email) {
        window.location.href = 'perfil.html';
    } else {
        // Se for outra pessoa, vai para o perfil de visitante
        window.location.href = `perfil-visitante.html?email=${emailAlvo}`;
    }
}

})();

