import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Circles } from 'react-loader-spinner';

// API URL from environment variable or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// SVG icons as components
const UploadIcon = () => (
  <svg className="dropzone-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

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
  const [combinedText, setCombinedText] = useState('');
  const [highlightedLines, setHighlightedLines] = useState([]);
  const textDisplayRef = useRef(null);
  const parametersTableRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const loadingRef = useRef(null);

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
    setCombinedText('');
    setHighlightedLines([]);

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
      setCombinedText(result.data.combined_text);
      
      // Parse the response based on the analysis type
      if (analysisType === 'standard') {
        // Parse the CSV-like response into an array of parameter value pairs with line references
        const lines = result.data.response.trim().split('\n');
        const parsedLines = lines.map(line => {
          // Handle possible quotes in the CSV values
          const processedLine = line.trim();
          const parts = [];
          let inQuotes = false;
          let currentValue = '';
          
          for (let i = 0; i < processedLine.length; i++) {
            const char = processedLine[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
              continue;
            }
            
            if (char === ',' && !inQuotes) {
              parts.push(currentValue);
              currentValue = '';
              continue;
            }
            
            currentValue += char;
          }
          
          // Add the last part
          if (currentValue) {
            parts.push(currentValue);
          }
          
          // Format the data
          if (parts.length >= 3) {
            return { 
              parameter: parts[0].trim(), 
              value: parts[1] ? parts[1].trim() : '',
              lineRef: parts[2] ? parts[2].trim() : '0'
            };
          } else if (parts.length === 2) {
            return { 
              parameter: parts[0].trim(), 
              value: parts[1] ? parts[1].trim() : '',
              lineRef: '0'
            };
          } else {
            return { 
              parameter: processedLine.trim(), 
              value: '',
              lineRef: '0'
            };
          }
        });
        
        console.log('Parsed data:', parsedLines);
        setParsedData(parsedLines);
      } else {
        // Parse the extended format with categories and line references
        const lines = result.data.response.trim().split('\n');
        
        const parsedLines = lines.map(line => {
          // Handle possible quotes in the CSV values
          const processedLine = line.trim();
          const parts = [];
          let inQuotes = false;
          let currentValue = '';
          
          for (let i = 0; i < processedLine.length; i++) {
            const char = processedLine[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
              continue;
            }
            
            if (char === ',' && !inQuotes) {
              parts.push(currentValue);
              currentValue = '';
              continue;
            }
            
            currentValue += char;
          }
          
          // Add the last part
          if (currentValue) {
            parts.push(currentValue);
          }
          
          if (parts.length >= 3) {
            // Split the parameter name to get category and parameter
            const paramWithCategory = parts[0].trim();
            const splitParams = paramWithCategory.split('-');
            
            const category = splitParams[0].trim();
            const parameter = splitParams.length > 1 ? splitParams[1].trim() : '';
            
            // The value is the second part, lineRef is the last part
            const value = parts[1] ? parts[1].trim() : '';
            const lineRef = parts[parts.length - 1] ? parts[parts.length - 1].trim() : '0';
            
            return { 
              category: category, 
              parameter: parameter,
              value: value,
              lineRef: lineRef
            };
          } else {
            console.error("Invalid format in line:", processedLine);
            return { 
              category: 'Unknown', 
              parameter: parts[0] || 'Unknown',
              value: parts.length > 1 ? parts[1] : '',
              lineRef: '0'
            };
          }
        });
        
        // Initialize all categories as collapsed
        const categories = {};
        parsedLines.forEach(item => {
          if (item.category) {
            categories[item.category] = false;
          }
        });
        
        // Filter out any invalid items
        const validParsedLines = parsedLines.filter(item => item.category && item.parameter);
        
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

  // Function to highlight lines in the text display
  const highlightLines = (lineRef) => {
    if (!lineRef || lineRef === '0') return;
    
    // Parse line reference (could be single number or range like "15-17")
    let linesToHighlight = [];
    
    if (lineRef.includes('-')) {
      const [start, end] = lineRef.split('-').map(num => parseInt(num.trim()));
      for (let i = start; i <= end; i++) {
        linesToHighlight.push(i);
      }
    } else {
      linesToHighlight = [parseInt(lineRef)];
    }
    
    setHighlightedLines(linesToHighlight);
    
    // Scroll to the highlighted lines
    if (textDisplayRef.current && linesToHighlight.length > 0) {
      const lineElements = textDisplayRef.current.querySelectorAll('.line');
      const targetLineNumber = linesToHighlight[0];
      
      // Find the element with the matching data-line-number attribute
      for (let i = 0; i < lineElements.length; i++) {
        const elementLineNumber = parseInt(lineElements[i].getAttribute('data-line-number'));
        if (elementLineNumber === targetLineNumber) {
          lineElements[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }
  };

  // Export data as CSV with line references
  const exportToCSV = () => {
    // Create CSV content
    let csvContent = "";
    
    if (analysisType === 'standard') {
      csvContent = "Parameter,Value,LineReference\n" + 
        parsedData.map(row => `"${row.parameter}","${row.value}","${row.lineRef}"`).join('\n');
    } else {
      csvContent = "Category,Parameter,Value,LineReference\n" + 
        parsedData.map(row => `"${row.category}","${row.parameter}","${row.value}","${row.lineRef}"`).join('\n');
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

  // Function to handle back to top button
  const scrollToParameters = () => {
    if (parametersTableRef.current) {
      parametersTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Function to show back to top button after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      if (textDisplayRef.current && parametersTableRef.current) {
        const textDisplayRect = textDisplayRef.current.getBoundingClientRect();
        const parametersRect = parametersTableRef.current.getBoundingClientRect();
        
        // Show button when any part of the text display is visible and parameters are out of view
        const textIsVisible = textDisplayRect.top < window.innerHeight && textDisplayRect.bottom > 0;
        const parametersOutOfView = parametersRect.bottom < 0 || parametersRect.top > window.innerHeight - 100;
        
        setShowBackToTop(textIsVisible && parametersOutOfView);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount to check initial state
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to loading spinner when it appears
  useEffect(() => {
    if (loading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  return (
    <div className="container">
      <h1>Medical Parameter Extractor</h1>
      
      <div className="card">
        <div className="card-body">
          <div {...getRootProps({ className: 'dropzone' })}>
            <input {...getInputProps()} />
            <UploadIcon />
            <p>Drag & drop files here, or click to select files</p>
            <p>Supports PDF, DOCX, JPG, PNG, TXT, and XLSX files</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Selected Files</h3>
          </div>
          <div className="card-body">
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div>{file.name}</div>
                  <button onClick={() => handleRemoveFile(index)}><RemoveIcon/> Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Additional Text (Optional)</h3>
        </div>
        <div className="card-body">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter additional text here..."
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Configuration</h3>
        </div>
        <div className="card-body">
          <div className="model-selection">
            <label className="input-label">Select Model</label>
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
            <label className="input-label">Analysis Type</label>
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
          
          <div className="process-button-container">
            <button
              className="button button--large"
              onClick={handleSubmit}
              disabled={loading || (files.length === 0 && !textInput)}
            >
              {loading ? 'Processing...' : 'Process Documents'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading" ref={loadingRef}>
          <div className="spinner-container">
            <Circles
              visible={true}
              height="80"
              width="80"
              color="#2563eb"
              ariaLabel="processing-documents"
              wrapperStyle={{}}
              wrapperClass=""
            />
            <p>Processing your documents. This may take a moment...</p>
          </div>
        </div>
      )}

      {parsedData.length > 0 && analysisType === 'standard' && (
        <div className="results-container">
          <div className="parameter-table-container" ref={parametersTableRef}>
            <div className="parameter-table-header">
              <h3>Extracted Parameters</h3>
              <button onClick={exportToCSV} className="export-button">
                <ExportIcon /> Export to CSV
              </button>
            </div>
            <div className="parameter-table-body">
              <table className="parameter-table">
                <colgroup>
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Line Reference</th>
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
                          value={row.value || ''}
                          onChange={(e) => handleValueChange(index, e.target.value)}
                        />
                      </td>
                      <td>
                        <button 
                          className="line-ref-button"
                          onClick={() => highlightLines(row.lineRef)}
                          disabled={!row.lineRef || row.lineRef === '0'}
                        >
                          {row.lineRef || 'N/A'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {combinedText && (
            <div className="text-display-container">
              <div className="text-display-header">
                <h3>Source Text</h3>
              </div>
              <div className="text-display" ref={textDisplayRef}>
                {combinedText.split('\n').map((line, index) => {
                  // Extract the line number if it exists in the format "123: text"
                  const lineNumberMatch = line.match(/^(\d+):\s/);
                  const lineNumber = lineNumberMatch ? parseInt(lineNumberMatch[1]) : (index + 1);
                  // Remove the line number prefix from the content if it exists
                  const content = lineNumberMatch ? line.substring(line.indexOf(': ') + 2) : line;
                  
                  return (
                    <div 
                      key={index} 
                      className={`line ${highlightedLines.includes(lineNumber) ? 'highlighted' : ''}`}
                      data-line-number={lineNumber}
                    >
                      <span className="line-number">{lineNumber}</span>
                      <span className="line-content">{content}</span>
                    </div>
                  );
                })}
              </div>
              {showBackToTop && (
                <button className="back-to-top" onClick={scrollToParameters}>
                  <ChevronUpIcon /> Back to Parameters
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {parsedData.length > 0 && analysisType === 'extended' && (
        <div className="results-container">
          <div className="parameter-table-container" ref={parametersTableRef}>
            <div className="parameter-table-header">
              <h3>Extracted Parameters (Extended)</h3>
              <button onClick={exportToCSV} className="export-button">
                <ExportIcon /> Export to CSV
              </button>
            </div>
            
            <div className="parameter-table-body">
              <div className="categorized-parameters">
                {getUniqueCategories().map(category => (
                  <div key={category} className="parameter-category">
                    <div 
                      className={`category-header ${expandedCategories[category] ? 'expanded' : ''}`}
                      onClick={() => toggleCategory(category)}
                    >
                      <h4>{category}</h4>
                      <span className="toggle-icon">
                        {expandedCategories[category] ? '▼' : '►'}
                      </span>
                    </div>
                    
                    {expandedCategories[category] && (
                      <table className="parameter-table">
                        <colgroup>
                          <col style={{ width: "40%" }} />
                          <col style={{ width: "40%" }} />
                          <col style={{ width: "20%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th>Line Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData
                            .filter(row => row.category === category)
                            .map((row, index) => (
                              <tr key={index}>
                                <td>
                                  <div className="parameter-name">{row.parameter}</div>
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    value={row.value || ''}
                                    onChange={(e) => {
                                      const newData = [...parsedData];
                                      const dataIndex = parsedData.findIndex(
                                        item => item.category === category && item.parameter === row.parameter
                                      );
                                      if (dataIndex !== -1) {
                                        newData[dataIndex].value = e.target.value;
                                        setParsedData(newData);
                                      }
                                    }}
                                  />
                                </td>
                                <td>
                                  <button 
                                    className="line-ref-button"
                                    onClick={() => highlightLines(row.lineRef)}
                                    disabled={!row.lineRef || row.lineRef === '0'}
                                  >
                                    {row.lineRef || 'N/A'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {combinedText && (
            <div className="text-display-container">
              <div className="text-display-header">
                <h3>Source Text</h3>
              </div>
              <div className="text-display" ref={textDisplayRef}>
                {combinedText.split('\n').map((line, index) => {
                  // Extract the line number if it exists in the format "123: text"
                  const lineNumberMatch = line.match(/^(\d+):\s/);
                  const lineNumber = lineNumberMatch ? parseInt(lineNumberMatch[1]) : (index + 1);
                  // Remove the line number prefix from the content if it exists
                  const content = lineNumberMatch ? line.substring(line.indexOf(': ') + 2) : line;
                  
                  return (
                    <div 
                      key={index} 
                      className={`line ${highlightedLines.includes(lineNumber) ? 'highlighted' : ''}`}
                      data-line-number={lineNumber}
                    >
                      <span className="line-number">{lineNumber}</span>
                      <span className="line-content">{content}</span>
                    </div>
                  );
                })}
              </div>
              {showBackToTop && (
                <button className="back-to-top" onClick={scrollToParameters}>
                  <ChevronUpIcon /> Back to Parameters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {response && !parsedData.length && (
        <div className="response-container">
          <div className="response-header">
            <h3>Response</h3>
          </div>
          <div className="response-body">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 