import os
from typing import List
import requests
from dotenv import load_dotenv
import aiohttp
import json
import csv

# Load environment variables
load_dotenv()

# Get API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL")

# Set default model
DEFAULT_MODEL = "gpt-4o"
USE_LOCAL_LLM = False if OPENAI_API_KEY else True

def load_parameters_from_csv():
    """
    Load parameters from parameters.csv file.
    
    Returns:
        List of parameter definitions
    """
    parameters = []
    try:
        # Path is relative to where the application runs from
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'parameters.csv')
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            csv_reader = csv.reader(csvfile, delimiter=';')
            for row in csv_reader:
                if len(row) >= 1:
                    parameter_definition = row[0]
                    parameter_type = row[1] if len(row) > 1 else ""
                    parameters.append({
                        "definition": parameter_definition,
                        "type": parameter_type
                    })
        return parameters
    except Exception as e:
        print(f"Error loading parameters from CSV: {str(e)}")
        return []

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
    # Combine all texts into a single context
    combined_text = "\n\n".join(texts)
    
    # Load parameters from CSV
    parameters = load_parameters_from_csv()
    
    # Format parameters for prompt
    parameters_text = "\n".join([f"{i+1}. {param['definition']} ({param['type']})" 
                               for i, param in enumerate(parameters)])
    
    # Create prompt
    prompt = f"""You are a medical data extraction assistant. Your task is to extract medical parameters from the provided text.

PARAMETERS TO EXTRACT:
{parameters_text}

MEDICAL TEXT:
{combined_text}

INSTRUCTIONS:
1. Carefully analyze the medical text and extract ONLY the parameters listed above.
2. Only extract parameters when you are confident they exist in the text.
3. Not all parameters will be present in the text, only extract what you find.
4. For each parameter found, provide the name and the extracted value.
5. Format your response as a clean list of parameter names and values.
6. Do not include any explanations, only the extracted parameters.
7. If you cannot find a parameter, do not include it in your response.
"""
    
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