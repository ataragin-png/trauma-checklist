/**
 * צ'קליסט חדר טראומה — שרת נתונים (Google Apps Script)
 * --------------------------------------------------
 * האתר עצמו יושב ב-GitHub Pages ומדבר עם הסקריפט הזה. הנתונים נשמרים בגיליון שב-SHEET_ID.
 * 1. הרץ פעם אחת את setup (יוצר לשוניות, רשימת ציוד, קודים והתראה יומית).
 * 2. פריסה > פריסה חדשה > אפליקציית אינטרנט: הפעלה בתור "אני", גישה "כל אחד".
 */

const SHEET_ID = '1dg1sYid-MfXceeg4bV1Ay1WxlxmND8A3u6DZQisB8aI';
const SITE_URL = 'https://ataragin-png.github.io/trauma-checklist/';

const TZ = 'Asia/Jerusalem';
const SH = { items: 'ציוד', checks: 'בדיקות', issues: 'חוסרים ותקלות', settings: 'הגדרות' };
const TEAM_HE = { nurses: 'אחיות', volunteers: 'בנות שירות' };
const FREQ_HE = { daily: 'יומית', weekly: 'שבועית', monthly: 'חודשית' };
const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 31 };
const TYPE_HE = { missing: 'חסר', broken: 'תקול' };
const STATUS_OPEN = 'פתוח', STATUS_DONE = 'טופל';

const ITEM_HEADERS = ['מזהה', 'פריט', 'ארון / מיקום', 'מי בודק', 'תדירות', 'קריטי', 'כמות תקן'];
const CHECK_HEADERS = ['תאריך ושעה', 'צוות', 'תדירות', 'בודק/ת', 'מס׳ בעיות', 'מס׳ פריטים', 'הערות', 'פריטים עם בעיה'];
const ISSUE_HEADERS = ['מזהה', 'תאריך דיווח', 'פריט', 'ארון / מיקום', 'סוג', 'כמות תקן', 'נמצאו בפועל', 'להשלים',
  'דווח ע"י', 'צוות', 'הערה', 'סטטוס', 'תאריך טיפול', 'מזהה פריט'];

// [פריט, ארון, צוות, תדירות, קריטי]
const SEED = [
  ['דפיברילטור – בדיקה עצמית עברה, טעון, נייר הדפסה', 'עגלת החייאה', 'nurses', 'daily', true],
  ['מדבקות דפיברילציה מבוגר וילד', 'עגלת החייאה', 'nurses', 'daily', true],
  ['מוניטור – עובד, כבלי א.ק.ג, סטורציה ולחץ דם', 'עגלת החייאה', 'nurses', 'daily', true],
  ['ארגז תרופות החייאה – חתום ושלם', 'עגלת החייאה', 'nurses', 'daily', true],
  ['לרינגוסקופ ולהבים מק\'אינטוש 3–4 – אור תקין', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['וידאו-לרינגוסקופ – טעון ועובד', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['טובוסים 6.0–8.0, מוליך ובוז\'י', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['מסכות לרינגיאליות (LMA / i-gel) במידות', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['אמבו מבוגר וילד עם מסכות ו-PEEP', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['ערכת קריקותירוטומיה', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['קפנוגרף / EtCO2', 'עגלת נתיב אוויר', 'nurses', 'daily', true],
  ['סקשן קיר – יניקה עובדת, צנרת ויאנקאואר מחובר', 'עמדת המיטה', 'nurses', 'daily', true],
  ['חמצן קיר ובלון חמצן נייד מלא', 'עמדת המיטה', 'nurses', 'daily', true],
  ['מנשם נייד – בדיקה עצמית עברה', 'עמדת המיטה', 'nurses', 'daily', true],
  ['מחמם נוזלים / מערכת עירוי מהיר – עובד', 'ארון דימום ועירוי', 'nurses', 'daily', true],
  ['חוסמי עורקים (CAT) ×2', 'ארון דימום ועירוי', 'nurses', 'daily', true],
  ['מקדח IO – סוללה תקינה ומחטים במידות', 'ארון דימום ועירוי', 'nurses', 'daily', true],
  ['מקבע אגן (Pelvic binder)', 'ארון דימום ועירוי', 'nurses', 'daily', true],
  ['ערכת נקז חזה ומחט דקומפרסיה', 'ארון פרוצדורות', 'nurses', 'daily', true],
  ['אולטרסאונד FAST – טעון, ג\'ל ומתמר', 'ארון פרוצדורות', 'nurses', 'daily', false],
  ['צווארונים במידות', 'ארון פרוצדורות', 'nurses', 'daily', false],
  ['ונפלונים 14G–22G', 'מגירות עירוי', 'volunteers', 'weekly', false],
  ['סטים לעירוי ומחברים תלת-כיווניים', 'מגירות עירוי', 'volunteers', 'weekly', false],
  ['מזרקים ומחטים בכל המידות', 'מגירות עירוי', 'volunteers', 'weekly', false],
  ['מבחנות דם ופלסטרים לקיבוע', 'מגירות עירוי', 'volunteers', 'weekly', false],
  ['שקיות סליין והרטמן', 'מדף נוזלים', 'volunteers', 'weekly', false],
  ['שרוולי לחץ לעירוי', 'מדף נוזלים', 'volunteers', 'weekly', false],
  ['גזות, תחבושות ותחבושות לחץ', 'ארון חבישות', 'volunteers', 'weekly', false],
  ['מספריים לחיתוך בגדים', 'ארון חבישות', 'volunteers', 'weekly', false],
  ['שמיכות חימום', 'ארון חבישות', 'volunteers', 'weekly', false],
  ['כפפות בכל המידות', 'מיגון', 'volunteers', 'weekly', false],
  ['חלוקים, מסכות ומשקפי מגן', 'מיגון', 'volunteers', 'weekly', false],
  ['צנרות סקשן ויאנקאואר רזרביים', 'מלאי נתיב אוויר', 'volunteers', 'weekly', false],
  ['מסכות חמצן, משקפי חמצן ומסכות אינהלציה', 'מלאי נתיב אוויר', 'volunteers', 'weekly', false],
  ['תאריכי תפוגה – מגירות עירוי ונוזלים', 'בדיקת תפוגות', 'volunteers', 'monthly', false],
  ['תאריכי תפוגה – ערכות סטריליות (נקז, קריקו, IO)', 'בדיקת תפוגות', 'volunteers', 'monthly', false],
  ['תאריכי תפוגה – ציוד נתיב אוויר', 'בדיקת תפוגות', 'volunteers', 'monthly', false],
];

/* ---------------- JSON API for the GitHub Pages site ---------------- */

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.action) return json_({ ok: true, data: 'trauma-checklist API' });
  return handle_(p);
}

function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  return handle_(p);
}

function handle_(p) {
  try {
    let data;
    switch (p.action) {
      case 'getState': data = getState(p.mgrPin); break;
      case 'verifyPin': data = verifyPin(p.pin); break;
      case 'submitCheck': data = submitCheck(p); break;
      case 'resolveIssue': data = resolveIssue(p.mgrPin, p.id); break;
      default: throw new Error('פעולה לא מוכרת.');
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- setup (run once) ---------------- */

function setup() {
  const ss = ss_();
  ss.setSpreadsheetTimeZone(TZ);

  const items = sheet_(SH.items, ITEM_HEADERS);
  if (items.getLastRow() < 2) {
    const rows = SEED.map((r, i) => ['i' + ('0' + (i + 1)).slice(-2), r[0], r[1], TEAM_HE[r[2]], FREQ_HE[r[3]], r[4], '']);
    items.getRange(2, 1, rows.length, ITEM_HEADERS.length).setValues(rows);
  }
  const N = 500;
  items.getRange(2, 4, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(TEAM_HE)).setAllowInvalid(false).build());
  items.getRange(2, 5, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(FREQ_HE)).setAllowInvalid(false).build());
  items.getRange(2, 6, N, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  items.getRange(2, 7, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false)
    .setHelpText('כמות תקן: מספר שלם. השאר ריק אם לא רלוונטי.').build());
  items.getRange('A1').setNote('מזהה פנימי. נוצר אוטומטית לשורה חדשה, אין צורך למלא ואין לשנות.');
  items.setColumnWidth(1, 70).setColumnWidth(2, 360).setColumnWidth(3, 160).setColumnWidth(4, 110)
    .setColumnWidth(5, 90).setColumnWidth(6, 60).setColumnWidth(7, 90);
  items.getRange('A2:A').setFontColor('#8a969c');

  const checks = sheet_(SH.checks, CHECK_HEADERS);
  checks.getRange('A2:A').setNumberFormat('dd/MM/yyyy HH:mm');
  checks.setColumnWidth(1, 130).setColumnWidth(4, 140).setColumnWidth(7, 260).setColumnWidth(8, 360);

  const issues = sheet_(SH.issues, ISSUE_HEADERS);
  issues.getRange('B2:B').setNumberFormat('dd/MM/yyyy HH:mm');
  issues.getRange('M2:M').setNumberFormat('dd/MM/yyyy HH:mm');
  issues.getRange(2, 12, N * 4, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([STATUS_OPEN, STATUS_DONE]).setAllowInvalid(false).build());
  issues.setColumnWidth(3, 300).setColumnWidth(11, 220);
  const rules = issues.getConditionalFormatRules().concat([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$L2="' + STATUS_OPEN + '"')
      .setBackground('#fbe3e3').setRanges([issues.getRange('A2:N')]).build(),
  ]);
  issues.setConditionalFormatRules(rules);

  let st = ss.getSheetByName(SH.settings);
  if (!st) {
    st = ss.insertSheet(SH.settings);
    st.setRightToLeft(true);
    const staff = String(Math.floor(1000 + Math.random() * 9000));
    const mgr = String(Math.floor(100000 + Math.random() * 900000));
    let email = '';
    try { email = Session.getEffectiveUser().getEmail(); } catch (e) {}
    st.getRange(1, 1, 5, 2).setValues([
      ['הגדרה', 'ערך'],
      ['קוד מחלקה (אחיות ובנות שירות)', staff],
      ['קוד מנהל', mgr],
      ['מייל להתראות (אפשר כמה, מופרדים בפסיק)', email],
      ['שם המחלקה', 'חדר טראומה – מלר"ד'],
    ]);
    st.getRange('B2:B3').setNumberFormat('@');
    st.getRange(1, 1, 1, 2).setFontWeight('bold');
    st.setColumnWidth(1, 300).setColumnWidth(2, 280);
  }

  ss.getSheets().forEach(s => {
    if (Object.values(SH).indexOf(s.getName()) === -1 && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  installDailyTrigger();
  Logger.log('ההתקנה הסתיימה. הקודים נמצאים בגיליון "הגדרות".');
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyReport') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyReport').timeBased().atHour(7).everyDays(1).inTimezone(TZ).create();
}

/* ---------------- API (called from Index.html) ---------------- */

function verifyPin(pin) {
  const s = settings_();
  pin = String(pin || '').trim();
  if (pin && pin === s.managerPin) return 'manager';
  if (pin && pin === s.staffPin) return 'staff';
  return null;
}

function getState(mgrPin) {
  const s = settings_();
  const isMgr = !!mgrPin && String(mgrPin).trim() === s.managerPin;
  const items = readItems_();
  const checks = readChecks_(500);
  const last = {};
  checks.forEach(c => {
    const k = c.team + '|' + c.freq;
    if (!last[k] || c.at > last[k].at) last[k] = { at: c.at, by: c.by };
  });
  const res = { unit: s.unit, items: items, last: last, isMgr: isMgr };
  if (isMgr) {
    res.openIssues = readIssues_().filter(x => x.status === 'open').sort((a, b) => (a.at < b.at ? 1 : -1));
    res.recent = checks.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 15);
    res.sheetUrl = ss_().getUrl();
  }
  return res;
}

function submitCheck(p) {
  p = p || {};
  const s = settings_();
  const pin = String(p.pin || '').trim();
  if (!pin || (pin !== s.staffPin && pin !== s.managerPin)) throw new Error('קוד המחלקה שגוי.');
  if (!TEAM_HE[p.team] || !FREQ_HE[p.freq]) throw new Error('נתוני הבדיקה לא תקינים. רענן/י את הדף.');
  const by = String(p.by || '').trim().slice(0, 60);
  if (!by) throw new Error('יש להזין שם בודק/ת.');
  const results = p.results || {}, found = p.found || {};
  const list = readItems_().filter(i => i.team === p.team && i.freq === p.freq);
  if (!list.length) throw new Error('אין פריטים לבדיקה הזו.');
  if (list.some(i => ['ok', 'missing', 'broken'].indexOf(results[i.id]) === -1))
    throw new Error('רשימת הציוד עודכנה בזמן הבדיקה. רענן/י את הדף וסמן/י את הפריטים החדשים.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let created = [];
  try {
    const now = new Date();
    const notes = String(p.notes || '').trim().slice(0, 500);
    const probs = list.filter(i => results[i.id] !== 'ok');
    ss_().getSheetByName(SH.checks).appendRow([
      now, TEAM_HE[p.team], FREQ_HE[p.freq], by, probs.length, list.length, notes,
      probs.map(i => i.name + ' – ' + TYPE_HE[results[i.id]]).join('; '),
    ]);
    const ish = ss_().getSheetByName(SH.issues);
    const open = readIssues_().filter(x => x.status === 'open');
    probs.forEach(i => {
      const type = results[i.id];
      const f = type === 'missing' ? num_(found[i.id]) : null;
      const need = type === 'missing' && i.qty !== null && f !== null ? Math.max(0, i.qty - f) : '';
      const ex = open.filter(x => x.itemId === i.id && x.type === type)[0];
      if (ex) {
        if (f !== null) ish.getRange(ex.row, 7, 1, 2).setValues([[f, need]]);
        return;
      }
      ish.appendRow(['x' + Utilities.getUuid().slice(0, 8), now, i.name, i.cabinet, TYPE_HE[type],
        i.qty === null ? '' : i.qty, f === null ? '' : f, need, by, TEAM_HE[p.team], notes, STATUS_OPEN, '', i.id]);
      created.push({ i: i, type: type, f: f, need: need });
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (created.length && s.email) {
    try { sendIssueAlert_(s, created, by, p.team, p.notes); } catch (e) { Logger.log(e); }
  }
  return getState(p.mgrPin);
}

function resolveIssue(mgrPin, id) {
  const s = settings_();
  if (String(mgrPin || '').trim() !== s.managerPin) throw new Error('קוד המנהל שגוי.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const x = readIssues_().filter(r => r.id === id)[0];
    if (x && x.status === 'open') {
      ss_().getSheetByName(SH.issues).getRange(x.row, 12, 1, 2).setValues([[STATUS_DONE, new Date()]]);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }
  return getState(mgrPin);
}

/* ---------------- alerts ---------------- */

function sendIssueAlert_(s, created, by, team, notes) {
  const crit = created.filter(c => c.i.critical).length;
  const lines = created.map(c => {
    let t = '• ' + c.i.name + ' (' + c.i.cabinet + ') – ' + TYPE_HE[c.type];
    if (c.type === 'missing' && c.f !== null) t += c.i.qty !== null ? ' · יש ' + c.f + ' מתוך ' + c.i.qty + ', להשלים ' + c.need : ' · יש ' + c.f;
    if (c.i.critical) t += ' · קריטי';
    return t;
  });
  const body = 'דווח ע"י ' + by + ' (' + TEAM_HE[team] + ')\n\n' + lines.join('\n') +
    (notes ? '\n\nהערה: ' + notes : '') + '\n\nלטיפול: ' + SITE_URL;
  MailApp.sendEmail({
    to: s.email,
    subject: (crit ? 'דחוף – ' : '') + "צ'קליסט טראומה: " + created.length + ' פריטים חסרים/תקולים',
    body: body,
  });
}

/** Runs every morning at 07:00. Emails only when something needs attention. */
function dailyReport() {
  const s = settings_();
  if (!s.email) return;
  const items = readItems_();
  const checks = readChecks_(500);
  const now = new Date();
  const yesterday = Utilities.formatDate(new Date(now.getTime() - 864e5), TZ, 'yyyy-MM-dd');
  const last = {};
  checks.forEach(c => { const k = c.team + '|' + c.freq; if (!last[k] || c.at > last[k].at) last[k] = c; });
  const combos = {};
  items.forEach(i => { combos[i.team + '|' + i.freq] = true; });
  const late = [];
  Object.keys(combos).forEach(k => {
    const t = k.split('|')[0], f = k.split('|')[1], l = last[k];
    const label = TEAM_HE[t] + ' – בדיקה ' + FREQ_HE[f];
    if (!l) { late.push('• ' + label + ': טרם בוצעה'); return; }
    const d = new Date(l.at);
    const overdue = f === 'daily'
      ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') < yesterday
      : (now - d) / 864e5 > FREQ_DAYS[f];
    if (overdue) late.push('• ' + label + ': אחרונה ' + Utilities.formatDate(d, TZ, 'dd/MM HH:mm') + ' (' + l.by + ')');
  });
  const open = readIssues_().filter(x => x.status === 'open');
  if (!late.length && !open.length) return;
  const issueLines = open.map(x => {
    let t = '• ' + x.itemName + ' (' + x.cabinet + ') – ' + TYPE_HE[x.type];
    if (x.type === 'missing' && x.found !== null) t += x.qty !== null ? ' · להשלים ' + Math.max(0, x.qty - x.found) : ' · יש ' + x.found;
    return t + ' · ' + Utilities.formatDate(new Date(x.at), TZ, 'dd/MM');
  });
  const body = (open.length ? 'להשלמה ולתיקון (' + open.length + '):\n' + issueLines.join('\n') + '\n\n' : '') +
    (late.length ? 'בדיקות שלא בוצעו בזמן:\n' + late.join('\n') + '\n\n' : '') +
    'לוח מנהל: ' + SITE_URL;
  MailApp.sendEmail({ to: s.email, subject: "צ'קליסט טראומה – סיכום בוקר: " + (open.length + late.length) + ' דורשים טיפול', body: body });
}

/* ---------------- data helpers ---------------- */

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.setRightToLeft(true);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#dcedef');
  sh.setFrozenRows(1);
  return sh;
}

function settings_() {
  const v = ss_().getSheetByName(SH.settings).getRange('B2:B5').getDisplayValues().map(r => String(r[0]).trim());
  return { staffPin: v[0], managerPin: v[1], email: v[2], unit: v[3] || 'חדר טראומה' };
}

function readItems_() {
  const sh = ss_().getSheetByName(SH.items);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, ITEM_HEADERS.length).getValues();
  const team = invert_(TEAM_HE), freq = invert_(FREQ_HE);
  const out = [];
  vals.forEach((r, i) => {
    const name = String(r[1]).trim();
    if (!name) return;
    if (!String(r[0]).trim()) { r[0] = 'i' + Utilities.getUuid().slice(0, 8); sh.getRange(i + 2, 1).setValue(r[0]); }
    const t = team[String(r[3]).trim()], f = freq[String(r[4]).trim()];
    if (!t || !f) return;
    const q = num_(r[6]);
    out.push({ id: String(r[0]), name: name, cabinet: String(r[2]).trim() || 'כללי', team: t, freq: f,
      critical: r[5] === true, qty: q !== null && q > 0 ? q : null });
  });
  return out;
}

function readChecks_(n) {
  const team = invert_(TEAM_HE), freq = invert_(FREQ_HE);
  return readRows_(SH.checks, n).map(o => {
    const r = o.r;
    return { at: iso_(r[0]), team: team[r[1]] || '', freq: freq[r[2]] || '', by: String(r[3]),
      problemCount: Number(r[4]) || 0, notes: String(r[6] || '') };
  }).filter(c => c.at && c.team && c.freq);
}

function readIssues_() {
  const team = invert_(TEAM_HE);
  return readRows_(SH.issues, 5000).map(o => {
    const r = o.r;
    return { row: o.row, id: String(r[0]), at: iso_(r[1]), itemName: String(r[2]), cabinet: String(r[3]),
      type: String(r[4]).trim() === TYPE_HE.broken ? 'broken' : 'missing', qty: num_(r[5]), found: num_(r[6]),
      by: String(r[8]), team: team[r[9]] || '', note: String(r[10] || ''),
      status: String(r[11]).trim() === STATUS_DONE ? 'resolved' : 'open', itemId: String(r[13]) };
  }).filter(x => x.id && x.at);
}

function readRows_(name, n) {
  const sh = ss_().getSheetByName(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const start = Math.max(2, last - n + 1);
  return sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues().map((r, i) => ({ row: start + i, r: r }));
}

function iso_(v) {
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString();
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
}

function num_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Math.round(Number(v));
  return isFinite(n) && n >= 0 ? n : null;
}

function invert_(o) {
  const r = {};
  Object.keys(o).forEach(k => { r[o[k]] = k; });
  return r;
}
