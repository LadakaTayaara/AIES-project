import requests

url = "http://127.0.0.1:8000/api/reports/submit"
with open("test_image.jpg", "wb") as f:
    f.write(b"fake image data")

with open("test_image.jpg", "rb") as f:
    files = {"image": ("test_image.jpg", f, "image/jpeg")}
    data = {"lat": 0.0, "lng": 0.0}
    try:
        response = requests.post(url, files=files, data=data)
        print("Status Code:", response.status_code)
        print("Response:", response.text)
    except Exception as e:
        print("Error connecting:", e)
