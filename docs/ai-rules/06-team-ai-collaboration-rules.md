# Rule File 6: Team AI Collaboration Rules

01. Bu dosya birden fazla frontend geliştiricinin aynı işi farklı AI araçlarıyla yürütmesi için zorunludur.
02. Amaç herkesin birebir aynı kodu yazması değildir.
03. Amaç herkesin aynı mimari, aynı klasör düzeni, aynı API standardı ve aynı tasarım dili içinde kod üretmesidir.
04. Her frontend işi önce küçük ve bağımsız dosya sahipliklerine bölünmelidir.
05. Her geliştirici yalnızca kendisine verilen dosya veya klasörlerde değişiklik istemelidir.
06. AI çıktısı verilen sahiplik sınırının dışına çıkarsa kabul edilmemelidir.
07. Ortak dosya değişikliği gerekiyorsa AI bunu kod olarak değil, risk ve koordinasyon notu olarak yazmalıdır.
08. İki kişi aynı dosyaya aynı anda AI çıktısı uygulatmamalıdır.
09. Sayfa sahibi kişi ana state, route ve API akışı kararlarından sorumludur.
10. Component sahibi kişi yalnızca kendisine verilen component arayüzünden sorumludur.
11. Form sahibi kişi form state, validation ve submit davranışından sorumludur.
12. Tablo veya liste sahibi kişi yalnızca listeleme, sıralama, boş durum ve erişilebilir tablo yapısından sorumludur.
13. Ortak helper sahibi yoksa helper eklenmemeli, ihtiyaç koordinasyon notu olarak belirtilmelidir.
14. Her AI promptu dosya sahipliği bölümünü açıkça içermelidir.
15. Dosya sahipliği bölümünde izin verilen dosyalar tek tek yazılmalıdır.
16. Dosya sahipliği bölümünde yasaklı dosyalar da gerektiğinde yazılmalıdır.
17. AI çıktısı yeni dosya öneriyorsa dosyanın hangi sahibin alanına girdiğini açıklamalıdır.
18. AI çıktısı yeni route önermemelidir; route ihtiyacı varsa önce ekip kararı istenmelidir.
19. AI çıktısı yeni dependency önermemelidir; dependency ihtiyacı varsa önce gerekçe ve alternatifler yazılmalıdır.
20. AI çıktısı mevcut tasarım sistemini değiştirmemelidir.
21. AI çıktısı mevcut component kütüphanesi varsa onu kullanmalıdır.
22. Button, Badge, Modal, Table, Input gibi tekrar eden parçalar mevcut projedeki örüntüye göre yazılmalıdır.
23. Her geliştirici aynı renk, spacing, typography ve radius yaklaşımını korumalıdır.
24. Aynı ekrandaki componentler farklı görsel dillerle yazılmamalıdır.
25. Aynı ekrandaki Türkçe metin tonu tutarlı olmalıdır.
26. Aynı ekrandaki hata mesajları aynı üslupta olmalıdır.
27. Aynı ekrandaki loading ve empty state metinleri aynı formatta olmalıdır.
28. Aynı ekrandaki buton metinleri aynı eylem dilini kullanmalıdır.
29. API çağrıları yalnızca proje standardındaki API client üzerinden yapılmalıdır.
30. Farklı geliştiriciler farklı endpoint isimleri uydurmamalıdır.
31. Endpoint belli değilse AI kod yazmadan önce eksik API bilgisini risk olarak belirtmelidir.
32. Mock data, seed data veya local-only demo data ekip standardı değildir.
33. API eksikse AI sahte veriyle ekran tamamlamamalıdır.
34. API eksikse AI minimal backend sözleşmesi veya eksik veri notu yazmalıdır.
35. Frontend state API kaynağının yerine geçmemelidir.
36. Geçici UI state yalnızca form, filtre, modal ve etkileşim için kullanılmalıdır.
37. Rol kontrolü herkes tarafından aynı helper veya aynı context ile yapılmalıdır.
38. Admin ve kullanıcı davranışı dosyalar arasında çelişmemelidir.
39. Yetkisiz işlem frontendde gizlense bile backendde de engellenmelidir.
40. Her AI çıktısı mevcut domain alan adlarını korumalıdır.
41. Aynı alan için farklı isimler kullanılmamalıdır.
42. Örneğin `license_mode` yerine `type`, `scope` veya `licenseType` kullanılmamalıdır.
43. Her AI çıktısı önce mevcut dosyada kullanılan import stilini kontrol etmelidir.
44. Varsayılan export ve named export karışımı mevcut projeye göre korunmalıdır.
45. Yeni index export yalnızca klasörde zaten bu örüntü varsa eklenmelidir.
46. Component isimleri PascalCase olmalıdır.
47. Fonksiyon ve değişken isimleri camelCase olmalıdır.
48. Sabitler gerçek sabitse UPPER_SNAKE_CASE olmalıdır.
49. Her geliştirici aynı dosya uzantısı standardına uymalıdır.
50. Ana React app içinde JSX standardı varsa yeni ekran kodu `.jsx` olmalıdır.
51. Saf yardımcı kod `.js` olmalıdır.
52. TypeScript geçişi tek kişinin AI çıktısıyla başlatılmamalıdır.
53. Büyük componentler parçalanmalı ama gereksiz klasör çoğaltılmamalıdır.
54. Alt componentler sadece gerçekten okunabilirliği veya reuse ihtiyacını artırıyorsa eklenmelidir.
55. Her component açık prop sözleşmesiyle yazılmalıdır.
56. Prop isimleri aynı domain kavramı için tüm ekipte aynı olmalıdır.
57. Bir componentin callback isimleri eylemi açık anlatmalıdır.
58. `onSave`, `onCancel`, `onFilterChange`, `onSubmit` gibi tanıdık isimler tercih edilmelidir.
59. Her form alanı label veya eşdeğer erişilebilir isimle bağlanmalıdır.
60. Form içindeki her button için `type` açık yazılmalıdır.
61. Tablo kullanan kişi `thead`, `tbody`, `th scope="col"` yapısını korumalıdır.
62. Görsellerde `alt` kullanılmalıdır.
63. Dekoratif görsellerde boş `alt` kullanılabilir.
64. Dış linklerde `target="_blank"` varsa `rel="noopener noreferrer"` eklenmelidir.
65. Her AI çıktısı loading state davranışını yazmalıdır.
66. Her AI çıktısı empty state davranışını yazmalıdır.
67. Her AI çıktısı error state davranışını yazmalıdır.
68. Mutasyon yapan çıktı success state veya refetch davranışını yazmalıdır.
69. Delete veya bulk action yapan çıktı confirmation akışını yazmalıdır.
70. Hata mesajları kullanıcıya kontrollü ve anlaşılır verilmelidir.
71. `console.log`, `debugger` ve geçici alert teslim kodunda kalmamalıdır.
72. `window.alert` yalnızca projede mevcut kabul edilen desen ise kullanılmalıdır.
73. Aksi halde toast, inline feedback veya mevcut feedback componenti kullanılmalıdır.
74. AI çıktısı başka kişinin dosyasında değişiklik gerektiriyorsa bunu "Koordinasyon gerektirir" diye işaretlemelidir.
75. AI çıktısı başka kişinin component API'sini değiştirmemelidir.
76. Component API değişikliği gerekiyorsa önce öneri ve etki listesi vermelidir.
77. Aynı sprintte çalışan geliştiriciler promptlarının başına aynı kural dosyalarını koymalıdır.
78. Aynı sprintte çalışan geliştiriciler aynı task breakdown dokümanını kullanmalıdır.
79. Her geliştirici AI çıktısının sonunda aynı checklisti istemelidir.
80. Checklist dosya sahipliği ihlali var mı sorusunu içermelidir.
81. Checklist API client standardı korundu mu sorusunu içermelidir.
82. Checklist mock data kullanılmadı mı sorusunu içermelidir.
83. Checklist erişilebilirlik kuralları uygulandı mı sorusunu içermelidir.
84. Checklist lint ve build beklentisini içermelidir.
85. Her AI çıktısı dosya bazlı değişiklik özeti vermelidir.
86. Her AI çıktısı hangi dosyayı değiştirdiğini açık yazmalıdır.
87. Her AI çıktısı hangi dosyayı özellikle değiştirmediğini gerekirse yazmalıdır.
88. Her AI çıktısı risk ve varsayım bölümünü içermelidir.
89. Risk bölümünde eksik API, eksik prop veya eksik tasarım bilgisi açık belirtilmelidir.
90. Risk yoksa "Bilinen ek risk yok" yazılabilir.
91. AI çıktısı uygulanmadan önce insan geliştirici tarafından okunmalıdır.
92. AI çıktısı doğrudan merge edilmemelidir.
93. Her kişinin kodu en az bir başka frontend geliştirici tarafından review edilmelidir.
94. Review sırasında sadece çalışıyor mu değil, aynı ekipten çıkmış gibi mi görünüyor sorusu sorulmalıdır.
95. Review sırasında dosya sahipliği ihlali kontrol edilmelidir.
96. Review sırasında ortak UI dili kontrol edilmelidir.
97. Review sırasında API sözleşmesi kontrol edilmelidir.
98. Review sırasında gereksiz yeni dependency kontrol edilmelidir.
99. Review sırasında yarım placeholder veya pseudo-code kontrol edilmelidir.
100. AI araçları farklı olabilir: Cursor, Codex, Gemini, ChatGPT veya başka araç kullanılabilir.
101. Araç farkı kod standardını değiştirmemelidir.
102. Araç farkı dosya yollarını değiştirmemelidir.
103. Araç farkı API client standardını değiştirmemelidir.
104. Araç farkı role check standardını değiştirmemelidir.
105. Araç farkı tasarım dilini değiştirmemelidir.
106. Aynı görev farklı AI'lara verildiğinde aynı dosya sahipliği metni kullanılmalıdır.
107. Aynı görev farklı AI'lara verildiğinde aynı backend alan adları kullanılmalıdır.
108. Aynı görev farklı AI'lara verildiğinde aynı component adlandırma kullanılmalıdır.
109. Aynı görev farklı AI'lara verildiğinde aynı çıktı formatı istenmelidir.
110. AI cevapları birebir aynı olmak zorunda değildir.
111. AI cevapları aynı sözleşmeye göre değerlendirilebilir olmak zorundadır.
112. En iyi çıktı, sözleşmeye en çok uyan çıktı olarak seçilmelidir.
113. Sözleşmeye uymayan çıktı yeniden promptlanmalıdır.
114. Yeniden promptta hangi kuralın ihlal edildiği açıkça yazılmalıdır.
115. İkinci çıktı da uymuyorsa o AI çıktısı kullanılmamalıdır.
116. Ekip standardı AI'ın önerisinden üstündür.
117. İnsan review kararı AI cevabından üstündür.
118. Proje sözleşmesi task isteğinden üstündür.
119. Task isteği proje sözleşmesiyle çelişirse AI önce çelişki raporu vermelidir.
120. Çelişki netleşmeden kod üretilmemelidir.
