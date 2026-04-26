import Link from "next/link";

type LocalitySubnavProps = {
  slug: string;
  currentSuffix?: string;
  tone?: "light" | "dark";
};

const items = [
  { suffix: "", label: "Overview" },
  { suffix: "#records", label: "Search" },
  { suffix: "#newsletter", label: "Subscribe" },
  { suffix: "#ask", label: "Ask" },
  { suffix: "/source-inventory", label: "Sources" },
  { suffix: "/corrections", label: "Fix" }
];

export function LocalitySubnav({
  slug,
  currentSuffix = "",
  tone = "light"
}: LocalitySubnavProps) {
  const itemClass =
    tone === "dark"
      ? "rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
      : "rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink/68 transition hover:border-moss/25 hover:text-moss";

  return (
    <div className="flex flex-wrap gap-2">
      {items
        .filter((item) => item.suffix !== currentSuffix)
        .map((item) => (
          <Link
            key={item.suffix || "digest"}
            href={`/${slug}${item.suffix}`}
            className={itemClass}
          >
            {item.label}
          </Link>
        ))}
    </div>
  );
}
