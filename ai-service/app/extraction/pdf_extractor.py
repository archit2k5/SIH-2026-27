from pypdf import PdfReader

from app.extraction.ocr import extract_text_with_ocr
from app.extraction.text_cleaner import clean_text


def extract_text_from_pdf(file_path: str) -> dict:
    reader = PdfReader(file_path)

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = clean_text(text)

        pages.append({
            "page_number": page_number,
            "text": text
        })

    full_text = "\n\n".join(
        page["text"] for page in pages
    )

    if not full_text.strip():
        return extract_text_with_ocr(file_path)

    return {
        "page_count": len(reader.pages),
        "text": full_text,
        "pages": pages,
        "method": "pdf_text_extraction"
    }