# Happy2Help — judges' pitch (≈90 s) + live-demo narration

All people, schools, rooms and reports in the demo are **fictional**. Say so once at the start.

## Pitch (English, ~90 s)

**Problem (15 s).** For many students the hardest step is asking for help. Bullying, fear, a situation they
cannot put into words. Reports get lost in corridors, chat groups and phone calls, and the student never knows
whether anyone heard.

**Solution (15 s).** Happy2Help is an open-source erxes plugin for school safety and student support. A student
picks where it happened on the school map or scans a zone QR, sends a red SOS in two taps, and the right adults
see it immediately. Teachers acknowledge, assign a responsible adult, coordinate in a staff-only room, and the
student sees who is responding, in Mongolian, on a phone.

**Proof (35 s) — live, fictional data.** Student phone: map → 2nd-floor corridor → red "Яаралтай SOS" → sent.
Teacher laptop: red critical queue → open → map shows the corridor → acknowledge → assign the social worker →
reply in the student chat → note in the staff-only room. Student phone: "Багш хүлээн авсан", the responders'
names and the teacher's message appear. Council, Patrol and Care are the same product: a proposal and vote, a
patrol shift with a QR check-in, a confidential nurse request.

**Why it matters, AI and open source (20 s).** Everything is server-authorized: tenant, school, role. Students
never see staff notes, Council and Patrol never see case data. Happy AI uses the open-weight **Gemma 4** model to
draft a teacher-only summary after the SOS is already saved: the AI never blocks a report and never decides.
The plugin runs on erxes' official SDK and the whole repository is AGPL-3.0 on GitHub.

**Close (5 s).** Every student deserves to be heard. Сурагч бүр сонсогдох эрхтэй.

## Live-demo narration (Mongolian / English cue cards)

1. «Тэмүүлэн, 8Б» — Нүүр → Зураг → 2-р давхар → «2-р давхрын коридор» → «Энэ байршлаас SOS илгээх».
2. «Яаралтай аюул / Зодоон», «Одоо аюулд байна» → илгээх → «Хүсэлт илгээгдлээ».
3. «Уянга багш» (laptop) — улаан самбар → нээх → зураг дээр коридор → «Хүлээн авснаа батлах» → «Ариунаа» томилох.
4. «Сурагчтай чат» → хариу бичих. «Хариуцагчдын чат» → дотоод тэмдэглэл (сурагч харахгүй — smoke test T04).
5. Student phone refresh → «Багш хүлээн авсан», хариуцагчид, багшийн мессеж.
6. Happy AI card: show honestly (READY if the provider had capacity; otherwise FAILED · QUOTA with retry).
7. 20 s each: Council vote, Patrol QR check-in, Care request.

## What NOT to say
- Not "deployed in erxes": the plugin is built on the official SDK and registers through Redis service discovery,
  but gateway composition at an erxes host is not verified on this laptop.
- Not "AI analysed the case" unless the card shows READY with a Gemma model id.
- Not an emergency service. Human response is always required.
