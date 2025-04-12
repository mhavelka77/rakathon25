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
  const [analysisType, setAnalysisType] = useState('standard');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [parameterDescriptions, setParameterDescriptions] = useState({
    standard: {},
    extended: {}
  });

  // Fetch available models and parameter descriptions on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch models
        const modelsResponse = await axios.get(`${API_URL}/api/models`);
        setAvailableModels(modelsResponse.data.models);
        setSelectedModel(modelsResponse.data.default_model);
        
        // Fetch parameter descriptions
        const descriptionsResponse = await axios.get(`${API_URL}/api/parameter-descriptions`);
        setParameterDescriptions(descriptionsResponse.data);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
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
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
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
    setExpandedCategories({});

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
    
    // Add analysis type
    formData.append('analysis_type', analysisType);

    try {
      const result = await axios.post(`${API_URL}/api/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResponse(result.data.response);
      
      // Parse the response based on the analysis type
      if (analysisType === 'standard') {
        // Parse the CSV-like response into an array of parameter value pairs
        const lines = result.data.response.trim().split('\n');
        const parsedLines = lines.map(line => {
          const [parameter, value] = line.split(',');
          return { parameter: parameter.trim(), value: value ? value.trim() : '' };
        });
        
        setParsedData(parsedLines);
      } else {
        // Parse the extended format with categories
        const lines = result.data.response.trim().split('\n');
        
        // Log the raw response
        console.log("Raw extended response:", result.data.response);
        
        const parsedLines = lines.map(line => {
          // Find the first comma that is not inside quotes
          let splitIndex = -1;
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
              inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
              splitIndex = i;
              break;
            }
          }
          
          // If no suitable comma found, just use the first one
          if (splitIndex === -1) {
            splitIndex = line.indexOf(',');
          }
          
          const paramWithCategory = line.substring(0, splitIndex);
          const value = line.substring(splitIndex + 1);
          
          // Split the parameter and category by hyphen
          const [category, parameter] = paramWithCategory.split('-');
          
          return { 
            category: category.trim(), 
            parameter: parameter ? parameter.trim() : '',
            value: value ? value.trim().replace(/^"|"$/g, '') : '' // Remove surrounding quotes 
          };
        });
        
        // Initialize all categories as collapsed
        const categories = {};
        parsedLines.forEach(item => {
          if (item.category) {
            categories[item.category] = false;
          } else {
            console.error("Found item without category:", item);
          }
        });
        
        // Filter out any invalid items (shouldn't happen, but just in case)
        const validParsedLines = parsedLines.filter(item => item.category && item.parameter);
        
        if (validParsedLines.length < parsedLines.length) {
          console.warn(`Filtered out ${parsedLines.length - validParsedLines.length} invalid items`);
        }
        
        // Check if we have all the data
        console.log(`Parsed ${validParsedLines.length} parameters from ${lines.length} lines`);
        
        setParsedData(validParsedLines);
        setExpandedCategories(categories);
      }
    } catch (error) {
      console.error("Error processing documents:", error);
      setResponse(`Error: ${error.response?.data?.detail || 'Something went wrong. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get description for a parameter
  const getParameterDescription = (parameter) => {
    const descriptionsMap = analysisType === 'standard' 
      ? parameterDescriptions.standard 
      : parameterDescriptions.extended;
    
    return descriptionsMap[parameter] || '';
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
    let csvContent = "";
    
    // Log the data being exported to help with debugging
    console.log("Exporting data:", parsedData);
    
    if (analysisType === 'standard') {
      csvContent = "Parameter,Value\n" + 
        parsedData.map(row => `"${row.parameter}","${row.value}"`).join('\n');
    } else {
      csvContent = "Category,Parameter,Value\n" + 
        parsedData.map(row => `"${row.category}","${row.parameter}","${row.value}"`).join('\n');
    }
    
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
  
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Get unique categories for extended view
  const getUniqueCategories = () => {
    if (analysisType !== 'extended' || !parsedData.length) return [];
    return [...new Set(parsedData.map(item => item.category))];
  };

  return (
    <div className="container">
      <h1>Medical Parameter Extractor</h1>
      
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag & drop files here, or click to select files</p>
        <p>Supports PDF, DOCX, JPG, PNG, TXT, and XLSX files</p>
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
      
      <div className="analysis-type-switch">
        <h3>Analysis Type:</h3>
        <div className="switch-container">
          <button 
            type="button"
            className={`switch-option ${analysisType === 'standard' ? 'active' : ''}`}
            onClick={() => setAnalysisType('standard')}
          >
            Standard Analysis
          </button>
          <button 
            type="button"
            className={`switch-option ${analysisType === 'extended' ? 'active' : ''}`}
            onClick={() => setAnalysisType('extended')}
          >
            Extended Analysis
          </button>
        </div>
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

      {parsedData.length > 0 && analysisType === 'standard' && (
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
                  <td>
                    <div className="parameter-name">{row.parameter}</div>
                    {getParameterDescription(row.parameter) && (
                      <div className="parameter-description">
                        {getParameterDescription(row.parameter)}
                      </div>
                    )}
                  </td>
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
      
      {parsedData.length > 0 && analysisType === 'extended' && (
        <div className="parameter-table-container">
          <h3>Extracted Parameters (Extended):</h3>
          <div className="table-controls">
            <button onClick={exportToCSV} className="export-button">
              Export to CSV
            </button>
          </div>
          
          <div className="categorized-parameters">
            {getUniqueCategories().map(category => (
              <div key={category} className="parameter-category">
                <div 
                  className="category-header" 
                  onClick={() => toggleCategory(category)}
                >
                  <h4>{category}</h4>
                  <span className="toggle-icon">
                    {expandedCategories[category] ? '▼' : '►'}
                  </span>
                </div>
                
                {expandedCategories[category] && (
                  <table className="parameter-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData
                        .filter(row => row.category === category)
                        .map((row, index) => {
                          const dataIndex = parsedData.findIndex(d => 
                            d.category === category && d.parameter === row.parameter
                          );
                          return (
                            <tr key={index}>
                              <td>
                                <div className="parameter-name">{row.parameter}</div>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={row.value}
                                  onChange={(e) => handleValueChange(dataIndex, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
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