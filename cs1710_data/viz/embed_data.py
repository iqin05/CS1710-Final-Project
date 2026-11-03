"""Refresh the data embedded in savings_goal_timeline.html from cities.csv and city_by_field.csv.

Run from the repo root after `python3 build.py`:
    python3 viz/embed_data.py
"""
import csv, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "viz", "savings_goal_timeline.html")

def num(v, nd=0):
    f = float(v)
    return round(f, nd) if nd else int(round(f))

cities = []
with open(os.path.join(ROOT, "cities.csv"), newline="") as fh:
    for r in csv.DictReader(fh):
        cities.append({
            "city": r["city"], "state": r["state"], "region": r["region"],
            "salary": num(r["entry_salary_p25"]), "take": num(r["est_monthly_take_home"]),
            "savings": num(r["est_monthly_savings"]), "expenses": num(r["epi_monthly_expenses_excl_taxes"]),
            "housing": num(r["epi_monthly_housing"]), "food": num(r["epi_monthly_food"]),
            "transport": num(r["epi_monthly_transportation"]), "health": num(r["epi_monthly_healthcare"]),
            "other": num(r["epi_monthly_other_necessities"]), "tax": num(r["epi_effective_tax_rate"], 4),
            "rentShare": num(r["rent_share_of_take_home"], 3), "jobs": num(r["entry_level_jobs"]),
            "unemp": num(r["unemployment_rate"], 1), "young": num(r["share_age_20_29"], 3),
        })

by_field, fields = {}, set()
with open(os.path.join(ROOT, "city_by_field.csv"), newline="") as fh:
    for r in csv.DictReader(fh):
        fields.add(r["field"])
        by_field.setdefault(r["city"], {})[r["field"]] = {
            "salary": num(r["entry_salary_p25"]), "take": num(r["est_monthly_take_home"]),
            "savings": num(r["est_monthly_savings"]), "jobs": num(r["entry_level_jobs"]),
        }
fields = sorted(fields)
if "Other" in fields:  # keep the catch-all at the end of the dropdown
    fields.remove("Other"); fields.append("Other")

blob = json.dumps({"cities": cities, "byField": by_field, "fields": fields}, separators=(",", ":"))
html = open(HTML).read()
new_html, n = re.subn(r"<script>const DATA = .*?;</script>", lambda m: "<script>const DATA = " + blob + ";</script>", html, count=1, flags=re.S)
assert n == 1, "DATA script tag not found"
open(HTML, "w").write(new_html)
print(f"embedded {len(cities)} cities, {sum(len(v) for v in by_field.values())} city-field rows, {len(fields)} fields")
