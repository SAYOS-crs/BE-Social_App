import { Request, Response } from "express";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  NotificationService,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import { randomUUID } from "node:crypto";
import { PostRepository, UserRepository } from "../../DB/Repository";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import { I_CreatePost_dto } from "./post.dto";
import { HPostDocument, IPost } from "../../DB/models/Post.model";

class PostService {
  private _GetAuthenticatedUser = (req: Request): HUserDocument => {
    if (!req.user) {
      throw new UnAuthroizedExption("User is not authenticated");
    }
    return req.user;
  };
  // private _GetAuthorizedFile = (req: Request): Express.Multer.File => {
  //   if (!req.file) {
  //     throw new BadRequstExption("file not receved !");
  //   }

  //   return req.file;
  // };
  // private _GetAuthorizedMultiFiles = (req: Request): Express.Multer.File[] => {
  //   if (!req.files) {
  //     throw new BadRequstExption("file not receved !");
  //   }

  //   return req.files as Express.Multer.File[];
  // };
  private readonly _FCM_Service = NotificationService;
  private readonly _AWS_S3 = AWS_SERVICE.S3service;
  private readonly _PostRepository = new PostRepository();
  private readonly _UserRepository = new UserRepository();
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
    // console.log({ content, files, visibility, tags, likes, fileId });
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
    // console.log("s3 result : ", s3_r);
    //
    //
    //
    //
    //
    //  * =====> step 3 : Create Post document via PostRepository

    const result = await this._PostRepository.insertOne({
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
    // console.log("create post result", result);
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
    //
    //
    //
    //
    //  * =====> step 5 : send notification to tagged users
    // - first get users that has been tagged using populate
    // note :  taggedUsers is alias form  tags  ===    real : alias
    // note : in populate the path refar to the <<filed>> that ref to other collection
    //
    //
    const { tags: taggedUsers }: { tags: IUser[] } = await result.populate({
      path: "tags",
    });
    // taggedUsers return  array of users and we want the fcm array form etch user
    //
    //
    //
    const taggedUsers_FCM_Tokens: string[] = taggedUsers
      .map((user) => {
        return user.FCM_Token ? user.FCM_Token : [];
      })
      .flat();
    // taggedUsers_FCM_Tokens will return (array of array of fcm !) => [ [fcm1 , fcm2 ,fcm3] , [fcm1 , fcm2 ,fcm3],... ]
    // -- but the << .flat(); >> will spread all the sup arrays in one array or
    // -- The flat() method creates a new array with all sub-array elements concatenated into it automatically.
    // after using flat() taggedUsers_FCM_Tokens will return  =>> [fcm1 , fcm2 ,fcm3 , ...]
    //
    //
    //
    const { CreatedBy }: { CreatedBy: IUser } =
      await result.populate("CreatedBy");
    // populate on CreatedBy to get user that created the post and get his name !
    //
    //
    //
    const FCM_r = await this._FCM_Service.SendNotifications({
      data: {
        title: `${CreatedBy.username} has tagged you`,
        body: `${result?.content ? result?.content.slice(0, 20) : ""}...`,
        // slice the content
      },
      fcm_tokens: taggedUsers_FCM_Tokens,
    });
    // send notification to tagged users all at ones and in multiple dvices
    //
    //
    //
    console.log(FCM_r);
    if (FCM_r.status === "rejected") {
      throw new BadRequstExption("fcm rejected", FCM_r);
    }
    return SuccessResponse<typeof result>({
      res,
      message: "post created successfly",
      data: result,
    });
  };
}

export default new PostService();
