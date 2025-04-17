import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';
import { FaUser, FaDownload, FaTrash, FaHome } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import './normal.css';
import './App.css';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

// Initialize mermaid with better settings for complex diagrams
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    useMaxWidth: true,
    diagramPadding: 8,
    rankSpacing: 80,
    nodeSpacing: 50,
    padding: 8,
    defaultRenderer: 'elk',
    defaultEdgeLength: 50,
    edgeLength: 50,
    minEdgeLength: 30,
    maxEdgeLength: 100
  },
  fontSize: 14,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  themeVariables: {
    primaryColor: '#fff0e6',
    primaryTextColor: '#d35400',
    primaryBorderColor: '#d35400',
    lineColor: '#d35400',
    secondaryColor: '#fff0e6',
    tertiaryColor: '#fff0e6',
    edgeLabelBackground: '#fff5e6',
    clusterBkg: '#fff0e6',
    clusterBorder: '#e6d5b8',
    nodeBorder: '#d35400',
    mainBkg: '#f5e6d3',
    nodeTextColor: '#d35400',
    edgeTextColor: '#d35400',
    labelBackground: '#fff5e6',
    labelBorder: '#d35400',
    labelTextColor: '#d35400',
    labelBoxBkgColor: '#fff5e6',
    labelBoxBorderColor: '#d35400',
    arrowheadColor: '#d35400',
    edgeLabelColor: '#d35400',
    edgeLabelBorderColor: '#d35400',
    edgeLabelBkgColor: '#fff5e6',
    nodeBorderWidth: '1px',
    nodePadding: 8,
    nodeMargin: 4,
    padding: 8,
    textAlign: 'center',
    nodeTextAlign: 'center',
    edgeLabelAlign: 'center'
  }
});

const LandingPage = ({ onStartChat }) => {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>Welcome to Bon AIppétit</h1>
        <p>Your AI-powered cooking assistant that helps you create delicious recipes with step-by-step cuisinograms.</p>
        <div className="landing-features">
          <div className="feature">
            <h3>Recipe Generation</h3>
            <p>Get detailed recipes from URLs or dish names</p>
          </div>
          <div className="feature">
            <h3>Cuisinograms</h3>
            <p>Recipe flowcharts that contain easy-to-follow step-by-step instructions</p>
          </div>
          <div className="feature">
            <h3>Download Options</h3>
            <p>Save your Cuisinograms as SVG or PNG</p>
          </div>
        </div>
        <button className="start-button" onClick={onStartChat}>
          Start Cooking
        </button>
      </div>
    </div>
  );
};

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('Checking connection...');
  const [chats, setChats] = useState([{
    id: 1,
    title: 'Chat 1',
    messages: [{
      user: 'ai',
      message: 'Welcome to Bon AIppétit! I\'m your artificial intelligence personal cooking assistant. \nI can generate an ingredients list and a step by step flowchart for your recipe. \nTo start, provide me with a URL to a recipe you found, or give a dish name.'
    }]
  }]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [showLanding, setShowLanding] = useState(true);
  const server = process.env.REACT_APP_API_URL || 'https://bon-aippetit-backend.onrender.com/api/gemini';
  const testServer = process.env.REACT_APP_API_URL || 'https://bon-aippetit-backend.onrender.com/api/test';
  const chatLogRef = useRef(null);

  // Configure axios defaults
  axios.defaults.headers.common['Content-Type'] = 'application/json';
  axios.defaults.headers.common['Accept'] = 'application/json';

  // Get current chat messages
  const currentChat = chats.find(chat => chat.id === currentChatId) || chats[0];

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing connection to:', testServer);
        const response = await axios.get(testServer, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('API Connection Response:', response.data);
        setApiStatus('Bon AIppétit is powered by Gemini 2.0 Flash');
      } catch (error) {
        console.error('API Connection Error Details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: testServer
        });
        setApiStatus(`API Connection Error: ${error.message}`);
      }
    };
    testConnection();
  }, [testServer]);

  const createNewChat = () => {
    const newChat = {
      id: chats.length + 1,
      title: `Chat ${chats.length + 1}`,
      messages: [{
        user: 'ai',
        message: 'Welcome to Bon AIppétit! I\'m your artificial intelligence personal cooking assistant. \nI can generate an ingredients list and a step by step flowchart for your recipe. \nTo start, provide me with a URL to a recipe you found, or give a dish name.'
      }]
    };
    setChats([...chats, newChat]);
    setCurrentChatId(newChat.id);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const newMessage = { user: 'user', message: input };
    
    // Update current chat with new message
    const updatedChats = chats.map(chat => {
      if (chat.id === currentChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage]
        };
      }
      return chat;
    });
    setChats(updatedChats);

    try {
      console.log('Sending request to:', server);
      const { data } = await axios.post(server, { userInput: input }, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      console.log("Raw response data:", data);
      console.log("Type of data:", typeof data);
      
      let recipeName = '';
      let ingredients = '';
      let steps = '';
      let aiMessage = '';
      
      if (data.error) {
        aiMessage = data.error;
      } else if (Array.isArray(data)) {
        if (data.length >= 3) {
          recipeName = data[0];
          ingredients = data[1];
          steps = data[2];
          aiMessage = ingredients;
        } else if (data.length === 2) {
          if (data[0].includes('Recipe Name:')) {
            recipeName = data[0];
            ingredients = data[1];
            aiMessage = ingredients;
          } else {
            ingredients = data[0];
            steps = data[1];
            aiMessage = ingredients;
          }
        } else if (data.length === 1) {
          aiMessage = data[0];
        }
      } else if (typeof data === 'string') {
        aiMessage = data;
      } else if (typeof data === 'object') {
        if (data.ingredients && data.steps) {
          ingredients = data.ingredients;
          steps = data.steps;
          aiMessage = ingredients;
        } else if (data.ingredients) {
          ingredients = data.ingredients;
          aiMessage = ingredients;
        } else if (data.steps) {
          steps = data.steps;
          aiMessage = steps;
        } else {
          aiMessage = JSON.stringify(data);
        }
      } else {
        aiMessage = String(data);
      }

      // Update chat with AI response
      const finalChats = updatedChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, { user: 'ai', message: aiMessage, mermaidCode: steps, recipeName: recipeName }],
            title: recipeName || input.slice(0, 30) + (input.length > 30 ? '...' : '') // Update chat title with recipe name or first message
          };
        }
        return chat;
      });
      setChats(finalChats);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.error || 'Network error: Unable to connect to the server.';
      const errorChats = updatedChats.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, { user: 'ai', message: errorMessage }]
          };
        }
        return chat;
      });
      setChats(errorChats);
    } finally {
      setLoading(false);
      setInput('');
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    // If there's only one chat, show landing page instead of creating a new one
    if (chats.length === 1) {
      setShowLanding(true);
      return;
    }

    // Remove the current chat
    const updatedChats = chats.filter(chat => chat.id !== currentChatId);
    setChats(updatedChats);
    
    // Set current chat to the last remaining chat
    setCurrentChatId(updatedChats[updatedChats.length - 1].id);
  };

  const switchChat = (chatId) => {
    setCurrentChatId(chatId);
  };

  // Add scroll to bottom function
  const scrollToBottom = () => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  };

  // Add useEffect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentChat.messages]);

  const startChat = () => {
    setShowLanding(false);
  };

  const goHome = () => {
    setShowLanding(true);
  };

  if (showLanding) {
    return <LandingPage onStartChat={startChat} />;
  }

  return (
    <div className="App">
      <aside className="sidebar">
        <h1>Bon AIppétit</h1>
        <div className="sidebar-button home-button" onClick={goHome}>
          <FaHome /> Home
        </div>
        <div className="sidebar-button" onClick={createNewChat}>
          <span>+</span> New Chat
        </div>
        <div className="chat-history">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => switchChat(chat.id)}
            >
              {chat.title}
            </div>
          ))}
        </div>
        <div className="sidebar-button clear-chat" onClick={clearChat}>
          <FaTrash /> Delete Chat
        </div>
      </aside>
      <section className="chat-container">
        <div className="chat-log" ref={chatLogRef}>
          {currentChat.messages.map((message, index) => (
            <ChatMessage 
              key={index} 
              message={message} 
              isFirst={index === 0}
            />
          ))}
        </div>
        <div className="chat-input-container">
          <form onSubmit={handleSubmit}>
            <input
              rows="1"
              value={input}
              onKeyDown={onKeyDown}
              onChange={(e) => setInput(e.target.value)}
              className="chat-textarea"
              placeholder="Paste a URL of a recipe or give a dish name..."
            />
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </form>
          <div className="api-status" style={{ 
            color: apiStatus.includes('Error') ? 'red' : 'green'
          }}>
            {apiStatus}
          </div>
        </div>
      </section>
    </div>
  );
}

const ChatMessage = ({ message, isFirst }) => {
  const mermaidRef = useRef(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [svgContent, setSvgContent] = useState(null);

  // Function to download SVG
  const downloadSVG = () => {
    if (!svgContent) return;
    
    // Create a blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    // Use recipe name if available, otherwise use default name
    const filename = message.recipeName ? `${message.recipeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cuisinogram.svg` : 'cuisinogram.svg';
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Function to download PNG
  const downloadPNG = async () => {
    if (!mermaidRef.current) return;

    try {
      const canvas = await html2canvas(mermaidRef.current, {
        backgroundColor: '#f5e6d3',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Convert to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      // Use recipe name if available, otherwise use default name
      const filename = message.recipeName ? `${message.recipeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cuisinogram.png` : 'cuisinogram.png';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error converting to PNG:', error);
    }
  };

  // Process edge labels for better multiline support
  // Replace long sentences with line breaks every few words
  const processEdgeLabels = (code) => {
    // Match different variations of edge definitions with labels
    return code.replace(/(-+>|--+>|==+>|-.+->|==+[^\s]+==+>)\s*"([^"]+)"\s*(-+>|--+>|==+>|-.+->|==+[^\s]+==+>)/g, (match, prefix, label, suffix) => {
      if (label && label.trim().length > 25) {
        // Add line breaks every ~25 characters at word boundaries
        const words = label.trim().split(' ');
        let newLabel = '';
        let lineLength = 0;
        
        words.forEach(word => {
          if (lineLength + word.length > 25) {
            newLabel += '<br/>' + word + ' ';
            lineLength = word.length + 1;
          } else {
            newLabel += word + ' ';
            lineLength += word.length + 1;
          }
        });
        
        return `${prefix}"${newLabel.trim()}"${suffix}`;
      }
      return match;
    });
  };

  useEffect(() => {
    const renderMermaidDiagram = async () => {
      if (!message.mermaidCode || !mermaidRef.current) return;

      try {
        // Reset state
        setRenderFailed(false);
        setSvgContent(null);

        // Clean the mermaid code
        let cleanCode = message.mermaidCode;
        if (cleanCode.startsWith("Steps:")) {
          cleanCode = cleanCode.replace("Steps:", "").trim();
        }

        // Ensure graph direction is set
        if (!cleanCode.trim().startsWith("graph")) {
          cleanCode = "graph TD\n" + cleanCode;
        }
        
        // Process edge labels for better multiline support
        cleanCode = processEdgeLabels(cleanCode);

        console.log("Rendering mermaid code:", cleanCode);

        // Generate unique ID
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanCode);
        
        // Add styling to SVG
        const styledSvg = svg.replace('<svg', '<svg style="width: 70%; height: auto; max-width: 800px;"');
        setSvgContent(styledSvg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setRenderFailed(true);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(renderMermaidDiagram, 100);
    return () => clearTimeout(timeoutId);
  }, [message.mermaidCode]);

  return (
    <div className={`chat-message ${message.user === "ai" ? "ai" : ""} ${isFirst ? "first-message" : ""}`}>
      <div className="chat-message-center">
        <div className={`avatar ${message.user === "ai" ? "ai" : ""}`}>
          {message.user !== "ai" && <FaUser className="user-icon" />}
        </div>
        <div className="message">
          {message.recipeName && (
            <div className="recipe-name">
              {message.recipeName}
            </div>
          )}
          {typeof message.message === 'string' && message.message.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < message.message.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
          {message.mermaidCode && (
            <div className="mermaid-container">
              {renderFailed ? (
                <div className="fallback-code">
                  <p>Cuisinogram:</p>
                  <pre>{message.mermaidCode}</pre>
                </div>
              ) : (
                <>
                  <div className="mermaid-diagram">
                    <div 
                      ref={mermaidRef}
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  </div>
                  <div className="download-buttons">
                    <button 
                      className="download-button"
                      onClick={downloadSVG}
                      title="Download as SVG"
                    >
                      <FaDownload /> SVG
                    </button>
                    <button 
                      className="download-button"
                      onClick={downloadPNG}
                      title="Download as PNG"
                    >
                      <FaDownload /> PNG
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;