"use client";
import React, { useEffect, useState } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import Sidebar from "../component/layout/Sidebar";
import PuckErrorBoundary from "../component/common/PuckErrorBoundary";
import { createDefaultPuckData, puckEditorConfig } from "../puck/config";
import {
  fetchPageConfig,
  PAGE_KEY_DASHBOARD_LAYOUT,
  savePageConfig,
  normalizePuckData,
} from "../puck/pageConfigApi";

function PuckEditor() {
  const [data, setData] = useState(() => createDefaultPuckData());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        const payload = await fetchPageConfig(PAGE_KEY_DASHBOARD_LAYOUT);
        if (!isMounted) return;
        setData(normalizePuckData(payload));
      } catch (error) {
        if (!isMounted) return;
        console.error("Puck load error:", error);
        setData(createDefaultPuckData());
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
    if (!nextData || typeof nextData !== "object") {
      return;
    }
    setData(nextData);
  };

  const handlePublish = async (nextData) => {
    try {
      await savePageConfig(nextData, PAGE_KEY_DASHBOARD_LAYOUT);
      alert("Puck düzenlemeleri kaydedildi.");
    } catch (error) {
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
            Dashboard yerleşimini görsel olarak düzenleyip yayınlayın.
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
              Yükleniyor...
            </div>
          ) : (
            <PuckErrorBoundary onReset={() => setData(createDefaultPuckData())}>
              <Puck
                config={puckEditorConfig}
                data={data}
                onChange={handleChange}
                onPublish={handlePublish}
              />
            </PuckErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

export default PuckEditor;