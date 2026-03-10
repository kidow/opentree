import { getDocsNavigation } from "@/lib/docs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const navigation = await getDocsNavigation();

  const results = query
    ? navigation.flat
        .filter((entry) => {
          const haystack = `${entry.title} ${entry.description} ${entry.sectionTitle}`.toLowerCase();
          return haystack.includes(query);
        })
        .map((entry) => ({
          description: entry.description,
          section: entry.sectionTitle,
          title: entry.title,
          url: entry.href
        }))
    : [];

  return NextResponse.json({
    query,
    results
  });
}
