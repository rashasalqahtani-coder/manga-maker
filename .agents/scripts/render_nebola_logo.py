from pathlib import Path

import fitz


SOURCE = Path("attached_assets/nebola_1788510740196.pdf")
OUTPUT_DIR = Path(".agents/outputs/nebola-logo")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

document = fitz.open(SOURCE)
print(f"pages={document.page_count}")

for index, page in enumerate(document):
    print(f"page={index + 1} size={page.rect.width}x{page.rect.height}")
    pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
    output = OUTPUT_DIR / f"page-{index + 1}.png"
    pixmap.save(output)
    print(output)

    for image_index, image in enumerate(page.get_images(full=True), start=1):
        extracted = document.extract_image(image[0])
        image_output = OUTPUT_DIR / f"embedded-{index + 1}-{image_index}.{extracted['ext']}"
        image_output.write_bytes(extracted["image"])
        print(image_output)