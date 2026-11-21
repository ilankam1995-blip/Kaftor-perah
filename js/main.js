'use strict';

/* ===== Shared helpers ===== */
const $ = (id) => document.getElementById(id);

// Render a Bootstrap alert (type: success | danger | warning | light) into a live region
function showFeedback(container, type, html) {
  container.innerHTML = `<div class="alert alert-${type} m-0">${html}</div>`;
}

/* ===== SCORM 1.2 connection (milestone 1: connect, learner name, outside-LMS behavior) ===== */
const LMS_TEXT = {
  outside: 'היחידה פועלת מחוץ למערכת הקורס: אפשר לתרגל, אבל התשובות והציון לא יישמרו.',
  review: 'זהו מצב צפייה: אפשר לעבור על היחידה, אבל התשובות לא יישמרו.',
  fallbackName: 'לומדת/לומד יקר/ה'
};
// connected: init succeeded · canSave: connected and not in review/browse mode · ended: quit already called
const lms = { connected: false, canSave: false, ended: false };

// Guarded read: never touches the API outside the LMS
function scormGet(field) {
  return lms.connected ? String(pipwerks.SCORM.get(field) || '') : '';
}

// Moodle returns "Last, First"; show "First Last". No comma: show as is. Empty: fallback
function formatLearnerName(raw) {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length ? (parts.length > 1 ? `${parts.slice(1).join(' ')} ${parts[0]}` : parts[0]) : LMS_TEXT.fallbackName;
}

function showLmsNotice(text) {
  $('lmsNotice').textContent = text;
  $('lmsNotice').hidden = false;
}

function initLms() {
  if (window.pipwerks) {
    pipwerks.SCORM.version = '1.2'; // look only for the SCORM 1.2 API
    lms.connected = pipwerks.SCORM.init(); // wrapper sets lesson_status = incomplete on first entry
  }
  if (!lms.connected) return showLmsNotice(LMS_TEXT.outside);
  const mode = scormGet('cmi.core.lesson_mode'); // normal | review | browse
  lms.canSave = mode !== 'review' && mode !== 'browse';
  if (!lms.canSave) showLmsNotice(LMS_TEXT.review);
  $('learner-name').textContent = formatLearnerName(scormGet('cmi.core.student_name'));
}

// Close the session exactly once (pagehide and beforeunload may both fire)
function endLmsSession() {
  if (!lms.connected || lms.ended) return;
  lms.ended = true;
  pipwerks.SCORM.quit(); // wrapper sets cmi.core.exit (suspend/logout) and saves before LMSFinish
}

initLms();
window.addEventListener('pagehide', endLmsSession);
window.addEventListener('beforeunload', endLmsSession);

// Single place for completion reporting (SCORM hook for stage 2)
const progress = { mystery: false, sorting: false, closing: false, habits: false };
function reportProgress(part) {
  progress[part] = true;
  // TODO stage 2: send progress to the LMS via the SCORM API
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
const caseEnd = '<strong>מה מיכל יכולה לעשות?</strong> לחכות שהאדמה תתייבש מעט לפני ההשקיה הבאה, לרוקן את המים שהצטברו ולשתול את הפיקוס בעציץ עם חורי ניקוז, שאותו אפשר להכניס לעציץ הנוי. שימו לב שהמסקנה התבססה על כמה בדיקות יחד ולא על הסימן לבדו. אם הצמח ממשיך להיחלש, כדאי לפנות לצוות המשתלה.';
let clueCount = 1;
let step = 0;

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
}

$('caseOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('.case-option');
  if (!btn) return;
  const option = steps[step].options[btn.dataset.index];
  $('caseOptions').querySelectorAll('.case-option').forEach((b) => { b.className = 'case-option'; b.setAttribute('aria-pressed', 'false'); });
  btn.classList.add(option.good ? 'is-good' : 'is-weak');
  btn.setAttribute('aria-pressed', 'true');
  const last = step === steps.length - 1;
  showFeedback($('caseFeedback'), option.good ? 'success' : 'danger', option.why + (option.good && last ? `<hr>${caseEnd}` : ''));
  $('caseNext').hidden = !option.good || last;
  $('caseRestart').hidden = !(option.good && last);
  if (option.good && last) reportProgress('mystery');
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
    showFeedback($('sortFeedback'), 'warning', `נשארו ${unsorted} כרטיסיות שעדיין לא מוינו. מיינו את כולן ואז לחצו על "בדיקה".`);
    return;
  }
  let correct = 0;
  cards.forEach((c) => {
    const ok = choiceOf(c) === c.dataset.answer;
    c.classList.add(ok ? 'is-correct' : 'is-wrong');
    c.querySelector('.sort-mark').textContent = ok ? '✓ במקום הנכון' : '✗ לא במקום הנכון';
    correct += ok;
  });
  if (correct === cards.length) {
    showFeedback($('sortFeedback'), 'success', '<strong>מעולה! מיינתם נכון את כל ששת המקרים.</strong> שמתם לב לפרטים של כל מקרה, ולא רק לסימן עצמו.');
    reportProgress('sorting');
  } else {
    // Partial (some right) gets a warning, all wrong gets danger; the tip is shared
    const tip = 'בכרטיסיות המסומנות כדאי לחפש את הפרט שמבדיל בין הגורמים, למשל מצב האדמה, סוג העציץ או שינוי במיקום.';
    showFeedback($('sortFeedback'), correct ? 'warning' : 'danger', correct
      ? `<strong>כמעט! מיינתם נכון ${correct} מתוך ${cards.length} מקרים.</strong> ${tip}`
      : `<strong>אף מקרה לא מוין נכון הפעם.</strong> ${tip}`);
  }
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
const quiz = { cause: 'sun', checks: ['side', 'soil'] };
const verdicts = { correct: 'תשובה נכונה', partial: 'תשובה חלקית', wrong: 'תשובה שגויה' };
function gradeQuiz() {
  const causeOk = picked('cause')[0] === quiz.cause;
  const chosen = picked('checks');
  const hits = chosen.filter((v) => quiz.checks.includes(v)).length;
  const checksVerdict = hits === quiz.checks.length && chosen.length === hits ? 'correct' : hits ? 'partial' : 'wrong';
  const line = (verdict, text) => `<p class="mb-2"><strong>${verdicts[verdict]}:</strong> ${text}</p>`;
  const html = line(causeOk ? 'correct' : 'wrong', causeOk
    ? 'צריבת שמש. הכתמים הופיעו זמן קצר אחרי מעבר לשמש ישירה, ורק בעלים שפונים לחלון.'
    : 'הגורם הסביר הוא צריבת שמש. דנה משקה כרגיל, והכתמים הופיעו רק בעלים שפונים לשמש מיד אחרי המעבר.') +
    line(checksVerdict, {
      correct: 'בדקתם גם איפה מופיעים הכתמים וגם את מצב האדמה, וכך שללתם גורמים אחרים.',
      partial: 'בחרתם חלק מהבדיקות הנכונות. כדאי לבדוק גם אם הכתמים רק בצד שפונה לשמש וגם את האדמה בעומק פרק אצבע. דשן ומחיר לא עוזרים לאבחן.',
      wrong: 'הבדיקות שעוזרות כאן הן איפה מופיעים הכתמים ומצב האדמה בעומק פרק אצבע. הוספת דשן היא פעולה ולא בדיקה, והמחיר לא קשור.'
    }[checksVerdict]);
  return { html, score: (causeOk ? 1 : 0) + (checksVerdict === 'correct' ? 1 : checksVerdict === 'partial' ? 0.5 : 0) };
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
});

closingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateClosing()) {
    showFeedback($('closingFeedback'), 'danger', 'חסרות תשובות. תקנו את השדות המסומנים ושלחו שוב.');
    focusFirstInvalid(closingForm);
    return;
  }
  const result = gradeQuiz();
  showFeedback($('closingFeedback'), 'light border',
    `<h3 class="card-title-text h5">התוצאה שלכם: ${result.score} מתוך 2</h3>${result.html}`);
  progress.quizScore = result.score;
  reportProgress('closing');
});
