"""
This module loads and formats the LLM prompt template from a text file.
"""

import os
from typing import Dict, List, Any

# Paths relative to this file
PROMPT_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'prompt_template.txt')
PARAMETERS_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'parameters.txt')
ABBREVIATIONS_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'abbreviations.txt')

def load_template() -> str:
    """
    Load the prompt template from file.
    
    Returns:
        The prompt template as a string
    """
    with open(PROMPT_TEMPLATE_PATH, 'r', encoding='utf-8') as file:
        return file.read()

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

def load_abbreviations() -> List[Dict[str, str]]:
    """
    Load abbreviations from file.
    
    Returns:
        List of abbreviation definitions
    """
    abbreviations = []
    try:
        with open(ABBREVIATIONS_PATH, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):  # Skip empty lines and comments
                    continue
                parts = line.split(';')
                if len(parts) >= 2:
                    abbreviation = parts[0]
                    meaning = parts[1]
                    abbreviations.append({
                        "abbreviation": abbreviation,
                        "meaning": meaning
                    })
        return abbreviations
    except Exception as e:
        print(f"Error loading abbreviations from file: {str(e)}")
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
    
    # Load template, parameters, and abbreviations
    template = load_template()
    parameters = load_parameters()
    abbreviations = load_abbreviations()
    
    # Format parameters for prompt
    parameters_text = "\n".join([f"{i+1}. {param['definition']} ({param['type']})" 
                               for i, param in enumerate(parameters)])
    
    # Format abbreviations for prompt
    abbreviations_text = "\n".join([f"{abbr['abbreviation']} - {abbr['meaning']}" 
                                 for abbr in abbreviations])
    
    # Create the final prompt using the template
    return template.format(
        parameters_text=parameters_text,
        combined_text=combined_text,
        abbreviations_text=abbreviations_text
    ) 