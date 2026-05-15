# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Website for Bluestar Granite & Marble (Jalandhar, Punjab) showcasing natural stone products. The site includes a static HTML/CSS/JS frontend and a Python pipeline that extracts stone images and metadata from a PDF e-catalogue.

## How to Run

Open any `.html` file directly in a browser. No build step, server, or npm required.

## Commands

- **Re-extract images from PDF:** `python scripts/extract-stones.py`
  - Requires: `pymupdf>=1.24.0`, `Pillow>=10.0.0`
  - Reads: `E-catalogue.pdf`
  - Outputs: `assets/` (images), `data/stones.json`, `data/finishes.json`, `data/review-required.json`, `data/extraction-report.json`

## Architecture

### Frontend (static HTML/CSS/JS)

**Pages:** `index.html`, `products.html`, `gallery.html`, `about.html`, `contact.html`, `stone-detail.html`

**CSS (loaded in order):**
- `css/style.css` — Variables, reset, typography, grid, utilities
- `css/components.css` — Navbar, footer, cards, buttons, hero, modal, forms
- `css/animations.css` — Scroll-reveal, staggered delays, keyframes

**JavaScript (IIFE-wrapped):**
- `js/main.js` — Navbar scroll, hamburger toggle, IntersectionObserver scroll-reveal, smooth scroll
- `js/products.js` — Category filter, stone detail modal
- `js/gallery.js` — Gallery category filter
- `js/contact.js` — Form validation
- `js/home-catalog.js` — Homepage catalog section
- `js/stone-detail.js` — Individual stone detail view

### Data Pipeline (Python)

`scripts/extract-stones.py` — Extracts images from `E-catalogue.pdf` using PyMuPDF, generates WebP/JPG variants at 3 sizes (thumbnail: 400px, card: 800px, detail: 1600px), detects stone names via OCR, and outputs JSON metadata.

**Asset folder structure** under `assets/`:
- `granites/indian/` — Indian granite slabs
- `granites/imported/` — Imported granite slabs
- `marbles/indian/` — Indian marble slabs
- `marbles/imported/` — Imported marble slabs
- `finishes/` — Surface finish samples
- `infrastructure/` — Infrastructure stone
- `monuments/` — Monument stone
- `branding/` — Brand/logo images from PDF
- `uncategorized/` — Duplicates or unclassified

**Data files:**
- `data/stones.json` — All extracted stones with metadata (category, origin, image paths, tags, confidence)
- `data/finishes.json` — Finish-specific entries
- `data/review-required.json` — Items flagged for manual review (low confidence labels, duplicates, etc.)
- `data/extraction-report.json` — Extraction statistics

### Key Patterns

- JS uses IIFE with `'use strict'`
- CSS uses BEM-like naming (`.navbar__logo`, `.btn-primary`)
- Scroll animations via `.animate-on-scroll` class + IntersectionObserver
- Modal system for product details
- Category filtering via data attributes
- Images stored as WebP + JPEG pairs per size variant
- Python script uses section detection rules to categorize pages (INDIAN GRANITES, IMPORTED MARBLE, etc.)

## Business Info

- Phone: +91 96382 66633
- Email: BlueStar2025@gmail.com
- Address: 6QJ7+M7, Pal, Gujarat 360004
- WhatsApp: https://wa.me/919638266633
- Google Maps: https://share.google/OXVbJ6xLpWCWyVuJx
- Business Hours: Mon – Sat: 9:00 AM – 7:00 PM