import os
import tempfile
from typing import List
from fastapi import UploadFile
import docx
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import io

async def process_documents(files: List[UploadFile]) -> List[str]:
    """
    Process a list of uploaded documents and extract text from them.
    Supports PDF, DOCX, JPG/PNG, and TXT files.
    
    Args:
        files: List of uploaded files
        
    Returns:
        List of extracted text from each document
    """
    results = []
    
    for file in files:
        file_content = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        # Create a temp file to process
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Process based on file type
            if file_extension == '.pdf':
                text = extract_text_from_pdf(temp_file_path)
            elif file_extension == '.docx':
                text = extract_text_from_docx(temp_file_path)
            elif file_extension in ['.jpg', '.jpeg', '.png']:
                text = extract_text_from_image(temp_file_path)
            elif file_extension == '.txt':
                text = file_content.decode('utf-8')
            else:
                text = f"Unsupported file format: {file_extension}"
            
            results.append(text)
        
        finally:
            # Clean up the temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
        # Reset file cursor for potential reuse
        await file.seek(0)
    
    return results

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using OCR (since some PDFs may be scanned documents)."""
    try:
        # Convert PDF pages to images
        images = convert_from_path(file_path)
        
        # Extract text from each page
        text_content = []
        for image in images:
            text = pytesseract.image_to_string(image)
            text_content.append(text)
        
        return "\n\n".join(text_content)
    except Exception as e:
        return f"Error extracting text from PDF: {str(e)}"

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX document."""
    try:
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except Exception as e:
        return f"Error extracting text from DOCX: {str(e)}"

def extract_text_from_image(file_path: str) -> str:
    """Extract text from image using OCR."""
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        return f"Error extracting text from image: {str(e)}" 