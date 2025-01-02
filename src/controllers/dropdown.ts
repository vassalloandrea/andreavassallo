import { Controller } from "@hotwired/stimulus";

export default class DropdownController extends Controller {
  static override targets = ["button", "menu"];
  declare readonly buttonTarget: HTMLElement;
  declare readonly menuTarget: HTMLElement;

  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isOpen = false;

  override connect() {
    this.closeTimeout = null;
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  override disconnect() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("click", this.handleClickOutside.bind(this));
  }

  handleClickOutside(event: MouseEvent) {
    if (this.isOpen && !this.element.contains(event.target as Node)) {
      this.close();
    }
  }

  toggle(event: MouseEvent) {
    if (event.type === "click") {
      event.stopPropagation();
      event.preventDefault(); // Prevent link navigation
    }
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
    this.menuTarget.style.display = "block";
    this.menuTarget.style.visibility = "hidden";
    this.menuTarget.style.opacity = "0";
    this.menuTarget.style.transform = "scale(0.95)";

    const rect = this.buttonTarget.getBoundingClientRect();
    const menuRect = this.menuTarget.getBoundingClientRect();

    this.menuTarget.style.position = "fixed";
    this.menuTarget.style.top = `${rect.bottom + 8}px`;
    this.menuTarget.style.left = `${rect.right - menuRect.width}px`;
    this.menuTarget.style.right = "auto";
    this.menuTarget.style.zIndex = "60";
    this.menuTarget.style.visibility = "visible";

    // Force reflow to enable transition from hidden state
    void this.menuTarget.offsetWidth;

    // Clear inline styles to let Tailwind classes take over for the transition
    this.menuTarget.style.opacity = "";
    this.menuTarget.style.transform = "";

    this.menuTarget.classList.remove("opacity-0", "scale-95");
    this.menuTarget.classList.add("opacity-100", "scale-100");
    this.buttonTarget.setAttribute("aria-expanded", "true");
    this.isOpen = true;
  }

  close() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }

    // Increased timeout to allow moving mouse from button to menu across the gap
    this.closeTimeout = setTimeout(() => {
      this.menuTarget.classList.remove("opacity-100", "scale-100");
      this.menuTarget.classList.add("opacity-0", "scale-95");
      this.buttonTarget.setAttribute("aria-expanded", "false");
      this.isOpen = false;

      // Wait for transition to complete before hiding
      setTimeout(() => {
        if (!this.isOpen) {
          this.menuTarget.classList.add("hidden");
          this.menuTarget.style.display = "";
          this.menuTarget.style.position = "";
          this.menuTarget.style.top = "";
          this.menuTarget.style.left = "";
          this.menuTarget.style.right = "";
          this.menuTarget.style.zIndex = "";
          this.menuTarget.style.visibility = "";
        }
      }, 100); // Matches transition duration in CSS
    }, 300);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.isOpen) {
      this.close();
    }
  }
}
