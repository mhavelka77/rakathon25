"""
This module loads and formats the LLM prompt template from a text file.
"""

import os
from typing import Dict, List, Any

# Paths relative to this file
PROMPT_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'prompt_template.txt')
PARAMETERS_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'parameters.txt')

def load_template() -> str:
    """
    Load the prompt template from file.
    
    Returns:
        The prompt template as a string
    """
    try:
        with open(PROMPT_TEMPLATE_PATH, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error loading prompt template: {str(e)}")
        # Fallback template if file can't be read
        return """You are a medical data extraction assistant. Your task is to extract medical parameters from the provided text.

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

def load_parameters() -> List[Dict[str, str]]:
    """
    Load parameters from file.
    
    Returns:
        List of parameter definitions
    """
    parameters = []
    try:
        with open(PARAMETERS_PATH, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):  # Skip empty lines and comments
                    continue
                parts = line.split(';')
                if len(parts) >= 1:
                    parameter_definition = parts[0]
                    parameter_type = parts[1] if len(parts) > 1 else ""
                    parameters.append({
                        "definition": parameter_definition,
                        "type": parameter_type
                    })
        return parameters
    except Exception as e:
        print(f"Error loading parameters from file: {str(e)}")
        return []

def create_prompt(texts: List[str]) -> str:
    """
    Create a prompt for the LLM with the medical texts and parameters to extract.
    
    Args:
        texts: List of text extracted from documents
        
    Returns:
        Formatted prompt for the LLM
    """
    # Combine all texts into a single context
    combined_text = "\n\n".join(texts)
    
    # Load template and parameters
    template = load_template()
    parameters = load_parameters()
    
    # Format parameters for prompt
    parameters_text = "\n".join([f"{i+1}. {param['definition']} ({param['type']})" 
                               for i, param in enumerate(parameters)])
    
    # Create the final prompt using the template
    return template.format(
        parameters_text=parameters_text,
        combined_text=combined_text
    ) 