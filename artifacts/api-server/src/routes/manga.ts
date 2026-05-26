import { Router } from "express";

const router = Router();
const MANGADEX_BASE = "https://api.mangadex.org";

async function proxyGet(path: string, query: string): Promise<unknown> {
  const url = `${MANGADEX_BASE}${path}${query ? "?" + query : ""}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MangaApp/1.0 (contact@example.com)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`MangaDex error: ${res.status}`);
  }
  return res.json();
}

router.get("/manga", async (req, res) => {
  try {
    const data = await proxyGet("/manga", req.url.split("?")[1] ?? "");
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "manga proxy error");
    res.status(502).json({ error: "upstream error" });
  }
});

router.get("/manga/:id", async (req, res) => {
  try {
    const data = await proxyGet(
      `/manga/${req.params["id"]}`,
      req.url.split("?")[1] ?? ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "manga detail proxy error");
    res.status(502).json({ error: "upstream error" });
  }
});

router.get("/manga/:id/feed", async (req, res) => {
  try {
    const data = await proxyGet(
      `/manga/${req.params["id"]}/feed`,
      req.url.split("?")[1] ?? ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "manga feed proxy error");
    res.status(502).json({ error: "upstream error" });
  }
});

router.get("/at-home/server/:chapterId", async (req, res) => {
  try {
    const data = await proxyGet(
      `/at-home/server/${req.params["chapterId"]}`,
      ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "at-home proxy error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
