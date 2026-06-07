# Residential REI Underwriting Methodology — Engineering Spec

How professional buy-and-hold / BRRRR / 1–4 unit / institutional SFR investors actually underwrite a deal. Built for direct implementation in a web analyzer. Formulas are exact; thresholds are encoded as constants you can put in a config file.

Scope: residential (SFR + small multifamily 1–4 units). Commercial-grade metrics (cap rate, DSCR, debt yield, IRR) are included because pros apply them to residential too, but with residential-specific cautions noted inline.

Sources are cited inline by `[label]`; full URLs in the **Sources** section at the bottom.

---

## 0. Data model (inputs the engine needs)

```
PropertyInputs {
  purchasePrice            // $
  rehabBudget              // $ (0 for turnkey)
  arv                      // after-repair value $ (BRRRR / value-add)
  closingCostsBuy          // $ or % of price (default 2–5%)
  units[]                  // each: { marketRent, currentRent, sqft, beds }

  // Financing
  downPaymentPct           // e.g. 0.20–0.25 conventional, 0.0 if cash
  interestRate             // annual nominal
  amortYears               // 30 typical
  loanType                 // conventional | DSCR | hard-money(BRRRR)

  // Operating assumptions (% unless noted) — see §3 for defaults
  vacancyPct
  managementPct
  maintenancePct
  capexPct
  propertyTaxAnnual        // $ (use actual / reassessed, NOT seller's)
  insuranceAnnual          // $
  otherOpexAnnual          // HOA, utilities-if-owner-paid, etc.

  // Projection assumptions — see §4
  rentGrowthPct            // annual
  expenseGrowthPct         // annual
  appreciationPct          // annual
  holdYears
  exitCapRate / terminalCapRate
  saleCostPct              // disposition

  // BRRRR-specific
  refiLtv                  // 0.70–0.75
  refiRate, refiAmortYears
  rehabMonths              // carrying-cost period
}
```

> **Critical input rule pros follow:** never trust the seller's pro forma. Re-underwrite taxes at the *reassessed* value (often reset to purchase price on sale), pull *market* rents from comps, and add real reserves. Underestimating expenses is the #1 underwriting mistake [Doorvest].

---

## 1. Core Metrics — Formulas & Thresholds

Order of derivation matters: GSI → EGI → OpEx → NOI → debt service → cash flow → returns.

### 1.1 Income build-up

```
GSI  (Gross Scheduled Income)  = Σ marketRent × 12
Vacancy Loss                   = GSI × vacancyPct
EGI  (Effective Gross Income)  = GSI − Vacancy Loss + otherIncome
```

### 1.2 NOI (Net Operating Income) — the foundation of everything

```
OpEx = management + maintenance + capex_reserve + propertyTax + insurance + otherOpex
NOI  = EGI − OpEx
```
**EXCLUDE from OpEx (do not double count):** mortgage principal & interest, depreciation, income tax, one-time capital improvements (those go into basis/IRR cash flows, not annual OpEx). NOI is *pre-debt, pre-tax* [Investopedia cap rate].

> Residential nuance: many pros fold a **capex reserve** into OpEx for NOI even though appraisers sometimes don't. Be explicit in the UI which convention you use, because it shifts cap rate.

### 1.3 Cap Rate
```
Cap Rate = NOI / Current Market Value      (preferred)
Cap Rate = NOI / (Purchase Price + Rehab)  (acquisition basis)
```
Use **market value** version for comparison; acquisition version for *yield-on-cost* [Investopedia cap rate], [BP metrics].
- **Threshold:** No universal "good" number — it is market- and class-dependent. Lower cap = lower risk/pricier market; higher cap = higher risk/cash-flow market [Investopedia cap rate]. Practical residential bands: **A-class metro ~4–5%, B ~5–7%, C ~7–9%+**. Flag deals priced *below* local comparable cap as overpriced.
- Residential caution: BP notes cap rate is "erratic" for houses because turnover/repairs are lumpy — best for 2–4 unit comparisons, weaker for single SFR [BP metrics].

### 1.4 Yield-on-Cost (institutional favorite for BRRRR/value-add)
```
Yield on Cost = Stabilized NOI / (Purchase + Rehab + closing + carry)
```
- **Threshold / "development spread":** target **150–200+ bps above the market exit cap**. If you build to a 7% YoC and market cap is 5%, you've manufactured value. Below ~100 bps spread = not worth the execution risk.

### 1.5 Cash-on-Cash Return (CoC) — "most important number" for buy-and-hold [BP]
```
Annual Pre-Tax Cash Flow = NOI − Annual Debt Service
Cash Invested = downPayment + closingCostsBuy + rehab + initial reserves
CoC = Annual Pre-Tax Cash Flow / Cash Invested
```
- **Threshold:** pros commonly target **≥ 8%**, with **8–12%** considered solid; **>12%** strong. Cash deals show lower CoC but lower risk. CoC is a Year-1 snapshot only [BP metrics].

### 1.6 Debt Service & DSCR
```
Monthly P&I = L × c(1+c)^n / ((1+c)^n − 1)   where c = rate/12, n = amortYears×12, L = loan
Annual Debt Service (ADS) = Monthly P&I × 12
DSCR = NOI / ADS
```
- **Threshold:** lenders require **1.20–1.25 minimum**; **≥1.25 comfortable, ≥2.0 very strong, <1.0 = negative cash flow** [Investopedia DSCR]. DSCR loans (no income docs) are now the dominant residential investor product and underwrite to property cash flow at ~1.0–1.25.

### 1.7 Debt Yield (lender stress metric, rate-independent)
```
Debt Yield = NOI / Loan Amount
```
- **Threshold:** lenders want **≥ 10%** (some accept 8–9% in strong markets) [TFA 7 Metrics]. Unlike DSCR/LTV it ignores rate & amortization, so it's the cleanest leverage-risk gauge.

### 1.8 Max Loan Sizing (lender picks the *lowest* of three)
```
Max Loan (LTV)        = maxLTV × Value
Max Loan (DSCR)       = NOI / minDSCR ... (more precisely: solve P&I = NOI/minDSCR for L)
Max Loan (DebtYield)  = NOI / minDebtYield
Loan = min(of the three)
```
[WSP Loan Sizing]

### 1.9 GRM (Gross Rent Multiplier) / Gross Yield
```
GRM        = Price / Annual Gross Rent
Gross Yield = Annual Gross Rent / Price     (inverse of GRM)
```
- **Threshold:** lower GRM = better; typical residential **4–8 good, 8–12 fair, >12 expensive**. Ignores expenses — screening only [GRM search].

### 1.10 Break-Even Occupancy
```
Break-Even Occupancy = (OpEx + Annual Debt Service) / GSI
```
- **Threshold:** want **< 85%** (lender preference); **60–80% healthy** band. The gap between break-even and market occupancy = your cushion [PropertyMetrics/FNRP].

### 1.11 ROI / Total ROI (hold-period view)
```
Total Annual Return $ = Cash Flow + Principal Paydown + Appreciation (+ tax benefit, optional)
Total ROI = Total Annual Return / Cash Invested
```
Captures all four wealth levers vs CoC's one. Use for hold-period thinking [Doorvest].

### 1.12 IRR (Internal Rate of Return)
```
0 = Σ_{t=0..N} CF_t / (1+IRR)^t
CF_0 = −(downPayment + closing + rehab)
CF_t = annual pre-tax cash flow (years 1..N−1)
CF_N = year-N cash flow + net sale proceeds
```
Compute numerically (Newton/bisection) — same as spreadsheet `IRR()`/`XIRR()` [Investopedia IRR], [BP metrics].
- **Threshold:** residential buy-and-hold pros target **levered IRR ~12–20%**; value-add/BRRRR higher. IRR captures *timing* + time value, which CoC and EM miss.

### 1.13 Equity Multiple (EM)
```
EM = Total Cash Distributions (incl. net sale) / Total Equity Invested
```
- **Threshold:** **>1.0 = profit; ~1.8–2.5x** common for multi-year residential holds. EM ignores time — always pair with IRR [BP metrics].

### 1.14 Quick rules-of-thumb (screening filters, NOT decisions)
| Rule | Formula | Pass |
|---|---|---|
| 1% Rule | monthly rent ≥ 1% × price | rent/price ≥ 0.01 |
| 2% Rule | monthly rent ≥ 2% × price | ≥ 0.02 (rare; deep cash-flow markets) |
| Rent/Cost | monthly rent / (price+rehab) | aim ≥ 1%, target ~1.5% [BP] |
| 50% Rule | OpEx ≈ 50% of EGI (excl. debt) | sanity-check OpEx model [BP] |
| 70% Rule (BRRRR/flip) | max offer = 0.70 × ARV − rehab | offer ≤ that |
All ignore expenses/financing — encode as fast pre-filters, never as the verdict [1%/2% search], [Doorvest].

---

## 2. Underwriting Workflow (the order a pro runs it)

1. **Market screen** — durable demand: job/population growth, rent-to-income, vacancy trend, landlord-friendliness, school/crime, supply pipeline. Assign a market grade (A/B/C). Appreciation thesis lives here, not in the deal math.
2. **Property screen (quick filters)** — 1% rule / rent-to-price / GRM to kill obvious losers fast [Doorvest sequence].
3. **Rent comps** — set *market* rent from 3–5 comparable leased units (not asking rents, not seller's rent). Drives GSI.
4. **Expense modeling** — build OpEx bottom-up (§3); cross-check against 50% rule and against actual T-12 if available.
5. **NOI + cap rate** — operating strength, apples-to-apples vs market cap.
6. **Financing layer** — size loan (min of LTV/DSCR/DebtYield), compute P&I, DSCR, debt yield, break-even occupancy.
7. **Returns** — CoC (capital efficiency), then Total ROI / IRR / EM (hold horizon).
8. **Exit & projections** — multi-year pro forma, terminal value, sale costs (§4).
9. **Risk/quality scoring + stress tests** (§5) before the go/no-go.

Sequencing principle: **screening metrics to move fast; decision metrics to avoid fooling yourself** [Doorvest].

---

## 3. Expense Modeling (realistic % assumptions)

Model each line item; do not just apply the 50% rule (that's a *check*). Percentages are **% of EGI/GSI** unless noted. Adjust by class/age.

| Line item | Typical % | Notes & class/age adjustment |
|---|---|---|
| **Vacancy** | 5–8% | A-class metro can be ~3–5% (≤1% in tightest markets); C-class 8–10%+ due to turnover/delinquency [SFR class search]. Use local market vacancy. |
| **Property Management** | 8–10% (often 10%); 12% if full-service | Always model it even if self-managing (your time has cost). Lease-up fees extra (~½–1 month rent). |
| **Maintenance/Repairs** | 5–10% | Newer/turnkey ~5%; older (>30–50 yr) 10%+; deferred maintenance higher [expense search]. |
| **CapEx reserve** | 5–10% (or **2–7% of property value/yr**, or **$200–300/unit/mo**) | Compute bottom-up: Σ(replacement cost / useful life) per component (roof ~20–25yr, HVAC ~15–20yr, water heater ~10yr, etc.). Old/deferred-maintenance props → high end [SparkRental], [Tactica reserves ≈ $300/unit/yr to /mo]. |
| **Property Tax** | actual $ | Re-underwrite at reassessed value (often = purchase price). Never use seller's taxes. |
| **Insurance** | actual $ | Rising fast in FL/TX/CA (wind/fire/flood). Quote, don't assume. |
| **Other** | varies | HOA, owner-paid utilities, lawn/snow, accounting, legal, licensing. |

**Class heuristics:**
- **Class A** (new/luxury, A markets): low vacancy (~3–5%), low maintenance/capex (~5%), thinner cap rate. OpEx ratio ~35–45% of EGI.
- **Class B** (1980s–2000s, stable): mid everything; OpEx ~45–50%.
- **Class C** (older, blue-collar): high vacancy (8–10%), high maintenance/capex (10%+), higher delinquency; OpEx ratio can exceed 50% — the 50% rule is a *floor* here [BP class note], [SFR class search].

**Cross-check:** if your bottom-up OpEx is far below 50% of EGI on an older property, you're probably under-reserving.

---

## 4. Exit & Projections

Build a year-by-year pro forma over `holdYears`.

| Assumption | Conservative default | Notes |
|---|---|---|
| **Rent growth** | 2–3%/yr | Long-run ~CPI; pros separate *baseline* organic growth from *value-add premium* (BRRRR/renovation lift modeled as one-time step) [Tactica value-add]. |
| **Expense growth** | 2–3%/yr | Often modeled ≥ rent growth (taxes/insurance outpacing) for conservatism. |
| **Appreciation** | 2–3%/yr | Market-thesis driven; never use it as a "rescue story" to justify a thin deal [Doorvest]. |
| **Terminal/Exit cap** | entry cap **+ 25–100 bps** | Expand the exit cap above entry for conservatism (rates rise, asset ages). E.g. 5.25% + 0.10%/yr × hold [Tactica residual]. |
| **Sale/disposition costs** | 6–8% of sale price | Broker commission (~5–6%) + transfer tax + closing + seller credits [Tactica residual]. |

```
Terminal Value (Year N) = NOI_{N+1} / exitCapRate
Net Sale Proceeds = Terminal Value × (1 − saleCostPct) − Loan Balance_N
```
Feed `Net Sale Proceeds` into the final IRR/EM cash flow (§1.12–1.13).

### 4.1 BRRRR / Refinance Math
```
Refi Loan Amount        = ARV × refiLtv            (typically 0.70–0.75) [BP, 70% rule]
All-In Cost             = purchase + rehab + closing + holding/carry costs
Cash Left In Deal       = All-In Cost − Refi Loan Amount
Cash Recovered          = Refi Loan Amount − original financing paid off
Post-Refi Cash Flow     = NOI − new ADS(refiRate, refiAmortYears)
Post-Refi CoC           = Post-Refi Cash Flow / Cash Left In Deal
```
- **"Infinite return" condition:** `Cash Left In Deal ≤ 0` (you pulled out 100%+ of capital) and Post-Refi Cash Flow > 0. The whole BRRRR thesis is buying + forcing equity so the 70–75% refi returns your capital [BP BRRRR].
- **Carry costs matter:** model `rehabMonths` of hard-money interest + taxes + insurance + utilities during rehab — a common BRRRR blow-up.
- **Seasoning:** lenders often require 6–12 months before cash-out at ARV; flag this.

---

## 5. Risk / Quality Scoring (beyond one number)

Pros never decide on a single metric. Implement a composite score + hard red-flag gates + stress tests.

### 5.1 Composite deal score (suggested weighting — tune later)
Score each 0–100, weight, sum:
- Cash flow strength (CoC, DSCR) — 25%
- Return (IRR / EM / Total ROI) — 20%
- Valuation (cap vs market, GRM, price/ARV) — 15%
- Market quality (A/B/C grade) — 20%
- Risk cushion (break-even occupancy gap, debt yield) — 10%
- Condition/age & capex risk — 10%

### 5.2 Hard red-flag gates (auto-fail or strong warn)
- DSCR < 1.20 at market rents
- Negative or near-zero cash flow at Year 1
- Break-even occupancy > 85%
- CoC < ~5% **and** thin appreciation thesis (no rescue) [Doorvest]
- Bottom-up OpEx << 50% of EGI on an old property (under-reserved)
- Deal only works if appreciation/rent-growth assumptions are aggressive
- BRRRR: cash left in deal high AND post-refi CoC weak
- Taxes modeled at seller's basis, not reassessed
- Single metric strong while others fail (BP/Doorvest warn against letting one metric override) [Doorvest]

### 5.3 Stress tests / sensitivity (institutional standard)
Run automatically and show pass/fail [SFR institutional, Tactica stress tests]:
- **Rent −5% / −10%** → recompute DSCR, CoC, cash flow
- **Vacancy +5 pts** (e.g. 5%→10%)
- **OpEx +10–20%** (insurance/tax shock)
- **Interest rate +100–200 bps** (refi/ARM risk; BRRRR exit rate)
- **Exit cap +50–100 bps** (terminal value haircut)
- **Combined "bad case"** (rent down + vacancy up + rate up simultaneously)
- **2-variable data table** (e.g. rent × exit cap) — institutional sensitivity grid; hold all else constant [SFR institutional].
Output: does DSCR stay ≥ 1.0? Does cash flow stay positive? How much IRR erodes.

---

## 6. Threshold Constants (drop into config)

```js
const THRESHOLDS = {
  onePercentRule: 0.01,
  twoPercentRule: 0.02,
  rentCostTarget: 0.015,
  cocMin: 0.08, cocStrong: 0.12,
  dscrMin: 1.25, dscrFloor: 1.20, dscrStrong: 2.0,
  debtYieldMin: 0.10,
  breakEvenOccMax: 0.85,
  yieldOnCostSpreadBps: 150,   // over exit cap
  grmGood: 8, grmExpensive: 12,
  irrTarget: 0.15,             // levered, buy-and-hold
  emTarget: 2.0,
  // operating defaults (fractions of EGI)
  vacancy: { A:0.04, B:0.06, C:0.09 },
  management: 0.10,
  maintenance: { new:0.05, mid:0.08, old:0.10 },
  capex: { new:0.05, mid:0.07, old:0.10 },  // or $250/unit/mo
  // projections
  rentGrowth:0.025, expenseGrowth:0.03, appreciation:0.025,
  exitCapBumpBps: 50,          // entry cap + 50bps
  saleCostPct: 0.07,
  // BRRRR
  refiLtv:0.75, seventyRuleArvPct:0.70,
};
```

---

## Sources
- BiggerPockets — 11 Essential Real Estate Metrics: https://www.biggerpockets.com/blog/real-estate-metrics
- BiggerPockets — The BRRRR Method: https://www.biggerpockets.com/blog/the-brrrr-method
- Investopedia — Cap Rate: https://www.investopedia.com/terms/c/capitalizationrate.asp
- Investopedia — DSCR: https://www.investopedia.com/terms/d/dscr.asp
- Investopedia — IRR: https://www.investopedia.com/terms/i/irr.asp
- Doorvest — How to Analyze an SFR (underwriting metrics 2026): https://doorvest.com/blog/sfr-underwriting-metrics-2025
- SparkRental — Understanding CapEx for Landlords: https://sparkrental.com/understanding-capex-for-landlords/
- Tactica RES — Multifamily Value-Add Underwriting & Stress Tests: https://www.tacticares.com/blog-feed/the-ultimate-guide-to-multifamily-value-add-underwriting , https://www.tacticares.com/blog-feed/multifamily-development-4-critical-stress-tests
- PropertyMetrics / FNRP — Break-Even Occupancy: https://propertymetrics.com/blog/how-the-breakeven-occupancy-ratio-works/ , https://fnrpusa.com/blog/break-even-occupancy-commercial-real-estate/
- The Financing Advisory (TFA) / Wall Street Prep — Debt Yield & Loan Sizing: https://www.wallstreetprep.com/knowledge/debt-yield/
- 1%/2% rules — RealWealth / Azibo / CommercialRealEstate.loans: https://realwealth.com/learn/1-percent-rule-2-percent-rule-real-estate-investing/
- Institutional SFR underwriting & securitization — S&P/Moody's methodology, RCLCO BFR/SFR: https://www.spglobal.com/ratings/en/research/articles/240220-rfc-process-summary-rfc-process-summary-u-s-single-family-rental-securitization-methodology-and-assumption-12995060
