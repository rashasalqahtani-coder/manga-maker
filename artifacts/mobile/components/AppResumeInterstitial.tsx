import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useGlobalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import type { InterstitialAd } from "react-native-google-mobile-ads";

const AD_UNIT_ID = "ca-app-pub-9653661950159959/4261913243";
const CHAPTERS_PER_AD = 3;
const STORAGE_PREFIX = "admob_interstitial_v1";
const COUNT_KEY = `${STORAGE_PREFIX}:chapter_count`;
const PENDING_KEY = `${STORAGE_PREFIX}:pending`;
const LAST_CHAPTER_KEY = `${STORAGE_PREFIX}:last_chapter`;

function getChapterKey(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string | null {
  if (!pathname.includes("/reader")) return null;

  const chapter =
    params.chapterId ??
    params.hid ??
    params.chapterNum;
  const chapterValue = Array.isArray(chapter) ? chapter[0] : chapter;

  return chapterValue ? `${pathname}:${chapterValue}` : pathname;
}

export function AppResumeInterstitial() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const appStateRef = useRef(AppState.currentState);
  const storageReadyRef = useRef(false);
  const chapterCountRef = useRef(0);
  const pendingRef = useRef(false);
  const lastChapterRef = useRef<string | null>(null);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const adLoadedRef = useRef(false);
  const showingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    void Promise.all([
      AsyncStorage.getItem(COUNT_KEY),
      AsyncStorage.getItem(PENDING_KEY),
      AsyncStorage.getItem(LAST_CHAPTER_KEY),
    ]).then(([count, pending, lastChapter]) => {
      chapterCountRef.current = Number.parseInt(count ?? "0", 10) || 0;
      pendingRef.current = pending === "true";
      lastChapterRef.current = lastChapter;
      storageReadyRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" || Constants.appOwnership === "expo") return;

    let active = true;
    let unsubscribeLoaded: (() => void) | undefined;
    let unsubscribeClosed: (() => void) | undefined;
    let unsubscribeError: (() => void) | undefined;

    void import("react-native-google-mobile-ads").then(async (ads) => {
      if (!active) return;

      await ads.default().initialize();
      if (!active) return;

      const unitId = __DEV__ ? ads.TestIds.INTERSTITIAL : AD_UNIT_ID;
      const interstitial = ads.InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitialRef.current = interstitial;
      unsubscribeLoaded = interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
        adLoadedRef.current = true;
      });
      unsubscribeClosed = interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
        adLoadedRef.current = false;
        interstitial.load();
      });
      unsubscribeError = interstitial.addAdEventListener(ads.AdEventType.ERROR, () => {
        adLoadedRef.current = false;
      });
      interstitial.load();
    }).catch(() => {
      adLoadedRef.current = false;
    });

    return () => {
      active = false;
      unsubscribeLoaded?.();
      unsubscribeClosed?.();
      unsubscribeError?.();
      interstitialRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!storageReadyRef.current || Platform.OS !== "android") return;

    const chapterKey = getChapterKey(
      pathname,
      params as Record<string, string | string[] | undefined>,
    );
    if (!chapterKey || chapterKey === lastChapterRef.current) return;

    lastChapterRef.current = chapterKey;
    void AsyncStorage.setItem(LAST_CHAPTER_KEY, chapterKey);

    if (pendingRef.current) return;

    chapterCountRef.current += 1;
    if (chapterCountRef.current >= CHAPTERS_PER_AD) {
      chapterCountRef.current = 0;
      pendingRef.current = true;
      void AsyncStorage.multiSet([
        [COUNT_KEY, "0"],
        [PENDING_KEY, "true"],
      ]);
      return;
    }

    void AsyncStorage.setItem(COUNT_KEY, String(chapterCountRef.current));
  }, [pathname, params]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToForeground =
        appStateRef.current !== "active" && nextState === "active";
      appStateRef.current = nextState;

      if (
        !returnedToForeground ||
        !pendingRef.current ||
        !adLoadedRef.current ||
        showingRef.current ||
        !interstitialRef.current
      ) {
        return;
      }

      showingRef.current = true;
      pendingRef.current = false;
      void AsyncStorage.setItem(PENDING_KEY, "false");

      void interstitialRef.current.show()
        .catch(() => {
          pendingRef.current = true;
          void AsyncStorage.setItem(PENDING_KEY, "true");
        })
        .finally(() => {
          showingRef.current = false;
        });
    });

    return () => subscription.remove();
  }, []);

  return null;
}