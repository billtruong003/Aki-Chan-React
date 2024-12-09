import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import MDEditor from '@uiw/react-md-editor';
import './App.css';

const API_BASE_URL = 'https://aki-chan-backend.onrender.com';

function App() {
  const [userInput, setUserInput] = useState('');
  const [image, setImage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('vi-VN');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
          setChatHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
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
      const response = await axios.post(`${API_BASE_URL}/api/chat`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 && response.data && response.data.text) {
        const newMessage = response.data.text;

        setChatHistory((prevHistory) => [
          { role: 'user', content: userInput },
          { role: 'aki', content: newMessage },
          ...prevHistory,
        ]);

        localStorage.setItem(
          'chatHistory',
          JSON.stringify([
            { role: 'user', content: userInput },
            { role: 'aki', content: newMessage },
            ...chatHistory,
          ])
        );
      } else {
        console.error('Invalid response from server:', response);
        alert('Lỗi server. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi khi gọi API. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setUserInput('');
      setImage(null);
    }
  };

  const handleClearHistory = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/clear-history`);
      setChatHistory([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  // Phần xử lý nhận diện giọng nói
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  // Sử dụng useMemo để bọc việc khởi tạo recognition
  const recognition = useMemo(() => {
    return SpeechRecognition ? new SpeechRecognition() : null;
  }, [SpeechRecognition]);

  useEffect(() => {
    if (recognition) {
      recognition.lang = currentLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        console.log(`Speech recognition (${currentLanguage}) started`);
      };

      recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        setUserInput(result);
        console.log(`Speech recognition (${currentLanguage}) result:`, result);
      };

      recognition.onerror = (event) => {
        console.error(`Speech recognition error (${currentLanguage}):`, event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log(`Speech recognition (${currentLanguage}) ended`);
      };
    }
  }, [recognition, currentLanguage]);

  const handleVoiceInput = () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    } else {
      alert('Trình duyệt của bạn không hỗ trợ Speech Recognition API.');
    }
  };

  const toggleLanguage = () => {
    setCurrentLanguage(currentLanguage === 'vi-VN' ? 'en-US' : 'vi-VN');
  };

  return (
    <div className="app-container">
      <img src="aki-maid.webp" alt="Aki" className="aki-image" />
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
        <div className="input-actions">
          <input type="file" onChange={handleImageChange} className="image-upload" />
          <button onClick={handleVoiceInput} className="voice-input-button">
            {isListening ? 'Dừng thu âm' : 'Bắt đầu thu âm'}
          </button>
          <button onClick={toggleLanguage} className="language-toggle-button">
            {currentLanguage === 'vi-VN' ? 'Tiếng Việt' : 'English'}
          </button>
        </div>
        <button onClick={handleSubmit} disabled={isLoading} className="submit-button">
          Gửi
        </button>
      </div>

      {isLoading && <div className="loading">Đang nhận phản hồi từ Aki...</div>}

      <button onClick={handleClearHistory} className="clear-button">
        Xóa lịch sử
      </button>

      <div className="chat-history">
        {chatHistory.map((message, index) => (
          <div key={index} className={`message ${message.role}-message`}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={message.role === 'user'
                  ? 'https://yt3.googleusercontent.com/5_iNqlbzzaC-8MRY-_K1zw325-L38QwLKySObLpKyz1gX7pN_QXWqRcLHm5Im4GTaQnFpC41ixA=s900-c-k-c0x00ffffff-no-rj'
                  : 'aki-maid.webp'}
                alt={message.role === 'user' ? 'User' : 'Aki'}
                className="role-image"
              />
              <strong className="message-role">
                {message.role === 'user' ? 'User: ' : 'Aki: '}
              </strong>
            </div>
            <MDEditor.Markdown source={message.content} data-color-mode="light" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;