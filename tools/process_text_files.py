import os
import pandas as pd
import requests
import glob
import time
from tqdm import tqdm
import argparse

def process_file(file_path, api_url="http://localhost:8000/api/process"):
    """
    Process a single text file using the API and return the response
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text_content = f.read()
        
        # Prepare the data for the API request
        files = {}
        data = {
            'text_input': text_content,
            'model': 'gpt-4o-mini',  # Default model
            'analysis_type': 'standard'  # Default analysis type
        }
        
        # Make the API request
        response = requests.post(api_url, data=data, files=files)
        
        if response.status_code == 200:
            return response.json()['response']
        else:
            print(f"Error processing file {file_path}: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Exception processing file {file_path}: {str(e)}")
        return None

def extract_values_from_response(response:str) -> dict[str,str]:
    """
    Extract the second column (values) from the CSV-formatted response
    """
    if not response:
        return {}
    
    values = {}
    lines = response.strip().split('\n')
    
    for line in lines:
        parts = line.split(',')
        if len(parts) >= 2:
            param_name = parts[0].strip()
            param_value = parts[1].strip()
            values[param_name] = param_value
    
    return values

def save_row(row:str, output_path='./processed_data.pkl'):
    """
    Appends row to the output file.
    """
    with open(output_path, 'at') as output:
        print(row,file=output)
    return

def get_already_processed_files(csv_path):
    """
    Read the first column (file_path) from the output CSV to skip reprocessing
    """
    if not os.path.exists(csv_path):
        return set()

    processed = set()
    with open(csv_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                parts = line.strip().split(',')
                if parts:
                    if parts[-1] != 'file_path':
                        processed.add(parts[-1])
    return processed

def main():
    parser = argparse.ArgumentParser(description='Process text files using the backend API')
    parser.add_argument('input_dir', help='Directory containing text files to process')
    parser.add_argument('--output', default='./processed_data.pkl', help='Output file path (pickle format)')
    parser.add_argument('--api_url', default='http://localhost:8000/api/process', help='API endpoint URL')
    args = parser.parse_args()
    
    header = 'Předchozí onkologické onemocnění,Výška,Hmotnost,BMI,Pohlaví,Léková alergie,Specifikace,Alergie na jód/kontrastní látky,Specifikace,Performance status (ECOG),Datum stanovení definitivní diagnózy,Diagnóza - kód MKN,Lateralita,Grading (diferenciace nádoru) G,ORPHA kód,cT,četnost,cN,cM,y,r,a,pT,pN,pM,Stádium,Lokalizace metastáz,Výběr diagnostické skupiny,Datum zahájení léčby,Datum operace,Datum zahájení,Datum ukončení,Datum zahájení  série,Datum ukončení série,Zevní radioterapie,Typ zevní RT,Brachyterapie,Datum hodnocení léčebné odpovědi,Hodnocená léčebná odpověď,Progrese'
    categories = header.split(',')


    text_files = glob.glob(os.path.join(args.input_dir, '*.txt'))
    print(f"Found {len(text_files)} text files")

    processed_files = get_already_processed_files(args.output)
    text_files = [f for f in text_files if f not in processed_files]
    print(f"Skipping {len(processed_files)} already processed files")
    if len(processed_files) == 0:
        save_row(header + ',file_path',args.output)

    # Process each file
    for file_path in tqdm(text_files):
        try:
            # Process the file using the API
            response = process_file(file_path, api_url=args.api_url)
            
            # Extract values from the response
            response_parameters_dict = extract_values_from_response(response)
            
            if response_parameters_dict:
                values = []
                for parameter in categories:
                    value = ''
                    if parameter in response_parameters_dict.keys():
                        value = response_parameters_dict[parameter]
                    values.append(value)
                row = ','.join(values) + ',' + file_path
                save_row(row, args.output)
            
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
    
    print(f"Processing complete. Processed {len(text_files)} files.")

if __name__ == "__main__":
    main() 