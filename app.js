/* CottonMap — app.js
   Vanilla JS SPA, dados salvos em localStorage neste aparelho. */

const BRAND = 'Cotton<span>Map</span>';
const DB_KEY = 'cottonmap_db_v1';
const STARTED_KEY = 'cottonmap_started';

const STRUCTS = [
  { key: 'botao',      emoji: '🌱', label: 'Botão',   size: 'small' },
  { key: 'flor',       emoji: '🌷', label: 'Flor',    size: 'small' },
  { key: 'maca',       emoji: '🍏', label: 'Maçã v.', size: 'small' },
  { key: 'cavitacao',  emoji: '🌀', label: 'Cavit.',  size: 'small' },
  { key: 'podre',      emoji: '🟤', label: 'Podre',   size: 'small' },
  { key: 'aborto',     emoji: '💀', label: 'Aborto',  size: 'big', cls: 'aborto' },
  { key: 'capulho',    emoji: '⚪', label: 'Capulho', size: 'big', cls: 'capulho' },
];
const STRUCT_BY_KEY = Object.fromEntries(STRUCTS.map(s => [s.key, s]));
const STRUCT_BY_EMOJI = Object.fromEntries(STRUCTS.map(s => [s.emoji, s]));

/* ---------- persistência ---------- */
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('DB parse error', e); }
  return { ensaios: [] };
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { toast('Não foi possível salvar (armazenamento cheio?)'); console.error(e); }
}
let DB = loadDB();

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- getters ---------- */
function getEnsaio(id) { return DB.ensaios.find(e => e.id === id); }
function getTratamento(ensaio, id) { return ensaio && ensaio.tratamentos.find(t => t.id === id); }
function getPonto(trat, id) { return trat && trat.pontos.find(p => p.id === id); }

/* ---------- status / estatísticas ---------- */
function pontoStatus(ponto) {
  if (!ponto.plantas.length) return 'new';
  const done = ponto.plantas.filter(p => p.concluida).length;
  if (done === 0) return 'new';
  return done === ponto.plantas.length ? 'ok' : 'mid';
}
function pontoProgressPct(ponto) {
  if (!ponto.plantas.length) return 0;
  return Math.round(100 * ponto.plantas.filter(p => p.concluida).length / ponto.plantas.length);
}
function tratamentoStats(trat) {
  let totalPlantas = 0, donePlantas = 0;
  trat.pontos.forEach(p => { totalPlantas += p.plantas.length; donePlantas += p.plantas.filter(pl => pl.concluida).length; });
  return { totalPontos: trat.pontos.length, totalPlantas, donePlantas };
}
function tratamentoStatus(trat) {
  const { totalPontos, totalPlantas, donePlantas } = tratamentoStats(trat);
  if (totalPontos === 0 || donePlantas === 0) return 'new';
  return (donePlantas === totalPlantas && totalPlantas > 0) ? 'ok' : 'mid';
}
function ensaioStatus(ensaio) {
  if (!ensaio.tratamentos.length) return 'new';
  const statuses = ensaio.tratamentos.map(tratamentoStatus);
  if (statuses.every(s => s === 'ok')) return 'ok';
  if (statuses.some(s => s === 'ok' || s === 'mid')) return 'mid';
  return 'new';
}
function statusLabel(s) { return s === 'ok' ? 'completo' : s === 'mid' ? 'em andamento' : 'não iniciado'; }
function nosTemDados(pl) { return pl.nos.some(n => n.estruturas.length > 0); }
function countTotalEstruturas(pl) { return pl.nos.reduce((acc, n) => acc + n.estruturas.length, 0); }
function countEstrutura(planta, key) {
  const emoji = STRUCT_BY_KEY[key].emoji;
  let c = 0;
  planta.nos.forEach(n => n.estruturas.forEach(e => { if (e === emoji) c++; }));
  return c;
}
function tratamentoMedia(trat, key) {
  let avaliadas = 0, total = 0;
  trat.pontos.forEach(p => p.plantas.forEach(pl => {
    if (pl.concluida) { avaliadas++; total += countEstrutura(pl, key); }
  }));
  return avaliadas ? total / avaliadas : null;
}
function fmtNum(v) { return v == null ? '—' : v.toFixed(1).replace('.', ','); }
function labelForEmoji(e) { const s = STRUCT_BY_EMOJI[e]; return s ? `${s.emoji} ${s.label}` : e; }
function shortLabel(n) { const m = String(n || '').match(/^([^\s·]+)/); return m ? m[1] : String(n).slice(0, 6); }
function safeName(s) { return String(s || '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'CottonMap'; }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }

/* ---------- navegação ----------
   Estrutura é uma árvore estrita (ensaio > tratamento > ponto > planta), então
   "voltar" é sempre calculado a partir do pai do nó atual — evita pilhas de
   navegação com entradas duplicadas/inconsistentes. */
let nav = { screen: localStorage.getItem(STARTED_KEY) === '1' ? 'home' : 'login' };
let sheetState = null;

function parentOf(n) {
  switch (n.screen) {
    case 'ensaio': return { screen: 'home' };
    case 'tratamento': return { screen: 'ensaio', ensaioId: n.ensaioId };
    case 'ponto': return { screen: 'tratamento', ensaioId: n.ensaioId, tratamentoId: n.tratamentoId };
    case 'mapeamento': return { screen: 'ponto', ensaioId: n.ensaioId, tratamentoId: n.tratamentoId, pontoId: n.pontoId };
    case 'relatorio': return { screen: 'ponto', ensaioId: n.ensaioId, tratamentoId: n.tratamentoId, pontoId: n.pontoId };
    case 'comparativo': return { screen: 'ensaio', ensaioId: n.ensaioId };
    default: return { screen: 'home' };
  }
}
function goto(screen, params = {}) {
  closeSheet();
  nav = Object.assign({ screen }, params);
  render();
}
function goBack() {
  closeSheet();
  nav = parentOf(nav);
  render();
}
function goHomeFallback() { nav = { screen: 'home' }; return screenHome(); }

/* ---------- UI helpers ---------- */
function topbar({ title, sub, back = true, action = '' }) {
  return `<div class="topbar">
    ${back ? `<button class="back" data-action="back">‹</button>` : ''}
    <div class="titles">
      <div class="brand">${title}</div>
      ${sub ? `<div class="topsub">${escapeHtml(sub)}</div>` : ''}
    </div>
    ${action}
  </div>`;
}
function emptyState(icon, text) {
  return `<div class="emptyState"><div class="ic">${icon}</div><p>${text}</p></div>`;
}
let toastTimer = null;
function toast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

/* ---------- telas ---------- */
function screenLogin() {
  return `
  <div class="loginWrap">
    <div class="logoMark">🌱</div>
    <h1>Cotton<span style="color:var(--soil-2)">Map</span></h1>
    <p>Mapeamento reprodutivo do algodoeiro direto no campo.</p>
    <button class="btn-primary" style="max-width:320px" data-action="start">Começar</button>
    <div class="gsync">🔒 Versão de teste: seus ensaios ficam salvos só neste aparelho. Login com Google e sincronização na nuvem chegam em uma próxima versão.</div>
  </div>`;
}

function screenHome() {
  const list = DB.ensaios.slice().sort((a, b) => b.createdAt - a.createdAt);
  const gear = `<button class="icon-btn" data-action="open-config" title="Configurações">⚙️</button>`;
  return `
    ${topbar({ title: BRAND, sub: 'Meus ensaios', back: false, action: gear })}
    <div class="screen">
      ${list.length ? list.map(e => {
        const st = ensaioStatus(e);
        const n = e.tratamentos.length;
        return `<div class="listCard" data-action="open-ensaio" data-id="${e.id}">
          <div class="top"><h4>${escapeHtml(e.nome)}</h4><span class="tag ${st}">${statusLabel(st)}</span></div>
          <div class="meta">${escapeHtml(e.fazenda || 'Sem fazenda')}${e.safra ? ' · Safra ' + escapeHtml(e.safra) : ''} · ${n} tratamento${n === 1 ? '' : 's'}</div>
        </div>`;
      }).join('') : emptyState('🌱', 'Nenhum ensaio ainda.<br>Toque em “+” para criar o primeiro.')}
    </div>
    <button class="fab" data-action="new-ensaio">+</button>`;
}

function screenEnsaio() {
  const ensaio = getEnsaio(nav.ensaioId);
  if (!ensaio) return goHomeFallback();
  const cmp = `<button class="icon-btn" data-action="open-comparativo" data-id="${ensaio.id}" title="Comparativo">📊</button>`;
  return `
  ${topbar({ title: BRAND, sub: 'Ensaio: ' + ensaio.nome, action: cmp })}
  <div class="screen">
    ${ensaio.tratamentos.length ? ensaio.tratamentos.map(t => {
      const stats = tratamentoStats(t);
      const st = tratamentoStatus(t);
      const pct = stats.totalPlantas ? Math.round(100 * stats.donePlantas / stats.totalPlantas) : 0;
      return `<div class="listCard" data-action="open-tratamento" data-id="${t.id}">
        <div class="top"><h4>${escapeHtml(t.nome)}</h4><span class="tag ${st}">${statusLabel(st)}</span></div>
        <div class="meta">${stats.totalPontos} ponto${stats.totalPontos === 1 ? '' : 's'} no talhão · ${stats.donePlantas} de ${stats.totalPlantas} plantas avaliadas</div>
        <div class="progressbar"><i style="width:${pct}%"></i></div>
      </div>`;
    }).join('') : emptyState('📋', 'Nenhum tratamento ainda.<br>Toque em “+” para adicionar (ex: Testemunha, Produto A...).')}
  </div>
  <button class="fab" data-action="new-tratamento">+</button>`;
}

function screenTratamento() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, nav.tratamentoId);
  if (!trat) return goHomeFallback();
  const resumo = `<button class="icon-btn" data-action="open-resumo" data-id="${trat.id}" title="Resumo">📊</button>`;
  return `
  ${topbar({ title: BRAND, sub: trat.nome, action: resumo })}
  <div class="screen">
    <p class="breadcrumb">${escapeHtml(ensaio.nome)} / ${escapeHtml(trat.nome)}</p>
    ${trat.pontos.length ? trat.pontos.map(p => {
      const st = pontoStatus(p);
      const pct = pontoProgressPct(p);
      const done = p.plantas.filter(pl => pl.concluida).length;
      return `<div class="listCard" data-action="open-ponto" data-id="${p.id}">
        <div class="top"><h4>${escapeHtml(p.nome)}</h4><span class="tag ${st}">${statusLabel(st)}</span></div>
        <div class="meta">${done} de ${p.plantas.length} plantas avaliadas</div>
        <div class="progressbar"><i style="width:${pct}%"></i></div>
      </div>`;
    }).join('') : emptyState('📍', 'Nenhum ponto ainda.<br>Toque em “+” para criar o primeiro ponto de avaliação.')}
  </div>
  <button class="fab" data-action="new-ponto">+</button>`;
}

function screenPonto() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, nav.tratamentoId);
  const ponto = getPonto(trat, nav.pontoId);
  if (!ponto) return goHomeFallback();
  const rel = `<button class="icon-btn" data-action="open-relatorio" title="Relatório">📄</button>`;
  return `
  ${topbar({ title: BRAND, sub: ponto.nome, action: rel })}
  <div class="screen no-fab-pad">
    <p class="breadcrumb">${escapeHtml(ensaio.nome)} / ${escapeHtml(trat.nome)} / ${escapeHtml(ponto.nome)}</p>
    ${ponto.plantas.map((pl, idx) => {
      const st = pl.concluida ? 'ok' : (nosTemDados(pl) ? 'mid' : 'new');
      const label = pl.concluida ? 'concluída' : (nosTemDados(pl) ? 'em andamento' : 'não iniciada');
      const nEstr = countTotalEstruturas(pl);
      return `<div class="listCard" data-action="open-planta" data-idx="${idx}">
        <div class="top"><h4>Planta ${pl.numero}</h4><span class="tag ${st}">${label}</span></div>
        <div class="meta">${pl.altura ? 'Altura ' + escapeHtml(pl.altura) + ' m · ' : ''}${nEstr} estrutura${nEstr === 1 ? '' : 's'} registrada${nEstr === 1 ? '' : 's'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function screenMapeamento() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, nav.tratamentoId);
  const ponto = getPonto(trat, nav.pontoId);
  const idx = nav.plantaIdx || 0;
  const planta = ponto && ponto.plantas[idx];
  if (!planta) return goHomeFallback();
  const activeIdx = planta.nos.length - 1;

  const nodesHtml = planta.nos.map((n, i) => {
    const isActive = i === activeIdx;
    const chips = n.estruturas.length
      ? n.estruturas.map((e, ci) => `<span class="chip removable" data-action="remove-estrutura" data-nodeidx="${i}" data-chipidx="${ci}">${e}</span>`).join('')
      : `<span class="nodeCheck">sem estrutura</span>`;
    return `<div class="node ${isActive ? 'active' : 'done'}">
      <div class="nodeNum">${n.numero}</div>
      <div class="chips">${chips}</div>
    </div>`;
  }).join('');

  const smallBtns = STRUCTS.filter(s => s.size === 'small').map(s =>
    `<div class="smallbtn" data-action="add-estrutura" data-key="${s.key}">${s.emoji}<span class="lbl">${s.label}</span></div>`
  ).join('');
  const bigBtns = STRUCTS.filter(s => s.size === 'big').map(s =>
    `<button class="bigbtn ${s.cls}" data-action="add-estrutura" data-key="${s.key}"><span class="ic">${s.emoji}</span>${s.label}</button>`
  ).join('');

  const isLast = idx >= ponto.plantas.length - 1;

  return `
  ${topbar({ title: BRAND, sub: `${trat.nome} · ${ponto.nome}` })}
  <div class="screen">
    <div class="plantHead"><h2>Planta ${planta.numero}</h2><span class="cnt">${idx + 1} / ${ponto.plantas.length}</span></div>
    <div class="alturaBox">
      <label>Altura</label>
      <input id="f-altura" inputmode="decimal" placeholder="0,00" value="${escapeHtml(planta.altura || '')}">
      <span class="unit">m</span>
    </div>
    <div class="stem" id="stem-list">${nodesHtml}</div>
    <div class="actionZone">
      <button class="checkbtn" data-action="concluir-ramo">✔ Concluir ramo ${planta.nos[activeIdx].numero} (sem mais estruturas)</button>
      <div class="bigrow">${bigBtns}</div>
      <div class="smallrow">${smallBtns}</div>
      <button class="footbtn" data-action="concluir-planta">${isLast ? 'Concluir planta ✅' : 'Planta concluída ✅ → próxima'}</button>
    </div>
  </div>`;
}

function screenRelatorio() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, nav.tratamentoId);
  const ponto = getPonto(trat, nav.pontoId);
  const idx = nav.plantaIdx || 0;
  const planta = ponto && ponto.plantas[idx];
  if (!planta) return goHomeFallback();

  const maxPos = Math.max(1, ...planta.nos.map(n => n.estruturas.length));
  const rows = planta.nos.slice().reverse().map(n => {
    if (!n.estruturas.length) return `<tr><td>${n.numero}</td><td colspan="${maxPos}">sem estrutura</td></tr>`;
    let cells = '';
    for (let i = 0; i < maxPos; i++) cells += `<td>${n.estruturas[i] || ''}</td>`;
    return `<tr><td>${n.numero}</td>${cells}</tr>`;
  }).join('');
  const posHeaders = Array.from({ length: maxPos }, (_, i) => `<th>Pos.${i + 1}</th>`).join('');
  const dots = ponto.plantas.map((pl, i) => `<i class="${i === idx ? 'on' : ''}" data-action="goto-planta-report" data-idx="${i}"></i>`).join('');

  return `
  ${topbar({ title: BRAND, sub: `Relatório · ${trat.nome} · ${ponto.nome}` })}
  <div class="screen no-fab-pad">
    <div class="plantNav">
      <button class="arrow" data-action="relatorio-prev" ${idx === 0 ? 'disabled' : ''}>‹</button>
      <div class="center"><b>Planta ${planta.numero}</b><span>${planta.altura ? ('Altura ' + planta.altura + ' m') : 'Altura não informada'}</span></div>
      <button class="arrow" data-action="relatorio-next" ${idx === ponto.plantas.length - 1 ? 'disabled' : ''}>›</button>
    </div>
    <div class="dots">${dots}</div>
    <div class="reportCard">
      <h4>Planta ${planta.numero} · nó a nó</h4>
      <table class="rep"><tr><th>Ramo</th>${posHeaders}</tr>${rows}</table>
      <div class="legend">${STRUCTS.map(s => `<span>${s.emoji} ${s.label}</span>`).join('')}</div>
    </div>
    <button class="btn-ghost" data-action="corrigir-planta">✏️ Corrigir esta planta</button>
    <button class="btn-primary" data-action="exportar-planta">Exportar (.xlsx) ↗</button>
  </div>`;
}

function screenComparativo() {
  const ensaio = getEnsaio(nav.ensaioId);
  if (!ensaio) return goHomeFallback();
  const trats = ensaio.tratamentos;
  const palette = ['var(--leaf)', '#9BAE8E', '#C9BE9E', '#B7AE94', '#A79F86', '#8f8873'];

  function chart(data, colorFn) {
    const max = Math.max(0.001, ...data.map(v => v || 0));
    const cols = data.map((v, i) => {
      const h = v == null ? 2 : Math.max(4, Math.round(100 * v / max));
      const bg = v == null ? 'var(--cotton-2)' : colorFn(i);
      const border = v == null ? 'border:1.5px dashed var(--line);' : '';
      return `<div class="chartCol"><span class="val">${fmtNum(v)}</span><div class="bar" style="height:${h}%; background:${bg}; ${border}"></div></div>`;
    }).join('');
    const axis = trats.map(t => `<span>${escapeHtml(shortLabel(t.nome))}</span>`).join('');
    return `<div class="chartWrap">${cols}</div><div class="chartAxis">${axis}</div>`;
  }

  const capData = trats.map(t => tratamentoMedia(t, 'capulho'));
  const abortData = trats.map(t => tratamentoMedia(t, 'aborto'));

  return `
  ${topbar({ title: BRAND, sub: 'Comparativo · ' + ensaio.nome })}
  <div class="screen no-fab-pad">
    ${trats.length ? `
    <div class="reportCard">
      <h4>Capulhos / planta — média por tratamento</h4>
      ${chart(capData, i => palette[i % palette.length])}
      <div class="caption" style="margin-top:6px;">Base: média das plantas concluídas de cada tratamento.</div>
    </div>
    <div class="reportCard">
      <h4>Abortos / planta — média por tratamento</h4>
      ${chart(abortData, () => 'var(--abort)')}
    </div>
    <button class="btn-primary" data-action="exportar-comparativo">Exportar comparativo (.xlsx) ↗</button>
    ` : emptyState('📊', 'Adicione tratamentos e avalie plantas para ver o comparativo.')}
  </div>`;
}

const SCREENS = {
  login: screenLogin, home: screenHome, ensaio: screenEnsaio, tratamento: screenTratamento,
  ponto: screenPonto, mapeamento: screenMapeamento, relatorio: screenRelatorio, comparativo: screenComparativo,
};

/* ---------- sheets (formulários em modal) ---------- */
function formNewEnsaio() {
  return `<h3>Novo ensaio</h3>
  <div class="field"><label>Nome do lote</label><input id="f-nome" placeholder="Ex: Lote 27 — Safra 25/26"></div>
  <div class="field"><label>Fazenda</label><input id="f-fazenda" placeholder="Ex: AgBi.Tech"></div>
  <div class="field"><label>Safra</label><input id="f-safra" placeholder="Ex: 25/26"></div>
  <button class="btn-primary" data-action="save-ensaio">Criar ensaio</button>
  <button class="btn-ghost" data-action="close-sheet">Cancelar</button>`;
}
function formNewTratamento() {
  return `<h3>Novo tratamento</h3>
  <div class="field"><label>Nome do tratamento</label><input id="f-trat-nome" placeholder="Ex: T4 · Produto C"></div>
  <div class="field hint">Dica: use o mesmo padrão dos outros (T1 · Testemunha, T2 · Produto A...)</div>
  <button class="btn-primary" data-action="save-tratamento">Adicionar</button>
  <button class="btn-ghost" data-action="close-sheet">Cancelar</button>`;
}
function formNewPonto() {
  const trat = getTratamento(getEnsaio(nav.ensaioId), nav.tratamentoId);
  const nextNum = (trat ? trat.pontos.length : 0) + 1;
  return `<h3>Novo ponto de avaliação</h3>
  <div class="field"><label>Identificação</label><input id="f-ponto-nome" value="Ponto ${nextNum} (Rep ${String(nextNum).padStart(2, '0')})"></div>
  <div class="field"><label>Nº de plantas a avaliar</label><input id="f-ponto-n" type="number" inputmode="numeric" value="6" min="1" max="50"></div>
  <button class="btn-primary" data-action="save-ponto">Criar ponto</button>
  <button class="btn-ghost" data-action="close-sheet">Cancelar</button>`;
}
function tratamentoResumoSheet() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, sheetState.tratamentoId);
  if (!trat) return `<h3>Resumo</h3><p class="caption">Tratamento não encontrado.</p><button class="btn-ghost" data-action="close-sheet">Fechar</button>`;
  const stats = tratamentoStats(trat);
  const mCap = tratamentoMedia(trat, 'capulho');
  const mAb = tratamentoMedia(trat, 'aborto');
  return `<h3>Resumo · ${escapeHtml(trat.nome)}</h3>
  <div class="summaryRow">
    <div class="summaryTile"><b>${stats.donePlantas}/${stats.totalPlantas}</b><span>Plantas</span></div>
    <div class="summaryTile"><b>${fmtNum(mCap)}</b><span>Capulhos/pl</span></div>
    <div class="summaryTile"><b>${fmtNum(mAb)}</b><span>Abortos/pl</span></div>
  </div>
  <p class="caption">${stats.totalPontos} ponto${stats.totalPontos === 1 ? '' : 's'} no talhão nesse tratamento.</p>
  <button class="btn-ghost" data-action="close-sheet">Fechar</button>`;
}
function formConfig() {
  return `<h3>Configurações</h3>
  <p class="caption">Versão de teste — dados salvos só neste aparelho.<br>${DB.ensaios.length} ensaio(s) salvos.</p>
  <button class="btn-danger" data-action="reset-data">🗑 Apagar todos os dados</button>
  <button class="btn-ghost" data-action="close-sheet">Fechar</button>`;
}

function renderSheet() {
  let inner = '';
  if (sheetState.type === 'new-ensaio') inner = formNewEnsaio();
  else if (sheetState.type === 'new-tratamento') inner = formNewTratamento();
  else if (sheetState.type === 'new-ponto') inner = formNewPonto();
  else if (sheetState.type === 'tratamento-resumo') inner = tratamentoResumoSheet();
  else if (sheetState.type === 'config') inner = formConfig();
  return `<div class="sheet-backdrop" data-action="close-sheet">
    <div class="sheet" data-stop="1">${inner}</div>
  </div>`;
}
function openSheet(type, params = {}) {
  sheetState = Object.assign({ type }, params);
  const old = document.querySelector('.sheet-backdrop');
  if (old) old.remove();
  document.getElementById('app').insertAdjacentHTML('beforeend', renderSheet());
  const first = document.querySelector('.sheet input');
  if (first) setTimeout(() => { first.focus(); }, 60);
}
function closeSheet() {
  sheetState = null;
  const old = document.querySelector('.sheet-backdrop');
  if (old) old.remove();
}

/* ---------- ações de dados ---------- */
function saveEnsaio() {
  const nome = val('f-nome');
  if (!nome) { toast('Dê um nome ao ensaio'); return; }
  const e = { id: uid('ens'), nome, fazenda: val('f-fazenda'), safra: val('f-safra'), createdAt: Date.now(), tratamentos: [] };
  DB.ensaios.push(e); saveDB();
  goto('ensaio', { ensaioId: e.id });
}
function saveTratamento() {
  const nome = val('f-trat-nome');
  if (!nome) { toast('Dê um nome ao tratamento'); return; }
  const ensaio = getEnsaio(nav.ensaioId);
  const t = { id: uid('trat'), nome, pontos: [] };
  ensaio.tratamentos.push(t); saveDB();
  goto('tratamento', { ensaioId: ensaio.id, tratamentoId: t.id });
}
function savePonto() {
  const ensaio = getEnsaio(nav.ensaioId);
  const trat = getTratamento(ensaio, nav.tratamentoId);
  const nome = val('f-ponto-nome') || ('Ponto ' + (trat.pontos.length + 1));
  let n = parseInt(val('f-ponto-n'), 10);
  if (!n || n < 1) n = 6;
  n = Math.min(n, 60);
  const plantas = [];
  for (let i = 1; i <= n; i++) plantas.push({ id: uid('pl'), numero: i, altura: '', concluida: false, nos: [{ numero: 1, estruturas: [] }] });
  const p = { id: uid('pt'), nome, plantas };
  trat.pontos.push(p); saveDB();
  goto('ponto', { ensaioId: ensaio.id, tratamentoId: trat.id, pontoId: p.id });
}
function addEstrutura(key) {
  const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
  const planta = ponto.plantas[nav.plantaIdx];
  const s = STRUCT_BY_KEY[key];
  planta.nos[planta.nos.length - 1].estruturas.push(s.emoji);
  saveDB();
  rerenderMapeamento();
}
function removeEstrutura(nodeIdx, chipIdx) {
  const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
  const planta = ponto.plantas[nav.plantaIdx];
  if (planta.nos[nodeIdx]) planta.nos[nodeIdx].estruturas.splice(chipIdx, 1);
  saveDB();
  rerenderMapeamento();
}
function concluirRamo() {
  const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
  const planta = ponto.plantas[nav.plantaIdx];
  const lastNum = planta.nos[planta.nos.length - 1].numero;
  planta.nos.push({ numero: lastNum + 1, estruturas: [] });
  saveDB();
  rerenderMapeamento(true);
}
function concluirPlanta() {
  const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
  const planta = ponto.plantas[nav.plantaIdx];
  const alturaEl = document.getElementById('f-altura');
  if (alturaEl) planta.altura = alturaEl.value.trim();
  planta.concluida = true;
  saveDB();
  if (nav.plantaIdx < ponto.plantas.length - 1) {
    nav.plantaIdx += 1;
    render();
  } else {
    toast('Ponto concluído 🎉');
    goto('ponto', { ensaioId: ensaio.id, tratamentoId: trat.id, pontoId: ponto.id }, { replace: true });
  }
}
function deleteAllData() {
  DB = { ensaios: [] };
  saveDB();
}

/* mantém a rolagem e foca o nó ativo sem recarregar a tela inteira */
function rerenderMapeamento(scrollToBottom) {
  const scr = document.querySelector('.screen');
  const top = scr ? scr.scrollTop : 0;
  render();
  const scr2 = document.querySelector('.screen');
  if (scr2) scr2.scrollTop = top;
  const stem = document.getElementById('stem-list');
  if (stem && scrollToBottom) stem.scrollTop = stem.scrollHeight;
}

/* ---------- exportação .xlsx ----------
   A biblioteca (SheetJS) carrega de um CDN e fica em cache depois do primeiro
   acesso online; se o aparelho nunca conseguiu baixá-la, avisa em vez de travar. */
function xlsxReady() {
  if (typeof XLSX === 'undefined') {
    toast('Sem internet para preparar a exportação. Conecte uma vez e tente de novo.');
    return false;
  }
  return true;
}
function exportPlanta() {
  if (!xlsxReady()) return;
  const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
  const planta = ponto.plantas[nav.plantaIdx];
  const rows = [
    ['Ensaio', ensaio.nome], ['Tratamento', trat.nome], ['Ponto', ponto.nome],
    ['Planta', planta.numero], ['Altura (m)', planta.altura || ''], [],
    ['Ramo', 'Posição', 'Estrutura'],
  ];
  planta.nos.forEach(n => {
    if (!n.estruturas.length) rows.push([n.numero, '', 'sem estrutura']);
    else n.estruturas.forEach((e, i) => rows.push([n.numero, i + 1, labelForEmoji(e)]));
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Planta');
  XLSX.writeFile(wb, `CottonMap_${safeName(trat.nome)}_Planta${planta.numero}.xlsx`);
  toast('Exportado ✔');
}
function exportComparativo() {
  if (!xlsxReady()) return;
  const ensaio = getEnsaio(nav.ensaioId);
  const summary = [['Tratamento', 'Pontos', 'Plantas avaliadas', 'Capulhos/planta (média)', 'Abortos/planta (média)']];
  ensaio.tratamentos.forEach(t => {
    const stats = tratamentoStats(t);
    const mCap = tratamentoMedia(t, 'capulho'), mAb = tratamentoMedia(t, 'aborto');
    summary.push([t.nome, stats.totalPontos, stats.donePlantas, mCap == null ? '' : Number(mCap.toFixed(2)), mAb == null ? '' : Number(mAb.toFixed(2))]);
  });
  const detail = [['Tratamento', 'Ponto', 'Planta', 'Altura (m)', 'Ramo', 'Posição', 'Estrutura']];
  ensaio.tratamentos.forEach(t => t.pontos.forEach(p => p.plantas.forEach(pl => {
    if (!pl.nos.some(n => n.estruturas.length)) { detail.push([t.nome, p.nome, pl.numero, pl.altura || '', '', '', '(sem dados)']); return; }
    pl.nos.forEach(n => n.estruturas.forEach((e, i) => detail.push([t.nome, p.nome, pl.numero, pl.altura || '', n.numero, i + 1, labelForEmoji(e)])));
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Comparativo');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), 'Detalhe');
  XLSX.writeFile(wb, `CottonMap_${safeName(ensaio.nome)}_Comparativo.xlsx`);
  toast('Exportado ✔');
}

/* ---------- render principal ---------- */
function render() {
  const app = document.getElementById('app');
  const fn = SCREENS[nav.screen] || screenHome;
  app.innerHTML = fn();
  if (sheetState) app.insertAdjacentHTML('beforeend', renderSheet());
  const scr = app.querySelector('.screen');
  if (scr && nav.screen !== 'mapeamento') scr.scrollTop = 0;
}

/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  const backdrop = e.target.closest('.sheet-backdrop');
  const inSheet = e.target.closest('.sheet');
  if (backdrop && !inSheet) { closeSheet(); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  switch (action) {
    case 'back': goBack(); break;
    case 'start': localStorage.setItem(STARTED_KEY, '1'); goto('home', {}, { replace: true }); break;
    case 'open-config': openSheet('config'); break;
    case 'reset-data':
      if (confirm('Tem certeza? Isso apaga todos os ensaios salvos neste aparelho.')) {
        deleteAllData(); closeSheet(); goto('home', {}, { replace: true }); toast('Dados apagados');
      }
      break;
    case 'new-ensaio': openSheet('new-ensaio'); break;
    case 'save-ensaio': saveEnsaio(); break;
    case 'open-ensaio': goto('ensaio', { ensaioId: el.dataset.id }); break;
    case 'new-tratamento': openSheet('new-tratamento'); break;
    case 'save-tratamento': saveTratamento(); break;
    case 'open-tratamento': goto('tratamento', { ensaioId: nav.ensaioId, tratamentoId: el.dataset.id }); break;
    case 'open-resumo': openSheet('tratamento-resumo', { tratamentoId: el.dataset.id }); break;
    case 'open-comparativo': goto('comparativo', { ensaioId: el.dataset.id }); break;
    case 'new-ponto': openSheet('new-ponto'); break;
    case 'save-ponto': savePonto(); break;
    case 'open-ponto': goto('ponto', { ensaioId: nav.ensaioId, tratamentoId: nav.tratamentoId, pontoId: el.dataset.id }); break;
    case 'open-planta': goto('mapeamento', { ensaioId: nav.ensaioId, tratamentoId: nav.tratamentoId, pontoId: nav.pontoId, plantaIdx: parseInt(el.dataset.idx, 10) }); break;
    case 'open-relatorio': goto('relatorio', { ensaioId: nav.ensaioId, tratamentoId: nav.tratamentoId, pontoId: nav.pontoId, plantaIdx: 0 }); break;
    case 'add-estrutura': addEstrutura(el.dataset.key); break;
    case 'remove-estrutura': removeEstrutura(parseInt(el.dataset.nodeidx, 10), parseInt(el.dataset.chipidx, 10)); break;
    case 'concluir-ramo': concluirRamo(); break;
    case 'concluir-planta': concluirPlanta(); break;
    case 'corrigir-planta': goto('mapeamento', { ensaioId: nav.ensaioId, tratamentoId: nav.tratamentoId, pontoId: nav.pontoId, plantaIdx: nav.plantaIdx || 0 }); break;
    case 'relatorio-prev': nav.plantaIdx = Math.max(0, (nav.plantaIdx || 0) - 1); render(); break;
    case 'relatorio-next': {
      const ponto = getPonto(getTratamento(getEnsaio(nav.ensaioId), nav.tratamentoId), nav.pontoId);
      nav.plantaIdx = Math.min(ponto.plantas.length - 1, (nav.plantaIdx || 0) + 1);
      render();
      break;
    }
    case 'goto-planta-report': nav.plantaIdx = parseInt(el.dataset.idx, 10); render(); break;
    case 'exportar-planta': exportPlanta(); break;
    case 'exportar-comparativo': exportComparativo(); break;
    case 'close-sheet': closeSheet(); break;
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'f-altura') {
    const ensaio = getEnsaio(nav.ensaioId), trat = getTratamento(ensaio, nav.tratamentoId), ponto = getPonto(trat, nav.pontoId);
    if (!ponto) return;
    const planta = ponto.plantas[nav.plantaIdx];
    if (planta) { planta.altura = e.target.value.trim(); saveDB(); }
  }
});

/* ---------- init ---------- */
render();
