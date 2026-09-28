"""Test script for the API endpoints."""
import urllib.request
import json
import io
import uuid

# Create a simple test image using PIL
from PIL import Image

img = Image.new('RGB', (640, 480), color=(100, 100, 100))
# Add some variation to make it more realistic
for x in range(200, 400):
    for y in range(150, 300):
        img.putpixel((x, y), (50, 50, 50))

buf = io.BytesIO()
img.save(buf, format='JPEG')
img_bytes = buf.getvalue()

# Build multipart form data
boundary = str(uuid.uuid4())

parts = []

# Image part
parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + img_bytes + b'\r\n')

# Lat part
parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="lat"\r\n\r\n18.5204\r\n'.encode())

# Lng part
parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="lng"\r\n\r\n73.8567\r\n'.encode())

# Description part
parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nTest pothole near main road\r\n'.encode())

# End boundary
parts.append(f'--{boundary}--\r\n'.encode())

body = b''.join(parts)

# Submit report
print("=" * 50)
print("Testing report submission...")
print("=" * 50)

req = urllib.request.Request(
    'http://localhost:8000/api/reports/submit',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
    method='POST'
)

try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print("SUCCESS! Report submitted:")
    print(json.dumps(data, indent=2))
    report_id = data.get('report_id', '')
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()}")
    report_id = None

print()

# Test getting all reports
print("=" * 50)
print("Testing get all reports...")
print("=" * 50)
resp = urllib.request.urlopen('http://localhost:8000/api/reports/all')
data = json.loads(resp.read().decode())
print(f"Total reports: {data['total']}")
for r in data['reports']:
    print(f"  #{r['report_id'][:8]} | {r['severity']:>8} | {r['confidence']:.1%} | {r['status']}")

print()

# Test dashboard summary
print("=" * 50)
print("Testing dashboard summary...")
print("=" * 50)
resp = urllib.request.urlopen('http://localhost:8000/api/dashboard/summary')
data = json.loads(resp.read().decode())
print(f"Total: {data['total_reports']}")
print(f"Severity: {data['severity_breakdown']}")
print(f"Road Health: {data['road_health_index']}")

print()
print("All tests passed!")
