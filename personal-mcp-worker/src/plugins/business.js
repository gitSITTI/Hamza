// Business acquisition, SBA, DD, deals, QLA M&A engineer, DSCR optimizer, creative financing — Worker/D1 port of plugins/business.js
const uid = () => crypto.randomUUID();

// ── Helpers ────────────────────────────────────────────────────
function monthlyPaymentCalc(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function annualAmortPayment(principal, annualRate, termYears) {
  return monthlyPaymentCalc(principal, annualRate, termYears) * 12;
}

const INDUSTRY_BENCHMARKS = {
  hvac: { sde_min: 2.5, sde_max: 4.0, note: 'HVAC: strong recurring, recession-resistant. Buyers pay 2.5-4x SDE.' },
  restaurant: { sde_min: 1.5, sde_max: 3.0, note: 'Restaurants: high risk, thin margins. Rarely over 3x SDE.' },
  saas: { rev_min: 3.0, rev_max: 8.0, note: 'SaaS: valued on revenue. 3-8x ARR depending on growth/churn.' },
  retail: { sde_min: 1.0, sde_max: 2.5, note: 'Retail: declining sector, brick-and-mortar risk. 1-2.5x SDE.' },
  service: { sde_min: 2.0, sde_max: 4.0, note: 'Service businesses: 2-4x SDE, depends on owner-dependence.' },
  ecommerce: { sde_min: 2.0, sde_max: 4.5, note: 'E-commerce: 2-4.5x SDE. Platform risk (Amazon/Shopify).' },
  healthcare: { ebitda_min: 4, ebitda_max: 7, note: 'Healthcare: 4-7x EBITDA. Licensing/regulatory moat.' },
  logistics: { sde_min: 2.0, sde_max: 3.5, note: 'Logistics/trucking: 2-3.5x SDE. Asset-heavy.' },
  laundromat: { sde_min: 2.5, sde_max: 5.0, note: 'Laundromats: very passive, strong 2.5-5x SDE.' },
  carwash: { sde_min: 3.0, sde_max: 6.0, note: 'Car wash (express): 3-6x SDE. High multiples for auto-rollover.' },
};

export default [
  {
    name: 'analyze_acquisition',
    description: 'Full business acquisition analysis: SDE/EBITDA/Revenue multiples, SBA loan DSCR, payback period, ROI, and verdict.',
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'Name of the target business' },
        asking_price: { type: 'number', description: 'Total asking price in USD' },
        annual_revenue: { type: 'number', description: 'Annual gross revenue' },
        ebitda: { type: 'number', description: 'EBITDA (Earnings Before Interest, Taxes, Depreciation & Amortization)' },
        sde: { type: 'number', description: 'Seller Discretionary Earnings (EBITDA + owner salary/perks)' },
        industry: { type: 'string', description: 'hvac | retail | saas | restaurant | service | ecommerce | healthcare | logistics | laundromat | carwash' },
        business_type: { type: 'string', description: 'service | product | saas | real_estate | other' },
        down_payment_pct: { type: 'number', description: 'Down payment % (default 10 for SBA 7a)' },
        loan_rate: { type: 'number', description: 'SBA loan rate % (default 6.5)' },
        loan_term_years: { type: 'number', description: 'Loan term in years (default 10)' },
      },
      required: ['asking_price', 'annual_revenue'],
    },
    async handler(args) {
      const downPct = args.down_payment_pct ?? 10;
      const rate = args.loan_rate ?? 6.5;
      const term = args.loan_term_years ?? 10;

      const downPayment = args.asking_price * downPct / 100;
      const loanAmount = args.asking_price - downPayment;
      const monthlyPmt = monthlyPaymentCalc(loanAmount, rate, term);
      const annualDebt = monthlyPmt * 12;
      const totalInterest = (monthlyPmt * term * 12) - loanAmount;

      const sdeMult = args.sde ? +(args.asking_price / args.sde).toFixed(2) : null;
      const ebitdaMult = args.ebitda ? +(args.asking_price / args.ebitda).toFixed(2) : null;
      const revMult = +(args.asking_price / args.annual_revenue).toFixed(2);

      const dscr = args.ebitda ? +(args.ebitda / annualDebt).toFixed(3) : null;
      const dscrSde = args.sde ? +(args.sde / annualDebt).toFixed(3) : null;

      const annualCashflowAfterDebt = (args.sde || args.ebitda || 0) - annualDebt;
      const paybackYears = downPayment > 0 && annualCashflowAfterDebt > 0
        ? +(downPayment / annualCashflowAfterDebt).toFixed(1) : null;
      const roi = downPayment > 0
        ? +(annualCashflowAfterDebt / downPayment * 100).toFixed(1) : null;

      const dscrCheck = (dscr || dscrSde || 0) >= 1.25;
      const multCheck = sdeMult ? sdeMult <= 3.5 : (ebitdaMult ? ebitdaMult <= 5 : revMult <= 2);
      const roiCheck = roi ? roi >= 15 : false;

      const verdict =
        dscrCheck && multCheck && roiCheck ? 'STRONG BUY' :
          dscrCheck && multCheck ? 'BUY' :
            dscrCheck ? 'HOLD — negotiate price down' :
              'PASS — DSCR below 1.25';

      const bench = INDUSTRY_BENCHMARKS[args.industry?.toLowerCase()] || null;

      return {
        business: args.business_name || 'Target Business',
        verdict,
        multiples: {
          sde_multiple: sdeMult || 'N/A (SDE not provided)',
          ebitda_multiple: ebitdaMult || 'N/A (EBITDA not provided)',
          revenue_multiple: revMult,
        },
        financing: {
          asking_price: args.asking_price,
          down_payment: +downPayment.toFixed(0),
          loan_amount: +loanAmount.toFixed(0),
          loan_rate_pct: rate,
          loan_term_years: term,
          monthly_payment: +monthlyPmt.toFixed(0),
          annual_debt_service: +annualDebt.toFixed(0),
          total_interest: +totalInterest.toFixed(0),
        },
        returns: {
          dscr: dscr || dscrSde || 'N/A',
          dscr_source: dscr ? 'EBITDA' : dscrSde ? 'SDE' : 'N/A',
          annual_cashflow_after_debt: +annualCashflowAfterDebt.toFixed(0),
          payback_years: paybackYears || 'N/A',
          roi_year1_pct: roi || 'N/A',
        },
        thresholds: {
          dscr_min: '1.25 (lender minimum)',
          sde_mult_target: '< 3x (small biz bargain)',
          roi_target: '> 15% on down payment',
        },
        industry_benchmark: bench || { note: `No benchmark data for "${args.industry}". Common ranges: 2-4x SDE for most service businesses.` },
        sba_note: 'SBA 7(a) standard: 10% down, rates currently 6-8%, terms up to 10yr (25yr with real estate).',
      };
    },
  },
  {
    name: 'sba_loan_analysis',
    description: 'Model an SBA 7(a) loan: monthly payment, total interest, break-even revenue, DSCR stress table.',
    inputSchema: {
      type: 'object',
      properties: {
        loan_amount: { type: 'number', description: 'Loan amount in USD' },
        rate: { type: 'number', description: 'Annual interest rate % (default 6.5)' },
        term_years: { type: 'number', description: 'Loan term in years (default 10)' },
        down_payment: { type: 'number', description: 'Down payment amount (for context only)' },
      },
      required: ['loan_amount'],
    },
    async handler(args) {
      const rate = args.rate ?? 6.5;
      const term = args.term_years ?? 10;
      const pmt = monthlyPaymentCalc(args.loan_amount, rate, term);
      const annualDebt = pmt * 12;
      const totalInt = (pmt * term * 12) - args.loan_amount;

      const breakEvenRevenue = annualDebt / 0.20;

      const ebitdaLevels = [
        args.loan_amount * 0.10,
        args.loan_amount * 0.15,
        annualDebt,
        annualDebt * 1.25,
        annualDebt * 1.5,
        annualDebt * 2.0,
      ].map((e) => ({
        ebitda: +e.toFixed(0),
        dscr: +(e / annualDebt).toFixed(2),
        status: e / annualDebt >= 1.25 ? 'PASS (lender)' :
          e / annualDebt >= 1.0 ? 'BREAKEVEN' : 'FAIL',
      }));

      return {
        loan_amount: args.loan_amount,
        down_payment: args.down_payment || null,
        rate_pct: rate,
        term_years: term,
        monthly_payment: +pmt.toFixed(0),
        annual_debt_service: +annualDebt.toFixed(0),
        total_interest_paid: +totalInt.toFixed(0),
        total_cost: +(args.loan_amount + totalInt).toFixed(0),
        break_even_revenue: +breakEvenRevenue.toFixed(0),
        break_even_note: 'Assumes 20% EBITDA margin. Adjust for your industry.',
        dscr_table: ebitdaLevels,
        sba_guidelines: {
          max_loan: '$5M (SBA 7a)',
          min_dscr: '1.25x (most lenders require this)',
          typical_term: '10 years working capital, 25 years with real estate',
        },
      };
    },
  },
  {
    name: 'dd_checklist',
    description: 'Generate a due diligence checklist for a business acquisition. Categorized by Financial, Legal, Operations, Real Estate, and Industry-specific items.',
    inputSchema: {
      type: 'object',
      properties: {
        business_type: { type: 'string', description: 'service | product | saas | real_estate | restaurant | hvac | other' },
        size: { type: 'string', description: 'small (<$500k) | mid ($500k-$2M) | large (>$2M)' },
      },
      required: ['business_type'],
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
          'QoE (Quality of Earnings) report — strongly recommended for deals >$1M',
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
          'Environmental assessments (if real estate involved)',
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
          'Social media followers and engagement',
        ],
        real_estate: [
          'Lease agreement — term, rent, renewal options, CAM charges',
          'Landlord consent for assignment',
          'Property condition — when was HVAC/roof/electrical last replaced?',
          'Equipment list and age/condition',
          'FF&E (Furniture, Fixtures & Equipment) included in sale?',
          'Environmental Phase 1 (if buying real estate)',
        ],
      };

      const industryChecks = {
        hvac: [
          'EPA 608 certifications for all technicians',
          'State contractor license — transferable?',
          'Fleet vehicles: age, mileage, condition',
          'Service contracts/maintenance agreements (recurring revenue)',
          'Manufacturer relationships and dealer agreements',
          'Tool and equipment inventory',
        ],
        restaurant: [
          'Health department inspection history',
          'Liquor license — transfer timeline (can take 90+ days)',
          'Food handler certifications',
          'Lease length vs business value (key risk)',
          'Recipe ownership documentation',
          'Grease trap maintenance records',
        ],
        saas: [
          'MRR/ARR reconciliation by customer',
          'Churn rate (monthly and annual)',
          'Customer Acquisition Cost (CAC) and LTV',
          'Codebase audit — tech debt, security vulnerabilities',
          'SLA compliance history',
          'Cloud infrastructure costs (AWS/GCP/Azure)',
          'Vendor/API dependencies',
          'IP ownership — all code assigned to entity?',
        ],
        service: [
          'License and certification requirements by state',
          'Customer contract lengths and cancellation rights',
          'Subcontractor vs employee classification audit',
        ],
        product: [
          'Supplier diversification (avoid single-source risk)',
          'Amazon Seller account health (if applicable)',
          'Returns and warranty claims history',
          'Patent filings and IP protection',
        ],
      };

      const industryKey = Object.keys(industryChecks).find((k) => business_type.toLowerCase().includes(k)) || 'service';
      checklist.industry_specific = industryChecks[industryKey] || industryChecks.service;

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
          'NEVER skip a QoE report on deals over $750k',
        ],
      };
    },
  },
  {
    name: 'save_deal',
    description: 'Save a business acquisition deal to the vault with status tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Business name' },
        asking_price: { type: 'number', description: 'Asking price' },
        revenue: { type: 'number', description: 'Annual revenue' },
        ebitda: { type: 'number', description: 'EBITDA' },
        sde: { type: 'number', description: 'Seller Discretionary Earnings' },
        industry: { type: 'string', description: 'Industry type' },
        status: { type: 'string', description: 'prospecting | loi | due_diligence | closed | passed' },
        notes: { type: 'string' },
        sos_data: { type: 'string', description: 'JSON string with SOS entity data' },
      },
      required: ['name', 'asking_price'],
    },
    async handler(args, { db }) {
      const id = uid();
      const meta = JSON.stringify({
        asking_price: args.asking_price,
        ebitda: args.ebitda,
        sde: args.sde,
        industry: args.industry,
        status: args.status || 'prospecting',
      });
      await db.run(
        `INSERT INTO entities
          (id, name, type, annual_revenue, equity_value, notes, sos_data, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, args.name, args.status || 'prospecting',
        args.revenue, args.asking_price,
        (args.notes ? args.notes + ' | ' : '') + meta,
        args.sos_data || null,
        'investor'
      );
      return { ok: true, id, name: args.name, status: args.status || 'prospecting' };
    },
  },
  {
    name: 'list_deals',
    description: 'List all saved business acquisition deals with status and key metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by: prospecting | loi | due_diligence | closed | passed' },
      },
    },
    async handler({ status } = {}, { db }) {
      const rows = status
        ? await db.all('SELECT * FROM entities WHERE type = ? AND role = ? ORDER BY created_at DESC', status, 'investor')
        : await db.all('SELECT * FROM entities WHERE role = ? ORDER BY created_at DESC', 'investor');

      const deals = rows.map((e) => {
        let meta = {};
        try {
          const metaPart = (e.notes || '').split(' | ').find((s) => s.startsWith('{'));
          if (metaPart) meta = JSON.parse(metaPart);
        } catch {}
        const sde = meta.sde || 0;
        const ebitda = meta.ebitda || 0;
        const asking = meta.asking_price || e.equity_value || 0;
        const downPmt = asking * 0.10;
        const loanAmt = asking - downPmt;
        const monthlyPmt = loanAmt > 0 ? monthlyPaymentCalc(loanAmt, 6.5, 10) : 0;
        const annualDebt = monthlyPmt * 12;
        const dscr = (ebitda || sde) > 0 ? +((ebitda || sde) / annualDebt).toFixed(2) : null;
        return {
          id: e.id,
          name: e.name,
          status: meta.status || e.type,
          industry: meta.industry,
          asking_price: asking,
          annual_revenue: e.annual_revenue,
          sde,
          ebitda,
          sde_multiple: sde ? +(asking / sde).toFixed(2) : null,
          dscr,
          created_at: e.created_at,
        };
      });

      return { deals, count: deals.length, status_filter: status || 'all' };
    },
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
          description: 'Array of entity IDs to compare (from list_deals)',
        },
      },
      required: ['entity_ids'],
    },
    async handler({ entity_ids }, { db }) {
      const results = [];

      for (const eid of entity_ids) {
        const e = await db.get('SELECT * FROM entities WHERE id = ?', eid);
        if (!e) { results.push({ id: eid, error: 'Not found' }); continue; }

        let meta = {};
        try {
          const metaPart = (e.notes || '').split(' | ').find((s) => s.startsWith('{'));
          if (metaPart) meta = JSON.parse(metaPart);
        } catch {}

        const asking = meta.asking_price || e.equity_value || 0;
        const sde = meta.sde || 0;
        const ebitda = meta.ebitda || 0;
        const revenue = e.annual_revenue || 0;
        const downPmt = asking * 0.10;
        const loanAmt = asking - downPmt;
        const pmt = loanAmt > 0 ? monthlyPaymentCalc(loanAmt, 6.5, 10) : 0;
        const annualDebt = pmt * 12;
        const incomeForDscr = ebitda || sde || 0;
        const dscr = incomeForDscr > 0 && annualDebt > 0 ? +(incomeForDscr / annualDebt).toFixed(2) : null;
        const netAfterDebt = incomeForDscr - annualDebt;
        const payback = downPmt > 0 && netAfterDebt > 0 ? +(downPmt / netAfterDebt).toFixed(1) : null;
        const roi = downPmt > 0 ? +(netAfterDebt / downPmt * 100).toFixed(1) : null;

        const verdict =
          (dscr || 0) >= 1.25 && (sde ? (asking / sde) <= 3.5 : true) && (roi || 0) >= 15 ? 'STRONG BUY' :
            (dscr || 0) >= 1.25 && (sde ? (asking / sde) <= 3.5 : true) ? 'BUY' :
              (dscr || 0) >= 1.25 ? 'HOLD' : 'PASS';

        results.push({
          id: e.id,
          name: e.name,
          industry: meta.industry,
          asking_price: asking,
          sde_multiple: sde ? +(asking / sde).toFixed(2) : null,
          ebitda_multiple: ebitda ? +(asking / ebitda).toFixed(2) : null,
          revenue_multiple: revenue ? +(asking / revenue).toFixed(2) : null,
          dscr,
          payback_years: payback,
          roi_year1_pct: roi,
          annual_cashflow_after_debt: +netAfterDebt.toFixed(0),
          verdict,
        });
      }

      results.sort((a, b) => (b.dscr || 0) - (a.dscr || 0));

      return {
        comparison: results,
        winner: results.find((r) => r.verdict === 'STRONG BUY' || r.verdict === 'BUY')?.name || 'No clear winner — review individually',
        count: results.length,
      };
    },
  },
  {
    name: 'ma_deal_engineer',
    description: 'Dan Peña QLA-style multi-tranche M&A deal structure. Models bank debt + seller note + mezzanine + equity layers, DSCR per tranche, creative term engineering to hit 1.25x coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string' },
        asking_price: { type: 'number', description: 'Total acquisition price in USD' },
        ebitda: { type: 'number', description: 'Annual EBITDA' },
        sde: { type: 'number', description: 'Seller Discretionary Earnings (if small biz)' },
        annual_revenue: { type: 'number' },
        bank_pct: { type: 'number', description: '% of price as senior bank debt (default 60)' },
        bank_rate: { type: 'number', description: 'Bank annual rate % (default 6.5)' },
        bank_term_years: { type: 'number', description: 'Bank amortization period years (default 10)' },
        bank_io_years: { type: 'number', description: 'Interest-only period years on bank debt (default 0)' },
        seller_note_pct: { type: 'number', description: '% of price as seller note (default 25)' },
        seller_note_rate: { type: 'number', description: 'Seller note annual rate % (default 4.0)' },
        seller_note_term_years: { type: 'number', description: 'Seller note term years (default 7)' },
        seller_note_io: { type: 'boolean', description: 'Seller note interest-only? (default true)' },
        mezz_pct: { type: 'number', description: 'Mezzanine layer % of price (default 0)' },
        mezz_rate: { type: 'number', description: 'Mezz annual rate % (default 12.0)' },
        mezz_pik: { type: 'boolean', description: 'Mezz PIK — accrues, no cash service (default false)' },
        equity_pct: { type: 'number', description: 'Override equity % (auto-calc if omitted)' },
      },
      required: ['asking_price', 'ebitda'],
    },
    async handler(args) {
      const price = args.asking_price;
      const ebitdaUsed = args.ebitda || args.sde || 0;

      const bankPct = args.bank_pct ?? 60;
      const sellerPct = args.seller_note_pct ?? 25;
      const mezzPct = args.mezz_pct ?? 0;
      const bankRate = args.bank_rate ?? 6.5;
      const bankTerm = args.bank_term_years ?? 10;
      const bankIoYears = args.bank_io_years ?? 0;
      const sellerRate = args.seller_note_rate ?? 4.0;
      const sellerTerm = args.seller_note_term_years ?? 7;
      const sellerIo = args.seller_note_io ?? true;
      const mezzRate = args.mezz_rate ?? 12.0;
      const mezzPik = args.mezz_pik ?? false;

      const bankAmt = price * bankPct / 100;
      const sellerAmt = price * sellerPct / 100;
      const mezzAmt = price * mezzPct / 100;
      const equityAmt = args.equity_pct != null
        ? price * args.equity_pct / 100
        : price - bankAmt - sellerAmt - mezzAmt;
      const equityPct = +(equityAmt / price * 100).toFixed(2);

      const bankServiceIo = bankAmt * bankRate / 100;
      const bankServiceAmort = annualAmortPayment(bankAmt, bankRate, bankTerm);
      const bankMode = bankIoYears > 0 ? `IO for ${bankIoYears}yr then amortizing` : 'fully amortizing';
      const bankServiceForDscr = bankIoYears > 0 ? bankServiceIo : bankServiceAmort;

      const sellerServiceIo = sellerAmt * sellerRate / 100;
      const sellerServiceAmort = annualAmortPayment(sellerAmt, sellerRate, sellerTerm);
      const sellerService = sellerIo ? sellerServiceIo : sellerServiceAmort;

      const mezzCashService = mezzPik ? 0 : (mezzAmt * mezzRate / 100);

      const totalCashPayService = bankServiceForDscr + sellerService + mezzCashService;
      const bankOnlyDscr = ebitdaUsed > 0 && bankServiceForDscr > 0
        ? +(ebitdaUsed / bankServiceForDscr).toFixed(2) : null;
      const totalDscr = ebitdaUsed > 0 && totalCashPayService > 0
        ? +(ebitdaUsed / totalCashPayService).toFixed(2) : null;
      const bankPasses = bankOnlyDscr != null && bankOnlyDscr >= 1.25;

      const annualCashflow = ebitdaUsed - totalCashPayService;
      const equityRoi = equityAmt > 0
        ? +(annualCashflow / equityAmt * 100).toFixed(1) : null;

      let penaVerdict;
      if (equityPct < 5 && bankPasses) penaVerdict = 'QLA DEAL — Zero or near-zero equity, strong cashflow coverage';
      else if (equityPct < 15 && bankPasses) penaVerdict = 'STRONG STRUCTURE — Low equity, bank-approvable';
      else if (bankOnlyDscr >= 1.0) penaVerdict = 'WORKABLE — Engineer terms further';
      else penaVerdict = 'RESTRUCTURE NEEDED — Negotiate price or extend terms';

      const penaTips = [];
      if (equityPct > 20)
        penaTips.push("Peña: 'Use OPM. You should never put up more than 10% yourself. Go back to the seller.'");
      if (bankOnlyDscr != null && bankOnlyDscr < 1.25 && bankIoYears === 0)
        penaTips.push('Add 1-2 year interest-only period on bank debt — immediately improves DSCR');
      if (bankTerm < 20)
        penaTips.push('Extend to 20-25yr amortization (SBA real estate allows 25yr) — cuts annual service by 30-40%');
      if (!sellerIo)
        penaTips.push('Make seller note interest-only — subordinated IO seller notes are excluded from some bank DSCR calcs');
      penaTips.push("Peña: 'Your first deal is your hardest. Use the business\\'s own cash flows — not yours.'");

      return {
        business_name: args.business_name || 'Target Business',
        asking_price: price,
        ebitda_used: ebitdaUsed,
        deal_structure: {
          bank: {
            amount: +bankAmt.toFixed(0),
            pct: bankPct,
            rate: bankRate,
            term: bankTerm,
            io_years: bankIoYears,
            annual_debt_service_io: +bankServiceIo.toFixed(0),
            annual_debt_service_amort: +bankServiceAmort.toFixed(0),
            mode: bankMode,
          },
          seller_note: {
            amount: +sellerAmt.toFixed(0),
            pct: sellerPct,
            rate: sellerRate,
            term: sellerTerm,
            io: sellerIo,
            annual_service: +sellerService.toFixed(0),
          },
          mezzanine: {
            amount: +mezzAmt.toFixed(0),
            pct: mezzPct,
            rate: mezzRate,
            pik: mezzPik,
            annual_cash_service: +mezzCashService.toFixed(0),
          },
          equity_required: {
            amount: +equityAmt.toFixed(0),
            pct: equityPct,
          },
        },
        dscr: {
          bank_only_dscr: bankOnlyDscr,
          total_dscr: totalDscr,
          bank_threshold: 1.25,
          bank_passes: bankPasses,
          note: 'Bank typically analyzes senior-only DSCR. Seller note subordination is key lever.',
        },
        annual_cashflow_after_all_debt: +annualCashflow.toFixed(0),
        equity_roi_pct: equityRoi,
        pena_verdict: penaVerdict,
        pena_tips: penaTips,
      };
    },
  },
  {
    name: 'dscr_optimizer',
    description: 'What-if DSCR optimizer — given a business and price, shows how adjusting loan terms, IO periods, seller note size, and price hits 1.25x bank coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        asking_price: { type: 'number', description: 'Acquisition asking price in USD' },
        ebitda: { type: 'number', description: 'Annual EBITDA' },
        target_dscr: { type: 'number', description: 'Target DSCR threshold (default 1.25)' },
      },
      required: ['asking_price', 'ebitda'],
    },
    async handler(args) {
      const price = args.asking_price;
      const ebitda = args.ebitda;
      const target = args.target_dscr ?? 1.25;

      function bankDscr(bankAmt, rate, termYears, ioYears) {
        const service = ioYears > 0
          ? bankAmt * rate / 100
          : annualAmortPayment(bankAmt, rate, termYears);
        return { service: +service.toFixed(0), dscr: +(ebitda / service).toFixed(2) };
      }

      function scenario(name, bankPct, rate, termYears, ioYears) {
        const bankAmt = price * bankPct / 100;
        const { service, dscr } = bankDscr(bankAmt, rate, termYears, ioYears);
        return {
          scenario: name,
          bank_pct: bankPct,
          bank_amount: +bankAmt.toFixed(0),
          bank_rate: rate,
          term_years: termYears,
          io_years: ioYears,
          annual_bank_service: service,
          bank_dscr: dscr,
          cashflow_after_bank: +(ebitda - service).toFixed(0),
          passes_target: dscr >= target,
        };
      }

      const scenarios = [
        scenario('1. Baseline (60% bank, 10yr, no IO)', 60, 6.5, 10, 0),
        scenario('2. Extended amortization (60% bank, 20yr)', 60, 6.5, 20, 0),
        scenario('3. Interest-only bridge (60% bank, 2yr IO then 10yr)', 60, 6.5, 10, 2),
        scenario('4. Lower bank exposure (55% bank, 10yr)', 55, 6.5, 10, 0),
        scenario('5. More seller carry (55% bank, 10yr) + 35% seller', 55, 6.5, 10, 0),
        scenario('6. SBA 25yr RE (60% bank, 25yr)', 60, 6.5, 25, 0),
      ];

      const annualServicePerDollar = annualAmortPayment(1, 6.5, 25);
      const maxBankAmt = (ebitda / target) / annualServicePerDollar;
      const maxPrice = +(maxBankAmt / 0.60).toFixed(0);

      const passing = scenarios.filter((s) => s.passes_target);
      const recommended = passing.length > 0
        ? passing.reduce((best, s) => s.bank_dscr > best.bank_dscr ? s : best).scenario
        : 'None achieve target — negotiate price down or increase seller note';

      return {
        asking_price: price,
        ebitda,
        target_dscr: target,
        current_dscr_baseline: scenarios[0].bank_dscr,
        scenarios,
        recommended,
        max_supportable_price: maxPrice,
        max_price_note: `At 60% bank / 25yr amortization / ${target}x DSCR target`,
      };
    },
  },
  {
    name: 'creative_financing_structures',
    description: 'Show 6 creative deal financing structures — interest-only, earnout, revenue share, equity rollover, mezzanine, seller-carry majority — with bank approvability notes.',
    inputSchema: {
      type: 'object',
      properties: {
        asking_price: { type: 'number', description: 'Acquisition asking price in USD' },
        ebitda: { type: 'number', description: 'Annual EBITDA' },
        annual_revenue: { type: 'number', description: 'Annual gross revenue' },
      },
      required: ['asking_price', 'ebitda'],
    },
    async handler(args) {
      const price = args.asking_price;
      const ebitda = args.ebitda;

      function estDscr(annualService) {
        return annualService > 0 ? +(ebitda / annualService).toFixed(2) : null;
      }

      const structures = [
        {
          name: '1. Classic SBA 7(a) + Seller IO Note',
          description: '10% buyer equity down, 65% SBA 7(a) loan, 25% seller note (interest-only, subordinated). Bank underwrites on SBA tranche only.',
          structure_breakdown: { buyer_equity: '10%', sba_loan: '65%', seller_note_io: '25%' },
          equity_required_pct: 10,
          annual_cash_service: +(annualAmortPayment(price * 0.65, 6.5, 10) + (price * 0.25 * 0.04)).toFixed(0),
          estimated_dscr: estDscr(annualAmortPayment(price * 0.65, 6.5, 10)),
          bank_approvable: true,
          best_for: 'First deal, strong EBITDA relative to price, SBA-eligible business',
          risk: 'SBA requires personal guarantee and possible collateral; seller note is subordinated',
          pena_notes: "Classic Peña OPM structure. Seller note forces seller to stay invested in your success.",
        },
        {
          name: '2. Interest-Only Bridge (Year 1-2)',
          description: '10% equity, 60% bank on 2-year IO then converts to 10yr amort, 30% seller IO note. Minimizes Year 1-2 cash service.',
          structure_breakdown: { buyer_equity: '10%', bank_io_bridge: '60%', seller_note_io: '30%' },
          equity_required_pct: 10,
          annual_cash_service: +((price * 0.60 * 0.065) + (price * 0.30 * 0.04)).toFixed(0),
          estimated_dscr: estDscr((price * 0.60 * 0.065) + (price * 0.30 * 0.04)),
          bank_approvable: true,
          best_for: 'Business with near-term growth catalyst; buy time to grow EBITDA before full amort kicks in',
          risk: 'Balloon risk if business does not perform during IO period; refinance risk',
          pena_notes: "IO period is a cash flow gift. Use the freed-up cash to grow the business aggressively in Year 1.",
        },
        {
          name: '3. Majority Seller Finance',
          description: '15% equity, 25% bank (small conventional), 60% seller note. Seller motivated for quick exit.',
          structure_breakdown: { buyer_equity: '15%', bank_conventional: '25%', seller_majority_note: '60%' },
          equity_required_pct: 15,
          annual_cash_service: +(annualAmortPayment(price * 0.25, 6.5, 10) + (price * 0.60 * 0.05)).toFixed(0),
          estimated_dscr: estDscr(annualAmortPayment(price * 0.25, 6.5, 10) + (price * 0.60 * 0.05)),
          bank_approvable: true,
          best_for: 'Aging owner who needs liquidity but not a lump sum; distressed sale; no SBA qualification',
          risk: 'Seller could call note or create friction post-close; get strong legal protections',
          pena_notes: "If the seller finances 60%, they believe in the business. Use that as negotiating leverage — they want you to succeed.",
        },
        {
          name: '4. Earnout Structure',
          description: '15% equity, 50% bank, 35% earnout paid from future profits over 5 years. Low upfront cash service.',
          structure_breakdown: { buyer_equity: '15%', bank_loan: '50%', earnout_from_profits: '35%' },
          equity_required_pct: 15,
          annual_cash_service: +(annualAmortPayment(price * 0.50, 6.5, 10) + (price * 0.35 / 5)).toFixed(0),
          estimated_dscr: estDscr(annualAmortPayment(price * 0.50, 6.5, 10) + (price * 0.35 / 5)),
          bank_approvable: true,
          best_for: 'Gap between buyer and seller on valuation; business with strong growth trajectory',
          risk: 'Earnout disputes are common — define metrics precisely in the purchase agreement',
          pena_notes: "Earnouts bridge the valuation gap. If you're confident in the business, earnouts cost you nothing — you pay from profits you already earned.",
        },
        {
          name: '5. Equity Rollover + Minority Buy-In',
          description: '5% buyer equity, 55% bank, 20% seller note, seller retains 20% equity rollover. Seller has skin in the game.',
          structure_breakdown: { buyer_equity: '5%', bank_loan: '55%', seller_note: '20%', seller_equity_retained: '20%' },
          equity_required_pct: 5,
          annual_cash_service: +(annualAmortPayment(price * 0.55, 6.5, 10) + (price * 0.20 * 0.04)).toFixed(0),
          estimated_dscr: estDscr(annualAmortPayment(price * 0.55, 6.5, 10) + (price * 0.20 * 0.04)),
          bank_approvable: true,
          best_for: 'Owner-operator business where seller relationships are critical; seller wants upside participation',
          risk: 'Seller retains governance rights; define buyout option and timeline clearly',
          pena_notes: "Peña loves this — 5% equity for 80% control. Seller stays engaged, protects key relationships, and you conserve capital for the next deal.",
        },
        {
          name: '6. Mezzanine + Senior Stack',
          description: '10% equity, 50% senior bank, 25% mezzanine (PIK — no cash service), 15% seller note. Mezz accrues until exit.',
          structure_breakdown: { buyer_equity: '10%', senior_bank: '50%', mezz_pik: '25%', seller_note: '15%' },
          equity_required_pct: 10,
          annual_cash_service: +(annualAmortPayment(price * 0.50, 6.5, 10) + (price * 0.15 * 0.04)).toFixed(0),
          estimated_dscr: estDscr(annualAmortPayment(price * 0.50, 6.5, 10) + (price * 0.15 * 0.04)),
          bank_approvable: true,
          best_for: 'Larger deals (>$2M); PE-style structure; plan to exit or refinance within 5 years',
          risk: 'Mezz accrues at 12-15% — compounding is expensive if you hold long; exit timing is critical',
          pena_notes: "PIK mezz is invisible to your cash flow today but explodes on exit. Use it as a bridge, not a permanent structure. Always have an exit plan.",
        },
      ];

      return {
        asking_price: price,
        ebitda,
        annual_revenue: args.annual_revenue || null,
        ebitda_margin: args.annual_revenue
          ? +((ebitda / args.annual_revenue * 100).toFixed(1)) + '%'
          : 'N/A',
        structures,
        summary: {
          lowest_equity_required: structures.reduce((a, b) =>
            a.equity_required_pct < b.equity_required_pct ? a : b).name,
          highest_dscr: structures.reduce((a, b) =>
            (a.estimated_dscr || 0) > (b.estimated_dscr || 0) ? a : b).name,
          all_bank_approvable: structures.every((s) => s.bank_approvable),
        },
        pena_principle: "OPM — Other People's Money. Your job is to structure the deal so the business pays for itself. Never use your own money if you can avoid it.",
      };
    },
  },
  {
    name: 'qla_checklist',
    description: "Dan Peña QLA (Quantum Leap Advantage) acquisition readiness checklist — 7 phases from target identification to close.",
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string' },
        asking_price: { type: 'number' },
        ebitda: { type: 'number' },
        stage: { type: 'string', description: 'prospecting | loi | dd | financing | closing' },
      },
    },
    async handler(args) {
      const stage = (args.stage || 'prospecting').toLowerCase();

      const phases = [
        {
          phase: 1,
          name: 'Target Identification (HPT — High Performance Target)',
          items: [
            'Recurring revenue model confirmed (maintenance contracts, subscriptions, service agreements)',
            'Owner-dependent operations identified — owner works IN the business, not ON it (key leverage point)',
            'Aging owner (55+): natural exit motivation, less patient for drawn-out processes',
            'Valuation below market multiple — targeting <4x EBITDA or <3x SDE',
            'No PE firm or strategic already at the table — avoid auction situations',
            'Essential service business — recession-resistant (HVAC, healthcare, utilities, waste)',
            'Geographic market size validated — large enough to grow, small enough to dominate',
            'Business has been running 3+ years with consistent financials',
          ],
          pena_quote: "'Find a business where the owner is the business. That's your leverage — and your opportunity.'",
        },
        {
          phase: 2,
          name: 'Initial Approach (Direct to Owner)',
          items: [
            'Approach owner directly — bypass business brokers to avoid auction and commission markup',
            'Send handwritten letter on quality stationery — stands out in the age of email',
            'Follow up call within 72 hours of letter delivery',
            'Never show enthusiasm for the business — remain detached and analytical',
            'Initial meeting agenda: learn about the owner, not the business',
            'Identify owner\'s true motivation (retirement, health, divorce, boredom)',
            'Never reveal your maximum price — let them anchor first',
            'Build rapport over multiple meetings before discussing numbers',
          ],
          pena_quote: "'You can always renegotiate down, never up. Never show a seller how much you want his business.'",
        },
        {
          phase: 3,
          name: 'LOI (Letter of Intent)',
          items: [
            'Price submitted (below asking — open with 20-30% below ask)',
            'Exclusivity period: 60-90 days minimum (prevents seller shopping while you do DD)',
            'No-shop clause included in LOI',
            'Good faith deposit: $5,000-$25,000 (refundable during DD, forfeited at closing if buyer walks without cause)',
            'Seller non-compete: minimum 3 years, 25-mile radius, in writing',
            'Key employee retention clause (CFO, top salesperson, ops manager)',
            'Contingencies: financing, satisfactory DD, landlord consent',
            'Asset sale vs. stock sale specified (asset sale preferred for tax efficiency and liability protection)',
            'Working capital peg defined (avoid working capital disputes at close)',
          ],
          pena_quote: "'The LOI is your flag in the ground. Exclusivity is everything — time kills all deals.'",
        },
        {
          phase: 4,
          name: 'Due Diligence',
          items: [
            'Bank statements (24+ months) reconciled to P&L — line by line',
            'All SDE/EBITDA add-backs verified with receipts and documentation',
            'Customer concentration: no single customer >20% of revenue',
            'Top 10 customers by revenue contacted (with seller permission) — validate relationships',
            'QoE (Quality of Earnings) report from independent CPA — required for deals >$1M',
            'All licenses, permits, certifications confirmed as transferable',
            'Lease assignment: landlord consent obtained in writing',
            'Employee list reviewed: identify key-person dependencies',
            'Pending litigation search: federal and state courts',
            'Tax compliance: IRS transcripts pulled (no surprises)',
            'Equipment and asset inspection: condition, age, replacement timeline',
            'Cybersecurity and IP audit (for tech/SaaS businesses)',
            'Environmental Phase 1 (if real estate is part of the deal)',
          ],
          pena_quote: "'Trust but verify — then verify again. Every number the seller gives you is optimistic. Your job is to find reality.'",
        },
        {
          phase: 5,
          name: 'Financing',
          items: [
            'SBA 7(a) pre-approval obtained before LOI if possible',
            'Approach minimum 3 lenders simultaneously — create competition',
            'Seller note structured as subordinated debt (critical for bank approval)',
            'Seller note term sheet includes: IO period, subordination agreement, default cure provisions',
            'Interest-only period negotiated on bank debt (reduces Year 1 DSCR burden)',
            'Bank DSCR confirmed at 1.25x or above on senior debt only',
            'Personal financial statement prepared and submitted to all 3 banks',
            'Business plan / CIM (Confidential Information Memorandum) drafted for bank presentation',
            'Equity contribution minimized — target 10% or below',
            'Closing cost budget prepared (legal, SBA fees, appraisal, environmental)',
          ],
          pena_quote: "'Three banks, not one. Make them compete for your business. The bank that wants you most will give you the best terms.'",
        },
        {
          phase: 6,
          name: 'Negotiation & Close',
          items: [
            'M&A attorney engaged — never use a general practice lawyer',
            'Never negotiate against yourself — make one offer, then wait',
            'Walk-away leverage established before every negotiation session',
            'Earnout structure proposed if gap exists between bid and ask',
            'Seller note used as bridge for any valuation gap',
            'Purchase price allocation negotiated (tax implications for both sides)',
            'Representations and warranties reviewed by attorney',
            'Indemnification provisions and escrow holdback negotiated',
            'Transition period defined: seller stays 90-180 days post-close for handoff',
            'Closing date set and milestone checklist distributed to all parties',
          ],
          pena_quote: "'Silence is your most powerful negotiating tool. Make your offer and shut up. The first person to speak loses.'",
        },
        {
          phase: 7,
          name: 'Post-Acquisition (Peña 100-Day Plan)',
          items: [
            'Keep all key employees — do not fire anyone in the first 30 days',
            'Do NOT change prices immediately — learn the business first',
            'Install weekly reporting: revenue, gross margin, cash position',
            'Meet every key customer personally within 30 days',
            'Identify the single largest expense line — optimize it first',
            'Establish bank relationship with operating account within 7 days of close',
            'Review all vendor contracts for renegotiation opportunities',
            'Map all recurring revenue streams — protect them at all costs',
            'Identify top 3 growth levers — implement fastest one first',
            'Seller transition: structured handoff, introduction to all key relationships',
            'Install your own bookkeeper or CFO by Day 60',
            'First board review / performance report by Day 90',
          ],
          pena_quote: "'The first 100 days determine the next 10 years. Move fast but don't break things. Learn before you lead.'",
        },
      ];

      const stagePhaseMap = {
        prospecting: [1, 2],
        loi: [3],
        dd: [4],
        financing: [5],
        closing: [6, 7],
      };
      const currentPhaseNums = stagePhaseMap[stage] || [1];
      const currentPhases = phases.filter((p) => currentPhaseNums.includes(p.phase));
      const completedPhases = phases.filter((p) => p.phase < Math.min(...currentPhaseNums));

      const totalItems = currentPhases.reduce((sum, p) => sum + p.items.length, 0);
      const completedCount = completedPhases.reduce((sum, p) => sum + p.items.length, 0);
      const totalAll = phases.reduce((sum, p) => sum + p.items.length, 0);
      const score = +((completedCount / totalAll * 100).toFixed(0));

      const penaPrinciples = [
        "Dream 10x bigger than you think possible. Your dreams are too small.",
        "Use other people's money, experience, and credibility. OPE, OPM, OPC.",
        "The most dangerous words in business are 'I can\\'t afford it' and 'I don\\'t have time.'",
        "Your first deal is your best deal. Don't wait for perfect — done is better than perfect.",
        "High goals equal high performance. Low goals equal low performance.",
        "Never tell the seller how much you want his business.",
        "Cash flow is king. Buy businesses with predictable, recurring cash flow.",
      ];

      let verdict;
      if (score >= 80) verdict = 'ON TRACK — Peña would approve. Execute with speed.';
      else if (score >= 50) verdict = 'PROGRESSING — Stay disciplined. Do not skip phases.';
      else if (score >= 20) verdict = 'EARLY STAGE — Focus on HPT criteria before approaching owner.';
      else verdict = 'JUST STARTING — Study the QLA methodology before your first approach.';

      return {
        business_name: args.business_name || 'Target Business',
        asking_price: args.asking_price || null,
        ebitda: args.ebitda || null,
        stage,
        completed_phases: completedPhases.map((p) => ({ phase: p.phase, name: p.name, items_count: p.items.length })),
        current_phase_checklist: currentPhases,
        all_phases_reference: phases.map((p) => ({ phase: p.phase, name: p.name, items_count: p.items.length, pena_quote: p.pena_quote })),
        principles: penaPrinciples,
        score: score + '% complete (based on phases preceding current stage)',
        verdict,
      };
    },
  },
];
