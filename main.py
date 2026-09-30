from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import os

# .env load karo
load_dotenv()

# FastAPI app
app = FastAPI()

# React frontend ko allow karo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API key
api_key = os.getenv("GROQ_API")

if not api_key:
    raise ValueError("GROQ_API is not found in .env")

# Groq client
client = Groq(api_key=api_key)


# Home route
@app.get("/")
def home():
    return {
        "message": "TTS Chatbot Backend is running!"
    }


# AI question route
@app.post("/ask")
def ask(data: dict):

    question = data.get("text")

    if not question:
        return {
            "answer": "Please enter a question."
        }

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "answer only question is aksed."
                },
                {
                    "role": "user",
                    "content": question
                }
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


# Run server
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=True
    )