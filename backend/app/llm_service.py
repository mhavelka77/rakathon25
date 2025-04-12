import os
from typing import List
import requests
from dotenv import load_dotenv
import aiohttp
import json
import tiktoken

from app.prompt import create_prompt

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL")

MAX_CONTEXT_LENGTH = 128000

def fetch_available_models():
    if not OPENAI_API_KEY:
        return ["gpt-4o-mini"]
    
    try:
        url = "https://api.openai.com/v1/models"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            all_models = response.json()["data"]
            
            supported_prefixes = ["gpt-4", "gpt-3.5"]
            models = [model["id"] for model in all_models 
                     if any(model["id"].startswith(prefix) for prefix in supported_prefixes)]
            
            models.sort()
            if not models:
                models = ["gpt-4o-mini"]
            
            return models
        else:
            return ["gpt-4o-mini"]
    except Exception as e:
        print(f"Error fetching models from OpenAI: {str(e)}")
        return ["gpt-4o-mini"]

AVAILABLE_MODELS = fetch_available_models()
DEFAULT_MODEL = "gpt-4o-mini"
USE_LOCAL_LLM = False if OPENAI_API_KEY else True

def check_token_limit(prompt: str, model: str) -> bool:
    try:
        if "gpt-4" in model:
            encoding = tiktoken.encoding_for_model("gpt-4")
        elif "gpt-3.5" in model:
            encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        else:
            encoding = tiktoken.get_encoding("cl100k_base")
            
        token_count = len(encoding.encode(prompt))
        available_tokens = MAX_CONTEXT_LENGTH * 0.75
        
        return token_count <= available_tokens
    except Exception:
        estimated_tokens = len(prompt) // 4
        return estimated_tokens <= (MAX_CONTEXT_LENGTH * 0.75)

async def get_llm_response(texts: List[str], model: str = DEFAULT_MODEL, analysis_type: str = "standard") -> str:
    prompt = create_prompt(texts, analysis_type)
    
    if not check_token_limit(prompt, model):
        return "Error: Input text is too large for the model's context window. Please reduce the amount of text or try using fewer documents."
    
    if USE_LOCAL_LLM:
        return await get_local_llm_response(prompt, model)
    else:
        return get_openai_response(prompt, model)

def get_openai_response(prompt: str, model: str = DEFAULT_MODEL) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not set in the environment variables")
    
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a medical parameter extraction assistant that analyzes medical documents and extracts specified parameters."},
                {"role": "user", "content": prompt}
            ]
        }
        
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()
        
        if response.status_code == 200:
            return response_data["choices"][0]["message"]["content"]
        else:
            return f"Error from OpenAI API: {response_data.get('error', {}).get('message', 'Unknown error')}"
    
    except Exception as e:
        return f"Error getting response from OpenAI: {str(e)}"

async def get_local_llm_response(prompt: str, model: str = DEFAULT_MODEL) -> str:
    if not LOCAL_LLM_URL:
        raise ValueError("Local LLM URL is not set in the environment variables")
    
    try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a medical parameter extraction assistant that analyzes medical documents and extracts specified parameters."},
                {"role": "user", "content": prompt}
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{LOCAL_LLM_URL}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()
                
                if response.status == 200:
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"Error from local LLM service: {result.get('error', 'Unknown error')}"
    
    except Exception as e:
        return f"Error getting response from local LLM: {str(e)}"