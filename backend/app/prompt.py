import os
import glob
from typing import List, Dict

# Define paths
PROMPT_DIR = os.path.join(os.path.dirname(__file__), '..', 'prompt')
PROMPT_TEMPLATE_PATH = os.path.join(PROMPT_DIR, 'prompt_template.txt')
PROMPT_DATA_DIR = os.path.join(PROMPT_DIR, 'data')

def load_template() -> str:
    """Load the main prompt template"""
    with open(PROMPT_TEMPLATE_PATH, 'r', encoding='utf-8') as file:
        return file.read()

def load_parameters_descriptions(analysis_type: str = "standard") -> Dict[str, str]:
    """Load parameter descriptions from the parameters file."""
    descriptions = {}
    
    try:
        # Only load descriptions for standard parameters
        if analysis_type == "standard":
            file_path = os.path.join(PROMPT_DATA_DIR, "parameters.txt")
                
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                lines = content.strip().split('\n')
                
                for line in lines:
                    parts = line.split(';')
                    if len(parts) >= 2:
                        param_name = parts[0].strip()
                        description = parts[1].strip()
                        descriptions[param_name] = description
                            
    except Exception as e:
        print(f"Error loading parameter descriptions: {str(e)}")
        
    return descriptions

def load_all_data(analysis_type: str = "standard") -> Dict[str, str]:
    """Dynamically load all files from the data directory"""
    data = {}
    try:
        # Find all .txt files in the data directory
        data_files = glob.glob(os.path.join(PROMPT_DATA_DIR, "*.txt"))
        
        for file_path in data_files:
            # Extract the filename without extension to use as the variable name
            var_name = os.path.splitext(os.path.basename(file_path))[0]
            
            # Skip the extended parameters file if we're using standard analysis
            if var_name == "parameters_extended" and analysis_type == "standard":
                continue
                
            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as file:
                # If this is the parameters file and we're using extended analysis, use the extended version instead
                if var_name == "parameters" and analysis_type == "extended":
                    data[var_name] = open(os.path.join(PROMPT_DATA_DIR, "parameters_extended.txt"), 'r', encoding='utf-8').read()
                else:
                    data[var_name] = file.read()
                
    except Exception as e:
        print(f"Error loading data files: {str(e)}")
    
    return data

def create_prompt(texts: List[str], analysis_type: str = "standard") -> str:
    """Create the final prompt by combining the template with all data files"""
    combined_text = "\n\n".join(texts)
    
    # Load the template and all data files
    template = load_template()
    data = load_all_data(analysis_type)
    
    # Add the combined text to the data
    data['combined_text'] = combined_text
    
    # Format the template with all variables
    return template.format(**data)