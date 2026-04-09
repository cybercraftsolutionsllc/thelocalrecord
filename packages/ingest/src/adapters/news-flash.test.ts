import { describe, expect, it } from "vitest";

import { parseNewsFlash } from "./news-flash";

describe("parseNewsFlash", () => {
  it("extracts article links and summaries from the civic alerts list", () => {
    const html = `
      <ul class="article-list-group">
        <li id="list-articles-category-13-1001">
          <div id="article-1001-cat-13-main-content">
            <h3>
              <a href="/m/newsflash/Home/Detail/1001" class="article-title-link">
                Road Closure Notice
              </a>
            </h3>
            <div class="article-preview">A scheduled utility closure is listed.</div>
          </div>
        </li>
      </ul>
    `;

    const items = parseNewsFlash(html, "https://www.manheimtownship.org/CivicAlerts.asp?CID=13");

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Road Closure Notice");
    expect(items[0]?.sourceUrl).toContain("/m/newsflash/Home/Detail/1001");
  });
});
