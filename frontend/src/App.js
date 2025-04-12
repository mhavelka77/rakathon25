import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Circles } from 'react-loader-spinner';

// API URL from environment variable or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [response, setResponse] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/models`);
        setAvailableModels(response.data.models);
        setSelectedModel(response.data.default_model);
      } catch (error) {
        console.error('Error fetching models:', error);
      }
    };

    fetchModels();
  }, []);

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
    setParsedData([]);

    const formData = new FormData();
    
    // Add all files to the form data
    files.forEach(file => {
      formData.append('files', file);
    });

    // Add text input if available
    if (textInput) {
      formData.append('text_input', textInput);
    }

    // Add selected model
    formData.append('model', selectedModel);

    try {
      const result = await axios.post(`${API_URL}/api/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResponse(result.data.response);
      
      // Parse the CSV-like response into an array of parameter value pairs
      const lines = result.data.response.trim().split('\n');
      const parsedLines = lines.map(line => {
        const [parameter, value] = line.split(',');
        return { parameter: parameter.trim(), value: value ? value.trim() : '' };
      });
      
      setParsedData(parsedLines);
    } catch (error) {
      console.error("Error processing documents:", error);
      setResponse(`Error: ${error.response?.data?.detail || 'Something went wrong. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle edits to the parameter values in the table
  const handleValueChange = (index, newValue) => {
    const updatedData = [...parsedData];
    updatedData[index].value = newValue;
    setParsedData(updatedData);
  };

  // Export data as CSV
  const exportToCSV = () => {
    // Create CSV content
    const csvContent = 
      "Parameter,Value\n" + 
      parsedData.map(row => `"${row.parameter}","${row.value}"`).join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'extracted_parameters.csv');
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>Medical Parameter Extractor</h1>
      
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

      <div className="model-selection">
        <h3>Select Model:</h3>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
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
          <div className="spinner-container">
            <Circles
              visible={true}
              height="80"
              width="80"
              color="#0087F7"
              ariaLabel="processing-documents"
              wrapperStyle={{}}
              wrapperClass=""
            />
            <p>Processing your documents. This may take a moment...</p>
          </div>
        </div>
      )}

      {parsedData.length > 0 && (
        <div className="parameter-table-container">
          <h3>Extracted Parameters:</h3>
          <div className="table-controls">
            <button onClick={exportToCSV} className="export-button">
              Export to CSV
            </button>
          </div>
          <table className="parameter-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {parsedData.map((row, index) => (
                <tr key={index}>
                  <td>{row.parameter}</td>
                  <td>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {response && !parsedData.length && (
        <div className="response-container">
          <h3>Response:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
        </div>
      )}
    </div>
  );
}

export default App; 