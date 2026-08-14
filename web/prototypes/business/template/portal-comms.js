/* ═══════════════════════════════════════════════════════════════════
   CHARISОС — CLIENT PORTAL WORKFLOW
   portal-comms.js  v2

   Stage indices match the LIVE CharisOS STAGES array (0-indexed):
   0  Inquiry          5  Shoot Planning
   1  Quotation Sent   6  Shoot Day
   2  Booking Confirmed  7  Data Backup
   3  Deposit Paid     8  Editing
   4  Contract Signed  9  Review & Revisions
                       10 Delivered

   Project fields used: p.status, p.client, p.phone,
                        p.portalToken, p.shootDate,
                        p.galleryLink, p.ref, p.eventType
═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   STAGE NAMES (must match live STAGES array exactly)
───────────────────────────────────────────────────────────── */
var _PC_STAGES = [
  'Inquiry', 'Quotation Sent', 'Booking Confirmed', 'Deposit Paid',
  'Contract Signed', 'Shoot Planning', 'Shoot Day', 'Data Backup',
  'Editing', 'Review & Revisions', 'Delivered'
];

/* Key stages that get WhatsApp notify buttons */
var _PC_KEY_STAGES = [2, 3, 6, 8, 10];

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

function _pcFirstName(proj) {
  return ((proj.client || 'there').split(' ')[0]) || 'there';
}

function _pcPortalUrl(proj) {
  return proj.portalToken
    ? 'https://chariscreationsltd.com/client-portal/?token=' + proj.portalToken
    : 'https://chariscreationsltd.com/client-portal/';
}

function _pcDateStr(proj) {
  if (!proj.shootDate) return '';
  try {
    var d = new Date(proj.shootDate + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  } catch(e) { return proj.shootDate; }
}

function _pcStageNum(stageName) {
  return _PC_STAGES.indexOf(stageName);
}

function _pcWhatsAppUrl(proj, msg) {
  var phone = (proj.phone || '').replace(/\D/g, '');
  if (!phone) return null;
  if (phone.charAt(0) === '0') phone = '256' + phone.slice(1);
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
}

function _pcHtmlEsc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────────────────────
   WHATSAPP MESSAGE TEMPLATES
   Keys = 0-indexed stage number (matches live STAGES array)
───────────────────────────────────────────────────────────── */
function _pcMsg(proj, stageIdx) {
  var n    = _pcFirstName(proj);
  var url  = _pcPortalUrl(proj);
  var date = _pcDateStr(proj);
  var gal  = proj.galleryLink || '';
  var ref  = proj.ref  || '';

  var msgs = {

    /* 2 — Booking Confirmed */
    2: 'Hi ' + n + '! \uD83C\uDF89\n\n'
     + 'Your booking with Charis Creations is *confirmed*. '
     + (date ? 'Your date is officially locked in for *' + date + '*. ' : 'Your date is locked in. ')
     + 'We are so excited to work with you!\n\n'
     + 'Track your project progress here:\n'
     + url + '\n\n'
     + 'If you have any questions, just reply here. \uD83D\uDE4C\n\n'
     + '\u2014 Charis Creations',

    /* 3 — Deposit Paid */
    3: 'Hi ' + n + '! \uD83D\uDE4F\n\n'
     + 'We have received your deposit \u2014 thank you!\n\n'
     + 'Your project (' + ref + ') is now officially underway. '
     + 'You can track everything including your payment balance here:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 4 — Contract Signed */
    4: 'Hi ' + n + '!\n\n'
     + 'Your contract is signed and everything is set. \u2705 '
     + 'We are fully committed to creating something incredible for you.\n\n'
     + 'Track your project here:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 5 — Shoot Planning */
    5: 'Hi ' + n + '!\n\n'
     + 'Our team is in *shoot planning mode* \u2014 building your shot list, '
     + 'assigning crew, and confirming all the details. \uD83D\uDCCB\n\n'
     + (date ? 'We are getting everything ready for ' + date + '. ' : '')
     + 'Track your project here:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 6 — Shoot Day */
    6: 'Hi ' + n + '! \uD83C\uDFAC\n\n'
     + '*Today is your day!* Our team is fully prepared and on the way. '
     + 'If you have any last-minute details, call us now.\n\n'
     + 'Track your project:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 7 — Data Backup */
    7: 'Hi ' + n + '!\n\n'
     + 'We are home safe. \u2705 All your footage and photos have been backed up '
     + 'across multiple drives \u2014 your memories are fully secured.\n\n'
     + 'We move to editing next. Track progress:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 8 — Editing */
    8: 'Hi ' + n + '! \u2702\uFE0F\n\n'
     + 'Your footage is now *in editing*. Our team is carefully crafting '
     + 'your story \u2014 colour grading, trimming, and perfecting every frame.\n\n'
     + 'We will notify you the moment it is ready. Track progress here:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 9 — Review & Revisions */
    9: 'Hi ' + n + '! \uD83D\uDC40\n\n'
     + 'Your project is in the *final review stage*. We are doing one last '
     + 'quality check before delivery.\n\n'
     + 'We will send you the final work very soon. Track here:\n'
     + url + '\n\n'
     + '\u2014 Charis Creations',

    /* 10 — Delivered */
    10: 'Hi ' + n + '! \uD83C\uDF8A\n\n'
      + 'Your project is *complete and ready*!\n\n'
      + (gal ? '\uD83D\uDCF8 *View your photos and videos here:*\n' + gal + '\n\n' : '')
      + 'You can also access your project portal, view your invoice, '
      + 'and leave us a review here:\n'
      + url + '\n\n'
      + 'It was an absolute honour to tell your story. '
      + 'Thank you for trusting Charis Creations. \uD83D\uDE4F\n\n'
      + '\u2014 Charis Creations'
  };

  return msgs[stageIdx] || null;
}

/* Custom message wrapper */
function _pcCustomMsg(proj, customText) {
  var n   = _pcFirstName(proj);
  var url = _pcPortalUrl(proj);
  return 'Hi ' + n + '!\n\n' + customText + '\n\nTrack your project: ' + url + '\n\n\u2014 Charis Creations';
}

/* ─────────────────────────────────────────────────────────────
   CLIENT TAB HTML RENDERER
   Call: _pcRenderClientTab(proj)
   Returns HTML string for the Client tab content.
───────────────────────────────────────────────────────────── */
function _pcRenderClientTab(proj) {
  proj = proj || {};
  var phone    = (proj.phone || '').replace(/\D/g, '');
  var hasPhone = phone.length >= 9;
  var hasToken = !!(proj.portalToken);
  var stageIdx = _pcStageNum(proj.status);
  var portalUrl= _pcPortalUrl(proj);

  /* Only show messages up to current stage + 1 */
  var relevant = _PC_KEY_STAGES.filter(function(s){ return s <= stageIdx + 1; });

  var S_LABELS = {
    2:  { icon:'\uD83C\uDF89', label:'Booking Confirmed',  col:'#f16623' },
    3:  { icon:'\uD83D\uDCB0', label:'Deposit Received',   col:'#22c55e' },
    4:  { icon:'\u2705',       label:'Contract Signed',    col:'#22c55e' },
    5:  { icon:'\uD83D\uDCCB', label:'Shoot Planning',     col:'#94a3b8' },
    6:  { icon:'\uD83C\uDFAC', label:'Shoot Day',          col:'#f16623' },
    7:  { icon:'\uD83D\uDCBE', label:'Backup Complete',    col:'#94a3b8' },
    8:  { icon:'\u2702\uFE0F', label:'Now In Editing',     col:'#a78bfa' },
    9:  { icon:'\uD83D\uDC40', label:'Review & Revisions', col:'#fbbf24' },
    10: { icon:'\uD83C\uDF8A', label:'Project Delivered',  col:'#22c55e' }
  };

  var h = '<div style="padding:16px 0;">';

  /* — No phone warning — */
  if (!hasPhone) {
    h += '<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:10px;padding:14px 16px;margin-bottom:16px;">'
       + '<div style="font-size:11px;font-weight:700;color:#fbbf24;margin-bottom:6px;">\u26A0 NO PHONE NUMBER</div>'
       + '<div style="font-size:13px;color:#94a3b8;">Add this client\'s phone number to enable WhatsApp updates.</div>'
       + '</div>';
  }

  /* ── PORTAL LINK ── */
  h += '<div style="background:var(--card2,#1e293b);border-radius:10px;padding:16px;margin-bottom:14px;">';
  h += '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-bottom:12px;">CLIENT PORTAL LINK</div>';

  if (hasToken) {
    h += '<div style="font-size:12px;color:#22c55e;font-weight:700;margin-bottom:10px;">\u2713 Portal link active</div>';
    h += '<div style="background:rgba(255,255,255,.04);border-radius:6px;padding:8px 10px;font-size:11px;'
       + 'color:#94a3b8;word-break:break-all;margin-bottom:12px;font-family:monospace;">' + _pcHtmlEsc(portalUrl) + '</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    /* Copy */
    h += '<button onclick="navigator.clipboard.writeText(\'' + _pcHtmlEsc(portalUrl) + '\');'
       + 'this.textContent=\'✓ Copied!\';setTimeout(function(){this.textContent=\'Copy Link\';}.bind(this),2000);" '
       + 'style="flex:1;min-width:90px;background:rgba(255,255,255,.07);border:none;color:#e2e8f0;padding:9px 10px;'
       + 'border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">Copy Link</button>';
    /* Preview */
    h += '<a href="' + _pcHtmlEsc(portalUrl) + '" target="_blank" '
       + 'style="flex:1;min-width:90px;background:rgba(241,102,35,.12);border:1px solid rgba(241,102,35,.2);'
       + 'color:#f16623;text-align:center;padding:9px 10px;border-radius:8px;font-size:12px;'
       + 'font-weight:600;text-decoration:none;">Preview</a>';
    /* Share via WhatsApp */
    if (hasPhone) {
      var shareMsg = 'Hi ' + _pcFirstName(proj) + '! Here is your Charis Creations project link: ' + portalUrl;
      var waShare  = _pcWhatsAppUrl(proj, shareMsg);
      h += '<a href="' + _pcHtmlEsc(waShare) + '" target="_blank" '
         + 'style="background:#25d366;color:#fff;text-align:center;padding:9px 14px;'
         + 'border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">\uD83D\uDCF2 Share</a>';
    }
    h += '</div>';
  } else {
    h += '<div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">'
       + 'No portal link yet. Generate one so ' + _pcHtmlEsc(_pcFirstName(proj)) + ' can track their project.</div>';
    h += '<button data-action="generatePortalToken" data-id="' + _pcHtmlEsc(proj.id||'') + '" '
       + 'style="width:100%;background:#f16623;color:#fff;border:none;padding:10px;'
       + 'border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">\uD83D\uDD17 Generate Portal Link</button>';
  }
  h += '</div>';

  /* ── WHATSAPP UPDATES ── */
  h += '<div style="background:var(--card2,#1e293b);border-radius:10px;padding:16px;margin-bottom:14px;">';
  h += '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-bottom:4px;">CLIENT UPDATES VIA WHATSAPP</div>';
  h += '<div style="font-size:12px;color:#64748b;margin-bottom:14px;">Pre-written messages for each key milestone. One tap opens WhatsApp with the message ready.</div>';

  if (!hasPhone) {
    h += '<div style="font-size:13px;color:#64748b;font-style:italic;">Add phone number to unlock.</div>';
  } else if (relevant.length === 0) {
    h += '<div style="font-size:13px;color:#64748b;font-style:italic;">No updates available at the current stage yet.</div>';
  } else {
    relevant.forEach(function(sIdx) {
      var info   = S_LABELS[sIdx] || { icon:'\uD83D\uDCCB', label:'Stage '+sIdx, col:'#94a3b8' };
      var msg    = _pcMsg(proj, sIdx);
      if (!msg) return;
      var waUrl  = _pcWhatsAppUrl(proj, msg);
      var isCur  = sIdx === stageIdx;

      h += '<div style="display:flex;align-items:center;justify-content:space-between;'
         + 'padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">';
      h += '<div style="display:flex;align-items:center;gap:10px;">';
      h += '<span style="font-size:18px;">' + info.icon + '</span>';
      h += '<div>';
      h += '<div style="font-size:13px;font-weight:600;color:#e2e8f0;">' + info.label + '</div>';
      if (isCur) {
        h += '<div style="font-size:10px;color:' + info.col + ';font-weight:700;letter-spacing:.05em;">CURRENT STAGE</div>';
      }
      h += '</div></div>';
      h += '<a href="' + _pcHtmlEsc(waUrl) + '" target="_blank" '
         + 'style="background:#25d366;color:#fff;padding:8px 14px;border-radius:8px;'
         + 'font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;">\uD83D\uDCAC Send</a>';
      h += '</div>';
    });

    /* Message preview */
    var previewIdx  = (stageIdx >= 0 && _pcMsg(proj, stageIdx)) ? stageIdx
                    : relevant[relevant.length - 1];
    var previewText = _pcMsg(proj, previewIdx);
    if (previewText) {
      h += '<div style="margin-top:12px;">';
      h += '<div style="font-size:11px;color:#475569;margin-bottom:6px;">Message preview for current stage:</div>';
      h += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);'
         + 'border-radius:8px;padding:12px;font-size:12px;color:#94a3b8;white-space:pre-wrap;'
         + 'max-height:130px;overflow-y:auto;line-height:1.6;">' + _pcHtmlEsc(previewText) + '</div>';
      h += '</div>';
    }
  }
  h += '</div>';

  /* ── CUSTOM MESSAGE ── */
  if (hasPhone) {
    /* Store proj ref so _pcSendCustom can use it */
    var projJson = _pcHtmlEsc(JSON.stringify({ id: proj.id, phone: proj.phone, client: proj.client, portalToken: proj.portalToken }));
    h += '<div style="background:var(--card2,#1e293b);border-radius:10px;padding:16px;margin-bottom:14px;">';
    h += '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-bottom:10px;">CUSTOM UPDATE</div>';
    h += '<textarea id="pc-custom-msg" placeholder="Type a custom message for '
       + _pcHtmlEsc(_pcFirstName(proj)) + '..." '
       + 'style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);'
       + 'border-radius:8px;color:#e2e8f0;font-family:inherit;font-size:13px;padding:10px;'
       + 'resize:none;height:76px;outline:none;margin-bottom:10px;box-sizing:border-box;"></textarea>';
    h += '<button onclick="_pcSendCustom(' + projJson + ')" '
       + 'style="width:100%;background:#25d366;color:#fff;border:none;padding:10px;'
       + 'border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">\uD83D\uDCAC Send Custom Message</button>';
    h += '</div>';
  }

  /* ── Gallery reminder if delivered but no link ── */
  if (stageIdx === 10 && !proj.galleryLink) {
    h += '<div style="background:rgba(241,102,35,.07);border:1px solid rgba(241,102,35,.2);'
       + 'border-radius:10px;padding:14px 16px;">';
    h += '<div style="font-size:12px;font-weight:700;color:#f16623;margin-bottom:6px;">\uD83D\uDCA1 ADD GALLERY LINK</div>';
    h += '<div style="font-size:13px;color:#94a3b8;">Project is delivered but has no gallery link. '
       + 'Add the SmugMug link so the delivery message includes it.</div>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

/* ─────────────────────────────────────────────────────────────
   NOTIFY BANNER  — shown after stage advance on key stages
   Call: _pcNotifyBannerHtml(proj, newStageIdx)
   Returns HTML string (empty string if stage is not a key stage)
───────────────────────────────────────────────────────────── */
function _pcNotifyBannerHtml(proj, newStageIdx) {
  if (_PC_KEY_STAGES.indexOf(newStageIdx) < 0) return '';
  var phone = (proj.phone || '').replace(/\D/g,'');
  if (!phone) return '';
  var msg  = _pcMsg(proj, newStageIdx);
  if (!msg) return '';
  var waUrl = _pcWhatsAppUrl(proj, msg);
  var lbl   = _PC_STAGES[newStageIdx] || ('Stage ' + newStageIdx);
  var n     = _pcFirstName(proj);

  return '<div id="pc-notify-banner" style="background:#1e3a1e;border:1px solid rgba(34,197,94,.3);'
       + 'border-radius:10px;padding:14px 16px;margin-bottom:14px;">'
       + '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#22c55e;margin-bottom:6px;">'
       + '\u2756 STAGE UPDATED \u2014 NOTIFY CLIENT?</div>'
       + '<div style="font-size:13px;color:#e2e8f0;margin-bottom:12px;">'
       + 'Send <strong>' + _pcHtmlEsc(n) + '</strong> an update: <em>' + _pcHtmlEsc(lbl) + '</em></div>'
       + '<div style="display:flex;gap:8px;">'
       + '<a href="' + _pcHtmlEsc(waUrl) + '" target="_blank" '
       + 'onclick="var b=document.getElementById(\'pc-notify-banner\');if(b)b.remove();" '
       + 'style="flex:1;background:#25d366;color:#fff;text-align:center;padding:10px;border-radius:8px;'
       + 'font-size:13px;font-weight:700;text-decoration:none;">\uD83D\uDCAC Send on WhatsApp</a>'
       + '<button onclick="var b=document.getElementById(\'pc-notify-banner\');if(b)b.remove();" '
       + 'style="background:rgba(255,255,255,.07);border:none;color:#94a3b8;padding:10px 14px;'
       + 'border-radius:8px;cursor:pointer;font-size:13px;">Later</button>'
       + '</div>'
       + '</div>';
}

/* ─────────────────────────────────────────────────────────────
   SEND CUSTOM MESSAGE
───────────────────────────────────────────────────────────── */
function _pcSendCustom(proj) {
  var ta  = document.getElementById('pc-custom-msg');
  var txt = ta ? ta.value.trim() : '';
  if (!txt) { alert('Please type a message first.'); return; }
  var url = _pcWhatsAppUrl(proj, _pcCustomMsg(proj, txt));
  if (url) window.open(url, '_blank');
}

/* ─────────────────────────────────────────────────────────────
   GENERATE PORTAL TOKEN (action handler helper)
   Call from CharisOS action handler:
     case 'generatePortalToken':
       _pcGenerateToken(proj); break;
───────────────────────────────────────────────────────────── */
function _pcGenerateToken(proj) {
  if (!proj || !proj.id) { console.warn('[PC] generatePortalToken: no project'); return; }
  if (proj.portalToken) {
    /* Already has a token — just confirm */
    if (typeof toast === 'function') toast('\u2713 Portal link already exists', 'info');
    return;
  }
  var token = 'ccp_' + proj.ref.replace(/[^a-z0-9]/gi,'').toLowerCase() + '_' + Date.now();
  /* Update in Supabase directly */
  SUPA.from('projects').update({ portal_token: token, portal_shared_at: null })
    .eq('id', proj.id)
    .then(function(res) {
      if (res.error) {
        if (typeof toast === 'function') toast('\u26A0 Could not save portal link \u2014 check connection', 'error');
        return;
      }
      /* Update in-memory PROJECTS array */
      var idx = PROJECTS.findIndex(function(x){ return x.id === proj.id; });
      if (idx >= 0) PROJECTS[idx].portalToken = token;
      if (S.selProj && S.selProj.id === proj.id) S.selProj.portalToken = token;
      if (typeof toast === 'function') toast('\u2713 Portal link ready \u2014 go to Client tab to share it', 'success');
      if (typeof render === 'function') render();
    });
}

/* Expose all functions globally */
window._pcRenderClientTab  = _pcRenderClientTab;
window._pcNotifyBannerHtml = _pcNotifyBannerHtml;
window._pcMsg              = _pcMsg;
window._pcSendCustom       = _pcSendCustom;
window._pcGenerateToken    = _pcGenerateToken;
window._pcStageNum         = _pcStageNum;
window._pcPortalUrl        = _pcPortalUrl;
