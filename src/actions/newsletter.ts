import { defineAction } from "astro:actions";
import { z } from "astro:schema";

const buttondownApiKey = import.meta.env.BUTTONDOWN_API_KEY;

export const subscribe = defineAction({
  accept: "form",
  input: z.object({
    email: z.string().email(),
  }),
  handler: async ({ email }) => {
    try {
      const response = await fetch("https://api.buttondown.com/v1/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${buttondownApiKey}`,
        },
        body: JSON.stringify({
          email_address: email,
        }),
      });

      if (!response.ok) {
        // Log the actual error from Buttondown for debugging
        const errorData = await response.json().catch(() => ({}));
        console.error("Buttondown API Error:", errorData);
        throw new Error("Failed to subscribe");
      }

      return { success: true };
    } catch (e) {
      console.error(e);
      throw new Error("Failed to subscribe");
    }
  },
});
