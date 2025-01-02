import { Controller } from "@hotwired/stimulus";

export default class ContentGridFilterController extends Controller {
  static override targets = ["button", "menu"];
  declare readonly buttonTarget: HTMLElement;
  declare readonly menuTarget: HTMLElement;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isOpen = false;

  override connect() {
    this.close();
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  override disconnect() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    document.removeEventListener("click", this.handleClickOutside.bind(this));
  }

  handleClickOutside(event: MouseEvent) {
    if (this.isOpen && !this.element.contains(event.target as Node)) {
      this.close();
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    this.menuTarget.classList.remove("hidden");
    requestAnimationFrame(() => {
      this.menuTarget.classList.remove("opacity-0", "scale-95");
      this.menuTarget.classList.add("opacity-100", "scale-100");
    });
    this.isOpen = true;
  }

  close() {
    this.menuTarget.classList.remove("opacity-100", "scale-100");
    this.menuTarget.classList.add("opacity-0", "scale-95");

    this.closeTimeout = setTimeout(() => {
      this.menuTarget.classList.add("hidden");
      this.isOpen = false;
    }, 100);
  }
}
