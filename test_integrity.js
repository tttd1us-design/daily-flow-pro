import * as U from './js/utils.js';

console.log('==================================================');
console.log('  1. Testing KST Date & Utility Integrity');
console.log('==================================================');

// 1. Test 02:00 AM KST
const d2am = new Date('2026-08-18T17:00:00.000Z'); // 02:00 AM Aug 19 KST
const kstDate = U.todayKST(d2am);
console.log('UTC 17:00 (KST 02:00 next day) -> Date:', kstDate);
if (kstDate === '2026-08-19') {
  console.log('  ✓ [PASS] KST 02:00 AM Date calculation is 100% correct (No UTC regression)');
} else {
  console.error('  ✗ [FAIL] KST Date mismatch:', kstDate);
  process.exit(1);
}

// 2. Test shiftDate without UTC bugs
const shifted = U.shiftDate('2026-08-18', 30);
console.log('2026-08-18 + 30 days:', shifted);
if (shifted === '2026-09-17') {
  console.log('  ✓ [PASS] shiftDate is exact (2026-09-17)');
} else {
  console.error('  ✗ [FAIL] shiftDate mismatch:', shifted);
  process.exit(1);
}

// 3. Test fmtKRW
console.log('10 Trillion Won formatted:', U.fmtKRW(10e12));
console.log('1.5 Trillion Won formatted:', U.fmtKRW(1.5e12));
console.log('3 Billion Won formatted:', U.fmtKRW(3e9));
if (U.fmtKRW(10e12) === '10.00조' && U.fmtKRW(1.5e12) === '1.50조' && U.fmtKRW(3e9) === '30.0억') {
  console.log('  ✓ [PASS] fmtKRW formatting is exact');
} else {
  console.error('  ✗ [FAIL] fmtKRW mismatch');
  process.exit(1);
}

console.log('\n==================================================');
console.log('  2. Testing storage.js & v1 -> v2 Migration');
console.log('==================================================');

const store = {};
global.localStorage = {
  getItem: k => store[k] || null,
  setItem: (k, v) => store[k] = v,
  removeItem: k => delete store[k]
};
global.window = { addEventListener: () => {} };
global.indexedDB = { open: () => ({ onsuccess: () => {} }) };

// Set legacy v1 data
store['daily_flow_data_v1'] = JSON.stringify({
  settings: { userName: '결정디자이너', theme: 'dark' },
  days: {
    '2026-08-18': {
      focus: '1호 도서 초고 집필',
      todos: [{ id: 't1', text: 'Ch.1 3600자', category: 'study', completed: true }]
    }
  }
});

const { storage } = await import('./js/storage.js');
console.log('Schema:', storage.data.meta.schema);
console.log('Vision Title:', storage.data.vision.title);
console.log('Legacy Backup Preserved:', !!store['daily_flow_data_v1_backup']);

if (store['daily_flow_data_v1_backup'] && storage.data.meta.schema === 2) {
  console.log('  ✓ [PASS] v1 -> v2 auto-migration succeeded & backup preserved');
} else {
  console.error('  ✗ [FAIL] Migration failed');
  process.exit(1);
}

console.log('\n==================================================');
console.log('  3. Testing EES Real 4-Axis Score Engine');
console.log('==================================================');

const { computeEES, weakestAxis } = await import('./js/ees.js');

const initialEes = computeEES('2026-08-18');
console.log('Initial EES Score:', initialEes.total, 'Grade:', initialEes.grade);

// Add 3,600 chars in deepwork
storage.pushToDay('2026-08-18', 'deepwork', {
  engineId: 'E1', chars: 3600, type: 'deep'
});
// Add 1 decision
storage.addDecision({
  date: '2026-08-18', question: '10대 금지목록 확정', chosen: '전면 동결', reversible: false
});

const updatedEes = computeEES('2026-08-18');
console.log('Updated EES Score:', updatedEes.total, 'Grade:', updatedEes.grade, 'Authoring:', updatedEes.authoring, 'Decision:', updatedEes.decision);

if (updatedEes.total > initialEes.total && updatedEes.authoring === 30) {
  console.log('  ✓ [PASS] EES dynamically responds to deepwork chars & decision logs');
} else {
  console.error('  ✗ [FAIL] EES score did not update correctly');
  process.exit(1);
}

console.log('\n==================================================');
console.log('  ALL INTEGRITY VERIFICATIONS PASSED (100% GREEN)');
console.log('==================================================');
