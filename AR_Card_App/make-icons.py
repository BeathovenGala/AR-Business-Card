"""Draws the app icon (the card's isometric AR cube on navy) and splash screens into the Android project."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

RES = pathlib.Path(__file__).parent / "android" / "app" / "src" / "main" / "res"
NAVY, CYAN, ORANGE, YELLOW = (15, 27, 61), (34, 195, 230), (255, 138, 61), (255, 210, 63)


def cube(draw, cx, cy, s):
    top = [(cx, cy - s), (cx + s * 0.87, cy - s / 2), (cx, cy), (cx - s * 0.87, cy - s / 2)]
    left = [(cx - s * 0.87, cy - s / 2), (cx, cy), (cx, cy + s), (cx - s * 0.87, cy + s / 2)]
    right = [(cx + s * 0.87, cy - s / 2), (cx, cy), (cx, cy + s), (cx + s * 0.87, cy + s / 2)]
    draw.polygon(top, CYAN); draw.polygon(left, ORANGE); draw.polygon(right, YELLOW)
    inner = [(cx, cy - s * 0.72), (cx + s * 0.42, cy - s * 0.5), (cx, cy - s * 0.28), (cx - s * 0.42, cy - s * 0.5)]
    draw.polygon(inner, NAVY)


def icon(size, rounded=True, foreground_only=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not foreground_only:
        if rounded:
            d.ellipse([0, 0, size - 1, size - 1], NAVY)
        else:
            d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=NAVY)
    # adaptive-icon foregrounds keep the art inside the central 66% safe zone
    s = size * (0.22 if foreground_only else 0.3)
    cube(d, size / 2, size / 2, s)
    return img


DENSITY = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, k in DENSITY.items():
    folder = RES / f"mipmap-{name}"
    icon(int(48 * k), rounded=False).save(folder / "ic_launcher.png")
    icon(int(48 * k), rounded=True).save(folder / "ic_launcher_round.png")
    icon(int(108 * k), foreground_only=True).save(folder / "ic_launcher_foreground.png")
(RES / "values" / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F1B3D</color>\n</resources>\n')

font_path = "C:/Windows/Fonts/bahnschrift.ttf"
for splash in RES.glob("drawable*/splash.png"):
    w, h = Image.open(splash).size
    img = Image.new("RGB", (w, h), NAVY)
    d = ImageDraw.Draw(img)
    s = min(w, h) * 0.12
    cube(d, w / 2, h / 2 - s * 0.6, s)
    f = ImageFont.truetype(font_path, max(12, int(min(w, h) * 0.06)))
    text = "AR Business Card"
    tw = d.textlength(text, font=f)
    d.text(((w - tw) / 2, h / 2 + s * 0.8), text, fill=(255, 255, 255), font=f)
    img.save(splash)
print("icons and splash screens written")
