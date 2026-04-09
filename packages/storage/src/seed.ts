import { municipalities } from "@thelocalrecord/core";

import { close, ensureMunicipality } from "./repository";

async function main() {
  for (const municipality of municipalities) {
    await ensureMunicipality(municipality);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await close();
  });
