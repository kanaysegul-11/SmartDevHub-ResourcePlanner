# SmartDevHub Resource Planner

SmartDevHub Resource Planner; ekip, proje, görev, yazılım/lisans takibi ve GitHub kod yönetişimi için geliştirilmiş Django REST API + React arayüz uygulamasıdır.

## Ana Özellikler

- Şirket geneli yazılım ve abonelik takibi
- Kişiye atanmış lisanslar ve ortak ekip lisansları
- Lisans istekleri, onay/karşılama akışı, audit ve sync kayıtları
- Proje, görev, ekip durumu ve ekip içi mesajlaşma
- Kod kütüphanesi, yorum ve puanlama
- GitHub hesap/repo bağlantısı
- Kod standardı profilleri, kural tanımları, repo tarama ve ihlal raporları
- Geliştirici bazlı GitHub skorları, commit ve PR kalite sinyalleri
- AI prompt rehberi ve AI çıktısını standartlara göre doğrulama

## Proje Yapısı

```text
backend/                 Django REST API
frontend/nexus-app/      React + Vite frontend
docs/                    Kurulum ve entegrasyon notları
docs/ai-rules/           AI kod üretimi için ayrı kural dosyaları
sample-data/             Örnek CSV verileri
requirements.txt         Backend Python bağımlılıkları
.env.example             Lokal ortam değişkenleri örneği
```

## Gerekenler

- Python 3.12+
- Node.js 20+
- npm
- Git

## Ortam Değişkenleri

Root klasörde örnek dosyayı kopyalayın:

```powershell
copy .env.example .env
```

GitHub OAuth veya webhook kullanacaksanız `.env` içindeki değerleri doldurun. Gerçek secret değerlerini repoya eklemeyin.

Frontend API adresi için normalde ayrıca dosya gerekmez; varsayılan adres `http://localhost:8000/api` olarak kullanılır. Farklı backend adresi gerekiyorsa `frontend/nexus-app/.env.local` oluşturup şunu ekleyebilirsiniz:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Backend Kurulumu

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

Backend varsayılan adresi:

```text
http://localhost:8000
```

API tabanı:

```text
http://localhost:8000/api
```

## Frontend Kurulumu

Yeni bir terminal açın:

```powershell
cd frontend\nexus-app
npm install
npm run dev
```

Frontend varsayılan adresi:

```text
http://localhost:5173
```

## Test ve Kontrol Komutları

Backend:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py test api
```

Frontend:

```powershell
cd frontend\nexus-app
npm run lint
npm run build
```

## Canlı Lisans CSV Akışı

Kişiye atanmış lisanslar CSV dosyalarından senkronize edilebilir:

```powershell
cd backend
python manage.py export_user_license_csvs
python manage.py sync_live_license_csvs
python manage.py watch_live_license_csvs
```

Windows izleyici:

```powershell
.\backend\start_live_license_csv_watcher.ps1
```

Detaylar için [sample-data/live-licenses/README.md](sample-data/live-licenses/README.md) dosyasına bakın.

## GitHub Entegrasyonu

GitHub OAuth ve webhook kurulumu için [docs/GITHUB_OAUTH_SETUP.md](docs/GITHUB_OAUTH_SETUP.md) dosyasını izleyin.

Lokal geliştirmede webhook için public URL gerekir. Public URL yoksa uygulama polling fallback ile çalışır.

## Teslim Notları

- `.env`, `backend/.env`, `backend/db.sqlite3`, `__pycache__` ve `.pyc` dosyaları repoya eklenmemelidir.
- Gerçek GitHub OAuth secret değerleri repoya yazılmamalıdır.
- AI kod üretim kuralları `docs/ai-rules/` altında ayrı dosyalar halinde tutulur.
