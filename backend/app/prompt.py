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

def load_all_data() -> Dict[str, str]:
    """Dynamically load all files from the data directory"""
    data = {}
    try:
        # Find all .txt files in the data directory
        data_files = glob.glob(os.path.join(PROMPT_DATA_DIR, "*.txt"))
        
        for file_path in data_files:
            # Extract the filename without extension to use as the variable name
            var_name = os.path.splitext(os.path.basename(file_path))[0]
            
            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as file:
                data[var_name] = file.read()
                
    except Exception as e:
        print(f"Error loading data files: {str(e)}")
    
    return data

def create_prompt(texts: List[str]) -> str:
    """Create the final prompt by combining the template with all data files"""
    combined_text = "\n\n".join(texts)
    
    # Load the template and all data files
    template = load_template()
    data = load_all_data()
    
    # Add the combined text to the data
    data['combined_text'] = combined_text
    
    # Format the template with all variables
    return template.format(**data)