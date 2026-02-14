import { Controller } from "@hotwired/stimulus";
import { actions } from "astro:actions";

import type { SearchResult } from "src/lib/zendo/config";
import type { ZendoCollectionId } from "src/lib/zendo/content";

type SearchResultResponse = SearchResult & {
  url: string;
};

interface Filters {
  [category: string]: string[];
}

export default class ContentGridController extends Controller {
  static override targets = [
    "grid",
    "loadingTemplate",
    "emptyTemplate",
    "errorTemplate",
    "cardTemplate",
    "checkbox",
    "allCheckbox",
  ];
  static override values = {
    searchParams: { type: Object, default: {} },
    filters: { type: Object, default: {} },
  };

  declare readonly gridTarget: HTMLElement;
  declare readonly loadingTemplateTarget: HTMLTemplateElement;
  declare readonly emptyTemplateTarget: HTMLTemplateElement;
  declare readonly errorTemplateTarget: HTMLTemplateElement;
  declare readonly cardTemplateTarget: HTMLTemplateElement;
  declare readonly checkboxTargets: HTMLInputElement[];
  declare readonly allCheckboxTargets: HTMLInputElement[];
  declare searchParamsValue: {
    name?: string;
    collections?: ZendoCollectionId[];
    status?: string[];
    topics?: string[];
    relatedTo?: string;
  };
  declare filtersValue: Filters;

  private isLoading = false;

  override connect(): void {
    this.updateCheckboxStates();
    this.performSearch();
  }

  updateFilter(event: Event): void {
    const checkbox = event.currentTarget as HTMLInputElement;
    const { filterType, filterCategory } = checkbox.dataset;
    const isChecked = checkbox.checked;

    if (!filterType || !filterCategory) {
      return;
    }

    if (filterType === "all") {
      this.handleAllFilter(filterCategory, isChecked, checkbox);
    } else {
      this.handleSpecificFilter(filterCategory, filterType, isChecked);
    }

    this.updateCheckboxStates();
    this.performSearch();
  }

  private handleAllFilter(category: string, isChecked: boolean, checkbox: HTMLInputElement): void {
    if (isChecked) {
      this.filtersValue = { ...this.filtersValue, [category]: ["all"] };
      this.uncheckOtherCheckboxes(checkbox);
    } else {
      checkbox.checked = true;
    }
  }

  private handleSpecificFilter(category: string, filterType: string, isChecked: boolean): void {
    const currentFilters = this.filtersValue[category] || ["all"];
    const allCheckbox = this.allCheckboxTargets.find((cb) => cb.dataset.filterCategory === category);

    if (isChecked) {
      const newFilters = currentFilters.filter((f) => f !== "all");
      this.filtersValue = { ...this.filtersValue, [category]: [...newFilters, filterType] };
      if (allCheckbox) allCheckbox.checked = false;
    } else {
      const newFilters = currentFilters.filter((f) => f !== filterType);
      this.filtersValue = {
        ...this.filtersValue,
        [category]: newFilters.length ? newFilters : ["all"],
      };
      if (newFilters.length === 0 && allCheckbox) allCheckbox.checked = true;
    }
  }

  private uncheckOtherCheckboxes(checkbox: HTMLInputElement): void {
    const { filterCategory } = checkbox.dataset;
    if (!filterCategory) {
      return;
    }

    this.checkboxTargets
      .filter((cb) => cb.dataset.filterCategory === filterCategory && cb.dataset.filterType !== "all")
      .forEach((cb) => (cb.checked = false));
  }

  private updateCheckboxStates(): void {
    Object.keys(this.filtersValue).forEach((category) => {
      const selectedFilters = this.filtersValue[category] || ["all"];
      const isAllSelected = selectedFilters.includes("all");

      const allCheckbox = this.allCheckboxTargets.find((cb) => cb.dataset.filterCategory === category);
      if (allCheckbox) {
        allCheckbox.checked = isAllSelected;
      }

      this.checkboxTargets
        .filter((cb) => cb.dataset.filterCategory === category && cb.dataset.filterType !== "all")
        .forEach((cb) => {
          const filterType = cb.dataset.filterType;
          if (filterType) {
            cb.checked = !isAllSelected && selectedFilters.includes(filterType);
          }
        });
    });
  }

  async performSearch(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showLoading();

    try {
      // TODO: This should be split into a ContentGridController and a FilterableContentGridController
      // so that we don't have to do this weird join of searchParams and filtersValue.
      const searchParams: typeof this.searchParamsValue = { ...this.searchParamsValue };

      if (this.filtersValue.status && !this.filtersValue.status.includes("all")) {
        searchParams.status = this.filtersValue.status;
      }
      if (this.filtersValue.topics && !this.filtersValue.topics.includes("all")) {
        searchParams.topics = this.filtersValue.topics;
      }
      if (this.filtersValue.collections && !this.filtersValue.collections.includes("all")) {
        searchParams.collections = this.filtersValue.collections as ZendoCollectionId[];
      }

      // TODO: We should implement pagination and infinite scroll for optimal performance.
      const result = await actions.search(searchParams);

      if (result.error) {
        console.error("Error fetching search results:", result.error);
        this.showError();
        return;
      }

      const items = result.data.items;

      if (items.length === 0) {
        this.showEmpty();
        return;
      }

      this.renderCards(items);
    } catch (error) {
      console.error("Error fetching search results:", error);
      this.showError();
    } finally {
      this.isLoading = false;
    }
  }

  private renderCards(items: SearchResultResponse[]): void {
    this.gridTarget.innerHTML = "";

    items.forEach((item, index) => {
      const clone = this.cardTemplateTarget.content.cloneNode(true) as DocumentFragment;
      const cardElement = clone.firstElementChild as HTMLElement;

      cardElement.setAttribute("data-content-card-id-value", item.id);
      cardElement.setAttribute("data-content-card-collection-value", item.type);

      const { colSpan, rowSpan } = this.calculateCardDimensions(index);
      cardElement.setAttribute("data-content-card-dimension-value", `${colSpan}x${rowSpan}`);

      this.gridTarget.appendChild(cardElement);
    });
  }

  /**
   * Calculates the grid dimensions based on the item's position (index).
   * This logic mimics the CSS grid-flow-dense rules to create a bento-like layout:
   * 1. Default size is 1x1.
   * 2. The first item is a feature block (2x2).
   * 3. Every 3rd item is wide (2x1).
   * 4. Every 8th item is tall (1x2).
   * 5. The 11th item is a feature block (2x2), breaking the rhythm.
   *
   * Note: These rules are applied cumulatively. For example, the 24th item (divisible by 3 and 8)
   * becomes 2x2 because both the wide and tall rules apply.
   */
  private calculateCardDimensions(index: number): { colSpan: number; rowSpan: number } {
    const n = index + 1;
    let colSpan = 1;
    let rowSpan = 1;

    // The 1st item is always a large feature block (2x2)
    if (n === 1) {
      colSpan = 2;
      rowSpan = 2;
    }

    // Every 3rd item is wide (2x1)
    if (n % 3 === 0) {
      colSpan = 2;
    }

    // Every 8th item is tall (1x2)
    if (n % 8 === 0) {
      rowSpan = 2;
    }

    // Every 11th item is another large block (2x2) to break the rhythm
    if (n % 11 === 0) {
      colSpan = 2;
      rowSpan = 2;
    }

    return { colSpan, rowSpan };
  }

  private showLoading(): void {
    const clone = this.loadingTemplateTarget.content.cloneNode(true) as DocumentFragment;
    this.gridTarget.innerHTML = "";
    this.gridTarget.appendChild(clone);
  }

  private showEmpty(): void {
    const clone = this.emptyTemplateTarget.content.cloneNode(true) as DocumentFragment;
    this.gridTarget.innerHTML = "";
    this.gridTarget.appendChild(clone);
  }

  private showError(): void {
    const clone = this.errorTemplateTarget.content.cloneNode(true) as DocumentFragment;
    this.gridTarget.innerHTML = "";
    this.gridTarget.appendChild(clone);
  }
}
