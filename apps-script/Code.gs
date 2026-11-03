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
const SH = { items: 'ציוד', checks: 'בדיקות', issues: 'חוסרים ותקלות', settings: 'הגדרות',
  devices: 'מכשור רפואי', devTypes: 'תקן מכשירים', repairs: 'תיקונים', consumables: 'מתכלים', orders: 'הזמנות', catalog: 'קטלוג פריטים' };
const TEAM_HE = { nurses: 'אחיות', volunteers: 'בנות שירות' };
const GEN_FREQ_HE = { daily: 'יומית', weekly: 'שבועית', monthly: 'חודשית' };
// Special volunteer checklists share the checks log; their key goes in the "תדירות" column.
const FREQ_HE = { daily: 'יומית', weekly: 'שבועית', monthly: 'חודשית', devices: 'מכשור רפואי – יומי', order: 'הזמנה שבועית' };
const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 31, devices: 1, order: 7 };
const DAILY_KEYS = { daily: true, devices: true };
const DEV_ACTIVE = 'פעיל', DEV_REPAIR = 'בתיקון';
const TYPE_HE = { missing: 'חסר', broken: 'תקול' };
const STATUS_OPEN = 'פתוח', STATUS_DONE = 'טופל';

const ITEM_HEADERS = ['מזהה', 'פריט', 'ארון / מיקום', 'מי בודק', 'תדירות', 'קריטי', 'כמות תקן'];
const CHECK_HEADERS = ['תאריך ושעה', 'צוות', 'תדירות', 'בודק/ת', 'מס׳ בעיות', 'מס׳ פריטים', 'הערות', 'פריטים עם בעיה'];
const DEVICE_HEADERS = ['מספר זיהוי (הנדסה רפואית)', 'סוג מכשיר', 'מיקום', 'בצ׳קליסט בנות שירות', 'בצ׳קליסט מנקים', 'סטטוס', 'הערות'];
const DEVTYPE_HEADERS = ['סוג מכשיר', 'כמות תקן'];
const REPAIR_HEADERS = ['מספר זיהוי', 'סוג מכשיר', 'תאריך שליחה', 'תקלה / סיבה', 'תאריך חזרה', 'הערת חזרה', 'סטטוס'];
const CONS_HEADERS = ['מזהה', 'פריט', 'קטגוריה', 'יחידת מידה', 'כמות תקן', 'ברקוד / מק״ט'];
const ORDER_HEADERS = ['מזהה הזמנה', 'תאריך', 'בת שירות', 'פריט', 'קטגוריה', 'יחידה', 'תקן', 'מלאי קיים', 'להזמנה', 'ברקוד / מק״ט'];
// The מק״ט is also the barcode on the sticker (one field).
const CAT_HEADERS = ['מזהה', 'שם פריט', 'תיאור פריט מחסן', 'מק״ט (ברקוד)', 'יחידת מידה', 'מאיפה מביאים', 'איך מזמינים / איש קשר', 'מיקום במלר״ד', 'הערות', 'כמות תקן'];
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
      case 'submitDeviceCheck': data = submitDeviceCheck(p); break;
      case 'submitOrder': data = submitOrder(p); break;
      case 'sendToRepair': data = sendToRepair(p.mgrPin, p.deviceId, p.reason); break;
      case 'returnFromRepair': data = returnFromRepair(p.mgrPin, p.deviceId, p.note); break;
      case 'addDevice': data = addDevice(p.mgrPin, p.device); break;
      case 'addCatalogItem': data = addCatalogItem(p.mgrPin, p.item); break;
      case 'updateCatalogItem': data = updateCatalogItem(p.mgrPin, p.id, p.item); break;
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
    .requireValueInList(Object.values(GEN_FREQ_HE)).setAllowInvalid(false).build());
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

  setupV2();
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
  const res = { unit: s.unit, items: items, last: last, isMgr: isMgr,
    devices: readDevices_().map(d => ({ id: d.id, type: d.type, location: d.location, vol: d.vol, clean: d.clean, status: d.status })),
    devTypes: readDevTypes_(), consumables: readConsumables_(), catalog: readCatalog_() };
  if (isMgr) {
    res.openIssues = readIssues_().filter(x => x.status === 'open').sort((a, b) => (a.at < b.at ? 1 : -1));
    res.recent = checks.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 15);
    const allRep = readRepairs_();
    res.repairs = allRep.filter(r => r.open).map(r => ({ id: r.id, type: r.type, sentAt: r.sentAt, reason: r.reason }));
    res.repairHistory = {};
    allRep.forEach(r => {
      (res.repairHistory[r.id] = res.repairHistory[r.id] || []).push({ sentAt: r.sentAt, reason: r.reason, returnedAt: r.returnedAt, returnNote: r.returnNote, open: r.open });
    });
    res.lastOrder = lastOrder_();
    res.sheetUrl = ss_().getUrl();
  }
  return res;
}

function submitCheck(p) {
  p = p || {};
  const s = settings_();
  const pin = String(p.pin || '').trim();
  if (!pin || (pin !== s.staffPin && pin !== s.managerPin)) throw new Error('קוד המחלקה שגוי.');
  if (!TEAM_HE[p.team] || !GEN_FREQ_HE[p.freq]) throw new Error('נתוני הבדיקה לא תקינים. רענן/י את הדף.');
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

/* ---------------- medical devices, repairs, weekly order ---------------- */

/** Creates the device / repair / consumables / order tabs. Safe to run again. */
function setupV2() {
  const N = 500;
  const dev = sheet_(SH.devices, DEVICE_HEADERS);
  dev.getRange(2, 4, N, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  dev.getRange(2, 6, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([DEV_ACTIVE, DEV_REPAIR]).setAllowInvalid(false)
    .setHelpText('הסטטוס מתעדכן מהאתר כשמכשיר נשלח לתיקון או חוזר. ריק = פעיל.').build());
  dev.getRange(2, 1, N, 1).setNumberFormat('@');
  dev.getRange('A1').setNote('המספר שמודבק על המכשיר מטעם הנדסה רפואית. כל מכשיר בשורה נפרדת.');
  dev.setColumnWidth(1, 190).setColumnWidth(2, 200).setColumnWidth(3, 160).setColumnWidth(4, 130)
    .setColumnWidth(5, 110).setColumnWidth(6, 90).setColumnWidth(7, 240);

  const types = sheet_(SH.devTypes, DEVTYPE_HEADERS);
  types.getRange(2, 2, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
  types.getRange('A1').setNote('שם הסוג חייב להיות זהה לעמודה "סוג מכשיר" בלשונית מכשור רפואי.');
  types.setColumnWidth(1, 220).setColumnWidth(2, 100);

  const rep = sheet_(SH.repairs, REPAIR_HEADERS);
  rep.getRange('C2:C').setNumberFormat('dd/MM/yyyy HH:mm');
  rep.getRange('E2:E').setNumberFormat('dd/MM/yyyy HH:mm');
  rep.setColumnWidth(1, 170).setColumnWidth(2, 180).setColumnWidth(4, 260).setColumnWidth(6, 220);

  const cons = sheet_(SH.consumables, CONS_HEADERS);
  cons.getRange(2, 5, N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
  cons.getRange('A1').setNote('מזהה פנימי. נוצר אוטומטית, אין צורך למלא.');
  cons.getRange('A2:A').setFontColor('#8a969c');
  cons.setColumnWidth(1, 80).setColumnWidth(2, 300).setColumnWidth(3, 160).setColumnWidth(4, 110).setColumnWidth(5, 90).setColumnWidth(6, 170);
  cons.getRange(2, 6, N, 1).setNumberFormat('@');
  cons.getRange('F1').setNote('הברקוד או המק״ט כפי שהוא נסרק במערכת ההזמנות של בית החולים. נשמר כטקסט כדי לא לאבד אפסים בהתחלה.');

  migrateCatalog_();
  const cat = sheet_(SH.catalog, CAT_HEADERS);
  cat.getRange(2, 4, N * 2, 1).setNumberFormat('@');
  cat.getRange('A1').setNote('מזהה פנימי. נוצר אוטומטית, אין צורך למלא.');
  cat.getRange('F1').setNote('מאיפה מביאים את הפריט: למשל מחסן מרכזי, בית מרקחת, מחסן סטרילי, הנדסה רפואית, ספק.');
  cat.getRange('A2:A').setFontColor('#8a969c');
  cat.setColumnWidth(1, 80).setColumnWidth(2, 220).setColumnWidth(3, 280).setColumnWidth(4, 150).setColumnWidth(5, 90)
    .setColumnWidth(6, 160).setColumnWidth(7, 220).setColumnWidth(8, 170).setColumnWidth(9, 220).setColumnWidth(10, 90);
  cat.getRange(2, 10, N * 2, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
  cat.getRange(2, 1, N * 2, CAT_HEADERS.length).setWrap(true).setVerticalAlignment('top');

  const ord = sheet_(SH.orders, ORDER_HEADERS);
  ord.getRange('B2:B').setNumberFormat('dd/MM/yyyy HH:mm');
  ord.setColumnWidth(2, 130).setColumnWidth(3, 130).setColumnWidth(4, 260).setColumnWidth(10, 170);
  ord.getRange(2, 10, N * 20, 1).setNumberFormat('@');
}

function readDevices_() {
  return readRows_(SH.devices, 2000).map(o => {
    const r = o.r;
    return { row: o.row, id: String(r[0]).trim(), type: String(r[1]).trim() || 'ללא סוג', location: String(r[2] || '').trim(),
      vol: r[3] === true, clean: r[4] === true, status: String(r[5]).trim() === DEV_REPAIR ? 'repair' : 'active' };
  }).filter(d => d.id);
}

function readDevTypes_() {
  const out = {};
  readRows_(SH.devTypes, 500).forEach(o => {
    const t = String(o.r[0]).trim(), q = num_(o.r[1]);
    if (t && q !== null) out[t] = q;
  });
  return out;
}

function readConsumables_() {
  const sh = ss_().getSheetByName(SH.consumables);
  return readRows_(SH.consumables, 1000).map(o => {
    const r = o.r, name = String(r[1]).trim();
    if (!name) return null;
    let id = String(r[0]).trim();
    if (!id) { id = 'c' + Utilities.getUuid().slice(0, 8); sh.getRange(o.row, 1).setValue(id); }
    return { id: id, name: name, category: String(r[2] || '').trim() || 'כללי', unit: String(r[3] || '').trim(), qty: num_(r[4]),
      barcode: r[5] === undefined || r[5] === null ? '' : String(r[5]).trim() };
  }).filter(Boolean);
}

/** Old layout had separate מק״ט and ברקוד columns (D, E). Merge into one column, keeping whichever is filled. */
function migrateCatalog_() {
  const sh = ss_().getSheetByName(SH.catalog);
  if (!sh || String(sh.getRange('E1').getValue()).trim() !== 'ברקוד') return;
  const last = sh.getLastRow();
  if (last >= 2) {
    const v = sh.getRange(2, 4, last - 1, 2).getDisplayValues();
    sh.getRange(2, 4, last - 1, 1).setNumberFormat('@').setValues(v.map(r => [String(r[1]).trim() || String(r[0]).trim()]));
  }
  sh.deleteColumn(5);
  sh.getRange(1, 1, 1, CAT_HEADERS.length).setValues([CAT_HEADERS]);
}

function readCatalog_() {
  migrateCatalog_();
  const sh = ss_().getSheetByName(SH.catalog);
  const txt = v => (v === undefined || v === null ? '' : String(v).trim());
  return readRows_(SH.catalog, 3000).map(o => {
    const r = o.r, name = txt(r[1]);
    if (!name) return null;
    let id = txt(r[0]);
    if (!id) { id = 'p' + Utilities.getUuid().slice(0, 8); sh.getRange(o.row, 1).setValue(id); }
    const code = txt(r[3]);
    return { row: o.row, id: id, name: name, desc: txt(r[2]), sku: code, barcode: code, unit: txt(r[4]), source: txt(r[5]),
      howto: txt(r[6]), location: txt(r[7]), notes: txt(r[8]), qty: num_(r[9]) };
  }).filter(Boolean);
}

function catRow_(id, it) {
  const t = (v, n) => String(v || '').trim().slice(0, n);
  const name = t(it.name, 120);
  if (!name) throw new Error('חסר שם פריט.');
  const code = t(it.sku || it.barcode, 60).replace(/\s+/g, '');
  const q = num_(it.qty);
  return [id, name, t(it.desc, 300), code, t(it.unit, 40), t(it.source, 120), t(it.howto, 500), t(it.location, 120), t(it.notes, 1000), q === null ? '' : q];
}

function catDup_(cat, row, exceptId) {
  const code = normId_(row[3]);
  return cat.filter(c => c.id !== exceptId && ((code && normId_(c.sku) === code) || c.name === row[1]))[0];
}

function addCatalogItem(mgrPin, it) {
  mgrAuth_(mgrPin);
  const row = catRow_('p' + Utilities.getUuid().slice(0, 8), it || {});
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const dup = catDup_(readCatalog_(), row, null);
    if (dup) throw new Error('הפריט כבר קיים בקטלוג: ' + dup.name + '.');
    const sh = ss_().getSheetByName(SH.catalog);
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 4).setNumberFormat('@');
    sh.getRange(r, 1, 1, CAT_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(mgrPin);
}

function updateCatalogItem(mgrPin, id, it) {
  mgrAuth_(mgrPin);
  id = String(id || '').trim();
  const row = catRow_(id, it || {});
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cat = readCatalog_();
    const cur = cat.filter(c => c.id === id)[0];
    if (!cur) throw new Error('הפריט לא נמצא. רענן/י את הדף.');
    const dup = catDup_(cat, row, id);
    if (dup) throw new Error('כבר יש פריט עם אותו שם או מק״ט: ' + dup.name + '.');
    const sh = ss_().getSheetByName(SH.catalog);
    sh.getRange(cur.row, 4).setNumberFormat('@');
    sh.getRange(cur.row, 1, 1, CAT_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(mgrPin);
}

function readRepairs_() {
  return readRows_(SH.repairs, 3000).map(o => {
    const r = o.r;
    return { row: o.row, id: String(r[0]).trim(), type: String(r[1]), sentAt: iso_(r[2]), reason: String(r[3] || ''),
      returnedAt: iso_(r[4]), returnNote: String(r[5] || ''), open: String(r[6]).trim() === DEV_REPAIR };
  }).filter(r => r.id && r.sentAt);
}

function lastOrder_() {
  const rows = readRows_(SH.orders, 1500).map(o => o.r);
  if (!rows.length) return null;
  const lastId = String(rows[rows.length - 1][0]);
  const mine = rows.filter(r => String(r[0]) === lastId);
  return { id: lastId, at: iso_(mine[0][1]), by: String(mine[0][2]),
    lines: mine.map(r => ({ name: String(r[3]), category: String(r[4]), unit: String(r[5]), qty: num_(r[6]), stock: num_(r[7]), order: num_(r[8]) || 0,
      barcode: r[9] === undefined || r[9] === null ? '' : String(r[9]).trim() })) };
}

function staffAuth_(p) {
  const s = settings_();
  const pin = String(p.pin || '').trim();
  if (!pin || (pin !== s.staffPin && pin !== s.managerPin)) throw new Error('קוד המחלקה שגוי.');
  const by = String(p.by || '').trim().slice(0, 60);
  if (!by) throw new Error('יש להזין שם בודק/ת.');
  return { s: s, by: by };
}

function submitDeviceCheck(p) {
  p = p || {};
  const a = staffAuth_(p), s = a.s, by = a.by;
  const results = p.results || {};
  const all = readDevices_().filter(d => d.vol);
  const list = all.filter(d => d.status === 'active');
  if (!all.length) throw new Error('אין מכשירים ברשימה.');
  if (list.some(d => ['found', 'missing'].indexOf(results[d.id]) === -1))
    throw new Error('רשימת המכשירים עודכנה בזמן הבדיקה. רענן/י את הדף וסמן/י שוב.');
  const reqs = readDevTypes_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const created = [];
  const shortages = [];
  try {
    const now = new Date();
    const notes = String(p.notes || '').trim().slice(0, 500);
    const missing = list.filter(d => results[d.id] === 'missing');
    const byType = {};
    all.forEach(d => { byType[d.type] = byType[d.type] || 0; if (d.status === 'active' && results[d.id] === 'found') byType[d.type]++; });
    Object.keys(byType).forEach(t => { if (reqs[t] !== undefined && byType[t] < reqs[t]) shortages.push(t + ': נמצאו ' + byType[t] + ' מתוך ' + reqs[t]); });
    ss_().getSheetByName(SH.checks).appendRow([now, TEAM_HE.volunteers, FREQ_HE.devices, by, missing.length, list.length, notes,
      missing.map(d => d.type + ' ' + d.id + ' – לא נמצא').concat(shortages).join('; ')]);
    const ish = ss_().getSheetByName(SH.issues);
    const open = readIssues_().filter(x => x.status === 'open');
    missing.forEach(d => {
      const itemId = 'dev:' + d.id;
      if (open.some(x => x.itemId === itemId)) return;
      const name = d.type + ' (' + d.id + ')';
      ish.appendRow(['x' + Utilities.getUuid().slice(0, 8), now, name, d.location || 'מכשור רפואי', TYPE_HE.missing,
        '', '', '', by, TEAM_HE.volunteers, notes, STATUS_OPEN, '', itemId]);
      created.push({ i: { name: name, cabinet: d.location || 'מכשור רפואי', critical: false, qty: null }, type: 'missing', f: null, need: '' });
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (created.length && s.email) {
    try { sendIssueAlert_(s, created, by, 'volunteers', [p.notes, shortages.join('\n')].filter(Boolean).join('\n')); } catch (e) { Logger.log(e); }
  }
  return getState(p.mgrPin);
}

function submitOrder(p) {
  p = p || {};
  const a = staffAuth_(p), s = a.s, by = a.by;
  const stock = p.stock || {};
  const cons = readConsumables_();
  if (!cons.length) throw new Error('אין פריטים ברשימת המתכלים.');
  if (cons.some(c => num_(stock[c.id]) === null)) throw new Error('רשימת הפריטים עודכנה. רענן/י את הדף ומלא/י שוב.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let lines;
  try {
    const now = new Date();
    const oid = 'o' + Utilities.formatDate(now, TZ, 'yyMMddHHmm') + Utilities.getUuid().slice(0, 3);
    lines = cons.map(c => {
      const st = num_(stock[c.id]);
      const ord = c.qty === null ? 0 : Math.max(0, c.qty - st);
      return { c: c, stock: st, order: ord };
    });
    const rows = lines.map(l => [oid, now, by, l.c.name, l.c.category, l.c.unit, l.c.qty === null ? '' : l.c.qty, l.stock, l.order, l.c.barcode]);
    const sh = ss_().getSheetByName(SH.orders);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, ORDER_HEADERS.length).setValues(rows);
    const toOrder = lines.filter(l => l.order > 0);
    const notes = String(p.notes || '').trim().slice(0, 500);
    ss_().getSheetByName(SH.checks).appendRow([now, TEAM_HE.volunteers, FREQ_HE.order, by, toOrder.length, lines.length, notes,
      toOrder.map(l => l.c.name + ' – ' + l.order + (l.c.unit ? ' ' + l.c.unit : '')).join('; ')]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  if (s.email) {
    try { sendOrderEmail_(s, lines, by, p.notes); } catch (e) { Logger.log(e); }
  }
  return getState(p.mgrPin);
}

function sendOrderEmail_(s, lines, by, notes) {
  const toOrder = lines.filter(l => l.order > 0);
  const cats = {};
  toOrder.forEach(l => { (cats[l.c.category] = cats[l.c.category] || []).push(l); });
  const body = 'הזמנה שבועית – ציוד מתכלה\nמולא ע"י ' + by + ', ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + '\n\n' +
    (toOrder.length ? Object.keys(cats).map(c => c + ':\n' + cats[c].map(l =>
      '• ' + l.c.name + ' – להזמנה ' + l.order + (l.c.unit ? ' ' + l.c.unit : '') + ' (תקן ' + l.c.qty + ', במלאי ' + l.stock + ')').join('\n')).join('\n\n')
      : 'אין צורך להזמין השבוע. כל הפריטים במלאי מלא.') +
    (notes ? '\n\nהערה: ' + notes : '') + '\n\nלוח מנהל: ' + SITE_URL;
  MailApp.sendEmail({ to: s.email, subject: "הזמנה שבועית – חדר טראומה: " + toOrder.length + ' פריטים להזמנה', body: body });
}

function mgrAuth_(mgrPin) {
  if (String(mgrPin || '').trim() !== settings_().managerPin) throw new Error('קוד המנהל שגוי.');
}

function sendToRepair(mgrPin, deviceId, reason) {
  mgrAuth_(mgrPin);
  deviceId = String(deviceId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = readDevices_().filter(x => x.id === deviceId)[0];
    if (!d) throw new Error('המכשיר לא נמצא ברשימה.');
    if (d.status === 'repair') throw new Error('המכשיר כבר מסומן בתיקון.');
    if (!String(reason || '').trim()) throw new Error('יש לכתוב מה התקלה.');
    ss_().getSheetByName(SH.devices).getRange(d.row, 6).setValue(DEV_REPAIR);
    ss_().getSheetByName(SH.repairs).appendRow([d.id, d.type, new Date(), String(reason || '').trim().slice(0, 1000), '', '', DEV_REPAIR]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(mgrPin);
}

const normId_ = v => String(v || '').replace(/[^0-9A-Za-z\u0590-\u05FF]/g, '').toUpperCase();

function addDevice(mgrPin, dev) {
  mgrAuth_(mgrPin);
  dev = dev || {};
  const id = String(dev.id || '').trim().replace(/\s+/g, '').slice(0, 60);
  const type = String(dev.type || '').trim().slice(0, 80);
  if (!id) throw new Error('חסר מספר זיהוי.');
  if (!type) throw new Error('חסר סוג מכשיר.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ex = readDevices_().filter(d => normId_(d.id) === normId_(id))[0];
    if (ex) throw new Error('המכשיר ' + ex.id + ' כבר קיים ברשימה (' + ex.type + ').');
    const sh = ss_().getSheetByName(SH.devices);
    sh.getRange(sh.getLastRow() + 1, 1, 1, DEVICE_HEADERS.length).setValues([[id, type, String(dev.location || '').trim().slice(0, 80),
      dev.vol === true, dev.clean === true, DEV_ACTIVE, '']]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(mgrPin);
}

function returnFromRepair(mgrPin, deviceId, note) {
  mgrAuth_(mgrPin);
  deviceId = String(deviceId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = readDevices_().filter(x => x.id === deviceId)[0];
    if (d) ss_().getSheetByName(SH.devices).getRange(d.row, 6).setValue(DEV_ACTIVE);
    const r = readRepairs_().filter(x => x.id === deviceId && x.open).pop();
    if (r) ss_().getSheetByName(SH.repairs).getRange(r.row, 5, 1, 3).setValues([[new Date(), String(note || '').trim().slice(0, 300), 'הוחזר']]);
    SpreadsheetApp.flush();
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
  if (readDevices_().some(d => d.vol)) combos['volunteers|devices'] = true;
  if (readConsumables_().length) combos['volunteers|order'] = true;
  const late = [];
  Object.keys(combos).forEach(k => {
    const t = k.split('|')[0], f = k.split('|')[1], l = last[k];
    const label = TEAM_HE[t] + ' – ' + FREQ_HE[f];
    if (!l) { late.push('• ' + label + ': טרם בוצעה'); return; }
    const d = new Date(l.at);
    const overdue = DAILY_KEYS[f]
      ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') < yesterday
      : (now - d) / 864e5 > FREQ_DAYS[f];
    if (overdue) late.push('• ' + label + ': אחרונה ' + Utilities.formatDate(d, TZ, 'dd/MM HH:mm') + ' (' + l.by + ')');
  });
  const open = readIssues_().filter(x => x.status === 'open');
  const inRepair = readRepairs_().filter(r => r.open);
  if (!late.length && !open.length) return;
  const issueLines = open.map(x => {
    let t = '• ' + x.itemName + ' (' + x.cabinet + ') – ' + TYPE_HE[x.type];
    if (x.type === 'missing' && x.found !== null) t += x.qty !== null ? ' · להשלים ' + Math.max(0, x.qty - x.found) : ' · יש ' + x.found;
    return t + ' · ' + Utilities.formatDate(new Date(x.at), TZ, 'dd/MM');
  });
  const body = (open.length ? 'להשלמה ולתיקון (' + open.length + '):\n' + issueLines.join('\n') + '\n\n' : '') +
    (late.length ? 'בדיקות שלא בוצעו בזמן:\n' + late.join('\n') + '\n\n' : '') +
    (inRepair.length ? 'מכשירים בתיקון (' + inRepair.length + '):\n' + inRepair.map(r => '• ' + r.type + ' ' + r.id + ' · מאז ' +
      Utilities.formatDate(new Date(r.sentAt), TZ, 'dd/MM')).join('\n') + '\n\n' : '') +
    'לוח מנהל: ' + SITE_URL;
  MailApp.sendEmail({ to: s.email, subject: "צ'קליסט טראומה – סיכום בוקר: " + (open.length + late.length) + ' דורשים טיפול', body: body });
}

/* ---------------- data helpers ---------------- */

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  if (!sh) return [];
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
