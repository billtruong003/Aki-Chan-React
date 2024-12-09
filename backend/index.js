const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000; // Chọn cổng bạn muốn sử dụng

// Cấu hình API Key
const genAI = new GoogleGenerativeAI("AIzaSyD_1MECGOfwtyggE1J5tJXiNPrn9pY1EoI"); // Thay API Key của bạn
const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

// Cấu hình Multer để xử lý upload file
const upload = multer({ storage: multer.memoryStorage() });

// Cấu hình CORS (nếu cần)
app.use(cors());

// Cấu hình để Express hiểu JSON
app.use(express.json());

// Đường dẫn đến các file
const historyFilePath = path.join(__dirname, 'chat_history.json');
const configFilePath = path.join(__dirname, 'config_character.txt');

// Hàm đọc và lưu lịch sử trò chuyện
function loadChatHistory() {
    try {
        const data = fs.readFileSync(historyFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveChatHistory(history) {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 4), 'utf-8');
}
// Hàm đọc system message từ file
function readSystemMessage() {
    try {
        const data = fs.readFileSync(configFilePath, 'utf-8');
        return data;
    } catch (error) {
        console.error("Error reading system message:", error);
        return "";
    }
}

// API endpoint để xử lý chat
app.post('/api/chat', upload.single('image'), async (req, res) => {
    try {
        const { userInput } = req.body;
        const image = req.file;

        const systemMessage = readSystemMessage();
        let promptParts = [systemMessage];

        if (image) {
            promptParts.push(
                userInput,
                {
                    inlineData: {
                        mimeType: image.mimetype,
                        data: image.buffer.toString('base64')
                    }
                }
            );
        } else {
            promptParts.push(userInput);
        }

        const result = await model.generateContent(promptParts);
        const response = result.response;

        // Lấy và lưu lịch sử trò chuyện
        let chatHistory = loadChatHistory();
        chatHistory.unshift({ role: 'aki', content: response.text() });
        chatHistory.unshift({ role: 'user', content: userInput });
        saveChatHistory(chatHistory);

        res.json({ text: response.text() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// API endpoint để xóa lịch sử trò chuyện
app.post('/api/clear-history', (req, res) => {
    try {
        saveChatHistory([]);
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});