const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000; // Cổng 10000 cho Render

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('GOOGLE_API_KEY environment variable is not set.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-exp-1206' });

const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
const allowedOrigins = ['https://billtruong003.github.io', 'http://localhost:3000']; // Sửa allowedOrigins
app.use(
    cors({
        origin: function (origin, callback) {
            // Cho phép các request không có origin (ví dụ: từ Postman)
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
app.use(express.json()); // Để parse JSON body
app.use(express.urlencoded({ extended: true })); // Để parse URL-encoded body

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

// Route xử lý chat
app.post('/api/chat', upload.single('image'), async (req, res) => {
    try {
        const { userInput } = req.body;
        const image = req.file;

        console.log('Received request - userInput:', userInput, 'image:', image ? 'present' : 'not present'); // Log để debug

        const systemMessage = readSystemMessage();
        let promptParts = [systemMessage];

        if (image) {
            promptParts.push(
                userInput,
                {
                    inlineData: {
                        mimeType: image.mimetype,
                        data: image.buffer.toString('base64'),
                    },
                }
            );
        } else {
            promptParts.push(userInput);
        }

        const result = await model.generateContent(promptParts);
        const response = result.response;

        let chatHistory = loadChatHistory();
        chatHistory.push({ role: 'user', content: userInput }); // Thêm vào cuối
        chatHistory.push({ role: 'aki', content: response.text() }); // Thêm vào cuối
        saveChatHistory(chatHistory);

        console.log('Sending response:', response.text()); // Log để debug

        res.json({ text: response.text() });
    } catch (error) {
        console.error('Error in /api/chat:', error); // Log để debug
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route xóa lịch sử chat
app.post('/api/clear-history', (req, res) => {
    try {
        console.log('Received request to clear history'); // Log để debug
        saveChatHistory([]);
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('Error in /api/clear-history:', error); // Log để debug
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});