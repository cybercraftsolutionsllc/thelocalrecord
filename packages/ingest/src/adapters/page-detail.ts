import { load } from "cheerio";

import { compactText } from "@thelocalrecord/core";

export function extractPageDetail(html: string) {
  const $ = load(html);
  const title = compactText(
    $("h1, .pageTitle h1, .pageTitle, .subhead1").first().text()
  );
  const textCandidates = [
    $("#contentarea .accordion-text.fr-view").first().text(),
    $("#contentarea .fr-view").first().text(),
    $("#contentarea .pageStyles").first().text(),
    $(".fr-view").first().text(),
    $(".pageStyles").first().text()
  ]
    .map((value) => compactText(value))
    .filter(Boolean);

  const detailText = clampText(textCandidates[0] ?? "");

  return {
    title,
    detailText
  };
}

function clampText(value: string) {
  if (value.length <= 2200) {
    return value;
  }

  return `${value.slice(0, 2197).trimEnd()}...`;
}
