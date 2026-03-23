import { NextRequest, NextResponse } from "next/server";
import { readFileStream } from "@repo/storage";
import { getPieces } from "@/app/actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  const pieces = await getPieces();
  const piece = pieces.find((p) => p.id === id);
  if (!piece) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!piece.hasSheetMusic) {
    return new NextResponse("No sheet music uploaded", { status: 404 });
  }

  const stream = await readFileStream(`sheet-music/${id}.pdf`);
  if (!stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(piece.title)}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
