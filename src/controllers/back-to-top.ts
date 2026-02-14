import { Controller } from "@hotwired/stimulus";
import { analytics } from "src/lib/analytics";

export default class BackToTopController extends Controller {
  override connect() {
    this.toggleVisibility();
  }

  toggleVisibility() {
    if (window.scrollY > 300) {
      this.element.classList.remove("opacity-0", "invisible", "translate-y-2", "pointer-events-none");
      this.element.classList.add("opacity-100", "visible", "translate-y-0", "pointer-events-auto");
    } else {
      this.element.classList.remove("opacity-100", "visible", "translate-y-0", "pointer-events-auto");
      this.element.classList.add("opacity-0", "invisible", "translate-y-2", "pointer-events-none");
    }
  }

  scrollToTop(event: Event) {
    event.preventDefault();
    analytics.trackBackToTop();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}
