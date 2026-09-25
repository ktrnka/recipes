"""Capture review screenshots from the local preview with headless Chrome.

Usage: python3 scripts/screenshots.py <prefix> <path[?query]>...
Example: python3 scripts/screenshots.py after bread/naan "bread/naan?units=weight"
Needs `bundle exec jekyll serve -s recipes --baseurl /recipes --port 4010` running.
"""

import re
import subprocess
import sys
import time
from pathlib import Path

BASE = "http://localhost:4010/recipes/"
OUT = Path(__file__).resolve().parent.parent / "review" / "shots"


def main() -> None:
    prefix, pages = sys.argv[1], sys.argv[2:]
    OUT.mkdir(parents=True, exist_ok=True)
    time.sleep(3)  # let `jekyll serve` finish regenerating after a fresh edit
    for page in pages:
        name = re.sub(r"[^A-Za-z0-9]+", "-", page).strip("-")
        out = OUT / f"{prefix}-{name}.png"
        subprocess.run(
            [
                "google-chrome", "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                "--window-size=390,1200" if prefix.endswith("mobile") else "--window-size=900,1400", "--virtual-time-budget=3000", f"--screenshot={out}", BASE + page,
            ],
            check=True,
            capture_output=True,
        )
        print(out)


if __name__ == "__main__":
    main()
