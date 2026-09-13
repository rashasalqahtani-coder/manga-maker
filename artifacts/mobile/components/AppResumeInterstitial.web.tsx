import { usePathname } from "expo-router";
import { useEffect, useState } from "react";

import { isAdBlockedPath } from "./appResumeInterstitialPolicy";

const ADSENSE_SCRIPT_ID = "nebola-adsense-script";
const ADSENSE_CONTAINER_ID = "nebola-adsense-banner";
const CONSENT_KEY = "nebola_privacy_consent_v1";
const CONSENT_EVENT = "nebola:privacy-consent-changed";

function hasAdvertisingConsent() {
  if (typeof window === "undefined") return false;
  return ["accepted", "granted", "true"].includes(
    window.localStorage.getItem(CONSENT_KEY) ?? "",
  );
}

function removeAdContainer() {
  document.getElementById(ADSENSE_CONTAINER_ID)?.remove();
}

export function AppResumeInterstitial() {
  const pathname = usePathname();
  const [hasConsent, setHasConsent] = useState(hasAdvertisingConsent);
  const clientId = process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const slotId = process.env.EXPO_PUBLIC_ADSENSE_SLOT_ID?.trim();

  useEffect(() => {
    const syncConsent = () => setHasConsent(hasAdvertisingConsent());
    window.addEventListener("storage", syncConsent);
    window.addEventListener(CONSENT_EVENT, syncConsent);

    return () => {
      window.removeEventListener("storage", syncConsent);
      window.removeEventListener(CONSENT_EVENT, syncConsent);
    };
  }, []);

  useEffect(() => {
    removeAdContainer();

    if (
      !hasConsent ||
      !clientId ||
      !slotId ||
      isAdBlockedPath(pathname)
    ) {
      return;
    }

    if (!document.getElementById(ADSENSE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      document.head.appendChild(script);
    }

    const container = document.createElement("aside");
    container.id = ADSENSE_CONTAINER_ID;
    container.setAttribute("aria-label", "إعلان");
    Object.assign(container.style, {
      position: "fixed",
      zIndex: "30",
      left: "50%",
      bottom: "82px",
      width: "min(100% - 24px, 728px)",
      minHeight: "50px",
      transform: "translateX(-50%)",
      overflow: "hidden",
      background: "transparent",
    });

    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = clientId;
    ad.dataset.adSlot = slotId;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    container.appendChild(ad);
    document.body.appendChild(container);

    try {
      const adsWindow = window as typeof window & {
        adsbygoogle?: Record<string, never>[];
      };
      (adsWindow.adsbygoogle ||= []).push({});
    } catch {
      removeAdContainer();
    }

    return removeAdContainer;
  }, [clientId, hasConsent, pathname, slotId]);

  return null;
}