from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import os
from dotenv import load_dotenv

load_dotenv()

DB_DIR = os.getenv("DB_DIR", "./data")
if not os.path.exists(DB_DIR):
    try:
        os.makedirs(DB_DIR)
    except OSError:
        # Fallback for native Windows execution
        DB_DIR = "./data"
        if not os.path.exists(DB_DIR):
            os.makedirs(DB_DIR)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_DIR}/agricultural.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
