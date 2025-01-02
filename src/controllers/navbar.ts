import { Controller } from "@hotwired/stimulus";

export default class NavbarController extends Controller {
  static override targets = ["mobileMenu", "mobileToggle", "mobileClose"];
  declare readonly mobileMenuTarget: HTMLElement;
  declare readonly mobileToggleTarget: HTMLElement;
  declare readonly mobileCloseTarget: HTMLElement;

  override connect() {
    // Set up event listeners
    document.addEventListener("click", this.handleClickOutside.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  override disconnect() {
    document.removeEventListener("click", this.handleClickOutside.bind(this));
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
  }

  openMenu() {
    this.mobileMenuTarget.classList.remove("translate-x-full");
    document.body.style.overflow = "hidden";
  }

  closeMenu() {
    this.mobileMenuTarget.classList.add("translate-x-full");
    document.body.style.overflow = "";
  }

  private handleClickOutside(event: MouseEvent) {
    if (
      event.target instanceof Node &&
      !this.element.contains(event.target) &&
      !this.mobileMenuTarget.contains(event.target)
    ) {
      this.closeMenu();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.closeMenu();
    }
  }
}
