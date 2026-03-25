# SmartDevHub Resource Planner

Bu proje iki ana parçadan oluşur:

- `backend`: Django REST API
- `frontend/nexus-app`: Vite + React arayüzü

Başka bir bilgisayarda projeyi çalıştırmak için aşağıdaki kurulum adımlarını izleyebilirsin.

## Gerekenler

- Python 3.12+
- Node.js 20+ ve npm
- Git

## Projeyi Alma

```powershell
git clone <repo-url>
cd SmartDevHub-ResourcePlanner
```

## 1. Backend Kurulumu

Backend klasörüne gir:

```powershell
cd backend
```

Sanal ortam oluştur ve aktif et:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Gerekli Python paketlerini kur:

```powershell
pip install django djangorestframework django-cors-headers django-filter
```

Veritabanını hazırlamak için migration çalıştır:

```powershell
python manage.py migrate
```

İstersen yönetici kullanıcı oluştur:

```powershell
python manage.py createsuperuser
```

Backend sunucusunu başlat:

```powershell
python manage.py runserver
```

Backend varsayılan olarak şu adreste çalışır:

```text
http://localhost:8000
```

API tabanı:

```text
http://localhost:8000/api
```

## 2. Frontend Kurulumu

Yeni bir terminal aç ve frontend klasörüne gir:

```powershell
cd frontend\nexus-app
```

Node paketlerini kur:

```powershell
npm install
```

`.env` dosyasını kontrol et. Lokal geliştirme için mevcut değer şu şekilde olmalı:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Frontend geliştirme sunucusunu başlat:

```powershell
npm run dev
```

Frontend genelde şu adreste açılır:

```text
http://localhost:5173
```

## Çalıştırma Sırası

Projeyi lokal ortamda kullanmak için önce backend, sonra frontend başlatılmalı:

1. `backend` içinde `python manage.py runserver`
2. `frontend/nexus-app` içinde `npm run dev`

## Google Login Kullanılacaksa

Google ile giriş kullanılacaksa backend tarafında ortam değişkeni tanımlanmalı:

```powershell
$env:GOOGLE_CLIENT_ID="senin_google_client_id_degerin"
```

Ardından backend yeniden başlatılmalı.

Frontend tarafında da ilgili Google client ayarı projede kullanılıyorsa Vite env değerlerinin doğru olduğundan emin ol.

## Veritabanı Notu

Projede `backend/db.sqlite3` dosyası bulunuyor. İstersen:

- Bu dosyayı kullanarak mevcut verilerle devam edebilirsin.
- Ya da temiz başlangıç için kendi veritabanını oluşturup `python manage.py migrate` çalıştırabilirsin.

## Faydalı Komutlar

Backend:

```powershell
python manage.py runserver
python manage.py migrate
python manage.py createsuperuser
```

Frontend:

```powershell
npm install
npm run dev
npm run build
```

## Olası Sorunlar

Eğer frontend açılıyor ama veri gelmiyorsa:

- Backend'in çalıştığını kontrol et.
- `frontend/nexus-app/.env` içindeki `VITE_API_BASE_URL` değerini kontrol et.
- Tarayıcı konsolunda veya backend terminalinde hata olup olmadığına bak.

Eğer CORS hatası alırsan:

- Frontend'in `http://localhost:5173` üzerinde çalıştığından emin ol.
- Backend ayarlarında CORS yapılandırmasının değişmediğini kontrol et.
