# Rule File 4: Validation And Delivery Rules

01. Değişiklikten sonra ilgili backend testleri çalıştırılmalıdır.
02. Tüm backend test paketi teslim öncesi çalıştırılmalıdır.
03. Frontend lint teslim öncesi çalıştırılmalıdır.
04. Frontend production build teslim öncesi çalıştırılmalıdır.
05. Test çıktısı failure veya error içeriyorsa teslim hazır sayılmaz.
06. Sandbox kaynaklı test engeli varsa not olarak ayrıca belirtilmelidir.
07. README gerçek çalıştırma komutlarını içermelidir.
08. Frontend README template metni bırakılmamalıdır.
09. `.gitignore` repo kökünde bulunmalıdır.
10. `.env` dosyaları repodan çıkartılmalıdır.
11. Gerçek OAuth secret ifşa olduysa GitHub tarafında rotate edilmelidir.
12. `db.sqlite3` teslim repo temizliğinde takip edilmemelidir.
13. `__pycache__` ve `.pyc` dosyaları takip edilmemelidir.
14. Test sonucu oluşan geçici CSV dosyaları temizlenmelidir.
15. Sample data bilerek tutuluyorsa README ile açıklanmalıdır.
16. Dosya ve klasör isimleri yazım hatası içermemelidir.
17. `libraryAI` gibi ek uygulamalar ana projeyle ilişkisi açık değilse belgelenmelidir.
18. Kullanılmayan eski klasörler teslimden önce kaldırılmalı veya arşivlenmelidir.
19. Yeni kural dosyaları içerik olarak prompta eklenebilir durumda olmalıdır.
20. Her kural dosyası tek konuya odaklanmalıdır.
21. AI'a verilen prompt görev, kural dosyaları ve çıktı sözleşmesini içermelidir.
22. AI çıktı sözleşmesi dosya yolu ve dosya içeriğini net istemelidir.
23. AI cevabında standart checklist istenmelidir.
24. Üretilen AI kodu validation endpointinden geçirilmelidir.
25. Validation sonucu ihlal varsa teslim edilmeden düzeltilmelidir.
26. GitHub scan sonucu düşük skor varsa ihlal listesi incelenmelidir.
27. Non-admin ekranda başka kişinin özel aktivitesi görünmemelidir.
28. Admin ekranda ekip geneli skor ve repo sayısı görünmelidir.
29. Lisans ekranında ortak ve kişisel lisans ayrımı sunumda açık anlatılmalıdır.
30. Fiziksel tablo ayrımı yoksa `license_mode` ile mantıksal ayrım açıklanmalıdır.
31. Commit mesajları anlamlı ve conventional prefix içermelidir.
32. Teslim branchinde gereksiz local dosya değişikliği olmamalıdır.
33. Yeni dosyalar proje amacına hizmet etmelidir.
34. Kullanılmayan dependency eklenmemelidir.
35. Build warning varsa risk notu olarak takip edilmelidir.
36. Migrationlar temiz sırayla uygulanmalıdır.
37. Hoca projeyi sıfırdan kurduğunda README ile ilerleyebilmelidir.
38. Demo kullanıcıları ve örnek veriler sunum senaryosuna hazır olmalıdır.
39. GitHub OAuth yoksa personal token fallback ile demo yapılabilmelidir.
40. Son kontrol listesi tamamlanmadan teslim arşivi hazırlanmamalıdır.
