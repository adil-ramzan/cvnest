import Link from "next/link";
import type { ComponentProps } from "react";
import { type ButtonSize, buttonClass, type ButtonVariant, siteButtonMotion } from "./styles";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Exclude<ButtonVariant, "danger">;
  size?: ButtonSize;
};

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, `${siteButtonMotion[variant] ?? ""} ${className}`)} {...props} />;
}
