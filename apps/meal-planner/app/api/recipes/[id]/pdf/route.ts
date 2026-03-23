import { NextRequest, NextResponse } from "next/server";
import { getRecipe } from "@/app/actions/recipes";
import { readFile } from "@repo/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe?.sourcePdfKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await readFile(recipe.sourcePdfKey);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${recipe.name}.pdf"`,
    },
  });
}
