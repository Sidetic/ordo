import { FOLDER_TOKEN_HEADER, FOLDER_TOKENS_HEADER } from "@ordo/shared";
import { getPresentedFolderTokens } from "./folder-tokens.js";

function request(headers: Record<string, string | undefined>) {
  return {
    get: (name: string) => {
      const key = Object.keys(headers).find((header) => header.toLowerCase() === name.toLowerCase());
      return key ? headers[key] : undefined;
    },
  } as Parameters<typeof getPresentedFolderTokens>[0];
}

describe("getPresentedFolderTokens", () => {
  it("merges the singular header with the comma-separated list", () => {
    expect(
      getPresentedFolderTokens(
        request({
          [FOLDER_TOKEN_HEADER]: "alpha",
          [FOLDER_TOKENS_HEADER]: "beta, gamma,alpha",
        }),
      ),
    ).toEqual(["alpha", "beta", "gamma"]);
  });

  it("returns an empty list when nothing was presented", () => {
    expect(getPresentedFolderTokens(request({}))).toEqual([]);
  });
});
