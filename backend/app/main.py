# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys

# Add parent directory to path so we can import the existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import API routers
from app.api.chat import router as chat_router

# Import debugging middleware
from app.middleware.debug import RequestLoggingMiddleware

# Check if we should create a middleware directory and file
middleware_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "middleware")
if not os.path.exists(middleware_dir):
    os.makedirs(middleware_dir)
    with open(os.path.join(middleware_dir, "__init__.py"), "w") as f:
        f.write("# Middleware package\n")

# Create FastAPI app
app = FastAPI(
    title="Scheduler Bot API",
    description="API for the Scheduler Bot that integrates with Google Calendar",
    version="1.0.0"
)

# Add debugging middleware
app.middleware("http")(RequestLoggingMiddleware())

# Configure CORS to allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(chat_router, prefix="/api", tags=["chat"])

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    return {
        "message": "Scheduler Bot API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    # Run the application with uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)