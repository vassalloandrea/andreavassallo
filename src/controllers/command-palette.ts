import { Controller } from "@hotwired/stimulus";
import { actions } from "astro:actions";
import type { SearchResult } from "src/lib/zendo/config";
import { analytics } from "src/lib/analytics";

type StatusType = "sketch" | "surveying" | "charted";

type SearchResultResponse = SearchResult & {
  url: string;
};

interface StatusColors {
  selected: string;
  default: string;
}

export default class CommandPaletteController extends Controller {
  static override targets = [
    "palette",
    "backdrop",
    "dialog",
    "search",
    "results",
    "noResults",
    "groupTemplate",
    "itemTemplate",
  ];

  declare readonly paletteTarget: HTMLElement;
  declare readonly backdropTarget: HTMLElement;
  declare readonly dialogTarget: HTMLElement;
  declare readonly searchTarget: HTMLInputElement;
  declare readonly resultsTarget: HTMLElement;
  declare readonly noResultsTarget: HTMLElement;
  declare readonly groupTemplateTarget: HTMLTemplateElement;
  declare readonly itemTemplateTarget: HTMLTemplateElement;

  // State
  selectedIndex: number = -1;
  filteredItems: SearchResultResponse[] = [];
  searchTimeout: number | null = null;
  isLoading: boolean = false;

  // Constants
  readonly ANIMATION_DURATION: number = 300; // ms
  readonly DEBOUNCE_DELAY: number = 300; // ms

  readonly STATUS_SVGS: Record<StatusType, string> = {
    sketch: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    surveying: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    charted: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.835 14H5a1 1 0 0 0-.9.7l-2 6c-.1.1-.1.2-.1.3 0 .6.4 1 1 1h18c.6 0 1-.4 1-1 0-.1 0-.2-.1-.3l-2-6a1 1 0 0 0-.9-.7h-3.835"/></svg>`,
  };

  readonly STATUS_COLORS: Record<StatusType, StatusColors> = {
    sketch: {
      selected:
        "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 ring-1 ring-inset ring-green-600/20",
      default: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    },
    surveying: {
      selected:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 ring-1 ring-inset ring-yellow-600/20",
      default: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
    },
    charted: {
      selected: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 ring-1 ring-inset ring-blue-600/20",
      default: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    },
  };

  override connect(): void {
    // Set up event listeners
    document.addEventListener("click", this.handleDocumentClick.bind(this));
    this.searchTarget.addEventListener("input", this.handleSearchInput.bind(this));
    this.searchTarget.addEventListener("keydown", this.handleSearchKeydown.bind(this));
    document.addEventListener("keydown", this.handleGlobalKeydown.bind(this));

    // Add event listeners to command palette toggle elements
    document.querySelectorAll<HTMLElement>("[data-js-command-palette-toggle]").forEach((element) => {
      element.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.open();
      });
    });
  }

  override disconnect(): void {
    document.removeEventListener("click", this.handleDocumentClick.bind(this));
    this.searchTarget.removeEventListener("input", this.handleSearchInput.bind(this));
    this.searchTarget.removeEventListener("keydown", this.handleSearchKeydown.bind(this));
    document.removeEventListener("keydown", this.handleGlobalKeydown.bind(this));
  }

  // UI Control Methods
  open(): void {
    analytics.trackCommandPaletteOpen();

    // Prevent scrolling of the page when command palette is open
    document.body.style.overflow = "hidden";

    // Make the command palette visible but keep elements in initial state
    this.paletteTarget.classList.remove("hidden");

    // Ensure backdrop starts with opacity-0 if not already present
    this.backdropTarget.classList.add("opacity-0");

    // Force a reflow to ensure transitions work properly
    void this.backdropTarget.offsetWidth;

    // Start animations
    this.backdropTarget.classList.remove("opacity-0");

    // Small delay to ensure the transition works properly and create a staggered effect
    setTimeout(() => {
      this.dialogTarget.classList.remove("scale-95", "opacity-0");
      this.searchTarget.focus();
    }, 50);
  }

  close(): void {
    // Re-enable scrolling
    document.body.style.overflow = "";

    // Start animations
    this.backdropTarget.classList.add("opacity-0");
    this.dialogTarget.classList.add("scale-95", "opacity-0");

    // Wait for animations to complete before hiding
    setTimeout(() => {
      this.paletteTarget.classList.add("hidden");
      this.searchTarget.value = "";
      this.updateResults("");
      this.backdropTarget.classList.remove("opacity-0");
    }, this.ANIMATION_DURATION + 100);
  }

  // Formatting Methods
  formatDate(date: string | undefined): string {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  getStatusBadge(status: StatusType | undefined, isSelected: boolean = false): string {
    if (!status || !(status in this.STATUS_SVGS)) return "";

    const statusKey = status as StatusType;
    const icon = this.STATUS_SVGS[statusKey];
    const colorClass = isSelected ? this.STATUS_COLORS[statusKey].selected : this.STATUS_COLORS[statusKey].default;

    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colorClass}">${icon} ${status}</span>`;
  }

  // Search Methods
  async fetchSearchResults(query: string): Promise<SearchResultResponse[]> {
    if (!query) return [];

    this.isLoading = true;

    try {
      const result = await actions.search({ name: query });

      if (result.error) {
        console.error("Error fetching search results:", result.error);
        return [];
      }

      return result.data.items;
    } catch (error) {
      console.error("Error fetching search results:", error);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  updateResults(query: string): void {
    // Reset state for empty query
    if (query === "") {
      this.filteredItems = [];
      this.resultsTarget.classList.add("hidden");
      this.noResultsTarget.classList.add("hidden");
      return;
    }

    // Don't search if query is less than 3 characters
    if (query.length < 3) {
      this.resultsTarget.innerHTML =
        '<div class="px-4 py-2 text-muted-foreground">Type at least 3 characters to search...</div>';
      this.resultsTarget.classList.remove("hidden");
      this.noResultsTarget.classList.add("hidden");
      return;
    }

    // Show loading state
    this.resultsTarget.innerHTML = '<div class="px-4 py-2 text-muted-foreground">Loading...</div>';
    this.resultsTarget.classList.remove("hidden");
    this.noResultsTarget.classList.add("hidden");

    // Debounce the search
    if (this.searchTimeout !== null) {
      window.clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = window.setTimeout(async () => {
      // Track search
      analytics.trackSearch(query);

      // Fetch results
      this.filteredItems = await this.fetchSearchResults(query);

      // Handle no results case
      if (this.filteredItems.length === 0) {
        this.resultsTarget.classList.add("hidden");
        this.noResultsTarget.classList.remove("hidden");
        return;
      }

      // Show results
      this.resultsTarget.classList.remove("hidden");
      this.noResultsTarget.classList.add("hidden");

      this.renderSearchResults();
    }, this.DEBOUNCE_DELAY);
  }

  renderSearchResults(): void {
    // Group items by type
    const groupedByType = this.filteredItems.reduce((groups, item) => {
      if (!groups.has(item.type)) {
        groups.set(item.type, []);
      }
      groups.get(item.type)!.push(item);
      return groups;
    }, new Map<string, SearchResultResponse[]>());

    // Clear previous results
    this.resultsTarget.innerHTML = "";
    let currentIndex = 0;

    // Generate HTML for each group
    groupedByType.forEach((items, type) => {
      // Create group header
      const groupElement = this.groupTemplateTarget.content.cloneNode(true) as DocumentFragment;
      const groupDiv = groupElement.querySelector("div");
      if (groupDiv) {
        groupDiv.textContent = type;
      }
      this.resultsTarget.appendChild(groupElement);

      // Create items for this group
      for (const item of items) {
        const isSelected = currentIndex === this.selectedIndex;
        const itemElement = this.itemTemplateTarget.content.cloneNode(true) as DocumentFragment;
        const itemLink = itemElement.querySelector<HTMLAnchorElement>("a");
        if (!itemLink) continue;

        // Set up the item link
        itemLink.href = item.url;
        itemLink.dataset.index = currentIndex.toString();
        itemLink.dataset.id = item.id;
        if (isSelected) {
          itemLink.classList.add("bg-accent", "text-accent-foreground");
        }

        // Set the item name
        const nameSpan = itemLink.querySelector("span");
        if (nameSpan) {
          nameSpan.textContent = item.name;
        }

        // Set up status badge if present
        const statusBadge = itemLink.querySelector<HTMLElement>(".status-badge");
        if (item.status && statusBadge) {
          statusBadge.innerHTML = this.getStatusBadge(item.status, isSelected);
        } else if (statusBadge) {
          statusBadge.remove();
        }

        // Set up date if present
        const dateText = itemLink.querySelector<HTMLElement>(".date-text");
        if (item.date && dateText) {
          dateText.textContent = this.formatDate(item.date);
          if (isSelected) {
            dateText.classList.add("text-accent-foreground/80");
            dateText.classList.remove("text-muted-foreground");
          } else {
            dateText.classList.remove("text-accent-foreground/80");
            dateText.classList.add("text-muted-foreground");
          }
        } else if (dateText) {
          dateText.remove();
        }

        this.resultsTarget.appendChild(itemElement);
        currentIndex++;
      }
    });

    this.addEventListenersToResults();
  }

  // Navigation Methods
  addEventListenersToResults(): void {
    this.resultsTarget.querySelectorAll<HTMLElement>("[data-index]").forEach((item) => {
      // Handle click
      item.addEventListener("click", () => {
        const itemIndex = parseInt(item.dataset.index || "0", 10);
        const searchItem = this.filteredItems[itemIndex];
        if (searchItem) {
          analytics.trackCommandPaletteSelect(searchItem.name);
        }

        // The browser will handle navigation via the href attribute
        this.close();
      });

      // Handle hover
      item.addEventListener("mouseenter", (e: MouseEvent) => {
        const target = e.currentTarget as HTMLElement;
        this.selectedIndex = parseInt(target.dataset.index || "0", 10);
        this.highlightSelected();
      });
    });
  }

  highlightSelected(): void {
    this.resultsTarget.querySelectorAll<HTMLElement>("[data-index]").forEach((element) => {
      const item = element;
      const itemIndex = parseInt(item.dataset.index || "0", 10);
      const isSelected = itemIndex === this.selectedIndex;
      const currentItem = this.filteredItems[itemIndex];

      // Toggle main item highlight
      if (isSelected) {
        item.classList.add("bg-accent", "text-accent-foreground");
      } else {
        item.classList.remove("bg-accent", "text-accent-foreground");
      }

      // Update date text color if present
      const dateSpan = item.querySelector(".date-text");
      if (dateSpan) {
        if (isSelected) {
          dateSpan.classList.add("text-accent-foreground/80");
          dateSpan.classList.remove("text-muted-foreground");
        } else {
          dateSpan.classList.remove("text-accent-foreground/80");
          dateSpan.classList.add("text-muted-foreground");
        }
      }

      // Update status badge if present
      const statusBadge = item.querySelector<HTMLElement>(".rounded-full");
      if (statusBadge && currentItem?.status) {
        const status = currentItem.status as StatusType;
        const colorClass = isSelected ? this.STATUS_COLORS[status].selected : this.STATUS_COLORS[status].default;

        statusBadge.className = `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colorClass}`;
      }
    });
  }

  selectItem(item: SearchResultResponse): void {
    analytics.trackCommandPaletteSelect(item.name);
    window.location.href = item.url;
    this.close();
  }

  // Event Handlers
  handleDocumentClick(e: MouseEvent): void {
    // Only process if command palette is visible
    if (this.paletteTarget.classList.contains("hidden")) {
      return;
    }

    const target = e.target as Node;

    // Close if click is outside the dialog panel
    if (!this.dialogTarget.contains(target) && document.contains(target)) {
      this.close();
    }
  }

  handleSearchInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    this.selectedIndex = -1;
    this.updateResults(query);
  }

  handleSearchKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        this.close();
        break;

      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);

        // Initialize selection if none exists
        if (this.selectedIndex === -1 && this.filteredItems.length > 0) {
          this.selectedIndex = 0;
        }

        this.highlightSelected();
        break;

      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightSelected();
        break;

      case "Enter":
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredItems.length) {
          const item = this.filteredItems[this.selectedIndex];
          if (item) {
            this.selectItem(item);
          }
        }
        break;
    }
  }

  handleGlobalKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();

      if (this.paletteTarget.classList.contains("hidden")) {
        this.open();
      } else {
        this.close();
      }
    }
  }
}
