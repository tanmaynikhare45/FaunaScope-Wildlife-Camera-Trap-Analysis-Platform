#!/usr/bin/env python3
"""
Test script to verify GPS EXIF extraction is working correctly
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from utils.utils import extract_gps_coordinates
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import json

def check_image_exif(image_path):
    """Check if image has EXIF data and GPS info"""
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        
        if not exif_data:
            print(f"❌ No EXIF data found in {image_path}")
            return False
        
        print(f"✅ EXIF data found in {image_path}")
        print(f"   Total EXIF tags: {len(exif_data)}")
        
        # Check for GPS info (tag 34853)
        has_gps = False
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            if tag_id == 34853:  # GPSInfo tag
                has_gps = True
                print(f"   ✅ GPS info found (Tag 34853)")
                if isinstance(value, dict):
                    print(f"      GPS sub-tags: {len(value)}")
                    for gps_tag_id, gps_value in value.items():
                        gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        print(f"        - {gps_tag_name}: {gps_value}")
        
        if not has_gps:
            print(f"   ❌ No GPS data found in EXIF (no tag 34853)")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking EXIF: {e}")
        return False


def test_extraction(image_path):
    """Test GPS extraction"""
    print(f"\n🔍 Testing GPS extraction on: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return False
    
    # Check EXIF data first
    print("\n📋 Checking EXIF data...")
    has_exif = check_image_exif(image_path)
    
    if not has_exif:
        print("\n⚠️  Image has no GPS EXIF data. Need a GPS-enabled image!")
        print("\nTo test with a GPS-enabled image, use one that was:")
        print("  - Taken with a smartphone's built-in GPS")
        print("  - Taken with a camera with GPS module")
        print("  - Has GPS metadata in EXIF")
        return False
    
    # Try extraction
    print("\n🔧 Attempting GPS extraction...")
    result = extract_gps_coordinates(image_path)
    
    if result:
        print(f"\n✅ SUCCESS! GPS coordinates extracted:")
        print(f"   Latitude:  {result['latitude']:.6f}")
        print(f"   Longitude: {result['longitude']:.6f}")
        return True
    else:
        print(f"\n❌ Extraction returned None")
        return False


def list_test_images():
    """Find potential test images in the project"""
    print("\n📁 Looking for image files...")
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    found_images = []
    
    # Check common directories
    search_dirs = [
        os.path.dirname(__file__),
        os.path.join(os.path.dirname(__file__), '..', 'uploads'),
        os.path.join(os.path.dirname(__file__), '..', 'ml'),
    ]
    
    for search_dir in search_dirs:
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                for file in files:
                    if os.path.splitext(file)[1].lower() in image_extensions:
                        full_path = os.path.join(root, file)
                        found_images.append(full_path)
    
    if found_images:
        print(f"\n📸 Found {len(found_images)} image file(s):")
        for img in found_images[:10]:  # Show first 10
            print(f"   - {img}")
        return found_images
    else:
        print("   No images found in common directories")
        return []


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 EXIF GPS Extraction Test Suite")
    print("=" * 60)
    
    # List available images
    images = list_test_images()
    
    if len(sys.argv) > 1:
        # Test specific image provided as argument
        test_image = sys.argv[1]
        test_extraction(test_image)
    elif images:
        # Test first image found
        print(f"\n🚀 Testing with first image found: {images[0]}\n")
        test_extraction(images[0])
    else:
        print("\n⚠️  No images to test")
        print("\nUsage: python test_exif_extraction.py [image_path]")
        print("\nExample: python test_exif_extraction.py /path/to/gps_photo.jpg")
        
        print("\n📝 To test GPS extraction:")
        print("1. Get an image with GPS metadata (from phone camera, etc.)")
        print("2. Run: python test_exif_extraction.py <image_path>")
        print("\nThe backend will automatically extract GPS from uploaded images!")
