export const getAuthConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key || !key.startsWith("sb_publishable_")) return null;

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
      )
    )
      return null;

    return { url: parsed.origin, key };
  } catch {
    return null;
  }
};

export const getSiteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("사이트 주소를 설정해 주세요.");
  }

  const url = new URL(configured || "http://localhost:3000");

  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    )
  ) {
    throw new Error("사이트 주소를 확인해 주세요.");
  }

  return url.origin;
};
