export type ChatRole = "user" | "assistant";
export type ChatTurn = { role: ChatRole; content: string };
export type CortanaWorldState = {
  biome: string;
  location: string;
  relay_activated: boolean;
  x: number;
  z: number;
};
type ChatRequest = {
  message: string;
  history: ChatTurn[];
  world_state: CortanaWorldState;
};
type ChatResponse = { message: string; mode: "ai" | "demo" };
type HealthResponse = { status: string; ai_configured: boolean; model: string | null };

const apiBase = (import.meta.env.VITE_CORTANA_API_URL ?? "").trim().replace(/\/+$/, "");
export const isCortanaApiConfigured = (): boolean => apiBase.length > 0;

export async function checkCortanaApiHealth(): Promise<boolean> {
  if (!apiBase) return false;
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`${apiBase}/health`, {
        signal: controller.signal,
        credentials: "omit",
      });
      if (!response.ok) return false;
      const data = (await response.json()) as HealthResponse;
      return data.status === "ok" && data.ai_configured;
    } finally {
      window.clearTimeout(timeout);
    }
  } catch {
    return false;
  }
}

export async function sendCortanaMessage(payload: ChatRequest): Promise<ChatResponse> {
  if (!apiBase) throw new Error("Backend AI nie został jeszcze skonfigurowany.");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${apiBase}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<ChatResponse> & { detail?: string };
    if (!response.ok) throw new Error(body.detail || `Serwer Cortany zwrócił błąd HTTP ${response.status}.`);
    if (typeof body.message !== "string" || (body.mode !== "ai" && body.mode !== "demo")) {
      throw new Error("Backend zwrócił odpowiedź w nieprawidłowym formacie.");
    }
    return { message: body.message, mode: body.mode };
  } finally {
    window.clearTimeout(timeout);
  }
}
