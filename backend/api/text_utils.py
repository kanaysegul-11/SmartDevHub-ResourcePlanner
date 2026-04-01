import re
import unicodedata


BROKEN_TURKISH_DOTTED_I_RE = re.compile(
    r"(^|[\s(\[{\"'/-])\?(?=[a-zçğıöşü])",
    re.UNICODE,
)


def restore_missing_turkish_dotted_i(value):
    if not isinstance(value, str) or not value:
        return value

    normalized = unicodedata.normalize("NFC", value)
    return BROKEN_TURKISH_DOTTED_I_RE.sub(r"\1İ", normalized)


def normalize_legacy_turkish_text(value):
    if not isinstance(value, str) or not value:
        return value

    normalized = value
    replacements = [
        ("Kullanici adi", "Kullanıcı Adı"),
        ("Gorev tamamlandi", "Görev Tamamlandı"),
        ("Bagimsiz gorev", "Bağımsız Görev"),
        ("Yeni ekip mesaji", "Yeni Ekip Mesajı"),
        ("bir mesaj gonderdi.", "bir mesaj gönderdi."),
        ("Proje bilgisi guncellendi", "Proje bilgisi güncellendi"),
        ("guncelleme var.", "güncelleme var."),
        ("Size yeni gorev atandi", "Size Yeni Görev Atandı"),
        ("Size gorev atandi", "Size Görev Atandı"),
        ("Yonetici destek taleplerini takip ediyor.", "Yönetici destek taleplerini takip ediyor."),
        ("Takim mesaji gonderildi", "Takım mesajı gönderildi"),
        ("Proje baglanmadi", "Proje bağlanmadı"),
        ("Ic proje", "İç proje"),
        ("Atanmadi", "Atanmadı"),
        ("Mesgul", "Meşgul"),
        ("Musait", "Müsait"),
        ("Kullanici", "Kullanıcı"),
        ("kayitli", "kayıtlı"),
        ("sifre", "şifre"),
        ("bulunamadi", "bulunamadı"),
        ("dogrulamasi", "doğrulaması"),
        ("basarisiz", "başarısız"),
        ("kimligi", "kimliği"),
        ("eslesmedi", "eşleşmedi"),
        ("hesabi", "hesabı"),
        ("dogrulanmis", "doğrulanmış"),
        ("dondurmedi", "döndürmedi"),
        ("ekip uyesi", "ekip üyesi"),
        ("icindeki", "içindeki"),
        ("gorevini", "görevini"),
        ("gorevi", "görevi"),
        ("gorev", "görev"),
        ("tamamladi", "tamamladı"),
        ("atandi", "atandı"),
        ("gonderdi", "gönderdi"),
    ]

    for old, new in replacements:
        normalized = normalized.replace(old, new)

    return normalized
