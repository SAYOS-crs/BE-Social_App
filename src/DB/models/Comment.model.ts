import mongoose, { Schema, Types } from "mongoose";
import { PostEnum } from "../../Utils";
import { IPost, React } from "./Post.model";
import { IUser } from "./User.model";

// ------------------------------ Post Model ------------------------------\\

// step 1 : create intercafe
export interface IComment {
  // ---- post content
  _id: Types.ObjectId | string | undefined; // internal MongoDB document identifier
  id: Types.ObjectId | string | undefined;  // Mongoose virtual (alias for _id); do NOT query by this
  postId: string | IPost;                   // reference to the parent Post (stored as string, populated as IPost)
  content?: string | undefined;             // text body of the comment (optional only if attachments exist)

  // REFACTORED: was previously `Keys` (array of { Key: string } objects) matching the old S3 key shape.
  // Now stored as plain string[] — each element is a full S3 object key string.
  // This aligns with the S3service refactor where DeleteAssets accepts string[] directly.
  attachments?: string[] | undefined;       // S3 object keys of files attached to this comment (max 3)

  visibility?: PostEnum.VisibilityEnum | undefined; // who can see this comment (Public | Friends | Private)
  // ---- replyes
  RepliedOn?: string | IComment | undefined;       // the comment this is replying to (populated as IComment)
  RepliedList?: string[] | IComment[] | undefined; // list of replies to this comment
  // ---- fileId > id of attachments s3 bucket
  fileId?: string | undefined; // UUID folder ID in S3 that groups this comment's attachments
  // ---- post / users actions to post
  tags?: string | string[] | IUser | IUser[] | undefined;   // tagged user IDs (populated as IUser)
  likes?: React | React[] | IUser | IUser[] | undefined;    // reactions on this comment
  // ---- actions By
  CreatedBy: Types.ObjectId | IUser | string;               // user who created the comment
  DeletedBy?: Types.ObjectId | IUser | string | undefined;  // user who soft-deleted the comment
  // ---- actions At
  CreatedAt: Date;                    // auto-set by Mongoose timestamps
  UpdatedAt?: Date | undefined;       // auto-updated by Mongoose timestamps
  DeletedAt?: Date | undefined;       // soft-delete timestamp (set on logical deletion)
}

// HCommentDoc — convenience type alias for a Mongoose hydrated comment document
// (includes Mongoose instance methods, virtuals, and $set / $push etc.)
export type HCommentDoc = mongoose.HydratedDocument<IComment>;

// step 2 : create model Schema
const CommentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      // content is required ONLY when no attachments are provided
      // (a comment must have either text or at least one attachment)
      required: function (this: HCommentDoc) {
        return !this.attachments?.length; // true = required if attachments is empty/undefined
      },
    },
    attachments: {
      // REFACTORED: was `[{ Key: String }]` (array of objects) — changed to `[String]`
      // to store plain S3 key strings, aligning with the updated S3service.DeleteAssets API
      type: [String],             // each element is a plain S3 object key string
      max: [3, "max post attachment : 3 "], // cap at 3 files per comment
      // attachments are required ONLY when no text content is provided
      required: function (this: HCommentDoc) {
        return Boolean(!this.content); // true = required if content is empty/undefined
      },
    },
    fileId: String,
    postId: {
      type: String,
      ref: "Post",
      required: true,
    },
    visibility: {
      type: String,
      enum: PostEnum.VisibilityEnum,
      default: PostEnum.VisibilityEnum.Public,
    },
    //
    RepliedOn: {
      type: String,
      ref: "Comment",
      required: false,
    },
    RepliedList: {
      type: [String],
      ref: "Comment",
      required: false,
    },
    //
    likes: {
      type: [
        {
          _id: {
            type: Types.ObjectId,
            ref: "User",
          },
          react: Number,
        },
      ],
      required: false,
    },
    tags: {
      type: [Types.ObjectId],
      ref: "User",
      required: false,
    },
    //
    CreatedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    DeletedBy: Types.ObjectId,
    //
    CreatedAt: Date,
    DeletedAt: Date,
    UpdatedAt: Date,
  },
  {
    collection: "Comment_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: true,
    strict: true,
    strictQuery: true,
  },
);

// important nots :
//
// // general nots :-
// - note : _id taype of ObjectId / id type of string
// - you can active the id on the doc by id:true but it will be virtual mean you can't see it in mongoo campos
//
// // in likes the object inside :-
//  named it _id to overwrite the outo generate _id
// - and that to let the _id = user._id
// - if i dose't did that it will be like there an id and _id
// - _id will be outo generate becz mongoose gave any object _id by default
// - id will refrunce the user._id
//

export const CommentModel = mongoose.model<IComment>("Comment", CommentSchema);
