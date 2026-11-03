"""Build the cleaned CS 1710 city dataset from EPI FBC 2026, BLS OEWS May 2025, BLS EP Table 5.4, ACS 2024 1-yr."""
import pandas as pd, numpy as np, os, sys

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# city, state, region, cbsa (OEWS/ACS), EPI Areaname (single-adult row), lat, lon
CITIES = [
    ("New York", "NY", "Northeast", 35620, "New York, NY HUD Metro FMR Area", 40.7128, -74.0060),
    ("Boston", "MA", "Northeast", 14460, "Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area", 42.3601, -71.0589),
    ("Philadelphia", "PA", "Northeast", 37980, "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD MSA", 39.9526, -75.1652),
    ("Pittsburgh", "PA", "Northeast", 38300, "Pittsburgh, PA HUD Metro FMR Area", 40.4406, -79.9959),
    ("Washington", "DC", "South", 47900, "Washington-Arlington-Alexandria, DC-VA-MD HUD Metro FMR Area", 38.9072, -77.0369),
    ("Baltimore", "MD", "South", 12580, "Baltimore-Columbia-Towson, MD MSA", 39.2904, -76.6122),
    ("Richmond", "VA", "South", 40060, "Richmond, VA MSA", 37.5407, -77.4360),
    ("Raleigh", "NC", "South", 39580, "Raleigh, NC MSA", 35.7796, -78.6382),
    ("Charlotte", "NC", "South", 16740, "Charlotte-Concord-Gastonia, NC-SC HUD Metro FMR Area", 35.2271, -80.8431),
    ("Atlanta", "GA", "South", 12060, "Atlanta-Sandy Springs-Roswell, GA HUD Metro FMR Area", 33.7490, -84.3880),
    ("Nashville", "TN", "South", 34980, "Nashville-Davidson--Murfreesboro--Franklin, TN HUD Metro FMR Area", 36.1627, -86.7816),
    ("Miami", "FL", "South", 33100, "Miami-Miami Beach-Kendall, FL HUD Metro FMR Area", 25.7617, -80.1918),
    ("Tampa", "FL", "South", 45300, "Tampa-St. Petersburg-Clearwater, FL MSA", 27.9506, -82.4572),
    ("Orlando", "FL", "South", 36740, "Orlando-Kissimmee-Sanford, FL MSA", 28.5384, -81.3789),
    ("New Orleans", "LA", "South", 35380, "New Orleans-Metairie, LA HUD Metro FMR Area", 29.9511, -90.0715),
    ("Dallas", "TX", "South", 19100, "Dallas, TX HUD Metro FMR Area", 32.7767, -96.7970),
    ("Houston", "TX", "South", 26420, "Houston-The Woodlands-Sugar Land, TX HUD Metro FMR Area", 29.7604, -95.3698),
    ("Austin", "TX", "South", 12420, "Austin-Round Rock, TX MSA", 30.2672, -97.7431),
    ("San Antonio", "TX", "South", 41700, "San Antonio-New Braunfels, TX HUD Metro FMR Area", 29.4241, -98.4936),
    ("Chicago", "IL", "Midwest", 16980, "Chicago-Joliet-Naperville, IL HUD Metro FMR Area", 41.8781, -87.6298),
    ("Minneapolis", "MN", "Midwest", 33460, "Minneapolis-St. Paul-Bloomington, MN-WI HUD Metro FMR Area", 44.9778, -93.2650),
    ("Detroit", "MI", "Midwest", 19820, "Detroit-Warren-Livonia, MI HUD Metro FMR Area", 42.3314, -83.0458),
    ("Columbus", "OH", "Midwest", 18140, "Columbus, OH HUD Metro FMR Area", 39.9612, -82.9988),
    ("Cleveland", "OH", "Midwest", 17410, "Cleveland-Elyria, OH MSA", 41.4993, -81.6944),
    ("Cincinnati", "OH", "Midwest", 17140, "Cincinnati, OH-KY-IN  HUD Metro FMR Area", 39.1031, -84.5120),
    ("Indianapolis", "IN", "Midwest", 26900, "Indianapolis-Carmel, IN HUD Metro FMR Area", 39.7684, -86.1581),
    ("Milwaukee", "WI", "Midwest", 33340, "Milwaukee-Waukesha-West Allis, WI MSA", 43.0389, -87.9065),
    ("St. Louis", "MO", "Midwest", 41180, "St. Louis, MO-IL HUD Metro FMR Area", 38.6270, -90.1994),
    ("Kansas City", "MO", "Midwest", 28140, "Kansas City, MO-KS HUD Metro FMR Area", 39.0997, -94.5786),
    ("Denver", "CO", "West", 19740, "Denver-Aurora-Lakewood, CO MSA", 39.7392, -104.9903),
    ("Salt Lake City", "UT", "West", 41620, "Salt Lake City, UT HUD Metro FMR Area", 40.7608, -111.8910),
    ("Phoenix", "AZ", "West", 38060, "Phoenix-Mesa-Scottsdale, AZ MSA", 33.4484, -112.0740),
    ("Las Vegas", "NV", "West", 29820, "Las Vegas-Henderson-Paradise, NV MSA", 36.1699, -115.1398),
    ("Los Angeles", "CA", "West", 31080, "Los Angeles-Long Beach-Glendale, CA HUD Metro FMR Area", 34.0522, -118.2437),
    ("San Diego", "CA", "West", 41740, "San Diego-Carlsbad, CA MSA", 32.7157, -117.1611),
    ("San Francisco", "CA", "West", 41860, "San Francisco, CA HUD Metro FMR Area", 37.7749, -122.4194),
    ("San Jose", "CA", "West", 41940, "San Jose-Sunnyvale-Santa Clara, CA HUD Metro FMR Area", 37.3382, -121.8863),
    ("Sacramento", "CA", "West", 40900, "Sacramento--Roseville--Arden-Arcade, CA HUD Metro FMR Area", 38.5816, -121.4944),
    ("Seattle", "WA", "West", 42660, "Seattle-Bellevue, WA HUD Metro FMR Area", 47.6062, -122.3321),
    ("Portland", "OR", "West", 38900, "Portland-Vancouver-Hillsboro, OR-WA MSA", 45.5152, -122.6784),
]
cities = pd.DataFrame(CITIES, columns=["city", "state", "region", "cbsa", "epi_area", "lat", "lon"])

# ---------- EPI Family Budget Calculator (1 adult, 0 children) ----------
epi = pd.read_excel(f"{SRC}/fbc_data_2026.xlsx", sheet_name="Metro", header=1)
epi = epi[epi.Family == "1p0c"]
cats = {"Housing.1": "housing", "Food.1": "food", "Transportation.1": "transportation",
        "Healthcare.1": "healthcare", "Other Necessities .1": "other_necessities", "Taxes.1": "taxes", "Total.1": "total"}
epi = epi[["Areaname", "State abv.", *cats]].rename(columns={"Areaname": "epi_area", "State abv.": "state", **cats})
for c in cats.values():
    epi["epi_monthly_" + c] = (epi[c] / 12).round(0)
epi["epi_annual_total"] = epi["total"]
epi["epi_effective_tax_rate"] = (epi["taxes"] / epi["total"]).round(4)
epi = epi[["epi_area", "state", "epi_annual_total", "epi_effective_tax_rate"] + [f"epi_monthly_{c}" for c in cats.values()]]
epi["epi_monthly_expenses_excl_taxes"] = epi["epi_monthly_total"] - epi["epi_monthly_taxes"]
missing = set(cities.epi_area) - set(epi.epi_area)
assert not missing, f"EPI areas not found: {missing}"
cities = cities.merge(epi, on=["epi_area", "state"], how="left")
assert len(cities) == len(CITIES) and cities.epi_monthly_total.notna().all()

# ---------- BLS EP Table 5.4: bachelor's degree, no work experience ----------
ed = pd.read_excel(f"{SRC}/ep_education.xlsx", sheet_name="Table 5.4", header=1, keep_default_na=False)
ed.columns = ["title", "occ_code", "education", "experience", "training", "ooh"]
entry_occs = set(ed[(ed.education == "Bachelor's degree") & (ed.experience == "None")].occ_code)

FIELDS = {"11": "Management", "13": "Business & Finance", "15": "Computer & Math", "17": "Engineering & Architecture",
          "19": "Science", "21": "Community & Social Service", "23": "Legal", "25": "Education",
          "27": "Arts, Design & Media", "29": "Healthcare", "41": "Sales", "43": "Office & Admin"}

# ---------- BLS OEWS May 2025 ----------
o = pd.read_excel(f"{SRC}/oews/oesm25ma/MSA_M2025_dl.xlsx",
                  usecols=["AREA", "OCC_CODE", "OCC_TITLE", "O_GROUP", "TOT_EMP", "A_PCT10", "A_PCT25", "A_MEDIAN"])
o = o[o.AREA.isin(cities.cbsa)]
allocc = o[o.OCC_CODE == "00-0000"][["AREA", "TOT_EMP", "A_MEDIAN"]].rename(
    columns={"AREA": "cbsa", "TOT_EMP": "total_jobs", "A_MEDIAN": "median_salary_all_workers"})
d = o[(o.O_GROUP == "detailed") & o.OCC_CODE.isin(entry_occs)].copy()
for c in ["TOT_EMP", "A_PCT10", "A_PCT25", "A_MEDIAN"]:
    # '#' = wage above BLS top-code ($239,200); '*'/'**' = suppressed
    d[c] = pd.to_numeric(d[c].replace("#", 239200), errors="coerce")
d = d.dropna(subset=["TOT_EMP"])
d["field"] = d.OCC_CODE.str[:2].map(FIELDS).fillna("Other")


def agg(g):
    w = g.dropna(subset=["A_PCT25"])
    wm = g.dropna(subset=["A_MEDIAN"])
    w10 = g.dropna(subset=["A_PCT10"])
    return pd.Series({
        "entry_level_jobs": g.TOT_EMP.sum(),
        "entry_salary_p10": round(np.average(w10.A_PCT10, weights=w10.TOT_EMP)) if len(w10) else np.nan,
        "entry_salary_p25": round(np.average(w.A_PCT25, weights=w.TOT_EMP)) if len(w) else np.nan,
        "entry_salary_median": round(np.average(wm.A_MEDIAN, weights=wm.TOT_EMP)) if len(wm) else np.nan,
        "num_occupations": len(g),
    })


city_jobs = d.groupby("AREA").apply(agg, include_groups=False).reset_index().rename(columns={"AREA": "cbsa"})
for c in ["total_jobs", "median_salary_all_workers"]:
    allocc[c] = pd.to_numeric(allocc[c], errors="coerce")
cities = cities.merge(allocc, on="cbsa", how="left").merge(city_jobs, on="cbsa", how="left")
cities["entry_jobs_per_1000"] = (cities.entry_level_jobs / cities.total_jobs * 1000).round(1)

# ---------- ACS 2024 1-year ----------
def acs(table):
    t = pd.read_csv(f"{SRC}/acs/{table}.dat", sep="|", dtype={"GEO_ID": str})
    t = t[t.GEO_ID.str.startswith("310M")].copy()
    t["cbsa"] = t.GEO_ID.str[-5:].astype(int)
    return t.set_index("cbsa")

b01001, b01003, b08013, b08301, b25031 = (acs(t) for t in ["b01001", "b01003", "b08013", "b08301", "b25031"])
a = pd.DataFrame(index=cities.cbsa)
a["population"] = b01003["B01003_E001"]
a["pop_age_20_29"] = b01001[[f"B01001_E{n:03d}" for n in (8, 9, 10, 11, 32, 33, 34, 35)]].sum(axis=1)
a["share_age_20_29"] = (a.pop_age_20_29 / a.population).round(4)
commuters = b08301["B08301_E001"] - b08301["B08301_E021"]
a["mean_commute_min"] = (b08013["B08013_E001"] / commuters).round(1)
a["pct_commute_transit"] = (b08301["B08301_E010"] / b08301["B08301_E001"]).round(4)
a["pct_commute_walk"] = (b08301["B08301_E019"] / b08301["B08301_E001"]).round(4)
a["pct_work_from_home"] = (b08301["B08301_E021"] / b08301["B08301_E001"]).round(4)
a["pct_commute_drive_alone"] = (b08301["B08301_E003"] / b08301["B08301_E001"]).round(4)
a["rent_studio"] = b25031["B25031_E002"]
a["rent_1br"] = b25031["B25031_E003"]
a["rent_2br"] = b25031["B25031_E004"]
a["rent_3br"] = b25031["B25031_E005"]
a = a.reset_index()
cities = cities.merge(a, on="cbsa", how="left")
cities["rent_per_person_2br_shared"] = (cities.rent_2br / 2).round(0)
cities["rent_per_person_3br_shared"] = (cities.rent_3br / 3).round(0)

# ---------- BEA Regional Price Parities (cost-of-living index, 2024) ----------
def read_bea(path):
    b = pd.read_csv(path, skipfooter=4, engine="python", na_values=["(NA)"])
    b.columns = [c.strip() for c in b.columns]
    b["cbsa"] = b.GeoFIPS.str.strip().str.strip('"').astype(int)
    b["Description"] = b.Description.str.strip()
    return b

rpp = read_bea(f"{SRC}/bea/MARPP_MSA_2008_2024.csv")
RPP_COLS = {"RPPs: All items": "rpp_all_items", "RPPs: Goods": "rpp_goods",
            "RPPs: Services: Housing": "rpp_housing", "RPPs: Services: Utilities": "rpp_utilities",
            "RPPs: Services: Other": "rpp_other_services"}
rpp24 = (rpp[rpp.Description.isin(RPP_COLS)].pivot(index="cbsa", columns="Description", values="2024")
         .rename(columns=RPP_COLS).reset_index())
cities = cities.merge(rpp24, on="cbsa", how="left")

# ---------- BLS LAUS unemployment (2025 annual average) ----------
laus = pd.read_csv(f"{SRC}/laus_unemployment.csv")[["city", "unemployment_rate"]]
cities = cities.merge(laus, on="city", how="left")

# ---------- ACS extras: education, income, rent (2024) ----------
b15003, b19013, b25064 = (acs(t) for t in ["b15003", "b19013", "b25064"])
x = pd.DataFrame(index=cities.cbsa)
x["pct_bachelors_plus"] = (b15003[[f"B15003_E{n:03d}" for n in (22, 23, 24, 25)]].sum(axis=1)
                           / b15003["B15003_E001"]).round(4)
x["median_household_income"] = b19013["B19013_E001"]
x["median_gross_rent_all"] = b25064["B25064_E001"]
cities = cities.merge(x.reset_index(), on="cbsa", how="left")

# ---------- AAA state gas prices (snapshot, Oct 2026) ----------
STATE_NAMES = {"NY": "New York", "MA": "Massachusetts", "PA": "Pennsylvania", "DC": "District of Columbia",
               "MD": "Maryland", "VA": "Virginia", "NC": "North Carolina", "GA": "Georgia", "TN": "Tennessee",
               "FL": "Florida", "LA": "Louisiana", "TX": "Texas", "IL": "Illinois", "MN": "Minnesota",
               "MI": "Michigan", "OH": "Ohio", "IN": "Indiana", "WI": "Wisconsin", "MO": "Missouri",
               "CO": "Colorado", "UT": "Utah", "AZ": "Arizona", "NV": "Nevada", "CA": "California",
               "WA": "Washington", "OR": "Oregon"}
gas = pd.read_csv(f"{SRC}/aaa_gas.csv")
cities["state_name"] = cities.state.map(STATE_NAMES)
cities = cities.merge(gas[["state_name", "gas_regular"]], on="state_name", how="left").drop(columns=["state_name"])

# ---------- Derived budget metrics (at entry_salary_p25) ----------
def budget(df, salary_col):
    take_home = df[salary_col] * (1 - df.epi_effective_tax_rate) / 12
    savings = take_home - df.epi_monthly_expenses_excl_taxes
    return take_home.round(0), savings.round(0)

cities["est_monthly_take_home"], cities["est_monthly_savings"] = budget(cities, "entry_salary_p25")
cities["rent_share_of_take_home"] = (cities.epi_monthly_housing / cities.est_monthly_take_home).round(3)
cities["months_to_save_10k"] = np.where(cities.est_monthly_savings > 0,
                                        (10000 / cities.est_monthly_savings).round(1), np.nan)
cities["can_afford_studio_alone"] = cities.rent_share_of_take_home <= 0.30
cities["salary_col_adjusted"] = (cities.entry_salary_p25 / (cities.rpp_all_items / 100)).round(0)

cities = cities.drop(columns=["epi_area"]).rename(columns={"cbsa": "cbsa_code"})
cities.to_csv(f"{OUT}/cities.csv", index=False)

# ---------- City x field ----------
cf = d.groupby(["AREA", "field"]).apply(agg, include_groups=False).reset_index().rename(columns={"AREA": "cbsa_code"})
cf = cf.merge(cities[["cbsa_code", "city", "state", "epi_effective_tax_rate", "epi_monthly_expenses_excl_taxes",
                      "epi_monthly_housing"]], on="cbsa_code")
cf["est_monthly_take_home"], cf["est_monthly_savings"] = budget(cf, "entry_salary_p25")
cf["months_to_save_10k"] = np.where(cf.est_monthly_savings > 0, (10000 / cf.est_monthly_savings).round(1), np.nan)
cf = cf[["city", "state", "cbsa_code", "field", "entry_level_jobs", "num_occupations", "entry_salary_p10", "entry_salary_p25",
         "entry_salary_median", "est_monthly_take_home", "est_monthly_savings", "months_to_save_10k"]]
cf.sort_values(["city", "entry_level_jobs"], ascending=[True, False]).to_csv(f"{OUT}/city_by_field.csv", index=False)

# ---------- Occupation-level detail (for drill-down) ----------
occ = d.merge(cities[["cbsa_code", "city", "state"]], left_on="AREA", right_on="cbsa_code")
occ = occ[["city", "state", "cbsa_code", "field", "OCC_CODE", "OCC_TITLE", "TOT_EMP", "A_PCT10", "A_PCT25", "A_MEDIAN"]].rename(
    columns={"OCC_CODE": "occ_code", "OCC_TITLE": "occupation", "TOT_EMP": "jobs", "A_PCT10": "salary_p10",
             "A_PCT25": "salary_p25", "A_MEDIAN": "salary_median"})
occ.sort_values(["city", "jobs"], ascending=[True, False]).to_csv(f"{OUT}/city_occupations.csv", index=False)

# ---------- City trends 2008-2024 (Q14: affordability over time) ----------
YEARS = [str(y) for y in range(2008, 2025)]

def bea_long(df, desc, name):
    t = df[df.Description == desc][["cbsa"] + YEARS].melt("cbsa", var_name="year", value_name=name)
    t["year"] = t.year.astype(int)
    return t.set_index(["cbsa", "year"])

deflator = read_bea(f"{SRC}/bea/MAIRPD_MSA_2008_2024.csv")
tr = bea_long(rpp, "RPPs: All items", "rpp_all_items") \
    .join(bea_long(rpp, "RPPs: Services: Housing", "rpp_housing")) \
    .join(bea_long(deflator, "Implicit regional price deflator", "price_deflator"))

# per-capita income: aggregate BEA county personal income + population to CBSAs
xw = pd.read_excel(f"{SRC}/list1_2023.xlsx", header=2, dtype=str).dropna(subset=["CBSA Code"])
xw = xw[xw["CBSA Code"].str.fullmatch(r"\d+")]  # drop footer notes
xw["cbsa"] = xw["CBSA Code"].astype(int)
xw["county_fips"] = xw["FIPS State Code"].str.zfill(2) + xw["FIPS County Code"].str.zfill(3)
xw = xw[xw.cbsa.isin(cities.cbsa_code)][["cbsa", "county_fips"]]
ca = pd.read_csv(f"{SRC}/bea/CAINC1__ALL_AREAS_1969_2024.csv", skipfooter=4, engine="python",
                 na_values=["(NA)"], encoding="latin1", dtype={"GeoFIPS": str})
ca.columns = [c.strip() for c in ca.columns]
ca["county_fips"] = ca.GeoFIPS.str.strip().str.strip('"')
ca = ca[ca.county_fips.isin(xw.county_fips)].merge(xw, on="county_fips")
for y in YEARS:
    ca[y] = pd.to_numeric(ca[y], errors="coerce")
inc = ca[ca.LineCode == 1].groupby("cbsa")[YEARS].sum()   # personal income, $thousands
pop = ca[ca.LineCode == 2].groupby("cbsa")[YEARS].sum()   # population
pci = (inc * 1000 / pop).round(0).reset_index().melt("cbsa", var_name="year", value_name="per_capita_income")
pci["year"] = pci.year.astype(int)
tr = tr.join(pci.set_index(["cbsa", "year"]))

# ACS median household income + median gross rent, 2021-2024
for y in [2021, 2022, 2023, 2024]:
    suf = "" if y == 2024 else f"_{y}"
    for tbl, col, name in [("b19013", "B19013_E001", "median_household_income"),
                           ("b25064", "B25064_E001", "median_gross_rent")]:
        t = pd.read_csv(f"{SRC}/acs/{tbl}{suf}.dat", sep="|", dtype={"GEO_ID": str})
        t = t[t.GEO_ID.str.startswith("310M")].copy()
        t["cbsa"] = t.GEO_ID.str[-5:].astype(int)
        t["year"] = y
        t[col] = pd.to_numeric(t[col], errors="coerce")
        tr = tr.combine_first(t.set_index(["cbsa", "year"])[[col]].rename(columns={col: name})) \
            if name in tr.columns else tr.join(t.set_index(["cbsa", "year"])[[col]].rename(columns={col: name}))

tr = tr.reset_index().merge(cities[["cbsa_code", "city", "state", "region"]],
                            left_on="cbsa", right_on="cbsa_code").drop(columns=["cbsa"])
tr["rent_share_of_income"] = (tr.median_gross_rent * 12 / tr.median_household_income).round(4)
tr = tr[["city", "state", "region", "cbsa_code", "year", "rpp_all_items", "rpp_housing", "price_deflator",
         "per_capita_income", "median_household_income", "median_gross_rent", "rent_share_of_income"]]
tr.sort_values(["city", "year"]).to_csv(f"{OUT}/city_trends.csv", index=False)

print(cities.isna().sum()[cities.isna().sum() > 0])
print(len(cities), len(cf), len(occ), len(entry_occs), len(tr))
