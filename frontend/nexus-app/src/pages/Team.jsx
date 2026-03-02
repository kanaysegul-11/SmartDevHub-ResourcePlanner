"use client";
import React, { useState } from "react";
import { useList, useCreate, useDelete, useInvalidate } from "@refinedev/core";
import Sidebar from "../component/layout/Sidebar";
import TeamHeader from "../component/team/TeamHeader.jsx";
import TeamForm from "../component/team/TeamForm.jsx";
import TeamList from "../component/team/TeamList.jsx";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import { Badge } from "../ui/components/Badge";
import { FeatherBriefcase, FeatherCoffee, FeatherUsers } from "@subframe/core";

function Team() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: "",
    position: "",
    current_work: "",
    status_type: "available",
  });

  const { result: teamResult, query: teamQuery } = useList({
    resource: "status",
  });
  const { mutate: createMember, isLoading: isCreating } = useCreate();
  const { mutate: deleteMember } = useDelete();
  const invalidate = useInvalidate();

  const teamMembers = teamResult?.data ?? [];

  const activeProjectMembers = teamMembers.filter(
    (m) => m.status_type === "busy"
  );
  const availableMembers = teamMembers.filter(
    (m) => m.status_type === "available"
  );

  const handleAddMember = (e) => {
    e.preventDefault();
    createMember(
      { resource: "status", values: formData },
      {
        onSuccess: () => {
          setFormData({
            employee_name: "",
            position: "",
            current_work: "",
            status_type: "available",
          });
          setShowForm(false);
          invalidate({ resource: "status", invalidates: ["list"] });
        },
        onError: (err) => {
          alert("Ekleme basarisiz!", err);
        },
      }
    );
  };

  const handleDelete = (id) => {
    if (window.confirm("Bu üyeyi silmek istediğine emin misin?")) {
      deleteMember(
        { resource: "status", id },
        {
          onSuccess: () =>
            invalidate({ resource: "status", invalidates: ["list"] }),
          onError: (err) => console.error("Silme hatasi:", err),
        }
      );
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

      <div className="flex grow flex-col items-start self-stretch overflow-y-auto bg-default-background pb-20">
        <TopbarWithRightNav
          className="border-b border-solid border-neutral-border bg-white px-8 py-3"
          leftSlot={
            <Badge variant="neutral" icon={<FeatherUsers />}>
              Team Workspace
            </Badge>
          }
          rightSlot={<Badge variant="success">Canlı</Badge>}
        />

        <TeamHeader loading={teamQuery?.isLoading || isCreating} />

        <div className="flex w-full flex-col items-start gap-12 px-8 py-8">
          <TeamForm
            show={showForm}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleAddMember}
            isSubmitting={isCreating}
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
