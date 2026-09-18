import { useUser } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface TeamChapter {
  id: string;
  number: string;
  title: string;
  imageUris?: string[];
}

export interface TeamManga {
  id: string;
  title: string;
  coverUrl?: string;
  localCoverUri?: string;
  description?: string;
  genres?: string[];
  chapters: TeamChapter[];
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
  addManga: (m: Omit<TeamManga, "chapters">) => void;
  removeManga: (id: string) => void;
  updateManga: (id: string, updates: Partial<Omit<TeamManga, "chapters">>) => void;
  addChapter: (mangaId: string, chapter: Omit<TeamChapter, "id">) => void;
  removeChapter: (mangaId: string, chapterId: string) => void;
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
  addChapter: () => {},
  removeChapter: () => {},
});

// Migrate old data that may be missing the `chapters` field
function migrate(raw: unknown): Team {
  const t = raw as Team;
  return {
    ...t,
    manga: (t.manga ?? []).map((m) => ({ ...m, chapters: m.chapters ?? [] })),
  };
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setTeam(null);
      return;
    }

    const userKey = `@translation_team_${user.id}`;
    AsyncStorage.getItem(userKey).then(async (raw) => {
      if (raw) {
        try {
          setTeam(migrate(JSON.parse(raw)));
          return;
        } catch {}
      }

      // Check legacy unscoped storage
      const legacyRaw = await AsyncStorage.getItem(KEY);
      if (legacyRaw) {
        try {
          const parsed = migrate(JSON.parse(legacyRaw));
          setTeam(parsed);
          await AsyncStorage.setItem(userKey, JSON.stringify(parsed));
          return;
        } catch {}
      }

      // Check Clerk cloud unsafeMetadata
      const cloudTeam = user.unsafeMetadata?.team as Team | undefined;
      if (cloudTeam) {
        const migrated = migrate(cloudTeam);
        setTeam(migrated);
        await AsyncStorage.setItem(userKey, JSON.stringify(migrated));
      } else {
        setTeam(null);
      }
    }).catch(() => {});
  }, [user?.id, isLoaded]);

  const save = useCallback(
    (t: Team | null) => {
      setTeam(t);
      const userKey = user?.id ? `@translation_team_${user.id}` : KEY;
      if (t) {
        AsyncStorage.setItem(userKey, JSON.stringify(t)).catch(() => {});
        if (user) {
          user.update({
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              team: t,
            },
          }).catch(() => {});
        }
      } else {
        AsyncStorage.removeItem(userKey).catch(() => {});
        if (user) {
          const newMeta = { ...(user.unsafeMetadata || {}) };
          delete newMeta.team;
          user.update({ unsafeMetadata: newMeta }).catch(() => {});
        }
      }
    },
    [user]
  );

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

  const addManga = useCallback((m: Omit<TeamManga, "chapters">) => {
    if (!team) return;
    if (team.manga.some((x) => x.id === m.id)) return;
    save({ ...team, manga: [...team.manga, { ...m, chapters: [] }] });
  }, [team, save]);

  const removeManga = useCallback((id: string) => {
    if (!team) return;
    save({ ...team, manga: team.manga.filter((m) => m.id !== id) });
  }, [team, save]);

  const updateManga = useCallback((id: string, updates: Partial<Omit<TeamManga, "chapters">>) => {
    if (!team) return;
    save({ ...team, manga: team.manga.map((m) => m.id === id ? { ...m, ...updates } : m) });
  }, [team, save]);

  const addChapter = useCallback((mangaId: string, chapter: Omit<TeamChapter, "id">) => {
    if (!team) return;
    save({
      ...team,
      manga: team.manga.map((m) =>
        m.id === mangaId
          ? { ...m, chapters: [...(m.chapters ?? []), { ...chapter, id: Date.now().toString() }] }
          : m
      ),
    });
  }, [team, save]);

  const removeChapter = useCallback((mangaId: string, chapterId: string) => {
    if (!team) return;
    save({
      ...team,
      manga: team.manga.map((m) =>
        m.id === mangaId
          ? { ...m, chapters: (m.chapters ?? []).filter((c) => c.id !== chapterId) }
          : m
      ),
    });
  }, [team, save]);

  return (
    <TeamContext.Provider value={{
      team, createTeam, updateTeam, deleteTeam,
      addMember, removeMember,
      addManga, removeManga, updateManga,
      addChapter, removeChapter,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
