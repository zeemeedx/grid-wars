from fastapi import FastAPI, status

app = FastAPI(title="GridWars API", version="1.0")

@app.get("/healthcheck", status_code=status.HTTP_200_OK)
def healthcheck():
    return {
        "status": "ok",
        "message": "API is working."
    }

@app.get("/")
def read_root():
    return {
        "message": "Welcome to GridWars! Go to /docs to read the API documentation."
    }