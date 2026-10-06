from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import os

load_dotenv()


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GROQ_API")


client = Groq(api_key=api_key) if api_key else None



@app.get("/")
def home():
    return {
        "message": "TTS Chatbot Backend is running!"
    }



@app.post("/ask")
def ask(data: dict):

    if client is None:
        return {
            "error": "GROQ_API is not configured. Add it to your .env file before calling /ask."
        }

    question = data.get("text")
    history = data.get("history", [])

    if not question:
        return {
            "answer": "Please enter a question."
        }

    if not isinstance(history, list):
        history = []

    conversation = [
        {
            "role": message["role"],
            "content": message["content"],
        }
        for message in history
        if isinstance(message, dict)
        and message.get("role") in {"user", "assistant"}
        and isinstance(message.get("content"), str)
        and message["content"].strip()
    ]
    conversation.append({"role": "user", "content": question})

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "Respond naturally and conversationally to every user message. Answer exactly what the user asks and match the tone and simplicity of the question. For greetings such as 'hi', 'hello', 'hey', or 'good morning', respond with a short, friendly greeting and optionally ask how you can help. For simple questions such as 'tell me a fun fact', provide a concise, interesting and accurate answer without unnecessary explanation. Do not treat greetings or casual conversation as questions that require a detailed answer. Avoid robotic phrases such as 'I'm not sure how to answer that', 'I don't know how to respond', or 'I cannot answer that'. If the user asks a clear question, answer it directly. If the request is unclear, ask a brief and natural clarifying question."
                },
                *conversation,
            ]
        )

        answer = response.choices[0].message.content

        return {
            "answer": answer
        }

    except Exception as error:
        print("Groq Error:", error)

        return {
            "error": "Something went wrong with Groq API."
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=True
    )