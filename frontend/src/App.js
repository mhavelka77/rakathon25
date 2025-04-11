import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

// API URL from environment variable or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt']
    }
  });

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0 && !textInput) {
      alert("Please upload at least one document or enter some text.");
      return;
    }

    setLoading(true);
    setResponse('');

    const formData = new FormData();
    
    // Add all files to the form data
    files.forEach(file => {
      formData.append('files', file);
    });

    // Add text input if available
    if (textInput) {
      formData.append('text_input', textInput);
    }

    try {
      const result = await axios.post(`${API_URL}/api/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResponse(result.data.response);
    } catch (error) {
      console.error("Error processing documents:", error);
      setResponse(`Error: ${error.response?.data?.detail || 'Something went wrong. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Document Processor</h1>
      
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag & drop files here, or click to select files</p>
        <p>Supports PDF, DOCX, JPG, PNG, and TXT files</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <h3>Selected Files:</h3>
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <div>{file.name}</div>
              <button onClick={() => handleRemoveFile(index)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="input-container">
        <h3>Additional Text (Optional):</h3>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter additional text here..."
        />
      </div>

      <button
        className="button"
        onClick={handleSubmit}
        disabled={loading || (files.length === 0 && !textInput)}
      >
        {loading ? 'Processing...' : 'Process Documents'}
      </button>

      {loading && (
        <div className="loading">
          <p>Processing your documents...</p>
        </div>
      )}

      {response && (
        <div className="response-container">
          <h3>Response:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
        </div>
      )}
    </div>
  );
}

export default App; 