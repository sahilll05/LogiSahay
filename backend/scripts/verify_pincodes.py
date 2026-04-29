import sqlite3

DB_PATH = "pincodes.db"

CHECKS = [
    ("395003", "Surat, Gujarat",     21.0, 23.0, 72.0, 74.0),
    ("110001", "Delhi",              28.0, 29.0, 76.5, 77.5),
    ("400706", "Nerul/Navi Mumbai",  18.8, 19.5, 72.8, 73.3),
    ("400042", "Bhandup Mumbai",     19.0, 19.3, 72.7, 73.1),
    ("560001", "Bengaluru",          12.8, 13.2, 77.4, 77.8),
    ("600001", "Chennai",            13.0, 13.2, 80.2, 80.4),
    ("500001", "Hyderabad",          17.2, 17.6, 78.3, 78.7),
    ("700001", "Kolkata",            22.4, 22.7, 88.2, 88.5),
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print(f"\n{'PIN':<8} {'City/State':<35} {'Lat':>10} {'Lng':>10}  Status")
print("-" * 78)

all_ok = True
for pin, label, lat_min, lat_max, lng_min, lng_max in CHECKS:
    cursor.execute("SELECT city, state, latitude, longitude FROM pincodes WHERE pincode=?", (pin,))
    row = cursor.fetchone()
    if not row:
        print(f"{pin:<8} {label:<35} {'NOT IN DB':>22}  FAIL")
        all_ok = False
        continue

    city, state, lat, lng = row
    in_range = (lat_min <= lat <= lat_max) and (lng_min <= lng <= lng_max)
    status = "OK" if in_range else "FAIL - OUT OF RANGE"
    if not in_range:
        all_ok = False
    print(f"{pin:<8} {(city + ', ' + state):<35} {lat:>10.4f} {lng:>10.4f}  {status}")

conn.close()
print()
if all_ok:
    print("All PINs have correct coordinates!")
else:
    print("Some PINs still have bad coordinates -- Nominatim will fix them on first request.")
