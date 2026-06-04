from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import logging
from fastapi.responses import StreamingResponse
import io
import csv
import zipfile
import requests  # For downloading images from S3

# Local imports
from ..database.db import (
    get_user_by_id,
    create_user,
    create_media,
    get_media_by_user,
    get_media_by_id,
    create_media_batch,
    update_media_predictions,
    get_predictions_by_media,
    get_all_media,
)
from ..database.models import get_db
from ..utils.utils import authenticate_and_get_user
from ..services.s3 import generate_presigned_put_url, get_object_url
from ..services.worker import media_processor

router = APIRouter()
logger = logging.getLogger(__name__)

# ------------------ Pydantic Schemas ------------------

# User
class UserCreate(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    class Config:
        from_attributes = True

# Media
class MediaCreate(BaseModel):
    file_url: str
    folder_path: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MediaResponse(BaseModel):
    id: str
    user_id: str
    file_url: str
    file_type: str
    folder_path: Optional[str] = None
    latitude: Optional[float]
    longitude: Optional[float]
    uploaded_at: datetime
    classification: Optional[str] = None
    confidence: Optional[float] = None
    species: Optional[str] = None
    class Config:
        from_attributes = True
class BatchPresignFile(BaseModel):
    file_name: str
    folder_path: Optional[str] = None

class BatchPresignRequest(BaseModel):
    file_names: List[str]

class PresignedFile(BaseModel):
    upload_url: str
    file_url: str

class BatchPresignResponse(BaseModel):
    files: List[PresignedFile]

# Prediction
class PredictionUpdate(BaseModel):
    classification: str
    confidence: float
    species: Optional[str] = None
    predictions: Optional[dict] = None



# ------------------ Background Tasks ------------------

def process_media_background(media_id: str):
    """Background task to process media through ML pipeline"""
    try:
        # Create a new DB session for background task
        from ..database.models import SessionLocal
        db = SessionLocal()
        try:
            logger.info(f"Starting background processing for media {media_id}")
            result = media_processor.process_media(media_id, db)
            logger.info(f"Background processing complete for {media_id}: {result}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Background processing failed for {media_id}: {e}", exc_info=True)

# ------------------ User Routes ------------------

@router.post("/users", response_model=UserResponse)
def create_new_user(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    existing_user = get_user_by_id(db, clerk_user.id)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = create_user(
        db=db,
        user_id=clerk_user.id,
        email=user_data.email,
        name=user_data.name
    )
    return new_user

@router.get("/users/me", response_model=UserResponse)
def get_current_user(request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    db_user = get_user_by_id(db, clerk_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# ------------------ Media Routes ------------------

@router.post("/media", response_model=MediaResponse)
def create_media_record(
    media_data: MediaCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    clerk_user = authenticate_and_get_user(request)
    new_media = create_media(
        db=db,
        user_id=clerk_user.id,
        file_url=media_data.file_url,
        file_type="image",
        latitude=media_data.latitude,
        longitude=media_data.longitude,
    )
    
    # Trigger ML processing in background
    background_tasks.add_task(process_media_background, new_media.id)
    logger.info(f"Queued background processing for media {new_media.id}")
    
    return new_media

@router.get("/media", response_model=List[MediaResponse])
def get_user_media(request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    return get_media_by_user(db, clerk_user.id)

@router.get("/media/heatmap")
def get_media_heatmap(request: Request, db: Session = Depends(get_db)):
    """Return a list of media records with lat/lon for frontend heatmap."""
    clerk_user = authenticate_and_get_user(request)
    media_list = get_media_by_user(db, clerk_user.id)
    points = []
    for m in media_list:
        if m.latitude is not None and m.longitude is not None:
            points.append({
                "id": m.id,
                "lat": m.latitude,
                "lon": m.longitude,
                "file_url": m.file_url,
                "uploaded_at": m.uploaded_at.isoformat() if m.uploaded_at else None
            })
    return {"points": points}

@router.get("/media/{media_id}", response_model=MediaResponse)
def get_specific_media(media_id: str, request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    media = get_media_by_id(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return media

@router.get("/media/presign")
def get_presigned_url(file_name: str, request: Request):
    clerk_user = authenticate_and_get_user(request)
    object_key = f"{clerk_user.id}_{uuid.uuid4()}_{file_name}"
    upload_url = generate_presigned_put_url(object_key, expiration=3600, content_type="image/jpeg")
    file_url = get_object_url(object_key)
    return {"upload_url": upload_url, "file_url": file_url}

@router.post("/media/presign-batch", response_model=BatchPresignResponse)
def get_batch_presigned_urls(batch_request: BatchPresignRequest, request: Request):
    clerk_user = authenticate_and_get_user(request)
    result_files = []
    
    for file_name in batch_request.file_names:
        # Keep the folder structure in the S3 key
        # file_name could be "folder1/folder2/image.jpg"
        object_key = f"{clerk_user.id}/{file_name}"
        
        # Determine content type from file extension
        content_type = "image/jpeg"  # default
        if file_name.lower().endswith('.png'):
            content_type = "image/png"
        elif file_name.lower().endswith('.jpg') or file_name.lower().endswith('.jpeg'):
            content_type = "image/jpeg"
        elif file_name.lower().endswith('.webp'):
            content_type = "image/webp"
        elif file_name.lower().endswith('.gif'):
            content_type = "image/gif"
        
        upload_url = generate_presigned_put_url(object_key, expiration=3600, content_type=content_type)
        file_url = get_object_url(object_key)
        
        result_files.append({
            "upload_url": upload_url,
            "file_url": file_url,
            "folder_path": file_name  # Return the folder path for frontend tracking
        })
    
    return {"files": result_files}

@router.post("/media/batch", response_model=List[MediaResponse])
def create_media_batch_records(
    payload: dict,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    clerk_user = authenticate_and_get_user(request)
    files = payload.get("files", [])
    for f in files:
        f["file_type"] = "image"
    
    created_media = create_media_batch(db, clerk_user.id, files)
    
    # Trigger ML processing for each uploaded file in background
    for media in created_media:
        background_tasks.add_task(process_media_background, media.id)
        logger.info(f"Queued background processing for media {media.id}")
    
    return created_media


# Heatmap endpoint - return media coordinates (public for demo)
   

# ------------------ Prediction Routes ------------------

@router.put("/predictions/{media_id}", response_model=MediaResponse)
def update_prediction(
    media_id: str,
    update: PredictionUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Manual update of predictions (for testing or corrections)"""
    clerk_user = authenticate_and_get_user(request)
    media = get_media_by_id(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    updated = update_media_predictions(
        db,
        media_id=media_id,
        classification=update.classification,
        confidence=update.confidence,
        species=update.species,
        predictions=update.predictions
    )
    return updated

@router.get("/predictions/{media_id}")
def get_predictions(media_id: str, request: Request, db: Session = Depends(get_db)):
    """Get predictions for a specific media item"""
    clerk_user = authenticate_and_get_user(request)
    media = get_media_by_id(db, media_id)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if processing is complete
    if not media.is_processed:
        raise HTTPException(status_code=404, detail="Predictions not ready yet")

    # Return predictions directly from media object
    import json
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
    

@router.post("/predictions/process/{media_id}")
def trigger_processing(
    media_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    """Manually trigger ML processing for a media item (useful for reprocessing)"""
    clerk_user = authenticate_and_get_user(request)
    media = get_media_by_id(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    background_tasks.add_task(process_media_background, media_id)
    logger.info(f"Manually triggered processing for media {media_id}")
    
    return {"message": "Processing triggered", "media_id": media_id}


# Add these endpoints to your routes.py (after the existing prediction routes)

# ------------------ Export Routes ------------------
@router.get("/media/non-blank")
def get_non_blank_media(request: Request, db: Session = Depends(get_db)):
    """Get all non-blank media for the current user"""
    clerk_user = authenticate_and_get_user(request)
    
    from ..database import models
    # Query only non-blank, processed media
    media = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.is_processed == True,
        models.Media.classification == "non-blank"
    ).order_by(models.Media.uploaded_at.desc()).all()
    
    return media

@router.get("/media/export/csv")
def export_non_blank_csv(request: Request, db: Session = Depends(get_db)):
    """Export non-blank media metadata as CSV"""
    clerk_user = authenticate_and_get_user(request)
    
    from ..database import models
    import json
    
    # Get non-blank media
    media = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.is_processed == True,
        models.Media.classification == "non-blank"
    ).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Media ID",
        "Filename",
        "Species",
        "Confidence",
        "Detection Count",
        "File URL",
        "Folder Path",
        "Uploaded At",
        "Latitude",
        "Longitude"
    ])
    
    # Write data
    for m in media:
        predictions = json.loads(m.predictions) if m.predictions else []
        detection_count = len(predictions) if isinstance(predictions, list) else 0
        
        filename = m.file_url.split('/')[-1]
        
        writer.writerow([
            m.id,
            filename,
            m.species or "",
            f"{m.confidence * 100:.2f}%" if m.confidence else "",
            detection_count,
            m.file_url,
            m.folder_path or "",
            m.uploaded_at.isoformat(),
            m.latitude or "",
            m.longitude or ""
        ])
    
    # Return as downloadable CSV
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=non_blank_images_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

@router.get("/media/export/summary")
def get_export_summary(request: Request, db: Session = Depends(get_db)):
    """Get summary statistics for export"""
    clerk_user = authenticate_and_get_user(request)
    
    from ..database import models
    
    total_media = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id
    ).count()
    
    non_blank = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.classification == "non-blank"
    ).count()
    
    blank = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.classification == "blank"
    ).count()
    
    processing = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.is_processed == False
    ).count()
    
    # Get unique species
    species_list = db.query(models.Media.species).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.species != None
    ).distinct().all()
    
    unique_species = set()
    for (s,) in species_list:
        if s:
            unique_species.update(s.split(','))
    
    return {
        "total_images": total_media,
        "non_blank": non_blank,
        "blank": blank,
        "processing": processing,
        "unique_species": sorted(list(unique_species)),
        "species_count": len(unique_species)
    }

# ------------------ Folder Routes ------------------

@router.get("/media/folder/{folder_path:path}")
def get_media_by_folder(
    folder_path: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all media from a specific folder path"""
    clerk_user = authenticate_and_get_user(request)
    
    from ..database import models
    
    # Query media with file_url containing the folder path
    media = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.file_url.like(f"%{folder_path}%")
    ).order_by(models.Media.uploaded_at.desc()).all()
    
    return media

@router.get("/media/folders")
def list_user_folders(request: Request, db: Session = Depends(get_db)):
    """List all unique folder paths for the user"""
    clerk_user = authenticate_and_get_user(request)
    
    from ..database import models
    
    # Get all media for the user
    all_media = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id
    ).all()
    
    # Extract unique folder paths
    folders = set()
    for media in all_media:
        if media.folder_path:
            # Get parent folders
            parts = media.folder_path.split('/')
            for i in range(1, len(parts) + 1):
                folder = '/'.join(parts[:i])
                if folder:
                    folders.add(folder)
    
    return {
        "folders": sorted(list(folders)),
        "total_count": len(folders)
    }
    

@router.get("/media/export/zip")
def export_non_blank_zip(request: Request, db: Session = Depends(get_db)):
    """
    Export all non-blank images for the current user as a ZIP.
    Organizes images by species folder (if available) or preserves folder structure.
    Includes metadata.csv in the ZIP.
    """
    from ..database import models
    clerk_user = authenticate_and_get_user(request)

    # Query all non-blank, processed media
    media_items = db.query(models.Media).filter(
        models.Media.user_id == clerk_user.id,
        models.Media.is_processed == True,
        models.Media.classification == "non-blank"
    ).all()

    if not media_items:
        return {"detail": "No non-blank media found"}

    # Create in-memory ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        # Prepare metadata.csv
        metadata_io = io.StringIO()
        writer = csv.writer(metadata_io)
        writer.writerow([
            "Media ID", "Filename", "Species", "Confidence",
            "Detection Count", "File URL", "Folder Path", "Uploaded At",
            "Latitude", "Longitude"
        ])

        for media in media_items:
            # Write metadata
            predictions = []
            if media.predictions:
                import json
                try:
                    predictions = json.loads(media.predictions)
                except:
                    predictions = []
            detection_count = len(predictions) if isinstance(predictions, list) else 0

            filename = media.file_url.split("/")[-1]

            writer.writerow([
                media.id,
                filename,
                media.species or "",
                f"{media.confidence*100:.2f}%" if media.confidence else "",
                detection_count,
                media.file_url,
                media.folder_path or "",
                media.uploaded_at.isoformat(),
                media.latitude or "",
                media.longitude or ""
            ])

            # Determine folder inside ZIP
            if media.species:
                # If multiple species, pick first as folder
                species_folder = media.species.split(",")[0].strip()
                zip_path = f"{species_folder}/{filename}"
            elif media.folder_path:
                zip_path = f"{media.folder_path}/{filename}"
            else:
                zip_path = filename

            # Download file from S3
            try:
                response = requests.get(media.file_url)
                response.raise_for_status()
                zip_file.writestr(zip_path, response.content)
            except Exception as e:
                print(f"Failed to download {media.file_url}: {e}")

        # Add metadata.csv
        zip_file.writestr("metadata.csv", metadata_io.getvalue())

    zip_buffer.seek(0)
    filename_zip = f"non_blank_images_{datetime.now().strftime('%Y%m%d')}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename_zip}"}
    )