"use client";
import React from "react";
import { Avatar } from "../../ui/components/Avatar";

function ProfileCard({ 
  member, 
  isOpen, 
  onClose,
  showCloseButton = true 
}) {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <div className="flex flex-col items-center text-center">
            <Avatar variant="brand" size="xlarge" className="mb-4 border-4 border-white shadow-lg">
              {member.employee_name?.[0]?.toUpperCase() || "U"}
            </Avatar>
            <h2 className="text-2xl font-bold text-white mb-1">
              {member.employee_name || "İsim Belirtilmemiş"}
            </h2>
            <p className="text-purple-100 text-sm">
              {member.position || "Pozisyon Belirtilmemiş"}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Mevcut Görev */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Mevcut Görevi
            </h3>
            <p className="text-slate-800 font-medium">
              {member.current_work || "Görev belirtilmemiş"}
            </p>
          </div>

          {/* Durum */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Mevcut Durum
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              member.status_type === 'busy' 
                ? 'bg-red-100 text-red-700' 
                : member.status_type === 'available'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {member.status_type === 'busy' 
                ? 'Meşgul' 
                : member.status_type === 'available'
                ? 'Ulaşılabilir'
                : 'Bilinmiyor'
              }
            </span>
          </div>

          {/* Son Güncelleme */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Son Güncelleme:</span>
            <span className="text-slate-700">
              {member.last_updated 
                ? new Date(member.last_updated).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Bilinmiyor'
              }
            </span>
          </div>

          {/* İletişim Bilgileri (Opsiyonel) */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              İletişim Bilgileri
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>email@company.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+90 555 123 45 67</span>
              </div>
            </div>
          </div>

          {/* Yetenekler (Opsiyonel) */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Yetenekler
            </h3>
            <div className="flex flex-wrap gap-2">
              {['React', 'Node.js', 'Python', 'Docker'].map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-slate-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
              Mesaj Gönder
            </button>
            <button className="flex-1 border border-purple-600 text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm">
              Profili Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
