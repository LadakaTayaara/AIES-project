import requests
from PIL import Image

img = Image.new('RGB', (100, 100), color = 'gray')
img.save('real_test_image.jpg')

url = "http://127.0.0.1:8000/api/reports/submit"
with open("real_test_image.jpg", "rb") as f:
    files = {"image": ("real_test_image.jpg", f, "image/jpeg")}
    data = {"lat": 0.0, "lng": 0.0}
    try:
        response = requests.post(url, files=files, data=data)
        print("Status Code:", response.status_code)
        print("Response:", response.text)
    except Exception as e:
        print("Error connecting:", e)
