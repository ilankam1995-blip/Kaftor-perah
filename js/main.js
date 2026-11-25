'use strict';

/* ===== Shared helpers ===== */
const $ = (id) => document.getElementById(id);

// Render a Bootstrap alert (type: success | danger | warning | light) into a live region
function showFeedback(container, type, html) {
  container.innerHTML = `<div class="alert alert-${type} m-0">${html}</div>`;
}

// Short answer explanation (1-2 lines) under a question, shown after "show answer"
function showNote(container, html) {
  container.innerHTML = `<p class="answer-note">${html}</p>`;
}

/* ===== SCORM 1.2 connection (milestone 1: connect, learner name, outside-LMS behavior) ===== */
// No banner inside the unit: outside the LMS or in review mode, only the final submit message says nothing was sent
const LMS_TEXT = { fallbackName: 'לומדת/לומד יקר/ה' };
// connected: init succeeded · canSave: connected and not in review/browse mode · ended: quit already called
const lms = { connected: false, canSave: false, ended: false, wasPassed: false, startedAt: Date.now(), unitSent: false };

// Guarded read: never touches the API outside the LMS
function scormGet(field) {
  return lms.connected ? String(pipwerks.SCORM.get(field) || '') : '';
}

// Moodle returns "Last, First"; show "First Last". No comma: show as is. Empty: fallback
function formatLearnerName(raw) {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length ? (parts.length > 1 ? `${parts.slice(1).join(' ')} ${parts[0]}` : parts[0]) : LMS_TEXT.fallbackName;
}

function initLms() {
  if (window.pipwerks) {
    pipwerks.SCORM.version = '1.2'; // look only for the SCORM 1.2 API
    lms.connected = pipwerks.SCORM.init(); // wrapper sets lesson_status = incomplete on first entry
  }
  if (!lms.connected) return; // practice only: nothing is saved
  const mode = scormGet('cmi.core.lesson_mode'); // normal | review | browse
  lms.canSave = mode !== 'review' && mode !== 'browse';
  lms.wasPassed = scormGet('cmi.core.lesson_status') === 'passed'; // never downgrade a passed status
  $('learner-name').textContent = formatLearnerName(scormGet('cmi.core.student_name'));
}

// Guarded write: logs the field and error code when the LMS rejects a value
function scormSet(field, value) {
  const ok = pipwerks.SCORM.set(field, String(value));
  if (!ok) console.warn(`[SCORM] set failed: ${field} = "${value}" (error ${pipwerks.SCORM.debug.getCode()})`);
  return ok;
}

// SCORM 1.2 timespan: HHHH:MM:SS
function formatSessionTime(ms) {
  const sec = Math.floor(ms / 1000);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(Math.floor(sec / 3600), 4)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
}

// Close the session exactly once (pagehide and beforeunload may both fire)
function endLmsSession() {
  if (!lms.connected || lms.ended) return;
  lms.ended = true;
  if (lms.canSave) scormSet('cmi.core.session_time', formatSessionTime(Date.now() - lms.startedAt));
  pipwerks.SCORM.quit(); // wrapper sets cmi.core.exit (suspend/logout) and saves before LMSFinish
}

/* ===== SCORM reporting (milestones 2-3): interactions, score and status ===== */
const PASS_MARK = 60;
// First attempt per game: retries keep teaching, but only the first attempt is reported
const firstTry = { mystery: [], sorting: null, closing: null, habits: null };

// Append interactions after the existing ones (never from 0), then save once.
// Answers are sent as readable Hebrew text, so every text answer uses type 'fill-in': in SCORM 1.2 only
// fill-in (and performance) allow free text in student_response and pattern (CMIString255).
// 'choice' allows only single letters/digits and 'matching' only pairs like 1.a (SCORM_SPEC.md part 4).
function sendInteractions(list) {
  if (!lms.canSave) return false;
  const time = new Date().toTimeString().slice(0, 8); // HH:MM:SS
  let ok = true;
  list.forEach((it) => {
    const base = `cmi.interactions.${parseInt(scormGet('cmi.interactions._count'), 10) || 0}.`;
    ok = scormSet(base + 'id', it.id) && ok; // id first: it creates the record
    ok = scormSet(base + 'type', it.type) && ok;
    ok = scormSet(base + 'student_response', String(it.response).slice(0, 255)) && ok; // SCORM 1.2 limit
    if (it.pattern) ok = scormSet(base + 'correct_responses.0.pattern', String(it.pattern).slice(0, 255)) && ok;
    ok = scormSet(base + 'result', it.result) && ok;
    ok = scormSet(base + 'time', time) && ok;
  });
  return pipwerks.SCORM.save() && ok;
}

// Score 0-100 and passed/failed; a passed status is never lowered
function sendScore(score) {
  if (!lms.canSave) return false;
  const status = lms.wasPassed || score >= PASS_MARK ? 'passed' : 'failed';
  const ok = [scormSet('cmi.core.score.min', 0), scormSet('cmi.core.score.max', 100),
    scormSet('cmi.core.score.raw', score), scormSet('cmi.core.lesson_status', status)].every(Boolean);
  return pipwerks.SCORM.save() && ok;
}

// 1 -> correct, 0 -> wrong, partial -> a number such as 0.5 or 0.67
const resultOf = (ratio) => (ratio === 1 ? 'correct' : ratio === 0 ? 'wrong' : String(Math.round(ratio * 100) / 100));

initLms();
window.addEventListener('pagehide', endLmsSession);
window.addEventListener('beforeunload', endLmsSession);

// Completion flags per part (LMS reporting happens on the closing-case submit and the questionnaire)
const progress = { mystery: false, sorting: false, closing: false, habits: false };
function reportProgress(part) {
  progress[part] = true;
  updateSubmitState();
}

/* ===== Mystery case: first question shows at once, clues can be revealed any time ===== */
const clues = [
  'הפיקוס עומד בסלון, כמה מטרים מהחלון, ולא מקבל שמש ישירה.',
  'מיכל משקה אותו כל יום שישי בכוס מלאה, בדיוק כמו בקיץ.',
  'הפיקוס שתול ישר בעציץ נוי מקרמיקה, בלי חור בתחתית.'
];
const steps = [
  { question: 'מה הכי כדאי לבדוק עכשיו, לפני שמחליטים מה הבעיה?',
    options: [
      { text: 'לגעת באדמה בעומק של פרק אצבע ולבדוק אם היא לחה', good: true,
        why: 'נכון! הצהבה יכולה להופיע גם מעודף מים וגם ממחסור. בדיקת האדמה היא הדרך המהירה להבחין ביניהם.' },
      { text: 'להוסיף לצמח דשן', good: false,
        why: 'זו כבר פעולה, לא בדיקה. ועודף דשן עלול לגרום לסימנים דומים, כך שהוא רק יסבך את התמונה.' },
      { text: 'להעביר את הצמח לשמש ישירה', good: false,
        why: 'זו פעולה ולא בדיקה, ומעבר פתאומי לשמש חזקה עלול לגרום לצריבה. קודם בודקים.' }
    ] },
  { finding: 'מיכל בדקה: האדמה רטובה גם בעומק, ובתחתית עציץ הנוי הצטברו מים.',
    question: 'מה הגורם האפשרי הסביר ביותר?',
    options: [
      { text: 'השקיית יתר', good: true,
        why: 'נכון! לוח זמנים קבוע, אדמה רטובה ועציץ בלי ניקוז מצביעים יחד על השקיית יתר. זו לא אבחנה ודאית, אבל זה הכיוון הסביר.' },
      { text: 'מחסור במים', good: false,
        why: 'לא סביר: האדמה רטובה גם בעומק, כך שהצמח לא חסר מים.' },
      { text: 'צריבת שמש', good: false,
        why: 'לא סביר: הצמח רחוק מהחלון ולא מקבל שמש ישירה.' }
    ] }
];
let clueCount = 1;
let step = 0;
let answered = false; // one answer per question: "what you answered stands"

function renderClues() {
  $('clueList').innerHTML = clues.slice(0, clueCount).map((c) => `<li class="list-group-item">${c}</li>`).join('');
  $('nextClue').hidden = clueCount === clues.length;
}

function renderStep() {
  const s = steps[step];
  $('caseFinding').hidden = !s.finding;
  $('caseFinding').textContent = s.finding || '';
  $('caseQuestion').hidden = false;
  $('caseLegend').textContent = s.question;
  $('caseOptions').innerHTML = s.options.map((o, i) => `<button type="button" class="case-option" data-index="${i}" aria-pressed="false">${o.text}</button>`).join('');
  $('caseFeedback').innerHTML = '';
  $('caseNext').hidden = true;
  answered = false;
}

$('caseOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('.case-option');
  if (!btn || answered) return;
  answered = true;
  const options = steps[step].options;
  const option = options[btn.dataset.index];
  const good = options.find((o) => o.good);
  firstTry.mystery[step] ??= { response: option.text, pattern: good.text, ok: option.good }; // report the first round only
  btn.classList.add('is-picked');
  btn.setAttribute('aria-pressed', 'true');
  // Answer shows at once: the fitting option (and a wrong pick) are marked on the options, plus a short why
  $('caseOptions').querySelectorAll('.case-option').forEach((b) => {
    b.disabled = true;
    const isGood = options[b.dataset.index].good;
    if (!isGood && b !== btn) return;
    b.classList.add(isGood ? 'is-good' : 'is-weak');
    b.insertAdjacentHTML('beforeend', `<span class="answer-tag">${isGood ? '✓ התשובה הנכונה' : '✗ התשובה שלכם'}</span>`);
  });
  showNote($('caseFeedback'), good.why.replace(/^נכון!\s*/, ''));
  const last = step === steps.length - 1;
  $('caseNext').hidden = last;
  $('caseRestart').hidden = !last;
  if (last) reportProgress('mystery');
});

$('nextClue').addEventListener('click', () => { clueCount++; renderClues(); });
$('caseNext').addEventListener('click', () => { step++; renderStep(); $('caseLegend').focus(); });
$('caseRestart').addEventListener('click', () => {
  clueCount = 1; step = 0;
  $('caseRestart').hidden = true;
  renderClues();
  renderStep();
  $('nextClue').focus();
});
$('caseLegend').tabIndex = -1;
renderClues();
renderStep(); // first question shows right away; clues stay optional

/* ===== Flip cards: each card stays flipped until the learner clicks it again ===== */
document.querySelectorAll('.flip-card').forEach((card) => {
  card.addEventListener('click', () => {
    const flipped = card.classList.toggle('is-flipped');
    const [front, back] = card.querySelectorAll('.flip-face');
    front.inert = flipped;
    back.inert = !flipped;
    card.querySelectorAll('.flip-btn').forEach((b) => b.setAttribute('aria-expanded', String(flipped)));
    (flipped ? back : front).querySelector('.flip-btn').focus({ preventScroll: true });
  });
});

/* ===== Comparison table -> accordion for phones (single source: the table) ===== */
const compareTable = $('compareTable');
const headers = [...compareTable.querySelectorAll('thead th')].map((th) => th.textContent);
$('compareAccordion').innerHTML = [...compareTable.tBodies[0].rows].map((row, i) => {
  const [sign, ...cells] = row.cells;
  const details = cells.map((cell, k) => `<p class="fw-bold text-brand m-0">${headers[k + 1]}</p><p>${cell.innerHTML}</p>`).join('');
  return `<div class="accordion-item">
    <h4 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#compare${i}" aria-expanded="false" aria-controls="compare${i}">${sign.textContent}</button></h4>
    <div id="compare${i}" class="accordion-collapse collapse"><div class="accordion-body">${details}</div></div>
  </div>`;
}).join('');

/* ===== Sorting game: drag (or keys 1-3 / 0) on desktop, a select on smaller screens ===== */
const categories = { sun: 'צריבת שמש', over: 'השקיית יתר', under: 'מחסור במים' };
const zoneKeys = Object.keys(categories);
const pool = $('sortPool');
const cards = [...pool.querySelectorAll('.sort-card')];
const desktop = window.matchMedia('(min-width: 992px)');
const listFor = (key) => document.querySelector(`[data-zone="${key}"]`) || pool;
const choiceOf = (card) => (desktop.matches ? card.parentElement.dataset.zone || '' : card.querySelector('select').value);

function clearMarks() {
  cards.forEach((c) => { c.classList.remove('is-correct', 'is-wrong'); c.querySelector('.sort-mark').textContent = ''; });
  $('sortFeedback').innerHTML = '';
  $('sortShow').hidden = true;
}

// Move a card on desktop and keep its (hidden) select in sync
function placeCard(card, key) {
  listFor(key).appendChild(card);
  card.querySelector('select').value = key;
  clearMarks();
}

cards.forEach((card) => {
  const select = card.querySelector('select');
  select.innerHTML = '<option value="">בחרו קטגוריה</option>' +
    zoneKeys.map((key) => `<option value="${key}">${categories[key]}</option>`).join('');
  select.addEventListener('change', clearMarks);
  card.addEventListener('keydown', (e) => {
    if (!desktop.matches || e.target !== card || !/^[0-3]$/.test(e.key)) return;
    e.preventDefault();
    const key = zoneKeys[Number(e.key) - 1] || '';
    placeCard(card, key);
    card.focus();
    $('sortFeedback').innerHTML = `<p class="visually-hidden">הכרטיסייה הועברה אל ${categories[key] || 'רשימת הכרטיסיות'}</p>`;
  });
});

// Each list (pool + 3 zones) is its own Sortable sharing one group
const sortables = [...document.querySelectorAll('.sort-list')].map((list) => new Sortable(list, {
  group: 'cases',
  animation: 150,
  emptyInsertThreshold: 40,
  onAdd: (e) => { e.item.querySelector('select').value = list.dataset.zone || ''; clearMarks(); }
}));

// Switching layouts: desktop shows cards in their zones, smaller screens keep them in the pool
function syncLayout() {
  sortables.forEach((s) => s.option('disabled', !desktop.matches));
  cards.forEach((card) => (desktop.matches ? listFor(card.querySelector('select').value) : pool).appendChild(card));
}
desktop.addEventListener('change', syncLayout);
syncLayout();

$('checkSort').addEventListener('click', () => {
  clearMarks();
  const unsorted = cards.filter((c) => !choiceOf(c)).length;
  if (unsorted) {
    $('sortFeedback').innerHTML = `<p class="small fw-bold m-0">נשארו ${unsorted} כרטיסיות שעדיין לא מוינו. מיינו את כולן ואז לחצו על "בדיקה".</p>`;
    return;
  }
  let correct = 0;
  cards.forEach((c) => {
    const ok = choiceOf(c) === c.dataset.answer;
    c.classList.add(ok ? 'is-correct' : 'is-wrong');
    c.querySelector('.sort-mark').textContent = ok ? '✓ במקום הנכון' : '✗ לא במקום הנכון';
    correct += ok;
  });
  // Report the first full check only, readable in the LMS: "card number (page order): category"
  const pairs = (keyOf) => cards.map((c, i) => `${i + 1}: ${categories[keyOf(c)]}`).join('; ');
  firstTry.sorting ??= { response: pairs(choiceOf), pattern: pairs((c) => c.dataset.answer), correct };
  updateSubmitState();
  if (correct === cards.length) reportProgress('sorting');
  $('sortFeedback').innerHTML = `<p class="small fw-bold m-0">מיינתם נכון ${correct} מתוך ${cards.length} מקרים.</p>`;
  $('sortShow').hidden = false;
});

// Show answer: move every card to its right category and give the short why
$('sortShow').addEventListener('click', () => {
  cards.forEach((c) => {
    const key = c.dataset.answer;
    c.querySelector('select').value = key;
    (desktop.matches ? listFor(key) : pool).appendChild(c);
  });
  clearMarks();
  cards.forEach((c) => {
    c.classList.add('is-correct');
    c.querySelector('.sort-mark').textContent = `✓ ${categories[c.dataset.answer]}`;
  });
  showNote($('sortFeedback'), 'ההבדל נמצא בפרטים: שינוי מיקום לשמש מצביע על צריבה, אדמה רטובה או מים בצלחת על השקיית יתר, ואדמה יבשה ועציץ קל על מחסור במים.');
  $('checkSort').focus();
});

$('resetSort').addEventListener('click', () => {
  cards.forEach((c) => { c.querySelector('select').value = ''; pool.appendChild(c); });
  clearMarks();
});

/* ===== Habits questionnaire (tailored tips, no grade) and graded closing case (own form) ===== */
const form = $('habitsForm');
const closingForm = $('closingForm');
// Input names are unique across both forms, so one page-wide lookup serves both
const picked = (name) => [...document.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value);
// Report answers as their label text, so the LMS report reads on its own (SCORM_SPEC.md appendix A)
const labelOf = (input) => document.querySelector(`label[for="${input.id}"]`).textContent.trim();
const answerText = (name, only = (i) => i.checked) => [...document.querySelectorAll(`[name="${name}"]`)].filter(only).map(labelOf).join('; ');
// Focus the first invalid field of a form
const focusFirstInvalid = (f) => f.querySelector('.is-invalid, fieldset:has(.invalid-feedback:not(:empty)) input')?.focus();

// Mark a field invalid/valid and show its message
function setError(input, errorEl, message) {
  errorEl.textContent = message;
  if (input) {
    input.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
  }
  return !message;
}

function validateHabits() {
  const name = $('plantName').value.trim();
  const count = $('plantCount').value.trim();
  const nameMsg = name === '' ? 'כתבו את שם הצמח, למשל "פיקוס".'
    : !/^[֐-׿a-zA-Z\s'"-]{2,30}$/.test(name) ? 'כתבו שם של 2 עד 30 אותיות, בלי מספרים או סימנים.' : '';
  const countMsg = $('plantCount').validity.badInput || (count !== '' && (!/^\d+$/.test(count) || +count < 1 || +count > 99))
    ? 'הזינו מספר שלם בין 1 ל-99.' : count === '' ? 'כתבו בכמה צמחים אתם מטפלים.' : '';
  return [
    setError($('plantName'), $('plantNameError'), nameMsg),
    setError($('plantCount'), $('plantCountError'), countMsg),
    setError(null, $('whenError'), picked('when').length ? '' : 'בחרו תשובה אחת.'),
    setError(null, $('checkError'), picked('check').length ? '' : 'בחרו תשובה אחת.'),
    setError(null, $('lightError'), picked('light').length ? '' : 'בחרו תשובה אחת.'),
    setError(null, $('potError'), picked('pot').length ? '' : 'בחרו לפחות תשובה אחת.')
  ].every(Boolean);
}

function validateClosing() {
  return [
    setError(null, $('causeError'), picked('cause').length ? '' : 'בחרו תשובה אחת.'),
    setError(null, $('checksError'), picked('checks').length ? '' : 'בחרו לפחות תשובה אחת.')
  ].every(Boolean);
}

// Each answer adds a "keep" item or an "improve" tip
const habitTips = {
  when: {
    schedule: ['improve', 'השקיה ביום קבוע לא מתחשבת בכך שהצמח צורך פחות מים בחורף, באור חלש או בעציץ גדול. לפני כל השקיה בדקו את האדמה בעומק של פרק אצבע.'],
    looks: ['improve', 'נבילה יכולה להופיע גם ממחסור במים וגם מעודף מים שפגע בשורשים. אם משקים צמח שכבר רטוב, המצב עלול להחמיר, לכן בדקו את האדמה לפני שמשקים.'],
    soil: ['keep', 'אתם משקים לפי מצב האדמה, וזו הדרך המדויקת ביותר לדעת אם הצמח צריך מים.']
  },
  check: {
    never: ['improve', 'בדיקת אדמה לוקחת שנייה: נוגעים בעומק פרק אצבע, או מרימים את העציץ ומרגישים כמה הוא כבד.'],
    sometimes: ['improve', 'כשבודקים רק כשמשהו נראה לא בסדר, הבעיה כבר התחילה. בדיקה קבועה לפני השקיה עוזרת למנוע אותה.'],
    always: ['keep', 'אתם בודקים את האדמה לפני כל השקיה. זה ההרגל החשוב ביותר.']
  },
  light: {
    direct: ['improve', 'בדקו אם הצמח שלכם אוהב שמש ישירה. צמחי בית רבים מעדיפים אור בהיר בלי שמש ישירה, ווילון שקוף יכול לסנן את האור.'],
    bright: ['keep', 'אור בהיר ועקיף מתאים לרוב צמחי הבית.'],
    dim: ['improve', 'באור חלש הצמח צורך פחות מים, ולכן קל להשקות אותו יותר מדי. שקלו מקום מואר יותר.'],
    moved: ['improve', 'אחרי מעבר למקום חדש הצמח צריך זמן להסתגל. אם המקום החדש מואר יותר, העבירו אותו בהדרגה ועקבו אחרי העלים.']
  },
  pot: {
    holes: ['keep', 'לעציץ יש חורי ניקוז, ועודפי המים יכולים לצאת.'],
    saucer: ['keep', 'אתם מרוקנים את הצלחת, כך שהשורשים לא עומדים במים.'],
    cachepot: ['improve', 'בעציץ בלי חורים המים מצטברים בתחתית והשורשים לא מקבלים אוויר. שתלו את הצמח בעציץ עם חורים, והכניסו אותו לעציץ הנוי.'],
    unknown: ['improve', 'כדאי לבדוק אם יש לעציץ חורי ניקוז. בלעדיהם עודפי המים נשארים בתחתית ועלולים לפגוע בשורשים.']
  }
};

// Closing case: graded questions (correct / partial / wrong)
const quiz = { cause: 'under', checks: ['soil', 'weight'] };
function gradeQuiz() {
  const causeOk = picked('cause')[0] === quiz.cause;
  const chosen = picked('checks');
  const hits = chosen.filter((v) => quiz.checks.includes(v)).length;
  // checks: all right and nothing extra = 1, some right = 0.5, none = 0
  const checks = hits === quiz.checks.length && chosen.length === hits ? 1 : hits ? 0.5 : 0;
  return { score: (causeOk ? 1 : 0) + checks };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateHabits()) {
    showFeedback($('habitsFeedback'), 'danger', 'חסרות תשובות או שיש תשובה לא תקינה. תקנו את השדות המסומנים ושלחו שוב.');
    focusFirstInvalid(form);
    return;
  }
  const tips = { keep: [], improve: [] };
  ['when', 'check', 'light', 'pot'].forEach((q) => picked(q).forEach((v) => {
    const [kind, text] = habitTips[q][v];
    tips[kind].push(text);
  }));
  if (+$('plantCount').value > 5) tips.improve.push('עם כמה צמחים, בדקו כל עציץ בנפרד. כל צמח, עציץ ומיקום מתייבשים בקצב אחר.');
  const list = (items) => `<ul class="mb-0">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  const name = $('plantName').value.trim();
  showFeedback($('habitsFeedback'), 'light border',
    `<h3 class="card-title-text h5">הטיפול ב${name} שלכם: מה כבר עובד ומה כדאי לשפר</h3>` +
    (tips.keep.length ? `<p class="fw-bold mb-1 mt-3">מה כבר עובד</p>${list(tips.keep)}` : '') +
    (tips.improve.length ? `<p class="fw-bold mb-1 mt-3">מה כדאי לשפר</p>${list(tips.improve)}` : '<p class="mt-3 mb-0">ההרגלים שלכם כבר מצוינים. המשיכו כך!</p>') +
    '<p class="small mt-3 mb-0">הטיפים כלליים ולא מאבחנים צמח מסוים. אם הצמח נראה חולה, פנו לצוות המשתלה.</p>');
  reportProgress('habits');
  firstTry.habits ??= [ // only the first valid submission goes to the report (sent with the unit)
      { id: 'Q06_habits_plant_name', type: 'fill-in', response: name, result: 'neutral' },
      { id: 'Q07_habits_number_of_plants', type: 'numeric', response: $('plantCount').value.trim(), result: 'neutral' },
      ...['when', 'check', 'light', 'pot'].map((q, i) => ({
        id: ['Q08_habits_when_to_water', 'Q09_habits_soil_check', 'Q10_habits_plant_location', 'Q11_habits_pot_drainage'][i],
        type: 'fill-in', response: answerText(q), result: 'neutral'
      }))
  ];
  updateSubmitState();
});

closingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (firstTry.closing) return; // one check: answers lock after it
  if (!validateClosing()) {
    $('closingFeedback').innerHTML = '';
    focusFirstInvalid(closingForm);
    return;
  }
  closingForm.querySelectorAll('input, button[type="submit"]').forEach((el) => { el.disabled = true; });
  const result = gradeQuiz();
  const causeOk = picked('cause')[0] === quiz.cause;
  const rightOf = (i) => (i.name === 'cause' ? i.value === quiz.cause : quiz.checks.includes(i.value));
  firstTry.closing = { score: result.score, causeOk, checksScore: result.score - causeOk, // total = cause (0/1) + checks (0/0.5/1)
    cause: answerText('cause'), checks: answerText('checks'),
    causePattern: answerText('cause', rightOf), checksPattern: answerText('checks', rightOf) };
  // Answer shows at once: right options and wrong picks are marked on the form itself, plus a short why
  closingForm.querySelectorAll('[name="cause"], [name="checks"]').forEach((input) => {
    input.closest('.form-check').classList.toggle('is-answer', rightOf(input));
    input.closest('.form-check').classList.toggle('is-miss', !rightOf(input) && input.checked);
  });
  showNote($('closingFeedback'), 'מחסור במים: השקיה לא סדירה ליד מקור חום מייבשת את האדמה מהר. כדי לא לבלבל עם השקיית יתר, בודקים את האדמה בעומק פרק אצבע ואת משקל העציץ.');
  progress.quizScore = result.score;
  reportProgress('closing');
});

/* ===== Unit submit: enabled after one attempt in every part; sends everything once ===== */
// [section anchor, label, tried once?]; the "left" line links to each missing part
const PARTS = [
  ['mystery', 'תיק הצמח המסתורי', () => firstTry.mystery.length === steps.length],
  ['practice', 'עזרו לחבר!', () => Boolean(firstTry.sorting)],
  ['closing-case', 'מקרה לסיום', () => Boolean(firstTry.closing)],
  ['habits', 'איך אתם מטפלים בצמחים שלכם?', () => Boolean(firstTry.habits)]
];

function updateSubmitState() {
  if (lms.unitSent) return;
  const missing = PARTS.filter(([, , done]) => !done());
  $('submitUnit').disabled = missing.length > 0;
  $('submitHint').textContent = missing.length
    ? 'הכפתור ייפתח אחרי שתנסו כל חלק ביחידה.'
    : 'ניסיתם את כל החלקים. אפשר להגיש.';
  $('submitMissing').hidden = !missing.length;
  $('submitMissing').innerHTML = missing.length
    ? `<strong>נשאר:</strong> ${missing.map(([id, label]) => `<a href="#${id}">${label}</a>`).join(', ')}`
    : '';
}

$('submitUnit').addEventListener('click', () => {
  if (lms.unitSent || $('submitUnit').disabled) return; // double click: report once
  lms.unitSent = true;
  $('submitUnit').disabled = true;
  const [m1, m2] = firstTry.mystery;
  const { sorting: sort, closing } = firstTry;
  // Three graded parts, a third each (SCORM_SPEC.md part 5)
  const score = Math.round(((m1.ok + m2.ok) / 2 + sort.correct / 6 + closing.score / 2) / 3 * 100);
  const sent = sendInteractions([
    { id: 'Q01_mystery_what_to_check_first', type: 'fill-in', response: m1.response, pattern: m1.pattern, result: resultOf(+m1.ok) },
    { id: 'Q02_mystery_likely_cause', type: 'fill-in', response: m2.response, pattern: m2.pattern, result: resultOf(+m2.ok) },
    { id: 'Q03_sorting_cases_to_causes', type: 'fill-in', response: sort.response, pattern: sort.pattern, result: resultOf(sort.correct / 6) },
    { id: 'Q04_closing_likely_cause', type: 'fill-in', response: closing.cause, pattern: closing.causePattern, result: resultOf(+closing.causeOk) },
    { id: 'Q05_closing_what_to_check', type: 'fill-in', response: closing.checks, pattern: closing.checksPattern, result: resultOf(closing.checksScore) },
    ...firstTry.habits
  ]);
  const saved = sendScore(score) && sent;
  // The learner gets thanks only; the score goes to the LMS (SCORM_SPEC.md part 5)
  const note = !lms.canSave ? '<strong>תודה שהשלמתם את הלומדה!</strong> הלומדה פתוחה כאן לתרגול בלבד, ולכן התשובות לא נשלחו למרצה.'
    : saved ? '<strong>תודה!</strong> הלומדה נשלחה למרצה. אפשר לסגור את החלון.'
      : '<strong>משהו השתבש והלומדה לא נשלחה.</strong> צלמו את המסך ופנו למרצה.';
  $('submitHint').textContent = '';
  $('submitMissing').hidden = true;
  showNote($('submitFeedback'), note);
  if (lms.canSave && !saved) $('submitFeedback').firstChild.classList.add('is-error');
});
updateSubmitState();
