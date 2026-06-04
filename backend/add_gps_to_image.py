#!/usr/bin/env python3
"""
Utility to add GPS EXIF data to an image for testing
Usage: python add_gps_to_image.py <input_image> <latitude> <longitude> <output_image>
Example: python add_gps_to_image.py lion.jpg 40.7128 -74.0060 lion_with_gps.jpg
"""

import sys
import os
from PIL import Image
import piexif

def dms_to_exif(decimal_degrees):
    """Convert decimal degrees to DMS format for EXIF"""
    is_negative = decimal_degrees < 0
    decimal_degrees = abs(decimal_degrees)
    
    degrees = int(decimal_degrees)
    minutes_decimal = (decimal_degrees - degrees) * 60
    minutes = int(minutes_decimal)
    seconds = (minutes_decimal - minutes) * 60
    
    # Convert to EXIF format (rational numbers: (numerator, denominator))
    return (
        (degrees, 1),
        (minutes, 1),
        (int(seconds * 100), 100)  # Keep 2 decimal places
    ), 'S' if is_negative else 'N' if decimal_degrees == abs(decimal_degrees) else 'W'


def add_gps_to_image(input_path, latitude, longitude, output_path):
    """Add GPS coordinates to image EXIF data"""
    try:
        # Open image
        image = Image.open(input_path)
        
        # Get existing EXIF data or create new
        try:
            exif_dict = piexif.load(input_path)
        except:
            # Create empty EXIF dict if none exists
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "Interop": {}}
        
        # Convert decimal degrees to DMS
        lat_dms, lat_ref = dms_to_exif(latitude)
        lon_dms, lon_ref = dms_to_exif(longitude)
        
        # GPS IFD tags
        gps_ifd = {
            piexif.GPSIFD.GPSLatitudeRef: lat_ref.encode('utf-8'),
            piexif.GPSIFD.GPSLatitude: lat_dms,
            piexif.GPSIFD.GPSLongitudeRef: lon_ref.encode('utf-8'),
            piexif.GPSIFD.GPSLongitude: lon_dms,
            piexif.GPSIFD.GPSAltitudeRef: b'\x00',
            piexif.GPSIFD.GPSAltitude: ((0, 1),),
        }
        
        exif_dict["GPS"] = gps_ifd
        exif_bytes = piexif.dump(exif_dict)
        
        # Save image with GPS EXIF
        image.save(output_path, exif=exif_bytes)
        
        print(f"✅ SUCCESS! GPS data added to image")
        print(f"   Input:  {input_path}")
        print(f"   Output: {output_path}")
        print(f"   Latitude:  {latitude:.6f}")
        print(f"   Longitude: {longitude:.6f}")
        print(f"\n💡 You can now upload '{output_path}' to test GPS extraction!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Add GPS EXIF data to an image for testing")
        print("\nUsage: python add_gps_to_image.py <input_image> <latitude> <longitude> <output_image>")
        print("\nExample (New York City): ")
        print("  python add_gps_to_image.py lion.jpg 40.7128 -74.0060 lion_with_gps.jpg")
        print("\nCommon Coordinates for Testing:")
        print("  NYC:        40.7128, -74.0060")
        print("  London:     51.5074, -0.1278")
        print("  Paris:      48.8566, 2.3522")
        print("  Tokyo:      35.6762, 139.6503")
        print("  Sydney:     -33.8688, 151.2093")
        sys.exit(1)
    
    input_image = sys.argv[1]
    latitude = float(sys.argv[2])
    longitude = float(sys.argv[3])
    output_image = sys.argv[4] if len(sys.argv) > 4 else f"gps_{os.path.basename(input_image)}"
    
    if not os.path.exists(input_image):
        print(f"❌ Input image not found: {input_image}")
        sys.exit(1)
    
    add_gps_to_image(input_image, latitude, longitude, output_image)
