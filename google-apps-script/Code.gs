// ============================================================
// PEAK LOAD PREDICTION GAME - Google Apps Script Backend
// ============================================================
// Deploy this as a Web App in Google Apps Script.
// It reads/writes to the Google Sheet it's attached to.
// ============================================================

// Sheet names
const SHEET_ROUNDS = 'Rounds';
const SHEET_SUBMISSIONS = 'Submissions';
const SHEET_CONFIG = 'Config';

// Handle GET requests
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getConfig':
        result = getConfig();
        break;
      case 'getRounds':
        result = getRounds();
        break;
      case 'getActiveRound':
        result = getActiveRound();
        break;
      case 'getSubmissions':
        result = getSubmissions(e.parameter.roundId);
        break;
      case 'getLeaderboard':
        result = getLeaderboard();
        break;
      default:
        result = { error: 'Unknown action' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests
function doPost(e) {
  let result;

  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case 'submitPrediction':
        result = submitPrediction(data.userName, data.roundId, data.prediction);
        break;
      default:
        result = { error: 'Unknown action' };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// CONFIG
// ============================================================
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  const gameName = configSheet.getRange('B1').getValue();
  const description = configSheet.getRange('B2').getValue();
  return { gameName, description };
}

// ============================================================
// ROUNDS
// ============================================================
// Rounds sheet columns: roundId | date | deadline | actualValue | isActive
// - roundId: unique identifier (e.g., "round-1", "round-2")
// - date: the day being predicted (e.g., "2026-07-28")
// - deadline: ISO datetime when submissions lock (e.g., "2026-07-28T12:00:00")
// - actualValue: the real peak load (filled in after the day ends, empty until then)
// - isActive: TRUE/FALSE — which round is currently accepting submissions

function getRounds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ROUNDS);
  const data = sheet.getDataRange().getValues();

  const rounds = [];
  for (let i = 1; i < data.length; i++) {
    rounds.push({
      roundId: data[i][0].toString(),
      date: data[i][1] ? new Date(data[i][1]).toISOString() : '',
      deadline: data[i][2] ? new Date(data[i][2]).toISOString() : '',
      actualValue: data[i][3] !== '' ? parseFloat(data[i][3]) : null,
      isActive: data[i][4] === true || data[i][4] === 'TRUE'
    });
  }

  return { rounds };
}

function getActiveRound() {
  const { rounds } = getRounds();
  const active = rounds.find(r => r.isActive);
  return { activeRound: active || null };
}

// ============================================================
// SUBMISSIONS
// ============================================================
// Submissions sheet columns: userName | roundId | prediction | submittedAt

function submitPrediction(userName, roundId, prediction) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  // Validate round exists and deadline hasn't passed
  const { rounds } = getRounds();
  const round = rounds.find(r => r.roundId.toString() === roundId.toString());

  if (!round) {
    return { success: false, message: 'Round not found.' };
  }

  if (round.deadline && now > new Date(round.deadline)) {
    return { success: false, message: 'Submission deadline has passed!' };
  }

  if (!round.isActive) {
    return { success: false, message: 'This round is not currently active.' };
  }

  const predValue = parseFloat(prediction);
  if (isNaN(predValue) || predValue < 10 || predValue > 30) {
    return { success: false, message: 'Prediction must be between 10 and 30 GW.' };
  }

  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const data = sheet.getDataRange().getValues();

  // Check if user already submitted for this round — update if so
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userName && data[i][1].toString() === roundId.toString()) {
      sheet.getRange(i + 1, 3).setValue(predValue);
      sheet.getRange(i + 1, 4).setValue(now.toISOString());
      return { success: true, message: 'Prediction updated!' };
    }
  }

  // New submission
  sheet.appendRow([userName, roundId, predValue, now.toISOString()]);
  return { success: true, message: 'Prediction submitted!' };
}

function getSubmissions(roundId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  // Get round info to check deadline
  const { rounds } = getRounds();
  const round = rounds.find(r => r.roundId.toString() === roundId.toString());
  const isDeadlinePassed = round && round.deadline && now > new Date(round.deadline);

  const submissions = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString() === roundId.toString()) {
      submissions.push({
        name: data[i][0],
        prediction: isDeadlinePassed ? parseFloat(data[i][2]) : null,
        submittedAt: data[i][3]
      });
    }
  }

  // Sort alphabetically
  submissions.sort((a, b) => a.name.localeCompare(b.name));

  return {
    submissions,
    roundId,
    isDeadlinePassed,
    actualValue: round ? round.actualValue : null,
    deadline: round ? round.deadline : null,
    date: round ? round.date : null
  };
}

// ============================================================
// LEADERBOARD
// ============================================================
// Scoring: deviation = |prediction - actualValue|
// Lower cumulative deviation = better rank (top of leaderboard).

function getLeaderboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const subData = subSheet.getDataRange().getValues();

  // Get all rounds with actual values
  const { rounds } = getRounds();
  const scoredRounds = rounds.filter(r => r.actualValue !== null);

  if (scoredRounds.length === 0) {
    return { leaderboard: [], rounds: rounds };
  }

  // Build a map: roundId -> actualValue
  const actuals = {};
  scoredRounds.forEach(r => { actuals[r.roundId] = r.actualValue; });

  // Calculate deviations per player
  const players = {}; // { name: { totalDeviation, roundCount, perRound: { roundId: deviation } } }

  for (let i = 1; i < subData.length; i++) {
    const name = subData[i][0];
    const roundId = subData[i][1];
    const prediction = parseFloat(subData[i][2]);

    // Only score rounds that have an actual value
    if (!(roundId in actuals)) continue;

    if (!players[name]) {
      players[name] = { name, totalDeviation: 0, roundCount: 0, perRound: {} };
    }

    const deviation = Math.abs(prediction - actuals[roundId]);
    const roundedDeviation = Math.round(deviation * 100) / 100;
    players[name].perRound[roundId] = roundedDeviation;
    players[name].totalDeviation += roundedDeviation;
    players[name].roundCount++;
  }

  // Calculate average deviation and qualification status
  const totalScoredRounds = scoredRounds.length;
  const minParticipation = Math.ceil(totalScoredRounds * 0.5); // 50% threshold

  Object.values(players).forEach(p => {
    p.totalDeviation = Math.round(p.totalDeviation * 100) / 100;
    p.avgDeviation = Math.round((p.totalDeviation / p.roundCount) * 100) / 100;
    p.qualified = p.roundCount >= minParticipation;
  });

  // Sort: qualified players first (by avg deviation), then unqualified (by avg deviation)
  const leaderboard = Object.values(players).sort((a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    return a.avgDeviation - b.avgDeviation;
  });

  return { leaderboard, rounds: scoredRounds, minParticipation };
}
