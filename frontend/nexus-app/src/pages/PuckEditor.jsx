"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Sidebar from "../component/layout/Sidebar";
import { apiClient } from "../refine/axios";

const PAGE_KEY = "home";

const createDefaultData = () => ({
  content: [
    {
      type: "Hero",
      props: {
        title: "Nexus Control Center",
        subtitle: "Takım ve snippet yönetimini görsel olarak düzenleyin.",
        ctaLabel: "Yeni Blok Ekle",
      },
    },
    {
      type: "Stats",
      props: {
        items: [
          { label: "Toplam Snippet", value: "128" },
          { label: "Aktif Ekip", value: "12" },
          { label: "Çalışan Sistem", value: "Online" },
        ],
      },
    },
    {
      type: "Callout",
      props: {
        title: "Puck ile düzenleme",
        body:
          "Bu sayfa, sürükle-bırak bloklar ile özelleştirilebilir. Yayınla butonuyla kaydedin.",
      },
    },
  ],
  root: { props: {} },
});

function PuckEditor() {
  const config = useMemo(
    () => ({
      components: {
        Hero: {
          fields: {
            title: { type: "text" },
            subtitle: { type: "text" },
            ctaLabel: { type: "text" },
          },
          render: ({ title, subtitle, ctaLabel }) => (
            <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Visual Editor
                </span>
                <h1 className="text-3xl font-black text-slate-900">{title}</h1>
                <p className="text-base text-slate-600">{subtitle}</p>
                {ctaLabel ? (
                  <button className="mt-2 w-fit rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white">
                    {ctaLabel}
                  </button>
                ) : null}
              </div>
            </section>
          ),
        },
        Stats: {
          fields: {
            items: {
              type: "array",
              arrayFields: {
                label: { type: "text" },
                value: { type: "text" },
              },
            },
          },
          render: ({ items = [] }) => (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {items.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {item.value}
                  </div>
                </div>
              ))}
            </section>
          ),
        },
        Callout: {
          fields: {
            title: { type: "text" },
            body: { type: "text" },
          },
          render: ({ title, body }) => (
            <section className="rounded-3xl border border-purple-200 bg-purple-50 p-8">
              <h2 className="text-xl font-black text-purple-900">{title}</h2>
              <p className="mt-2 text-sm text-purple-700">{body}</p>
            </section>
          ),
        },
        Spacer: {
          fields: {
            size: { type: "number" },
          },
          render: ({ size = 32 }) => <div style={{ height: size }} />,
        },
      },
    }),
    []
  );

  const [data, setData] = useState(() => createDefaultData());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get(`/page-configs/${PAGE_KEY}/`);
        if (!isMounted) return;
        const payload = response.data?.data;
        setData(payload && payload.content ? payload : createDefaultData());
      } catch (error) {
        if (!isMounted) return;
        if (error?.response?.status === 404) {
          setData(createDefaultData());
        } else {
          console.error("Puck load error:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (nextData) => {
    setData(nextData);
  };

  const handlePublish = async (nextData) => {
    try {
      await apiClient.patch(`/page-configs/${PAGE_KEY}/`, { data: nextData });
      alert("Puck düzenlemeleri kaydedildi.");
    } catch (error) {
      if (error?.response?.status === 404) {
        await apiClient.post("/page-configs/", {
          key: PAGE_KEY,
          data: nextData,
        });
        alert("Puck düzenlemeleri kaydedildi.");
        return;
      }
      console.error("Puck save error:", error);
      alert("Kaydetme sırasında hata oluştu.");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar activeItem="puck" showTeamSubmenu={true} logoClickable={true} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-8 py-4">
          <h2 className="text-lg font-black text-slate-900">Puck Editor</h2>
          <p className="text-xs text-slate-500">
            İçerikleri görsel olarak düzenleyip yayınlayın.
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              Yükleniyor...
            </div>
          ) : (
            <Puck
              config={config}
              data={data}
              onChange={handleChange}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PuckEditor;
