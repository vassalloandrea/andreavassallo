import { Application } from "@hotwired/stimulus";

import RelativeDateController from "./relative-date";
import ContentGridFilterController from "./content-grid-filter";
import ContentCardController from "./content-card";
import CommandPaletteController from "./command-palette";
import DropdownController from "./dropdown";
import NavbarController from "./navbar";
import ContentGridController from "./content-grid";
import BackToTopController from "./back-to-top";
import NewsletterFormController from "./newsletter-form";
import ContentTabsController from "./content-tabs";
import ElevationWidgetController from "./elevation-widget";
import GalleryController from "./gallery";

const application = Application.start();

application.register("relative-date", RelativeDateController);
application.register("content-grid", ContentGridController);
application.register("content-filter", ContentGridFilterController);
application.register("content-card", ContentCardController);
application.register("command-palette", CommandPaletteController);
application.register("dropdown", DropdownController);
application.register("navbar", NavbarController);
application.register("back-to-top", BackToTopController);
application.register("newsletter-form", NewsletterFormController);
application.register("content-tabs", ContentTabsController);
application.register("elevation-widget", ElevationWidgetController);
application.register("gallery", GalleryController);
