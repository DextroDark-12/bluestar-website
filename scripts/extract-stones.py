#!/usr/bin/env python3
"""
PDF catalogue → /assets + /data JSON pipeline (PyMuPDF + Pillow).
Uncertain → review-required.json; duplicates & edge cases still exported.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

import fitz  # PyMuPDF
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "E-catalogue.pdf"
ASSETS = ROOT / "assets"
DATA = ROOT / "data"

SECTION_RULES: list[tuple[str, str, str, str]] = [
    ("INDIAN GRANITES", "Granite", "Indian", "granites/indian"),
    ("IMPORTED GRANITES", "Granite", "Imported", "granites/imported"),
    ("INDIAN MARBLE", "Marble", "Indian", "marbles/indian"),
    ("IMPORTED MARBLE", "Marble", "Imported", "marbles/imported"),
    ("FINISHES", "Finish", "N/A", "finishes"),
    ("MONUMENTS", "Monument", "N/A", "monuments"),
    ("INFRASTRUCTURE", "Infrastructure", "N/A", "infrastructure"),
]

FEATURED_NAMES = {
    "absolute black", "black galaxy", "blue pearl", "carrara", "cosmic black",
    "river white", "tan brown", "statuario", "emerald pearl", "volga blue",
}

FINISH_KEYWORDS = [
    "polished", "honed", "leather", "flamed", "brushed",
    "sandblasted", "caress",
]

PAD = (240, 232, 220)


def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unnamed"


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def mean_luminance(rgb: "Image.Image") -> float:
    g = rgb.convert("L")
    h = g.histogram()
    total = sum(i * h[i] for i in range(256))
    n = sum(h) or 1
    return (total / n) / 255.0


def asset_dir(folder: str) -> Path:
    """folder like 'granites/indian' -> ROOT/assets/granites/indian"""
    return ASSETS.joinpath(*folder.split("/"))


def render_variants(pil_img: Image.Image, out_dir: Path) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    sizes = {"thumbnail": 400, "card": 800, "detail": 1600}
    rel_base = "/" + out_dir.relative_to(ROOT).as_posix()

    def fit_square(img: Image.Image, side: int) -> Image.Image:
        img = img.convert("RGB")
        return ImageOps.pad(img, (side, side), color=PAD, method=Image.Resampling.LANCZOS)

    out: dict[str, Any] = {}
    for key, side in sizes.items():
        sq = fit_square(pil_img, side)
        webp = out_dir / f"{key}.webp"
        jpg = out_dir / f"{key}.jpg"
        sq.save(webp, "WEBP", quality=88, method=6)
        sq.save(jpg, "JPEG", quality=90, optimize=True)
        out[key] = f"{rel_base}/{key}.webp"
        out[f"{key}_jpeg"] = f"{rel_base}/{key}.jpg"
    return out


def detect_section(page_upper: str) -> Optional[tuple[str, str, str]]:
    """Use the *last* section heading on the page (bottom of page wins on split pages)."""
    best = None
    best_pos = -1
    for kw, cat, origin, folder in SECTION_RULES:
        pos = page_upper.rfind(kw)
        if pos >= 0 and pos >= best_pos:
            best = (cat, origin, folder)
            best_pos = pos
    return best


def split_column_category(
    page_upper: str, img_rect: fitz.Rect, page_rect: fitz.Rect
) -> Optional[tuple[str, str, str]]:
    """
    Two-column catalogue spreads: choose category from horizontal band
    when multiple section titles appear on the same page.
    """
    w = page_rect.width
    h = page_rect.height
    cx = (img_rect.x0 + img_rect.x1) / 2
    cy = (img_rect.y0 + img_rect.y1) / 2
    mid_x = w * 0.48

    if "INDIAN MARBLE" in page_upper and "IMPORTED GRANITES" in page_upper:
        if cx < mid_x:
            return "Marble", "Indian", "marbles/indian"
        return "Granite", "Imported", "granites/imported"

    if "IMPORTED GRANITES" in page_upper and "IMPORTED MARBLE" in page_upper:
        if cx < mid_x:
            return "Granite", "Imported", "granites/imported"
        return "Marble", "Imported", "marbles/imported"

    if "IMPORTED MARBLE" in page_upper and "FINISHES" in page_upper:
        if cy < h * 0.5:
            return "Marble", "Imported", "marbles/imported"
        return "Finish", "N/A", "finishes"

    return None


def parse_finish_label(text: str) -> Optional[tuple[str, str]]:
    t = re.sub(r"\s+", " ", text.strip())
    low = t.lower()
    for fkw in FINISH_KEYWORDS:
        if fkw in low:
            stone_part = t
            for sep in [" - ", " – ", " — ", "-", "—"]:
                if sep in stone_part:
                    stone_part = stone_part.split(sep)[0].strip()
                    break
            stone_part = re.sub(r"[\s\-]+$", "", stone_part)
            return slugify(stone_part), fkw.replace(" ", "-")
    return None


def collect_text_spans(page) -> list[dict[str, Any]]:
    spans_out: list[dict[str, Any]] = []
    d = page.get_text("dict")
    for block in d.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                txt = (span.get("text") or "").strip()
                if not txt or len(txt) > 80:
                    continue
                bbox = span.get("bbox")
                if not bbox:
                    continue
                spans_out.append({
                    "text": txt,
                    "bbox": fitz.Rect(bbox),
                    "size": float(span.get("size") or 0),
                })
    return spans_out


def nearest_label(img_rect: fitz.Rect, spans: list[dict[str, Any]]) -> tuple[str, float]:
    best, best_score = "", 0.0
    icx = (img_rect.x0 + img_rect.x1) / 2

    for sp in spans:
        r: fitz.Rect = sp["bbox"]
        tcx = (r.x0 + r.x1) / 2
        tcy = (r.y0 + r.y1) / 2
        dy = tcy - img_rect.y1
        dx = abs(tcx - icx)
        if dy < -8:
            vert_penalty = 40 + abs(dy) * 0.05
        else:
            vert_penalty = max(0, abs(dy) * 0.6)
        dist = dx * 0.45 + vert_penalty
        if dist > 240:
            continue
        txt = sp["text"]
        if re.fullmatch(r"[\d\s–\-.]+", txt):
            continue
        up = txt.upper().strip()
        if up in {
            "INDIAN GRANITES", "IMPORTED GRANITES", "INDIAN MARBLE", "IMPORTED MARBLE",
            "FINISHES", "MONUMENTS", "INFRASTRUCTURE",
        }:
            continue
        score = 1.0 / (1.0 + dist / 85.0)
        if len(txt) < 2:
            continue
        if score > best_score:
            best_score = score
            best = txt
    conf = min(0.99, max(0.12, best_score))
    return best, conf


def main() -> int:
    if not PDF_PATH.is_file():
        print(f"Missing PDF: {PDF_PATH}", file=sys.stderr)
        return 1

    for sub in [
        "granites/indian", "granites/imported", "marbles/indian", "marbles/imported",
        "finishes", "infrastructure", "monuments", "branding", "uncategorized",
    ]:
        asset_dir(sub).mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(PDF_PATH)
    report: dict[str, Any] = {
        "pdf": PDF_PATH.name,
        "pages": doc.page_count,
        "total_placements": 0,
        "total_saved": 0,
        "by_folder": defaultdict(int),
        "errors": [],
    }
    review: list[dict[str, Any]] = []
    stones_map: dict[str, dict[str, Any]] = {}
    finishes_by_id: dict[str, dict[str, Any]] = {}

    seen_hash_paths: dict[str, str] = {}

    carried_folder = "branding"
    carried_cat, carried_origin = "Branding", "N/A"
    extraction_counter = 0

    for pno in range(doc.page_count):
        page = doc[pno]
        page_text = page.get_text() or ""
        page_upper = page_text.upper()

        sec = detect_section(page_upper)
        if sec:
            carried_cat, carried_origin, carried_folder = sec

        if pno < 4 and not sec:
            carried_folder = "branding"
            carried_cat, carried_origin = "Branding", "N/A"

        if "MONUMENTS" in page_upper:
            carried_folder = "monuments"
            carried_cat, carried_origin = "Monument", "N/A"

        spans = collect_text_spans(page)

        for img in page.get_images(full=True):
            xref = int(img[0])
            rects = []
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                rects = []
            if not rects:
                review.append({
                    "reason": "no_image_rects_for_xref",
                    "page": pno + 1,
                    "xref": xref,
                })
                continue

            # Same xref on a page = same bitmap; decode once. Pick best label among placements.
            best_rect = rects[0]
            best_label, best_conf = "", 0.0
            for r in rects:
                lab, cf = nearest_label(r, spans)
                if cf > best_conf or (cf == best_conf and len(lab) > len(best_label)):
                    best_conf = cf
                    best_label = lab
                    best_rect = r

            if len(rects) > 1:
                review.append({
                    "reason": "collapsed_multiple_placements_same_xref",
                    "page": pno + 1,
                    "xref": xref,
                    "placement_count": len(rects),
                    "chosen_bbox": [best_rect.x0, best_rect.y0, best_rect.x1, best_rect.y1],
                })

            extraction_counter += 1
            eid = f"p{pno+1:02d}-x{xref}-{extraction_counter:04d}"
            report["total_placements"] += len(rects)

            try:
                pix = fitz.Pixmap(doc, xref)
            except Exception as e:
                report["errors"].append({"eid": eid, "error": str(e)})
                review.append({"reason": "xref_extract_fail", "eid": eid, "page": pno + 1, "xref": xref})
                continue

            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)

            mode = "RGBA" if pix.alpha else "RGB"
            pil = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
            if mode == "RGBA":
                bg = Image.new("RGB", pil.size, PAD)
                bg.paste(pil, mask=pil.split()[-1])
                pil = bg

            mw = max(pil.size)
            if mw > 2200:
                s = 2200 / mw
                pil = pil.resize(
                    (max(1, int(pil.width * s)), max(1, int(pil.height * s))),
                    Image.Resampling.LANCZOS,
                )

            raw = pil.convert("RGB").tobytes()
            h = sha256_bytes(raw)

            tiny = pil.width < 36 or pil.height < 36
            notes: list[str] = []

            split = split_column_category(page_upper, best_rect, page.rect)
            if split:
                cat, origin, folder = split
                notes.append("split_column_heading_resolution")
            else:
                folder = carried_folder
                cat, origin = carried_cat, carried_origin

            if tiny:
                folder = "branding"
                cat, origin = "Branding", "N/A"
                notes.append("tiny_raster_branding_bucket")

            label, conf = best_label or "", best_conf
            img_rect = best_rect
            name_guess = label or f"page-{pno + 1}-image"
            slug_base = slugify(name_guess)

            if folder == "finishes" or parse_finish_label(label):
                fin = parse_finish_label(label)
                if fin:
                    stone_hint, finish_slug = fin
                    slug_base = f"{stone_hint}-{finish_slug}"
                    folder = "finishes"
                    cat, origin = "Finish", "N/A"
                elif folder == "finishes":
                    slug_base = f"{slug_base}-finish-sample"
                    folder = "finishes"
                    cat, origin = "Finish", "N/A"
                    notes.append("finish_parse_fallback")

            if conf < 0.42:
                notes.append("low_label_confidence")
                review.append({
                    "reason": "low_confidence_label",
                    "eid": eid,
                    "page": pno + 1,
                    "guess": name_guess,
                    "confidence": round(conf, 3),
                })

            dup_of = seen_hash_paths.get(h)
            if dup_of:
                notes.append("duplicate_bytes_reexported")
                slug_use = f"dup-{h[:10]}-{slug_base}"[:80]
                folder = "uncategorized"
                cat, origin = "Uncategorized", "N/A"
                review.append({
                    "reason": "duplicate_image_bytes",
                    "eid": eid,
                    "first_path": dup_of,
                    "sha256": h[:20],
                })
            else:
                slug_use = slug_base

            parent = asset_dir(folder)
            slug = slug_use
            n = 1
            while (parent / slug).exists():
                slug = f"{slug_use}-{n}"
                n += 1

            out_dir = parent / slug
            try:
                rel_paths = render_variants(pil, out_dir)
            except Exception as e:
                report["errors"].append({"eid": eid, "error": str(e)})
                review.append({"reason": "variant_render_fail", "eid": eid, "error": str(e)})
                continue

            rel_key = str(out_dir.relative_to(ROOT)).replace("\\", "/")
            if not dup_of:
                seen_hash_paths[h] = rel_key

            report["total_saved"] += 1
            report["by_folder"][folder] += 1

            lum = mean_luminance(pil)
            featured = (
                name_guess.strip().lower() in FEATURED_NAMES
                or (lum < 0.34 and cat == "Granite")
            )

            tags = list(dict.fromkeys([
                re.sub(r"-+", " ", slug),
                f"{origin.lower()} {cat.lower()}".strip(),
                f"{cat.lower()} slab",
                "natural stone",
            ]))

            entry = {
                "id": slug,
                "name": name_guess,
                "category": cat,
                "origin": origin,
                "image": {
                    "thumbnail": rel_paths["thumbnail"],
                    "card": rel_paths["card"],
                    "detail": rel_paths["detail"],
                    "thumbnail_jpeg": rel_paths["thumbnail_jpeg"],
                    "card_jpeg": rel_paths["card_jpeg"],
                    "detail_jpeg": rel_paths["detail_jpeg"],
                },
                "tags": tags,
                "featured": featured,
                "ocr_confidence": round(conf, 3),
                "source": {"pdf_page": pno + 1, "xref": xref, "extraction_id": eid},
            }
            if notes:
                entry["notes"] = notes

            if folder == "finishes" or cat == "Finish":
                finishes_by_id[slug] = {
                    "id": slug,
                    "name": name_guess,
                    "image": rel_paths["card"],
                    "thumbnail": rel_paths["thumbnail"],
                    "detail": rel_paths["detail"],
                    "confidence": round(conf, 3),
                }
                stones_map[slug] = entry
            else:
                stones_map[slug] = entry

    doc.close()

    stones_list = sorted(stones_map.values(), key=lambda x: (x["category"], x["origin"], x["name"]))

    (DATA / "stones.json").write_text(
        json.dumps(stones_list, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (DATA / "finishes.json").write_text(
        json.dumps(
            sorted(finishes_by_id.values(), key=lambda x: x["name"]),
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    (DATA / "review-required.json").write_text(
        json.dumps(review, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    report["by_folder"] = dict(report["by_folder"])
    report["stones_json_count"] = len(stones_list)
    report["finishes_json_count"] = len(finishes_by_id)
    report["review_items"] = len(review)
    (DATA / "extraction-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
