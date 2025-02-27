# app/middleware/debug.py
from fastapi import Request
import time
import json

class RequestLoggingMiddleware:
    """Middleware to log all requests and responses for debugging"""
    
    async def __call__(self, request: Request, call_next):
        # Log request
        start_time = time.time()
        
        # Get request body - note this consumes the stream
        request_body = await request.body()
        
        # Log request details
        print(f"\n===== DEBUG REQUEST =====")
        print(f"Method: {request.method}")
        print(f"URL: {request.url}")
        print(f"Headers: {dict(request.headers)}")
        
        # Try to parse the body as JSON
        try:
            if request_body:
                body_json = json.loads(request_body)
                print(f"Body: {json.dumps(body_json, indent=2)}")
            else:
                print("Body: <empty>")
        except:
            print(f"Body (raw): {request_body}")
        
        # Create a new request with the consumed body
        new_request = Request(
            scope=request.scope,
            receive=request._receive,
        )
        
        # Override receive to return the consumed body
        async def receive():
            return {"type": "http.request", "body": request_body}
        
        new_request._receive = receive
        
        # Process the request
        response = await call_next(new_request)
        
        # Calculate process time
        process_time = time.time() - start_time
        
        # Log response
        print(f"\n===== DEBUG RESPONSE =====")
        print(f"Status: {response.status_code}")
        print(f"Process Time: {process_time:.4f} seconds")
        print(f"Headers: {dict(response.headers)}")
        print("=============================\n")
        
        return response