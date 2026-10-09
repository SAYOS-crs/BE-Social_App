// ─── Express middleware types ──────────────────────────────────────────────────
import { NextFunction, Request, Response } from "express";
// file-type: detects real MIME type from file's magic-number bytes (not trusting extension/header)
import { fileTypeFromBuffer } from "file-type";
// lightweight console.log alias
import { log } from "node:console";
// read a file synchronously from disk into a Buffer (used for disk-storage uploads)
import { readFileSync } from "node:fs";
// Typed error factories
import { BadRequstExption, ConflictExption } from "../response";

// ─────────────────────────────────────────────────────────────────────────────
// AllowedFileTypes
// A static allow-list of MIME types used across the application.
// Passed to FileFilter() to restrict what file types can be uploaded.
// • photo : standard image types — note "image/webp" was added in this refactor
// • docs  : document types (placeholder; not yet fully validated by magic numbers)
// ─────────────────────────────────────────────────────────────────────────────
export const AllowedFileTypes = {
  photo: ["image/jpg", "image/png", "image/jpeg", "image/webp"], // webp added to support modern image formats
  docs: [`pdf`, "word"],
};

// ─────────────────────────────────────────────────────────────────────────────
// FileFilter
// Takes  : allawedfileType — string[] of MIME types that are permitted (e.g. AllowedFileTypes.photo)
// Does   : returns an async Express middleware (closure) that:
//   • Collects files from req.files (multi) or req.file (single) into a unified array
//   • For each file, reads the raw bytes (buffer from memory OR readFileSync from disk path)
//   • Inspects the magic-number bytes via fileTypeFromBuffer() to get the REAL MIME type
//   • Compares the detected MIME against the allowedfileType list
//   • Throws ConflictExption (409) if any file fails the check, with the list of bad types
// Returns: void — calls next() on success; throws on failure
//
// ⚠️  FIX: was using readFileSync(file.buffer) — fixed to readFileSync(file.path)
//     for disk-storage files (buffer is undefined when using DiskStorage).
// ─────────────────────────────────────────────────────────────────────────────
export default function FileFilter(allawedfileType: string[]) {
  // SAFE CHECK: the allowedFileType list must not be empty; a backend config error if it is
  if (!allawedfileType.length) {
    throw new BadRequstExption("allawedfileType is missing , backend issue");
  }

  // return the actual Express middleware closure (executed on each request)
  return async (req: Request, res: Response, next: NextFunction) => {
    // ── Commented-out single-file approach (superseded by the multi-file block below) ──
    // let buffer: string | Uint8Array | ArrayBuffer = "";
    // if (req.file?.buffer) {
    //   buffer = req.file.buffer;
    // } else if (req.file?.path) {
    //   buffer = readFileSync(req.file.path);
    // }
    // const fileType = await fileTypeFromBuffer(buffer as Uint8Array | ArrayBuffer);
    // if (!fileType || !allawedfileType.includes(fileType.ext)) {
    //   console.log(fileType);
    //   throw new ConflictExption(`file type not allowed - allowed types: ${allawedfileType}`);
    // }

    // =============================================================================
    // /////////// multi-file validation (handles both single and multi uploads)
    // =============================================================================

    // step 1: normalise to an array regardless of single/multi upload
    // req.files  → array (from multer .array())
    // [req.file] → wrap single file in array (from multer .single())
    const UploudedAssets = req.files
      ? (req.files as Express.Multer.File[])   // cast because multer types req.files as a union
      : ([req.file] as [Express.Multer.File]);  // wrap single file in a one-element array

    // if no assets were received (optional upload), skip validation and continue
    // (assets may come or not — our focus is validating them *if* they arrive)
    if (!UploudedAssets) {
      next();
    }

    // accumulator for any invalid MIME types found during the loop
    const inValidTypes: string[] = [];

    // step 2: iterate over each uploaded file and validate its real MIME type
    for (const file of UploudedAssets) {
      // ── FIX FLAG: readFileSync(file.buffer) was incorrect for disk-storage files ──
      // fix flag: there was a fix here (note for ai)
      log(file.path); // debug: log the temp path to confirm disk storage is working

      // determine source of bytes:
      //   file.path   → disk storage (DiskStorage) — read raw bytes from temp file
      //   file.buffer → memory storage (MemoryStorage) — bytes already in memory
      let buffer: string | Uint8Array | ArrayBuffer = file.path
        ? readFileSync(file.path) // read from disk temp file path
        : file.buffer;             // use in-memory buffer directly

      // inspect the magic-number bytes to get the ACTUAL MIME type (not the claimed one)
      const Type = await fileTypeFromBuffer(buffer);
      console.log("file type : ", Type); // debug: log detected type for every file

      // guard: if fileTypeFromBuffer returned undefined it couldn't read the bytes at all
      if (!Type)
        throw new BadRequstExption(
          "Error while distruct file Type form buffer",
        );

      // compare detected MIME against the allow-list
      if (!allawedfileType.includes(Type.mime)) {
        // collect all failing MIMEs instead of throwing immediately (report all at once)
        inValidTypes.push(Type?.mime);
      }
    }

    // step 3: if any files failed the MIME check, throw a detailed 409 error
    if (inValidTypes.length) {
      throw new ConflictExption(
        `file type not allowed received ((${inValidTypes})) \\ allawed types is : ${allawedfileType}`,
      );
    }

    next(); // all files passed — continue to the next middleware/handler
  };
}
