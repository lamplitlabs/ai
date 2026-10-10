import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SITE_URL } from "./data";

// Social previews (Slack, LinkedIn, X, iMessage) read the static <head> of index.html; nothing in the React tree
// runs for them. The source head is the same head Vite emits into dist/index.html, so testing it covers the build.
const html = readFileSync(
  fileURLToPath(new URL("../../index.html", import.meta.url)),
  "utf8",
);
const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));

function meta(attr: "property" | "name", key: string): string | undefined {
  const m = head.match(
    new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`),
  );
  return m?.[1];
}

describe("index.html social meta tags", () => {
  const title = head.match(/<title>([^<]*)<\/title>/)?.[1];
  const description = meta("name", "description");

  it("has the page title and description to mirror", () => {
    expect(title).toBe("Lamplit Labs AI - models you can host yourself");
    expect(description).toBe(
      "Lamplit Labs AI builds small, specialised models you host yourself - in a browser, on a laptop, on-prem, in your private cloud, in your app or on the edge. Your data never leaves.",
    );
  });

  it("og:title / og:description match the page title and description", () => {
    expect(meta("property", "og:title")).toBe(title);
    expect(meta("property", "og:description")).toBe(description);
    expect(meta("property", "og:url")).toBe(SITE_URL);
    expect(meta("property", "og:type")).toBe("website");
  });

  it("og:image is an absolute URL on the site and the file ships in public/", () => {
    const image = meta("property", "og:image");
    expect(image).toBe(`${SITE_URL}og-image.png`);
    const file = readFileSync(
      fileURLToPath(new URL("../../public/og-image.png", import.meta.url)),
    );
    expect(file.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(meta("property", "og:image:width")).toBe("1200");
    expect(meta("property", "og:image:height")).toBe("630");
  });

  it("twitter card is summary_large_image and mirrors the og tags", () => {
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
    expect(meta("name", "twitter:title")).toBe(title);
    expect(meta("name", "twitter:description")).toBe(description);
    expect(meta("name", "twitter:image")).toBe(meta("property", "og:image"));
  });
});

// Crawlers find the sitemap through public/robots.txt's Sitemap line, which is a hand-typed absolute URL. Like og:url
// and sitemap.xml <loc>, it must follow SITE_URL so a domain move cannot silently point crawlers at the old host.
describe("public/robots.txt", () => {
  it("Sitemap line points at sitemap.xml under the canonical site URL", () => {
    const robots = readFileSync(
      fileURLToPath(new URL("../../public/robots.txt", import.meta.url)),
      "utf8",
    );
    const sitemaps = robots
      .split(/\r?\n/)
      .filter((line) => /^sitemap:/i.test(line))
      .map((line) => line.slice(line.indexOf(":") + 1).trim());
    expect(sitemaps).toEqual([`${SITE_URL}sitemap.xml`]);
  });
});
