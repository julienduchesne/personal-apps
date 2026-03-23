"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

function LinkWithPassword({ href, ...rest }: Props) {
  const searchParams = useSearchParams();
  const password = searchParams.get("password");

  const hrefWithPassword = useMemo(() => {
    if (!password) return href;
    try {
      const url = new URL(href, "http://localhost");
      url.searchParams.set("password", password);
      return url.pathname + url.search;
    } catch {
      const sep = href.includes("?") ? "&" : "?";
      return `${href}${sep}password=${encodeURIComponent(password)}`;
    }
  }, [href, password]);

  return <NextLink href={hrefWithPassword} {...rest} />;
}

export function Link(props: Props) {
  return (
    <Suspense fallback={<NextLink {...props} />}>
      <LinkWithPassword {...props} />
    </Suspense>
  );
}
