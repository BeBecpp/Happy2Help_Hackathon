# ASTRA_DESIGN_SYSTEM.md

## Happy2Help visual direction

Create a calm, distinctly school-focused mobile experience. The interface should feel like a trusted companion in a difficult moment: warm white surfaces, airy space, rounded shapes, small cheerful illustrations, and direct Mongolian language. The kitten is a reassuring guide, not a decorative character competing with the SOS action.

Avoid dense dashboards, dark sidebars, gradient-heavy hero sections, glass panels, generic analytics charts, and enterprise admin styling. Teacher screens should look like a focused support inbox.

All visible product copy must use **Mongolian Cyrillic**. “Happy2Help” may remain Latin as the brand. Do not ship English placeholders, validation text, empty states, or sample reports.

### Tokens

```css
:root {
  --navy: #0F2D5B;
  --sky: #5B9CFF;
  --sunshine: #FFD34D;
  --mint: #A7E3C1;
  --cloud: #F3F6FB;
  --white: #FFFFFF;

  --ink: #173153;
  --muted: #52667F;
  --line: #DCE5F0;
  --danger: #B43C45;
  --danger-soft: #FFF0F0;
  --success-ink: #175B47;
  --success-soft: #E7F7EF;

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-pill: 999px;

  --shadow-card: 0 8px 28px rgba(15, 45, 91, 0.07);
  --shadow-float: 0 16px 40px rgba(15, 45, 91, 0.13);
}
```

Use solid colors. Sky is for primary actions and selected states; navy carries headings and navigation; sunshine highlights warmth and attention; mint indicates acknowledgment. Red is reserved for errors and urgent semantic feedback, never the default SOS brand color.

### Typography

Use a font with reliable Mongolian Cyrillic coverage, such as **Noto Sans**. Load locally if the project already bundles fonts; otherwise use a system sans-serif fallback. Avoid overly rounded display fonts that weaken readability.

| Style | Size / line height | Weight | Use |
|---|---:|---:|---|
| Display | 32 / 39px | 700 | Student greeting or sign-in headline |
| Page title | 26 / 33px | 700 | Screen titles |
| Section title | 20 / 28px | 700 | Card and section headings |
| Body | 16 / 25px | 400 | Main copy and form text |
| Body strong | 16 / 25px | 600 | Labels and key information |
| Small | 14 / 21px | 400 | Supporting text and timestamps |
| Caption | 12 / 18px | 600 | Status and step labels |

At 390px, never reduce main body below 16px. Use left alignment for paragraphs. Limit long text blocks to about 60 characters per line on desktop.

### Spacing and surfaces

Use an 8px base grid with 4px adjustments. Standard gaps: 8, 12, 16, 24, 32, and 48px. Mobile page padding: 20px. Tablet: 32px. Desktop content max width: 1120px with 48px outer gutters. Student task flows should stay at 640px max width even on desktop.

Cards: white, 1px `--line` border, 24px radius, 20–24px internal padding. Use a soft shadow only on important raised cards. Inputs: minimum 52px tall. Primary buttons: minimum 56px tall, 16px label, 16px radius. All tap targets: at least 44×44px.

### Kitten and brand

The original mascot is a **white kitten with a blue scarf**. Its silhouette should have soft triangular ears, a small navy face, rounded paws, and a sky-blue scarf. Use one consistent illustration source or component in three approved poses:

1. **Welcome:** sitting, small wave, used on home and sign-in.
2. **Listening:** leaning toward a speech bubble, used on SOS form.
3. **Reassuring:** sitting beside a check or timeline marker, used after submission.

Keep the mascot on a cloud or pale yellow shape, never inside a glossy 3D orb. It should remain identifiable at 80px and have meaningful alternative text when informative. Decorative uses get empty alt text. Do not substitute a generic cat emoji as the final mascot.

The Happy2Help wordmark pairs navy lettering with a small sunshine accent, such as a yellow dot or star. Keep the logo compact in navigation; use the mascot as the main emotional visual.

### Navigation

**Student mobile:** a top bar with brand on the left and profile/sign-out action on the right. A bottom navigation bar has two destinations: “Нүүр” and “Миний хүсэлтүүд”. The SOS action sits prominently on Home and can also be a central raised action if the existing router supports it cleanly. Keep navigation visible on the student timeline but hide it during the focused SOS form if it crowds the viewport.

**Teacher mobile:** top bar with “Happy2Help” and role label “Багш”. Queue and detail are a simple forward/back flow. No sidebar.

**Tablet and desktop:** centered content with the same visual language. Teacher navigation may use a slim horizontal header with “Ирсэн хүсэлтүүд”, rather than an admin sidebar.

### 1. Student Home

**390px layout, top to bottom:**

- Safe-area-aware top bar, 64px tall.
- Greeting: “Сайн уу, [нэр]” and a short line: “Тусламж хэрэгтэй үед бид энд байна.”
- Hero card, pale cloud background, 24px radius. Kitten on the right or upper-right, occupying at most 35% width. Left side: “Чамайг сонсоход бэлэн” and one sentence: “Санаа зовж байгаа зүйлээ бидэнд хэлээрэй.”
- Full-width sky primary button: “Тусламж хүсэх”, with a simple heart or speech icon and arrow.
- Small neutral guidance line: “Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.”
- “Сүүлийн хүсэлт” section: one latest incident card with category, zone, submitted date, status pill, and “Дэлгэрэнгүй” link. If none, a small illustrated card: “Одоогоор хүсэлт байхгүй байна.”
- Bottom navigation.

The first viewport at 390×844 should show the greeting, hero, primary action, and start of the latest report section. The SOS button must never disappear below a large illustration.

**768px:** hero becomes a two-column card; latest report sits below. Content max width 680px.

**1440px:** centered 960px composition, hero on the left two-thirds and a latest report card on the right. Preserve generous white space; do not fill the canvas with extra metrics.

### 2. SOS submission

Use a short two-step flow: zone selection, then report. A small step indicator reads “1 / 2” and “2 / 2”. Keep a back action and reassuring line, “Хүсэлтээ өөрийнхөөрөө бичиж болно.”

Report screen order:

1. Heading: “Юу болсон бэ?”
2. Four category choices in a two-column grid at 390px: “Дээрэлхэлт”, “Аюултай орчин”, “Сэтгэл санаа”, “Бусад”. Each has a simple line icon, short label, 16px gap, and clearly selected sky border/background.
3. Textarea label: “Нэмж хэлэх зүйл байна уу? (заавал биш)”. Placeholder: “Чамд юу тохиолдсоныг товч бичээрэй”. Show character count only when typing. Maximum 1,000 characters.
4. Selected zone summary with an “Өөрчлөх” action.
5. Privacy and expectation note: “Чиний хүсэлтийг зөвхөн танай сургуулийн эрхтэй багш харна.”
6. Sticky bottom submit area with “Хүсэлт илгээх” button, respecting the mobile safe area.

On submit, disable repeat taps and show “Илгээж байна…”. On success, move to the incident timeline. On failure, keep all input and show an inline error: “Хүсэлтийг илгээж чадсангүй. Дахин оролдоно уу.” Retry uses the same request ID.

### 3. Incident status timeline

Header: “Миний хүсэлт” with back action. A status card shows the category, school zone, submitted time, and a large status pill:

- `SUBMITTED`: sunshine-tinted pill, “Илгээсэн”
- `ACKNOWLEDGED`: mint-tinted pill, “Багш хүлээн авсан”

Timeline is a vertical line with two steps. “Хүсэлт илгээгдсэн” is always complete. “Багш хүлээн авсан” is pending or complete with the actual time. Pending copy: “Багш таны хүсэлтийг харахыг хүлээж байна.” Acknowledged copy: “Багш таны хүсэлтийг хүлээн авлаа.” Do not claim the matter is solved.

Include a visible “Шинэчлэх” action. Provide a compact help note encouraging direct contact with a nearby trusted adult if danger is immediate. Description appears below the timeline if the student supplied one. Never show internal staff IDs.

### 4. Teacher incident dashboard

Call the screen **“Ирсэн хүсэлтүүд”**. Use an inbox composition with a calm header, school name, and two filter chips: “Шинэ” and “Хүлээн авсан”. Default to “Шинэ”. A count badge is acceptable; no charts.

Each incident card contains:

- Category icon and category label
- Zone name
- Relative submitted time plus full time in accessible text
- One-line description preview if present
- Status pill
- Clear “Дэлгэрэнгүй” affordance

Sort new incidents by oldest first if response order matters operationally; otherwise newest first is acceptable, but choose one consistent rule and display the timestamp. Avoid color as the only signal. At 390px use full-width stacked cards. At 768px, use a two-column card grid only if descriptions remain readable. At 1440px, use a 900px centered list; do not create a wide data table.

Empty state: kitten with small folder illustration and “Одоогоор шинэ хүсэлт алга”. Error state: “Хүсэлтүүдийг ачаалж чадсангүй” with “Дахин оролдох”.

### 5. Teacher incident detail

Header with back action and category. Main content:

1. Prominent status and submission time.
2. Zone card with location icon.
3. “Сурагчийн бичсэн зүйл” section. If blank: “Нэмэлт тайлбар оруулаагүй.”
4. Timeline of submission and acknowledgment.
5. Sticky bottom action for `SUBMITTED`: “Хүлээн авснаа батлах”. Include supporting text: “Энэ үйлдлийг сурагч өөрийн хүсэлтийн төлөвт харна.”
6. For `ACKNOWLEDGED`, replace action with a completed confirmation including timestamp.

The action should acknowledge, not imply resolution. Loading state disables the button; success updates detail and queue without requiring a full page reload. If another teacher acknowledged first, refetch and show the current state without an alarming error.

### 6. School zone picker

Title: “Хаана болсон бэ?” Subtitle: “Ойролцоо байршлыг сонгоорой.” Present large single-select cards with a location icon and school-specific zone name. Example fictional zones: “Анги”, “Коридор”, “Номын сан”, “Спорт заал”, “Сургуулийн хашаа”, “Бусад газар”. These are demo examples only; render zones returned by the plugin.

At 390px, one column, 12px gaps. Selected card has sky border, pale sky fill, and an explicit check icon. Sticky “Үргэлжлүүлэх” button remains disabled until selection. At 768px and above, use two columns within 680px. No interactive map in the MVP.

### 7. Sign-in

Centered mobile composition on white. Top: compact wordmark, kitten welcome pose, headline “Чамайг сонсоход бэлэн”, supporting copy “Сургуулийнхаа бүртгэлээр нэвтэрнэ үү.” Then the actual erxes-compatible sign-in control. The exact fields depend on existing authentication; do not invent a second credential store for the prototype.

At 390px, content width is viewport minus 40px, with the sign-in control visible without excessive scrolling. At 768px, a centered 440px card. At 1440px, a split composition is acceptable: illustration left, sign-in card right, but keep the form itself 440px or less.

Show validation beside the relevant field, a visible submit progress state, and a generic authentication failure message that does not reveal account existence.

### Interaction and motion

- Hover: subtle 2px lift and shadow increase on clickable cards; never required to discover an action.
- Press: scale to 0.98 for buttons, under 150ms.
- Screen transition: 180–240ms fade/translate of 8px.
- Timeline completion: one gentle 300ms highlight when status updates.
- Respect `prefers-reduced-motion: reduce`; remove translation and nonessential animation.
- No pulsing SOS button, auto-playing mascot animation, or celebratory effect after a safety report.

### Accessibility requirements

- WCAG AA text contrast. Check sky text on white; use navy text where sky is too light.
- Visible keyboard focus ring, at least 2px navy or sky with sufficient contrast.
- Semantic headings in order, labeled inputs, real buttons, and correct `aria-current` in navigation.
- Category and zone groups use radio semantics, with selected state announced.
- Status changes are announced politely via a live region; errors use an alert region.
- Do not rely on color alone for status. Always include text and icon.
- Support 200% text zoom without clipping or horizontal scrolling.
- Keep controls above mobile browser safe areas and the on-screen keyboard.
- Mascot alt text is meaningful only when it communicates content; otherwise decorative.
