import { NextResponse } from "next/server";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getDesignList, defaultDesign } = require("../../../../designs.js") as {
  getDesignList: () => Array<{
    id: string;
    name: string;
    description: string;
    thumbnailPath: string;
  }>;
  defaultDesign: string;
};

export async function GET() {
  const designs = getDesignList().map((design) => {
    return {
      id: design.id,
      name: design.name,
      description: design.description,
      thumbnails: {
        landscape: `/api/assets/designs/${design.id}-landscape.jpg`,
        portrait: `/api/assets/designs/${design.id}-portrait.jpg`,
      },
    };
  });

  return NextResponse.json({ designs, defaultDesignId: defaultDesign });
}
