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

def extract_values_from_response(response):
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

def save_dataframe(df, output_path='./processed_data.pkl'):
    """
    Save the DataFrame to a pickle file
    """
    df.to_pickle(output_path)
    print(f"DataFrame saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Process text files using the backend API')
    parser.add_argument('input_dir', help='Directory containing text files to process')
    parser.add_argument('--output', default='./processed_data.pkl', help='Output file path (pickle format)')
    parser.add_argument('--api_url', default='http://localhost:8000/api/process', help='API endpoint URL')
    args = parser.parse_args()
    
    # Get all text files from the specified directory
    text_files = glob.glob(os.path.join(args.input_dir, '*.txt'))
    print(f"Found {len(text_files)} text files to process")
    
    # Initialize or load existing DataFrame
    if os.path.exists(args.output):
        print(f"Loading existing DataFrame from {args.output}")
        df = pd.read_pickle(args.output)
        # Get already processed files
        processed_files = set(df['file_path'].tolist()) if 'file_path' in df.columns else set()
        text_files = [f for f in text_files if f not in processed_files]
        print(f"Skipping {len(processed_files)} already processed files")
    else:
        df = pd.DataFrame()
    
    # Process each file
    for file_path in tqdm(text_files):
        try:
            # Process the file using the API
            response = process_file(file_path, api_url=args.api_url)
            
            # Extract values from the response
            values = extract_values_from_response(response)
            
            # Create a new row for the DataFrame
            row = values.copy()
            row['file_path'] = file_path
            
            # Append to DataFrame
            df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
            
            # Save after each file for recoverability
            save_dataframe(df, output_path=args.output)
            
            # Add a small delay to avoid overwhelming the API
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
    
    print(f"Processing complete. Processed {len(text_files)} files.")
    print(f"Final DataFrame shape: {df.shape}")

if __name__ == "__main__":
    main() 