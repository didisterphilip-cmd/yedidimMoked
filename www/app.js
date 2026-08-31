/* ============================================================
   מוקד ארצי — טופס קריאה + יצירת הודעות
   ============================================================ */

const STORAGE_KEY = 'moked_operator_v1';

/* ---- Operator (מוקדן) details ---- */
function loadOperator() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
  catch (e) { return null; }
}
function saveOperator(op) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(op));
}

let operator = loadOperator();

/* ---- Screen switching ---- */
const setupScreen = document.getElementById('setupScreen');
const mainScreen  = document.getElementById('mainScreen');

function showSetup() {
  setupScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
  if (operator) {
    document.getElementById('setupOpNum').value = operator.opNum || '';
    document.getElementById('setupName').value  = operator.name  || '';
  }
}
function showMain() {
  setupScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  document.getElementById('opLine').textContent =
    (operator ? (operator.name + ' · מוקדן ' + operator.opNum) : '');
  buildMessages();
}

function openSetup() { showSetup(); }

function saveSetup() {
  const opNum = document.getElementById('setupOpNum').value.trim();
  const name  = document.getElementById('setupName').value.trim();
  if (!opNum) { toast('נא למלא מספר מוקדן'); document.getElementById('setupOpNum').focus(); return; }
  if (!name)  { toast('נא למלא שם מלא');    document.getElementById('setupName').focus();  return; }
  operator = { opNum, name };
  saveOperator(operator);
  showMain();
}

/* ---- Read call form ---- */
function val(id) { return document.getElementById(id).value.trim(); }

function getCall() {
  return {
    callerName:  val('f_callerName'),
    callerPhone: val('f_callerPhone'),
    region:      val('f_region'),
    address:     val('f_address'),
    vehicle:     val('f_vehicle'),
    assist:      val('f_assist'),
    notes:       val('f_notes'),
    maps:        val('f_maps'),
  };
}

/* ---- Build the three messages (raw text kept for copying) ---- */
function buildMessages() {
  const c = getCall();
  const op = operator || { opNum: '', name: '' };

  // Message 1
  const l1 = [];
  l1.push('*מוקד ארצי מרחב ' + c.region + '*');
  if (c.address) l1.push(c.address);
  if (c.vehicle) l1.push(c.vehicle);
  if (c.assist)  l1.push('*' + c.assist + '*');
  if (c.notes)   l1.push(c.notes);
  const msg1 = l1.join('\n');

  // Message 2
  let line1 = c.callerName;
  if (c.callerPhone) line1 = line1 ? (line1 + ', ' + c.callerPhone) : c.callerPhone;
  const msg2 = [line1, op.opNum].filter(function (x) { return x !== ''; }).join('\n');

  // Message 3
  const msg3 = c.maps;

  renderMsg('msg1', msg1);
  renderMsg('msg2', msg2);
  renderMsg('msg3', msg3);
}

/* Render with *bold* -> bold, links clickable; store raw text on element */
function renderMsg(id, raw) {
  const el = document.getElementById(id);
  el.dataset.raw = raw;
  if (!raw) {
    el.innerHTML = '<span class="empty-hint">מלא את השדות למעלה כדי לראות את ההודעה</span>';
    return;
  }
  let html = escapeHtml(raw);
  // *bold*
  html = html.replace(/\*([^*\n]+)\*/g, '<span class="b">$1</span>');
  // links
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  html = html.replace(/\n/g, '<br>');
  el.innerHTML = html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---- Copy ---- */
async function copyText(text) {
  // Capacitor Clipboard (native app)
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Clipboard) {
      await window.Capacitor.Plugins.Clipboard.write({ string: text });
      return true;
    }
  } catch (e) { /* fall through */ }
  // Browser async clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through */ }
  // Legacy fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

function bindCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const el = document.getElementById(btn.dataset.target);
      const raw = el.dataset.raw || '';
      if (!raw) { toast('אין מה להעתיק — מלא קודם את השדות'); return; }
      const ok = await copyText(raw);
      if (ok) {
        btn.classList.add('copied');
        const original = btn.innerHTML;
        btn.innerHTML = '✓ הועתק';
        toast('ההודעה הועתקה');
        setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = original; }, 1600);
      } else {
        toast('ההעתקה נכשלה');
      }
    });
  });
}

/* ---- Clear / new call ---- */
function clearCall() {
  ['f_callerName','f_callerPhone','f_region','f_address','f_vehicle','f_assist','f_notes','f_maps']
    .forEach(function (id) { document.getElementById(id).value = ''; });
  buildMessages();
  document.getElementById('f_callerName').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- Toast ---- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
}

/* ---- Live update messages while typing ---- */
['f_callerName','f_callerPhone','f_region','f_address','f_vehicle','f_assist','f_notes','f_maps']
  .forEach(function (id) {
    document.getElementById(id).addEventListener('input', buildMessages);
  });

/* ---- Init ---- */
bindCopyButtons();
if (operator) { showMain(); } else { showSetup(); }
