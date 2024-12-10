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

        const promptParts = [systemMessage, userInput || ''];

        if (req.file) {
            const image = req.file.buffer;
            const imageBase64 = image.toString('base64');
            promptParts.push(`data:image/jpeg;base64,${imageBase64}`);
        }

        const prompt = promptParts.join('\n');
        console.log('Final prompt:', prompt);

        const result = await model.generateContent(prompt);
        console.log('Google API response:', result);

        const text = await result.response.text();
        console.log('Generated response text:', text);

        // Lưu lịch sử chat
        const chatHistory = loadChatHistory();
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
