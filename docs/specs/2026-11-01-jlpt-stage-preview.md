# JLPT stage content previews (2026-11-01)

## User request
Before starting a JLPT stage, briefly show which grammar patterns, vocabulary, or kanji it contains, alongside the existing item and question counts. Apply to extension and Android.

## Design
- Add a localized "Nội dung sẽ học" section to the existing stage sheet; keep current navigation and Start/Quiz buttons.
- Read actual items from the selected stage, not another part of the lesson. Show Japanese pattern/word/kanji and a short source-derived meaning or Sino-Vietnamese reading.
- Initially show six items; a compact "Show N more items" disclosure exposes the remainder without starting a session. Keep the section scrollable and controls reachable on small screens.
- Chapter/final tests show representative items across the tested types from their actual scope.
- UI labels support Vietnamese, English and Japanese. Source study content keeps its existing language. Render all database text through textContent.
- No network request, generated explanation, quiz randomization, progress write, or SRS changes when opening a preview.

## Validation
- Cloud Node checks against all five real course databases and both platform modules: stage scope, chapter/final scope, deterministic previews, brief text, and mirror parity.
- Chromium screenshots and interaction checks for grammar/vocabulary/kanji on desktop and mobile, English/Japanese labels, collapsed/expanded content, small viewport and dark mode.
- Existing progression, final unlock, wrong-card transfer and sync tests remain required.
