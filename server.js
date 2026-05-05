const express = require('express');
const cors = require('cors');
const { getChatbotResponse } = require('./utils/chatbotLogic');
const { registerUser, saveChatInteraction } = require('./utils/firebaseDB');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Chatbot backend is running' });
});

// Dedicated download endpoint to force correct file format and headers
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', 'forms', filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(404).send('File not found.');
    }
  });
});

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  // Extract userId and question from the request body. Fallback to 'anonymous' if no userId is provided.
  const { question, userId = 'anonymous' } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Please provide a "question" in the request body.' });
  }

  try {
    // 1. Get the bot's response based on the logic
    const response = getChatbotResponse(question);

    // 2. Register/update the user in Firestore (asynchronously in the background)
    registerUser(userId, { source: 'api' }).catch(console.error);

    // 3. Save the chat interaction to Firestore (asynchronously in the background)
    saveChatInteraction(userId, question, response).catch(console.error);

    // 4. Return the response to the client immediately
    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing chat request:", error);
    res.status(500).json({ error: 'Internal server error while processing the request.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
