const BASE = "/api";

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: string;
}

export async function getComments(entityType: string, entityId: string): Promise<Comment[]> {
  const res = await fetch(`${BASE}/comments/${entityType}/${entityId}`);
  if (!res.ok) throw new Error("failed to fetch comments");
  return res.json();
}

export async function postComment(
  entityType: string,
  entityId: string,
  body: { content: string; userName: string; userAvatar?: string },
  token: string,
): Promise<Comment> {
  const res = await fetch(`${BASE}/comments/${entityType}/${entityId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("failed to post comment");
  return res.json();
}

export async function deleteComment(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}/comments/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete comment");
}
