import { PieceName } from "./pieceName.ts";

const serverOnly = <T, A extends any[]>(fn: (...args: A) => T) => {
  return (...args: A) => {
    try {
      window;
      throw new Error("This function can only be called in a server context");
    } catch {
      return fn(...args);
    }
  };
};

export const getClientIdByPieceName = (pieceName: PieceName) => {
  switch (pieceName) {
    case PieceName.GOOGLE_DRIVE: {
      return process.env.TOOL_GOOGLE_CLIENT_ID;
    }
  }
};

export const getClientSecretByPieceName = serverOnly((pieceName: PieceName) => {
  switch (pieceName) {
    case PieceName.GOOGLE_DRIVE: {
      return process.env.TOOL_GOOGLE_CLIENT_SECRET;
    }
  }
});
