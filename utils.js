// --- CONFIGURAÇÃO GLOBAL ---
// Conecta ao teu servidor no Railway
const URL_SERVIDOR = "https://corsa.up.railway.app";

// --- FUNÇÕES DE SEGURANÇA E UTILIDADE ---

// Verifica se o usuário está logado
function verificarLogin() {
    const userJson = localStorage.getItem('usuario_logado');
    if (!userJson) {
        // Se não estiver logado, manda para o login (exceto se já estiver lá)
        if (!window.location.href.includes('index.html') && !window.location.href.includes('cadastro.html')) {
            window.location.href = 'index.html';
        }
        return { email: null };
    }
    return JSON.parse(userJson);
}

// Função para Sair
function logout() {
    localStorage.removeItem('usuario_logado');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Função visual para botões de carregamento
function setBtnLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = "...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    } else {
        btn.innerText = btn.dataset.originalText || "OK";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// Pequenos alertas (Toast)
function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-6 py-3 rounded shadow-xl text-white font-bold z-[100] animate-bounce ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
