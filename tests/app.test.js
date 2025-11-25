const test = require('node:test');
const assert = require('node:assert');

const {
  placePayPositions,
  isWinningBet,
  validateBackupPayload,
  prepareStateFromBackup,
  BACKUP_VERSION
} = require('../app');

function bet(type, optionName) {
  return { type, optionName };
}

test('placePayPositions returns correct place slots by runner count', () => {
  assert.strictEqual(placePayPositions(8), 3);
  assert.strictEqual(placePayPositions(12), 3);
  assert.strictEqual(placePayPositions(5), 2);
  assert.strictEqual(placePayPositions(7), 2);
  assert.strictEqual(placePayPositions(4), 1);
  assert.strictEqual(placePayPositions(1), 1);
});

test('isWinningBet handles WIN results', () => {
  const finishOrder = [4, 6, 7];
  assert.ok(isWinningBet(bet('WIN', '4'), finishOrder, 10));
  assert.ok(!isWinningBet(bet('WIN', '6'), finishOrder, 10));
});

test('isWinningBet handles PLACE with variable runner counts', () => {
  const eightRunners = [4, 6, 7];
  assert.ok(isWinningBet(bet('PLACE', '7'), eightRunners, 8));
  assert.ok(!isWinningBet(bet('PLACE', '9'), eightRunners, 8));

  const sixRunners = [2, 5, 1];
  assert.ok(isWinningBet(bet('PLACE', '5'), sixRunners, 6));
  assert.ok(!isWinningBet(bet('PLACE', '1'), sixRunners, 6));

  const fourRunners = [3, 2, 1];
  assert.ok(isWinningBet(bet('PLACE', '3'), fourRunners, 4));
  assert.ok(!isWinningBet(bet('PLACE', '2'), fourRunners, 4));
});

test('isWinningBet handles QUINELLA and WIDE tickets', () => {
  const finishOrder = [3, 5, 1];
  assert.ok(isWinningBet(bet('QUINELLA', '5-3'), finishOrder, 9));
  assert.ok(!isWinningBet(bet('QUINELLA', '1-3'), finishOrder, 9));

  const wideFinish = [2, 8, 6];
  assert.ok(isWinningBet(bet('WIDE', '2-6'), wideFinish, 12));
  assert.ok(!isWinningBet(bet('WIDE', '2-9'), wideFinish, 12));
});

test('isWinningBet handles TRIO and TRIFECTA tickets', () => {
  const finishOrder = [1, 4, 6];
  assert.ok(isWinningBet(bet('TRIO', '6-1-4'), finishOrder, 14));
  assert.ok(!isWinningBet(bet('TRIO', '1-4-7'), finishOrder, 14));

  assert.ok(isWinningBet(bet('TRIFECTA', '1-4-6'), finishOrder, 14));
  assert.ok(!isWinningBet(bet('TRIFECTA', '1-6-4'), finishOrder, 14));
});

test('isWinningBet handles BRACKET (枠連) tickets', () => {
  const sameFrameFinish = [3, 4, 9]; // frames: 2, 2
  assert.ok(isWinningBet(bet('BRACKET', '2-2'), sameFrameFinish, 16));
  assert.ok(!isWinningBet(bet('BRACKET', '1-1'), sameFrameFinish, 16));

  const mixedFramesFinish = [1, 6, 7]; // frames: 1, 3
  assert.ok(isWinningBet(bet('BRACKET', '1-3'), mixedFramesFinish, 16));
  assert.ok(!isWinningBet(bet('BRACKET', '2-3'), mixedFramesFinish, 16));
});

test('validateBackupPayload rejects mismatched version', () => {
  assert.throws(() => validateBackupPayload({
    version: BACKUP_VERSION + 1,
    points: 0,
    races: [],
    bets: []
  }), /INVALID_VERSION/);
});

test('prepareStateFromBackup rebuilds points, races, bets and lastBetId', () => {
  const backup = validateBackupPayload({
    version: BACKUP_VERSION,
    points: 2500,
    races: [
      { id: 7, name: 'Tokyo 11R', runners: 16, status: 'open', options: [] }
    ],
    bets: [
      { id: 42, raceId: 7, type: 'WIN', optionName: '5', stake: 100, result: 'pending', winAmount: 0 }
    ]
  });
  const { nextState, nextLastBetId } = prepareStateFromBackup({ lang: 'en', points: 10, races: [], bets: [] }, backup);
  assert.strictEqual(nextState.points, 2500);
  assert.strictEqual(nextState.races.length, 1);
  assert.strictEqual(nextState.bets.length, 1);
  assert.strictEqual(nextState.lang, 'en');
  assert.strictEqual(nextLastBetId, 42);
});
