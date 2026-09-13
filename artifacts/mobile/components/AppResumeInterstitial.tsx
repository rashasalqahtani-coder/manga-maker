import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useGlobalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import type { InterstitialAd } from "react-native-google-mobile-ads";
import {
  advanceChapterCount,
  advanceDownloadCount,
  isAdBlockedPath,
  selectAdUnitId,
} from "./appResumeInterstitialPolicy";
import { subscribeToCompletedChapterDownloads } from "@/lib/adScheduleEvents";

const AD_UNIT_ID = "ca-app-pub-9653661950159959/4261913243";
const STORAGE_PREFIX = "admob_interstitial_v1";
const COUNT_KEY = `${STORAGE_PREFIX}:chapter_count`;
const PENDING_KEY = `${STORAGE_PREFIX}:pending`;
const LAST_CHAPTER_KEY = `${STORAGE_PREFIX}:last_chapter`;
const QUEUE_KEY = `${STORAGE_PREFIX}:queued_ads`;
const DOWNLOAD_COUNT_KEY = `${STORAGE_PREFIX}:download_count`;

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
  const [storageReady, setStorageReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const pathnameRef = useRef(pathname);
  const chapterCountRef = useRef(0);
  const downloadCountRef = useRef(0);
  const queuedAdsRef = useRef(0);
  const lastChapterRef = useRef<string | null>(null);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const adLoadedRef = useRef(false);
  const showingRef = useRef(false);
  const showOpportunityRef = useRef(false);

  pathnameRef.current = pathname;

  const attemptToShowRef = useRef<() => void>(() => {});
  attemptToShowRef.current = () => {
    if (
      isAdBlockedPath(pathnameRef.current) ||
      appStateRef.current !== "active" ||
      queuedAdsRef.current < 1 ||
      !showOpportunityRef.current ||
      !adLoadedRef.current ||
      showingRef.current ||
      !interstitialRef.current
    ) {
      return;
    }

    showingRef.current = true;
    showOpportunityRef.current = false;
    adLoadedRef.current = false;
    queuedAdsRef.current -= 1;
    void AsyncStorage.setItem(QUEUE_KEY, String(queuedAdsRef.current));

    void interstitialRef.current.show()
      .catch(() => {
        queuedAdsRef.current += 1;
        showOpportunityRef.current = true;
        void AsyncStorage.setItem(QUEUE_KEY, String(queuedAdsRef.current));
      })
      .finally(() => {
        showingRef.current = false;
      });
  };

  const queueAdsRef = useRef<(count: number) => void>(() => {});
  queueAdsRef.current = (count: number) => {
    if (count < 1) return;
    queuedAdsRef.current += count;
    if (!showingRef.current) showOpportunityRef.current = true;
    void AsyncStorage.setItem(QUEUE_KEY, String(queuedAdsRef.current));
    attemptToShowRef.current();
  };

  const queueLaunchAdRef = useRef<() => void>(() => {});
  queueLaunchAdRef.current = () => {
    if (queuedAdsRef.current < 1) {
      queuedAdsRef.current = 1;
      void AsyncStorage.setItem(QUEUE_KEY, "1");
    }
    if (!showingRef.current) showOpportunityRef.current = true;
    attemptToShowRef.current();
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    void Promise.all([
      AsyncStorage.getItem(COUNT_KEY),
      AsyncStorage.getItem(PENDING_KEY),
      AsyncStorage.getItem(LAST_CHAPTER_KEY),
      AsyncStorage.getItem(QUEUE_KEY),
      AsyncStorage.getItem(DOWNLOAD_COUNT_KEY),
    ]).then(([count, pending, lastChapter, queuedAds, downloadCount]) => {
      chapterCountRef.current = Number.parseInt(count ?? "0", 10) || 0;
      downloadCountRef.current = Number.parseInt(downloadCount ?? "0", 10) || 0;
      queuedAdsRef.current = Math.max(
        Number.parseInt(queuedAds ?? "0", 10) || 0,
        pending === "true" ? 1 : 0,
      );
      lastChapterRef.current = lastChapter;
      void AsyncStorage.setItem(PENDING_KEY, "false");
      setStorageReady(true);
      queueLaunchAdRef.current();
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

      const unitId = selectAdUnitId(
        __DEV__,
        ads.TestIds.INTERSTITIAL,
        AD_UNIT_ID,
      );
      const interstitial = ads.InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitialRef.current = interstitial;
      unsubscribeLoaded = interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
        adLoadedRef.current = true;
        attemptToShowRef.current();
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
    if (!storageReady || Platform.OS !== "android") return;

    const chapterKey = getChapterKey(
      pathname,
      params as Record<string, string | string[] | undefined>,
    );
    if (!chapterKey || chapterKey === lastChapterRef.current) return;

    lastChapterRef.current = chapterKey;
    void AsyncStorage.setItem(LAST_CHAPTER_KEY, chapterKey);

    const next = advanceChapterCount(chapterCountRef.current);
    chapterCountRef.current = next.chapterCount;
    void AsyncStorage.setItem(COUNT_KEY, String(next.chapterCount));
    queueAdsRef.current(next.adsToQueue);
  }, [pathname, params, storageReady]);

  useEffect(() => {
    if (!storageReady || Platform.OS !== "android") return;

    return subscribeToCompletedChapterDownloads(() => {
      const next = advanceDownloadCount(downloadCountRef.current);
      downloadCountRef.current = next.downloadCount;
      void AsyncStorage.setItem(DOWNLOAD_COUNT_KEY, String(next.downloadCount));
      queueAdsRef.current(next.adsToQueue);
    });
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady || Platform.OS !== "android") return;
    attemptToShowRef.current();
  }, [pathname, storageReady]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToForeground =
        appStateRef.current !== "active" && nextState === "active";
      appStateRef.current = nextState;

      if (!returnedToForeground) return;
      queueLaunchAdRef.current();
    });

    return () => subscription.remove();
  }, []);

  return null;
}