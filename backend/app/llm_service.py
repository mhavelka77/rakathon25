import os
from typing import List
import requests
from dotenv import load_dotenv
import aiohttp
import json

from app.prompt import create_prompt

# Load environment variables
load_dotenv()

# Get API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL")

# Set default model
DEFAULT_MODEL = "gpt-4o"
USE_LOCAL_LLM = False if OPENAI_API_KEY else True

async def get_llm_response(texts: List[str]) -> str:
    """
    Get a response from an LLM based on the provided texts.
    Uses OpenAI by default, falls back to local LLM if configured.
    The LLM will extract parameters defined in parameters.csv from the medical texts.
    
    Args:
        texts: List of text extracted from documents
        
    Returns:
        LLM response containing extracted parameters
    """
    # Use the consolidated prompt from the prompt module
    prompt = create_prompt(texts)
    
    # Use the appropriate LLM
    if USE_LOCAL_LLM:
        return await get_local_llm_response(prompt)
    else:
        return get_openai_response(prompt)

def get_openai_response(prompt: str) -> str:
    """Get a response from OpenAI API using direct HTTP request."""
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not set in the environment variables")
    
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        data = {
            "model": DEFAULT_MODEL,
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

async def get_local_llm_response(prompt: str) -> str:
    """Get a response from a local LLM service."""
    if not LOCAL_LLM_URL:
        raise ValueError("Local LLM URL is not set in the environment variables")
    
    try:
        # Prepare the request payload
        payload = {
            "model": "local-model",
            "messages": [
                {"role": "system", "content": "You are a medical parameter extraction assistant that analyzes medical documents and extracts specified parameters."},
                {"role": "user", "content": prompt}
            ]
        }
        
        # Make the request to the local LLM service
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{LOCAL_LLM_URL}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()
                
                # Parse the response
                if response.status == 200:
                    return result["choices"][0]["message"]["content"]
                else:
                    return f"Error from local LLM service: {result.get('error', 'Unknown error')}"
    
    except Exception as e:
        return f"Error getting response from local LLM: {str(e)}" 