import {
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  AWS_REGION,
  S3_BUCKET_NAME,
  S3_SECRET_ID,
  S3_SECRET_KEY,
  S3_SignedUrl_TTL,
} from "../../Config/config";
import { StorageAprotches } from "../Enums";
import { Schema } from "mongoose";
import { readFileSync } from "node:fs";
import { BadRequstExption } from "../response";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3PathKeyPrefix = ({
  folder,
  id,
  AssetType,
  file,
}: {
  folder: "User" | "Post";
  id: string;
  AssetType: "Profile" | "Cover" | "Images" | "Docs";
  file: Express.Multer.File;
}): string => {
  return `${folder}/${id.toString()}/${AssetType}/${Date.now()}-${file.originalname}`;
};

class S3service {
  private readonly S3_BUCKET_NAME: string;
  private readonly AWS_REGION: string;
  private readonly S3_SECRET_ID: string;
  private readonly S3_SECRET_KEY: string;
  private readonly S3_SignedUrl_TTL: number;
  private readonly Client: S3Client;

  constructor() {
    this.AWS_REGION = AWS_REGION;
    this.S3_BUCKET_NAME = S3_BUCKET_NAME;
    this.S3_SECRET_ID = S3_SECRET_ID;
    this.S3_SECRET_KEY = S3_SECRET_KEY;
    this.S3_SignedUrl_TTL = S3_SignedUrl_TTL;
    this.Client = new S3Client({
      region: this.AWS_REGION,
      credentials: {
        accessKeyId: this.S3_SECRET_ID,
        secretAccessKey: this.S3_SECRET_KEY,
      },
    });
  }
  // =======================================================================
  public async UploadFile({
    file,
    ContentType,
    path,
    // Access control list (ACL)
    ACL = ObjectCannedACL.private,
    StorageAprotche = StorageAprotches.Memory,
  }: {
    file: Express.Multer.File;
    ContentType?: string;
    path: string;
    ACL?: ObjectCannedACL;
    StorageAprotche?: StorageAprotches;
  }) {
    const commandParam = {
      Bucket: this.S3_BUCKET_NAME,
      Key: `${this.S3_BUCKET_NAME}/${path}`,
      ACL,
      Body:
        // make sure the file is a buffer
        StorageAprotche === StorageAprotches.Memory
          ? file.buffer
          : readFileSync(file.path),
      ContentType: file.mimetype || ContentType,
    };
    try {
      const command = new PutObjectCommand(commandParam);
      await this.Client.send(command);
      if (!command.input.Key)
        throw new BadRequstExption("Error while uploading asset");
      return command.input.Key;
    } catch (err) {
      throw new BadRequstExption(
        "Error while Uploading files to AWS_S3_Bucket",
        err,
      );
    }
  }
  // =======================================================================
  public async UploadLargeFiles({
    file,
    path,
    ContentType,
    ACL = ObjectCannedACL.private,
    partSize = 5,
    StorageAprotche = StorageAprotches.Disk,
  }: {
    file: Express.Multer.File;
    path: string;
    ContentType?: string;
    ACL?: ObjectCannedACL;
    partSize?: number;
    StorageAprotche?: StorageAprotches;
  }) {
    const params: PutObjectCommandInput = {
      Bucket: this.S3_BUCKET_NAME,
      Key: `${this.S3_BUCKET_NAME}/${path}`,
      ACL,
      Body:
        StorageAprotche === StorageAprotches.Memory
          ? file.buffer
          : readFileSync(file.path),
      ContentType: file.mimetype || ContentType,
    };

    const command = new Upload({
      client: this.Client,
      params,
      partSize: 1024 * 1024 * partSize,
    });

    command.on("httpUploadProgress", (prograss) => {
      console.log(
        `file uploade prograss : ${((prograss.loaded as number) / (prograss.total as number)) * 100}%`,
      );
    });

    return (await command.done()).Key;
  }
  // =======================================================================
  public async UploadMultiFiles({
    files,
    ContentType,
    // Access control list (ACL)
    ACL = ObjectCannedACL.private,
    StorageAprotche = StorageAprotches.Memory,

    folder,
    id,
    AssetType,
  }: {
    files: Express.Multer.File[];
    ContentType?: string;
    ACL?: ObjectCannedACL;
    StorageAprotche?: StorageAprotches;

    folder: "User" | "Post";
    id: string;
    AssetType: "Profile" | "Cover" | "Images" | "Docs";
  }): Promise<string[]> {
    // 1.
    const Urls: string[] = await Promise.all(
      files.map((file) => {
        return this.UploadFile({
          file,
          path: s3PathKeyPrefix({ AssetType, file, folder, id }),
          ACL,
          ContentType: file.mimetype,
        });
      }),
    );

    return Urls;
  }
  // =======================================================================
  /**
   * PresignedURL Generation:
   * -----------------------------------------------------------------------
   * WHAT IT IS:
   * A Presigned URL is a temporary, cryptographically signed URL generated with
   * AWS credentials that delegates direct read/write permissions for a specific
   * S3 object to a client (browser, mobile app) without sharing AWS secret keys.
   *
   * WHY USE IT:
   * - Eliminates backend bottlenecks: Files upload directly to S3 (no server RAM/bandwidth load).
   * - Security: Time-limited access (TTL) restricted to a specific path, method, and Content-Type.
   *
   * FULL LIFECYCLE (Creation to Usage):
   * 1. [CLIENT] Sends file metadata (e.g., filename, Content-Type) to backend.
   * 2. [SERVER] Validates request, constructs unique S3 Key, creates PutObjectCommand.
   * 3. [SERVER] Signs command with AWS SDK (`getSignedUrl`), attaching SigV4 signature & TTL.
   * 4. [SERVER] Returns `{ Key, link }` to client and optionally saves Key in DB.
   * 5. [CLIENT] Directly sends HTTP `PUT` request to `link` with raw file binary in body.
   * 6. [AWS S3] Verifies signature, expiration, and headers; stores object directly in S3.
   */
  public async Upload_PresignedURL({
    Bucket = this.S3_BUCKET_NAME,
    folder,
    id,
    AssetType,
    // ContentType + Originalname provided by client in request body
    ContentType,
    Originalname,
  }: {
    Bucket?: string;
    ContentType: string;
    folder: "User" | "Post";
    id: string;
    AssetType: "Profile" | "Cover" | "Images" | "Docs";
    Originalname: string;
  }) {
    // STEP 1: Build the PutObjectCommand with destination details & constraints
    // - Bucket: Target AWS S3 bucket name
    // - Key: Hierarchical S3 storage path with timestamp to prevent name collisions
    // - ContentType: Enforces the exact MIME type allowed for direct upload
    const command = new PutObjectCommand({
      Bucket: this.S3_BUCKET_NAME,
      Key: `${Bucket}/${folder}/${id.toString()}/${AssetType}/${Date.now()}-${Originalname}`,
      ContentType,
    });

    // STEP 2: Cryptographically sign the command with AWS credentials
    // - Generates a Signature Version 4 (SigV4) URL with query parameters
    // - `expiresIn`: Time-to-Live (TTL) in seconds after which the link becomes invalid
    const link = await getSignedUrl(this.Client, command, {
      expiresIn: this.S3_SignedUrl_TTL,
    });

    // STEP 3: Return the target Key and presigned upload URL
    // - `Key`: Relative S3 path to store in database for future retrieval/deletion
    // - `link`: The signed URL for the frontend/client to execute direct HTTP PUT
    return { Key: command.input.Key, link };
  }

  // =======================================================================
  // =======================================================================
  // =============================== Retrieve Assets ========================================

  public async RetrieveAsset({
    Bucket = this.S3_BUCKET_NAME,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }) {
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });

    return await this.Client.send(command);
  }

  public async Retrieve_PresignedURL({
    Bucket = this.S3_BUCKET_NAME,
    Key,
    filename,
    path,
    download = undefined,
    ContentType,
  }: {
    Bucket?: string;
    Key: string;
    filename?: string;
    path: string[];
    download?: string | undefined;
    ContentType?: string;
  }) {
    const targetFilename = filename || path[path.length - 1];

    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition: `${
        download === "true" ? "attachment" : "inline"
      };
        filename="${targetFilename}"`,
      // ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! Note ! ! ! ! ! ! ! ! ! ! ! ! ! !
      // if the ContentType = undefined it will act as download anyway , so to control it it must be with a value
      // "value" or " " both work
      ResponseContentType: ContentType || "",
    });

    const Link = await getSignedUrl(this.Client, command, {
      expiresIn: this.S3_SignedUrl_TTL,
    });
    return Link;
  }
}

export default new S3service();
