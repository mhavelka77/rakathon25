import re
import os
import unicodedata
from typing import List

class Anonymizer:
    def __init__(self, names_file_path: str = None):
        self.names_to_replace = []
        if names_file_path and os.path.exists(names_file_path):
            self.load_names_from_file(names_file_path)
    
    def load_names_from_file(self, file_path: str):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                self.names_to_replace = [name.strip() for name in file.readlines() if name.strip()]
        except Exception:
            self.names_to_replace = []
    
    def _remove_diacritics(self, text):
        """Remove diacritics from text"""
        return ''.join(c for c in unicodedata.normalize('NFKD', text)
                       if not unicodedata.combining(c))
    
    def anonymize_text(self, text: str) -> str:
        """Anonymize text by replacing names with placeholders."""
        if not self.names_to_replace or not text:
            return text
        
        result = text
        
        # Process each name in the list
        for i, name in enumerate(self.names_to_replace):
            # Skip empty names
            if not name:
                continue
            
            # Create the replacement
            replacement = f"[PERSON_{i+1}]"
            
            # Create pattern for case insensitive surname matching
            pattern = re.compile(re.escape(name), re.IGNORECASE)
            
            # Replace all occurrences
            result = pattern.sub(replacement, result)
            
        return result
    
    def anonymize_texts(self, texts: List[str]) -> List[str]:
        return [self.anonymize_text(text) for text in texts] 