/**
 * Life OS v2 — Valuation Engine & Ledger Rules
 * 보수적 밸류에이션 원칙:
 * - 개발 GDV: 착공계 기준 100%, 인허가 접수~승인 30%, LOI/MOU 0%
 * - AUM: 납입 및 자산등기 완료분만 계상 (약정액 제외)
 * - 플랫폼: 최근 투자 라운드 또는 TTM ARR × 8배 (지분 희석률 25% 가정)
 * - IP: 최근 12개월 실현 인세 × 3배 (선인세/계약금 제외)
 * - 실물: GAV - 부채 (보수적 LTV 감안)
 */

export const LEDGER_RULES = {
  version: '2.0',
  dev: {
    stage: {
      loi: 0,
      lead: 0,
      ld: 0.1,
      term: 0.2,
      permit_filed: 0.3,
      permit_done: 0.3,
      fin: 0.5,
      groundbreak: 1.0,
      exec: 1.0,
      exit: 1.0,
      done: 1.0,
      dead: 0
    },
    netAttrib: 'realized_only' // 미실현 개발이익 순자산 제외
  },
  aum: { basis: 'funded_and_titled' }, // 약정액 계상 금지
  platform: { multiple: 8, useLastRoundIfExists: true, dilutionAssumed: 0.25 },
  ip: { basis: 'ttm_royalty', multiple: 3, excludeAdvance: true }
};

export function controlAssets(entities = {}) {
  const deals = entities.deals || [];
  const funds = entities.funds || entities.aum || [];
  const products = entities.products || [];
  const assets = entities.assets || [];
  const ip = entities.ip || [];
  const books = entities.books || [];

  const dev = deals.reduce((s, d) => {
    const mult = LEDGER_RULES.dev.stage[d.stage] ?? (d.stage === 'dead' ? 0 : 0.3);
    return s + (Number(d.gdv) || 0) * mult;
  }, 0);

  const aum = funds.filter(f => f.funded !== false).reduce((s, f) => s + (Number(f.nav || f.aum) || 0), 0);

  const plat = products.reduce((s, p) => {
    const val = (LEDGER_RULES.platform.useLastRoundIfExists && p.lastRoundValue)
      ? Number(p.lastRoundValue)
      : (Number(p.arr || (p.mrr ? p.mrr * 12 : 0)) || 0) * LEDGER_RULES.platform.multiple;
    return s + val;
  }, 0);

  const real = assets.reduce((s, a) => s + (Number(a.gav || a.bookValue) || 0), 0);

  const ipTotal = ip.reduce((s, i) => s + (Number(i.ttmRoyalty || i.valuation) || 0) * (i.ttmRoyalty ? LEDGER_RULES.ip.multiple : 1), 0);
  const bookTotal = books.reduce((s, b) => s + (Number(b.royaltyYTD || b.ttmRoyalty) || 0) * LEDGER_RULES.ip.multiple, 0);

  const total = dev + aum + plat + real + ipTotal + bookTotal;
  return { dev, aum, plat, real, ip: ipTotal + bookTotal, books: bookTotal, total };
}

export function netWorth(entities = {}, settings = {}) {
  const deals = entities.deals || [];
  const amc = entities.amc || {};
  const products = entities.products || [];
  const assets = entities.assets || [];
  const ip = entities.ip || [];
  const books = entities.books || [];

  const devNet = deals.reduce((s, d) => s + (Number(d.realizedPromote) || 0) + (Number(d.realizedEquityGain || d.equity) || 0), 0);
  const amcNet = (Number(amc.ebit || 0) * 13) * (Number(amc.ownership) || (amc.ebit ? 0.7 : 0));
  
  const platNet = products.reduce((s, p) => {
    const val = (LEDGER_RULES.platform.useLastRoundIfExists && p.lastRoundValue)
      ? Number(p.lastRoundValue)
      : (Number(p.arr || (p.mrr ? p.mrr * 12 : 0)) || 0) * LEDGER_RULES.platform.multiple;
    const own = p.ownership !== undefined ? Number(p.ownership) : LEDGER_RULES.platform.dilutionAssumed;
    return s + val * own;
  }, 0);

  const realNet = assets.reduce((s, a) => {
    const ltv = a.ltv !== undefined ? Number(a.ltv) : 0.5;
    return s + (Number(a.gav || a.bookValue) || 0) * (1 - ltv);
  }, 0);

  const ipNet = (ip.reduce((s, i) => s + (Number(i.ttmRoyalty || i.valuation) || 0), 0) +
                 books.reduce((s, b) => s + (Number(b.royaltyYTD || b.ttmRoyalty) || 0), 0)) * LEDGER_RULES.ip.multiple;

  const cash = Number(settings.cash || entities.cash || 0);

  const total = devNet + amcNet + platNet + realNet + ipNet + cash;
  return { devNet, amcNet, platNet, realNet, ipNet, cash, total };
}