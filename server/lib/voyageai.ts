const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

// Minimum gap between API calls to respect Voyage AI free tier (3 RPM).
// Once a payment method is added, this becomes a non-issue — but it
// keeps things safe regardless of plan.
const MIN_CALL_GAP_MS = 25_000;
let lastCallAt = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (lastCallAt > 0 && elapsed < MIN_CALL_GAP_MS) {
    await new Promise((r) => setTimeout(r, MIN_CALL_GAP_MS - elapsed));
  }
  lastCallAt = Date.now();
}

interface VoyageResponse {
  data: Array<{ index: number; embedding: number[] }>;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  await throttle();

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: "voyage-3-lite" }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Voyage AI error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as VoyageResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
