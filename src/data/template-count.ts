import { templates } from "./templates";

/** How many different templates exist. Internal only; visitors see TEMPLATE_COUNT_LABEL. */
export const TEMPLATE_COUNT = new Set(templates.map((template) => template.slug)).size;

/** The count as stated on the site. A test keeps it true as the library changes. */
export const TEMPLATE_COUNT_LABEL = "110+";
