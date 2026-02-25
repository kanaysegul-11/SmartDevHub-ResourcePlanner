"use client";
import React from "react";

function TeamHeader({ loading }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-purple-600 font-bold">
        Yukleniyor...
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-4 border-b bg-white px-8 py-5 shadow-sm">
      <div className="grow">
        <span className="block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
          Ekip Yonetimi
        </span>
        <span className="text-sm font-medium text-slate-500">
          Projelerdeki ve merkezdeki calisanlarin anlik durumu.
        </span>
      </div>
    </div>
  );
}

export default TeamHeader;
