# AI Rule Files

Bu klasör, farklı AI araçlarına aynı mühendislik standardını vermek için hazırlanmış ayrık kural dosyalarını içerir.

Kullanım sırası:

1. `00-master-ai-coding-standard.md`
2. `01-core-engineering-rules.md`
3. `02-frontend-react-rules.md`
4. `03-backend-api-rules.md`
5. `04-validation-and-delivery-rules.md`
6. `05-project-ai-output-contract.md`
7. `06-team-ai-collaboration-rules.md`

Her AI aracına aynı görev verilirken bu dosyalar promptun üst bağlamı olarak eklenmelidir. Amaç her AI'ın birebir aynı metni üretmesi değil, aynı dosya düzeni, naming, test, güvenlik ve teslim standardına göre kod üretmesidir.

`05-project-ai-output-contract.md` dosyası özellikle hocanın "farklı AI kullanılsa bile tek ekip standardı" beklentisini karşılar. Bu dosya backend alan adlarını, frontend dosya yollarını, JSX tercihini, API client kullanımını, mock data yasağını ve "yeni ekran değil mevcut projeye patch" teslim şeklini sabitler.

`06-team-ai-collaboration-rules.md` dosyası ise birden fazla frontend geliştiricinin aynı işi farklı AI araçlarıyla yürütmesini standartlaştırır. Bu dosya dosya sahipliğini, görev bölüşümünü, ortak component dilini, review checklistini ve çelişki durumunda kod üretmeden önce durma kuralını tanımlar.
