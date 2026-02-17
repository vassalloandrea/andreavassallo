import { Controller } from "@hotwired/stimulus";

export default class GardenLazyCardController extends Controller<HTMLElement> {
  static override values = {
    id: { type: String, required: true },
    collection: { type: String, required: true },
  };

  declare idValue: string;
  declare collectionValue: string;

  private observer: IntersectionObserver | null = null;
  private isLoading = false;
  private isLoaded = false;

  override connect(): void {
    this.element.innerHTML = this.getPlaceholderHTML();

    const observerOptions = {
      root: null,
      rootMargin: "50px",
      threshold: 0.01,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.isLoading && !this.isLoaded) {
          this.loadCard();
          if (this.observer) {
            this.observer.unobserve(this.element);
          }
        }
      });
    }, observerOptions);

    this.observer.observe(this.element);
  }

  override disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private getPlaceholderHTML(): string {
    return `
      <div
        data-slot="card"
        class="bg-card text-card-foreground h-full flex flex-col gap-6 rounded-xl border border-border/50 py-6 shadow-sm transition-all duration-300"
      >
        <!-- Content Skeleton -->
        <div class="px-6 space-y-4">
          <!-- Title Line -->
          <div class="h-6 bg-muted rounded animate-pulse w-3/4"></div>

          <!-- Description Lines -->
          <div class="space-y-2 pt-2">
            <div class="h-3 bg-muted rounded animate-pulse"></div>
            <div class="h-3 bg-muted rounded animate-pulse w-5/6"></div>
            <div class="h-3 bg-muted rounded animate-pulse w-4/6"></div>
          </div>
        </div>
      </div>
    `;
  }

  private async loadCard(): Promise<void> {
    if (this.isLoading || this.isLoaded) {
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch(
        `/card/${encodeURIComponent(this.collectionValue)}/${encodeURIComponent(this.idValue)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load card: ${response.statusText}`);
      }

      const html = await response.text();

      // Create a temporary container to parse the HTML
      const temp = document.createElement("div");
      temp.innerHTML = html.trim();

      // Replace placeholder with the fetched content
      const cardContent = temp.querySelector("*[data-slot='card']") as HTMLDivElement;
      const paragraph = cardContent?.querySelector(".card-paragraph");

      if (paragraph) {
        if (this.element.dataset.contentCardDimensionValue === "2x2") {
          paragraph.classList.add("2xl:line-clamp-12");
        } else if (this.element.dataset.contentCardDimensionValue === "2x1") {
          paragraph.classList.add("2xl:line-clamp-3");
        } else if (this.element.dataset.contentCardDimensionValue === "1x2") {
          paragraph.classList.add("2xl:line-clamp-12");
        } else {
          paragraph.classList.add("2xl:line-clamp-3");
        }

        paragraph.classList.add("line-clamp-4");
      }

      if (cardContent) {
        this.element.innerHTML = "";
        this.element.appendChild(cardContent);
        this.isLoaded = true;
      } else {
        throw new Error("No content received");
      }
    } catch (error) {
      console.error(`Error loading card for ${this.idValue}:`, error);

      this.element.innerHTML = `
        <div
          data-slot="card"
          class="group bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/50 py-6 shadow-sm transition-all duration-300 cursor-pointer hover:bg-secondary/50 hover:border-primary/30 hover:shadow-lg"
        >
          <p class="px-4 text-muted-foreground">Failed to load the card.</p>
        </div>
      `;
    } finally {
      this.isLoading = false;
    }
  }
}
