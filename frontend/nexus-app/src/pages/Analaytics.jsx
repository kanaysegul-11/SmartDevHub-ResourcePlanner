import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  // Örnek Veri: Backend'den çekilecek şekilde düşünelim
  const snippetStats = [
    { name: 'Python', usage: 45, satisfaction: 85 },
    { name: 'JavaScript', usage: 72, satisfaction: 90 },
    { name: 'React', usage: 60, satisfaction: 75 },
    { name: 'Django', usage: 38, satisfaction: 95 },
  ];

  const sentimentData = [
    { name: 'Memnun (Mutlu)', value: 75, color: '#10B981' }, // Yeşil
    { name: 'Nötr', value: 15, color: '#F59E0B' },           // Turuncu
    { name: 'Mutsuz', value: 10, color: '#EF4444' },           // Kırmızı
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Üst Başlık */}
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-slate-800">Snippet Analitiği</h1>
        <p className="text-slate-500 text-sm">Kod kütüphanenizin kullanım ve memnuniyet oranları.</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Toplam Kullanım</p>
          <h3 className="text-3xl font-bold text-indigo-600">1,284</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Ort. Memnuniyet</p>
          <h3 className="text-3xl font-bold text-emerald-500">%88</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">En Popüler Dil</p>
          <h3 className="text-3xl font-bold text-orange-500">JavaScript</h3>
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kullanım Grafiği */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
          <h2 className="text-lg font-semibold mb-4">Dillere Göre Kullanım Sıklığı</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snippetStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Duygu Analizi (Memnuniyet) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
          <h2 className="text-lg font-semibold mb-4">Genel Kullanıcı Deneyimi (Mutluluk)</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;