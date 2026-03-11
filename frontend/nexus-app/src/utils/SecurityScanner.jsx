export const scanCodeSecurity = (code = "") => {
  // Eğer kod boşsa direkt boş dizi dön (Hata almamak için)
  if (!code) return [];

  const rules = [
    { 
      pattern: /password|secret|api_key|token|atob|btoa/gi, 
      patternString: "password|secret|api_key|token|atob|btoa",
      level: "Kritik", 
      label: "HASSAS VERİ", 
      message: "Kod içinde ham şifre, API anahtarı veya Base64 işleme (JWT) tespit edildi." 
    },
    { 
      pattern: /sudo|rm\s+-rf|chmod\s+777/gi, 
      patternString: "sudo|rm\\s+-rf|chmod\\s+777",
      level: "Yüksek", 
      label: "SİSTEM KOMUTU", 
      message: "Yönetici yetkisi veya tehlikeli dosya silme/izin komutu tespit edildi." 
    },
    { 
      pattern: /eval\(|exec\(|Function\(/g, 
      patternString: "eval\\(|exec\\(|Function\\(",
      level: "Kritik", 
      label: "KOD ENJEKSİYONU", 
      message: "Dinamik kod yürütme fonksiyonları (eval/exec) ciddi güvenlik açığı oluşturur." 
    },
    { 
      pattern: /<script|innerHTML|document\.write/gi, 
      patternString: "<script|innerHTML|document\\.write",
      level: "Yüksek", 
      label: "XSS RİSKİ", 
      message: "Doğrudan DOM müdahalesi veya script enjeksiyonu (XSS) riski tespit edildi." 
    },
    { 
      pattern: /http:\/\/|ftp:\/\//gi, 
      patternString: "http:\\/\\/|ftp:\\/\\/",
      level: "Orta", 
      label: "GÜVENSİZ PROTOKOL", 
      message: "Şifrelenmemiş (HTTP/FTP) bağlantı tespit edildi. HTTPS kullanılması önerilir." 
    }
  ];

  let detectedRisks = [];

  rules.forEach(r => {
    // ÖNEMLİ: Regex state'ini sıfırlamak için her seferinde yeni test yapıyoruz
    const regex = new RegExp(r.pattern);
    if (regex.test(code)) {
      detectedRisks.push({
        level: r.level,
        label: r.label,
        message: r.message,
        patternString: r.patternString // Vurgulama işlemi için bu şart
      });
    }
  });

  return detectedRisks;
};