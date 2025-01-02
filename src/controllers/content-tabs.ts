import { Controller } from "@hotwired/stimulus";

export default class ContentTabsController extends Controller<HTMLElement> {
  static override targets = ["trigger", "content"];
  static override values = {
    param: { type: String, default: "section" },
  };

  declare triggerTargets: HTMLElement[];
  declare contentTargets: HTMLElement[];
  declare paramValue: string;

  override connect(): void {
    const indexFromURL = this.getIndexFromURL();

    if (indexFromURL !== null) {
      this.activateTab(indexFromURL);
    } else {
      const activeIndex = this.getActiveIndex();
      this.replaceURL(activeIndex);
    }

    this.animateActiveContent();
    window.addEventListener("popstate", this.handlePopState);
  }

  override disconnect(): void {
    window.removeEventListener("popstate", this.handlePopState);
  }

  switch(event: Event): void {
    const trigger = event.currentTarget as HTMLElement;
    const targetTab = trigger.getAttribute("data-content-tabs-tab-param");

    if (!targetTab) return;

    const index = this.triggerTargets.indexOf(trigger);
    this.activateTab(index);
    this.pushURL(index);
  }

  private handlePopState = (): void => {
    const index = this.getIndexFromURL();
    this.activateTab(index ?? 0);
  };

  private activateTab(index: number): void {
    const targetTrigger = this.triggerTargets[index];
    if (!targetTrigger) return;

    const targetTab = targetTrigger.getAttribute("data-content-tabs-tab-param");
    if (!targetTab) return;

    // Update triggers
    this.triggerTargets.forEach((t) => {
      const isActive = t.getAttribute("data-content-tabs-tab-param") === targetTab;
      t.setAttribute("data-state", isActive ? "active" : "inactive");
      t.setAttribute("aria-selected", isActive ? "true" : "false");
      t.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    // Update content panels
    this.contentTargets.forEach((content) => {
      if (content.getAttribute("data-content-tabs-key") === targetTab) {
        content.classList.remove("hidden");
        this.animateContent(content);
      } else {
        content.classList.add("hidden");
      }
    });
  }

  private getActiveIndex(): number {
    return this.triggerTargets.findIndex((t) => t.getAttribute("data-state") === "active");
  }

  private getIndexFromURL(): number | null {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(this.paramValue);

    if (value === null) return null;

    const index = parseInt(value, 10);

    if (isNaN(index) || index < 0 || index >= this.triggerTargets.length) {
      return null;
    }

    return index;
  }

  private buildURL(index: number): string {
    const url = new URL(window.location.href);
    url.searchParams.set(this.paramValue, String(index));
    return url.toString();
  }

  private replaceURL(index: number): void {
    window.history.replaceState({}, "", this.buildURL(index));
  }

  private pushURL(index: number): void {
    window.history.pushState({}, "", this.buildURL(index));
  }

  private animateActiveContent(): void {
    this.contentTargets.forEach((content) => {
      if (!content.classList.contains("hidden")) {
        this.animateContent(content);
      }
    });
  }

  private animateContent(content: Element): void {
    const items = content.querySelectorAll(".content-grid-item");
    items.forEach((item, index) => {
      item.classList.remove("animate-fade-in-up");
      (item as HTMLElement).style.animationDelay = `${index * 50}ms`;
      // Trigger reflow
      void (item as HTMLElement).offsetWidth;
      item.classList.add("animate-fade-in-up");
    });
  }
}
