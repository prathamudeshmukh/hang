"""Static font cuts for the type scale (DESIGN.md §4), from Google's OFL variable fonts.

React Native on Android can't set variable-font axes, so each optical size and weight the scale uses becomes
its own file. Android names a font family after its file, so the file name is the `fontFamily` in tokens.

    python -I scripts/build-fonts.py <folder with the google/fonts ttf files> assets/fonts

Sources (github.com/google/fonts, ofl/): newsreader/Newsreader[opsz,wght].ttf,
newsreader/Newsreader-Italic[opsz,wght].ttf, hankengrotesk/HankenGrotesk[wght].ttf. Needs fonttools 4.55.
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

NEWSREADER = "Newsreader[opsz,wght].ttf"
NEWSREADER_ITALIC = "Newsreader-Italic[opsz,wght].ttf"
HANKEN = "HankenGrotesk[wght].ttf"

TEXT_OPSZ = 16
DISPLAY_OPSZ = 36

CUTS = [
    ("Newsreader-Text-Regular", NEWSREADER, {"opsz": TEXT_OPSZ, "wght": 400}),
    ("Newsreader-Text-Italic", NEWSREADER_ITALIC, {"opsz": TEXT_OPSZ, "wght": 400}),
    ("Newsreader-Display-Book", NEWSREADER, {"opsz": DISPLAY_OPSZ, "wght": 350}),
    ("Newsreader-Display-Regular", NEWSREADER, {"opsz": DISPLAY_OPSZ, "wght": 400}),
    ("HankenGrotesk-Medium", HANKEN, {"wght": 500}),
    ("HankenGrotesk-SemiBold", HANKEN, {"wght": 600}),
]

# name IDs: 1 family, 2 subfamily, 4 full name, 6 PostScript name, 16/17 typographic family/subfamily.
NAME_IDS_TO_DROP = (16, 17)


def find_source(source_dir: Path, name: str) -> Path:
    matches = [path for path in source_dir.iterdir() if path.name.endswith(name)]
    if len(matches) != 1:
        raise SystemExit(f"expected one file ending in {name} in {source_dir}, found {len(matches)}")
    return matches[0]


def rename(font: TTFont, family: str) -> None:
    names = font["name"]
    for name_id in NAME_IDS_TO_DROP:
        names.removeNames(nameID=name_id)
    for name_id, value in ((1, family), (2, "Regular"), (4, family), (6, family)):
        names.setName(value, name_id, 3, 1, 0x409)
        names.setName(value, name_id, 1, 0, 0)


def build(source_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for family, source, axes in CUTS:
        font = instantiateVariableFont(TTFont(find_source(source_dir, source)), axes)
        rename(font, family)
        target = out_dir / f"{family}.ttf"
        font.save(target)
        print(f"{target} {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    build(Path(sys.argv[1]), Path(sys.argv[2]))
