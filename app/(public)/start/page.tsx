import { Start } from "@/app/(public)/start/Start";

interface StartPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const { next } = await searchParams;
  return <Start next={next ?? null} />;
}
