export function describeImportFailure(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("GitHub GraphQL request failed with 401")) {
      return "GitHub rejected the import token. Sign out, sign back in with GitHub, then retry the import.";
    }

    if (error.message.includes("GitHub GraphQL request failed with 403")) {
      return "GitHub rate limited or blocked the import request. Wait a minute, then retry.";
    }

    if (error.message.includes("GitHub repo request failed with 401")) {
      return "GitHub rejected a repo enrichment request. Sign out, sign back in, then retry the import.";
    }

    return error.message;
  }

  return "The import failed before ghars could finish talking to GitHub. Retry once, then check the dashboard error panel if it keeps happening.";
}
