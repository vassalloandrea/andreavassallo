import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";

function syncDarkMode(): void {
  document.documentElement.classList.toggle("cc--darkmode", document.documentElement.classList.contains("dark"));
}

function updateGtagConsent(): void {
  if (typeof window.gtag !== "function") return;

  const granted = CookieConsent.acceptedCategory("analytics");

  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied", // Always denied as we don't use ads
  });

  if (granted) {
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }
}

export function initCookieConsent(): void {
  syncDarkMode();
  new MutationObserver(syncDarkMode).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  CookieConsent.run({
    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {},
    },
    guiOptions: {
      consentModal: {
        layout: "box",
        position: "bottom right",
      },
    },
    onFirstConsent: updateGtagConsent,
    onConsent: updateGtagConsent,
    onChange: updateGtagConsent,
    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "Cookie Settings",
            description:
              'I use cookies to understand how you use this site and improve your experience. No personal data is collected. <a href="/privacy">Read Privacy Policy</a>.',
            acceptAllBtn: "Accept Analytics",
            acceptNecessaryBtn: "Decline",
          },
          preferencesModal: {
            title: "Cookie Settings",
            acceptAllBtn: "Accept Analytics",
            acceptNecessaryBtn: "Decline",
            savePreferencesBtn: "Save preferences",
            closeIconLabel: "Close",
            sections: [
              {
                title: "Strictly necessary",
                description: "Required for the site to function. Always on.",
                linkedCategory: "necessary",
              },
              {
                title: "Analytics",
                description: "Helps me understand how the site is used. No personal data is collected.",
                linkedCategory: "analytics",
              },
            ],
          },
        },
      },
    },
  });

  document.addEventListener("open-cookie-settings", () => {
    CookieConsent.showPreferences();
  });
}
