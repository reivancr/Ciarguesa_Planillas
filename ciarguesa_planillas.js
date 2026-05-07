const TP = 0.3216, TO = 0.055;
let emps = JSON.parse(localStorage.getItem('cg_e') || '[]');
let hexs = JSON.parse(localStorage.getItem('cg_h') || '[]');
let vacs = JSON.parse(localStorage.getItem('cg_v') || '[]');
let auss = JSON.parse(localStorage.getItem('cg_a') || '[]');
let incs = JSON.parse(localStorage.getItem('cg_i') || '[]');
let acts = JSON.parse(localStorage.getItem('cg_ac') || '[]');
const sv = () => { ['cg_e', 'cg_h', 'cg_v', 'cg_a', 'cg_i', 'cg_ac'].forEach((k, i) => localStorage.setItem(k, JSON.stringify([emps, hexs, vacs, auss, incs, acts][i]))); };
const fmt = n => '₡' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titles = { dashboard: 'Dashboard Principal', empleados: 'Gestión de Empleados', planilla: 'Planilla Central', horas: 'Control de Horas Extras', vacaciones: 'Gestión de Vacaciones', incapacidades: 'Registro de Incapacidades', boletas: 'Emisión de Boletas', ccss: 'Reportes CCSS / SICERE' };
const cols = ['#1E293B', '#C29947', '#334155', '#D4B475', '#475569', '#AF8735', '#64748B'];

document.getElementById('badge-fecha').textContent = new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });

function go(id, el) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('on'));
  document.getElementById('page-' + id).classList.add('on');
  el.classList.add('on');
  document.getElementById('pg-title').textContent = titles[id] || id;
  if (id === 'dashboard') updDash();
  if (id === 'planilla') initP();
  if (id === 'boletas') { syncSels(); initBol(); loadSMTP(); }
  // if (id === 'ccss') initCC();
}

function setTab(pg, tabId, el) {
  const container = document.getElementById('page-' + pg);
  container.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  container.querySelectorAll('.tab-pg').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(pg + '-' + tabId).classList.add('on');
}

function toast(msg, type = 'suc') {
  const t = document.getElementById('toast');
  const icon = type === 'suc' ? 'ti-circle-check' : 'ti-alert-circle';
  t.innerHTML = `<i class="ti ${icon}"></i><span>${msg}</span>`;
  t.className = 'on ' + type;
  setTimeout(() => t.className = '', 4000);
}

function log(msg) { acts.unshift({ msg, ts: new Date().toLocaleString('es-CR') }); if (acts.length > 20) acts.pop(); sv(); renderActs(); }

function openM(id) { syncSels(); document.getElementById(id).classList.add('on'); }
function closeM(id) { document.getElementById(id).classList.remove('on'); }
document.querySelectorAll('.ov').forEach(o => o.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('on'); }));

function syncSels() {
  ['h-emp', 'v-emp', 'a-emp', 'i-emp', 'bol-emp'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">-- Seleccione --</option>';
    emps.forEach(e => { const o = document.createElement('option'); o.value = e.ced; o.textContent = e.nom + ' (' + e.ced + ')'; el.appendChild(o); });
    el.value = cur;
  });
}

function updDash() {
  const masa = emps.reduce((s, e) => s + parseFloat(e.sal || 0), 0);
  document.getElementById('d-emp').textContent = emps.length;
  document.getElementById('d-masa').textContent = fmt(masa);
  document.getElementById('d-hex').textContent = hexs.filter(h => h.est === 'pendiente').length;
  document.getElementById('d-vac').textContent = vacs.filter(v => v.est === 'aprobada').length;
  document.getElementById('d-inc').textContent = incs.length;
  document.getElementById('d-pat').textContent = fmt(masa * TP);
  document.getElementById('d-ob').textContent = fmt(masa * TO);
  renderChart(); renderActs();
}

function renderChart() {
  const cb = document.getElementById('chart-bars'), cl = document.getElementById('chart-labs');
  const data = emps.slice(0, 7);
  if (!data.length) { cb.innerHTML = '<span style="color:var(--color-text-tertiary);font-size:12px;margin:auto;">Sin datos</span>'; cl.innerHTML = ''; return; }
  const mx = Math.max(...data.map(e => e.sal));
  cb.innerHTML = data.map((e, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;"><div class="bar" style="width:100%;height:${Math.round((e.sal / mx) * 100)}%;background:${cols[i % 7]};" title="${e.nom}: ${fmt(e.sal)}"></div></div>`).join('');
  cl.innerHTML = data.map(e => `<div style="flex:1;text-align:center;font-size:10px;color:var(--color-text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.nom.split(' ')[0]}</div>`).join('');
}

function renderActs() {
  const el = document.getElementById('d-act');
  if (!acts.length) { el.innerHTML = '<div style="color:var(--color-text-tertiary);text-align:center;padding:14px;font-size:12px;">Sin actividad.</div>'; return; }
  el.innerHTML = acts.slice(0, 8).map(a => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);"><span>${a.msg}</span><span style="font-size:11px;color:var(--color-text-tertiary);">${a.ts}</span></div>`).join('');
}

function renderEmps(data) {
  const tb = document.getElementById('tb-emp');
  if (!data.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">No hay empleados.</td></tr>'; return; }
  tb.innerHTML = data.map(e => `<tr>
    <td>${e.ced}</td><td><strong>${e.nom}</strong></td><td style="color:var(--color-text-secondary);">${e.pue || '—'}</td>
    <td>${fmt(e.sal)}</td><td><span class="pill p-blue">${e.tp}</span></td>
    <td><span class="dot dg"></span>Activo</td>
    <td style="white-space:nowrap;"><button class="btn sm" onclick="editEmp('${e.ced}')"><i class="ti ti-edit" aria-hidden="true"></i></button> <button class="btn sm dan" onclick="delEmp('${e.ced}')"><i class="ti ti-trash" aria-hidden="true"></i></button></td>
  </tr>`).join('');
}

function filtEmp(q) { renderEmps(emps.filter(e => e.nom.toLowerCase().includes(q.toLowerCase()) || e.ced.includes(q))); }

function saveEmp() {
  const ced = document.getElementById('e-ced').value.trim();
  const nom = document.getElementById('e-nom').value.trim();
  const sal = parseFloat(document.getElementById('e-sal').value);
  if (!ced || !nom || !sal) { toast('Complete los campos obligatorios', 'err'); return; }
  if (emps.find(e => e.ced === ced)) { toast('Ya existe esa cédula', 'err'); return; }
  emps.push({ 
    ced, nom, sal, 
    pue: document.getElementById('e-pue').value.trim(), 
    dep: document.getElementById('e-dep').value.trim(), 
    tp: document.getElementById('e-tp').value, 
    jor: document.getElementById('e-jor').value, 
    ing: document.getElementById('e-ing').value, 
    mail: document.getElementById('e-mail').value, 
    ase: document.getElementById('e-ase').value, 
    pres: parseFloat(document.getElementById('e-pres').value || 0), 
    hijos: parseInt(document.getElementById('e-hijos').value || 0), 
    cony: document.getElementById('e-cony').value,
    acumBruto: 0 // Para cálculo de Aguinaldo
  });
  sv(); renderEmps(emps); syncSels(); closeM('m-emp');
  toast('Empleado ' + nom + ' registrado'); log('Nuevo empleado: ' + nom); updDash();
  ['e-ced', 'e-nom', 'e-pue', 'e-dep', 'e-sal', 'e-mail', 'e-ase', 'e-ing', 'e-pres', 'e-hijos'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('e-cony').value = 'no';
}

function delEmp(ced) {
  const e = emps.find(x => x.ced === ced); if (!e || !confirm('¿Eliminar a ' + e.nom + '?')) return;
  emps = emps.filter(x => x.ced !== ced); sv(); renderEmps(emps); syncSels();
  toast('Eliminado: ' + e.nom); log('Eliminado: ' + e.nom); updDash();
}

function editEmp(ced) {
  const e = emps.find(x => x.ced === ced); if (!e) return;
  ['e-ced', 'e-nom', 'e-pue', 'e-dep', 'e-sal', 'e-jor', 'e-ing', 'e-mail', 'e-ase', 'e-pres', 'e-hijos', 'e-cony'].forEach(id => {
    const key = id.replace('e-', ''); const map = { ced: 'ced', nom: 'nom', pue: 'pue', dep: 'dep', sal: 'sal', jor: 'jor', ing: 'ing', mail: 'mail', ase: 'ase', pres: 'pres', hijos: 'hijos', cony: 'cony' };
    document.getElementById(id).value = e[map[key]] || (id === 'e-cony' ? 'no' : '');
  });
  document.getElementById('e-tp').value = e.tp || 'quincenal';
  emps = emps.filter(x => x.ced !== ced); sv(); openM('m-emp');
}

function renta(sal, hijos = 0, cony = 'no') {
  let imp = 0;
  if (sal <= 918000) imp = 0;
  else if (sal <= 1347000) imp = (sal - 918000) * .10;
  else if (sal <= 2364000) imp = (1347000 - 918000) * .10 + (sal - 1347000) * .15;
  else if (sal <= 4727000) imp = (1347000 - 918000) * .10 + (2364000 - 1347000) * .15 + (sal - 2364000) * .20;
  else imp = (1347000 - 918000) * .10 + (2364000 - 1347000) * .15 + (4727000 - 2364000) * .20 + (sal - 4727000) * .25;

  // Créditos fiscales (Ley de Impuesto sobre la Renta CR)
  const c_hijo = 1750, c_cony = 2650;
  imp -= (hijos * c_hijo);
  if (cony === 'si') imp -= c_cony;

  return Math.max(0, imp);
}

function updBadge() {
  const tipo = document.getElementById('tipo-p').value;
  const badge = document.getElementById('badge-per');
  badge.textContent = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  badge.className = `pill ${tipo === 'quincenal' ? 'p-green' : 'p-blue'}`;
  document.getElementById('p-dias').value = (tipo === 'quincenal' ? 15 : 7);
}

function initP() {
  const hoy = new Date(), d = hoy.getDate();
  let des, has;
  if (d <= 15) { des = new Date(hoy.getFullYear(), hoy.getMonth(), 1); has = new Date(hoy.getFullYear(), hoy.getMonth(), 15); }
  else { des = new Date(hoy.getFullYear(), hoy.getMonth(), 16); has = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); }
  document.getElementById('p-des').value = des.toISOString().split('T')[0];
  document.getElementById('p-has').value = has.toISOString().split('T')[0];
  updBadge();
}

function calcP() {
  const tipo = document.getElementById('tipo-p').value;
  const filteredEmps = emps.filter(e => e.tp === tipo);
  if (!filteredEmps.length) {
    toast('No hay empleados de tipo ' + tipo, 'err');
    document.getElementById('tb-p').innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">No hay empleados marcados como ${tipo}.</td></tr>`;
    document.getElementById('p-bruto').textContent = fmt(0);
    document.getElementById('p-neto').textContent = fmt(0);
    document.getElementById('p-pat').textContent = fmt(0);
    document.getElementById('p-ob').textContent = fmt(0);
    return;
  }
  const dias = parseInt(document.getElementById('p-dias').value) || (tipo === 'quincenal' ? 15 : 7);
  let tb = 0, tn = 0, tp = 0, tob = 0;
  const rows = filteredEmps.map(e => {
    const sm = parseFloat(e.sal), sp = (sm / 30) * dias;
    const mh = hexs.filter(h => h.emp === e.ced && h.est !== 'rechazado').reduce((s, h) => { return s + (sm / (30 * 8)) * 1.5 * parseFloat(h.h || 0); }, 0);
    const br = sp + mh, ob = br * TO;
    const baseMensual = (br - ob) * (30 / dias);
    const rt = renta(baseMensual, e.hijos, e.cony) * (dias / 30);
    const pr = parseFloat(e.pres || 0), net = br - ob - rt - pr;
    tb += br; tn += net; tp += br * TP; tob += ob;
    return { e, br, net, ob, rt, pr, dias, mh };
  });
  document.getElementById('p-bruto').textContent = fmt(tb);
  document.getElementById('p-neto').textContent = fmt(tn);
  document.getElementById('p-pat').textContent = fmt(tp);
  document.getElementById('p-ob').textContent = fmt(tob);
  document.getElementById('tb-p').innerHTML = rows.map(r => `<tr>
    <td>${r.e.ced}</td><td><strong>${r.e.nom}</strong></td><td>${r.dias}</td>
    <td>${fmt(r.br)}</td><td style="color:${r.mh > 0 ? '#BA7517' : 'var(--color-text-tertiary)'}">${r.mh > 0 ? fmt(r.mh) : '—'}</td>
    <td style="color:#A32D2D;">${fmt(r.ob)}</td><td style="color:#A32D2D;">${fmt(r.rt)}</td><td style="color:#A32D2D;">${r.pr > 0 ? fmt(r.pr) : '—'}</td>
    <td style="font-weight:500;color:#3B6D11;">${fmt(r.net)}</td>
    <td><button class="btn sm acc" onclick="qBol('${r.e.ced}')" title="Generar Boleta"><i class="ti ti-file-invoice" aria-hidden="true"></i></button></td>
  </tr>`).join('');
}

function aprobarP() { 
  const tipo = document.getElementById('tipo-p').value;
  const dias = parseInt(document.getElementById('p-dias').value) || (tipo === 'quincenal' ? 15 : 7);
  
  // Actualizar acumulados de Aguinaldo para los empleados en esta planilla
  emps.forEach(e => {
    if (e.tp === tipo) {
      const sm = parseFloat(e.sal), sp = (sm / 30) * dias;
      const mh = hexs.filter(h => h.emp === e.ced && h.est !== 'rechazado').reduce((s, h) => { 
        return s + (sm / (30 * 8)) * 1.5 * parseFloat(h.h || 0); 
      }, 0);
      const br = sp + mh;
      e.acumBruto = (e.acumBruto || 0) + br;
    }
  });
  
  sv(); calcP(); toast('Planilla aprobada y acumulados actualizados'); log('Planilla aprobada: ' + tipo); 
}

function exportP() {
  const rows = document.querySelectorAll('#tb-p tr'); let csv = 'Cédula,Empleado,Días,Bruto,H.Extra,Ded.Obrero,Renta,Neto\n';
  rows.forEach(r => { const c = r.querySelectorAll('td'); if (c.length < 8) return; csv += Array.from(c).slice(0, 8).map(x => '"' + x.textContent.replace(/₡/g, '').trim() + '"').join(',') + '\n'; });
  const b = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'planilla_CIARGUESA.csv'; a.click();
  toast('CSV exportado');
}

function calcH() {
  const sal = parseFloat(document.getElementById('c-sal').value);
  const h = parseFloat(document.getElementById('c-hex').value);
  if (!sal || !h) { document.getElementById('r-hex').style.display = 'none'; return; }
  const jor = document.getElementById('c-jor').value;
  const hm = jor === 'nocturna' ? 180 : jor === 'mixta' ? 210 : 240;
  const ho = sal / hm, he = ho * 1.5, tot = he * h;
  document.getElementById('rho').textContent = fmt(ho);
  document.getElementById('rhe').textContent = fmt(he);
  document.getElementById('rht').textContent = fmt(tot);
  document.getElementById('r-hex').style.display = 'block';
  document.getElementById('r-hex').style.borderLeft = '4px solid var(--accent)';
}

function renderHex() {
  const tb = document.getElementById('tb-hex');
  if (!hexs.length) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">Sin registros.</td></tr>'; return; }
  const bc = { pendiente: 'p-yellow', aprobado: 'p-green', rechazado: 'p-red' };
  tb.innerHTML = hexs.map((h, i) => {
    const e = emps.find(x => x.ced === h.emp); const ho = e ? parseFloat(e.sal) / 240 : 0; const monto = ho * 1.5 * parseFloat(h.h);
    return `<tr><td>${h.fec}</td><td>${e ? e.nom : h.emp}</td><td>${h.jor}</td>
    <td style="font-weight:500;">${h.h}h</td><td>${fmt(monto)}</td><td style="color:var(--color-text-secondary);">${h.mot || '—'}</td>
    <td><span class="pill ${bc[h.est]}">${h.est}</span></td>
    <td style="white-space:nowrap;">${h.est === 'pendiente' ? `<button class="btn sm suc" onclick="apHex(${i})" aria-label="Aprobar"><i class="ti ti-check" aria-hidden="true"></i></button> <button class="btn sm dan" onclick="rejHex(${i})" aria-label="Rechazar"><i class="ti ti-x" aria-hidden="true"></i></button>` : '—'}</td></tr>`;
  }).join('');
}

function saveHex() {
  const emp = document.getElementById('h-emp').value, fec = document.getElementById('h-fec').value, h = document.getElementById('h-h').value;
  if (!emp || !fec || !h) { toast('Complete los campos', 'err'); return; }
  hexs.push({ emp, fec, h: parseFloat(h), jor: document.getElementById('h-jor').value, mot: document.getElementById('h-mot').value, est: 'pendiente' });
  sv(); renderHex(); closeM('m-hex');
  const e = emps.find(x => x.ced === emp);
  toast('Horas registradas: ' + (e?.nom || emp)); log('H.Extra: ' + (e?.nom || emp) + ' — ' + h + 'h'); updDash();
}

function apHex(i) { hexs[i].est = 'aprobado'; sv(); renderHex(); toast('Aprobado'); }
function rejHex(i) { hexs[i].est = 'rechazado'; sv(); renderHex(); toast('Rechazado', 'err'); }

function diasAcum(ing) { if (!ing) return 0; return Math.floor(Math.floor((Date.now() - new Date(ing)) / (1000 * 60 * 60 * 24 * 7)) / 50 * 14); }

function renderVacs() {
  const tb = document.getElementById('tb-vac');
  document.getElementById('v-act').textContent = vacs.filter(v => v.est === 'aprobada').length;
  document.getElementById('v-pend').textContent = vacs.filter(v => v.est === 'pendiente').length;
  if (!vacs.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--color-text-tertiary);padding:18px;">Sin solicitudes.</td></tr>'; return; }
  const bc = { pendiente: 'p-yellow', aprobada: 'p-green', rechazada: 'p-red' };
  tb.innerHTML = vacs.map((v, i) => {
    const e = emps.find(x => x.ced === v.emp); const da = e ? diasAcum(e.ing) : 0;
    return `<tr><td>${e ? e.nom : v.emp}</td><td>${da} días</td><td style="font-weight:500;">${v.dias}</td>
    <td>${v.ini} → ${v.fin}</td><td><span class="pill ${bc[v.est]}">${v.est}</span></td>
    <td style="white-space:nowrap;">${v.est === 'pendiente' ? `<button class="btn sm suc" onclick="apVac(${i})" aria-label="Aprobar"><i class="ti ti-check" aria-hidden="true"></i></button> <button class="btn sm dan" onclick="rejVac(${i})" aria-label="Rechazar"><i class="ti ti-x" aria-hidden="true"></i></button>` : '—'}</td></tr>`;
  }).join('');
}

function saveVac() {
  const emp = document.getElementById('v-emp').value, ini = document.getElementById('v-ini').value, fin = document.getElementById('v-fin').value;
  if (!emp || !ini || !fin) { toast('Complete los campos', 'err'); return; }
  const dias = Math.round((new Date(fin) - new Date(ini)) / (1000 * 60 * 60 * 24)) + 1;
  vacs.push({ emp, ini, fin, dias, tip: document.getElementById('v-tip').value, obs: document.getElementById('v-obs').value, est: 'pendiente' });
  sv(); renderVacs(); closeM('m-vac');
  const e = emps.find(x => x.ced === emp);
  toast('Solicitud registrada — ' + dias + ' días'); log('Vacaciones: ' + (e?.nom || emp) + ' — ' + dias + ' días'); updDash();
}

function apVac(i) { vacs[i].est = 'aprobada'; sv(); renderVacs(); toast('Vacaciones aprobadas'); log('Vacaciones aprobadas'); }
function rejVac(i) { vacs[i].est = 'rechazada'; sv(); renderVacs(); toast('Rechazado', 'err'); }

function renderAus() {
  const tb = document.getElementById('tb-aus');
  const mes = new Date().getMonth();
  document.getElementById('a-mes').textContent = auss.filter(a => new Date(a.fec).getMonth() === mes).length;
  if (!auss.length) { tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-tertiary);padding:18px;">Sin ausencias.</td></tr>'; return; }
  tb.innerHTML = auss.map(a => {
    const e = emps.find(x => x.ced === a.emp);
    return `<tr><td>${a.fec}</td><td>${e ? e.nom : a.emp}</td><td>${a.mot}</td><td><span class="pill ${a.jus === 'si' ? 'p-green' : 'p-red'}">${a.jus === 'si' ? 'Sí' : 'No'}</span></td></tr>`;
  }).join('');
}

function saveAus() {
  const emp = document.getElementById('a-emp').value, fec = document.getElementById('a-fec').value;
  if (!emp || !fec) { toast('Complete los campos', 'err'); return; }
  auss.push({ emp, fec, mot: document.getElementById('a-mot').value, jus: document.getElementById('a-jus').value });
  sv(); renderAus(); closeM('m-aus');
  const e = emps.find(x => x.ced === emp);
  toast('Ausencia registrada'); log('Ausencia: ' + (e?.nom || emp) + ' — ' + fec);
}

function calcIC() {
  const sal = parseFloat(document.getElementById('ic-sal').value);
  const dias = parseInt(document.getElementById('ic-dias').value);
  if (!sal || !dias) { document.getElementById('r-inc').style.display = 'none'; return; }
  const sd = sal / 30, dp = Math.min(dias, 3), dc = Math.max(0, dias - 3);
  document.getElementById('ic-dp').textContent = dp + ' días';
  document.getElementById('ic-mp').textContent = fmt(sd * dp * .5);
  document.getElementById('ic-dc').textContent = dc + ' días';
  document.getElementById('ic-mc').textContent = fmt(sd * dc * .6);
  document.getElementById('r-inc').style.display = 'block';
  document.getElementById('r-inc').style.borderLeft = '4px solid var(--info)';
}

function renderIncs() {
  const tb = document.getElementById('tb-inc');
  if (!incs.length) { tb.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-tertiary);padding:24px;">Sin registros.</td></tr>'; return; }
  const bc = { enfermedad: 'p-yellow', accidente: 'p-red', maternidad: 'p-purple' };
  tb.innerHTML = incs.map(inc => {
    const e = emps.find(x => x.ced === inc.emp);
    return `<tr><td>${inc.num || '—'}</td><td>${e ? e.nom : inc.emp}</td><td>${inc.ini}</td>
    <td style="font-weight:500;">${inc.dias}</td><td><span class="pill ${bc[inc.tip] || 'p-blue'}">${inc.tip}</span></td>
    <td style="color:#BA7517;">${fmt(inc.mp)}</td><td style="color:#185FA5;">${fmt(inc.mc)}</td>
    <td><span class="pill p-green">activa</span></td></tr>`;
  }).join('');
}

function saveInc() {
  const emp = document.getElementById('i-emp').value, ini = document.getElementById('i-ini').value;
  const dias = parseInt(document.getElementById('i-dias').value);
  if (!emp || !ini || !dias) { toast('Complete los campos', 'err'); return; }
  const e = emps.find(x => x.ced === emp); const sd = e ? parseFloat(e.sal) / 30 : 0;
  incs.push({ emp, num: document.getElementById('i-num').value, ini, dias, tip: document.getElementById('i-tip').value, diag: document.getElementById('i-diag').value, mp: sd * Math.min(dias, 3) * .5, mc: sd * Math.max(0, dias - 3) * .6 });
  sv(); renderIncs(); closeM('m-inc');
  toast('Incapacidad registrada — ' + dias + ' días'); log('Incapacidad: ' + (e?.nom || emp) + ' — ' + dias + ' días'); updDash();
}

function initBol() {
  updBolDates();
  updManiDates();
}

function updBolDates() {
  const ced = document.getElementById('bol-emp').value;
  const tipo = document.getElementById('bol-tipo').value;
  const e = emps.find(x => x.ced === ced);
  const hoy = new Date();
  let des, has;

  if (tipo === 'semanal') {
    // Buscar el lunes de la semana actual
    des = new Date(hoy);
    const day = des.getDay() || 7;
    des.setHours(-24 * (day - 1));
    has = new Date(des);
    has.setDate(des.getDate() + 6);
    document.getElementById('bol-dias').value = 7;
  } else {
    if (hoy.getDate() <= 15) {
      des = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      has = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    } else {
      des = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
      has = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }
    document.getElementById('bol-dias').value = 15;
  }
  document.getElementById('bol-des').value = des.toISOString().split('T')[0];
  document.getElementById('bol-has').value = has.toISOString().split('T')[0];

  // Calcular horas extras automáticas para este periodo
  if (ced) {
    const hexTotal = hexs.filter(h => h.emp === ced && h.est === 'aprobado' && h.fec >= des.toISOString().split('T')[0] && h.fec <= has.toISOString().split('T')[0])
                         .reduce((s, h) => s + parseFloat(h.h || 0), 0);
    document.getElementById('bol-hex').value = hexTotal;
  }
}

function updManiDates() {
  const tipo = document.getElementById('bol-m-tipo').value;
  const hoy = new Date();
  let des, has;
  if (tipo === 'semanal') {
    des = new Date(hoy);
    const day = des.getDay() || 7;
    des.setHours(-24 * (day - 1));
    has = new Date(des);
    has.setDate(des.getDate() + 6);
    document.getElementById('bol-m-dias').value = 7;
  } else {
    if (hoy.getDate() <= 15) {
      des = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      has = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    } else {
      des = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
      has = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }
    document.getElementById('bol-m-dias').value = 15;
  }
  document.getElementById('bol-m-des').value = des.toISOString().split('T')[0];
  document.getElementById('bol-m-has').value = has.toISOString().split('T')[0];
}

function qBol(ced) {
  const e = emps.find(x => x.ced === ced);
  go('boletas', document.querySelectorAll('.nav-it')[6]); // El índice cambió al moverlo
  setTimeout(() => { 
    syncSels(); 
    document.getElementById('bol-emp').value = ced; 
    if (e) document.getElementById('bol-tipo').value = e.tp;
    updBolDates(); 
    prevBol(); 
  }, 80);
}

function saveSMTP() {
  const cfg = {
    host: document.getElementById('smtp-host').value,
    port: document.getElementById('smtp-port').value,
    user: document.getElementById('smtp-user').value,
    pass: document.getElementById('smtp-pass').value,
    from: document.getElementById('smtp-from').value,
    secure: document.getElementById('smtp-sec').value
  };
  localStorage.setItem('cg_smtp', JSON.stringify(cfg));
  toast('Configuración SMTP guardada');
}

function loadSMTP() {
  const cfg = JSON.parse(localStorage.getItem('cg_smtp') || '{}');
  if (!cfg.host) return;
  document.getElementById('smtp-host').value = cfg.host || '';
  document.getElementById('smtp-port').value = cfg.port || '';
  document.getElementById('smtp-user').value = cfg.user || '';
  document.getElementById('smtp-pass').value = cfg.pass || '';
  document.getElementById('smtp-from').value = cfg.from || 'Recursos Humanos CIARGUESA';
  document.getElementById('smtp-sec').value = cfg.secure || 'ssl';
}

async function testSMTP() {
  const cfg = {
    host: document.getElementById('smtp-host').value,
    port: document.getElementById('smtp-port').value,
    user: document.getElementById('smtp-user').value,
    pass: document.getElementById('smtp-pass').value,
    secure: document.getElementById('smtp-sec').value
  };
  try {
    const r = await fetch('http://localhost:3001/api/mail/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    const res = await r.json();
    if (res.success) toast('Conexión SMTP exitosa');
    else toast('Error: ' + res.message, 'err');
  } catch (e) {
    toast('Error conectando al backend', 'err');
  }
}

function prevBol() {
  const ced = document.getElementById('bol-emp').value;
  const des = document.getElementById('bol-des').value, has = document.getElementById('bol-has').value;
  const hex = parseFloat(document.getElementById('bol-hex').value || 0);
  const ot = parseFloat(document.getElementById('bol-ot').value || 0);
  const e = emps.find(x => x.ced === ced);
  if (!e) { toast('Seleccione un empleado primero', 'err'); return; }
  openM('m-bol');
  const sm = parseFloat(e.sal), dias = parseInt(document.getElementById('bol-dias').value) || 15;
  const sp = (sm / 30) * dias, ho = sm / 240, mh = hex * ho * 1.5;
  const pr = parseFloat(e.pres || 0);
  const br = sp + mh + ot, ob = br * TO;
  const baseMensual = (br - ob) * (30 / dias);
  const rt = renta(baseMensual, e.hijos, e.cony) * (dias / 30), net = br - ob - rt - pr;
  const acumTotal = (e.acumBruto || 0) + br;
  const agui = acumTotal / 12;
  const hoy = new Date().toLocaleDateString('es-CR');
  document.getElementById('bol-prev').innerHTML = `<div class="boleta" style="box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid var(--color-border-secondary); margin: 0 auto; background:#fff; padding:30px; border-radius:12px;">
    <div class="bol-h" style="display:flex; justify-content:space-between; border-bottom:2px solid var(--primary); padding-bottom:15px; margin-bottom:20px;">
      <div>
        <div style="font-size:22px;font-weight:700;color:var(--primary);letter-spacing:1px;">CIARGUESA</div>
        <div style="font-size:11px;color:var(--accent);font-weight:600;text-transform:uppercase;">Business Security Solutions</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:14px;color:var(--primary);">BOLETA DE PAGO</div>
        <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;">Emitida: ${hoy}</div>
        <div style="font-size:11px;color:var(--primary);font-weight:600;margin-top:5px;">Período: ${des || '—'} al ${has || '—'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:30px;margin-bottom:20px;padding:15px;background:var(--color-background-secondary);border-radius:10px;">
      <div>
        <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;margin-bottom:4px;">Colaborador</div>
        <div style="font-size:16px;font-weight:700;color:var(--primary);">${e.nom}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">${e.pue || 'Oficial de Seguridad'}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;margin-bottom:4px;">Identificación</div>
        <div style="font-size:14px;font-weight:600;color:var(--primary);">${e.ced}</div>
        <div style="font-size:11px;color:var(--color-text-tertiary);">N° Asegurado: ${e.ase || '—'}</div>
      </div>
    </div>
    <table class="bt" style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead><tr style="background:var(--color-background-secondary);"><th style="text-align:left; padding:10px;">Descripción de Ingresos</th><th style="text-align:right; padding:10px;">Monto (₡)</th></tr></thead>
      <tbody>
        <tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">Salario Base (${dias} días)</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary);">${fmt(sp)}</td></tr>
        ${mh > 0 ? `<tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">Horas Extraordinarias (${hex}h)</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary); color:var(--warning); font-weight:600;">${fmt(mh)}</td></tr>` : ''}
        ${ot > 0 ? `<tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">Otros Ingresos</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary);">${fmt(ot)}</td></tr>` : ''}
        <tr style="font-weight:700; background:var(--color-background-secondary);"><td style="padding:10px;">TOTAL INGRESOS BRUTOS</td><td style="text-align:right; padding:10px;">${fmt(br)}</td></tr>
      </tbody>
    </table>
    <table class="bt" style="width:100%; border-collapse:collapse; font-size:12px; margin-top:15px;">
      <thead><tr style="background:var(--color-background-secondary);"><th style="text-align:left; padding:10px;">Deducciones de Ley</th><th style="text-align:right; padding:10px;">Monto (₡)</th></tr></thead>
      <tbody>
        <tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">C.C.S.S. (9.67% total)</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary); color:var(--danger);">${fmt(ob)}</td></tr>
        ${rt > 0 ? `<tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">Impuesto Renta</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary); color:var(--danger);">${fmt(rt)}</td></tr>` : ''}
        ${pr > 0 ? `<tr><td style="padding:10px; border-bottom:1px solid var(--color-border-tertiary);">Pensión Alimenticia</td><td style="text-align:right; padding:10px; border-bottom:1px solid var(--color-border-tertiary); color:var(--danger);">${fmt(pr)}</td></tr>` : ''}
      </tbody>
    </table>
    <div style="background:var(--primary); color:#fff; padding:20px; border-radius:12px; text-align:center; margin-top:20px;">
      <div style="font-size:11px; opacity:0.8; text-transform:uppercase;">Salario Neto a Percibir</div>
      <div style="font-size:26px; font-weight:700;">${fmt(net)}</div>
    </div>
  </div>`;
}

function getBolHTML(e, des, has, hex, ot, dias) {
  const sm = parseFloat(e.sal), sp = (sm / 30) * dias;
  const ho = sm / 240, mh = hex * ho * 1.5;
  const pr = parseFloat(e.pres || 0);
  const br = sp + mh + ot, ob = br * TO;
  const baseMensual = (br - ob) * (30 / dias);
  const rt = renta(baseMensual, e.hijos, e.cony) * (dias / 30), net = br - ob - rt - pr;

  return `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; background: #fff;">
      <div style="border-bottom: 2px solid #0F172A; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="margin:0; color:#0F172A;">CIARGUESA</h2>
        <p style="margin:0; font-size:12px; color:#C29947; font-weight:bold;">Business Security Solutions</p>
      </div>
      <div style="margin-bottom:20px;">
        <h3 style="margin:0; font-size:16px;">BOLETA DE PAGO</h3>
        <p style="margin:5px 0; font-size:13px; color:#64748B;">Período: ${des} al ${has}</p>
      </div>
      <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px;">
        <p style="margin:0; font-size:14px;"><strong>${e.nom}</strong></p>
        <p style="margin:5px 0 0; font-size:12px; color:#64748B;">Cédula: ${e.ced}</p>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Salario Base (${dias} días)</td><td style="text-align:right;">${fmt(sp)}</td></tr>
        ${mh > 0 ? `<tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Horas Extras (${hex}h)</td><td style="text-align:right;">${fmt(mh)}</td></tr>` : ''}
        <tr style="font-weight:bold;"><td style="padding:10px 0;">TOTAL BRUTO</td><td style="text-align:right;">${fmt(br)}</td></tr>
        <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">C.C.S.S.</td><td style="text-align:right; color:#ef4444;">-${fmt(ob)}</td></tr>
        ${rt > 0 ? `<tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Renta</td><td style="text-align:right; color:#ef4444;">-${fmt(rt)}</td></tr>` : ''}
        ${pr > 0 ? `<tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Pensión Alimenticia</td><td style="text-align:right; color:#ef4444;">-${fmt(pr)}</td></tr>` : ''}
      </table>
      <div style="background:#0F172A; color:#fff; padding:20px; border-radius:10px; text-align:center; margin-top:20px;">
        <p style="margin:0; font-size:12px; text-transform:uppercase; opacity:0.8;">Neto a Percibir</p>
        <p style="margin:5px 0 0; font-size:24px; font-weight:bold;">${fmt(net)}</p>
      </div>
      <p style="font-size:10px; color:#94a3b8; margin-top:20px; text-align:center;">Este es un comprobante de pago generado automáticamente por CIARGUESA RH Suite.</p>
    </div>`;
}

async function sendOneBol() {
  const ced = document.getElementById('bol-emp').value;
  const e = emps.find(x => x.ced === ced);
  if (!e || !e.mail) { toast('El empleado no tiene correo registrado', 'err'); return; }
  
  const smtp = JSON.parse(localStorage.getItem('cg_smtp') || '{}');
  if (!smtp.host) { toast('Configure el SMTP primero', 'err'); return; }

  const des = document.getElementById('bol-des').value, has = document.getElementById('bol-has').value;
  const hex = parseFloat(document.getElementById('bol-hex').value || 0), ot = parseFloat(document.getElementById('bol-ot').value || 0);
  const dias = parseInt(document.getElementById('bol-dias').value) || 15;

  const html = getBolHTML(e, des, has, hex, ot, dias);

  toast('Enviando boleta...');
  try {
    const r = await fetch('http://localhost:3001/api/mail/send-boleta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp, to: e.mail, employeeName: e.nom, html })
    });
    const res = await r.json();
    if (res.success) toast('Boleta enviada correctamente');
    else toast('Error enviando correo: ' + res.message, 'err');
  } catch (e) {
    toast('Error conectando al servidor', 'err');
  }
}

function genMass() {
  const tipo = document.getElementById('bol-m-tipo').value;
  const des = document.getElementById('bol-m-des').value, has = document.getElementById('bol-m-has').value;
  const dias = parseInt(document.getElementById('bol-m-dias').value) || 15;
  const filtered = emps.filter(e => e.tp === tipo);
  
  if (!filtered.length) { toast('No hay empleados de tipo ' + tipo, 'err'); return; }
  
  const tb = document.getElementById('tb-bol-m');
  tb.innerHTML = filtered.map(e => {
    const sm = parseFloat(e.sal), sp = (sm / 30) * dias;
    const hex = hexs.filter(h => h.emp === e.ced && h.est === 'aprobado' && h.fec >= des && h.fec <= has).reduce((s, h) => s + parseFloat(h.h || 0), 0);
    const mh = hex * (sm / 240) * 1.5;
    const br = sp + mh, ob = br * TO;
    const baseMensual = (br - ob) * (30 / dias);
    const rt = renta(baseMensual, e.hijos, e.cony) * (dias / 30), net = br - ob - rt - (e.pres || 0);
    return `<tr id="row-${e.ced}"><td><strong>${e.nom}</strong><br><small>${e.mail || 'Sin correo'}</small></td><td>${fmt(br)}</td><td>${fmt(net)}</td><td class="st">Pendiente</td></tr>`;
  }).join('');
  
  document.getElementById('bol-m-res').style.display = 'block';
  toast('Generadas ' + filtered.length + ' boletas');
}

async function sendMass() {
  const tipo = document.getElementById('bol-m-tipo').value;
  const filtered = emps.filter(e => e.tp === tipo && e.mail);
  const smtp = JSON.parse(localStorage.getItem('cg_smtp') || '{}');
  if (!smtp.host) { toast('Configure el SMTP primero', 'err'); return; }
  
  const des = document.getElementById('bol-m-des').value, has = document.getElementById('bol-m-has').value;
  const dias = parseInt(document.getElementById('bol-m-dias').value) || 15;

  toast('Iniciando envío masivo...');
  for (let e of filtered) {
    const row = document.getElementById('row-' + e.ced);
    if (!row) continue;
    row.querySelector('.st').innerHTML = '<i class="ti ti-loader animate-spin"></i> Enviando...';
    
    const hex = hexs.filter(h => h.emp === e.ced && h.est === 'aprobado' && h.fec >= des && h.fec <= has).reduce((s, h) => s + parseFloat(h.h || 0), 0);
    const html = getBolHTML(e, des, has, hex, 0, dias);
    
    try {
      const r = await fetch('http://localhost:3001/api/mail/send-boleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp, to: e.mail, employeeName: e.nom, html })
      });
      const res = await r.json();
      if (res.success) row.querySelector('.st').innerHTML = '<span style="color:var(--success);">Enviado</span>';
      else row.querySelector('.st').innerHTML = '<span style="color:var(--danger);">Error</span>';
    } catch (e) {
      row.querySelector('.st').innerHTML = '<span style="color:var(--danger);">Error conexión</span>';
    }
  }
  toast('Envío masivo completado');
}

function printBol() {
  const c = document.getElementById('bol-prev').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Boleta — CIARGUESA</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root { --primary: #0F172A; --accent: #C29947; --text-muted: #64748B; --border: #E2E8F0; }
      body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; background: #fff; }
      .boleta { max-width: 800px; margin: 0 auto; color: #1e293b; }
      .bol-h { display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 20px; margin-bottom: 24px; }
      .bt { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      .bt th { background: #f8fafc; color: var(--primary); padding: 10px; text-align: left; border-bottom: 1px solid var(--border); }
      .bt td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
      .bt .tr { font-weight: 700; background: #f8fafc; }
      .bneto { background: var(--primary); color: #fff; padding: 25px; border-radius: 12px; text-align: center; margin-top: 24px; }
      @media print { body { padding: 0; } .boleta { max-width: 100%; } }
    </style></head><body>${c}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// function initCC() { const hoy = new Date(); document.getElementById('cc-mes').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`; }

/*
function genCCSS() {
  const tipo = document.getElementById('cc-tipo').value.toLowerCase();
  const filteredEmps = emps.filter(e => e.tp === tipo);
  if (!filteredEmps.length) { toast('Sin empleados de tipo ' + tipo, 'err'); return; }
  const mes = document.getElementById('cc-mes').value, patrono = document.getElementById('cc-pat').value;
  let tb = 0, tp = 0, to = 0;
  const rows = filteredEmps.map(e => {
    const sal = parseFloat(e.sal), pat = sal * TP, ob = sal * TO; tb += sal; tp += pat; to += ob;
    return `<tr><td>${e.ced}</td><td>${e.nom}</td><td>${e.ase || '—'}</td><td style="text-align:right;">${fmt(sal)}</td><td style="text-align:right;color:#BA7517;">${fmt(pat)}</td><td style="text-align:right;color:#185FA5;">${fmt(ob)}</td><td style="text-align:right;font-weight:500;">${fmt(pat + ob)}</td></tr>`;
  }).join('');
  document.getElementById('cc-rpt-body').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 16px;padding:12px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);">
      <div><div style="font-size:11px;color:var(--color-text-tertiary);">N° patrono</div><div style="font-weight:500;">${patrono}</div></div>
      <div><div style="font-size:11px;color:var(--color-text-tertiary);">Período</div><div style="font-weight:500;">${mes}</div></div>
      <div><div style="font-size:11px;color:var(--color-text-tertiary);">Trabajadores</div><div style="font-weight:500;">${filteredEmps.length}</div></div>
    </div>
    <div style="overflow-x:auto;"><table><thead><tr><th>Cédula</th><th>Nombre</th><th>N° asegurado</th><th style="text-align:right;">Salario</th><th style="text-align:right;">Patronal 26.83%</th><th style="text-align:right;">Obrero 10.83%</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3">Totales</td><td style="text-align:right;">${fmt(tb)}</td><td style="text-align:right;color:#BA7517;">${fmt(tp)}</td><td style="text-align:right;color:#185FA5;">${fmt(to)}</td><td style="text-align:right;color:#3B6D11;">${fmt(tp + to)}</td></tr></tfoot></table></div>`;
  document.getElementById('cc-rpt').style.display = 'block';
  toast('Reporte CCSS generado'); log('Reporte CCSS — ' + mes);
}
*/

/*
function exportCCSS() {
  const tipo = document.getElementById('cc-tipo').value.toLowerCase();
  const filteredEmps = emps.filter(e => e.tp === tipo);
  if (!filteredEmps.length) { toast('Sin empleados de tipo ' + tipo, 'err'); return; }
  const p = document.getElementById('cc-pat').value;
  let csv = 'Patrono,Cédula,N°Asegurado,Nombre,Salario,Cuota Patronal,Cuota Obrera\n';
  filteredEmps.forEach(e => { const s = parseFloat(e.sal); csv += `"${p}","${e.ced}","${e.ase || ''}","${e.nom}","${s.toFixed(0)}","${(s * TP).toFixed(0)}","${(s * TO).toFixed(0)}"\n`; });
  const b = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'SICERE_CIARGUESA.csv'; a.click();
  toast('Archivo SICERE exportado');
}
*/

function init() {
  renderEmps(emps); renderHex(); renderVacs(); renderAus(); renderIncs(); updDash(); initP(); /* initCC(); */ syncSels();
  if (!emps.length) {
    [{ ced: '1-0123-4567', nom: 'Carlos Rodríguez Mora', sal: 450000, pue: 'Oficial de Seguridad', dep: 'Operaciones', tp: 'quincenal', jor: 'nocturna', ing: '2023-01-15', mail: 'c.rodriguez@ciarguesa.com', ase: '123456789' },
    { ced: '2-0456-7890', nom: 'María González Vargas', sal: 680000, pue: 'Supervisora de Turno', dep: 'Supervisión', tp: 'quincenal', jor: 'diurna', ing: '2021-06-01', mail: 'm.gonzalez@ciarguesa.com', ase: '987654321' },
    { ced: '3-0789-1234', nom: 'Luis Jiménez Castro', sal: 420000, pue: 'Oficial de Seguridad', dep: 'Operaciones', tp: 'semanal', jor: 'diurna', ing: '2024-03-10', mail: 'l.jimenez@ciarguesa.com', ase: '456789123' },
    { ced: '1-0987-6543', nom: 'Ana Solano Pérez', sal: 550000, pue: 'Asistente Administrativa', dep: 'Administrativo', tp: 'quincenal', jor: 'diurna', ing: '2022-09-20', mail: 'a.solano@ciarguesa.com', ase: '321654987' }
    ].forEach(d => emps.push(d)); sv(); renderEmps(emps); updDash(); syncSels();
    log('Sistema iniciado con datos de demostración');
  }
}
init();
