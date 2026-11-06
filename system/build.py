#!/usr/bin/env python3
"""
Builds one HTML page per row of data/fichas.csv (from templates/ficha.html)
and one page per row of data/estaciones.csv (from templates/estacion.html).

Usage:  python build.py
Output: ficha-<slug>.html and estacion-<slug>.html, written next to this
        script (the site root), so the relative paths to css/, js/, images/
        and components/ keep working exactly as in your templates.
"""
import csv
import html
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT                      # change if you want a different output folder
TEMPLATES = ROOT / "templates"
DATA = ROOT / "data"


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def esc(text):
    return html.escape((text or "").strip())


def render(template, values):
    return re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], template)


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def ficha_url(ficha):
    return f"ficha-{ficha['slug']}.html"


def estacion_url(estacion):
    return f"estacion-{estacion['slug']}.html"


def image_block(title, src, credit):
    if not (src or "").strip():
        return ""
    credit_html = f'\n        <p class="credit-text">{esc(credit)}</p>' if (credit or "").strip() else ""
    return (
        '      <div class="petro-card-img">\n'
        f"        <p>{title}</p>\n"
        f'        <img class="petro-img" src="{esc(src)}" alt="{esc(title)}">{credit_html}\n'
        "      </div>"
    )


def specs_block(specs):
    """specs format:  Label: value | Label: value | ...   (split on first ':' only)"""
    items = []
    for part in (specs or "").split("|"):
        if ":" not in part:
            continue
        label, value = part.split(":", 1)
        items.append(
            '      <div class="info-column">\n'
            f"        <span>{esc(label)}</span>\n"
            f"        <span>{esc(value)}</span>\n"
            "      </div>"
        )
    return '\n      <div class="separator"></div>\n'.join(items)


def card_block(ficha):
    thumb = ficha.get("image_insitu", "").strip()
    img = f'<img class="ficha-card-thumbnail" src="{esc(thumb)}" alt="">' if thumb else ""
    return f"""      <li>
        <a class="ficha-card-link" href="{ficha_url(ficha)}">
          <div class="ficha-card">
            <div class="ficha-card-container">
              {img}
              <div class="ficha-card-text">
                <h2>{esc(ficha['name'])}</h2>
                <p>{esc(ficha.get('summary', ''))}</p>
              </div>
            </div>
          </div>
        </a>
      </li>"""


def main():
    ficha_tpl = (TEMPLATES / "ficha.html").read_text(encoding="utf-8")
    estacion_tpl = (TEMPLATES / "estacion.html").read_text(encoding="utf-8")

    estaciones = read_csv(DATA / "estaciones.csv")
    fichas = read_csv(DATA / "fichas.csv")

    for e in estaciones:
        e["slug"] = (e.get("slug") or slugify(e["name"])).strip()
    for f in fichas:
        f["slug"] = (f.get("slug") or slugify(f["name"])).strip()

    # Lookup stations by slug or by name (so the CSV can use either)
    lookup = {}
    for e in estaciones:
        lookup[slugify(e["slug"])] = e
        lookup[slugify(e["name"])] = e

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    by_station = {e["slug"]: [] for e in estaciones}

    for f in fichas:
        station = lookup.get(slugify(f.get("station", "")))
        if station is None:
            print(f"WARNING: ficha '{f['name']}' has unknown station '{f.get('station')}' - skipped.")
            continue
        by_station[station["slug"]].append(f)

        images = "\n\n".join(filter(None, [
            image_block("IMAGEN IN SITU", f.get("image_insitu"), f.get("image_insitu_credit")),
            image_block("DIBUJO EN NEGATIVO", f.get("image_negative"), f.get("image_negative_credit")),
        ]))
        page = render(ficha_tpl, {
            "name": esc(f["name"]),
            "name_upper": esc(f["name"]).upper(),
            "station_name": esc(station["name"]),
            "station_upper": esc(station["name"]).upper(),
            "station_url": estacion_url(station),
            "motive": esc(f.get("motive")),
            "images": images,
            "specs": specs_block(f.get("specs")),
            "extra_html": (f.get("extra_html") or "").strip(),   # raw HTML, not escaped
        })
        (OUTPUT_DIR / ficha_url(f)).write_text(page, encoding="utf-8")
        print("wrote", ficha_url(f))

    for e in estaciones:
        page = render(estacion_tpl, {
            "name": esc(e["name"]),
            "name_upper": esc(e["name"]).upper(),
            "intro_html": (e.get("intro_html") or "").strip(),   # raw HTML
            "cards": "\n".join(card_block(f) for f in by_station[e["slug"]]),
        })
        (OUTPUT_DIR / estacion_url(e)).write_text(page, encoding="utf-8")
        print("wrote", estacion_url(e), f"({len(by_station[e['slug']])} fichas)")


if __name__ == "__main__":
    sys.exit(main())
