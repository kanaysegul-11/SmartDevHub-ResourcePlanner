"use client";
import React from "react";
import { FeatherBell } from "@subframe/core";

function NotificationsPanel() {
  return (
    <div className="animate-in fade-in flex h-full flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <FeatherBell size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">Cok Yakinda</h3>
      <p className="max-w-xs text-sm text-slate-400">
        E-posta ve tarayici bildirim tercihleri yakinda bu panel uzerinden yonetilebilecek.
      </p>
    </div>
  );
}

export default NotificationsPanel;
