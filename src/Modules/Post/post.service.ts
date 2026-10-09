import { randomUUID } from "node:crypto";
import { PostRepository, UserRepository } from "../../DB/Repository";
import { HPostDocument, IPost, React } from "../../DB/models/Post.model";
import { IUser } from "../../DB/models/User.model";
import {
  AWS_SERVICE,
  AwsEnum,
  NotificationService,
  Post_Utils,
} from "../../Utils";
import {
  I_CreatePost_dto,
  I_PostReact_params_dto,
  I_PostReact_query_dto,
  RetrievePost_dto,
} from "./post.dto";

import { QueryFilter } from "mongoose";
import { log } from "node:console";

// export function VisibilityQueryCheck(user: IUser) {
//   return [
//     { visibility: PostEnum.VisibilityEnum.Public },
//     { visibility: PostEnum.VisibilityEnum.Private, CreatedBy: user.id },
//     {
//       visibility: PostEnum.VisibilityEnum.Friends,
//       CreatedBy: { $in: [user.id, ...user.Friends] },
//     },
//     { tags: user.id },
//   ];
// }

class PostService {
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
  public reactOnPost = async ({
    user,
    postId,
    react = 0,
  }: I_PostReact_params_dto &
    I_PostReact_query_dto & { user: IUser }): Promise<Boolean> => {
    // step 1 : get (id) and (react )
    // const { postId }: Partial<I_PostReact_params_dto> = req.params;
    // const { react = 0 }: Partial<I_PostReact_query_dto> = req.query;
    // const user = this._GetAuthenticatedUser(req);

    //
    //
    //
    // step 2 : get the post by id
    const post: IPost | null = await this._PostRepository.findById({
      id: postId,
    });

    if (!post) {
      return false;
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
          filter: { _id: postId, $or: Post_Utils.VisibilityQueryCheck(user) },
          update:
            react > 0 ? updateQ[0] : { $pull: { likes: { _id: user._id } } },
        })
      : null;

    // if !result?.modifiedCount that mean the filter didnt match
    if (!result?.modifiedCount) {
      return false;
    }
    // short hand condition for custom message.
    return true;
  };
  // -------------------------------------------------
  //
  //
  //
  public createPost = async ({
    user,
    content,
    files,
    visibility,
    tags,
  }: I_CreatePost_dto & { user: IUser }): Promise<
    HPostDocument | undefined
  > => {
    //  * =====> step 1 : collect the docu data
    // get user by user Guard

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

    const result: HPostDocument | undefined =
      await this._PostRepository.insertOne({
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
    // If the DB insert failed but S3 upload succeeded, clean up the orphaned S3 objects
    if (!result && s3_r) {
      // REFACTORED: the old approach manually mapped s3_r to [{ Key: string }] before calling DeleteAssets.
      // After the S3service refactor, DeleteAssets now accepts string[] directly and
      // handles the [{ Key }] conversion internally — so we pass s3_r as-is.
      //
      // Deprecated mapping (no longer needed):
      // const Keys: { Key: string }[] = s3_r.map((Key) => {
      //   return { Key };
      // });  <<deprecated>>
      //
      //
      //
      // Delete Assets via s3 — pass the string[] of S3 keys directly
      this._AWS_S3.DeleteAssets({
        Keys: s3_r, // string[] — S3service converts to [{Key}] format internally
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

    if (!result) {
      log(result);
      return undefined;
    }

    return result;
  };
  // -------------------------------------------------
  //
  //
  //
  public retrievePosts = async ({
    user,
    limit = 10,
    page = 1,
    postId,
  }: {
    user: IUser;
    limit?: number | undefined;
    page?: number | undefined;
    postId?: string | undefined;
  }): Promise<RetrievePost_dto | undefined> => {
    // limit is alwayes = 10
    // page is always = 1 > to decremnt it by 1 so if it = (2 - 1 = 1) * (10 limit) = 10 skip
    const skip = Number(limit) * (Number(page) - 1);
    // page must be decremnt by -1  ? to make the count from 1 not 0

    // condition on query
    const filter: QueryFilter<IPost> = {
      $or: Post_Utils.VisibilityQueryCheck(user),
    };
    if (postId) {
      filter._id = postId;
    }
    // important note ! : i separated the filter from find with const to make condition that
    // manage if the postId is exist findit if not get all posts
    // and that called the logical query condition and have many useCases
    const data: IPost | IPost[] | undefined = await this._PostRepository.find({
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

    if (!data) {
      return undefined;
    }

    return {
      metaData: {
        count: (data as []).length,
        // posts count
        Page_Number: (data as []).length > 1 ? (page as number) : undefined,
        // page number
        from: (data as []).length > 1 ? skip : undefined,
        // starting point
        to: (data as []).length > 1 ? skip + (data as []).length : undefined,
      },
      data,
      // end point = skip (the start ) + post count (how musth forward)
      //
      //
      // (result as []).length > 1 ? ... : undefined  >>> for if the result was one doc
    };

    // -------------------------------------------------
    //
    //
    //
  };
}

export default new PostService();
