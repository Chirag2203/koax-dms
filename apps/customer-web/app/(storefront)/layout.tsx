import { StorefrontHeader } from '@/src/components/storefront-header';
import { StorefrontFooter } from '@/src/components/storefront-footer';

/**
 * Storefront route group layout.
 *
 * Wraps all customer-facing pages with the shared header and footer.
 * Header is fixed-position and transparent over dark heroes, switching
 * to a solid backdrop-blur treatment once the user scrolls past 80vh.
 */
export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <StorefrontHeader />
      <main>{children}</main>
      <StorefrontFooter />
    </>
  );
}
