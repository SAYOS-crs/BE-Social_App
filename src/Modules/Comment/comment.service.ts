import { Request, Response } from "express";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  ConflictExption,
  Guard,
  NotFoundExption,
  NotificationService,
  Post_Utils,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import {
  CommentRepository,
  PostRepository,
  UserRepository,
} from "../../DB/Repository";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import { AssetType } from "../../Utils/Enums/AWS.enum";
import { randomUUID } from "crypto";
import { Keys } from "../../Utils/AWS/types";
import {
  I_CommentReply_Body_DTO,
  I_CommentReply_Params_DTO,
  I_CreatePost_Body_DTO,
  I_CreatePost_Params_DTO,
} from "./comment.dto";
import { IComment } from "../../DB/models/Comment.model";

export const SendAssets_S3 = async (
  files?: Express.Multer.File[],
): Promise<{
  folderId: string;
  S3_r: Keys | undefined;
}> => {
  const folderId = randomUUID();
  // super note : the files = [] and empty [] is true , so do length check !!!
  const result = files?.length
    ? await AWS_SERVICE.S3service.UploadMultiFiles({
        AssetType: AwsEnum.AssetType.attachments,
        folder: AwsEnum.FolderType.Comments,
        id: folderId,
        files,
      })
    : undefined;
  const S3_r: Keys | undefined = result
    ? result?.map((Key) => {
        return { Key };
      })
    : undefined;
  return { folderId, S3_r };
};

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
    const { PostId }: Partial<I_CreatePost_Params_DTO> = req.params;
    const { content, files, visibility, tags }: I_CreatePost_Body_DTO =
      req.body;
    const user = this._GetAuthenticatedUser(req);
    //--- Step 2 --- //
    const post = await this._PostRepository.findOne({
      filter: {
        id: PostId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
    });
    if (!post) {
      throw new NotFoundExption(`Post with id : ${PostId} - Not found`);
    }
    //--- Step 3 --- //

    const { folderId, S3_r } = await SendAssets_S3(
      files as Express.Multer.File[],
    );
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
  public CreateReplyComment = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // ---- steps ---//
    // step 1 : distruct the postID & CommentId
    // step 2 : check for post and CommentId
    // step 3 : upload attachments if there any in aws & insert the comment as Reply by butting {RepliedOn:Comment_ID}
    // step 4 : send notification to Comment User
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    // step 1 ;
    const { PostId, CommentId }: Partial<I_CommentReply_Params_DTO> =
      req.params;
    const { content, files, tags, visibility }: I_CommentReply_Body_DTO =
      req.body;
    const user = this._GetAuthenticatedUser(req);
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    // step 2 ;
    const post = await this._PostRepository.findOne({
      filter: {
        id: PostId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
      options: { populate: "CreatedBy" },
    });
    const comment = await this._CommentRepository.findOne({
      filter: {
        id: CommentId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
      options: { populate: "CreatedBy" },
    });
    if (!post) {
      throw new NotFoundExption("post not found");
    }
    if (!comment) {
      throw new NotFoundExption("Comment not found");
    }
    if (post.id != comment?.postId) {
      console.log(post.id, "is not", comment?.postId);
      throw new ConflictExption("this comment dont belong to this post");
    }
    if ((post.CreatedBy as IUser).username) {
      console.log("post populated successfly");
    }

    if ((comment.CreatedBy as IUser).username) {
      console.log("comment populated successfly");
    }
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    // step 3 ;
    const { folderId, S3_r } = await SendAssets_S3(
      files as Express.Multer.File[],
    );
    const result = await this._CommentRepository.insertOne({
      data: {
        content,
        attachments: S3_r,
        fileId: S3_r != undefined ? folderId : undefined,
        tags,
        visibility,
        RepliedOn: comment.id as string,
        postId: post.id as string,
        CreatedBy: user.id,
      },
    });
    if (!result) {
      if (S3_r) {
        await this._AWS_S3.DeleteAssets({
          Keys: S3_r,
        });
      }
      throw new BadRequstExption("fail to reply on comment");
    }
    const PushReply = await this._CommentRepository.updateOne({
      filter: {
        id: comment.id as string,
      },
      update: {
        $push: { RepliedList: result._id },
      },
    });
    if (!PushReply) {
      await this._CommentRepository.DeleteOne({
        id: result.id as string,
      });
      throw new BadRequstExption("fail to push reply");
    }
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    // step 4 ;
    // - send notification to tagged users
    if ((result.tags as string[]).length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has mentioned you in comment`,
        },
        fcm_tokens: result.tags as string[],
      });
    }
    // - send notification to comment creator that ReplayedOn
    if ((comment.CreatedBy as IUser).FCM_Token?.length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has replayed on your Comment`,
        },
        fcm_tokens: (comment.CreatedBy as IUser).FCM_Token as string[],
      });
    }
    // - send notification to post owner
    if ((post.CreatedBy as IUser).FCM_Token?.length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has commented on your post`,
        },
        fcm_tokens: (post.CreatedBy as IUser).FCM_Token as string[],
      });
    }
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//
    //----////----////----////----////----////----////----////----////----//

    return SuccessResponse({
      res,
      message: "you replayed on comment successfly",
      data: result,
    });
  };
}

export default new CommentService();
