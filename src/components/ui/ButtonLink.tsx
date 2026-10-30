import Link from "next/link";
import type { ComponentProps } from "react";
import { type ButtonSize, buttonClass, type ButtonVariant } from "./styles";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Exclude<ButtonVariant, "danger">;
  size?: ButtonSize;
};

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
