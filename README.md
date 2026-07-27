# Peak Load Prediction Game

An interactive game where team members predict Ontario's daily peak electricity load. Built with the same BluWave-ai branding as the FIFA World Cup 2026 prediction pool.

## Setup

### 1. Create the Google Sheet

Create a new Google Sheet with **3 tabs** (exact names matter):

#### Tab: `Config`
| Row | A | B |
|-----|---|---|
| 1   | gameName | Peak Load Prediction |
| 2   | description | Ontario Peak Load Prediction Game |

#### Tab: `Rounds`
| A (roundId) | B (date) | C (deadline) | D (actualValue) | E (isActive) |
|---|---|---|---|---|
| round-1 | 2026-07-15 | 2026-07-15T12:00:00 | 25.65 | FALSE |
| round-2 | 2026-07-18 | 2026-07-18T12:00:00 | 22.13 | FALSE |
| round-3 | 2026-07-28 | 2026-07-28T14:00:00 | | TRUE |

- **roundId**: Unique identifier (e.g., `round-1`, `round-2`, etc.)
- **date**: The date being predicted (the actual day)
- **deadline**: ISO datetime when submissions close (e.g., morning of that day)
- **actualValue**: Fill this in AFTER the day is over with the real peak load (leave empty until then)
- **isActive**: Set ONE row to `TRUE` — that's the round currently accepting submissions

#### Tab: `Submissions`
| A (userName) | B (roundId) | C (prediction) | D (submittedAt) |
|---|---|---|---|
| *(auto-filled by the app)* | | | |

Just create the headers row — the app fills in data as people submit.

### 2. Pre-load Your Existing Data

You already have 2 completed rounds from `load.txt`. Enter them into the **Rounds** tab:

| roundId | date | deadline | actualValue | isActive |
|---|---|---|---|---|
| round-1 | 2026-07-15 | 2026-07-15T12:00:00 | 25.65 | FALSE |
| round-2 | 2026-07-18 | 2026-07-18T12:00:00 | 22.13 | FALSE |

Then enter the past submissions into the **Submissions** tab:

**Round 1 (Tuesday):**
| userName | roundId | prediction | submittedAt |
|---|---|---|---|
| Danish | round-1 | 26.17 | 2026-07-15T10:00:00 |
| Rob | round-1 | 26.18 | 2026-07-15T10:00:00 |
| Dev | round-1 | 25.75 | 2026-07-15T10:00:00 |
| Muhammad | round-1 | 26.75 | 2026-07-15T10:00:00 |
| Ryan | round-1 | 25.98 | 2026-07-15T10:00:00 |
| Aneta | round-1 | 26.24 | 2026-07-15T10:00:00 |
| Craig | round-1 | 25.88 | 2026-07-15T10:00:00 |
| Carter | round-1 | 25.65 | 2026-07-15T10:00:00 |
| Yann | round-1 | 26.27 | 2026-07-15T10:00:00 |
| Alex | round-1 | 25.30 | 2026-07-15T10:00:00 |
| Hubert | round-1 | 25.92 | 2026-07-15T10:00:00 |
| Shan | round-1 | 25.80 | 2026-07-15T10:00:00 |
| Kavya | round-1 | 26.48 | 2026-07-15T10:00:00 |
| Michael | round-1 | 25.99 | 2026-07-15T10:00:00 |
| Colin | round-1 | 26.87 | 2026-07-15T10:00:00 |
| James | round-1 | 26.00 | 2026-07-15T10:00:00 |
| Saurabh | round-1 | 24.90 | 2026-07-15T10:00:00 |

**Round 2 (Friday):**
| userName | roundId | prediction | submittedAt |
|---|---|---|---|
| Danish | round-2 | 21.85 | 2026-07-18T10:00:00 |
| Alex | round-2 | 20.99 | 2026-07-18T10:00:00 |
| Dev | round-2 | 21.22 | 2026-07-18T10:00:00 |
| Carter | round-2 | 21.66 | 2026-07-18T10:00:00 |
| Muhammad | round-2 | 21.67 | 2026-07-18T10:00:00 |
| Craig | round-2 | 21.87 | 2026-07-18T10:00:00 |
| Rob | round-2 | 21.85 | 2026-07-18T10:00:00 |
| Michael | round-2 | 21.65 | 2026-07-18T10:00:00 |
| Shan | round-2 | 21.75 | 2026-07-18T10:00:00 |
| Aneta | round-2 | 21.46 | 2026-07-18T10:00:00 |
| Hubert | round-2 | 21.56 | 2026-07-18T10:00:00 |
| James | round-2 | 21.90 | 2026-07-18T10:00:00 |

### 3. Deploy the Google Apps Script

1. Open the Google Sheet → **Extensions → Apps Script**
2. Delete the default code and paste the contents of `google-apps-script/Code.gs`
3. Click **Deploy → New deployment**
4. Choose **Web app**
5. Set **Execute as**: Me, **Who has access**: Anyone
6. Click **Deploy** and copy the URL
7. Paste that URL into `js/config.js` replacing `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

### 4. Adding New Rounds

To add a new prediction day:
1. Add a new row to the **Rounds** tab
2. Set `isActive` = `TRUE` on the new row
3. Set `isActive` = `FALSE` on all other rows
4. When the day is over, fill in `actualValue` with the real peak load

### 5. Serve Locally

```bash
python -m http.server 8085
```

Then open `http://localhost:8085`

## Pages

- **index.html** — Login + prediction slider (main game)
- **submissions.html** — See who submitted (predictions locked with 🔒 until deadline)
- **leaderboard.html** — Cumulative deviation ranking (lowest = best)

## Scoring

- **Deviation** = |Your Prediction − Actual Peak Load|
- **Total** = Sum of deviations across all rounds
- **Rank** = Lowest total deviation = #1
- **Tiebreaker**: More rounds participated wins
