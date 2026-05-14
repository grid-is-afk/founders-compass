const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageResponse {
  data: Array<{ index: number; embedding: number[] }>;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: "voyage-4-lite", output_dimension: 512 }),
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
