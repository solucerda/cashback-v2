const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '0%';
const initials = n => n.trim().split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);

function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div class="error-box">
      <p>Erro ao carregar dados</p>
      <small>${msg}</small>
    </div>`;
}

function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div>Carregando dados...</div>`;
}
