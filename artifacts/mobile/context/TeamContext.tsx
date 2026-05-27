import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface TeamManga {
  id: string;
  title: string;
  coverUrl?: string;
  localCoverUri?: string;
  description?: string;
}

export interface Team {
  name: string;
  description: string;
  emoji: string;
  members: TeamMember[];
  manga: TeamManga[];
  createdAt: number;
}

interface TeamContextType {
  team: Team | null;
  createTeam: (t: Omit<Team, "members" | "manga" | "createdAt">) => void;
  updateTeam: (updates: Partial<Omit<Team, "members" | "manga" | "createdAt">>) => void;
  deleteTeam: () => void;
  addMember: (member: Omit<TeamMember, "id">) => void;
  removeMember: (id: string) => void;
  addManga: (m: TeamManga) => void;
  removeManga: (id: string) => void;
  updateManga: (id: string, updates: Partial<TeamManga>) => void;
}

const KEY = "@translation_team";

const TeamContext = createContext<TeamContextType>({
  team: null,
  createTeam: () => {},
  updateTeam: () => {},
  deleteTeam: () => {},
  addMember: () => {},
  removeMember: () => {},
  addManga: () => {},
  removeManga: () => {},
  updateManga: () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setTeam(JSON.parse(raw) as Team); } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  const save = useCallback((t: Team | null) => {
    setTeam(t);
    if (t) AsyncStorage.setItem(KEY, JSON.stringify(t)).catch(() => {});
    else    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const createTeam = useCallback((info: Omit<Team, "members" | "manga" | "createdAt">) => {
    save({ ...info, members: [], manga: [], createdAt: Date.now() });
  }, [save]);

  const updateTeam = useCallback((updates: Partial<Omit<Team, "members" | "manga" | "createdAt">>) => {
    if (!team) return;
    save({ ...team, ...updates });
  }, [team, save]);

  const deleteTeam = useCallback(() => save(null), [save]);

  const addMember = useCallback((member: Omit<TeamMember, "id">) => {
    if (!team) return;
    save({ ...team, members: [...team.members, { ...member, id: Date.now().toString() }] });
  }, [team, save]);

  const removeMember = useCallback((id: string) => {
    if (!team) return;
    save({ ...team, members: team.members.filter((m) => m.id !== id) });
  }, [team, save]);

  const addManga = useCallback((m: TeamManga) => {
    if (!team) return;
    if (team.manga.some((x) => x.id === m.id)) return;
    save({ ...team, manga: [...team.manga, m] });
  }, [team, save]);

  const removeManga = useCallback((id: string) => {
    if (!team) return;
    save({ ...team, manga: team.manga.filter((m) => m.id !== id) });
  }, [team, save]);

  const updateManga = useCallback((id: string, updates: Partial<TeamManga>) => {
    if (!team) return;
    save({ ...team, manga: team.manga.map((m) => m.id === id ? { ...m, ...updates } : m) });
  }, [team, save]);

  return (
    <TeamContext.Provider value={{ team, createTeam, updateTeam, deleteTeam, addMember, removeMember, addManga, removeManga, updateManga }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
