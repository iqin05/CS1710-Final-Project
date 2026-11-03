"""Generate site/data.js from cities.csv and city_by_field.csv. Run: python3 site/build_data.py"""
import csv, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def num(v, nd=0):
    f = float(v); return round(f, nd) if nd else int(round(f))
cities = []
with open(os.path.join(ROOT, "cities.csv"), newline="") as fh:
    for r in csv.DictReader(fh):
        cities.append({
            "city": r["city"], "state": r["state"], "region": r["region"], "lat": float(r["lat"]), "lon": float(r["lon"]),
            "salary": num(r["entry_salary_p25"]), "salaryMed": num(r["entry_salary_median"]), "take": num(r["est_monthly_take_home"]),
            "savings": num(r["est_monthly_savings"]), "expenses": num(r["epi_monthly_expenses_excl_taxes"]),
            "housing": num(r["epi_monthly_housing"]), "food": num(r["epi_monthly_food"]), "transport": num(r["epi_monthly_transportation"]),
            "health": num(r["epi_monthly_healthcare"]), "other": num(r["epi_monthly_other_necessities"]), "tax": num(r["epi_effective_tax_rate"], 4),
            "rentShare": num(r["rent_share_of_take_home"], 3), "jobs": num(r["entry_level_jobs"]), "jobsPer1000": num(r["entry_jobs_per_1000"], 1),
            "totalJobs": num(r["total_jobs"]), "unemp": num(r["unemployment_rate"], 1), "young": num(r["share_age_20_29"], 3),
            "rent1br": num(r["rent_1br"]), "colAdj": num(r["salary_col_adjusted"]), "rpp": num(r["rpp_all_items"], 1),
            "commute": num(r["mean_commute_min"], 1), "transit": num(r["pct_commute_transit"], 3),
        })
by, fields = {}, set()
with open(os.path.join(ROOT, "city_by_field.csv"), newline="") as fh:
    for r in csv.DictReader(fh):
        fields.add(r["field"])
        by.setdefault(r["city"], {})[r["field"]] = {"salary": num(r["entry_salary_p25"]), "take": num(r["est_monthly_take_home"]),
                                                   "savings": num(r["est_monthly_savings"]), "jobs": num(r["entry_level_jobs"])}
fields = sorted(fields); fields.remove("Other"); fields.append("Other")
out = "window.DATA = " + json.dumps({"cities": cities, "byField": by, "fields": fields}, separators=(",", ":")) + ";\n"
open(os.path.join(ROOT, "site", "data.js"), "w").write(out)
print("wrote site/data.js", len(cities), "cities")
