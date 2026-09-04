from pathlib import Path

from PIL import Image, ImageEnhance


SOURCE = Path(".agents/outputs/nebola-logo/embedded-1-1.jpeg")
WEB_PUBLIC = Path("artifacts/web/public")
MOBILE_IMAGES = Path("artifacts/mobile/assets/images")

image = Image.open(SOURCE).convert("RGB")
width, height = image.size

# The PDF contains a square Nebula mark centered on a white page. Keep the
# hand-painted edge of the mark while removing the surrounding page.
left = round(width * 0.265)
top = round(height * 0.25)
right = round(width * 0.81)
bottom = round(height * 0.795)
mark = image.crop((left, top, right, bottom))
mark = ImageEnhance.Contrast(mark).enhance(1.04)

outputs = {
    WEB_PUBLIC / "icon-192.png": 192,
    WEB_PUBLIC / "icon-512.png": 512,
    MOBILE_IMAGES / "icon.png": 1024,
}

for path, size in outputs.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    icon = mark.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(path, "PNG", optimize=True)
    print(f"{path}: {size}x{size}")