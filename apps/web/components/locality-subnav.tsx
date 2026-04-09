import Link from "next/link";

type LocalitySubnavProps = {
  slug: string;
};

const items = [
  { suffix: "", label: "Digest" },
  { suffix: "/source-inventory", label: "Sources" },
  { suffix: "/corrections", label: "Corrections" },
  { suffix: "/review", label: "Review" }
];

export function LocalitySubnav({ slug }: LocalitySubnavProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          key={item.suffix || "digest"}
          href={`/${slug}${item.suffix}`}
          className="rounded-full border border-moss/10 bg-white px-4 py-2 text-sm font-semibold text-moss transition hover:border-moss/30 hover:bg-sky/40"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
