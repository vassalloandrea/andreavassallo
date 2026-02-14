import { Controller } from "@hotwired/stimulus";
import { actions } from "astro:actions";
import { analytics } from "src/lib/analytics";

export default class NewsletterFormController extends Controller {
  static override targets = ["input", "message", "button"];

  declare readonly inputTarget: HTMLInputElement;
  declare readonly messageTarget: HTMLElement;
  declare readonly buttonTarget: HTMLButtonElement;

  async submit(event: Event) {
    event.preventDefault();

    const formData = new FormData(event.target as HTMLFormElement);
    this.disableForm();
    const { error } = await actions.subscribe(formData);

    if (!error) {
      this.inputTarget.value = "";
      this.showMessage("Thanks for subscribing! Check your inbox.", false);
      analytics.trackNewsletterSubscribe(true);
    } else {
      console.error(error);
      this.showMessage("Something went wrong. Please try again.", true);
      analytics.trackNewsletterSubscribe(false);
    }

    this.enableForm();
  }

  private showMessage(message: string, isError: boolean) {
    this.messageTarget.textContent = message;
    this.messageTarget.hidden = false;

    if (isError) {
      this.messageTarget.classList.remove("text-green-600", "dark:text-green-400");
      this.messageTarget.classList.add("text-red-600", "dark:text-red-400");
    } else {
      this.messageTarget.classList.add("text-green-600", "dark:text-green-400");
      this.messageTarget.classList.remove("text-red-600", "dark:text-red-400");
    }

    setTimeout(() => {
      this.messageTarget.hidden = true;
    }, 5000);
  }

  private disableForm() {
    this.buttonTarget.disabled = true;
    this.inputTarget.disabled = true;
  }

  private enableForm() {
    this.buttonTarget.disabled = false;
    this.inputTarget.disabled = false;
  }
}
