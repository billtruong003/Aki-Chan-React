import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Import file CSS

function App() {
  const [userInput, setUserInput] = useState('');
  const [image, setImage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load chat history on component mount
    const loadHistory = async () => {
      try {
        // Note: You might want to fetch history from the server initially
        // For simplicity, we'll just use local storage for now
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
          setChatHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    loadHistory();
  }, []);

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleImageChange = (event) => {
    setImage(event.target.files[0]);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('userInput', userInput);
    if (image) {
      formData.append('image', image);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newChatHistory = [
        { role: 'user', content: userInput },
        { role: 'aki', content: response.data.text }
      ];
      setChatHistory(prevHistory => [...newChatHistory, ...prevHistory]);

      // Store updated history in local storage
      localStorage.setItem('chatHistory', JSON.stringify([...newChatHistory, ...chatHistory]));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setUserInput('');
      setImage(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      await axios.post('http://localhost:5000/api/clear-history');
      setChatHistory([]);
      localStorage.removeItem('chatHistory'); // Clear from local storage
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  return (
    <div className="app-container">
      <img src="/aki-maid.webp" alt="Aki" className="aki-image" />
      <h1 className="app-title">Aki-Maid</h1>
      <p className="app-description">
        Chào mừng bạn đến với chatbot Aki! Bạn có thể nhập câu hỏi và/hoặc tải lên hình ảnh để nhận câu trả lời từ Aki.
      </p>

      <div className="input-container">
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Nhập câu hỏi của bạn:"
          className="user-input"
        />
        <input type="file" onChange={handleImageChange} className="image-upload" />
        <button onClick={handleSubmit} disabled={isLoading} className="submit-button">
          Gửi
        </button>
      </div>

      {isLoading && <div className="loading">Đang nhận phản hồi từ Aki...</div>}

      <div className="chat-history">
        {chatHistory.map((message, index) => (
          <div key={index} className={`message ${message.role}-message`}>
            {message.content}
          </div>
        ))}
      </div>

      <button onClick={handleClearHistory} className="clear-button">
        Xóa lịch sử
      </button>
    </div>
  );
}

export default App;