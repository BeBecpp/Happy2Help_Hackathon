# Demo guide (fictional school «Нарлаг Ирээдүй сургууль (DEMO)»)

Start: `pnpm install && node tools/dev-stack.mjs` → http://localhost:3100 (one-tap fictional personas in dev-direct mode).

| Persona | Role | Use for |
|---|---|---|
| Тэмүүлэн · 8Б | student, patrol member | SOS, status, chat |
| Номин · 7б, Ану · 11а | students, council members | Council proposals and votes |
| Төгөлдөр · 10а | patrol member | Patrol check-in |
| Уянга багш | duty teacher (oversight) | inbox, acknowledge, assign |
| Бат багш | safeguarding lead, council moderator | approve proposals, staff room |
| Ганбаатар багш | patrol supervisor | create shifts |
| Мөнхзул эмч / Ариунаа / Сарнай | nurse / social worker / psychologist | Care requests, assignment |
| Ихбаяр, Сараа багш | second school «Гэрэлт Зам» | isolation checks |

## 90-second journey
1. Student: Нүүр → Зураг → 2-р давхар → «2-р давхрын коридор» → «Энэ байршлаас SOS илгээх» → «Яаралтай аюул / Зодоон» → «Одоо аюулд байна» → илгээх.
2. Teacher (Уянга): red critical queue → open → map highlight → «Хүлээн авснаа батлах» → assign Ариунаа → reply in «Сурагчтай чат» → note in «Хариуцагчдын чат».
3. Student: refresh → «Багш хүлээн авсан», responders, teacher's message.
4. Council (Номин): propose → Бат approves → Ану/Тэмүүлэн vote (duplicate rejected).
5. Patrol (Ганбаатар → Төгөлдөр): shift → QR / manual check-in → supervisor sees it.
6. Care (Тэмүүлэн → Мөнхзул эмч): request → nurse replies and acknowledges.

Film: `video/out/Happy2Help-Launch-Demo.mp4` (real recordings, fictional data). Screenshots: `artifacts/screenshots/`.
