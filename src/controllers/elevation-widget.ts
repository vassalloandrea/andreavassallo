import { Controller } from "@hotwired/stimulus";

export default class ElevationWidgetController extends Controller<HTMLElement> {
  static override targets = ["desktopValue", "mobileValue", "sheetValue", "sheet"];
  static override values = {
    elevation: { type: Number, default: 0 },
  };

  declare desktopValueTarget: HTMLElement;
  declare mobileValueTarget: HTMLElement;
  declare sheetValueTarget: HTMLElement;
  declare sheetTarget: HTMLElement;

  declare hasDesktopValueTarget: boolean;
  declare hasMobileValueTarget: boolean;
  declare hasSheetValueTarget: boolean;
  declare hasSheetTarget: boolean;

  declare elevationValue: number;

  private countInterval: ReturnType<typeof setInterval> | null = null;

  override connect(): void {
    this.animateCount();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  override disconnect(): void {
    this.clearCountInterval();
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  open(): void {
    if (!this.hasSheetTarget) return;

    this.sheetTarget.classList.remove("hidden");
  }

  close(): void {
    if (!this.hasSheetTarget) return;

    this.sheetTarget.classList.add("hidden");
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.close();
    }
  };

  private animateCount(): void {
    let count = 0;
    const target = this.elevationValue;

    if (target <= 0) return;

    this.countInterval = setInterval(() => {
      count += 1;
      const text = `${count}m`;

      this.updateTarget("desktopValue", text);
      this.updateTarget("mobileValue", text);
      this.updateTarget("sheetValue", text);

      if (count >= target) {
        this.clearCountInterval();
      }
    }, 0);
  }

  private updateTarget(name: "desktopValue" | "mobileValue" | "sheetValue", text: string): void {
    const hasTarget = `has${name.charAt(0).toUpperCase()}${name.slice(1)}Target` as
      | "hasDesktopValueTarget"
      | "hasMobileValueTarget"
      | "hasSheetValueTarget";

    const targetRef = `${name}Target` as "desktopValueTarget" | "mobileValueTarget" | "sheetValueTarget";

    if (this[hasTarget]) {
      this[targetRef].textContent = text;
    }
  }

  private clearCountInterval(): void {
    if (this.countInterval !== null) {
      clearInterval(this.countInterval);
      this.countInterval = null;
    }
  }
}
