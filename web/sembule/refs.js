// Shared money helpers: numbering, formatting, finance settings, printable documents.
import { withTimeout } from './utils.js';
import { CONFIG } from './config.js';
import { escapeHTML as e } from './utils.js';

// Company details printed on documents. Starts from config, replaced by the Settings row once loaded.
export const COMPANY = { legalName: CONFIG.legalName, phone: CONFIG.phone, website: CONFIG.website, email: '', address: '', tin: '', registration_no: '' };
export async function loadCompany(client) {
  try {
    const { data } = await withTimeout(client.from('settings').select('*').maybeSingle());
    if (data) Object.assign(COMPANY, { legalName: data.company_name || COMPANY.legalName, phone: data.phone || COMPANY.phone, website: data.website || COMPANY.website, email: data.email || '', address: data.address || '', tin: data.tin || '', registration_no: data.registration_no || '' });
  } catch { /* keep config defaults */ }
  return COMPANY;
}

export const money = (n, cur = 'UGX') => `${cur} ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: cur === 'USD' ? 2 : 0, maximumFractionDigits: cur === 'USD' ? 2 : 0 })}`;
export const num = v => (v === '' || v == null) ? null : Number(v);
export const txt = v => (v == null ? '' : String(v).trim()) || null;
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso, d) => { const x = new Date(iso); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
export const readable = d => d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Kampala' }).format(new Date(d)) : '';

// Next reference like SMQ-2026-004. Callers retry on a unique clash.
export async function nextRefs(client, table, column, prefix) {
  const year = new Date().getFullYear();
  const { data, error } = await withTimeout(client.from(table).select(column).like(column, `${prefix}-${year}-%`));
  if (error) throw new Error(error.message);
  const max = (data || []).reduce((m, r) => Math.max(m, Number(String(r[column]).split('-')[2]) || 0), 0);
  return n => `${prefix}-${year}-${String(max + 1 + n).padStart(3, '0')}`;
}
export async function insertWithRef(client, table, column, prefix, values) {
  const ref = await nextRefs(client, table, column, prefix);
  for (let i = 0; i < 5; i++) {
    const { data, error } = await withTimeout(client.from(table).insert({ ...values, [column]: ref(i) }).select().single());
    if (!error) return data;
    if (!/duplicate|unique/i.test(error.message) || i === 4) throw new Error(error.message);
  }
}
export async function financeSettings(client) {
  const { data, error } = await withTimeout(client.from('finance_settings').select('*').eq('id', true).maybeSingle());
  if (error) throw new Error(error.message);
  return data || { booking_percent: 40, preproduction_percent: 40, completion_percent: 20, quote_valid_days: 14 };
}
export function payDetails(fs) {
  return [fs.bank_details, fs.momo_details, fs.airtel_details].filter(Boolean).map(x => `<p>${e(x)}</p>`).join('') || '<p>[Payment details to be added in Quotes, Quote settings]</p>';
}
export function whatsappTo(phone, message) {
  const p = String(phone || '').replace(/\D/g, '').replace(/^0/, '256');
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(message)}`, '_blank');
}

// Branded document (quote, invoice, receipt) in its own window, with Download PDF, Share and Print.
// Follows the Sembule brand guide: black and deep green, gold accents, Axiforma.
export function printDocument({ title, heading, reference, metaLines = [], party = {}, partyLabel = 'BILL TO', body, notify, filename }) {
  const asset = p => new URL(p, location.href).href;
  const w = window.open('', '_blank');
  if (!w) { notify?.('Allow pop-ups to open the document.'); return; }
  const file = (filename || `${reference} ${party.organisation || party.name || ''}`).trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') + '.pdf';
  w.document.write(documentHTML({ asset, title, heading, reference, metaLines, party, partyLabel, body, file }));
  w.document.close();
}
export function documentHTML({ asset, title, heading, reference, metaLines, party, partyLabel, body, file }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} | ${e(CONFIG.name)}</title><style>
   @font-face{font-family:Axiforma;src:url(${asset('./assets/fonts/Axiforma-Regular.ttf')})}
   @font-face{font-family:Axiforma;font-weight:600;src:url(${asset('./assets/fonts/Axiforma-SemiBold.ttf')})}
   @font-face{font-family:Axiforma;font-weight:700;src:url(${asset('./assets/fonts/Axiforma-Bold.ttf')})}
   :root{--g:#04592A;--gold:#BF9000;--k:#0b0b0b}
   *{box-sizing:border-box}body{margin:0;background:#e9ece9;font-family:Axiforma,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
   .bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:12px;background:#0b0b0b}
   .bar button{font:600 13px Axiforma,sans-serif;border:0;border-radius:8px;padding:12px 18px;cursor:pointer;min-height:44px}
   .bar .pri{background:var(--gold);color:#000}.bar .sec{background:#1f2a22;color:#fff}
   .page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;position:relative;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.18);display:flex;flex-direction:column}
   .top{overflow:hidden;background:linear-gradient(120deg,#0b0b0b 0%,#0b0b0b 55%,#04592A 140%);color:#fff;padding:34px 44px 30px;position:relative}
   .top:after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,var(--gold),#e2b93b 40%,var(--g))}
   .mark{position:absolute;right:-60px;top:-50px;width:260px;opacity:.10}
   .toprow{display:flex;justify-content:space-between;align-items:flex-start;position:relative}
   .logo{width:210px;display:block}.tag{font-size:7.5px;letter-spacing:3.2px;color:var(--gold);margin-top:10px}
   .doc{text-align:right}.doc h1{margin:0;font-size:30px;letter-spacing:5px;font-weight:700;color:var(--gold)}.doc .ref{font-size:13px;font-weight:600;margin-top:6px}.doc .m{font-size:10.5px;opacity:.8;margin-top:4px}
   .inner{padding:30px 44px 20px;flex:1}
   .parties{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:26px}.parties h3,.box h3{font-size:8.5px;letter-spacing:2.4px;color:var(--gold);margin:0 0 8px;font-weight:700}
   .parties .who{font-size:14px;font-weight:600;margin-bottom:3px}.parties p{margin:0;font-size:11px;line-height:1.7;color:#333}.parties .right{text-align:right}
   table{width:100%;border-collapse:collapse;font-size:11px}thead th{background:var(--g);color:#fff;text-align:left;padding:10px 12px;font-size:9px;letter-spacing:1.4px;font-weight:600}
   thead th:first-child{border-radius:6px 0 0 6px}thead th:last-child{border-radius:0 6px 6px 0}
   tbody td{padding:11px 12px;border-bottom:1px solid #e6e6e6;vertical-align:top}tbody tr:nth-child(even) td{background:#f7f9f7}td small{display:block;color:#666;font-size:9.5px;margin-top:3px;line-height:1.5}
   .num{text-align:right;white-space:nowrap}
   .totals{display:flex;justify-content:flex-end;margin-top:14px}.totals table{width:300px}.totals td{padding:7px 12px;border:0;background:none!important}
   .totals .grand td{background:var(--k)!important;color:#fff;font-weight:700;font-size:14px;padding:13px 12px}.totals .grand td:first-child{border-radius:6px 0 0 6px}.totals .grand td:last-child{border-radius:0 6px 6px 0;color:var(--gold)}
   .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:24px}.box{border:1px solid #e3e3e3;border-top:3px solid var(--g);border-radius:8px;padding:14px 16px}.box.gold{border-top-color:var(--gold)}
   .box p{margin:0 0 6px;font-size:10.5px;line-height:1.65;white-space:pre-line}.box strong{color:var(--g)}
   .stamp{display:inline-block;margin-top:22px;border:2px solid var(--g);color:var(--g);padding:8px 18px;border-radius:6px;font-weight:700;letter-spacing:3px;font-size:13px;transform:rotate(-3deg)}
   .foot{background:#0b0b0b;color:#cfcfcf;padding:16px 44px;font-size:10px;letter-spacing:.2px;display:flex;justify-content:space-between;align-items:center;gap:10px}.foot b{color:var(--gold);letter-spacing:2.6px;font-size:8.5px}
   @page{size:A4;margin:0}@media print{body{background:#fff}.bar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:100vh}}
   @media(max-width:820px){.page{width:100%;margin:0;min-height:auto}.top,.inner,.foot{padding-left:20px;padding-right:20px}.logo{width:150px}.doc h1{font-size:22px}.parties,.grid{grid-template-columns:1fr}.parties .right{text-align:left}.totals table{width:100%}table{font-size:10px}thead th,tbody td{padding:9px 6px}thead th{letter-spacing:.6px}.foot{flex-direction:column;align-items:flex-start}}
  </style></head><body>
  <div class="bar"><button class="pri" id="dl">Download PDF</button><button class="sec" id="sh">Share</button><button class="sec" id="pr">Print</button></div>
  <div class="page" id="doc">
   <div class="top"><img class="mark" src="${asset('./assets/brand/mark-gold.png')}" alt=""><div class="toprow"><div><img class="logo" src="${asset('./assets/brand/logo-white.png')}" alt="${e(CONFIG.name)}"></div>
    <div class="doc"><h1>${e(heading)}</h1><div class="ref">${e(reference)}</div>${metaLines.map(l => `<div class="m">${l}</div>`).join('')}</div></div></div>
   <div class="inner"><div class="parties"><div><h3>${e(partyLabel)}</h3><div class="who">${e(party.organisation || party.name || '')}</div><p>${party.organisation && party.name ? e(party.name) + '<br>' : ''}${e(party.phone || '')}${party.email ? '<br>' + e(party.email) : ''}</p></div>
    <div class="right"><h3>FROM</h3><div class="who">${e(COMPANY.legalName)}</div><p>${COMPANY.address ? e(COMPANY.address) + '<br>' : ''}${e(COMPANY.phone)}${COMPANY.email ? '<br>' + e(COMPANY.email) : ''}<br>${e(COMPANY.website)}${COMPANY.tin ? '<br>TIN ' + e(COMPANY.tin) : ''}</p></div></div>
    ${body}</div>
   <div class="foot"><span>${e(COMPANY.legalName)} · ${e(COMPANY.phone)} · ${e(COMPANY.website)}${COMPANY.registration_no ? ' · Reg. ' + e(COMPANY.registration_no) : ''}</span><b>THE GIANTS OF MULTIMEDIA</b></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js"><\/script>
  <script>
   const FILE=${JSON.stringify(file)};
   const opts=()=>({margin:0,filename:FILE,image:{type:'jpeg',quality:0.96},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}});
   const el=()=>{const d=document.getElementById('doc').cloneNode(true);d.style.cssText='width:210mm;margin:0;box-shadow:none;min-height:297mm';return d};
   const ready=()=>window.html2pdf?Promise.resolve():new Promise((r,j)=>{let n=0;const t=setInterval(()=>{if(window.html2pdf){clearInterval(t);r()}else if(++n>50){clearInterval(t);j()}},100)});
   const busy=(b,t)=>{b.disabled=!!t;if(t){b.dataset.l=b.textContent;b.textContent=t}else b.textContent=b.dataset.l};
   document.getElementById('pr').onclick=()=>window.print();
   document.getElementById('dl').onclick=async e=>{const b=e.target;busy(b,'Preparing…');try{await ready();await html2pdf().set(opts()).from(el()).save()}catch(x){alert('PDF could not be created here. Use Print and choose Save as PDF.')}busy(b)};
   document.getElementById('sh').onclick=async e=>{const b=e.target;busy(b,'Preparing…');try{await ready();const blob=await html2pdf().set(opts()).from(el()).outputPdf('blob');const f=new File([blob],FILE,{type:'application/pdf'});
     if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:FILE})}else{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=FILE;a.click();alert('Sharing works from a phone. The PDF has been downloaded instead, attach it in WhatsApp or email.')}}catch(x){if(x&&x.name!=='AbortError')alert('Could not share. Use Download PDF instead.')}busy(b)};
  <\/script></body></html>`;
}
