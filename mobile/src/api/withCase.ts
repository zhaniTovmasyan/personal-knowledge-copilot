import { getCurrentCaseId } from "@/src/storage/cases";

export async function withCase(path: string): Promise<string> {
  const caseId = await getCurrentCaseId();
  if (!caseId) {
    throw new Error("No case selected");
  }
  return `${path}?case_id=${caseId}`;
}
