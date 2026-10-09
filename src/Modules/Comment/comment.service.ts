import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  CommentRepository,
  PostRepository,
  UserRepository,
} from "../../DB/Repository";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  ConflictExption,
  NotFoundExption,
  NotificationService,
  Post_Utils,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import {
  I_CommentReply_Body_DTO,
  I_CommentReply_Params_DTO,
  I_CreatePost_Body_DTO,
  I_CreatePost_Params_DTO,
  I_GetCommentReplies_Params_DTO,
  I_GetPostComments_Params_DTO,
} from "./comment.dto";

/**
 * SendAssets_S3
 * Takes  : files? — optional array of multer File objects (from memory storage)
 * Does   :
 *   1. Generates a unique folderId (UUID) to group all files for this comment/post
 *      under a dedicated S3 sub-folder, preventing key collisions across uploads.
 *   2. If files are provided AND non-empty, uploads them to S3 under the Comments folder.
 *      ⚠️  NOTE: `files = []` is truthy — always do a .length check, not just truthiness!
 *   3. Returns the raw S3 Keys string[] directly (REFACTORED from {Key:string}[] shape).
 *      The old mapping step `result.map((Key) => ({ Key }))` was removed because
 *      the S3 service's DeleteAssets now accepts string[] and handles the conversion internally.
 * Returns: { folderId: string, S3_r: string[] | undefined }
 *   • folderId : UUID used as the folder name in S3 (also stored in the comment as fileId)
 *   • S3_r     : array of uploaded S3 object key strings, or undefined if no files were provided
 */
export const SendAssets_S3 = async (
  files?: Express.Multer.File[], // optional — callers pass files only when attachments exist
): Promise<{
  folderId: string;
  S3_r: string[] | undefined;
}> => {
  // generate a UUID as a unique folder ID to scope this upload batch in S3
  const folderId = randomUUID();

  // super note : the files = [] and empty [] is true , so do length check !!!
  // upload only if files array is provided AND has at least one element
  const result = files?.length
    ? await AWS_SERVICE.S3service.UploadMultiFiles({
        AssetType: AwsEnum.AssetType.attachments, // marks these as comment/post attachment files
        folder: AwsEnum.FolderType.Comments,       // stored under the "Comments" top-level S3 folder
        id: folderId,                              // groups all files for this upload under the UUID folder
        files,
      })
    : undefined; // no files → no S3 upload → result is undefined

  // REFACTORED: previously mapped result to [{Key:string}] shape — now kept as string[]
  // because S3service.DeleteAssets now accepts string[] and does the format conversion internally
  const S3_r: string[] | undefined = result ? result : undefined;

  // return the folder ID (for DB storage as fileId) and the array of S3 Keys (or undefined)
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
  /**
   * =====================================================================================
   * Method: CreateComment
   * Purpose: Create a top-level comment on a post with optional attachments.
   *
   * Query Fix Explanation:
   * - Previously, the post lookup queried `filter: { id: PostId }`.
   * - Because `id` is a virtual getter and not a schema path in MongoDB, Mongoose's
   *   `strictQuery: true` stripped it out, causing the lookup to match the first post in DB.
   * - Fixed: Updated to `filter: { _id: PostId }` to ensure accurate post validation.
   * =====================================================================================
   */
  public CreateComment = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // Step 1: Extract request params, body, and authenticated user
    const { PostId }: Partial<I_CreatePost_Params_DTO> = req.params;
    const { content, files, visibility, tags }: I_CreatePost_Body_DTO =
      req.body;
    const user = this._GetAuthenticatedUser(req);

    // Step 2: Validate that the target post exists and is accessible by the user
    const post = await this._PostRepository.findOne({
      filter: {
        _id: PostId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
    });
    if (!post) {
      throw new NotFoundExption(`Post with id : ${PostId} - Not found`);
    }

    // Step 3: Upload any attached media files to AWS S3
    const { folderId, S3_r } = await SendAssets_S3(
      files as Express.Multer.File[],
    );

    // Step 4: Persist the new comment in the database
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

    // Step 5: Rollback cleanup - delete S3 files if comment insertion fails
    if (!result && S3_r) {
      await this._AWS_S3.DeleteAssets({
        Keys: S3_r,
      });
    } else if (!result) {
      throw new BadRequstExption("fail to create comment !", result);
    }

    // Step 6: Send push notifications to tagged users if any
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

  /**
   * =====================================================================================
   * Method: CreateReplyComment
   * Purpose: Create a reply to an existing comment and push its ID to the parent comment.
   *
   * Query Fix Explanation:
   * - Previously, post and parent comment lookups used `filter: { id: PostId }` and
   *   `filter: { id: CommentId }`, and update/delete used `{ id: comment.id }`.
   * - Stripped `id` fields caused Mongoose to match the first document in the collection.
   * - Fixed: Updated all filters to use `_id` (`{ _id: PostId }`, `{ _id: CommentId }`).
   * =====================================================================================
   */
  public CreateReplyComment = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // Step 1: Extract parameters, body, and authenticated user
    const { PostId, CommentId }: Partial<I_CommentReply_Params_DTO> =
      req.params;
    const { content, files, tags, visibility }: I_CommentReply_Body_DTO =
      req.body;
    const user = this._GetAuthenticatedUser(req);

    // Step 2: Validate that both the post and the target parent comment exist & are accessible
    const post = await this._PostRepository.findOne({
      filter: {
        _id: PostId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
      options: { populate: "CreatedBy" },
    });
    const comment = await this._CommentRepository.findOne({
      filter: {
        _id: CommentId as string,
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

    // Step 3: Upload reply attachments to S3 & insert reply comment (with RepliedOn set)
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

    // Push reply ID to the parent comment's RepliedList
    const PushReply = await this._CommentRepository.updateOne({
      filter: {
        _id: comment._id as Types.ObjectId,
      },
      update: {
        $push: { RepliedList: result._id },
      },
    });
    if (!PushReply) {
      await this._CommentRepository.DeleteOne({
        _id: result._id as Types.ObjectId,
      });
      throw new BadRequstExption("fail to push reply");
    }

    // Step 4: Send push notifications (to tagged users, parent comment author, and post author)
    if ((result.tags as string[]).length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has mentioned you in comment`,
        },
        fcm_tokens: result.tags as string[],
      });
    }
    if ((comment.CreatedBy as IUser).FCM_Token?.length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has replayed on your Comment`,
        },
        fcm_tokens: (comment.CreatedBy as IUser).FCM_Token as string[],
      });
    }
    if ((post.CreatedBy as IUser).FCM_Token?.length) {
      await this._FCM_Serives.SendNotifications({
        data: {
          body: `${result.content?.slice(0, 20)}...`,
          title: `${user.username} has commented on your post`,
        },
        fcm_tokens: (post.CreatedBy as IUser).FCM_Token as string[],
      });
    }

    return SuccessResponse({
      res,
      message: "you replayed on comment successfly",
      data: result,
    });
  };

  /**
   * =====================================================================================
   * Method: GetPostComments
   * Purpose: Retrieve all top-level comments for a post (excluding replies) with visibility rules.
   * =====================================================================================
   */
  public GetPostComments = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { PostId }: Partial<I_GetPostComments_Params_DTO> = req.params;
    const user = this._GetAuthenticatedUser(req);

    // Fetch comments for this postId where RepliedOn is not set (top-level only)
    const result = await this._CommentRepository.find({
      filter: {
        postId: PostId as string,
        RepliedOn: { $exists: false },
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
      options: {
        populate: "RepliedList",
      },
    });

    if (!result) {
      throw new BadRequstExption("fail to get the Comments ");
    }
    return SuccessResponse({ res, message: "done", data: result });
  };

  /**
   * =====================================================================================
   * Method: GetCommentReplies
   * Purpose: Retrieve a specific comment by ID and populate its replies (RepliedList).
   *
   * Query Fix Explanation:
   * - What was wrong:
   *   The query used `filter: { id: PostId, ... }` and `filter: { id: CommentId, ... }`.
   *   Since `id` is not in the Mongoose schema, `strictQuery: true` stripped out `id`.
   *   This left only `{ $or: [...] }`, so MongoDB returned the FIRST document in the collection
   *   regardless of the requested ID.
   * - How we fixed it:
   *   Changed filters to `{ _id: PostId }` and `{ _id: CommentId }`.
   *   Added safe string ID comparison `post.id !== comment.postId?.toString()`.
   * =====================================================================================
   */
  public GetCommentReplies = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { PostId, CommentId }: Partial<I_GetCommentReplies_Params_DTO> =
      req.params;
    const user = await this._GetAuthenticatedUser(req);

    // Step 1: Fetch and validate the post using _id
    const post = await this._PostRepository.findOne({
      filter: {
        _id: PostId as string,
        $or: Post_Utils.VisibilityQueryCheck(user),
      },
      options: { populate: "CreatedBy" },
    });

    // Step 2: Fetch and validate the comment using _id
    const comment = await this._CommentRepository.findOne({
      filter: {
        _id: CommentId as string,
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
    if (post.id !== comment.postId?.toString()) {
      console.log(post.id, comment.postId);
      throw new NotFoundExption("post or comment not found");
    }

    // Step 3: Fetch the comment with populated replies
    const result = await this._CommentRepository.findOne({
      filter: {
        _id: comment._id as Types.ObjectId,
      },
      options: {
        populate: "RepliedList",
      },
    });

    if (!result) {
      throw new BadRequstExption("fail to get comment replies");
    }
    return SuccessResponse({ res, message: "done", data: result });
  };
}

export default new CommentService();
