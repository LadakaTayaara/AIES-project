import requests
import io
url = "http://localhost:8000/api/reports/submit"
data = {"lat": 12.34, "lng": 56.78}
files = {"image": ("dummy.jpg", open("../ml/data/images/img-1.jpg", "rb"), "image/jpeg")}
response = requests.post(url, data=data, files=files)
print(response.status_code)
print(response.text)
