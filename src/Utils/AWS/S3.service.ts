import {
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  AWS_REGION,
  S3_BUCKET_NAME,
  S3_SECRET_ID,
  S3_SECRET_KEY,
} from "../../Config/config";
import { StorageAprotches } from "../Enums";
import { Schema } from "mongoose";
import { readFileSync } from "node:fs";
import { BadRequstExption } from "../response";

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
}) => {
  return `${folder}/${id.toString()}/${AssetType}/${Date.now()}-${file.originalname}`;
};

class S3service {
  private readonly S3_BUCKET_NAME: string;
  private readonly AWS_REGION: string;
  private readonly S3_SECRET_ID: string;
  private readonly S3_SECRET_KEY: string;
  private readonly Client: S3Client;

  constructor() {
    this.AWS_REGION = AWS_REGION;
    this.S3_BUCKET_NAME = S3_BUCKET_NAME;
    this.S3_SECRET_ID = S3_SECRET_ID;
    this.S3_SECRET_KEY = S3_SECRET_KEY;
    this.Client = new S3Client({
      region: this.AWS_REGION,
      credentials: {
        accessKeyId: this.S3_SECRET_ID,
        secretAccessKey: this.S3_SECRET_KEY,
      },
    });
  }

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
}

export default new S3service();
