import { pieceByName } from "./pieceData.ts";
import { isPieceName } from "./pieceName.ts";

export async function executePieceAction(
  pieceName: string,
  actionName: string,
  props: object = {},
  auth?: { access_token: string }
): Promise<{ success: true; data: any } | { success: false; error: string }> {
  if (!isPieceName(pieceName)) {
    return {
      success: false,
      error: `Integration ${pieceName} does not exist.`,
    };
  }

  const action = pieceByName[pieceName].getAction(actionName);

  if (action == null) {
    return {
      success: false,
      error: `Tool ${actionName} does not exist in integration ${pieceName}`,
    };
  }

  const result = await action.run({
    propsValue: props,
    auth,
  } as any);

  return { success: true, data: result };
}
