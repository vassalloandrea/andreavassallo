import { Controller } from "@hotwired/stimulus";

export default class GalleryController extends Controller<HTMLElement> {
  static override targets = ["mainImage", "counter", "thumbnail", "modal", "fullscreenImage"];
  static override values = {
    images: { type: Array, default: [] },
    index: { type: Number, default: 0 },
  };

  declare mainImageTarget: HTMLImageElement;
  declare counterTarget: HTMLElement;
  declare thumbnailTargets: HTMLButtonElement[];
  declare modalTarget: HTMLElement;
  declare fullscreenImageTarget: HTMLImageElement;

  declare hasMainImageTarget: boolean;
  declare hasCounterTarget: boolean;
  declare hasModalTarget: boolean;
  declare hasFullscreenImageTarget: boolean;

  declare imagesValue: string[];
  declare indexValue: number;

  private touchStartX = 0;
  private touchEndX = 0;
  private readonly SWIPE_THRESHOLD = 50;

  override connect(): void {
    window.addEventListener("keydown", this.handleKeydown);
    this.element.addEventListener("touchstart", this.handleTouchStart, { passive: true });
    this.element.addEventListener("touchend", this.handleTouchEnd, { passive: true });
  }

  override disconnect(): void {
    window.removeEventListener("keydown", this.handleKeydown);
    this.element.removeEventListener("touchstart", this.handleTouchStart);
    this.element.removeEventListener("touchend", this.handleTouchEnd);
  }

  indexValueChanged(): void {
    this.updateDisplay();
  }

  next(): void {
    if (this.imagesValue.length === 0) return;
    this.indexValue = (this.indexValue + 1) % this.imagesValue.length;
  }

  prev(): void {
    if (this.imagesValue.length === 0) return;
    this.indexValue = (this.indexValue - 1 + this.imagesValue.length) % this.imagesValue.length;
  }

  goTo(event: Event): void {
    const params = (event as CustomEvent & { params?: { index?: number } }).params;
    if (params && typeof params.index === "number") {
      this.indexValue = params.index;
    }
  }

  openFullscreen(): void {
    if (!this.hasModalTarget) return;

    this.modalTarget.classList.remove("hidden");
    this.modalTarget.classList.add("flex");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      this.modalTarget.classList.remove("opacity-0");
      this.modalTarget.classList.add("opacity-100");
    });

    this.updateDisplay();
  }

  closeFullscreen(): void {
    if (!this.hasModalTarget) return;

    this.modalTarget.classList.remove("opacity-100");
    this.modalTarget.classList.add("opacity-0");
    document.body.style.overflow = "";

    const onTransitionEnd = (): void => {
      this.modalTarget.classList.add("hidden");
      this.modalTarget.classList.remove("flex");
      this.modalTarget.removeEventListener("transitionend", onTransitionEnd);
    };

    this.modalTarget.addEventListener("transitionend", onTransitionEnd);
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.hasModalTarget) return;

    const isModalOpen = !this.modalTarget.classList.contains("hidden");
    if (!isModalOpen) return;

    switch (event.key) {
      case "Escape":
        this.closeFullscreen();
        break;
      case "ArrowLeft":
        this.prev();
        break;
      case "ArrowRight":
        this.next();
        break;
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (touch) {
      this.touchStartX = touch.clientX;
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    if (touch) {
      this.touchEndX = touch.clientX;
      this.handleSwipe();
    }
  };

  private handleSwipe(): void {
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) < this.SWIPE_THRESHOLD) return;

    if (diff > 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  private updateDisplay(): void {
    const idx = this.indexValue;
    const src = this.imagesValue[idx];

    if (!src) return;

    if (this.hasMainImageTarget) {
      this.mainImageTarget.setAttribute("src", src);
    }

    if (this.hasCounterTarget) {
      this.counterTarget.textContent = String(idx + 1);
    }

    this.thumbnailTargets.forEach((thumb, i) => {
      if (i === idx) {
        thumb.classList.add("border-primary", "opacity-100");
        thumb.classList.remove("border-transparent", "opacity-60");
        thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } else {
        thumb.classList.remove("border-primary", "opacity-100");
        thumb.classList.add("border-transparent", "opacity-60");
      }
    });

    if (this.hasFullscreenImageTarget) {
      this.fullscreenImageTarget.setAttribute("src", src);
    }
  }
}
