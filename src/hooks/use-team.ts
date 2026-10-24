"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { teamApi, type TeamRole } from "@/lib/api/team";

export function useTeam() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["team", orgSlug], queryFn: teamApi.list });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teamApi.invite,
    onSuccess: (r) => {
      toast.success(r.new_account ? `Invited ${r.email}` : `${r.email} now has access`);
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not send the invite")),
  });
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: TeamRole }) => teamApi.setRole(id, role),
    onSuccess: () => {
      toast.success("Role changed");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the role")),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => {
      toast.success("Removed from the team");
      void qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not remove this person")),
  });
}
