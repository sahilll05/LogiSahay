import csv
import sqlite3
import os

# Paths relative to project root — works regardless of working directory
_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, '..', '..'))

CSV_PATH = os.path.join(_PROJECT_ROOT, 'IN.csv')
DB_PATH  = os.path.join(_PROJECT_ROOT, 'backend', 'pincodes.db')

# ─── Bounding boxes for each Indian state (lat_min, lat_max, lng_min, lng_max)
# Derived from official geographic data — not hardcoded per PIN, just per state
STATE_BOUNDS: dict[str, tuple[float, float, float, float]] = {
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

def is_coord_in_state(lat: float, lng: float, state: str) -> bool:
    """Returns True if the coordinate lies within the state's bounding box."""
    bounds = STATE_BOUNDS.get(state)
    if not bounds:
        return True  # Unknown state — allow all
    lat_min, lat_max, lng_min, lng_max = bounds
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max

def init_db():
    """
    Imports PIN code coordinates from IN.csv into SQLite.

    Strategy — fully data-driven, zero hardcoding:
    1. For each PIN, collect all rows from the CSV.
    2. FILTER OUT rows whose coordinates fall outside the geographic bounding
       box for their declared state (catches the large class of bad rows).
    3. Among surviving rows, pick those with the highest accuracy score.
    4. Average their coordinates to get the best central point.
    5. If ALL rows fail the bounding box check, fall back to the single row
       with the highest accuracy (so we always have *some* result).
    """
    print(f"Processing {CSV_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS pincodes")
    cursor.execute("""
        CREATE TABLE pincodes (
            pincode   TEXT PRIMARY KEY,
            city      TEXT,
            state     TEXT,
            latitude  REAL,
            longitude REAL
        )
    """)

    # pin -> list of (lat, lng, city, state, accuracy)
    pincode_rows: dict[str, list] = {}

    with open(CSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [h.strip() for h in reader.fieldnames]

        for row in reader:
            pincode = row.get('postal code', '').strip()
            if not pincode:
                continue
            try:
                lat = float(row['latitude'])
                lng = float(row['longitude'])
                accuracy = int(row.get('accuracy', '0') or '0')
            except (ValueError, TypeError):
                continue

            city = (
                row.get('community name', '').strip()
                or row.get('Area', '').strip()
                or row.get('District', '').strip()
                or 'Unknown'
            )
            state = row.get('State', '').strip()

            if pincode not in pincode_rows:
                pincode_rows[pincode] = []
            pincode_rows[pincode].append((lat, lng, city, state, accuracy))

    final_rows = []
    skipped_bound = 0

    for pincode, rows in pincode_rows.items():
        state = rows[0][3]

        # Step 1: Filter to only coordinates valid for this state
        valid = [r for r in rows if is_coord_in_state(r[0], r[1], r[3])]

        if not valid:
            # Fallback: all rows are out-of-bounds — use highest accuracy anyway
            valid = rows
            skipped_bound += 1

        # Step 2: Pick the highest accuracy among valid rows
        best_accuracy = max(r[4] for r in valid)
        best_rows = [r for r in valid if r[4] == best_accuracy]

        # Step 3: Average coordinates of the best-accuracy rows
        avg_lat = round(sum(r[0] for r in best_rows) / len(best_rows), 6)
        avg_lng = round(sum(r[1] for r in best_rows) / len(best_rows), 6)
        city = best_rows[0][2]

        final_rows.append((pincode, city, state, avg_lat, avg_lng))

    cursor.executemany("INSERT INTO pincodes VALUES (?, ?, ?, ?, ?)", final_rows)
    conn.commit()
    conn.close()

    print(f"Imported {len(final_rows)} PIN codes.")
    print(f"  • {len(final_rows) - skipped_bound} PINs used geographically validated coordinates.")
    print(f"  • {skipped_bound} PINs had no in-bounds rows (used best available).")

if __name__ == "__main__":
    init_db()
