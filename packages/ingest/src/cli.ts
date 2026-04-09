import { ingestAllMunicipalities, ingestMunicipality } from "./index";

async function main() {
  const slugFlag = process.argv.find((arg) => arg.startsWith("--slug="));

  if (slugFlag) {
    const slug = slugFlag.replace("--slug=", "");
    const result = await ingestMunicipality(slug);
    console.log(JSON.stringify({ [slug]: result }, null, 2));
    return;
  }

  const result = await ingestAllMunicipalities();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
