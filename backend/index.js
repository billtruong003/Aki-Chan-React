const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("GOOGLE_API_KEY environment variable is not set.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

const upload = multer({ storage: multer.memoryStorage() });

const allowedOrigins = ['https://billtruong003.github.io/Aki-Chan-React/', 'http://localhost:3000']; // Thay your-github-pages-domain.com bằng domain GitHub Pages của bạn
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

app.use(express.json());

const historyFilePath = path.join(__dirname, 'chat_history.json');
const configFilePath = path.join(__dirname, 'config_character.txt');

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

function readSystemMessage() {
    try {
        const data = fs.readFileSync(configFilePath, 'utf-8');
        return data;
    } catch (error) {
        console.error("Error reading system message:", error);
        return "";
    }
}

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

app.post('/api/clear-history', (req, res) => {
    try {
        saveChatHistory([]);
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});