import { socialImage, socialImageAlt } from "./social-image";

export const alt = socialImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return socialImage();
}
