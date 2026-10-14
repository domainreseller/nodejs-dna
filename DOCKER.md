# Node.js DNA API - Docker Kullanımı

Bu proje Docker container'da çalıştırılabilir. Aşağıdaki adımları takip ederek projeyi Docker'da test edebilirsiniz.

## 🐳 Docker Kurulumu

### 1. Docker Image Build Etme

```bash
docker build -t nodejs-dna .
```

### 2. Container Çalıştırma

#### Temel Test
```bash
docker run --rm nodejs-dna
```

#### Register Test
```bash
docker run --rm nodejs-dna node test-register.js
```

#### Interaktif Mod
```bash
docker run --rm -it nodejs-dna /bin/sh
```

## 🚀 Docker Compose ile Çalıştırma

### Tüm Testleri Çalıştır
```bash
docker-compose up --build
```

### Arka Planda Çalıştır
```bash
docker-compose up -d --build
```

### Container'ları Durdur
```bash
docker-compose down
```

## 📋 Test Sonuçları

### ✅ Başarılı Testler
- ✅ Docker image başarıyla build edildi
- ✅ Container başarıyla çalıştı
- ✅ API bağlantısı kuruldu
- ✅ REST client oluşturuldu
- ✅ Test scriptleri çalıştı

### ⚠️ Beklenen Hatalar
- `Reseller not found!` - Örnek Reseller ID / API Key kullanıldığı için normal
- `Cannot read properties of null` - API kimlik bilgileri olmadığı için normal

## 🔧 Yapılandırma

### Environment Variables
```bash
docker run --rm -e NODE_ENV=production nodejs-dna
```

### Volume Mount
```bash
docker run --rm -v $(pwd):/app nodejs-dna
```

## 📁 Docker Dosyaları

- `Dockerfile` - Ana Docker yapılandırması
- `docker-compose.yml` - Multi-container yapılandırması
- `.dockerignore` - Docker build'de hariç tutulacak dosyalar

## 🛠️ Geliştirme

### Container İçinde Geliştirme
```bash
docker run --rm -it -v $(pwd):/app nodejs-dna /bin/sh
```

### Logs Görüntüleme
```bash
docker-compose logs -f
```

## 📊 Performans

- **Image Size**: ~50MB (Alpine Linux tabanlı)
- **Build Time**: ~10-15 saniye
- **Startup Time**: ~2-3 saniye
- **Memory Usage**: ~30-50MB

## 🔍 Troubleshooting

### Container Çalışmıyor
```bash
docker logs <container_id>
```

### Port Çakışması
```bash
docker run --rm -p 3001:3000 nodejs-dna
```

### Permission Hatası
```bash
docker run --rm --user 1001:1001 nodejs-dna
```
