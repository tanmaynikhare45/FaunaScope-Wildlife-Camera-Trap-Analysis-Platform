import ExifParser from 'exif-parser';

/**
 * Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
 * @param {Array} dms - Array of [degrees, minutes, seconds] in rational format [[n,d],[n,d],[n,d]]
 * @param {string} ref - Reference direction (N, S, E, W)
 * @returns {number|null}
 */
function dmsToDecimal(dms, ref) {
  if (!dms || dms.length < 3) return null;

  const degrees = dms[0][0] / dms[0][1];
  const minutes = dms[1][0] / dms[1][1];
  const seconds = dms[2][0] / dms[2][1];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Try extracting GPS via exif-parser (ArrayBuffer-based, more robust)
 */
async function tryExifParser(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const parser = ExifParser.create(buffer);
        parser.enableSimpleValues(true);
        const result = parser.parse();
        const tags = result.tags || {};

        console.log(`[exif-parser] Tags for ${file.name}:`, Object.keys(tags));

        const lat = tags.GPSLatitude;
        const lon = tags.GPSLongitude;

        if (lat !== undefined && lat !== null && lon !== undefined && lon !== null) {
          console.log(`[exif-parser] ✅ GPS found: lat=${lat}, lon=${lon}`);
          resolve({
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
          });
        } else {
          console.log(`[exif-parser] ❌ No GPS tags in ${file.name}`);
          resolve(null);
        }
      } catch (err) {
        console.log(`[exif-parser] ❌ Parse error for ${file.name}:`, err.message);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Try extracting GPS via piexifjs (binary string-based)
 */
async function tryPiexif(file) {
  return new Promise((resolve) => {
    // Dynamically import to avoid hard failure if piexifjs has issues
    import('piexifjs').then((mod) => {
      const piexif = mod.default || mod;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const binary = e.target.result;
          const exif = piexif.load(binary);

          console.log(`[piexifjs] EXIF sections for ${file.name}:`, Object.keys(exif));

          if (!exif.GPS || Object.keys(exif.GPS).length === 0) {
            console.log(`[piexifjs] ❌ No GPS section in ${file.name}`);
            resolve(null);
            return;
          }

          const gps = exif.GPS;
          // Tags: 2=GPSLatitude, 3=GPSLatitudeRef, 4=GPSLongitude, 5=GPSLongitudeRef
          if (!gps[2] || !gps[3] || !gps[4] || !gps[5]) {
            console.log(`[piexifjs] ❌ Incomplete GPS tags in ${file.name}`);
            resolve(null);
            return;
          }

          const lat = dmsToDecimal(gps[2], gps[3]);
          const lon = dmsToDecimal(gps[4], gps[5]);

          if (lat === null || lon === null) {
            resolve(null);
            return;
          }

          console.log(`[piexifjs] ✅ GPS found: lat=${lat}, lon=${lon}`);
          resolve({
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
          });
        } catch (err) {
          console.log(`[piexifjs] ❌ Parse error for ${file.name}:`, err.message);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsBinaryString(file);
    }).catch(() => resolve(null));
  });
}

/**
 * Extract EXIF GPS coordinates from an image file.
 * Tries exif-parser first (more robust), then piexifjs as fallback.
 *
 * @param {File} file
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function extractExifCoordinates(file) {
  console.log(`🔍 Extracting GPS from: ${file.name} (${file.size} bytes, ${file.type})`);

  // Try exif-parser first
  const result1 = await tryExifParser(file);
  if (result1) return result1;

  // Fallback to piexifjs
  const result2 = await tryPiexif(file);
  if (result2) return result2;

  console.warn(`⚠️  No GPS EXIF data found in ${file.name}`);
  return null;
}

/**
 * Extract GPS coordinates from multiple files.
 *
 * @param {File[]} files
 * @returns {Promise<Array<{file, latitude, longitude, hasGPS}>>}
 */
export async function extractMultipleExifCoordinates(files) {
  const results = [];

  for (const file of files) {
    try {
      const coords = await extractExifCoordinates(file);
      results.push({
        file,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        hasGPS: coords !== null,
      });

      if (coords) {
        console.log(`✅ GPS from ${file.name}: lat=${coords.latitude}, lon=${coords.longitude}`);
      } else {
        console.warn(`⚠️  No GPS in ${file.name}`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${file.name}:`, err);
      results.push({ file, latitude: null, longitude: null, hasGPS: false });
    }
  }

  console.log('📊 EXIF Summary:', {
    total: results.length,
    withGPS: results.filter((r) => r.hasGPS).length,
    withoutGPS: results.filter((r) => !r.hasGPS).length,
  });

  return results;
}
