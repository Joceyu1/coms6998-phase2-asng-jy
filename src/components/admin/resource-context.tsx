import { Notice } from "./presentation";

export function ResourceContext({ resource }: { resource: string }) {
  if (resource === "allowed-signup-domains" || resource === "whitelisted-emails") {
    return <Notice title="Signup policy catalog">These records document approved domains and email addresses. They do not replace the creation app’s existing Columbia Google eligibility rules or grant administrator access.</Notice>;
  }
  if (resource === "prompt-chains" || resource === "prompt-chain-steps") {
    return <Notice title="Prompt source snapshot">Inspect the recorded chain and ordered prompt steps. This catalog describes the creation workflow; editing the configured mix does not change the original generator’s routing.</Notice>;
  }
  if (resource === "generation-requests" || resource === "llm-responses") {
    return <Notice title="Saved generation activity">Requests and completions reflect records saved by the creation app. Outputs show the saved generated content; raw provider payloads, token usage, costs, and latency are not inferred.</Notice>;
  }
  return null;
}
