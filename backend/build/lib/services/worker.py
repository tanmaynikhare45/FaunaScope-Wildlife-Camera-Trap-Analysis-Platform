"""
worker.py

Background worker for processing uploaded media through ML pipeline
"""

import logging
import requests
from typing import Dict
from sqlalchemy.orm import Session

from .ml import ml_service
from .s3 import download_file_from_s3_url
from ..database.db import update_media_predictions, get_media_by_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MediaProcessor:
    """Handles processing of uploaded media through ML pipeline"""
    
    def __init__(self):
        if ml_service is None:
            raise RuntimeError("ML Service not initialized. Check model paths.")
        self.ml_service = ml_service
    
    def download_image(self, file_url: str) -> bytes:
        """
        Download image from URL (S3 or direct URL)
        
        Args:
            file_url: URL of the image to download
            
        Returns:
            Image bytes
        """
        try:
            logger.info(f"Downloading image from: {file_url}")
            try:
                image_bytes = download_file_from_s3_url(file_url)
                logger.info(f"Downloaded {len(image_bytes)} bytes from S3")
                return image_bytes
            except ValueError:
                logger.info("URL does not belong to configured bucket, falling back to HTTP download")

            response = requests.get(file_url, timeout=30)
            response.raise_for_status()
            logger.info(f"Downloaded {len(response.content)} bytes via HTTP")
            return response.content
        except Exception as e:
            logger.error(f"Failed to download image from {file_url}: {e}")
            raise
    
    def process_media(self, media_id: str, db: Session) -> Dict:
        """
        Process a single media item through ML pipeline and update DB
        
        Args:
            media_id: ID of media to process
            db: Database session
            
        Returns:
            Processing result dictionary
        """
        try:
            # 1. Get media record from database
            media = get_media_by_id(db, media_id)
            if not media:
                raise ValueError(f"Media {media_id} not found in database")
            
            logger.info(f"Processing media {media_id}: {media.file_url}")
            
            # 2. Download image from S3/URL using configured credentials when possible
            image_bytes = self.download_image(media.file_url)
            
            # 3. Run ML pipeline (classification + detection)
            ml_result = self.ml_service.process_media(image_bytes)
            
            logger.info(f"ML processing complete for {media_id}: {ml_result['classification']}")
            
            # 4. Update database with predictions
            # Note: ml_result already has species as comma-separated string
            updated_media = update_media_predictions(
                db,
                media_id=media_id,
                classification=ml_result["classification"],
                confidence=ml_result["confidence"],
                species=ml_result["species"],  # Already a comma-separated string or None
                predictions=ml_result["predictions"]
            )
            
            logger.info(f"Database updated for {media_id}")
            
            return {
                "success": True,
                "media_id": media_id,
                "classification": ml_result["classification"],
                "confidence": ml_result["confidence"],
                "species": ml_result["species"],
                "detection_count": len(ml_result["predictions"]) if ml_result["predictions"] else 0
            }
            
        except Exception as e:
            logger.error(f"Error processing media {media_id}: {e}", exc_info=True)
            
            # Update media with error status
            try:
                update_media_predictions(
                    db,
                    media_id=media_id,
                    classification="error",
                    confidence=0.0,
                    species=None,
                    predictions={"error": str(e)}
                )
            except Exception as update_error:
                logger.error(f"Failed to update error status: {update_error}")
            
            return {
                "success": False,
                "media_id": media_id,
                "error": str(e)
            }


# Global processor instance
try:
    media_processor = MediaProcessor()
    logger.info("MediaProcessor initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize MediaProcessor: {e}")
    media_processor = None