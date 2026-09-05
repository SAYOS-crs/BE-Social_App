import { Request, Response } from "express";
import {
  AWS_SERVICE,
  AwsEnum,
  BadRequstExption,
  ConflictExption,
  NotFoundExption,
  NotificationService,
  PostEnum,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import { randomUUID } from "node:crypto";
import { PostRepository, UserRepository } from "../../DB/Repository";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import {
  I_CreatePost_dto,
  I_PostReact_params_dto,
  I_PostReact_query_dto,
  I_RetrievePost_params_dto,
  I_RetrievePost_query_dto,
} from "./post.dto";
import { IPost, React } from "../../DB/models/Post.model";
import { AnyKeys, Types } from "mongoose";
import { QueryFilter } from "mongoose";
import { UpdateQuery } from "mongoose";

export function VisibilityQueryCheck(user: IUser) {
  return [
    { visibility: PostEnum.VisibilityEnum.Public },
    { visibility: PostEnum.VisibilityEnum.Private, CreatedBy: user.id },
    {
      visibility: PostEnum.VisibilityEnum.Friends,
      CreatedBy: { $in: [user.id, ...user.Friends] },
    },
    { tags: user.id },
  ];
}

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
  // -------------------------------------------------
  //
  //
  //
  public reactOnPost = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // step 1 : get (id) and (react )
    const { postId }: Partial<I_PostReact_params_dto> = req.params;
    const { react = 0 }: Partial<I_PostReact_query_dto> = req.query;
    const user = this._GetAuthenticatedUser(req);
    if (!postId) {
      throw new BadRequstExption("post id is required");
    }
    //
    //
    //
    // step 2 : get the post by id
    const post: IPost | null = await this._PostRepository.findById({
      id: postId,
    });
    if (!post) {
      throw new NotFoundExption("post not found");
    }

    // step 3 : prepare the query condition
    let updateQ = [];
    // - check if there is likes to began the search and prepare the query operation
    if ((post.likes as React[]).length) {
      // - ittrate on the likes
      updateQ = (post.likes as React[]).map((like, i): any => {
        // - check 1 : check if the user is exist in the likes array ?
        // + if not that mean its new like
        // = if note push it as new like
        if (!user._id.equals(like._id)) {
          return { $push: { likes: { _id: user._id, react } } };
        }
        // - check 2 : check if the user._id in the likes array and with the same react type ?
        // + that mean its the same like without any chang
        // = reaturn null and dont call the db to update
        else if (user._id.equals(like._id) && like.react === react) {
          return null;
        }
        // - check 3 : check if the user._id in the likes array ?
        // + << and and >> his react type is not the same ?
        // = replace the hole like with new one by (index) / replace to update
        else if (user._id.equals(like._id) && like.react != react) {
          // [`likes.${i}`] : likes is the filed and . mean of and ${i} is the index
          return { $set: { [`likes.${i}`]: { _id: user._id, react } } };
          //
        }
      });
    }
    // - in case if the post dont have likes , push its the first like
    else {
      updateQ.push({ $push: { likes: { _id: user._id, react } } });
    }

    // - step 4 : check if updateQ has Query ?
    // + if not set it with null to prevent falsey call to db
    // = if it have an update Query call the updateOne method
    let result = updateQ[0]
      ? await this._PostRepository.updateOne({
          // check for post & Visibility
          filter: { _id: postId, $or: VisibilityQueryCheck(user) },
          update:
            react > 0 ? updateQ[0] : { $pull: { likes: { _id: user._id } } },
        })
      : null;

    // if !result?.modifiedCount that mean the filter didnt match
    if (!result?.modifiedCount && result !== null) {
      throw new NotFoundExption("post not found");
    }
    // short hand condition for custom message.
    return SuccessResponse<any>({
      res,
      message:
        result === null
          ? "User already liked this post with the same react !"
          : "done",
      data: {
        result,
      },
    });
  };
  // -------------------------------------------------
  //
  //
  //
  public createPost = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    //  * =====> step 1 : collect the docu data
    // get user by user Guard
    const user = this._GetAuthenticatedUser(req);
    let { content, files, visibility, tags }: I_CreatePost_dto = req.body;
    // create fileId
    const fileId = randomUUID();
    // log check
    // console.log({ content, files, visibility, tags, likes, fileId });
    //
    //
    //
    //
    //  * =====> step 2 : Upload Assets via S3
    let s3_r;
    if (files?.length) {
      s3_r = await this._AWS_S3.UploadMultiFiles({
        AssetType: AwsEnum.AssetType.attachments,
        folder: AwsEnum.FolderType.Post,
        files: files as Express.Multer.File[],
        id: fileId,
      });
    }
    // log check
    // console.log("s3 result : ", s3_r);
    //
    //
    //
    //
    //
    //  * =====> step 3 : Create Post document via PostRepository
    // console.log("s3 result =:", s3_r);

    const result = await this._PostRepository.insertOne({
      data: {
        content,
        fileId: s3_r ? fileId : undefined,
        visibility,
        tags,
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
    if (!result && s3_r) {
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
    //  * =====> step 5 : send notification to tagged users (if there tagged user )
    // - first get users that has been tagged using populate
    // note :  taggedUsers is alias form  tags  ===    real : alias
    // note : in populate the path refar to the <<filed>> that ref to other collection
    //
    //
    if (result.tags) {
      const { tags: taggedUsers }: { tags: IUser[] } = await result.populate({
        path: "tags",
      });
      // taggedUsers return  array of users and we want the fcm array form etch user
      //
      //
      //
      const taggedUsers_FCM_Tokens: string[] = taggedUsers
        .map((user) => {
          return user.FCM_Token?.length ? user.FCM_Token : [];
        })
        .flat();
      // taggedUsers_FCM_Tokens will return (array of array of fcm !) => [ [fcm1 , fcm2 ,fcm3] , [fcm1 , fcm2 ,fcm3],... ]
      // -- but the << .flat(); >> will spread all the sup arrays in one array or        ! important note !!!!
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
      await this._FCM_Service.SendNotifications({
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
      // console.log(FCM_r);
      // if (FCM_r[0].status === "rejected") {
      //   throw new BadRequstExption("fcm rejected", FCM_r);
      // }
    }

    return SuccessResponse<typeof result>({
      res,
      message: "post created successfly",
      data: result,
    });
  };
  // -------------------------------------------------
  //
  //
  //
  public retrievePosts = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { postId }: Partial<I_RetrievePost_params_dto> = req.params;
    const { limit = 10, page = 1 }: Partial<I_RetrievePost_query_dto> =
      req.query;
    const user = this._GetAuthenticatedUser(req);
    // limit is alwayes = 10
    // page is always = 1 > to decremnt it by 1 so if it = (2 - 1 = 1) * (10 limit) = 10 skip
    const skip = (limit as number) * ((page as number) - 1);
    // page must be decremnt by -1  ? to make the count from 1 not 0

    // condition on query
    const filter: QueryFilter<IPost> = {
      $or: VisibilityQueryCheck(user),
    };
    if (postId) {
      filter._id = postId;
    }
    // important note ! : i separated the filter from find with const to make condition that
    // manage if the postId is exist findit if not get all posts
    // and that called the logical query condition and have many useCases
    const result: IPost | IPost[] = await this._PostRepository.find({
      filter,
      // undefined = posts
      // new Types.ObjectId(id) = one post by id
      options: {
        skip: skip as number,
        // page = 1 that mean skip = 0
        // page = 2 that mean skip = 10
        limit: limit as number,
      },
    });

    return SuccessResponse<any>({
      res,
      message: "done",
      data: {
        result,
        count: (result as []).length,
        // posts count
        Page_Number: (result as []).length > 1 ? (page as number) : undefined,
        // page number
        from: (result as []).length > 1 ? skip : undefined,
        // starting point
        to:
          (result as []).length > 1 ? skip + (result as []).length : undefined,
        // end point = skip (the start ) + post count (how musth forward)
        //
        //
        // (result as []).length > 1 ? ... : undefined  >>> for if the result was one doc
      },
    });
  };
  // -------------------------------------------------
  //
  //
  //
}

export default new PostService();
