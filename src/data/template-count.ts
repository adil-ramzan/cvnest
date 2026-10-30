import { templates } from "./templates";

/** How many different templates exist. Use this wherever the site states a number. */
export const TEMPLATE_COUNT = new Set(templates.map((template) => template.slug)).size;
