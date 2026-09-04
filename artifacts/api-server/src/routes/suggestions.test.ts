import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import express from "express";
import type { Server } from "node:http";
import { createSuggestionsRouter, type SuggestionsRepository } from "./suggestions";

type StoredSuggestion = {
  id: string;
  userId: string;
  status: "visible" | "hidden";
};

class MemorySuggestionsRepository implements SuggestionsRepository {
  suggestions = new Map<string, StoredSuggestion>();
  reports = new Map<string, { suggestionId: string; reporterUserId: string; reason: string }>();

  async findReportableSuggestion(id: string) {
    const suggestion = this.suggestions.get(id);
    return suggestion ? { id: suggestion.id, userId: suggestion.userId } : undefined;
  }

  async createReport(input: { id: string; suggestionId: string; reporterUserId: string; reason: string }) {
    const key = `${input.suggestionId}:${input.reporterUserId}`;
    if (!this.reports.has(key)) this.reports.set(key, input);
  }

  async deleteSuggestion(id: string, userId?: string) {
    const suggestion = this.suggestions.get(id);
    if (!suggestion || (userId && suggestion.userId !== userId)) return false;
    this.suggestions.delete(id);
    return true;
  }

  async listReports() {
    return [...this.reports.values()];
  }

  async setSuggestionStatus(id: string, status: "hidden" | "visible") {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return false;
    suggestion.status = status;
    return true;
  }
}

describe("suggestion authorization routes", () => {
  let server: Server;
  let baseUrl: string;
  let repository: MemorySuggestionsRepository;

  beforeEach(async () => {
    repository = new MemorySuggestionsRepository();
    repository.suggestions.set("suggestion-1", {
      id: "suggestion-1",
      userId: "owner",
      status: "visible",
    });

    const app = express();
    app.use(express.json());
    app.use(
      createSuggestionsRouter({
        getAuth: (req) => ({
          userId: req.header("x-test-user-id") ?? null,
          sessionClaims: {},
        }),
        isAdmin: async (userId) => userId === "admin",
        repository,
      }),
    );
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  async function request(path: string, options: RequestInit & { userId?: string } = {}) {
    const headers = new Headers(options.headers);
    if (options.userId) headers.set("x-test-user-id", options.userId);
    if (options.body) headers.set("content-type", "application/json");
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  }

  test("the owner can delete their suggestion", async () => {
    const response = await request("/suggestions/suggestion-1", {
      method: "DELETE",
      userId: "owner",
    });

    assert.equal(response.status, 200);
    assert.equal(repository.suggestions.has("suggestion-1"), false);
  });

  test("another reader cannot delete someone else's suggestion", async () => {
    const response = await request("/suggestions/suggestion-1", {
      method: "DELETE",
      userId: "other-reader",
    });

    assert.equal(response.status, 404);
    assert.equal(repository.suggestions.has("suggestion-1"), true);
  });

  test("a reader can report a suggestion only once with a valid reason", async () => {
    const report = () =>
      request("/suggestions/suggestion-1/reports", {
        method: "POST",
        userId: "other-reader",
        body: JSON.stringify({ reason: "spam" }),
      });

    assert.equal((await report()).status, 201);
    assert.equal((await report()).status, 201);
    assert.equal(repository.reports.size, 1);
    assert.equal([...repository.reports.values()][0]?.reason, "spam");

    const invalid = await request("/suggestions/suggestion-1/reports", {
      method: "POST",
      userId: "another-reader",
      body: JSON.stringify({ reason: "not-a-valid-reason" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(repository.reports.size, 1);
  });

  test("review and moderation routes reject readers and accept admins", async () => {
    const readerReview = await request("/admin/suggestion-reports", { userId: "other-reader" });
    const readerHide = await request("/admin/suggestions/suggestion-1", {
      method: "PATCH",
      userId: "other-reader",
      body: JSON.stringify({ action: "hide" }),
    });
    const readerDelete = await request("/admin/suggestions/suggestion-1", {
      method: "PATCH",
      userId: "other-reader",
      body: JSON.stringify({ action: "delete" }),
    });

    assert.equal(readerReview.status, 403);
    assert.equal(readerHide.status, 403);
    assert.equal(readerDelete.status, 403);
    assert.equal(repository.suggestions.get("suggestion-1")?.status, "visible");

    assert.equal((await request("/admin/suggestion-reports", { userId: "admin" })).status, 200);
    assert.equal(
      (
        await request("/admin/suggestions/suggestion-1", {
          method: "PATCH",
          userId: "admin",
          body: JSON.stringify({ action: "hide" }),
        })
      ).status,
      200,
    );
    assert.equal(repository.suggestions.get("suggestion-1")?.status, "hidden");

    assert.equal(
      (
        await request("/admin/suggestions/suggestion-1", {
          method: "PATCH",
          userId: "admin",
          body: JSON.stringify({ action: "restore" }),
        })
      ).status,
      200,
    );
    assert.equal(repository.suggestions.get("suggestion-1")?.status, "visible");

    assert.equal(
      (
        await request("/admin/suggestions/suggestion-1", {
          method: "PATCH",
          userId: "admin",
          body: JSON.stringify({ action: "delete" }),
        })
      ).status,
      200,
    );
    assert.equal(repository.suggestions.has("suggestion-1"), false);
  });
});