export type GtagEvent =
  | "page_view"
  | "scroll"
  | "click"
  | "file_download"
  | "content_view"
  | "content_list_view"
  | "share"
  | "search"
  | "theme_toggle"
  | "command_palette_open"
  | "command_palette_select"
  | "back_to_top_click"
  | "navbar_click"
  | "footer_link_click"
  | "scroll_depth"
  | "time_on_page"
  | "newsletter_subscribe";

export interface BaseEventParams {
  [key: string]: string | number | boolean | undefined;
}

export interface PageViewParams extends BaseEventParams {
  page_title: string;
  page_location: string;
  page_path: string;
}

export interface ScrollParams extends BaseEventParams {
  percent_scrolled: number;
}

export interface ClickParams extends BaseEventParams {
  url: string;
  outbound: boolean;
  link_classes?: string;
  link_id?: string;
}

export interface ContentParams extends BaseEventParams {
  content_type: "waypoint" | "book" | "hike" | "writing" | "topic" | "page";
  content_id: string;
  content_title: string;
}

export interface ContentListParams extends BaseEventParams {
  content_type: "waypoint" | "book" | "hike" | "writing" | "topic";
  item_count: number;
}

export interface SearchParams extends BaseEventParams {
  search_term: string;
}

export interface ThemeParams extends BaseEventParams {
  theme: "light" | "dark";
}

export interface CommandPaletteSelectParams extends BaseEventParams {
  selected_item: string;
}

export interface NavClickParams extends BaseEventParams {
  nav_item: string;
}

export interface FooterLinkParams extends BaseEventParams {
  link_url: string;
}

export interface NewsletterSubscribeParams extends BaseEventParams {
  success: boolean;
  page_path: string;
}

export interface ScrollDepthParams extends BaseEventParams {
  percent_scrolled: number;
  page_path: string;
  page_title: string;
}

export interface TimeOnPageParams extends BaseEventParams {
  time_seconds: number;
  page_path: string;
}

export interface ShareParams extends BaseEventParams {
  method: string;
  content_type: string;
  content_id: string;
}

const CONTENT_SECTIONS = ["waypoints", "books", "hikes", "writings", "topics"] as const;
type ContentSection = (typeof CONTENT_SECTIONS)[number];

const SECTION_TO_TYPE: Record<ContentSection, ContentParams["content_type"]> = {
  waypoints: "waypoint",
  books: "book",
  hikes: "hike",
  writings: "writing",
  topics: "topic",
};

class AnalyticsOrchestrator {
  private static instance: AnalyticsOrchestrator;
  private isInitialized = false;
  private cleanupFunctions: (() => void)[] = [];
  private timeOnPageTimers: ReturnType<typeof setTimeout>[] = [];
  private trackedScrollDepths: Set<number> = new Set();

  private constructor() {}

  public static getInstance(): AnalyticsOrchestrator {
    if (!AnalyticsOrchestrator.instance) {
      AnalyticsOrchestrator.instance = new AnalyticsOrchestrator();
    }
    return AnalyticsOrchestrator.instance;
  }

  // --- Core Methods ---

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.handlePageLoad();

    document.addEventListener("astro:page-load", this.boundHandlePageLoad);
    document.addEventListener("astro:before-preparation", this.boundCleanup);

    this.isInitialized = true;
  }

  // Bound references so we can remove them properly
  private boundHandlePageLoad = () => this.handlePageLoad();
  private boundCleanup = () => this.cleanup();

  private isEnabled(): boolean {
    return typeof window !== "undefined" && typeof window.gtag === "function";
  }

  private send(event: GtagEvent, params?: BaseEventParams): void {
    if (import.meta.env.DEV) {
      console.log(`[Analytics:dev] ${event}`, params ?? "");
      return;
    }

    // Use gtag if available, otherwise queue via dataLayer
    // This handles the async timing issue where gtag script
    // hasn't loaded yet but we still want to capture events
    if (this.isEnabled()) {
      window.gtag("event", event, params);
    } else if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: event,
        ...params,
      });
    }
  }

  // --- Lifecycle ---

  private handlePageLoad(): void {
    this.trackedScrollDepths.clear();

    this.trackPageView();
    this.trackContentEvents();
    this.setupScrollTracking();
    this.setupTimeOnPageTracking();
    this.setupClickTracking();
  }

  private cleanup(): void {
    this.cleanupFunctions.forEach((fn) => fn());
    this.cleanupFunctions = [];

    this.timeOnPageTimers.forEach((timer) => clearTimeout(timer));
    this.timeOnPageTimers = [];
  }

  // --- Public API ---

  public trackPageView(): void {
    this.send("page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }

  public trackEvent(eventName: GtagEvent, params: BaseEventParams): void {
    this.send(eventName, params);
  }

  public trackContentView(params: ContentParams): void {
    this.send("content_view", params);
  }

  public trackContentListView(params: ContentListParams): void {
    this.send("content_list_view", params);
  }

  public trackSearch(term: string): void {
    this.send("search", { search_term: term });
  }

  public trackShare(params: ShareParams): void {
    this.send("share", params);
  }

  public trackThemeToggle(theme: "light" | "dark"): void {
    this.send("theme_toggle", { theme });
  }

  public trackCommandPaletteOpen(): void {
    this.send("command_palette_open");
  }

  public trackCommandPaletteSelect(item: string): void {
    this.send("command_palette_select", { selected_item: item });
  }

  public trackBackToTop(): void {
    this.send("back_to_top_click");
  }

  public trackNewsletterSubscribe(success: boolean): void {
    this.send("newsletter_subscribe", {
      success,
      page_path: window.location.pathname,
    });
  }

  // --- Internal Setup ---

  private setupScrollTracking(): void {
    const thresholds = [25, 50, 75, 90, 100];

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;

      if (maxScroll <= 0) return;

      const scrollPercent = Math.round((scrollTop / maxScroll) * 100);

      for (const threshold of thresholds) {
        if (scrollPercent >= threshold && !this.trackedScrollDepths.has(threshold)) {
          this.trackedScrollDepths.add(threshold);

          this.send("scroll_depth", {
            percent_scrolled: threshold,
            page_path: window.location.pathname,
            page_title: document.title,
          });
        }
      }
    };

    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", scrollListener, { passive: true });
    this.cleanupFunctions.push(() => window.removeEventListener("scroll", scrollListener));
  }

  private setupTimeOnPageTracking(): void {
    const thresholds = [10, 30, 60, 120, 300];
    const pagePath = window.location.pathname;

    for (const seconds of thresholds) {
      const timer = setTimeout(() => {
        if (document.visibilityState === "visible") {
          this.send("time_on_page", {
            time_seconds: seconds,
            page_path: pagePath,
          });
        }
      }, seconds * 1000);

      this.timeOnPageTimers.push(timer);
    }
  }

  private setupClickTracking(): void {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }

      const isExternal = url.origin !== window.location.origin;

      // Outbound links
      if (isExternal) {
        this.send("click", {
          url: href,
          outbound: true,
          link_classes: anchor.className || undefined,
          link_id: anchor.id || undefined,
        });
      }

      // Navbar clicks
      if (anchor.closest("nav")) {
        this.send("navbar_click", {
          nav_item: anchor.textContent?.trim() || href,
        });
      }

      // Footer clicks
      if (anchor.closest("footer")) {
        this.send("footer_link_click", { link_url: href });
      }

      // File downloads
      if (/\.(pdf|zip|docx|xlsx|pptx|mp3|mp4|csv)$/i.test(url.pathname)) {
        this.send("file_download", {
          file_name: url.pathname.split("/").pop() || "",
          file_extension: url.pathname.split(".").pop() || "",
          link_url: href,
        });
      }
    };

    document.addEventListener("click", handleClick);
    this.cleanupFunctions.push(() => document.removeEventListener("click", handleClick));
  }

  private trackContentEvents(): void {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 0) return;

    const section = segments[0] as ContentSection;

    if (!CONTENT_SECTIONS.includes(section)) return;

    const contentType = SECTION_TO_TYPE[section];
    const isDetail = segments.length > 1;

    if (isDetail) {
      this.send("content_view", {
        content_type: contentType,
        content_id: segments[1],
        content_title: document.title,
      });
    } else {
      this.send("content_list_view", {
        content_type: contentType,
        item_count: document.querySelectorAll('[data-slot="card"]').length,
      });
    }
  }
}

export const analytics = AnalyticsOrchestrator.getInstance();

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    analytics: AnalyticsOrchestrator;
  }
}

if (typeof window !== "undefined") {
  window.analytics = analytics;
}
