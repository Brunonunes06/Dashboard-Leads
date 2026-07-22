import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/leads")({
  beforeLoad: () => {
    throw redirect({ to: "/leads/chat" });
  },
});
