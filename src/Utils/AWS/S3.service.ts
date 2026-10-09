import {
  DeletedObject,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFileSync } from "node:fs";
import {
  AWS_REGION,
  S3_BUCKET_NAME,
  S3_SECRET_ID,
  S3_SECRET_KEY,
  S3_SignedUrl_TTL,
} from "../../Config/config";
import { AwsEnum, StorageAprotches } from "../Enums";
import { BadRequstExption } from "../response";

export const s3PathKeyPrefix = ({
  folder,
  id,
  AssetType,
  file,
}: {
  folder: AwsEnum.FolderType;
  id: string;
  AssetType: AwsEnum.AssetType;
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

    folder: AwsEnum.FolderType;
    id: string;
    AssetType: AwsEnum.AssetType;
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
    folder: AwsEnum.FolderType;
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
  public async RetrieveAssets({
    Bucket = this.S3_BUCKET_NAME,
    Prefix,
  }: {
    Bucket?: string;
    Prefix: string;
  }) {
    const command = new ListObjectsV2Command({
      Bucket,
      Prefix,
    });
    return await this.Client.send(command);
  }
  // =======================================================================
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
    filename?: string | undefined;
    path: string[];
    download?: string | undefined;
    ContentType?: string | undefined;
  }) {
    const targetFilename = filename || path[path.length - 1];

    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition: `${
        download === "true" ? "attachment" : "inline"
      };
        filename="${targetFilename}"`,
      // ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! Note ! ! ! ! ! ! ! ! ! ! ! ! ! ! important Note
      // if the ContentType = undefined it will act as download anyway , so to control it it must be with a value
      // "value" or " " both work
      ResponseContentType: ContentType || "",
    });

    const Link = await getSignedUrl(this.Client, command, {
      expiresIn: this.S3_SignedUrl_TTL,
    });
    return Link;
  }
  // =======================================================================
  // =======================================================================
  // =============================== Delete Assets ========================================
  public async DeleteAsset({
    Bucket = this.S3_BUCKET_NAME,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }) {
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });
    const { DeleteMarker } = await this.Client.send(command);

    return DeleteMarker;
  }
  // =======================================================================
  /**
   * DeleteAssets
   * Takes  : { Bucket?: string, Keys: string[] }
   *   • Bucket : S3 bucket name (defaults to app-configured bucket)
   *   • Keys   : plain string[] of S3 object keys to bulk-delete
   *              (REFACTORED: was previously { Key: string }[] — now accepts string[] for simplicity)
   * Does   :
   *   1. Converts the string[] into the [{ Key: string }] format required by the AWS SDK
   *      (DeleteObjectsCommand expects Objects: [{ Key: "..." }, ...])
   *   2. Sends a DeleteObjects batch command to S3 (all keys in a single HTTP request)
   *   3. Throws 400 if S3 does not return a Deleted list (batch failed entirely)
   * Returns: DeletedObject[] — one entry per successfully deleted object,
   *          each with { Key, DeleteMarker, VersionId } fields
   */
  public async DeleteAssets({
    Bucket = this.S3_BUCKET_NAME,
    Keys,
  }: {
    Bucket?: string;
    Keys: string[]; // plain string array — AWS SDK format conversion is handled internally below
  }): Promise<DeletedObject[]> {
    // AWS SDK's DeleteObjects requires objects in [{ Key: "..." }] format,
    // but callers now pass a simpler string[] — we convert here to keep the API clean
    // it must be like [ {Key:...} , {Key:...} , {Key:...} ] so that why we do this
    const ArrayOfKeys: { Key: string }[] = Keys.map((k) => {
      return { Key: k }; // wrap each key string in the { Key } object shape AWS expects
    });

    // build the batch delete command with all keys at once
    const command = new DeleteObjectsCommand({
      Bucket,
      Delete: {
        Objects: ArrayOfKeys, // converted [{Key}] format required by the AWS SDK
        Quiet: false,         // false → response includes both deleted and error objects (verbose mode)
      },
    });

    // send the batch delete command to AWS S3
    const result = await this.Client.send(command);

    // guard: if result.Deleted is undefined the entire batch operation failed
    if (!result.Deleted) {
      throw new BadRequstExption(
        "Error while Deleting Assets , returned :- ",
        result,
      );
    }

    // return the array of DeletedObject — each entry confirms one successfully deleted key
    return result.Deleted;
  }
  // =======================================================================

  /**
   * DeleteAssetsByPrefix
   * Takes  : { folder: "User" | "Post", id: string }
   *   • folder : top-level S3 folder ("User" or "Post")
   *   • id     : entity ID used to build the S3 prefix (e.g. "User/<id>/")
   * Does   :
   *   step 1 → lists all objects under the prefix "<bucket>/<folder>/<id>/"
   *   step 2 → extracts the Key strings from the listing result into a string[]
   *            (note: the old [{ Key }] mapping was replaced — DeleteAssets handles conversion internally)
   *   step 3 → calls DeleteAssets with the string[] to batch-delete all found objects
   * Returns: DeletedObject[] — confirmation of all deleted objects
   * Throws : BadRequstExption if listing returns no Contents, or if deletion fails
   */
  public async DeleteAssetsByPrefix({
    folder,
    id,
  }: {
    folder: "User" | "Post"; // restrict to supported top-level folders
    id: string;              // the entity ID (user or post) to scope the deletion
  }) {
    // step 1: list all objects under the entity's S3 folder prefix
    console.log(`${this.S3_BUCKET_NAME}/${folder}/${id}`); // debug: log the prefix being listed

    const Assets = await this.RetrieveAssets({
      Prefix: `${this.S3_BUCKET_NAME}/${folder}/${id}`, // S3 prefix filter — returns all objects under this path
    });

    // guard: if Contents is missing the listing call failed or returned nothing
    if (!Assets.Contents) {
      throw new BadRequstExption("Error while Retrieve Assets", Assets);
    }

    // step 2: extract just the Key strings from the S3 listing result
    // REFACTORED: previously mapped to [{ Key: string }] — now maps to string[]
    // because DeleteAssets now accepts string[] and handles the format conversion internally
    // step 2 : get Assets Keys as [ {Key:...} , {Key:...} , {Key:...} ] !! canceld !!
    // after refactor : DeleteAssets take array of string ["key1" , "key2" , "key3"] , and it handel the step 2 inside
    const Keys: string[] = Assets.Contents.map((content) => {
      return content.Key as string; // cast: S3 ListObjectsV2 returns Key as string | undefined
    });

    // step 3: batch-delete all objects using their Keys
    const Deleted = await this.DeleteAssets({
      Keys, // string[] — DeleteAssets converts to [{Key}] format internally
    });

    // guard: Deleted should never be falsy if DeleteAssets succeeded (it throws on failure)
    if (!Deleted) {
      throw new BadRequstExption(
        "Error While Deleting Assets , returned :-",
        Deleted,
      );
    }

    // return the full list of DeletedObject records to the caller
    return Deleted;
  }
}

export default new S3service();
