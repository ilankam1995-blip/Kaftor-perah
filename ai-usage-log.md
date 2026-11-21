# נספח תיעוד שימוש ב-AI

טבלה נפרדת לכל כלי, לפי נספח התיעוד בהנחיות. שימוש נוסף באותו כלי מקבל שורות "מטרה" ו"פרומפט מרכזי" משלו.

## Gemini
| שדה | פירוט |
|---|---|
| שם הכלי + לינק | Gemini – https://gemini.google.com |
| המודל | מודל ברירת המחדל של הגרסה החינמית (נובמבר 2026) |
| גרסה חינמית / רישיון בתשלום | חינמית |
| מטרת השימוש | יצירת תמונות של שלושת סוגי הפגיעה (13.11.2026) |
| פרומפט מרכזי: צריבת שמש (images/sunburn-leaf.jpg) | A highly realistic macro photograph of a houseplant leaf damaged by excessive direct sunlight. The leaf has distinct pale beige and light brown dry patches, especially on the areas exposed to sunlight. The damaged areas look slightly crispy and sun-scorched, while the rest of the leaf remains green. Natural daylight, realistic botanical details, professional plant care photography. No text, no labels, no hands, no watermark. |
| פרומפט מרכזי: השקיית יתר (images/overwatering-leaf.jpg) | A highly realistic photograph of a potted houseplant showing signs of overwatering. Several leaves are yellowing and slightly drooping, while the soil in the pot is visibly dark, wet, and moist. The plant should look stressed but not dead. Make both the yellowing leaves and the wet soil clearly visible in the frame. Natural soft daylight, professional gardening photography. No text, no labels, no hands, no watermark. |
| פרומפט מרכזי: מחסור במים (images/underwatering-plant.jpg) | A highly realistic photograph of a potted houseplant showing signs of underwatering. The leaves are visibly wilted, drooping, slightly curled, and losing their firmness. The soil surface in the pot looks very dry, light-colored, and slightly cracked. Make both the wilted leaves and dry soil clearly visible. Natural soft daylight, professional gardening photography. No text, no labels, no hands, no watermark. |

## ChatGPT
| שדה | פירוט |
|---|---|
| שם הכלי + לינק | ChatGPT – https://chatgpt.com |
| המודל | מודל ברירת המחדל של הגרסה החינמית (נובמבר 2026) |
| גרסה חינמית / רישיון בתשלום | חינמית |
| מטרת השימוש 1 | יצירת תמונת ה-Hero (images/healthy-plant-hero.jpg) |
| פרומפט מרכזי 1 | "ואני רוצה תמונה של עציץ בריא להירו סקשן" |
| מטרת השימוש 2 | יצירת תמונת קטע הסיכום (images/closing-plant.jpg), 15.11.2026 |
| פרומפט מרכזי 2 | "תכין לי תמונה של עציץ יפה בשביל המקטע סיכום של האתר. אני רוצה שזה יהיה לרוחב ושהעציץ יהיה בצד שמאל כדי שבימין יהיה לי מקום לשים את המלל" |
| מטרת השימוש 3 | הכנת חומר מידע מורחב על טיפול נכון בצמחי בית, על בסיס החומרים שהעלינו. החומר שימש מקור לסרטון ב-NotebookLM |
| פרומפט מרכזי 3 | "אני רוצה להביא לנוטבוק שיכין לי סרטון איך לטפל בצמחים תכתוב לי את הפרטים את כל המידע שאני צריכה שיוצג שם" |

## Magnific
| שדה | פירוט |
|---|---|
| שם הכלי + לינק | Magnific – https://magnific.ai |
| המודל | מודל ברירת המחדל של הגרסה החינמית (נובמבר 2026) |
| גרסה חינמית / רישיון בתשלום | חינמית |
| מטרת השימוש | יצירת טפט הרקע (images/jungle-wallpaper.jpg) |
| פרומפט מרכזי | A seamless tropical wallpaper pattern featuring a repeating motif of small brown monkeys and vibrant orange birds nestled among lush, oversized green palm leaves. The monkeys are depicted in playful poses, some with small red flowers on their heads, while the birds are perched on the foliage. The background is a soft, off-white textured surface, creating a vintage, botanical illustration aesthetic with a balanced, rhythmic composition. |

## NotebookLM
| שדה | פירוט |
|---|---|
| שם הכלי + לינק | NotebookLM – https://notebooklm.google.com |
| המודל | מודל ברירת המחדל של הגרסה החינמית (נובמבר 2026) |
| גרסה חינמית / רישיון בתשלום | חינמית |
| מטרת השימוש | יצירת הסרטון "איך שומרים על צמח בריא?" (videos/plant-care-tips.mp4), 13.11.2026. כתוביות בעברית צרובות בסרטון |
| מקור והנחיה | המקור שהוזן: חומר המידע על טיפול בצמחים שהכין ChatGPT (ראו ChatGPT, שימוש 3). הנחיות הסרטון: prompts/video-prompt.md |

## Claude (Claude Code)
| שדה | פירוט |
|---|---|
| שם הכלי + לינק | Claude – https://claude.ai |
| המודל | Claude Opus 5.5 |
| גרסה חינמית / רישיון בתשלום | רישיון בתשלום |
| מטרת השימוש 1 | ניתוח הבריף וההנחיות, תכנון מבנה האתר, כתיבת HTML, CSS ו-JS, ניסוח טקסטים הדרכתיים ומדריך בדיקות (TESTING.md), 11-15.11.2026 |
| פרומפט מרכזי 1 | "אני רוצה לבצע שדרוג ושיפור לאתר הקיים שלי בנושא זיהוי פגיעות בצמחי בית, עבור משתלת 'כפתור ופרח'. חשוב: אני רוצה שתעבוד על הקוד הקיים ותשפר אותו, ולא תבנה אתר חדש מאפס... כרגע יש באתר חזרתיות רבה... אני רוצה להפוך את האתר ליחידת למידה מעניינת ומגוונת יותר" (13.11.2026; קטע מתוך פרומפט ארוך שפירט כל אזור באתר) |
| מטרת השימוש 2 | תיק הצמח המסתורי: השאלה הראשונה מופיעה מיד, בלי ללחוץ פעמיים על "גלו רמז נוסף" (js/main.js, 15.11.2026) |
| פרומפט מרכזי 2 | "אני רוצה לבצע שינוי בחלק של תיק הצמח המסתורי ככה שלא צריך ללחוץ הצג רמז פעמיים אלא שהשאלה תופיע מיד" |
| מטרת השימוש 3 | קטע הסיכום: הסרת האימוג'י והציור והצגת התמונה כרקע כמו ב-Hero (index.html, css/style.css, 15.11.2026) |
| פרומפט מרכזי 3 | "בפסקת סיום תוריד את האימוג'י של העציץ שליד הטקסט וגם את הציור בצד שמאל ובמקום שים את התמונה הזאת באותו אופן ששמת ב HERO SECTION" |
| מטרת השימוש 4 | מעבר סופי על האתר מול הנחיות המטלה: חיווי לתשובה חלקית ושגויה במשחק המיון, קרדיט ל-ChatGPT ב-footer, העברת ה-Hero לתוך ה-header, מקרה מסכם עם תשובה נכונה/חלקית/שגויה בטופס וטיוטת דוח זכויות יוצרים (15.11.2026) |
| פרומפט מרכזי 4 | "כעת האתר הושלם ואני רוצה שתעשה מעבר אחרון על ההנחיות ותבדוק אם האתר שיצרת עומד בהנחיות במלואו", ובהמשך: "אשמח שתשנה בהתאם להנחיות את שתי הנקודות שבודק קפדן עלול להעיר עליהן" |
| מטרת השימוש 5 | עיצוב הלוגו של המשתלה (SVG בתוך index.html) |
| פרומפט מרכזי 5 | הלוגו נוצר כחלק מבניית האתר (ראו פרומפט מרכזי 1) |
| מטרת השימוש 6 | הצעת בדיקות QA: שם הרכיב, צעדי הבדיקה והתוצאה הצפויה בתבנית ה-QA (qa/qa-table.docx). את העמודות "למה בחרנו", "מה קרה בפועל" ו"מה החלטנו" הצוות כתב בעצמו, בלי AI (15.11.2026) |
| פרומפט מרכזי 6 | "אתה יכול להמשיך לטופס של ה QA שאתה מבצע לפי ההנחיות ולפרט את הבדיקות שאתה מבצע שם" |

טבלת ה-QA (תבנית תיעוד QA וקבלת החלטות) נכתבת על ידי הצוות בלבד, במילים שלכם, בלי AI.
