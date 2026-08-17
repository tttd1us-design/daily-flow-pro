const fs = require('fs');

console.log('====================================================');
console.log('🔬 [Daily Flow Pro & 10조 Life OS 전체 시스템 전수 검사]');
console.log('====================================================\n');

let passCount = 0;
let totalCount = 0;

function assertCheck(name, condition) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${name}`);
  }
}

// 1. 핵심 파일 및 크기 검사
const requiredFiles = [
  'index.html',
  'css/style.css',
  'js/app.bundle.js',
  'database/ten_trillion_roadmap.json',
  'database/ten_trillion_mastery.json',
  'database/goal_hierarchy.json',
  'database/memos.json',
  'database/user_database.json'
];

console.log('📂 1. 핵심 파일 및 데이터베이스 보관소 검사:');
requiredFiles.forEach(f => {
  const exists = fs.existsSync(f);
  assertCheck(`파일 존재 여부: ${f}`, exists);
  if (exists) {
    const size = fs.statSync(f).size;
    assertCheck(`파일 크기 적정성 (${(size/1024).toFixed(1)} KB): ${f}`, size > 50);
  }
});

// 2. HTML 구조 및 핵심 탭 컨테이너 검사
console.log('\n🏛️ 2. HTML 12대 탭 및 핵심 섹션 무결성 검사:');
const html = fs.readFileSync('index.html', 'utf8');

const tabPanes = [
  'pane-dashboard',
  'pane-ten-trillion',
  'pane-quick-memo',
  'pane-evening-os',
  'pane-goal-hierarchy',
  'pane-weekly-retro',
  'pane-ai-coach',
  'pane-study',
  'pane-journal',
  'pane-principles',
  'pane-calendar',
  'pane-analytics'
];

tabPanes.forEach(paneId => {
  assertCheck(`탭 컨테이너 ID 존재: #${paneId}`, html.includes(`id="${paneId}"`));
});

// 3. 10조 자산가 OS 5열 & 5개년 로드맵 서브뷰 검사
console.log('\n👑 3. 10조 자산가 OS 서브뷰 & 5열 시스템 검사:');
const trillionSubviews = [
  'tsub-view-fiveyear',
  'tsub-view-roadmap',
  'tsub-view-vision',
  'tsub-view-ideabank',
  'tsub-view-audit',
  'tsub-view-handbook'
];
trillionSubviews.forEach(svId => {
  assertCheck(`10조 OS 서브뷰 ID: #${svId}`, html.includes(`id="${svId}"`));
});

// 4. 일일/주간/월간/년간 목표 로드맵 순서 검사
console.log('\n🎯 4. 목표 계층 순서 (Daily -> Weekly -> Monthly -> Yearly) 검사:');
const dailyIdx = html.indexOf('data-section="daily"');
const weeklyIdx = html.indexOf('data-section="weekly"');
const monthlyIdx = html.indexOf('data-section="monthly"');
const yearlyIdx = html.indexOf('data-section="yearly"');

assertCheck('목표 보드 순서: Daily가 Weekly보다 앞에 위치', dailyIdx < weeklyIdx && dailyIdx !== -1);
assertCheck('목표 보드 순서: Weekly가 Monthly보다 앞에 위치', weeklyIdx < monthlyIdx);
assertCheck('목표 보드 순서: Monthly가 Yearly보다 앞에 위치', monthlyIdx < yearlyIdx);

// 5. JavaScript 핵심 함수 및 이벤트 바인딩 검사
console.log('\n⚡ 5. JavaScript 핵심 로직 및 번들 무결성 검사:');
const js = fs.readFileSync('js/app.bundle.js', 'utf8');

const coreFunctions = [
  'calculateCompoundMomentum',
  'renderGoalHierarchy',
  'renderVisualTree',
  'loadTrillionVision',
  'renderTrillionIdeas',
  'renderMemos',
  'renderEveningOS',
  'renderTodos',
  'renderCalendar',
  'renderWeeklyRetroMetrics',
  'generateAiJournalDraft'
];

coreFunctions.forEach(fn => {
  assertCheck(`JS 핵심 함수 탑재: ${fn}()`, js.includes(fn));
});

// 6. JSON 파일 유효성 검증
console.log('\n💾 6. JSON 데이터베이스 문법 및 구조 유효성:');
const jsonList = [
  'database/ten_trillion_roadmap.json',
  'database/ten_trillion_mastery.json',
  'database/goal_hierarchy.json',
  'database/memos.json',
  'database/user_database.json'
];

jsonList.forEach(jf => {
  try {
    const parsed = JSON.parse(fs.readFileSync(jf, 'utf8'));
    assertCheck(`JSON 파싱 성공: ${jf}`, typeof parsed === 'object');
  } catch (e) {
    assertCheck(`JSON 파싱 실패: ${jf} (${e.message})`, false);
  }
});

console.log('\n====================================================');
console.log(`📊 [최종 검사 결과]: 총 ${totalCount}개 항목 중 ${passCount}개 통과 (달성률: ${Math.round((passCount/totalCount)*100)}%)`);
console.log('====================================================');
