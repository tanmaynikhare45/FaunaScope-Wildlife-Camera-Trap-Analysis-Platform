#entry point of the backend(not app.py because app.py is already taken)

from src.app import app



if __name__=="__main__":
    import uvicorn
    uvicorn.run(app,host="localhost",port=8000)