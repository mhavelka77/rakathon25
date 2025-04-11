from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os

from app.document_processor import process_documents
from app.llm_service import get_llm_response

app = FastAPI(title="Document Processing API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Document Processing API is running"}

@app.post("/api/process")
async def process_data(
    files: List[UploadFile] = File(...),
    text_input: Optional[str] = Form(None)
):
    """
    Process multiple documents and optional text input using an LLM.
    
    - files: List of documents (PDF, DOCX, JPG, etc.)
    - text_input: Optional text input
    """
    try:
        # Check if files were uploaded
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")
        
        # Process the documents and extract text
        document_texts = await process_documents(files)
        
        # Add the text input if provided
        if text_input:
            document_texts.append(text_input)
        
        # Get LLM response
        llm_response = await get_llm_response(document_texts)
        
        return {
            "success": True,
            "response": llm_response,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 