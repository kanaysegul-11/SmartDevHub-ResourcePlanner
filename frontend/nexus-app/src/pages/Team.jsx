"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "../component/layout/Sidebar";
import TeamHeader from "../component/team/TeamHeader.jsx";
import TeamForm from "../component/team/TeamForm.jsx";
import TeamList from "../component/team/TeamList.jsx";
import { FeatherBriefcase, FeatherCoffee } from "@subframe/core";

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    employee_name: "",
    position: "",
    current_work: "",
    status_type: "available",
  });

  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Token ${token}` } };

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/status/", {
        headers: { Authorization: `Token ${storedToken}` },
      });
      setTeamMembers(res.data);
    } catch (err) {
      console.error("Veri çekme hatası:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const activeProjectMembers = teamMembers.filter((m) => m.status_type === "busy");
  const availableMembers = teamMembers.filter((m) => m.status_type === "available");

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const storedToken = localStorage.getItem("token");
      await axios.post("http://localhost:8000/api/status/", formData, {
        headers: { Authorization: `Token ${storedToken}` },
      });
      setFormData({ employee_name: "", position: "", current_work: "", status_type: "available" });
      setShowForm(false);
      fetchTeamData();
    } catch (err) {
      alert("Ekleme basarisiz!",err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu uyeyi silmek istedigine emin misin?")) {
      try {
        await axios.delete(`http://localhost:8000/api/status/${id}/`, config);
        fetchTeamData();
      } catch (err) {
        console.error("Silme hatasi:", err);
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeItem="team"
        showTeamSubmenu={true}
        logoutVariant="danger"
        logoClickable={true}
      />

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto pb-20">
        <TeamHeader loading={loading} />

        <div className="flex w-full flex-col items-start gap-12 px-8 py-8">
          <TeamForm
            show={showForm}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleAddMember}
          />

          <TeamList
            title="Aktif Projede Olanlar"
            count={activeProjectMembers.length}
            icon={<FeatherBriefcase size={20} />}
            members={activeProjectMembers}
            variant="busy"
            onDelete={handleDelete}
            emptyMessage="Şu an aktif projede kimse bulunmuyor."
          />

          <TeamList
            title="Yeni Proje İçin Müsait"
            count={availableMembers.length}
            icon={<FeatherCoffee size={20} />}
            members={availableMembers}
            variant="available"
            onDelete={handleDelete}
            emptyMessage="Tüm ekip üyeleri şu an meşgul."
          />
        </div>
      </div>
    </div>
  );
}

export default Team;