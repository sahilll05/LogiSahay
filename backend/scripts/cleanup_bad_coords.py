"""
cleanup_bad_coords.py

Removes rows from pincodes.db where the stored coordinates fall outside
the geographic bounding box for their declared state.
These rows will be resolved by the Nominatim fallback on first request
and written back to the DB automatically.
"""

import sqlite3
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, '..', '..'))
DB_PATH = os.path.join(_PROJECT_ROOT, 'backend', 'pincodes.db')

STATE_BOUNDS = {
    "Andaman & Nicobar Islands": (6.75,  13.70, 92.20, 93.95),
    "Andhra Pradesh":            (12.41, 19.91, 76.76, 84.78),
    "Arunachal Pradesh":         (26.63, 29.46, 91.57, 97.42),
    "Assam":                     (24.11, 27.98, 89.70, 96.02),
    "Bihar":                     (24.28, 27.52, 83.33, 88.30),
    "Chandigarh":                (30.65, 30.79, 76.70, 76.89),
    "Chhattisgarh":              (17.78, 24.06, 80.20, 84.39),
    "Dadra and Nagar Haveli":    (20.07, 20.40, 72.91, 73.10),
    "Daman and Diu":             (20.36, 20.73, 72.62, 72.88),
    "Delhi":                     (28.40, 28.88, 76.84, 77.35),
    "Goa":                       (14.89, 15.79, 73.66, 74.33),
    "Gujarat":                   (20.06, 24.71, 68.16, 74.48),
    "Haryana":                   (27.65, 30.90, 74.46, 77.60),
    "Himachal Pradesh":          (30.38, 33.25, 75.57, 79.00),
    "Jammu and Kashmir":         (32.25, 37.09, 73.74, 80.34),
    "Jharkhand":                 (21.97, 25.32, 83.33, 87.97),
    "Karnataka":                 (11.59, 18.44, 74.05, 78.57),
    "Kerala":                    (8.17,  12.77, 74.85, 77.42),
    "Lakshadweep":               (8.00,  12.00, 71.00, 74.00),
    "Madhya Pradesh":            (21.08, 26.87, 74.03, 82.81),
    "Maharashtra":               (15.60, 22.04, 72.60, 80.90),
    "Manipur":                   (23.83, 25.69, 93.03, 94.78),
    "Meghalaya":                 (25.02, 26.12, 89.80, 92.81),
    "Mizoram":                   (21.94, 24.52, 92.26, 93.47),
    "Nagaland":                  (25.17, 27.02, 93.33, 95.25),
    "Odisha":                    (17.78, 22.55, 81.38, 87.49),
    "Puducherry":                (10.66, 12.02, 79.69, 80.23),
    "Punjab":                    (29.54, 32.49, 73.88, 76.93),
    "Rajasthan":                 (23.06, 30.18, 69.48, 78.26),
    "Sikkim":                    (27.07, 28.13, 88.01, 88.96),
    "Tamil Nadu":                (8.07,  13.55, 76.23, 80.34),
    "Telangana":                 (15.85, 19.92, 77.21, 81.34),
    "Tripura":                   (22.94, 24.54, 91.15, 92.33),
    "Uttar Pradesh":             (23.87, 30.40, 77.10, 84.64),
    "Uttarakhand":               (28.72, 31.45, 77.57, 81.02),
    "West Bengal":               (21.52, 27.23, 85.83, 89.89),
}

def is_bad(lat, lng, state):
    bounds = STATE_BOUNDS.get(state)
    if not bounds:
        return False  # Unknown state — keep it
    lat_min, lat_max, lng_min, lng_max = bounds
    return not (lat_min <= lat <= lat_max and lng_min <= lng <= lng_max)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT pincode, state, latitude, longitude FROM pincodes")
all_rows = cursor.fetchall()

bad_pins = [pin for pin, state, lat, lng in all_rows if is_bad(lat, lng, state)]

if bad_pins:
    cursor.executemany("DELETE FROM pincodes WHERE pincode=?", [(p,) for p in bad_pins])
    conn.commit()
    print(f"Removed {len(bad_pins)} out-of-bounds entries from the DB.")
    print("These PINs will be auto-corrected via Nominatim on next request.")
else:
    print("No out-of-bounds entries found. DB is clean.")

conn.close()
print(f"Remaining rows in DB: {len(all_rows) - len(bad_pins)}")
