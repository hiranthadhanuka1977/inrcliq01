import { MainApiError } from "../lib/main";
import LoadError from "./LoadError";

export function loadFailure(error: unknown, section: string) {
  if (error instanceof MainApiError && error.status === 401) {
    return (
      <LoadError
        title="Sign in again"
        message="Your Seller Tools session expired. Use ST v2.0 in InrCliq to open it again."
      />
    );
  }
  if (error instanceof MainApiError && error.status === 403) {
    return <LoadError title={`${section} is locked`} message={error.message} />;
  }
  const message = error instanceof Error ? error.message : "Unable to load this section.";
  return <LoadError title={`Couldn't load ${section}`} message={message} />;
}
