import { Router } from "express";

const router = Router();
const COMICK_BASE = "https://api.comick.io";

async function comickGet(path: string, query: string): Promise<unknown> {
  const url = `${COMICK_BASE}${path}${query ? "?" + query : ""}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MangaApp/1.0 (contact@example.com)",
      Accept: "application/json",
      Referer: "https://comick.io",
    },
  });
  if (!res.ok) {
    throw new Error(`ComicK error: ${res.status}`);
  }
  return res.json();
}

// Search manga
router.get("/search", async (req, res) => {
  try {
    const data = await comickGet("/v1.0/search", req.url.split("?")[1] ?? "");
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick search error");
    res.status(502).json({ error: "upstream error" });
  }
});

// Top / popular
router.get("/top", async (req, res) => {
  try {
    const data = await comickGet("/top", req.url.split("?")[1] ?? "");
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick top error");
    res.status(502).json({ error: "upstream error" });
  }
});

// Recent chapters
router.get("/chapter", async (req, res) => {
  try {
    const data = await comickGet("/v1.0/chapter", req.url.split("?")[1] ?? "");
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick chapter list error");
    res.status(502).json({ error: "upstream error" });
  }
});

// Manga detail by slug
router.get("/comic/:slug", async (req, res) => {
  try {
    const data = await comickGet(
      `/comic/${req.params["slug"]}`,
      req.url.split("?")[1] ?? ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick comic detail error");
    res.status(502).json({ error: "upstream error" });
  }
});

// Chapters list for a manga
router.get("/comic/:slug/chapters", async (req, res) => {
  try {
    const data = await comickGet(
      `/comic/${req.params["slug"]}/chapters`,
      req.url.split("?")[1] ?? ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick chapters error");
    res.status(502).json({ error: "upstream error" });
  }
});

// Chapter images by hid
router.get("/chapter/:hid", async (req, res) => {
  try {
    const data = await comickGet(
      `/chapter/${req.params["hid"]}`,
      req.url.split("?")[1] ?? ""
    );
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "comick chapter images error");
    res.status(502).json({ error: "upstream error" });
  }
});

export default router;
