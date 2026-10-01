# Speech-to-Speech Chatbot

A lightweight AI chatbot that accepts questions by text or microphone and reads AI responses aloud. The frontend is built with React and Vite, while the backend uses FastAPI and the Groq API.

## Features

- Text and speech input through the browser
- AI responses rendered with Markdown
- Text-to-speech playback for every response
- Responsive chat interface with a clean welcome screen

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- A Groq API key
- A browser that supports the Web Speech API for microphone input

## Setup

### 1. Configure the API key

Create a `.env` file in the project root:

```env
GROQ_API=your_groq_api_key
```

### 2. Start the backend

From the project root:

```bash
source venv/bin/activate
pip install fastapi uvicorn python-dotenv groq
python main.py
```

The API runs at `http://127.0.0.1:8000`.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend/tts
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## API

`POST /ask`

```json
{
  "text": "Why is the sky blue?"
}
```

The response contains the AI answer in the `answer` field.

## Production Build

To create a production frontend build:

```bash
cd frontend/tts
npm run build
```
