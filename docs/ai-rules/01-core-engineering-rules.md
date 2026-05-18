# Rule File 1: Core Engineering Rules

01. Mevcut proje mimarisi okunmadan yeni yapı eklenmemelidir.
02. Yeni özellik eklenirken mevcut klasör yapısı korunmalıdır.
03. Dosya isimleri okunabilir, amaca uygun ve tutarlı olmalıdır.
04. Fonksiyonlar tek sorumluluğa yakın tutulmalıdır.
05. Tekrar eden iş mantığı helper veya service seviyesinde ortaklaştırılmalıdır.
06. Fonksiyon ve değişken isimleri niyeti açıkça anlatmalıdır.
07. Gereksiz abstraction eklenmemelidir.
08. Aynı iş mantığı kopyalanmamalı, ortak yardımcı fonksiyona taşınmalıdır.
09. Kod yorumları yalnızca karmaşık kararları açıklamak için kullanılmalıdır.
10. Kod okunabilirlik için küçük parçalara ayrılmalıdır.
11. Framework ve kütüphane tercihleri mevcut projeyle uyumlu olmalıdır.
12. Yeni dependency eklenmeden önce mevcut çözüm yolları kontrol edilmelidir.
13. Hata yönetimi kullanıcıya ve geliştiriciye uygun bilgi vermelidir.
14. Beklenen hatalar kontrollü şekilde yakalanmalıdır.
15. Kullanıcıya gösterilen hata mesajları anlaşılır olmalıdır.
16. Log veya hata mesajı gizli veri içermemelidir.
17. Secret, token ve private key kod içine yazılmamalıdır.
18. `.env.example` yalnızca placeholder değerler içermelidir.
19. `.env` dosyaları repoya eklenmemelidir.
20. Veritabanı dosyası, cache ve build çıktısı repoya eklenmemelidir.
21. Kod değişikliği mevcut davranışı gereksiz yere bozmamalıdır.
22. Yetki kontrolleri backend tarafında yapılmalıdır.
23. Frontend tarafındaki gizleme tek başına güvenlik sayılmamalıdır.
24. Rol bazlı veri görünürlüğü test edilmelidir.
25. Maliyet veya yönetici verileri normal kullanıcıdan gizlenmelidir.
26. Tarih ve para alanları tutarlı formatta tutulmalıdır.
27. Kayıt oluşturma ve güncelleme audit izleriyle takip edilmelidir.
28. Silme işlemleri iş kuralına göre soft archive veya kontrollü delete olmalıdır.
29. CSV import işlemleri id sahipliğini doğrulamalıdır.
30. Kullanıcıya ait olmayan veri üzerinde işlem engellenmelidir.
31. API cevapları frontend ihtiyacına göre tutarlı alan adları kullanmalıdır.
32. Serializer validasyonları model kurallarını desteklemelidir.
33. Veritabanında unique constraint olan alanlar duplicate üretilmemelidir.
34. Migration dosyaları model değişiklikleriyle uyumlu olmalıdır.
35. Testler sadece mutlu yolu değil yetki ve hata yollarını da kapsamalıdır.
36. README gerçek kurulum adımlarını anlatmalıdır.
37. Requirements ve package dosyaları gerçek bağımlılıkları yansıtmalıdır.
38. Frontend ve backend başlatma sırası açık yazılmalıdır.
39. Kod standardı sayfası ekibin hangi kurallarla puanlandığını göstermelidir.
40. AI tarafından üretilen kod da aynı kurallardan muaf tutulmamalıdır.
