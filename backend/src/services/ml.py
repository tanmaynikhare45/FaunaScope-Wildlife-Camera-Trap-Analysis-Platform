import torch
import torchvision.transforms as transforms
from PIL import Image
import io
import logging
from pathlib import Path
import numpy as np
from typing import Tuple, Dict, List, Optional
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the absolute path to the ml/classifier and ml/detection directories
ML_DIR = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))) / 'ml'
CLASSIFIER_PATH = ML_DIR / 'classifier' / 'best_classification_model.pt'
DETECTOR_PATH = ML_DIR / 'detection' / 'yolov8n_detection_model.pt'

# Validate paths exist
if not CLASSIFIER_PATH.exists():
    raise FileNotFoundError(f"Classifier model not found at {CLASSIFIER_PATH}")
if not DETECTOR_PATH.exists():
    raise FileNotFoundError(f"Detector model not found at {DETECTOR_PATH}")

logger.info(f"Using ML models from directory: {ML_DIR}")

class MLService:
    def __init__(self):
        self.classifier = None
        self.detector = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load models
        self._load_models()

    def _load_models(self):
        """Load both classification and detection models."""
        # 1. Load Classifier
        try:
            logger.info(f"Loading classifier from {CLASSIFIER_PATH}")
            if not os.path.exists(CLASSIFIER_PATH):
                raise FileNotFoundError(
                    f"Classifier model not found at {CLASSIFIER_PATH}. "
                    f"Please ensure the model file is in the correct location: {ML_DIR}/classifier/"
                )
            
            try:
                from ultralytics import YOLO
                self.classifier = YOLO(str(CLASSIFIER_PATH))
                self.classifier.to(self.device)
                
            except ImportError:
                raise ImportError("Failed to import UltraLytics. Please install: pip install ultralytics")
            except Exception as e:
                raise RuntimeError(f"Error loading classifier model: {str(e)}. "
                                f"Make sure it's a valid UltraLytics classification model.")
            
            logger.info("Successfully loaded classifier model")
            
        except Exception as e:
            logger.error(f"Error loading classifier: {str(e)}")
            raise

        # 2. Load Detector
        try:
            logger.info(f"Loading YOLOv8 detector from {DETECTOR_PATH}")
            if not os.path.exists(DETECTOR_PATH):
                raise FileNotFoundError(
                    f"YOLOv8 model not found at {DETECTOR_PATH}. "
                    f"Please ensure the model file is in the correct location: {ML_DIR}/detection/"
                )
            
            try:
                from ultralytics import YOLO
                self.detector = YOLO(str(DETECTOR_PATH))
                self.detector.to(self.device)
            except ImportError:
                raise ImportError("Failed to import YOLO. Please install ultralytics: pip install ultralytics")
            except Exception as e:
                raise RuntimeError(f"Error loading YOLOv8 model: {str(e)}. "
                                f"Make sure it's a valid YOLOv8 model file.")
            
            logger.info("Successfully loaded YOLOv8 detector model")
            
        except Exception as e:
            logger.error(f"Error loading detector: {str(e)}")
            raise

    def preprocess_image(self, image_bytes: bytes) -> torch.Tensor:
        """Convert image bytes to tensor."""
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        return self.transform(image).unsqueeze(0).to(self.device)

    def classify_image(self, image_bytes: bytes) -> Tuple[str, float]:
        """Classify image as blank/non-blank."""
        if self.classifier is None:
            raise RuntimeError("Classifier model not loaded")

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            
            # Run UltraLytics prediction
            results = self.classifier.predict(image, verbose=False)
            
            # Get prediction (assuming model was trained with classes=['blank', 'non-blank'])
            pred_idx = results[0].probs.top1
            confidence = results[0].probs.top1conf.item()
            
            # Map prediction index to label
            result = "blank" if pred_idx == 0 else "non-blank"
            
            logger.info(f"Classification: {result} (confidence: {confidence:.4f})")
            return result, confidence
            
        except Exception as e:
            logger.error(f"Error during classification: {str(e)}")
            raise

    def detect_objects(self, image_bytes: bytes) -> List[Dict]:
        """Detect objects in image using YOLOv8."""
        if self.detector is None:
            raise RuntimeError("Detector model not loaded")

        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            
            # Run inference
            results = self.detector(image, verbose=False, conf=0.25)
            
            # Parse results
            detections = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    detection = {
                        'bbox': box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                        'confidence': float(box.conf.item()),
                        'class_id': int(box.cls.item()),
                        'class_name': r.names[int(box.cls.item())]
                    }
                    detections.append(detection)
            
            logger.info(f"Detected {len(detections)} objects")
            return detections
            
        except Exception as e:
            logger.error(f"Error during object detection: {str(e)}")
            raise

    def process_media(self, image_bytes: bytes) -> Dict:
        """
        Process media through the full pipeline: classification -> detection if non-blank.
        Returns data in format compatible with database update.
        """
        try:
            # Step 1: Classification
            classification, confidence = self.classify_image(image_bytes)
            
            result = {
                'classification': classification,
                'confidence': confidence,
                'species': None,
                'predictions': None
            }
            
            # Step 2: If non-blank, run detection
            if classification == "non-blank":
                logger.info("Running object detection on non-blank image...")
                detections = self.detect_objects(image_bytes)
                result['predictions'] = detections
                
                # Extract unique species names
                if detections:
                    unique_species = list(set(d['class_name'] for d in detections))
                    result['species'] = ','.join(unique_species)  # Store as comma-separated string
                    logger.info(f"Found species: {unique_species}")
            else:
                logger.info("Image classified as blank, skipping detection")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in ML pipeline: {str(e)}")
            raise

# Create global instance
try:
    ml_service = MLService()
    logger.info("MLService initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize MLService: {e}")
    ml_service = None