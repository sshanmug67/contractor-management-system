"""
AI Document Processor

OCR and analysis for uploaded documents:
- Invoice OCR → extract line items, amounts, vendor
- Receipt OCR → extract vendor, amount, items, date
- Photo analysis → classify, estimate completion %
- Document classification → permit, inspection, warranty, certificate
"""


async def ocr_invoice(file_url: str) -> dict:
    """
    OCR an invoice PDF/image.
    
    Returns: { vendor, invoice_number, date, line_items: [...], total }
    """
    # TODO: Use Claude Vision or Amazon Textract
    return {}


async def ocr_receipt(file_url: str) -> dict:
    """
    OCR a receipt.
    
    Returns: { vendor, date, items: [...], total }
    """
    # TODO: Use Claude Vision or Amazon Textract
    return {}


async def analyze_photo(file_url: str, job_context: dict) -> dict:
    """
    AI analysis of a work photo.
    
    Returns: {
        classification: "progress" | "completion" | "damage" | "before" | "after",
        estimated_completion_pct: int,
        matched_job_id: str | None,
        description: str
    }
    """
    # TODO: Call Claude Vision with photo + job context
    return {}


async def classify_document(file_url: str, file_type: str) -> dict:
    """
    Classify a document upload.
    
    Returns: { category: "permit"|"inspection"|"warranty"|"certificate"|"other", key_data: {...} }
    """
    # TODO: Call Claude with document content
    return {}
