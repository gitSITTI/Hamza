const { getDb } = require('../db');
const { v4: uuid } = require('uuid');

// ── Helpers ────────────────────────────────────────────────────
function monthlyPaymentCalc(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

const INDUSTRY_BENCHMARKS = {
  hvac:       { sde_min: 2.5, sde_max: 4.0,  note: 'HVAC: strong recurring, recession-resistant. Buyers pay 2.5-4x SDE.' },
  restaurant: { sde_min: 1.5, sde_max: 3.0,  note: 'Restaurants: high risk, thin margins. Rarely over 3x SDE.' },
  saas:       { rev_min: 3.0, rev_max: 8.0,  note: 'SaaS: valued on revenue. 3-8x ARR depending on growth/churn.' },
  retail:     { sde_min: 1.0, sde_max: 2.5,  note: 'Retail: declining sector, brick-and-mortar risk. 1-2.5x SDE.' },
  service:    { sde_min: 2.0, sde_max: 4.0,  note: 'Service businesses: 2-4x SDE, depends on owner-dependence.' },
  ecommerce:  { sde_min: 2.0, sde_max: 4.5,  note: 'E-commerce: 2-4.5x SDE. Platform risk (Amazon/Shopify).' },
  healthcare: { ebitda_min: 4, ebitda_max: 7, note: 'Healthcare: 4-7x EBITDA. Licensing/regulatory moat.' },
  logistics:  { sde_min: 2.0, sde_max: 3.5,  note: 'Logistics/trucking: 2-3.5x SDE. Asset-heavy.' },
  laundromat: { sde_min: 2.5, sde_max: 5.0,  note: 'Laundromats: very passive, strong 2.5-5x SDE.' },
  carwash:    { sde_min: 3.0, sde_max: 6.0,  note: 'Car wash (express): 3-6x SDE. High multiples for auto-rollover.' }
};

// ── Tools ──────────────────────────────────────────────────────
const tools = [
  {
    name: 'analyze_acquisition',
    description: 'Full business acquisition analysis: SDE/EBITDA/Revenue multiples, SBA loan DSCR, payback period, ROI, and verdict.',
    inputSchema: {
      type: 'object',
      properties: {
        business_name:    { type: 'string', description: 'Name of the target business' },
        asking_price:     { type: 'number', description: 'Total asking price in USD' },
        annual_revenue:   { type: 'number', description: 'Annual gross revenue' },
        ebitda:           { type: 'number', description: 'EBITDA (Earnings Before Interest, Taxes, Depreciation & Amortization)' },
        sde:              { type: 'number', description: 'Seller Discretionary Earnings (EBITDA + owner salary/perks)' },
        industry:         { type: 'string', description: 'hvac | retail | saas | restaurant | service | ecommerce | healthcare | logistics | laundromat | carwash' },
        business_type:    { type: 'string', description: 'service | product | saas | real_estate | other' },
        down_payment_pct: { type: 'number', description: 'Down payment % (default 10 for SBA 7a)' },
        loan_rate:        { type: 'number', description: 'SBA loan rate % (default 6.5)' },
        loan_term_years:  { type: 'number', description: 'Loan term in years (default 10)' }
      },
      required: ['asking_price', 'annual_revenue']
    },
    async handler(args) {
      const downPct    = args.down_payment_pct ?? 10;
      const rate       = args.loan_rate        ?? 6.5;
      const term       = args.loan_term_years  ?? 10;

      const downPayment  = args.asking_price * downPct / 100;
      const loanAmount   = args.asking_price - downPayment;
      const monthlyPmt   = monthlyPaymentCalc(loanAmount, rate, term);
      const annualDebt   = monthlyPmt * 12;
      const totalInterest= (monthlyPmt * term * 12) - loanAmount;

      const sdeMult    = args.sde    ? +(args.asking_price / args.sde).toFixed(2)    : null;
      const ebitdaMult = args.ebitda ? +(args.asking_price / args.ebitda).toFixed(2) : null;
      const revMult    = +(args.asking_price / args.annual_revenue).toFixed(2);

      const dscr = args.ebitda ? +(args.ebitda / annualDebt).toFixed(3) : null;
      const dscrSde = args.sde ? +(args.sde / annualDebt).toFixed(3) : null;

      const annualCashflowAfterDebt = (args.sde || args.ebitda || 0) - annualDebt;
      const paybackYears = downPayment > 0 && annualCashflowAfterDebt > 0
        ? +(downPayment / annualCashflowAfterDebt).toFixed(1) : null;
      const roi = downPayment > 0
        ? +(annualCashflowAfterDebt / downPayment * 100).toFixed(1) : null;

      // Verdict logic
      const dscrCheck  = (dscr || dscrSde || 0) >= 1.25;
      const multCheck  = sdeMult ? sdeMult <= 3.5 : (ebitdaMult ? ebitdaMult <= 5 : revMult <= 2);
      const roiCheck   = roi ? roi >= 15 : false;

      const verdict =
        dscrCheck && multCheck && roiCheck ? 'STRONG BUY' :
        dscrCheck && multCheck             ? 'BUY' :
        dscrCheck                          ? 'HOLD — negotiate price down' :
                                             'PASS — DSCR below 1.25';

      const bench = INDUSTRY_BENCHMARKS[args.industry?.toLowerCase()] || null;

      return {
        business: args.business_name || 'Target Business',
        verdict,
        multiples: {
          sde_multiple:    sdeMult    || 'N/A (SDE not provided)',
          ebitda_multiple: ebitdaMult || 'N/A (EBITDA not provided)',
          revenue_multiple: revMult
        },
        financing: {
          asking_price:     args.asking_price,
          down_payment:     +downPayment.toFixed(0),
          loan_amount:      +loanAmount.toFixed(0),
          loan_rate_pct:    rate,
          loan_term_years:  term,
          monthly_payment:  +monthlyPmt.toFixed(0),
          annual_debt_service: +annualDebt.toFixed(0),
          total_interest:   +totalInterest.toFixed(0)
        },
        returns: {
          dscr:                   dscr || dscrSde || 'N/A',
          dscr_source:            dscr ? 'EBITDA' : dscrSde ? 'SDE' : 'N/A',
          annual_cashflow_after_debt: +annualCashflowAfterDebt.toFixed(0),
          payback_years:          paybackYears || 'N/A',
          roi_year1_pct:          roi || 'N/A'
        },
        thresholds: {
          dscr_min:        '1.25 (lender minimum)',
          sde_mult_target: '< 3x (small biz bargain)',
          roi_target:      '> 15% on down payment'
        },
        industry_benchmark: bench || { note: `No benchmark data for "${args.industry}". Common ranges: 2-4x SDE for most service businesses.` },
        sba_note: 'SBA 7(a) standard: 10% down, rates currently 6-8%, terms up to 10yr (25yr with real estate).'
      };
    }
  },

  {
    name: 'sba_loan_analysis',
    description: 'Model an SBA 7(a) loan: monthly payment, total interest, break-even revenue, DSCR stress table.',
    inputSchema: {
      type: 'object',
      properties: {
        loan_amount:  { type: 'number', description: 'Loan amount in USD' },
        rate:         { type: 'number', description: 'Annual interest rate % (default 6.5)' },
        term_years:   { type: 'number', description: 'Loan term in years (default 10)' },
        down_payment: { type: 'number', description: 'Down payment amount (for context only)' }
      },
      required: ['loan_amount']
    },
    async handler(args) {
      const rate      = args.rate       ?? 6.5;
      const term      = args.term_years ?? 10;
      const pmt       = monthlyPaymentCalc(args.loan_amount, rate, term);
      const annualDebt= pmt * 12;
      const totalInt  = (pmt * term * 12) - args.loan_amount;

      // Break-even: EBITDA margin assumed 20%
      const breakEvenRevenue = annualDebt / 0.20;

      // DSCR stress table at various EBITDA levels
      const ebitdaLevels = [
        args.loan_amount * 0.10,
        args.loan_amount * 0.15,
        annualDebt,
        annualDebt * 1.25,
        annualDebt * 1.5,
        annualDebt * 2.0
      ].map(e => ({
        ebitda:          +e.toFixed(0),
        dscr:            +(e / annualDebt).toFixed(2),
        status:          e / annualDebt >= 1.25 ? 'PASS (lender)' :
                         e / annualDebt >= 1.0  ? 'BREAKEVEN' : 'FAIL'
      }));

      return {
        loan_amount:       args.loan_amount,
        down_payment:      args.down_payment || null,
        rate_pct:          rate,
        term_years:        term,
        monthly_payment:   +pmt.toFixed(0),
        annual_debt_service: +annualDebt.toFixed(0),
        total_interest_paid: +totalInt.toFixed(0),
        total_cost:         +(args.loan_amount + totalInt).toFixed(0),
        break_even_revenue: +breakEvenRevenue.toFixed(0),
        break_even_note:    'Assumes 20% EBITDA margin. Adjust for your industry.',
        dscr_table:         ebitdaLevels,
        sba_guidelines: {
          max_loan:     '$5M (SBA 7a)',
          min_dscr:     '1.25x (most lenders require this)',
          typical_term: '10 years working capital, 25 years with real estate'
        }
      };
    }
  },

  {
    name: 'dd_checklist',
    description: 'Generate a due diligence checklist for a business acquisition. Categorized by Financial, Legal, Operations, Real Estate, and Industry-specific items.',
    inputSchema: {
      type: 'object',
      properties: {
        business_type: { type: 'string', description: 'service | product | saas | real_estate | restaurant | hvac | other' },
        size:          { type: 'string', description: 'small (<$500k) | mid ($500k-$2M) | large (>$2M)' }
      },
      required: ['business_type']
    },
    async handler({ business_type, size = 'mid' }) {
      const checklist = {
        financial: [
          '3 years of federal tax returns (Form 1120/1065/Schedule C)',
          '3 years of P&L statements (monthly preferred)',
          '3 years of balance sheets',
          'YTD financials (current year)',
          'Accounts Receivable aging report',
          'Accounts Payable aging report',
          'Seller Discretionary Earnings (SDE) add-back schedule — verify every add-back',
          'Bank statements (12+ months) — reconcile to P&L',
          'Sales by customer (concentration risk)',
          'Inventory valuation and count (if applicable)',
          'Outstanding loans, liens, judgments',
          'All credit card statements (owner expenses)',
          'QoE (Quality of Earnings) report — strongly recommended for deals >$1M'
        ],
        legal: [
          'Entity formation documents (Articles of Org/Inc, operating agreement)',
          'Good Standing Certificate from Secretary of State',
          'All business licenses and permits (transferable?)',
          'Customer contracts — assignability, auto-renew, cancellation terms',
          'Vendor/supplier agreements',
          'Employment agreements and non-competes',
          'IP assignments (trademarks, patents, domain names)',
          'Pending or threatened litigation search',
          'Insurance certificates (general liability, E&O, workers comp)',
          'Franchise agreement (if applicable)',
          'Seller non-compete agreement (include in LOI)',
          'Environmental assessments (if real estate involved)'
        ],
        operations: [
          'Org chart — who does what',
          'Key person dependency analysis — what happens if owner leaves?',
          'Top 10 customers by revenue — interview them if possible',
          'Top 5 suppliers — backup suppliers identified?',
          'Employee list: titles, tenure, salaries, part-time vs full-time',
          'Systems and software audit (CRM, ERP, POS, etc.)',
          'Standard operating procedures documented?',
          'Online reputation (Google, Yelp, BBB, industry reviews)',
          'Seasonality analysis — month-by-month revenue trends',
          'Website analytics and SEO assessment',
          'Social media followers and engagement'
        ],
        real_estate: [
          'Lease agreement — term, rent, renewal options, CAM charges',
          'Landlord consent for assignment',
          'Property condition — when was HVAC/roof/electrical last replaced?',
          'Equipment list and age/condition',
          'FF&E (Furniture, Fixtures & Equipment) included in sale?',
          'Environmental Phase 1 (if buying real estate)'
        ]
      };

      // Industry-specific items
      const industryChecks = {
        hvac: [
          'EPA 608 certifications for all technicians',
          'State contractor license — transferable?',
          'Fleet vehicles: age, mileage, condition',
          'Service contracts/maintenance agreements (recurring revenue)',
          'Manufacturer relationships and dealer agreements',
          'Tool and equipment inventory'
        ],
        restaurant: [
          'Health department inspection history',
          'Liquor license — transfer timeline (can take 90+ days)',
          'Food handler certifications',
          'Lease length vs business value (key risk)',
          'Recipe ownership documentation',
          'Grease trap maintenance records'
        ],
        saas: [
          'MRR/ARR reconciliation by customer',
          'Churn rate (monthly and annual)',
          'Customer Acquisition Cost (CAC) and LTV',
          'Codebase audit — tech debt, security vulnerabilities',
          'SLA compliance history',
          'Cloud infrastructure costs (AWS/GCP/Azure)',
          'Vendor/API dependencies',
          'IP ownership — all code assigned to entity?'
        ],
        service: [
          'License and certification requirements by state',
          'Customer contract lengths and cancellation rights',
          'Subcontractor vs employee classification audit'
        ],
        product: [
          'Supplier diversification (avoid single-source risk)',
          'Amazon Seller account health (if applicable)',
          'Returns and warranty claims history',
          'Patent filings and IP protection'
        ]
      };

      const industryKey = Object.keys(industryChecks).find(k => business_type.toLowerCase().includes(k)) || 'service';
      checklist.industry_specific = industryChecks[industryKey] || industryChecks.service;

      // Size-specific additions
      if (size === 'large') {
        checklist.financial.push('Full audit opinion from CPA firm');
        checklist.legal.push('Representations and warranties insurance (R&W Insurance)');
        checklist.legal.push('Escrow/holdback structure for indemnification');
      }

      const totalItems = Object.values(checklist).flat().length;
      return {
        business_type,
        size,
        total_items: totalItems,
        checklist,
        priority_items: [
          'ALWAYS get 3 years of bank statements and reconcile to P&L',
          'ALWAYS verify SDE add-backs line by line with documentation',
          'ALWAYS confirm licenses are transferable BEFORE LOI',
          'ALWAYS get seller non-compete in writing (3-5yr, 25mi radius minimum)',
          'NEVER skip a QoE report on deals over $750k'
        ]
      };
    }
  },

  {
    name: 'save_deal',
    description: 'Save a business acquisition deal to the vault with status tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        name:         { type: 'string', description: 'Business name' },
        asking_price: { type: 'number', description: 'Asking price' },
        revenue:      { type: 'number', description: 'Annual revenue' },
        ebitda:       { type: 'number', description: 'EBITDA' },
        sde:          { type: 'number', description: 'Seller Discretionary Earnings' },
        industry:     { type: 'string', description: 'Industry type' },
        status:       { type: 'string', description: 'prospecting | loi | due_diligence | closed | passed' },
        notes:        { type: 'string' },
        sos_data:     { type: 'string', description: 'JSON string with SOS entity data' }
      },
      required: ['name', 'asking_price']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      const meta = JSON.stringify({
        asking_price: args.asking_price,
        ebitda:       args.ebitda,
        sde:          args.sde,
        industry:     args.industry,
        status:       args.status || 'prospecting'
      });
      db.prepare(`INSERT INTO entities
        (id, name, type, annual_revenue, equity_value, notes, sos_data, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, args.name, args.status || 'prospecting',
        args.revenue, args.asking_price,
        (args.notes ? args.notes + ' | ' : '') + meta,
        args.sos_data || null,
        'investor'
      );
      return { ok: true, id, name: args.name, status: args.status || 'prospecting' };
    }
  },

  {
    name: 'list_deals',
    description: 'List all saved business acquisition deals with status and key metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by: prospecting | loi | due_diligence | closed | passed' }
      }
    },
    async handler({ status } = {}) {
      const db = getDb();
      const statusTypes = ['prospecting', 'loi', 'due_diligence', 'closed', 'passed'];
      let rows;
      if (status) {
        rows = db.prepare('SELECT * FROM entities WHERE type = ? AND role = ? ORDER BY created_at DESC').all(status, 'investor');
      } else {
        rows = db.prepare('SELECT * FROM entities WHERE role = ? ORDER BY created_at DESC').all('investor');
      }

      const deals = rows.map(e => {
        let meta = {};
        try {
          const metaPart = (e.notes || '').split(' | ').find(s => s.startsWith('{'));
          if (metaPart) meta = JSON.parse(metaPart);
        } catch {}
        const sde          = meta.sde    || 0;
        const ebitda       = meta.ebitda || 0;
        const asking       = meta.asking_price || e.equity_value || 0;
        const downPmt      = asking * 0.10;
        const loanAmt      = asking - downPmt;
        const monthlyPmt   = loanAmt > 0 ? monthlyPaymentCalc(loanAmt, 6.5, 10) : 0;
        const annualDebt   = monthlyPmt * 12;
        const dscr         = (ebitda || sde) > 0 ? +((ebitda || sde) / annualDebt).toFixed(2) : null;
        return {
          id:           e.id,
          name:         e.name,
          status:       meta.status || e.type,
          industry:     meta.industry,
          asking_price: asking,
          annual_revenue: e.annual_revenue,
          sde,
          ebitda,
          sde_multiple: sde ? +(asking / sde).toFixed(2) : null,
          dscr,
          created_at:   e.created_at
        };
      });

      return { deals, count: deals.length, status_filter: status || 'all' };
    }
  },

  {
    name: 'compare_deals',
    description: 'Compare multiple business deals side-by-side on SDE multiple, DSCR, payback period, and verdict.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of entity IDs to compare (from list_deals)'
        }
      },
      required: ['entity_ids']
    },
    async handler({ entity_ids }) {
      const db = getDb();
      const results = [];

      for (const eid of entity_ids) {
        const e = db.prepare('SELECT * FROM entities WHERE id = ?').get(eid);
        if (!e) { results.push({ id: eid, error: 'Not found' }); continue; }

        let meta = {};
        try {
          const metaPart = (e.notes || '').split(' | ').find(s => s.startsWith('{'));
          if (metaPart) meta = JSON.parse(metaPart);
        } catch {}

        const asking   = meta.asking_price || e.equity_value || 0;
        const sde      = meta.sde    || 0;
        const ebitda   = meta.ebitda || 0;
        const revenue  = e.annual_revenue || 0;
        const downPmt  = asking * 0.10;
        const loanAmt  = asking - downPmt;
        const pmt      = loanAmt > 0 ? monthlyPaymentCalc(loanAmt, 6.5, 10) : 0;
        const annualDebt = pmt * 12;
        const incomeForDscr = ebitda || sde || 0;
        const dscr     = incomeForDscr > 0 && annualDebt > 0 ? +(incomeForDscr / annualDebt).toFixed(2) : null;
        const netAfterDebt = incomeForDscr - annualDebt;
        const payback  = downPmt > 0 && netAfterDebt > 0 ? +(downPmt / netAfterDebt).toFixed(1) : null;
        const roi      = downPmt > 0 ? +(netAfterDebt / downPmt * 100).toFixed(1) : null;

        const verdict =
          (dscr || 0) >= 1.25 && (sde ? (asking / sde) <= 3.5 : true) && (roi || 0) >= 15 ? 'STRONG BUY' :
          (dscr || 0) >= 1.25 && (sde ? (asking / sde) <= 3.5 : true)                     ? 'BUY' :
          (dscr || 0) >= 1.25                                                               ? 'HOLD' : 'PASS';

        results.push({
          id:           e.id,
          name:         e.name,
          industry:     meta.industry,
          asking_price: asking,
          sde_multiple: sde    ? +(asking / sde).toFixed(2)    : null,
          ebitda_multiple: ebitda ? +(asking / ebitda).toFixed(2) : null,
          revenue_multiple: revenue ? +(asking / revenue).toFixed(2) : null,
          dscr,
          payback_years: payback,
          roi_year1_pct: roi,
          annual_cashflow_after_debt: +netAfterDebt.toFixed(0),
          verdict
        });
      }

      // Sort by DSCR descending (best first)
      results.sort((a, b) => (b.dscr || 0) - (a.dscr || 0));

      return {
        comparison: results,
        winner: results.find(r => r.verdict === 'STRONG BUY' || r.verdict === 'BUY')?.name || 'No clear winner — review individually',
        count: results.length
      };
    }
  }
];

module.exports = tools;
