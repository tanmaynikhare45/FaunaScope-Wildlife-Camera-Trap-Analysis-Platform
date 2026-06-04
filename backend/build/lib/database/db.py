"""Database CRUD operations

This file contains functions to interact with the database:
- Users
- Media (including YOLO predictions)

"""

from sqlalchemy.orm import Session
from datetime import datetime
from . import models
import uuid
import random


# ---------------- Users ----------------
def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_id: str, email: str, name: str = None):
    db_user = models.User(id=user_id, email=email, name=name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ---------------- Media ----------------
def create_media(
    db: Session,
    user_id: str,
    file_url: str,
    file_type: str,
    folder_path: str = None,
    latitude: float = None,
    longitude: float = None,
):
    media_id = str(uuid.uuid4())
    # If coordinates not provided, generate a dummy coordinate in Serengeti for demo
    if latitude is None or longitude is None:
        lat, lon = _generate_serengeti_coord()
        latitude = latitude if latitude is not None else lat
        longitude = longitude if longitude is not None else lon
    db_media = models.Media(
        id=media_id,
        user_id=user_id,
        file_url=file_url,
        file_type=file_type,
        folder_path=folder_path,
        latitude=latitude,
        longitude=longitude,
        is_processed=False,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


def create_media_batch(db: Session, user_id: str, files: list):
    """
    files: list of dicts with keys ['file_url', 'file_type', 'folder_path', 'latitude', 'longitude']
    Inserts all media records in a single DB transaction.
    """
    media_objects = []
    for f in files:
        media_id = str(uuid.uuid4())
        # Fill missing latitude/longitude with dummy Serengeti coords for demo
        lat = f.get("latitude")
        lon = f.get("longitude")
        if lat is None or lon is None:
            gen_lat, gen_lon = _generate_serengeti_coord()
            lat = lat if lat is not None else gen_lat
            lon = lon if lon is not None else gen_lon

        media = models.Media(
            id=media_id,
            user_id=user_id,
            file_url=f.get("file_url"),
            file_type=f.get("file_type"),
            folder_path=f.get("folder_path"),  # NEW: Store folder path
            latitude=lat,
            longitude=lon,
            is_processed=False,
        )
        media_objects.append(media)

    db.add_all(media_objects)
    db.commit()
    for media in media_objects:
        db.refresh(media)

    return media_objects


def get_all_media(db: Session):
    """Return all media records (useful for heatmap endpoints)."""
    return db.query(models.Media).all()


def _generate_serengeti_coord() -> tuple:
    """Generate a random coordinate within a rough bounding box of the Serengeti for demo purposes.

    Bounding box approx: lat between -2.7 and -1.0, lon between 34.5 and 35.7
    Returns (lat, lon)
    """
    lat = random.uniform(-2.7, -1.0)
    lon = random.uniform(34.5, 35.7)
    return (round(lat, 6), round(lon, 6))


def get_media_by_user(db: Session, user_id: str):
    return db.query(models.Media).filter(models.Media.user_id == user_id).all()


def get_media_by_id(db: Session, media_id: str):
    return db.query(models.Media).filter(models.Media.id == media_id).first()


def update_media_predictions(
    db: Session,
    media_id: str,
    classification: str,
    confidence: float,
    species: str = None,
    predictions: dict = None
):
    """
    Update a media record with YOLO predictions + metadata.
    """
    import json
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if media:
        media.classification = classification
        media.confidence = confidence
        media.species = species
        media.predictions = json.dumps(predictions) if predictions else None
        media.is_processed = True
        db.commit()
        db.refresh(media)
    return media


def get_predictions_by_media(db: Session, media_id: str):
    """
    Fetch YOLO predictions + metadata for a given media_id.
    """
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        return None
    
    import json
    
    # Parse predictions if it's a string
    predictions_data = media.predictions
    if isinstance(predictions_data, str):
        try:
            predictions_data = json.loads(predictions_data)
        except:
            predictions_data = None
    
    return {
        "media_id": media.id,
        "classification": media.classification,
        "confidence": media.confidence,
        "species": media.species,
        "predictions": predictions_data
    }

