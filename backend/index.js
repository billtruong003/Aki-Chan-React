const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000; // Cổng 10000 cho Render

// const apiKey = process.env.GOOGLE_API_KEY;
const apiKey = 'AIzaSyD_1MECGOfwtyggE1J5tJXiNPrn9pY1EoI'; 
if (!apiKey) {
    console.error('GOOGLE_API_KEY environment variable is not set.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
const allowedOrigins = ['https://billtruong003.github.io', 'http://localhost:3000', 'http://192.168.1.65:3000'];
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                var msg =
                    'The CORS policy for this site does not ' +
                    'allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
    })
);

// Thêm middleware để parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const historyFilePath = path.join(__dirname, 'chat_history.json');
const configFilePath = path.join(__dirname, 'config_character.txt');

function loadChatHistory() {
    try {
        const data = fs.readFileSync(historyFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
    }
}

function saveChatHistory(history) {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 4), 'utf-8');
}

function readSystemMessage() {
    try {
        const data = fs.readFileSync(configFilePath, 'utf-8');
        return data;
    } catch (error) {
        console.error('Error reading system message:', error);
        return '';
    }
}
app.post('/api/chat', upload.single('image'), async (req, res) => {
    const { userInput } = req.body;
    const systemMessage = readSystemMessage();
    
    try {
        if (!userInput && !req.file) {
            return res.status(400).json({ error: 'User input or image is required.' });
        }

        // Lấy lịch sử trò chuyện hiện tại từ file
        const chatHistory = loadChatHistory();

        // Lấy 5-10 câu trả lời gần nhất từ chatbot để tránh quá tải
        const contextHistory = chatHistory
            .filter((message) => message.role === 'aki')  // Chỉ lấy câu trả lời của chatbot
            .slice(0, 5);  // Giới hạn 5 câu trả lời gần nhất

        // Ghép lịch sử trò chuyện vào prompt
        let prompt = systemMessage;
        contextHistory.forEach((message) => {
            prompt += `\nAki: ${message.content}`;  // Chỉ thêm câu trả lời của chatbot
        });

        // Thêm hướng dẫn về ngữ cảnh vào cuối phần lịch sử
        prompt += `\n\nĐây là phần phía trước để em hiểu ngữ cảnh, không cần trả lời. Chỉ cần tập trung vào trọng tâm cho câu hỏi phía dưới:\n`;

        // Thêm câu hỏi người dùng vào cuối prompt
        prompt += `\nUser: ${userInput}`;

        // Nếu có hình ảnh, thêm hình ảnh vào prompt (base64)
        if (req.file) {
            const image = req.file.buffer;
            const imageBase64 = image.toString('base64');
            prompt += `\nImage: data:image/jpeg;base64,${imageBase64}`;
        }

        console.log('Final prompt:', prompt);

        // Gửi prompt đến Google AI và nhận phản hồi
        const result = await model.generateContent(prompt);
        console.log('Google API response:', result);

        // Xử lý kết quả API để lấy dữ liệu chính xác
        let text = '';
        if (result && result.response && result.response.text) {
            text = await result.response.text();
        } else {
            // Nếu không có phản hồi văn bản từ API, thông báo cho người dùng
            text = 'Xin lỗi, em không thể tìm thấy thông tin mà chủ nhân yêu cầu (｡•́︿•̀｡)';
        }

        console.log('Generated response text:', text);

        // Lưu lịch sử chat
        const newHistory = [
            { role: 'user', content: userInput },
            { role: 'aki', content: text },
            ...chatHistory,
        ];

        saveChatHistory(newHistory);

        return res.status(200).json({ text });
    } catch (error) {
        console.error('Error in /api/chat:', error.message);
        return res.status(500).json({ error: 'Failed to generate content', details: error.message });
    }
});


// Clear history endpoint
app.post('/api/clear-history', (req, res) => {
    try {
        saveChatHistory([]);
        res.status(200).json({ message: 'Chat history cleared successfully' });
    } catch (error) {
        console.error('Error clearing chat history:', error.message);
        res.status(500).json({ error: 'Failed to clear chat history', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
