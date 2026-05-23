"""
This module contains utility functions for user authentication and authorization using Clerk SDK.
This is a helper module with functions used to authenticate frontend requests to the backend.

"""

from clerk_backend_api import Clerk,AuthenticateRequestOptions
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from fastapi import HTTPException
import os
from dotenv import load_dotenv
from collections import namedtuple
import uuid
from typing import Optional, Dict, Tuple


UserObj = namedtuple("UserObj", ["id"])

load_dotenv() # Load environment variables from .env file(it looks for .env file in the root directory by default)
clerk_sdk=Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY")) #This is my secret key


def authenticate_and_get_user(request):
    # TEMPORARY BYPASS FOR TESTING - REMOVE IN PRODUCTION
    print("DEBUG: Authentication bypassed for testing")
    return UserObj(id="test_user_123")
    
    # Original authentication code (commented out for testing)
    """
    try:
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:5173","http://localhost:5174"],
                jwt_key=os.getenv("JWT_SECRET_KEY")
            )
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid Token")

        # Clerk returns an identifier in the "sub" claim. We must not coerce it to a
        # python uuid.UUID because Clerk ids are not guaranteed to be valid UUIDs.
        # Keep the id as the original string so it matches the database (models.User.id is String).
        user_id_str = request_state.payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return UserObj(id=user_id_str)

    except HTTPException:
        # Re-raise HTTPExceptions (like 401) as-is
        raise
    except Exception as e:
        # Treat unexpected errors during auth as unauthorized rather than server error to avoid leaking
        # internal exception messages to clients.
        raise HTTPException(status_code=401, detail=f"Unauthorized/Invalid Credentials: {str(e)}")
    """


# ==================== EXIF GPS COORDINATE EXTRACTION ====================

def convert_to_degrees(value: tuple) -> float:
    """
    Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) format to decimal degrees.
    
    Args:
        value: Tuple of (degrees, minutes, seconds) where each is a (numerator, denominator) tuple
        
    Returns:
        Decimal degree value
    """
    d, m, s = value
    degrees = d[0] / d[1] if d[1] != 0 else 0
    minutes = m[0] / m[1] if m[1] != 0 else 0
    seconds = s[0] / s[1] if s[1] != 0 else 0
    return degrees + (minutes / 60.0) + (seconds / 3600.0)


def extract_gps_coordinates(image_path: str) -> Optional[Dict[str, float]]:
    """
    Extract GPS coordinates (latitude, longitude) from image EXIF metadata using Pillow.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary with 'latitude' and 'longitude' keys, or None if no GPS data found
        Example: {'latitude': 40.7128, 'longitude': -74.0060}
    """
    try:
        image = Image.open(image_path)
        
        # Try to get EXIF data using proper Pillow method
        exif_data = None
        try:
            # Try the modern approach first (Pillow 8.2+)
            exif = image.getexif()
            if exif:
                exif_data = dict(exif)
        except:
            # Fallback to private method for older versions
            try:
                exif_data = image._getexif()
            except:
                pass
        
        if not exif_data:
            print(f"⚠️ No EXIF data found in {image_path}")
            return None
        
        print(f"✅ Found EXIF data with {len(exif_data)} tags")
        
        gps_info = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            
            # Tag 34853 is GPSInfo - this contains all GPS data
            if tag_id == 34853:
                print(f"✅ Found GPS Info tag (34853)")
                if isinstance(value, dict):
                    for gps_tag_id, gps_value in value.items():
                        gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag_name] = gps_value
                        print(f"   {gps_tag_name}: {gps_value}")
        
        if not gps_info:
            print(f"⚠️ No GPS information found in EXIF data (no tag 34853)")
            # List available tags for debugging
            print(f"Available EXIF tags: {[TAGS.get(tid, tid) for tid in exif_data.keys()]}")
            return None
        
        print(f"✅ GPS info extracted: {list(gps_info.keys())}")
        
        # Extract latitude and longitude
        lat = None
        lon = None
        lat_ref = gps_info.get('GPSLatitudeRef', 'N')  # N/S
        lon_ref = gps_info.get('GPSLongitudeRef', 'E')  # E/W
        
        if 'GPSLatitude' in gps_info:
            lat = convert_to_degrees(gps_info['GPSLatitude'])
            if lat_ref == 'S':
                lat = -lat
            print(f"   Latitude: {lat} (Ref: {lat_ref})")
        
        if 'GPSLongitude' in gps_info:
            lon = convert_to_degrees(gps_info['GPSLongitude'])
            if lon_ref == 'W':
                lon = -lon
            print(f"   Longitude: {lon} (Ref: {lon_ref})")
        
        if lat is None or lon is None:
            print(f"⚠️ GPS coordinates not found or incomplete")
            print(f"   Available GPS info: {list(gps_info.keys())}")
            return None
        
        print(f"✅ GPS Coordinates extracted - Lat: {lat:.6f}, Lon: {lon:.6f}")
        return {'latitude': lat, 'longitude': lon}
    
    except Exception as e:
        print(f"❌ Error extracting GPS coordinates: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def extract_gps_coordinates_batch(image_paths: list) -> Dict[str, Optional[Dict[str, float]]]:
    """
    Extract GPS coordinates from multiple image files.
    
    Args:
        image_paths: List of paths to image files
        
    Returns:
        Dictionary mapping file paths to their GPS coordinates or None
    """
    results = {}
    for image_path in image_paths:
        results[image_path] = extract_gps_coordinates(image_path)
    return results


def get_location_from_coordinates(latitude: float, longitude: float) -> Optional[str]:
    """
    Convert GPS coordinates to location name using reverse geocoding.
    Requires geopy library: pip install geopy
    
    Args:
        latitude: Latitude value (decimal degrees)
        longitude: Longitude value (decimal degrees)
        
    Returns:
        Location address string or None if geocoding fails
    """
    try:
        from geopy.geocoders import Nominatim
        geocoder = Nominatim(user_agent="trapsense_app")
        location = geocoder.reverse(f"{latitude}, {longitude}")
        return location.address
    except ImportError:
        print("⚠️ geopy not installed. Install with: pip install geopy")
        return None
    except Exception as e:
        print(f"❌ Reverse geocoding failed: {str(e)}")
        return None

