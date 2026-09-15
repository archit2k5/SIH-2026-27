import pytesseract
from pdf2image import convert_from_path

from app.extraction.text_cleaner import clean_text


def extract_text_with_ocr(file_path: str) -> dict:
    images = convert_from_path(file_path)

    pages = []

    for page_number, image in enumerate(images, start=1):
        text = pytesseract.image_to_string(image)
        text = clean_text(text)

        pages.append({
            "page_number": page_number,
            "text": text
        })

    full_text = "\n\n".join(
        page["text"] for page in pages
    )

    return {
        "page_count": len(pages),
        "text": full_text,
        "pages": pages,
        "method": "ocr"
    }