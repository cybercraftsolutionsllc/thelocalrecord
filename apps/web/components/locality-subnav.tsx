import Link from "next/link";

type LocalitySubnavProps = {
  slug: string;
  currentSuffix?: string;
  tone?: "light" | "dark";
};

const items = [
  { suffix: "", label: "Dashboard" },
  { suffix: "#records", label: "Search records" },
  { suffix: "#ask", label: "Ask a question" },
  { suffix: "#newsletter", label: "Email updates" },
  { suffix: "/source-inventory", label: "Trace sources" },
  { suffix: "/corrections", label: "Report an issue" }
];

export function LocalitySubnav({
  slug,
  currentSuffix = "",
  tone = "light"
}: LocalitySubnavProps) {
  const itemClass =
    tone === "dark"
      ? "rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
      : "rounded-full border border-moss/10 bg-sand/35 px-4 py-2 text-sm font-semibold text-moss transition hover:border-moss/30 hover:bg-sky/40";

  return (
    <div className="flex flex-wrap gap-3">
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
