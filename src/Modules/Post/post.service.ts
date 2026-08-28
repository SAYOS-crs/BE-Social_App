import { Request, Response } from "express";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import { randomUUID } from "node:crypto";
import { PostRepository } from "../../DB/Repository";
import { HUserDocument } from "../../DB/models/User.model";
import { I_CreatePost_dto } from "./post.dto";

class PostService {
  private _GetAuthenticatedUser = (req: Request): HUserDocument => {
    if (!req.user) {
      throw new UnAuthroizedExption("User is not authenticated");
    }
    return req.user;
  };
  private _GetAuthorizedFile = (req: Request): Express.Multer.File => {
    if (!req.file) {
      throw new BadRequstExption("file not receved !");
    }

    return req.file;
  };
  private _GetAuthorizedMultiFiles = (req: Request): Express.Multer.File[] => {
    if (!req.files) {
      throw new BadRequstExption("file not receved !");
    }

    return req.files as Express.Multer.File[];
  };

  private readonly _AWS_S3 = AWS_SERVICE.S3service;
  private readonly _PostRepository = new PostRepository();
  constructor() {}

  public createPost = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    //  * =====> step 1 : collect the docu data
    // get user by user Guard
    const user = this._GetAuthenticatedUser(req);
    let { content, files, visibility, tags, likes }: I_CreatePost_dto =
      req.body;
    // create fileId
    const fileId = randomUUID();
    // log check
    console.log({ content, files, visibility, tags, likes, fileId });
    //
    //
    //
    //
    //  * =====> step 2 : Upload Assets via S3

    const s3_r = await this._AWS_S3.UploadMultiFiles({
      AssetType: AwsEnum.AssetType.attachments,
      folder: AwsEnum.FolderType.Post,
      files: files as Express.Multer.File[],
      id: fileId,
    });
    // log check
    console.log("s3 result : ", s3_r);
    //
    //
    //
    //
    //
    //  * =====> step 3 : Create Post document via PostRepository

    const result = await this._PostRepository.Create({
      data: {
        content,
        fileId,
        visibility,
        tags,
        likes,
        attachments: s3_r,
        CreatedBy: user.id,
      },
    });
    // log check
    console.log("create post result", result);
    //
    //
    //
    //
    //  * =====> step 4 : Delete Assets if post creation fail
    if (!result) {
      // create array of Key >> [{Key:string}]
      const Keys: { Key: string }[] = s3_r.map((Key) => {
        return { Key };
      });
      // Delete Assets via s3
      this._AWS_S3.DeleteAssets({
        Keys: Keys,
      });
    }

    return SuccessResponse<typeof result>({
      res,
      message: "done",
      data: result,
    });
  };
}

export default new PostService();
