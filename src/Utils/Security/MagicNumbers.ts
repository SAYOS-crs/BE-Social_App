import { NextFunction, Request, Response } from "express";
import { BadRequstExption, ConflictExption } from "../response";
import { readFileSync } from "node:fs";
import { fileTypeFromBuffer } from "file-type";

export const AllowedFileTypes = {
  photo: ["image/jpg", "image/png", "image/jpeg"],
  docs: [`pdf`, "word"],
};

export default function FileFilter(allawedfileType: string[]) {
  // SAFE CHECK
  if (!allawedfileType.length) {
    throw new BadRequstExption("allawedfileType is missing , backend issue");
  }

  // return closure
  return async (req: Request, res: Response, next: NextFunction) => {
    // setting buffer globle

    // let buffer: string | Uint8Array | ArrayBuffer = "";

    // sett the buffer value
    // if req.file?.buffer === memory
    // else req.file?.path === temp/disk
    // if (req.file?.buffer) {
    //   buffer = req.file.buffer;
    // } else if (req.file?.path) {
    //   buffer = readFileSync(req.file.path);
    // }

    // // -------------------------------------------------------------
    // // reade file type from buffer
    // const fileType = await fileTypeFromBuffer(
    //   buffer as Uint8Array | ArrayBuffer,
    // );
    // // -------------------------------------------------------------
    // // compare if the file is allowed
    // if (!fileType || !allawedfileType.includes(fileType.ext)) {
    //   console.log(fileType);
    //   throw new ConflictExption(
    //     `file type not allowed - allowed types: ${allawedfileType}`,
    //   );
    // }

    // =============================================================================
    // =============================================================================
    // =============================================================================
    // =============================================================================
    // /////////// multi file validation
    // step 1 : set the file or files
    const UploudedAssets = req.files
      ? (req.files as Express.Multer.File[])
      : ([req.file] as [Express.Multer.File]);
    // check if there UploudedAssets
    // if not that mean didnt recivie any assets (assets may come or not out main focase to validate the file if it come !)
    if (!UploudedAssets) {
      next();
    }
    // array to stack errors
    const inValidTypes: string[] = [];
    // step 2 : itrate on etch file to turn it into buffer and validate it
    for (const file of UploudedAssets) {
      // convert it into buffer
      let buffer: string | Uint8Array | ArrayBuffer = file.path
        ? readFileSync(file.buffer)
        : file.buffer;
      // validate type by buffer using magic numbers
      const Type = await fileTypeFromBuffer(buffer);
      console.log("file type : ", Type);
      // check if Type distructed successfly
      if (!Type)
        throw new BadRequstExption(
          "Error while distruct file Type form buffer",
        );
      // check if the type is allawed
      if (!allawedfileType.includes(Type.mime)) {
        // push in error array if not
        inValidTypes.push(Type?.mime);
      }
    }
    // check if there inValidTypes
    if (inValidTypes.length) {
      throw new ConflictExption(
        `file type not allowed received ((${inValidTypes})) \ allawed types is : ${allawedfileType}`,
      );
    }
    next();
  };
}
