# Study Stakes

A local study helper for finals. Upload lecture slides and notes, get auto-generated
questions, and bet coins on them. Spend your winnings on avatar items.

Everything runs on your machine: questions are generated and graded by a local
model through [Ollama](https://ollama.com), so nothing is uploaded anywhere.

## Run it

```bash
brew services start ollama   # once per reboot (if not already running)
npm run dev                  # opens API on :5174 and the app on http://localhost:5173
```

First-time setup on a new machine: `brew install ollama && ollama pull qwen3:8b && npm install`.

## How it works

- **Courses → upload** PDF, `.txt` or `.md` files. Text is extracted per page, grouped into
  ~3,500-character sections, and the model writes 6 questions per section (mix of multiple
  choice, true/false, short answer, numeric; 2 easy / 2 medium / 2 hard). Each question cites
  its source page. "Generate more" makes new, non-duplicate questions from the same file.
  Image-only/scanned pages have no text and are skipped (the app tells you how many).
- **Study**: pick a tier. The stake is taken when the question appears; a correct answer
  returns the stake plus the win, a wrong answer or skip loses it.

  | Tier   | Stake | Win  |
  |--------|-------|------|
  | Easy   | 10    | +15  |
  | Medium | 25    | +50  |
  | Hard   | 50    | +125 |

  True/False wins pay 80% of the stake so blind guessing loses money on average.
  Start: 200 coins. Daily allowance: +100 the first time you open the app each day.
- **Grading**: multiple choice / true-false are exact. Numeric answers accept ±1% (or the
  rounding the question asks for). Numeric answers are computed from an arithmetic
  expression rather than trusting the model's math. Short answers are graded by the model.
- **Review missed**: wrong answers drop a question to "box 0" (Leitner system) so it comes
  up more often; "Review missed" mode draws only those.
- **Shop & Avatar**: layered SVG character with background, shirt, hat, eyewear and pet slots.

## Tweaking

- Economy numbers: `shared/economy.js`
- Shop items: `shared/items.js` (drawings in `client/src/Avatar.jsx`)
- Generation prompt & grading: `server/generate.js`
- Different model: `OLLAMA_MODEL=llama3.1:8b npm run dev` (pull it first)
- Data lives in `data/` (SQLite + uploaded files). Delete that folder to reset everything.
