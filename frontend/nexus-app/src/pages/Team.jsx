"use client";

import React from "react";
import {
  useCreate,
  useDelete,
  useInvalidate,
  useList,
  useUpdate,
} from "@refinedev/core";
import { FeatherBriefcase, FeatherCoffee, FeatherUsers } from "@subframe/core";

import Sidebar from "../component/layout/Sidebar";
import TeamDirectoryManager from "../component/team/TeamDirectoryManager.jsx";
import TeamHeader from "../component/team/TeamHeader.jsx";
import TeamList from "../component/team/TeamList.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

function Team() {
  const teamQuery = useList({
    resource: "status",
  });
  const { mutate: createMember, isLoading: isCreating } = useCreate();
  const { mutate: updateMember, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteMember } = useDelete();
  const invalidate = useInvalidate();

  const teamMembers = teamQuery.data?.data ?? [];
  const activeProjectMembers = teamMembers.filter(
    (member) => member.status_type === "busy"
  );
  const availableMembers = teamMembers.filter(
    (member) => member.status_type === "available"
  );

  const refreshTeam = () => {
    invalidate({ resource: "status", invalidates: ["list", "detail"] });
  };

  const handleCreateMember = (values) => {
    createMember(
      { resource: "status", values },
      {
        onSuccess: refreshTeam,
        onError: (error) => {
          console.error("Ekleme hatasi:", error);
          alert("Uye eklenemedi.");
        },
      }
    );
  };

  const handleUpdateMember = (id, values) => {
    updateMember(
      { resource: "status", id, values },
      {
        onSuccess: refreshTeam,
        onError: (error) => {
          console.error("Guncelleme hatasi:", error);
          alert("Uye guncellenemedi.");
        },
      }
    );
  };

  const handleDeleteMember = (id) => {
    if (!window.confirm("Bu uyeyi silmek istedigine emin misin?")) {
      return;
    }

    deleteMember(
      { resource: "status", id },
      {
        onSuccess: refreshTeam,
        onError: (error) => {
          console.error("Silme hatasi:", error);
          alert("Uye silinemedi.");
        },
      }
    );
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
          rightSlot={<Badge variant="success">Canli</Badge>}
        />

        <TeamHeader
          loading={teamQuery.isLoading || teamQuery.isFetching || isCreating}
        />

        <div className="grid w-full grid-cols-1 gap-8 px-8 py-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col items-start gap-12">
            <TeamList
              title="Aktif Projede Olanlar"
              count={activeProjectMembers.length}
              icon={<FeatherBriefcase size={20} />}
              members={activeProjectMembers}
              variant="busy"
              onDelete={handleDeleteMember}
              emptyMessage="Su an aktif projede kimse bulunmuyor."
            />

            <TeamList
              title="Yeni Proje Icin Musait"
              count={availableMembers.length}
              icon={<FeatherCoffee size={20} />}
              members={availableMembers}
              variant="available"
              onDelete={handleDeleteMember}
              emptyMessage="Tum ekip uyeleri su an mesgul."
            />
          </div>

          <TeamDirectoryManager
            members={teamMembers}
            isSubmitting={isCreating || isUpdating}
            onCreate={handleCreateMember}
            onUpdate={handleUpdateMember}
            onDelete={handleDeleteMember}
          />
        </div>
      </div>
    </div>
  );
}

export default Team;
