"use client";
import React, { useState } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { useForm } from "@refinedev/core";
import { Button } from "../ui/components/Button";
import { scanCodeSecurity } from "../utils/SecurityScanner";
import { notification } from "antd";
import {
  FeatherZap,
  FeatherChevronLeft,
} from "@subframe/core";

function CreateSnippet() {
  
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    language: "python",
  });

  const {data: allSnippets} = useList({resource:"snippets"});
  // 1. BURASI DEĞİŞTİ: Refine'ın onFinish fonksiyonunu 'handleRefineSubmit' adıyla alıyoruz
  const { onFinish: handleRefineSubmit, formLoading } = useForm({
    resource: "snippets",
    action: "create",
  });

  // 2. Kendi onFinish fonksiyonumuz (Güvenlik Kontrollü)
const onFinish = async (values) => {
    const codeToScan = values?.code ?? ""; 
    const risks = scanCodeSecurity(codeToScan);

   const isDuplicate = allSnippets?.data?.some(
    (item) => item.code.replace(/\s/g, '') === values.code.replace(/\s/g, '')
  );

  if (isDuplicate) {
    notification.warning({
      message: "MÜKERRER KAYIT",
      description: "Bu kodun aynısı (boşluklar dahil) kütüphanede zaten var.",
    });
    return false; // Kaydı durdurur
  }
    // GÜVENLİK KONTROLÜ
    if (risks.length > 0) {
      notification.error({
        message: "GÜVENLİK ENGELİ",
        description: `Tehlikeli komut tespit edildi: ${risks[0].message}.`,
        placement: "topRight",
        duration: 5,
      });
      return false; // Kayıt durduruldu
    }
    try{

    await handleRefineSubmit(values); 
      
      notification.success({
        message: "BAŞARILI",
        description: "Snippet güvenli şekilde kütüphaneye eklendi.",
        placement: "topRight",
      });
      return true; // Yönlendirme için true döndürür
    } catch (error) {
      // Terminaldeki o "400" hatasını burada yakalıyoruz
      console.error("Backend Hatası:", error);

      // Backend'den gelen spesifik hata mesajını göster
      // Refine/Axios genellikle hatayı error.response.data içinde tutar
      const serverMessage = error?.response?.data?.code?.[0] || 
                            error?.response?.data?.non_field_errors?.[0] || 
                            "Bu kod zaten kütüphanede mevcut!";

      notification.error({
        message: "KAYIT ENGELLENDİ",
        description: serverMessage,
        placement: "topRight",
        duration: 5,
      });

      return false; // Hata olduğu için yönlendirmeyi iptal eder
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // onFinish fonksiyonumuz başarılı olursa (true dönerse) yönlendir
    const success = await onFinish(formData);
    if (success) {
      navigate("/snippets");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc]">
      <div className="flex w-64 flex-col gap-8 border-r bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
            <FeatherZap className="text-white" />
          </div>
          <span className="text-xl font-bold">Nexus</span>
        </div>
        <Button
          className="w-full justify-start"
          variant="neutral-tertiary"
          icon={<FeatherChevronLeft />}
          onClick={() => navigate("/snippets")}
        >
          Geri Dön
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto px-20 py-10">
        <h1 className="mb-8 text-3xl font-black">Yeni Kod Ekle</h1>
        <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
          <input
            className="rounded-2xl border p-4 outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Başlık"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <select
            className="rounded-2xl border p-4 outline-none"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="react/js">React/JS</option>
            <option value="bash">Bash</option>
          </select>
          <textarea
            className="rounded-2xl border p-4 outline-none"
            placeholder="Açıklama"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <textarea
            className="min-h-[300px] rounded-3xl bg-[#0d1117] p-6 font-mono text-blue-100 outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="// Kodunuz..."
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <Button
            type="submit"
            className="rounded-2xl bg-purple-600 py-4 text-white font-bold"
            disabled={formLoading}
          >
            {formLoading ? "Kaydediliyor..." : "Kütüphaneye Kaydet"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default CreateSnippet;