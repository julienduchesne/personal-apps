import NextLink from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export function Link({ href, ...rest }: Props) {
  return <NextLink href={href} {...rest} />;
}
