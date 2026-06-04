from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from src.routes import routes


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include your router - all endpoints are in routes.router
app.include_router(routes.router, prefix="/api")
