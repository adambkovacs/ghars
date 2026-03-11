import { v } from "convex/values";
import { action } from "./_generated/server";

export const summarizeText = action({
  args: {
    title: v.string(),
    body: v.string(),
  },
  returns: v.object({
    summary: v.string(),
  }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_TEXT_MODEL || "openai/gpt-4.1-mini";

    if (!apiKey) {
      return {
        summary: `${args.title}: ${args.body.slice(0, 160)}`,
      };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Summarize the repository in two tight sentences for a developer dashboard.",
          },
          {
            role: "user",
            content: `Title: ${args.title}\nBody: ${args.body}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter summary request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    return {
      summary: payload.choices?.[0]?.message?.content?.trim() ?? `${args.title}: ${args.body}`,
    };
  },
});
