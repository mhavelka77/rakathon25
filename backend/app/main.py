from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List, Optional, Dict
import os

from app.document_processor import process_documents
from app.llm_service import get_llm_response, AVAILABLE_MODELS, DEFAULT_MODEL
from app.prompt import load_parameters_descriptions

app = FastAPI(title="Document Processing API")

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

@app.get("/api/models")
async def get_models():
    return {
        "models": AVAILABLE_MODELS,
        "default_model": DEFAULT_MODEL
    }

@app.get("/api/parameter-descriptions")
async def get_parameter_descriptions():
    """Return the parameter descriptions for both standard and extended analysis"""
    try:
        standard_descriptions = load_parameters_descriptions("standard")
        extended_descriptions = load_parameters_descriptions("extended")
        
        return {
            "standard": standard_descriptions,
            "extended": extended_descriptions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading parameter descriptions: {str(e)}")

@app.post("/api/process")
async def process_data(
    files: Optional[List[UploadFile]] = File(None),
    text_input: Optional[str] = Form(None),
    model: Optional[str] = Form(DEFAULT_MODEL),
    analysis_type: Optional[str] = Form("standard")
):
    try:
        document_texts = []
        
        if files:
            document_texts = await process_documents(files)
        
        if text_input:
            document_texts.append(text_input)
        
        if not document_texts:
            raise HTTPException(status_code=400, detail="No input provided. Please upload at least one file or provide text input.")
        
        if model not in AVAILABLE_MODELS:
            model = DEFAULT_MODEL
        
        llm_response = await get_llm_response(document_texts, model, analysis_type)
        
        return {
            "success": True,
            "response": llm_response,
            "analysis_type": analysis_type
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)