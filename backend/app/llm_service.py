import os
from typing import List
import openai
from dotenv import load_dotenv
import aiohttp
import json

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
    
    Args:
        texts: List of text extracted from documents
        
    Returns:
        LLM response
    """
    # Combine all texts into a single context
    combined_text = "\n\n".join(texts)
    
    # Create prompt
    prompt = f"I'm providing you with the following document content. Please analyze this and respond appropriately:\n\n{combined_text}"
    
    # Use the appropriate LLM
    if USE_LOCAL_LLM:
        return await get_local_llm_response(prompt)
    else:
        return await get_openai_response(prompt)

async def get_openai_response(prompt: str) -> str:
    """Get a response from OpenAI API."""
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not set in the environment variables")
    
    try:
        # Set the OpenAI API key
        openai.api_key = OPENAI_API_KEY
        
        # Call the OpenAI API
        response = await openai.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes document content."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Return the response
        return response.choices[0].message.content
    
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
                {"role": "system", "content": "You are a helpful assistant that analyzes document content."},
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