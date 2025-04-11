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
    files: Optional[List[UploadFile]] = File(None),
    text_input: Optional[str] = Form(None)
):
    """
    Process multiple documents and optional text input using an LLM.
    
    - files: List of documents (PDF, DOCX, JPG, etc.) - optional
    - text_input: Optional text input
    """
    try:
        document_texts = []
        
        # Process the documents if any were uploaded
        if files:
            document_texts = await process_documents(files)
        
        # Add the text input if provided
        if text_input:
            document_texts.append(text_input)
        
        # Check if we have any input to process
        if not document_texts:
            raise HTTPException(status_code=400, detail="No input provided. Please upload at least one file or provide text input.")
        
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