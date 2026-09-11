import { Request, Response } from "express";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  Guard,
  NotFoundExption,
  NotificationService,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import {
  CommentRepository,
  PostRepository,
  UserRepository,
} from "../../DB/Repository";
import { HUserDocument } from "../../DB/models/User.model";
import { AssetType } from "../../Utils/Enums/AWS.enum";
import { randomUUID } from "crypto";
import { Keys } from "../../Utils/AWS/types";
import { I_CreatePost_DTO } from "./comment.dto";

class CommentService {
  // ----// Repositoryes //----//
  private readonly _UserRepository = new UserRepository();
  private readonly _PostRepository = new PostRepository();
  private readonly _CommentRepository = new CommentRepository();
  //----////----////----////----////----////----////----////----////----//
  // ----// Guards //----//
  private _GetAuthenticatedUser = (req: Request): HUserDocument => {
    if (!req.user) {
      throw new UnAuthroizedExption("User is not authenticated");
    }
    return req.user;
  };
  //----////----////----////----////----////----////----////----////----//
  // ----// Services //----//
  private readonly _AWS_S3 = AWS_SERVICE.S3service;
  private readonly _FCM_Serives = NotificationService;
  //----////----////----////----////----////----////----////----////----//

  constructor() {}
  public CreateComment = async (req: Request, res: Response) => {
    //----// create comment steps //----//
    // step 1 : distruct the elements
    // step 2 : get the post && make sure there is post with that id
    // step 3 : after making sure there is a valid files send it to AWS S3 & create folderID
    // step 4 : create new comment with the data / and if there is result from AWS_S3 appind folderID + attachments
    // step 5 : if the comment creation fail delete the files that has been send to s3 &
    //        - safety check : if comment fail to create and and there are S3_r = execute
    // step 6 : if the comment creation success send notification to tagged user in comment if there any and and the Creator
    // finally: return result
    // -----//// -----//// -----//// -----//// -----//// -----//// -----//// -----//// -----//// -----//// -----//
    //--- Step 1 --- //
    const { PostId } = req.params;
    const { content, files, visibility, tags }: I_CreatePost_DTO = req.body;
    const user = this._GetAuthenticatedUser(req);
    //--- Step 2 --- //
    const post = await this._PostRepository.findOne({
      filter: { id: PostId as string },
    });
    if (!post) {
      throw new NotFoundExption(`Post with id : ${PostId} - Not found`);
    }
    //--- Step 3 --- //
    const SendAssets_S3 = async (): Promise<{
      folderId: string;
      S3_r: Keys | undefined;
    }> => {
      const folderId = randomUUID();
      const result = files
        ? await this._AWS_S3.UploadMultiFiles({
            AssetType: AwsEnum.AssetType.attachments,
            folder: AwsEnum.FolderType.Comments,
            id: folderId,
            files: files as Express.Multer.File[],
          })
        : undefined;
      const S3_r: Keys | undefined = result
        ? result?.map((Key) => {
            return { Key };
          })
        : undefined;
      return { folderId, S3_r };
    };
    const { folderId, S3_r } = await SendAssets_S3();
    //--- Step 4 --- //
    const result = await this._CommentRepository.insertOne({
      data: {
        postId: PostId as string,
        content,
        fileId: S3_r !== undefined ? folderId : undefined,
        attachments: S3_r,
        visibility,
        tags,
        CreatedBy: user.id,
      },
    });
    //--- Step 5 --- //
    // safety check : if comment fail to create and and there are S3_r = execute
    if (!result && S3_r) {
      await this._AWS_S3.DeleteAssets({
        Keys: S3_r,
      });
    } else if (!result) {
      throw new BadRequstExption("fail to create comment !", result);
    }
    //--- Step 6 --- //
    // Triple check : if result and tags are here and result has tags ?
    if (result && tags && (result.tags as string[]).length) {
      const FCM_r = await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}`,
          title: `${user.firstName} has mentioned you`,
        },
        fcm_tokens: result.tags as string[],
      });
      console.log(FCM_r);
    }
    return SuccessResponse<any>({
      res,
      message: `User : ${user.username} has commented on post : ${PostId} successfly`,
      data: result,
    });
  };
}

export default new CommentService();
