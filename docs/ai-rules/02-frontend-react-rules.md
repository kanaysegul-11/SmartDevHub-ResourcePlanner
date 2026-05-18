# Rule File 2: Frontend React Rules

01. React componentleri PascalCase isimlendirilmelidir.
02. Hooklar sadece component veya custom hook seviyesinde çağrılmalıdır.
03. Hooklar koşul, döngü veya nested function içinde çağrılmamalıdır.
04. State isimleri ekran davranışını açıkça anlatmalıdır.
05. Gereksiz global state eklenmemelidir.
06. API çağrıları mevcut `apiClient` üzerinden yapılmalıdır.
07. Router pathleri mevcut sayfa yapısıyla uyumlu olmalıdır.
08. Yeni sayfa eklendiğinde sidebar ve route tutarlılığı kontrol edilmelidir.
09. Admin-only ekranlar frontend ve backend tarafında korunmalıdır.
10. Loading, empty, error ve success durumları düşünülmelidir.
11. Form alanları label veya accessible name içermelidir.
12. Button metni eylemi net anlatmalıdır.
13. Uzun metinler mobilde taşma yapmamalıdır.
14. Tablo ve kartlar mobilde okunabilir kalmalıdır.
15. Gereksiz `window.alert` yerine mevcut toast/desen tercih edilmelidir.
16. Kullanıcı girdisi trim ve temel validasyondan geçmelidir.
17. Para, tarih ve yüzde gösterimleri tek format kullanmalıdır.
18. Liste filtreleri state ile tutarlı çalışmalıdır.
19. Bulk işlemler onay mekanizması olmadan çalışmamalıdır.
20. Mutasyon sonrası ilgili listeler invalidation/refetch ile güncellenmelidir.
21. Token ve user bilgisi session helper üzerinden okunmalıdır.
22. API base URL env ile değiştirilebilir olmalıdır.
23. Console log ve debugger teslim kodunda kalmamalıdır.
24. Ekran metinleri mümkünse i18n yapısına bağlanmalıdır.
25. Türkçe ve İngilizce metinler aynı sayfada rastgele karışmamalıdır.
26. Icon butonlar tooltip veya anlaşılır metin taşımalıdır.
27. Yetkisiz kullanıcı için görünmeyen eylem backendde de reddedilmelidir.
28. Dosya importları tutarlı relative path ile yazılmalıdır.
29. Component içinde çok uzun hesaplamalar useMemo veya helper ile ayrılmalıdır.
30. Tek component çok fazla sorumluluk taşıyorsa alt componentlere bölünmelidir.
31. CSS sınıfları okunabilir ve mevcut tasarım diliyle uyumlu olmalıdır.
32. Build boyutu uyarıları izlenmeli, büyük sayfalar gerekirse bölünmelidir.
33. Lint hatası olmadan teslim yapılmalıdır.
34. Frontend README uygulamaya özel çalıştırma bilgisi içermelidir.
35. Kullanıcıya ait gizli veya maliyetli veri role göre saklanmalıdır.
36. CSV import ekranları hatalı satırları kullanıcıya raporlamalıdır.
37. GitHub entegrasyon ekranları OAuth yoksa fallback/token yolunu anlatmalıdır.
38. AI prompt ekranı aktif kural dosyalarını açıkça göstermelidir.
39. Generated prompt kopyalanabilir ve okunabilir formatta olmalıdır.
40. Sayfa ilk açıldığında asıl iş akışı görünür olmalıdır.
