from sqlalchemy import Column, String, DateTime, create_engine, ForeignKey, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# SQLite DB setup
engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False}, echo=True)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Clerk user_id (string now)
    email = Column(String, unique=True, index=True)    # From Clerk profile
    name = Column(String, nullable=True)               # Optional (for dashboard)
    created_at = Column(DateTime, default=datetime.now)


class Media(Base):
    __tablename__ = "media"

    id = Column(String, primary_key=True)               # File ID
    user_id = Column(String, ForeignKey("users.id"))    # Who uploaded
    file_url = Column(String, nullable=False)           # S3 path
    file_type = Column(String)                          # "image" or "video"
    folder_path = Column(String, nullable=True)         # Folder structure (e.g., "animals/2024/zebras")
    uploaded_at = Column(DateTime, default=datetime.now)

    # YOLO outputs
    classification = Column(String, nullable=True)      # "blank" | "non_blank"
    confidence = Column(Float, nullable=True)           # confidence for classification
    species = Column(String, nullable=True)             # optional, if detected
    predictions = Column(Text, nullable=True)           # raw YOLO detections (JSON)

    is_processed = Column(Boolean, default=False)       # Mark when YOLO done

    # Optional location data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

# Create DB tables (will add folder_path column if running fresh)
# For existing DB, you'll need a migration
Base.metadata.create_all(engine)

# DB Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()