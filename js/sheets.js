// Busca o CSV de uma aba pelo nome
async function fetchCSV(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não foi possível carregar a aba "${sheetName}". Status: ${res.status}`);
  return await res.text();
}

// Parseia CSV em array de arrays
function parseCSV(text) {
  return Papa.parse(text, { header: false, skipEmptyLines: true }).data;
}

// Busca lista de abas de clientes da aba _abas
async function fetchTabNames() {
  const csv = await fetchCSV(CONFIG.ABA_LISTA);
  const rows = parseCSV(csv);

  // Validação: se a primeira linha parece ser o cabeçalho "Itens" de uma aba de cliente,
  // significa que o Google retornou a aba errada (fallback silencioso)
  const firstRowJoined = (rows[0] || []).join('|').toLowerCase();
  if (firstRowJoined.includes('itens') || firstRowJoined.includes('discrimina')) {
    throw new Error(`A aba "${CONFIG.ABA_LISTA}" não foi encontrada — o Google retornou outra aba no lugar. Verifique se o nome da aba na planilha é exatamente "${CONFIG.ABA_LISTA}" (sem espaços extras).`);
  }

  // Pula cabeçalho, retorna primeira coluna de cada linha
  const names = rows.slice(1).map(r => (r[0] || '').trim()).filter(Boolean);
  if (!names.length) {
    throw new Error(`A aba "${CONFIG.ABA_LISTA}" foi encontrada mas está vazia ou sem dados na coluna A.`);
  }
  return names;
}

// Busca e parseia usuários da aba _usuarios
async function fetchUsers() {
  const csv = await fetchCSV(CONFIG.ABA_USUARIOS);
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const clean = s => (s || '').replace(/^\uFEFF/, '').replace(/['"]/g, '').toLowerCase().trim();
  const h = rows[0].map(clean);
  const iU  = h.findIndex(c => c.includes('usuario'));
  const iP  = h.findIndex(c => c.includes('senha'));
  const iA  = h.findIndex(c => c.includes('aba'));
  const iAd = h.findIndex(c => c.includes('admin'));
  if (iU === -1 || iP === -1) throw new Error('Aba _usuarios sem colunas "usuario" e "senha". Cabeçalho encontrado: ' + h.join(', '));
  return rows.slice(1).map(r => ({
    usuario: (r[iU] || '').trim().toLowerCase(),
    senha:   (r[iP] || '').trim(),
    aba:     (r[iA] || '').trim(),
    admin:   (r[iAd] || '').trim().toLowerCase() === 'sim',
  })).filter(u => u.usuario);
}

// Busca e parseia produtos de uma aba de cliente
async function fetchProducts(sheetName) {
  const csv = await fetchCSV(sheetName);
  const rows = parseCSV(csv);

  // Encontra linha de cabeçalho
  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].join('|').toLowerCase();
    if (r.includes('discrimina') || r.includes('n.º') || r.includes('n°')) { hi = i; break; }
  }
  if (hi === -1) return [];

  const h  = rows[hi].map(c => c.toLowerCase().trim());
  const ci = name => h.findIndex(c => c.includes(name));
  const iD = ci('discrimina');
  const iS = ci('venda');
  const iC = ci('comiss');
  const iP = ci('pago');
  const iI = ci('indeniza');

  // Converte "R$ 1.234,56" ou "1234,56" ou "R$ 1234.56" em número
  const toNumber = (val) => {
    if (!val) return 0;
    let s = String(val).trim();
    s = s.replace(/R\$\s?/gi, '').replace('%', '').trim();
    // remove separador de milhar (ponto) só se houver vírgula decimal depois
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  return rows.slice(hi + 1).map(row => {
    const num = parseInt(row[0]);
    if (isNaN(num)) return null;
    return {
      num,
      desc:  (row[iD] || '').trim(),
      sales: toNumber(row[iS]),
      comm:  toNumber(row[iC]),
      pago:  (row[iP] || '').toLowerCase().includes('sim'),
      inden: iI >= 0 ? (row[iI] || '').toLowerCase().includes('sim') : false,
    };
  }).filter(Boolean);
}

// Calcula estatísticas de uma lista de produtos
function calcStats(prods) {
  return {
    totalSales: prods.reduce((s, p) => s + p.sales, 0),
    totalComm:  prods.reduce((s, p) => s + p.comm, 0),
    totalInden: prods.filter(p => p.inden).reduce((s, p) => s + p.comm, 0),
    totalPago:  prods.filter(p => p.pago).length,
    count:      prods.length,
  };
}
