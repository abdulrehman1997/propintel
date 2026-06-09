# Commercial Real Estate Underwriting Spec (Engineer Reference)

Scope: multifamily 5+ units, retail/NNN, office, industrial. This is the methodology professional CRE investors, lenders, and institutions actually use. Where it differs from residential (1-4 unit), it is flagged **[CRE vs RES]**.

Core principle that separates CRE from residential:

- **Residential (1-4 units)** is valued primarily off **comps (sales price per comparable home)** and qualified off the **borrower's personal income/DTI**.
- **CRE is valued off the asset's own income** (NOI ÷ cap rate) and qualified off the **property's cash flow** (DSCR, debt yield). The borrower's W-2 is largely irrelevant. This single fact drives everything below.

Sources are cited inline by label; full URLs in the Sources section.

---

## 1. Core Metrics & Exact Formulas

All dollar figures annual unless noted. Build these as pure functions.

### Income stack (build NOI bottom-up)

```
GPR  (Gross Potential Rent)      = sum(all units/SF at MARKET rent, 100% occupied)
- Loss-to-Lease                  = GPR - in-place contract rent           [CRE; see §3]
= GSR  (Gross Scheduled Rent)    = in-place contract rent
- Vacancy Loss                   = GSR x vacancy %
- Credit Loss / Bad Debt         = GSR x credit-loss %
- Concessions                    = free rent given
+ Other Income                   = parking, laundry, RUBS, late fees, storage, CAM reimb.
= EGI  (Effective Gross Income)
- Operating Expenses (OpEx)      = taxes, insurance, utilities, R&M, mgmt fee, payroll,
                                   admin, marketing, turnover, contract services
= NOI  (Net Operating Income)
```

**NOI = EGI − OpEx.** (TFA 7 Metrics; PropertyMetrics)

**[CRE vs RES] Below-the-line items.** NOI **excludes**: debt service, income tax, depreciation, capital expenditures, tenant improvements (TI), leasing commissions (LC), and replacement reserves. These are subtracted _after_ NOI to get cash flow. Note: agency lenders (Fannie/Freddie) and many institutions **underwrite reserves as an above-NOI expense** (~$250–$300/unit/yr multifamily) — be explicit which convention the model uses.

### Cap Rate (going-in and exit/terminal)

```
Cap Rate            = NOI / Property Value
Property Value      = NOI / Cap Rate            (the valuation engine of CRE)
Going-in Cap Rate   = Year-1 (in-place or forward) NOI / Purchase Price
Exit/Terminal Cap   = Year-(N+1) forward NOI / Sale Price
```

Convention: exit cap is set **0.25%–0.50% above going-in** as a conservatism haircut. (TILT; Tactica). Cap rate ignores leverage, time value, and future capital — never the sole metric. (Investopedia)

### Leverage / lender metrics

```
LTV  (Loan-to-Value)            = Loan Amount / Property Value
DSCR (Debt Service Coverage)    = NOI / Annual Debt Service
        Annual Debt Service     = Interest + Principal Amortization   (full P&I, not I/O)
Debt Yield                      = NOI / Loan Amount
Mortgage Constant (K)           = Annual Debt Service / Loan Amount    (used in sizing, §4)
```

(WSP Loan Sizing; TFA 7 Metrics)

### Return metrics (equity side)

```
Cash-on-Cash (CoC)              = (NOI - Annual Debt Service) / Total Equity Invested
                                  = Before-Tax Cash Flow / Equity
Operating Expense Ratio (OER)   = OpEx / EGI
Break-even Occupancy            = (OpEx + Annual Debt Service) / GPR
                                  (the occupancy % needed to cover all cash outflows)
Price per Unit                  = Purchase Price / # units          [multifamily]
Price per SF                    = Purchase Price / rentable SF       [retail/office/industrial]
Equity Multiple (EMx / MOIC)    = Total Cash Distributed / Total Equity Invested
                                  (includes operating CF + net sale proceeds)
```

### IRR (levered & unlevered)

IRR = discount rate where NPV of the cash-flow stream = 0. Solve numerically (Newton / bisection).

```
Unlevered IRR  : CF stream = [-Purchase Price - CapEx,  NOI_1, ..., NOI_N + Net Sale Price]
                 (ignores debt; isolates asset quality)
Levered IRR    : CF stream = [-Equity_0,  BTCF_1, ..., BTCF_N + Net Sale Proceeds_after_loan_payoff]
                 BTCF = NOI - Debt Service - CapEx
```

Compare the two: leverage should be **accretive** (levered IRR > unlevered). If debt barely lifts IRR while adding risk, the deal is over-levered. (Tactica Returns Summary)

### Typical institutional / lender thresholds

| Metric                 | Multifamily          | Retail   | Office | Industrial | Notes                                        |
| ---------------------- | -------------------- | -------- | ------ | ---------- | -------------------------------------------- |
| Min DSCR               | 1.20–1.25x           | 1.40x    | 1.45x  | 1.30–1.40x | 1.25x is the cross-asset industry norm (WSP) |
| Min Debt Yield         | 6.5–8.5%             | 10%      | 12%    | 9–10%      | 10% is the general CRE baseline (TFA)        |
| Max LTV                | 70–80%               | 65–70%   | 60–70% | 65–70%     | 80% LTV is a relatively hard cap (WSP)       |
| OER                    | 35–45%               | 15–30%\* | 35–50% | 15–25%\*   | \*NNN pushes OER down, see §2                |
| Target Levered IRR     | 12–18%+ (value-add)  | 10–16%   | 12–18% | 12–18%     | (TILT; Tactica ~15–17%)                      |
| Target Equity Multiple | 1.8–2.2x over ~5–7yr | varies   | varies | varies     | 2.0x = doubled equity                        |

In rising-rate environments, **debt yield becomes the binding constraint** because it caps proceeds regardless of structure (it ignores rate and amortization). (WSP; SouthState)

---

## 2. Lease Economics (the CRE-specific layer residential doesn't have)

**[CRE vs RES]** Residential leases are short (12mo), gross (landlord pays everything), and homogeneous. CRE leases are long (3–15yr), structured, and the **expense-responsibility split drives NOI**. Model leases at the lease level, not the property level, for commercial.

### Lease types and how each changes the model

| Lease type                  | Who pays OpEx                                                               | Modeling effect                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gross / Full-Service**    | Landlord pays all (taxes, insurance, CAM, utilities)                        | OpEx fully in model; higher OER; typical office. Use an **expense stop** / base year — tenant reimburses increases over base year.                                                                                               |
| **Modified Gross (MG)**     | Split (e.g., LL pays taxes/insurance, tenant pays own utilities/janitorial) | Partial reimbursements; common office/flex.                                                                                                                                                                                      |
| **NNN (Triple Net)**        | Tenant pays taxes + insurance + CAM (the "three nets") directly             | OpEx ~passes through to tenant → very low OER. NOI ≈ base rent. Underwrite **reimbursement income** + **recovery ratio**; watch vacancy (no recovery on vacant SF → landlord eats those expenses). Typical retail/single-tenant. |
| **Absolute NNN (Bondable)** | Tenant pays everything incl. roof & structure                               | Landlord has near-zero expense; analyze like a bond. Credit of tenant (CTL) drives value.                                                                                                                                        |

Key CRE income concepts not present in residential:

- **CAM (Common Area Maintenance)** reimbursements; **recovery ratio** = reimbursed OpEx / recoverable OpEx.
- **Expense stop / base year** (gross leases): tenant pays pro-rata share of expenses above a base.
- **Rent escalations / bumps**: fixed (e.g., 3%/yr) or **CPI** indexed.
- **TI (tenant improvements)** and **LC (leasing commissions)**: large below-NOI capital outflows on new/renewing leases — must model on rollover.
- **WALT** (Weighted Avg Lease Term) and **rollover schedule**: when leases expire and re-lease risk hits.

### Per-unit vs per-SF underwriting

|              | Multifamily                               | Retail / Office / Industrial                      |
| ------------ | ----------------------------------------- | ------------------------------------------------- |
| Pricing unit | **per unit** ($/unit)                     | **per SF** ($/SF)                                 |
| Rent quoted  | $/unit/month                              | $/SF/year (US)                                    |
| Granularity  | rent roll by unit type/floorplan          | rent roll by **suite/tenant + lease terms**       |
| Vacancy      | physical + economic vacancy %, ~5–10%     | tied to lease rollover + downtime between tenants |
| Value driver | rent growth + expense control + occupancy | **lease structure + tenant credit + WALT**        |
| Lease term   | ~12 months                                | 3–15 years                                        |

---

## 3. The Underwriting Workflow (step by step)

1. **Collect & scrub source docs**: **T-12** (trailing-12 P&L), **T-3** (trailing-3, annualized — catches recent momentum), **rent roll**, property tax bills, offering memorandum, capital/CapEx history, service contracts, **estoppels** (commercial).
2. **Rent roll review**: list every unit/suite — for multifamily: unit type, in-place rent, market rent, lease dates, occupancy. For commercial: tenant, SF, base rent $/SF, lease type, expiration, escalations, options, reimbursements.
3. **In-place vs market rent → Loss-to-Lease**: `LTL = market rent − in-place rent`. Identifies immediate upside. **Value-add convention: in Year 1 forecast off ACTUAL in-place rents (burn LTL to 0), then grow; do not assume instant market rent.** (Tactica)
4. **Expense normalization** (critical — sellers understate):
   - Re-assess **property taxes** to post-sale reassessed basis (often the single biggest miss).
   - Mark **management fee** to market (3–5% EGI) even if owner self-manages.
   - Add **replacement reserves** ($250–$300/unit multifamily; $0.15–$0.40/SF commercial).
   - Strip out one-time/non-recurring items; annualize partial-year data; insurance to current quotes.
   - Lenders may add back reserves/mgmt fee to compute **underwritten (lender-adjusted) NOI**. (TFA)
5. **Build stabilized / value-add proforma**: apply renovation premiums (phased rent bumps as units turn), rent growth, expense inflation, vacancy during reno, lease-up curve → **Stabilized NOI**.
6. **Value the asset**: `Value = Stabilized NOI / going-in cap`. Compare to ask price and price/unit or price/SF vs comps.
7. **Size the debt** (§4): min of LTV-, DSCR-, debt-yield-constrained loan → **Max Loan**; `Required Equity = Total Cost − Max Loan` (Total Cost = price + closing + CapEx + reserves).
8. **Project hold & exit** (§5): N-year cash flows, terminal value at exit cap, sale costs, loan payoff → returns.
9. **Sensitize & stress** (§6), score risk, decide.

---

## 4. Debt Sizing Math (exact)

Three independent caps; lender takes the **MIN**. (WSP Loan Sizing)

```
Loan_LTV   = MaxLTV × Property Value
Loan_DY    = NOI / MinDebtYield
Loan_DSCR  = NOI / (MinDSCR × K)        where K = mortgage constant (annual debt service per $1 of loan)

Max Loan   = MIN(Loan_LTV, Loan_DY, Loan_DSCR)
Required Equity = Total Project Cost − Max Loan
```

**Mortgage constant K** (the link between rate/amortization and DSCR sizing):

```
monthly rate r = annual_rate / 12 ;  n = amort_years × 12
K = 12 × [ r / (1 − (1 + r)^(−n)) ]          # = annual P&I per $1 borrowed
# Interest-only loan: K = annual_rate
Loan_DSCR = NOI / (MinDSCR × K)
```

**Worked example (WSP):** NOI $2.0M, cap 8% → Value $25M. Constraints: MaxLTV 70%, MinDY 8%, MinDSCR 1.25x, rate 6.5%, amort 25yr.

- Loan_LTV = 70% × $25M = **$17.5M**
- Loan_DY = $2.0M / 8% = **$25.0M**
- Loan_DSCR ≈ $2.0M / (1.25 × K) ≈ **$19.5M**
- **Max Loan = MIN = $17.5M** (LTV binds). Resulting LTV 64%(of higher value), DY 12.5%, DSCR 1.52x. (Here LTV is binding; in high-rate markets DSCR or DY usually binds.)

---

## 5. Returns & Waterfall Basics

**Net sale proceeds at exit:**

```
Sale Price        = Year-(N+1) forward NOI / Exit Cap Rate
Sale Costs        = Sale Price × (brokerage + closing) %   (~1–3%)
Net Sale Proceeds = Sale Price − Sale Costs − Outstanding Loan Balance
```

Feed into IRR/EMx (§1). Typical hold **5–7 yr** (value-add) to **10 yr** (core). Longer hold lowers IRR but can raise EMx. (Tactica)

**Waterfall (concept only):** equity returns are split between **LP (investors)** and **GP (sponsor)** in tiers:

1. **Return of capital** + **preferred return** ("pref", ~6–9%) to LP first.
2. **GP catch-up** (optional).
3. **Promote / carried interest**: above hurdle IRRs, GP takes a disproportionate share (e.g., 20% above an 8% pref, 30% above 15%). Tiers keyed to LP IRR hurdles. American vs European waterfall = deal-by-deal vs whole-fund. Build as ordered tier functions over the distributable cash stream.

---

## 6. Risk Scoring & Stress Tests

Run a 2-variable **sensitivity grid** (data table) on the headline metric (Levered IRR and/or DSCR). Institutions flag the deal if base case is fragile to small adverse moves.

| Stress variable             | Typical shock                              | What it tests / flags                                                                                           |
| --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Exit cap rate**           | +50 to +150 bps vs entry                   | Cap-rate expansion is the #1 institutional risk; tests reliance on multiple compression / "going-out optimism". |
| **Vacancy**                 | +300–500 bps; or test break-even occupancy | Cash-flow cushion; if break-even occ > ~85–90% → thin margin flag.                                              |
| **Interest rate**           | +100–200 bps (esp. floating bridge debt)   | Re-runs DSCR/debt-yield; flags refinance/maturity risk.                                                         |
| **Rent growth**             | base, 0%, −X%                              | Tests dependence on aggressive rent assumptions.                                                                |
| **CapEx/reno cost overrun** | +10–20%                                    | Value-add execution risk (Tactica renovation stress test).                                                      |

Institutional red flags: going-in cap < market and exit cap ≤ going-in (no haircut); DSCR < 1.20x in base case; debt yield < threshold at close; break-even occupancy > current submarket occupancy; rent growth > inflation sustained; lease rollover concentration (large % of WALT expiring in one year); single-tenant credit concentration (NNN). Produce a composite score from: DSCR margin, debt-yield margin, break-even-occupancy cushion, IRR sensitivity to exit cap, and rollover concentration.

---

## Implementation Notes for the Analyzer

- Model as pure functions over an income-stack object; keep NOI conventions (reserves above/below line) configurable.
- Separate **asset layer** (NOI, value, unlevered IRR) from **capital layer** (debt sizing, levered IRR, equity, waterfall) — mirrors how institutions split deal vs structure.
- Multifamily: rent roll keyed by unit/floorplan. Commercial: rent roll keyed by **suite/lease** with type, $/SF, escalations, expiry, reimbursements, TI/LC.
- IRR solver: Newton-Raphson with bisection fallback; guard for no-sign-change streams.
- Debt sizing must always return the binding constraint label, not just the number.

## Sources

- Wall Street Prep — Loan Sizing: https://www.wallstreetprep.com/knowledge/loan-sizing/
- Wall Street Prep — DSCR: https://www.wallstreetprep.com/knowledge/dscr-debt-service-coverage-ratio/
- The Fractional Analyst — 7 Key Metrics for CRE Underwriting: https://thefractionalanalyst.com/tfa-blog/7-key-metrics-for-commercial-real-estate-underwriting-1
- Tactica RES — Ultimate Guide to Multifamily Value-Add Underwriting: https://www.tacticares.com/blog-feed/the-ultimate-guide-to-multifamily-value-add-underwriting
- TILT Analytics — How to Underwrite a Multifamily Acquisition: https://tiltanalytics.com/how-to-underwrite-a-multifamily-acquisition-a-step-by-step-guide/
- SouthState — How Banks Use Debt Yield Ratio: https://southstatecorrespondent.com/banker-to-banker/commercial/how-banks-use-debt-yield-ratio-for-underwriting/
- Investopedia — Capitalization Rate: https://www.investopedia.com/terms/c/capitalizationrate.asp
- J.P. Morgan — What is DSCR: https://www.jpmorgan.com/insights/real-estate/commercial-term-lending/what-is-debt-service-coverage-ratio-dscr-in-real-estate
- Adventures in CRE (A.CRE) — Glossary of CRE Terms: https://www.adventuresincre.com/glossary/
- CCIM — basic financial concepts framework (industry standard)
