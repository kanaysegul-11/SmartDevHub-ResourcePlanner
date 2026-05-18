# Rule File 3: Backend API Rules

01. Django model alanları iş kuralını açıkça temsil etmelidir.
02. Serializer alanları frontend ihtiyacını karşılamalıdır.
03. Serializer validasyonları kullanıcı hatasını erken yakalamalıdır.
04. ViewSet permission sınıfları role göre net ayrılmalıdır.
05. Normal kullanıcı sadece kendi verisini görmelidir.
06. Admin kullanıcı ekip geneli raporları görebilmelidir.
07. Cost alanları sadece admin için dönmelidir.
08. GitHub tokenları API response içinde maskelenmelidir.
09. OAuth state doğrulanmadan hesap bağlanmamalıdır.
10. Webhook signature doğrulanmadan event işlenmemelidir.
11. GitHub API hataları kontrollü ValueError veya HTTP cevaplarına dönmelidir.
12. Arka plan sync işlemleri database lock durumunda retry yapmalıdır.
13. SQLite lock riski olan işlemler kısa transaction kullanmalıdır.
14. Stale running scan kayıtları failed durumuna alınmalıdır.
15. Repo scan sonucu scan, violation ve developer score olarak saklanmalıdır.
16. Developer overview non-admin için sadece kendi GitHub loginini göstermelidir.
17. Repository violation listesi sunum ihtiyacına göre repo bulgularını gösterebilir.
18. Disabled rule aktif değerlendirme listesine girmemelidir.
19. Varsayılan standart profil duplicate kural üretmemelidir.
20. Kural silindiğinde ilgili scan ve repo skorlarının etkisi yenilenmelidir.
21. AI validation çıktıları aynı evaluate mekanizmasından geçmelidir.
22. AI remediation sadece kullanıcının kendi reposunda çalışmalıdır.
23. Otomatik remediation desteklenmeyen kuralda güvenli şekilde skip etmelidir.
24. Shared lisans toplam seat sayısını aşmamalıdır.
25. Assigned lisans `seats_total=1` kuralını korumalıdır.
26. Assigned lisans tam olarak bir kullanıcıya bağlanmalıdır.
27. CSV asset_id başka kullanıcının dosyasından kullanılamamalıdır.
28. CSV sync silinen satırı archive olarak işlemelidir.
29. License request status değişimi requester bildirimini tetiklemelidir.
30. Notification kayıtları hedef kullanıcı ve link bilgisi içermelidir.
31. Task tamamlanınca ilgili admin veya creator bildirim almalıdır.
32. Team message kendine mesaj atmayı engellemelidir.
33. User silinse bile kod kütüphanesi içeriği korunmalıdır.
34. Testler permission, serializer ve management command akışını kapsamalıdır.
35. `requirements.txt` backend bağımlılıklarını içermelidir.
36. Settings dosyası root `.env` ve backend `.env` okumayı desteklemelidir.
37. Production secret değerleri repoda bulunmamalıdır.
38. `DEBUG=True` sadece lokal geliştirme için kabul edilmelidir.
39. API URLleri `api/urls.py` içinde tek router düzeniyle takip edilmelidir.
40. Backend hata mesajları kullanıcıya veri sızdırmadan açıklayıcı olmalıdır.
