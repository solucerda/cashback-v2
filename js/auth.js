// Salva sessão no sessionStorage
function saveSession(user) {
  sessionStorage.setItem('cb_user', JSON.stringify(user));
}

// Lê sessão
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('cb_user'));
  } catch {
    return null;
  }
}

// Limpa sessão
function clearSession() {
  sessionStorage.removeItem('cb_user');
}

// Redireciona para login se não estiver logado
function requireLogin() {
  const user = getSession();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}

// Redireciona para login se não for admin
function requireAdmin() {
  const user = requireLogin();
  if (user && !user.admin) { window.location.href = 'dashboard.html'; return null; }
  return user;
}
