# CS 1710 — Post-grad city dataset

Cleaned, merged data for 40 U.S. metro areas covering salary, cost of living, jobs, housing, transportation, demographics, and change over time — built to support the full Milestone 2 question list, not just the four selected sketches.

Rebuild everything with `python3 build.py` (needs pandas + openpyxl). Raw source files are in `raw/`.

## Files

- **`cities.csv`** — one row per city (40 rows, ~50 columns). The main file.
- **`city_by_field.csv`** — one row per city × career field (447 rows): jobs, salary, and savings per field, for "pick your industry" interactions.
- **`city_occupations.csv`** — one row per city × occupation (4,538 rows), for drill-downs and tooltips.
- **`city_trends.csv`** — one row per city × year, 2008–2024 (680 rows): price level, housing costs, and income over time.

## Question coverage

| Q | Question | Where |
|---|---|---|
| 1 | Salary needed to live in a place | `epi_annual_total` |
| 2 | Compare starting salaries across cities | `entry_salary_p10/p25/median`, `city_occupations.csv` (distributions) |
| 3 | Lowest cost of living | `rpp_all_items`, `epi_annual_total` |
| 4 | Which states pay most taxes | `epi_monthly_taxes`, `epi_effective_tax_rate` |
| 5 | Where salary goes furthest (COL-adjusted) | `salary_col_adjusted` |
| 6 | Rent share of income | `rent_share_of_take_home` |
| 7 | Most job opportunities for grads | `entry_level_jobs`, `entry_jobs_per_1000`, `unemployment_rate` |
| 8 | Largest 20-something populations | `pop_age_20_29`, `share_age_20_29` |
| 9 | Afford to live without roommates | `can_afford_studio_alone`, `rent_studio` |
| 10 | Roommate savings | `rent_1br` vs `rent_per_person_2br/3br_shared` |
| 11 | Easiest without a car | `pct_commute_transit/walk/drive_alone` |
| 12 | Commute times | `mean_commute_min` |
| 13 | Opportunity vs affordability balance | `entry_jobs_per_1000` × `salary_col_adjusted` / `est_monthly_savings` |
| 14 | Affordability over time | **`city_trends.csv`** |
| 15 | Expenses besides rent driving COL differences | `rpp_goods/utilities/other_services`, `epi_monthly_*` |
| 16 | Less-popular cities with similar opportunity, lower cost | all of the above, filtered by `population` |
| 17 | Best city by salary/industry/lifestyle (slider tool) | `city_by_field.csv` + lifestyle columns |
| 18 | Expected monthly savings | `est_monthly_savings`, `months_to_save_10k` |

Also included: `gas_regular` (Lorena's gas-price question), `pct_bachelors_plus`, `median_household_income`, `pct_work_from_home`.

## Sources

| Source | What we used | Vintage |
|---|---|---|
| [EPI Family Budget Calculator](https://www.epi.org/resources/budget/) | Monthly "modest but adequate" budget, **1 adult, 0 children**: housing, food, transportation, healthcare, other necessities, taxes | 2026 edition (2025 $) |
| [BLS OEWS](https://www.bls.gov/oes/tables.htm) | Employment & wage percentiles per occupation per metro | May 2025 |
| [BLS Employment Projections, Table 5.4](https://www.bls.gov/emp/tables/education-and-training-by-occupation.htm) | Occupations typically requiring a **bachelor's degree, no prior experience** (132 occs) = our "entry-level grad job" | 2025 |
| [BLS LAUS](https://www.bls.gov/lau/) (public API) | Metro unemployment rate | 2025 annual avg |
| [Census ACS 1-year](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/) | Age structure (B01001), commute (B08013/B08301), rent by bedrooms (B25031), education (B15003), household income (B19013), gross rent (B25064) | 2024 (trends: 2021–24) |
| [BEA Regional Price Parities](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area) (MARPP/MAIRPD) | Cost-of-living index (all items, goods, housing, utilities, other services) + metro price deflator | 2008–2024 |
| [BEA CAINC1](https://apps.bea.gov/regional/downloadzip.htm) + [Census CBSA delineation](https://www.census.gov/geographies/reference-files/time-series/demo/metro-micro/delineation-files.html) | Per-capita personal income per metro (county data aggregated to CBSAs) | 2008–2024 |
| [AAA](https://gasprices.aaa.com/state-gas-price-averages/) | State average gas prices | snapshot, Oct 2026 |

## Verification (done 2026-10-04)

- **EPI**: Chicago 1p0c compared against epi.org's own calculator → exact match on all 6 categories (±$4 monthly-rounding).
- **OEWS**: Denver Accountants (13-2011) compared against the BLS public API → exact (22,720 jobs; $100,020 median).
- **ACS**: NYC metro rents/population compared against Census Reporter → consistent (theirs is the 5-yr release; ours the newer 1-yr).
- **Per-capita income**: Denver & Atlanta compared against BEA's published MSA series (via FRED) → within 0.3%.
- **Internal**: budget components sum to totals; occupation and field files re-aggregate exactly to city totals; all derived columns recompute; percentile ordering holds everywhere; zero missing values in `cities.csv`.

## `cities.csv` columns

**ID / map**: `city`, `state`, `region`, `cbsa_code`, `lat`, `lon`

**Cost of living (EPI, single adult; monthly $)**
- `epi_monthly_housing` (HUD Fair Market Rent for a **studio**), `_food`, `_transportation`, `_healthcare`, `_other_necessities`, `_taxes`, `_total`; `epi_annual_total`
- `epi_monthly_expenses_excl_taxes`; `epi_effective_tax_rate` (federal + state + payroll ÷ budget income)

**Cost-of-living index (BEA RPP, 2024; US = 100)**
- `rpp_all_items`, `rpp_goods`, `rpp_housing`, `rpp_utilities`, `rpp_other_services`

**Jobs & salary (BLS)**
- `total_jobs`, `median_salary_all_workers`, `unemployment_rate` (2025 avg, %)
- `entry_level_jobs`, `entry_jobs_per_1000`, `num_occupations`
- `entry_salary_p10/p25/median`: employment-weighted percentile wages across the 132 grad-entry occupations

**People, education & commute (ACS 2024)**
- `population`, `pop_age_20_29`, `share_age_20_29`, `pct_bachelors_plus` (age 25+), `median_household_income`
- `mean_commute_min`, `pct_commute_transit/walk/drive_alone`, `pct_work_from_home`
- `median_gross_rent_all`, `rent_studio/1br/2br/3br`, `rent_per_person_2br/3br_shared`

**Other**: `gas_regular` (state avg $/gal)

**Derived (ours, at `entry_salary_p25`)**
- `est_monthly_take_home`, `est_monthly_savings`, `rent_share_of_take_home`, `months_to_save_10k`, `can_afford_studio_alone`
- `salary_col_adjusted` = `entry_salary_p25` ÷ (`rpp_all_items`/100) → Q5's "where does salary go furthest"

## `city_trends.csv` columns (per city × year, 2008–2024)

- `rpp_all_items`, `rpp_housing`: relative price level vs US=100 that year
- `price_deflator`: metro's own price level over time (2017=100) — inflation within the city
- `per_capita_income`: BEA, nominal $
- `median_household_income`, `median_gross_rent`, `rent_share_of_income`: ACS, 2021–2024 only
- Affordability over time (Q14): e.g., plot `rent_share_of_income`, or `per_capita_income / price_deflator` (real income), or `rpp_housing` trend

## Caveats for the process book

1. **"Entry-level salary" is an estimate.** OEWS covers all workers in an occupation, not just new hires; we use the 25th percentile of bachelor's-entry occupations (≈ NACE's ~$68.7k class-of-2025 average). Use `entry_salary_p10` as a conservative bound.
2. **Tax rate is approximate** — EPI's effective rate at budget income applied to our salary; slightly understates taxes at high salaries and misses some city income taxes (NYC, Philadelphia).
3. **EPI budget is "modest but adequate,"** assumes car ownership everywhere (even NYC) and full health-insurance costs; car-free grads in transit cities spend less.
4. **Two rent concepts on purpose**: `epi_monthly_housing`/`rpp_housing` ≈ what a new mover pays; ACS `rent_*`/`median_gross_rent` = what all current renters pay (lower in rent-regulated/long-tenure markets like NYC).
5. **Metro areas, not city limits.** Each row is the whole CBSA (EPI uses the closely-matching HUD FMR area).
6. **Mixed vintages**: EPI 2026 edition (2025 $), OEWS May 2025, ACS 2024, RPP 2024, unemployment 2025, gas Oct 2026 snapshot. Fine for cross-city comparison; flag when mixing in one chart.
7. **Gas prices are state-level** (AAA doesn't publish metro averages on that page) and a single-day snapshot.
8. **ACS trend columns only start in 2021** (table-based files begin there; 2020 1-yr ACS was not released). BEA series cover 2008–2024.
9. **Not included (candidates if needed)**: walkability scores (Walk Score isn't freely downloadable; commute-mode shares are the proxy), weather/climate, metro-level gas, actual graduate outcomes by school (Census PSEO).
