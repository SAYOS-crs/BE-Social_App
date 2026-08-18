import { NextFunction, Request, Response } from "express";
import { BadRequstExption, ConflictExption } from "../response";
import { readFileSync } from "node:fs";
import { fileTypeFromBuffer } from "file-type";

export const AllowedFileTypes = {
  photo: ["jpg", "png"],
  docs: [`pdf`, "word"],
};

export default function FileFilter(allawedfileType: string[]) {
  // SAFE CHECK
  if (!allawedfileType.length) {
    throw new BadRequstExption("fileType is missing");
  }

  // return closure
  return async (req: Request, res: Response, next: NextFunction) => {
    // setting buffer globle

    let buffer: string | Uint8Array | ArrayBuffer = "";

    // sett the buffer value
    // if req.file?.buffer === memory
    // else req.file?.path === temp/disk
    if (req.file?.buffer) {
      buffer = req.file.buffer;
    } else if (req.file?.path) {
      buffer = readFileSync(req.file.path);
    }

    // -------------------------------------------------------------
    // reade file type from buffer
    const fileType = await fileTypeFromBuffer(
      buffer as Uint8Array | ArrayBuffer,
    );
    // -------------------------------------------------------------
    // compare if the file is allowed
    if (!fileType || !allawedfileType.includes(fileType.ext)) {
      console.log(fileType);
      throw new ConflictExption(
        `file type not allowed - allowed types: ${allawedfileType}`,
      );
    }
    next();
  };
}
