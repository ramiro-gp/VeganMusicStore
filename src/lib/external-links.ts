import { siteConfig } from '../config/site.ts';

// A stable source while the final domain is pending. The browser sends the real
// origin separately through Referrer-Policy; no visitor data goes into the URL.
export function referralUrl(destination: string, placement: string): string {
  const url = new URL(destination);
  url.searchParams.set('utm_source', siteConfig.referralSource);
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', 'website');
  url.searchParams.set('utm_content', placement);
  return url.href;
}
