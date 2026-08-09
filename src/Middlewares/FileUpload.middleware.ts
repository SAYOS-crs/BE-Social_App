import multer from "multer";
import { StorageAprotches } from "../Utils";
import { Request, Express } from "express";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export default function CloudFileUpload({
  StorageAprotch = StorageAprotches.Memory,
  maxSize = 2,
}: {
  StorageAprotch?: StorageAprotches;
  maxSize?: number;
}) {
  const storage =
    StorageAprotch == StorageAprotches.Memory
      ? multer.memoryStorage()
      : multer.diskStorage({
          // any callback take 2 pramter (error , result)
          // setting file destination
          destination(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            // setting the destination to tmpdir witch return temp file path
            callback(null, tmpdir());
          },
          // setting file name
          filename(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            callback(null, `${randomUUID()}__${file.originalname}`);
          },
        });
  // return storage and other options
  return multer({ storage, limits: { fileSize: maxSize * 1024 * 1024 } });
}
